import { describe, expect, it } from 'vitest';
import { gameDate, GAME_TITLE } from './desktop';
import { createGame, DEFAULT_SETTINGS } from '../sim/generate';
import { deserializeGame, serializeGame } from '../sim/save';
import { execute } from '../sim/engine';

describe('2011年界面与旧存档兼容', () => {
  it('100个教学日从2011年2月28日至6月7日，跨月不偏移', () => {
    expect(GAME_TITLE).toBe('高三班主任模拟器：2011');
    expect(gameDate(1).toISOString().slice(0, 10)).toBe('2011-02-28');
    expect(gameDate(2).toISOString().slice(0, 10)).toBe('2011-03-01');
    expect(gameDate(100).toISOString().slice(0, 10)).toBe('2011-06-07');
    expect(gameDate(100).getTime() - gameDate(1).getTime()).toBe(99 * 86400000);
  });
  it('旧版种子不因界面年代更改而重置，存档续算保持一致', () => {
    const oldGame = createGame({ ...DEFAULT_SETTINGS, seed: '春山2027' });
    const loaded = deserializeGame(serializeGame(oldGame));
    expect(loaded.settings.seed).toBe('春山2027');
    expect(execute(loaded, { type: 'advance' }).game).toEqual(
      execute(oldGame, { type: 'advance' }).game,
    );
  });
});
