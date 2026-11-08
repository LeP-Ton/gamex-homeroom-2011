import { describe, expect, it } from 'vitest';
import { getSubjects, TOTAL_MAX } from '../config/game';
import { classAnalysis, makeRecord, reportCsv, studentAnalysis } from './analytics';
import { execute } from './engine';
import { createGame, DEFAULT_SETTINGS } from './generate';
import { hashSeed } from './random';
import { deserializeGame, serializeGame, validateGame } from './save';
import { playStrategyDay, simulateRun } from './strategies';
import type { ClassTrack, Game, GameCommand } from './types';

const tracks: ClassTrack[] = ['science', 'arts'];
const subjectIds = {
  science: ['chinese', 'math', 'english', 'physics', 'chemistry', 'biology'],
  arts: ['chinese', 'math', 'english', 'politics', 'history', 'geography'],
};
function apply(game: Game, command: GameCommand) {
  const result = execute(game, command);
  expect(result.ok).toBe(true);
  return result.game;
}

describe('开局文理科选择', () => {
  it.each(tracks)('%s班只生成对应六科知识、试卷和分数', (track) => {
    const game = createGame({ ...DEFAULT_SETTINGS, track });
    const subjects = getSubjects(game.settings);
    expect(subjects.map((subject) => subject.id)).toEqual(subjectIds[track]);
    expect(subjects.reduce((sum, subject) => sum + subject.max, 0)).toBe(TOTAL_MAX);
    expect(subjects.filter((subject) => subject.teachable).map((subject) => subject.id)).toEqual([
      'chinese',
      'math',
      'english',
    ]);
    for (const student of game.students)
      expect(Object.keys(student.knowledge)).toEqual(subjectIds[track]);
    expect(game.exams[0].papers.map((paper) => paper.subject)).toEqual(subjectIds[track]);
    for (const result of game.exams[0].results)
      expect(Object.keys(result.scores)).toEqual(subjectIds[track]);
    expect(Object.keys(classAnalysis(game).subjects)).toEqual(subjectIds[track]);
    expect(subjectIds[track]).toContain(studentAnalysis(game, 1).weakest.id);
    expect(() => validateGame(game)).not.toThrow();
  });

  it.each(
    tracks.flatMap((track) =>
      ['chinese', 'math', 'english'].map((subject) => ({ track, subject })),
    ),
  )('$track班任教$subject的教学、作业与保存续算一致', ({ track, subject }) => {
    let game = createGame({ ...DEFAULT_SETTINGS, track, subject });
    const topic = getSubjects(game.settings).find((item) => item.id === subject)!.topics[0].id;
    game = apply(game, { type: 'teach', kind: 'lesson', topic });
    game = apply(game, {
      type: 'assign',
      topic,
      difficulty: 0.45,
      quantity: 16,
      targets: game.students.map((student) => student.id),
    });
    const loaded = deserializeGame(serializeGame(game));
    expect(loaded).toEqual(game);
    const next = apply(game, { type: 'advance' });
    expect(apply(loaded, { type: 'advance' })).toEqual(next);
    expect(next.submissions).toHaveLength(50);
    expect(Object.keys(next.traces[0].ledgers[0].bySubject)).toEqual(subjectIds[track]);
    expect(
      next.traces[0].gains.some((gain) => gain.subject === subject && gain.source === 'lesson'),
    ).toBe(true);
    expect(() => validateGame(next)).not.toThrow();
  });

  it('文科完整百日及报告导出只包含政史地等本局六科', () => {
    const { game } = simulateRun('文科百日验收', 'normal', 'balanced', false, { track: 'arts' });
    expect(game.day).toBe(100);
    expect(game.ended).toBe(true);
    expect(game.exams.at(-1)!.final).toBe(true);
    expect(game.exams.map((exam) => exam.day)).toEqual([0, 25, 50, 75, 100]);
    for (const exam of game.exams) {
      expect(exam.papers.map((paper) => paper.subject)).toEqual(subjectIds.arts);
      expect(exam.papers.every((paper) => paper.sample.prompt && paper.sample.answer)).toBe(true);
      for (const result of exam.results) {
        expect(Object.keys(result.scores)).toEqual(subjectIds.arts);
        for (const subject of getSubjects(game.settings)) {
          expect(result.scores[subject.id]).toBeGreaterThanOrEqual(0);
          expect(result.scores[subject.id]).toBeLessThanOrEqual(subject.max);
        }
        expect(result.total).toBeCloseTo(
          Object.values(result.scores).reduce((sum, value) => sum + value, 0),
          1,
        );
      }
    }
    for (const trace of game.traces)
      for (const ledger of trace.ledgers) {
        expect(Object.keys(ledger.bySubject)).toEqual(subjectIds.arts);
        expect(ledger.teaching + ledger.homework + ledger.autonomous + ledger.rest).toBeCloseTo(
          240,
          6,
        );
      }
    const csv = reportCsv(game);
    expect(csv.split('\r\n')[0]).toBe(
      '\ufeff"学号","姓名","语文","数学","英语","政治","历史","地理","总分","较摸底变化","达到参考线"',
    );
    expect(csv).not.toMatch(/undefined|NaN|物理|化学|生物/);
    expect(makeRecord(game)?.track).toBe('arts');
    expect(deserializeGame(serializeGame(game))).toEqual(game);
  }, 30000);

  it('理科确定性结果与改动前D6基准一致', () => {
    let game = createGame({ ...DEFAULT_SETTINGS, seed: '旧版科类兼容' });
    for (let day = 0; day < 5; day++) game = playStrategyDay(game, 'balanced');
    expect(game.rng).toBe(3126901920);
    expect(
      hashSeed(
        JSON.stringify({
          students: game.students,
          seats: game.seats,
          exams: game.exams,
          traces: game.traces,
          rng: game.rng,
        }),
      ),
    ).toBe(1536512182);
  });

  it('无科类旧档先校验再按理科读取，保留标识、知识、历史与随机状态', () => {
    const game = playStrategyDay(createGame(DEFAULT_SETTINGS), 'balanced');
    const legacy = JSON.parse(JSON.stringify(game));
    delete legacy.settings.track;
    legacy.id = 'class-旧版固定标识';
    const envelope = {
      format: 'GameX-Homeroom',
      version: 1,
      checksum: hashSeed(JSON.stringify(legacy)),
      game: legacy,
    };
    const loaded = deserializeGame(JSON.stringify(envelope));
    expect(loaded).toEqual({ ...legacy, settings: { ...legacy.settings, track: 'science' } });
    expect(apply(loaded, { type: 'advance' })).toEqual(
      apply({ ...game, id: legacy.id }, { type: 'advance' }),
    );
    envelope.game.rng++;
    expect(() => deserializeGame(JSON.stringify(envelope))).toThrow(/校验/);
  });

  it('拒绝未知科类、非语数外任教和混入其他科类的数据', () => {
    expect(() => createGame({ ...DEFAULT_SETTINGS, track: '其他' as ClassTrack })).toThrow(
      /文科班或理科班/,
    );
    for (const track of tracks)
      expect(() => createGame({ ...DEFAULT_SETTINGS, track, subject: 'physics' })).toThrow(
        /任教学科/,
      );
    const game = createGame({ ...DEFAULT_SETTINGS, track: 'arts' });
    const wrongTrack = structuredClone(game);
    wrongTrack.settings.track = 'science';
    expect(() => validateGame(wrongTrack)).toThrow();
    const extraScore = structuredClone(game);
    extraScore.exams[0].results[0].scores.physics = 0;
    expect(() => validateGame(extraScore)).toThrow(/考试成绩/);
    const unknown = structuredClone(game);
    unknown.settings.track = '其他' as ClassTrack;
    expect(() => validateGame(unknown)).toThrow(/规则不兼容/);
  });
});
