import { LegacyIcon, ClassicGlyph } from './LegacyIcon';
import { useEffect, useRef, useState } from 'react';
import { CLASS_TRACKS, DIFFICULTIES, getSubjects, getTrackName } from '../config/game';
import { GAME_TITLE, shortGameDate } from '../config/desktop';
import { DEFAULT_SETTINGS } from '../sim/generate';
import { deserializeGame, serializeGame } from '../sim/save';
import type { ClassTrack, Game, GameSettings } from '../sim/types';
import { useGame } from '../state/store';
import {
  deleteSave,
  downloadText,
  listSaves,
  loadGame,
  saveGame,
  type SaveSlot,
} from '../state/storage';
import { Tag } from './shared';

export function Modal({
  title,
  close,
  children,
  wide = false,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <section
        className={`modal ${wide ? 'modal-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <h2>{title}</h2>
          <button aria-label="关闭对话框" className="icon-button" onClick={close}>
            <ClassicGlyph name="close" size={18} />
          </button>
        </header>
        <div className="modal-content">{children}</div>
      </section>
    </div>
  );
}
export function NewGame({
  initial,
  onStart,
  close,
  existing = false,
}: {
  initial?: GameSettings;
  onStart: (settings: GameSettings) => void;
  close: () => void;
  existing?: boolean;
}) {
  const [settings, setSettings] = useState(() => ({
    ...(initial ?? DEFAULT_SETTINGS),
    track: initial?.track ?? DEFAULT_SETTINGS.track,
  }));
  const [error, setError] = useState('');
  const update = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) =>
    setSettings({ ...settings, [key]: value });
  return (
    <Modal title={existing ? '新建班级' : GAME_TITLE} close={close}>
      <div className="new-game-intro">
        <LegacyIcon name="school" size={54} />
        <p>
          2011年，春山中学高三年级组。
          <br />
          请填写您的班主任信息，建立50人的班级档案。
        </p>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          try {
            onStart(settings);
          } catch (error) {
            setError(String(error));
          }
        }}
      >
        <label className="field-label">
          班级科类
          <select
            required
            value={settings.track}
            onChange={(event) => update('track', event.target.value as ClassTrack)}
          >
            {Object.entries(CLASS_TRACKS).map(([id, track]) => (
              <option key={id} value={id}>
                {track.name}
              </option>
            ))}
          </select>
        </label>
        <p className="class-track-summary" aria-live="polite">
          {getTrackName(settings)}：
          {getSubjects(settings)
            .map((subject) => subject.name)
            .join('、')}
          。 语数外各150分，其余三科各100分，总分750分。
        </p>
        <div className="form-grid two">
          <label>
            班主任姓名
            <input
              required
              maxLength={20}
              value={settings.teacher}
              onChange={(event) => update('teacher', event.target.value)}
            />
          </label>
          <label>
            任教学科
            <select
              value={settings.subject}
              onChange={(event) => update('subject', event.target.value)}
            >
              {getSubjects(settings)
                .filter((subject) => subject.teachable)
                .map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            班级名称
            <input
              required
              maxLength={30}
              value={settings.className}
              onChange={(event) => update('className', event.target.value)}
            />
          </label>
          <label>
            班级随机种子
            <input
              required
              maxLength={80}
              value={settings.seed}
              onChange={(event) => update('seed', event.target.value)}
            />
          </label>
        </div>
        <label className="field-label">
          游戏难度
          <div className="difficulty-options">
            {Object.entries(DIFFICULTIES).map(([id, difficulty]) => (
              <button
                key={id}
                type="button"
                className={settings.difficulty === id ? 'selected' : ''}
                onClick={() => update('difficulty', id as GameSettings['difficulty'])}
              >
                <strong>{difficulty.name}</strong>
                <span>{difficulty.description}</span>
              </button>
            ))}
          </div>
        </label>
        <label className="field-label">
          本科参考线（虚构 750 分制）
          <input
            type="number"
            required
            min={300}
            max={650}
            value={settings.cutoff}
            onChange={(event) => update('cutoff', Number(event.target.value))}
          />
        </label>
        <p className="form-footnote">
          这是虚构考试规则，不代表任何省份录取政策。同种子、同科类、同难度、相同行动可复现整局结果。
          {existing ? '新建会替换自动存档，请先将当前进度保存到手动槽。' : ''}
        </p>
        {error && <p className="error-text">{error}</p>}
        <button className="button wide" type="submit">
          <ClassicGlyph name="plus" size={16} />
          {existing ? '创建新班级' : '开启百日同行'}
        </button>
      </form>
    </Modal>
  );
}

export function SaveManager({
  game,
  close,
  newGame,
}: {
  game: Game | null;
  close: () => void;
  newGame: () => void;
}) {
  const [slots, setSlots] = useState<SaveSlot[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deletePending, setDeletePending] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const restore = useGame((state) => state.restore);
  const notify = useGame((state) => state.notify);
  const refresh = () =>
    listSaves()
      .then(setSlots)
      .catch((error) => setError(String(error)));
  useEffect(() => {
    void refresh();
  }, []);
  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await task();
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="存档与设置" close={close} wide>
      <div className="save-manager-top">
        <LegacyIcon name="drive" size={30} />
        <div>
          <strong>选择游戏存档</strong>
          <p>每次结束今日会自动保存，提供 3 个手动存档槽。导出文件可独立备份。</p>
        </div>
      </div>
      <div className="save-slot-list">
        {['auto', '1', '2', '3'].map((slot) => {
          const entry = slots.find((item) => item.slot === slot);
          return (
            <article key={slot}>
              <div className="save-slot-icon">
                <LegacyIcon name="save" size={20} />
              </div>
              <div>
                <h3>
                  {slot === 'auto' ? '自动存档' : `手动存档 ${slot}`}
                  {entry && (
                    <Tag tone="green">
                      D{entry.day}
                      {entry.ended ? ' · 已结算' : ''}
                    </Tag>
                  )}
                </h3>
                <p>
                  {entry
                    ? `${entry.name} · ${shortGameDate(entry.day)}${entry.ended ? ' · 高考已完成' : ''}`
                    : '空存档槽'}
                </p>
              </div>
              <div className="button-row">
                {game && slot !== 'auto' && (
                  <button
                    className="button subtle small-button"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await saveGame(game, slot);
                        await refresh();
                        notify('手动存档已保存');
                      })
                    }
                  >
                    保存
                  </button>
                )}
                {entry && (
                  <>
                    <button
                      className="button subtle small-button"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          const loaded = await loadGame(slot);
                          restore(loaded);
                          close();
                        })
                      }
                    >
                      读取
                    </button>
                    <button
                      className={`icon-button ${deletePending === slot ? 'danger' : ''}`}
                      disabled={busy}
                      title={
                        deletePending === slot ? '再次点击确认删除此存档' : '删除存档（需再次点击）'
                      }
                      onClick={() => {
                        if (deletePending === slot)
                          void run(async () => {
                            await deleteSave(slot);
                            await refresh();
                            setDeletePending(null);
                          });
                        else setDeletePending(slot);
                      }}
                    >
                      <LegacyIcon name="delete" size={15} />
                    </button>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {deletePending && (
        <p className="error-text">再次点击对应删除图标可删除该槽；其他存档不会受影响。</p>
      )}
      <div className="button-row wrap">
        <button
          className="button subtle"
          disabled={!game || busy}
          onClick={() => {
            if (game)
              downloadText(
                `${game.settings.className}-D${game.day}.gamex.json`,
                serializeGame(game),
              );
          }}
        >
          <LegacyIcon name="export" size={15} />
          导出当前存档
        </button>
        <button className="button subtle" disabled={busy} onClick={() => fileRef.current?.click()}>
          <LegacyIcon name="import" size={15} />
          导入存档文件
        </button>
        <button
          className="button subtle"
          onClick={() => {
            close();
            newGame();
          }}
        >
          <ClassicGlyph name="plus" size={15} />
          新建班级
        </button>
      </div>
      <input
        ref={fileRef}
        hidden
        type="file"
        accept=".json"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file)
            void run(async () => {
              const loaded = deserializeGame(await file.text());
              await saveGame(loaded);
              restore(loaded);
              close();
            });
          event.target.value = '';
        }}
      />
      {error && <p className="error-text">{error}</p>}
      <div className="settings-info">
        <p>
          操作提示：双击桌面图标打开应用；拖动标题栏移动窗口，拖动右下角缩放。窗口右侧可最小化、最大化、关闭，底部任务栏可恢复。
        </p>
        <p>所有数据仅存于当前浏览器。清除浏览器数据会删除本地进度；建议定期导出备份。</p>
      </div>
    </Modal>
  );
}
