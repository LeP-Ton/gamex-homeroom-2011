import { create } from 'zustand';
import { createGame } from '../sim/generate';
import { execute } from '../sim/engine';
import type { Game, GameCommand, GameSettings } from '../sim/types';
import { saveGame } from './storage';

interface GameStore {
  game: Game | null;
  notice: { text: string; error: boolean; key: number } | null;
  saved: string;
  start: (settings: GameSettings) => void;
  restore: (game: Game) => void;
  dispatch: (command: GameCommand) => boolean;
  notify: (text: string, error?: boolean) => void;
  clearNotice: () => void;
  save: (slot?: string) => Promise<boolean>;
}
export const useGame = create<GameStore>((set, get) => ({
  game: null,
  notice: null,
  saved: '',
  notify: (text, error = false) => set({ notice: { text, error, key: Date.now() } }),
  clearNotice: () => set({ notice: null }),
  start: (settings) => {
    const game = createGame(settings);
    set({ game, saved: '' });
    void get().save();
  },
  restore: (game) => {
    set({ game });
    get().notify('存档已读取，随机序列与所有进度已恢复');
  },
  dispatch: (command) => {
    const current = get().game;
    if (!current) return false;
    const result = execute(current, command);
    if (result.ok) set({ game: result.game });
    get().notify(result.message, !result.ok);
    if (result.ok && command.type === 'advance') void get().save();
    return result.ok;
  },
  save: async (slot = 'auto') => {
    const game = get().game;
    if (!game) return false;
    try {
      await saveGame(game, slot);
      set({
        saved: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      });
      return true;
    } catch (error) {
      get().notify(error instanceof Error ? error.message : '保存失败，请导出备份。', true);
      return false;
    }
  },
}));
