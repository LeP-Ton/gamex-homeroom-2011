import { getSubjects, SUBJECT_MAP } from '../config/game';
import { clamp, mean, Random, round } from './random';
import { makeQuestion } from './questions';
import type { Exam, Game, Paper } from './types';

export function sitExam(
  game: Game,
  rng: Random,
  name: string,
  difficulty: number,
  final = false,
): Exam {
  const papers: Paper[] = getSubjects(game.settings).map((subject) => ({
    subject: subject.id,
    difficulty: clamp(difficulty + rng.range(-0.035, 0.035), 0.3, 0.8),
    topicWeights: Object.fromEntries(
      subject.topics.map((topic) => [topic.id, topic.weight * rng.range(0.85, 1.15)]),
    ),
    type: subject.ability === 'language' ? '阅读、表达与综合应用' : '基础、应用与迁移',
    sample: makeQuestion(subject.id, rng.pick(subject.topics).id, rng),
  }));
  const exam: Exam = {
    id: `exam-${game.nextId++}`,
    day: game.day,
    name,
    final,
    papers,
    results: [],
  };
  for (const student of game.students) {
    const scores: Record<string, number> = {};
    const breakdown: Exam['results'][number]['breakdown'] = {};
    for (const paper of papers) {
      const subject = SUBJECT_MAP[paper.subject];
      const weight = Object.values(paper.topicWeights).reduce((sum, value) => sum + value, 0);
      const mastery =
        subject.topics.reduce((sum, topic) => {
          const node = student.knowledge[subject.id][topic.id];
          return sum + (node.mastery * 0.91 + node.fluency * 0.09) * paper.topicWeights[topic.id];
        }, 0) / weight;
      const stateFactor = clamp(
        0.98 +
          student.psyche.confidence * 0.035 -
          student.psyche.anxiety * 0.075 -
          student.psyche.fatigue * 0.045,
        0.82,
        1.02,
      );
      const variation = (rng.bell() - 0.5) * 0.072;
      const ratio =
        mastery ** 0.86 * (1 + (0.55 - paper.difficulty) * 0.3) * stateFactor + variation;
      scores[subject.id] = round(clamp(ratio, 0, 1) * subject.max);
      breakdown[subject.id] = { knowledge: mastery, stateFactor, variation };
    }
    exam.results.push({
      studentId: student.id,
      scores,
      total: round(Object.values(scores).reduce((sum, score) => sum + score, 0)),
      breakdown,
    });
  }
  game.exams.push(exam);
  // 试卷的波动只影响观测和心理，不能回写为“真实成绩属性”。
  if (game.day > 0)
    for (const result of exam.results) {
      const student = game.students.find((item) => item.id === result.studentId)!;
      const previous =
        game.exams.at(-2)?.results.find((item) => item.studentId === student.id)?.total ??
        result.total;
      student.psyche.confidence = clamp(
        student.psyche.confidence + clamp((result.total - previous) / 600, -0.05, 0.05),
      );
      student.psyche.anxiety = clamp(
        student.psyche.anxiety + (result.total < student.goal ? 0.025 : -0.02),
      );
    }
  return exam;
}
export function examStats(exam: Exam, cutoff: number) {
  const qualified = exam.results.filter((result) => result.total >= cutoff).length;
  return {
    average: round(mean(exam.results.map((result) => result.total))),
    qualified,
    rate: qualified / exam.results.length,
    high: exam.results.filter((result) => result.total >= 600).length,
    subjects: Object.fromEntries(
      exam.papers.map((paper) => [
        paper.subject,
        round(mean(exam.results.map((result) => result.scores[paper.subject]))),
      ]),
    ),
  };
}
