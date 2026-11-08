import { getSubjects, TOTAL_MAX } from '../config/game';
import { examStats } from './exam';
import { hashSeed, mean, round } from './random';
import type { Game, RecordEntry } from './types';

// 预测仅依赖玩家已拿到的考试成绩，不能读取真实知识或未来随机序列。
export function studentAnalysis(game: Game, studentId: number) {
  const subjects = getSubjects(game.settings);
  const exams = game.exams.filter((exam) =>
    exam.results.some((result) => result.studentId === studentId),
  );
  const history = exams.map(
    (exam) => exam.results.find((result) => result.studentId === studentId)!,
  );
  const latest = history.at(-1)!;
  const first = history[0];
  const recent = history.slice(-3).map((result) => result.total);
  const volatility = Math.sqrt(mean(recent.map((score) => (score - mean(recent)) ** 2)));
  const gap = game.day - exams.at(-1)!.day;
  const margin = Math.max(13, volatility * 0.7 + 12) + Math.min(15, gap * 0.45);
  const weakest = subjects.reduce((a, b) =>
    latest.scores[a.id] / a.max < latest.scores[b.id] / b.max ? a : b,
  );
  const strongest = subjects.reduce((a, b) =>
    latest.scores[a.id] / a.max > latest.scores[b.id] / b.max ? a : b,
  );
  const probability = 1 / (1 + Math.exp((game.settings.cutoff - latest.total) / (margin * 0.6)));
  return {
    latest,
    history,
    improvement: round(latest.total - first.total),
    low: round(Math.max(0, latest.total - margin)),
    high: round(Math.min(TOTAL_MAX, latest.total + margin)),
    volatility: round(volatility),
    weakest,
    strongest,
    probability,
    borderline: Math.abs(latest.total - game.settings.cutoff) <= 35,
    lastExamDay: exams.at(-1)!.day,
  };
}
export function classAnalysis(game: Game) {
  const latest = game.exams.at(-1)!;
  const stats = examStats(latest, game.settings.cutoff);
  const initial = examStats(game.exams[0], game.settings.cutoff);
  const analyses = game.students.map((student) => studentAnalysis(game, student.id));
  return {
    ...stats,
    initial,
    improvement: round(stats.average - initial.average),
    borderline: analyses.filter((analysis) => analysis.borderline).length,
    projected: round(analyses.reduce((sum, analysis) => sum + analysis.probability, 0)),
    lastExam: latest,
  };
}
export function makeRecord(game: Game): RecordEntry | null {
  if (game.debug || !game.ended || !game.exams.at(-1)?.final) return null;
  const stats = classAnalysis(game);
  return {
    id: `${game.id}-${hashSeed(JSON.stringify(game.logs))}`,
    seed: game.settings.seed,
    teacher: game.settings.teacher,
    className: game.settings.className,
    track: game.settings.track ?? 'science',
    difficulty: game.settings.difficulty,
    cutoff: game.settings.cutoff,
    average: stats.average,
    rate: stats.rate,
    qualified: stats.qualified,
    high: stats.high,
    improvement: stats.improvement,
    debug: false,
  };
}
export function csvEscape(value: unknown) {
  return `"${String(value).replaceAll('"', '""')}"`;
}
export function reportCsv(game: Game) {
  const subjects = getSubjects(game.settings);
  const headers = [
    '学号',
    '姓名',
    ...subjects.map((subject) => subject.name),
    '总分',
    '较摸底变化',
    '达到参考线',
  ];
  const rows = game.students.map((student) => {
    const analysis = studentAnalysis(game, student.id);
    return [
      student.id,
      student.name,
      ...subjects.map((subject) => analysis.latest.scores[subject.id]),
      analysis.latest.total,
      analysis.improvement,
      analysis.latest.total >= game.settings.cutoff ? '是' : '否',
    ];
  });
  return '\ufeff' + [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\r\n');
}
