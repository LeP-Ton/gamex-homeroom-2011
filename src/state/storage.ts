import { deserializeGame, serializeGame } from '../sim/save';
import { makeRecord } from '../sim/analytics';
import type { Game, RecordEntry } from '../sim/types';

export interface SaveSlot {
  slot: string;
  name: string;
  day: number;
  ended: boolean;
  updatedAt: string;
  data: string;
}
let database: Promise<IDBDatabase> | undefined;
function openDatabase() {
  if (!database)
    database = new Promise((resolve, reject) => {
      const request = indexedDB.open('gamex-homeroom-v1', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore('saves', { keyPath: 'slot' });
        db.createObjectStore('records', { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        database = undefined;
        reject(new Error('无法打开本地存档，请检查浏览器存储权限。'));
      };
      request.onblocked = () => {
        database = undefined;
        reject(new Error('存档数据库被其他页面占用，请关闭旧页面后重试。'));
      };
    });
  return database;
}
async function request<T>(
  store: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, mode);
    const task = operation(transaction.objectStore(store));
    transaction.oncomplete = () => resolve(task.result);
    transaction.onerror = () => reject(new Error('本地存储操作失败，可能已达到空间限制。'));
    transaction.onabort = () => reject(new Error('本地存储事务中断，请导出备份后重试。'));
  });
}
// 排队写入避免快速连续结束一天时，较旧的异步自动存档覆盖新进度。
let writeQueue: Promise<unknown> = Promise.resolve();
export function saveGame(game: Game, slot = 'auto') {
  if (game.debug) return Promise.reject(new Error('调试副本禁止写入普通存档。'));
  const data = serializeGame(game);
  const entry: SaveSlot = {
    slot,
    name: game.settings.className,
    day: game.day,
    ended: game.ended,
    updatedAt: new Date().toISOString(),
    data,
  };
  const work = async () => {
    await request('saves', 'readwrite', (store) => store.put(entry));
    const record = makeRecord(game);
    if (record) await request('records', 'readwrite', (store) => store.put(record));
  };
  writeQueue = writeQueue.catch(() => undefined).then(work);
  return writeQueue;
}
export const listSaves = () => request<SaveSlot[]>('saves', 'readonly', (store) => store.getAll());
export async function loadGame(slot: string) {
  await writeQueue.catch(() => undefined);
  const entry = await request<SaveSlot | undefined>('saves', 'readonly', (store) =>
    store.get(slot),
  );
  if (!entry) throw new Error('该存档槽为空。');
  return deserializeGame(entry.data);
}
export const deleteSave = (slot: string) =>
  request('saves', 'readwrite', (store) => store.delete(slot));
export const listRecords = () =>
  request<RecordEntry[]>('records', 'readonly', (store) => store.getAll());
export function downloadText(name: string, data: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
