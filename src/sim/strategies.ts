import { EXAM_CALENDAR, GAME_DAYS, SUBJECT_MAP } from '../config/game';
import { createGame, DEFAULT_SETTINGS } from './generate';
import { execute } from './engine';
import { classAnalysis, studentAnalysis } from './analytics';
import type { Difficulty, Game, GameCommand, GameSettings } from './types';

export type Strategy = 'observe' | 'balanced' | 'cram' | 'borderline';
export const STRATEGY_LABELS: Record<Strategy, string> = {
  observe: '仅常规教学',
  balanced: '均衡教学与恢复',
  cram: '高负荷重复训练',
  borderline: '只关注临界生',
};
// 策略工具只能依赖可观察成绩，不得偷看隐藏能力或未来试卷。
export function playStrategyDay(input: Game, strategy: Strategy): Game {
  let game = input;
  const apply = (command: GameCommand) => {
    const result = execute(game, command);
    if (result.ok) game = result.game;
  };
  const subject = SUBJECT_MAP[game.settings.subject];
  const topic = subject.topics[(game.day - 1) % subject.topics.length].id;
  if (strategy === 'balanced') {
    apply({
      type: 'teach',
      kind: game.day % 3 === 0 ? 'review' : game.day % 3 === 1 ? 'lesson' : 'practice',
      topic,
    });
    apply({
      type: 'assign',
      topic,
      quantity: 16,
      difficulty: 0.45,
      targets: game.students.map((student) => student.id),
    });
    if (game.day % 6 === 0) apply({ type: 'teach', kind: 'meeting', style: '放松休整' });
    if (EXAM_CALENDAR.some((exam) => exam.day - game.day === 1))
      apply({ type: 'teach', kind: 'relax' });
    const event = game.events.find((event) => !event.resolved);
    if (event) apply({ type: 'event', eventId: event.id, choice: 0 });
  }
  if (strategy === 'cram') {
    apply({ type: 'teach', kind: 'lesson', topic: subject.topics[0].id });
    apply({ type: 'teach', kind: 'practice', topic: subject.topics[0].id });
    apply({ type: 'teach', kind: 'review', topic: subject.topics[0].id });
    apply({
      type: 'assign',
      topic: subject.topics[0].id,
      quantity: 60,
      difficulty: 0.75,
      targets: game.students.map((student) => student.id),
    });
  }
  if (strategy === 'borderline') {
    const targets = game.students
      .filter((student) => studentAnalysis(game, student.id).borderline)
      .sort(
        (a, b) =>
          Math.abs(studentAnalysis(game, a.id).latest.total - game.settings.cutoff) -
          Math.abs(studentAnalysis(game, b.id).latest.total - game.settings.cutoff),
      )
      .slice(0, 3)
      .map((student) => student.id);
    if (targets.length) {
      apply({ type: 'teach', kind: 'tutor', topic, targets });
      apply({ type: 'assign', topic, quantity: 24, difficulty: 0.55, targets });
    }
  }
  apply({ type: 'advance' });
  return game;
}
export function simulateRun(
  seed: string,
  difficulty: Difficulty,
  strategy: Strategy,
  debug = true,
  settings: Partial<Pick<GameSettings, 'track' | 'subject' | 'cutoff'>> = {},
) {
  let game = createGame({ ...DEFAULT_SETTINGS, ...settings, seed, difficulty }, debug);
  for (let day = 0; day < GAME_DAYS && !game.ended; day++) game = playStrategyDay(game, strategy);
  const analysis = classAnalysis(game);
  return {
    game,
    summary: {
      seed,
      difficulty,
      track: game.settings.track,
      strategy,
      average: analysis.average,
      rate: analysis.rate,
      improvement: analysis.improvement,
      subjects: analysis.subjects,
      fatigue: game.traces.at(-1)!.averageFatigue,
      stress: game.ecology.stress,
    },
  };
}
