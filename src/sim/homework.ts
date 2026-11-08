import { ERROR_LABELS, SUBJECT_MAP } from '../config/game';
import { clamp, Random } from './random';
import { makeQuestion } from './questions';
import type { Assignment, ErrorKind, Game, Student, Submission } from './types';

export function completeHomework(
  game: Game,
  student: Student,
  assignment: Assignment,
  rng: Random,
): Submission {
  const node = student.knowledge[assignment.subject][assignment.topic];
  const willingness = clamp(
    0.38 +
      student.habits.homework * 0.5 +
      student.habits.discipline * 0.2 -
      student.habits.delay * 0.12 -
      student.psyche.fatigue * 0.2 +
      student.psyche.motivation * 0.1 +
      rng.range(-0.12, 0.12),
  );
  const completed = Math.round(assignment.quantity * willingness);
  const correctness = clamp(
    node.mastery * 0.8 +
      node.fluency * 0.16 +
      0.18 -
      assignment.difficulty * 0.2 -
      student.psyche.fatigue * 0.06 +
      rng.range(-0.1, 0.1),
  );
  const correct = Math.min(completed, Math.round(completed * correctness));
  const question = makeQuestion(assignment.subject, assignment.topic, rng);
  const actualCause: ErrorKind | null =
    correct === completed && completed > 0
      ? null
      : rng.weighted<ErrorKind>([
          { value: 'concept', weight: (1 - node.mastery) * (0.7 + assignment.difficulty) },
          { value: 'method', weight: (1 - node.fluency) * (1 - student.ability.transfer) * 0.9 },
          { value: 'calculation', weight: (1 - student.habits.focus) * 0.28 },
          { value: 'reading', weight: (1 - student.ability.language) * 0.28 },
          { value: 'state', weight: (student.psyche.fatigue + student.psyche.stress) * 0.36 },
        ]);
  const clues: Record<ErrorKind, string[]> = {
    concept: ['相近概念反复混用，例题改变条件后容易卡住。', '能写出部分定义，但适用条件有遗漏。'],
    method: ['能复述概念，选择步骤时却走了弯路。', '过程有思路，但关键推导没有接上。'],
    calculation: ['主要步骤完整，末尾出现笔误或运算偏差。', '复核时能自行发现其中一处失误。'],
    reading: ['答题方向偏离了题干中的限定词。', '在提醒重新读题之后，能够解释条件。'],
    state: ['字迹到后半部分明显变乱，有连续留白。', '课后表示昨晚睡得较晚，今天容易走神。'],
  };
  if (completed < assignment.quantity * 0.65) student.missed++;
  else student.missed = Math.max(0, student.missed - 1);
  if (actualCause) node.errors[actualCause] += completed - correct;
  return {
    id: `sub-${game.nextId++}`,
    assignmentId: assignment.id,
    day: game.day,
    studentId: student.id,
    completed,
    correct,
    question,
    answer: actualCause ? (question.wrong[actualCause] ?? '尚未完成。') : question.answer,
    actualCause,
    clue: actualCause ? rng.pick(clues[actualCause]) : '步骤完整，可通过迁移题继续观察。',
    diagnosis: null,
    reviewed: actualCause === null,
    matched: null,
  };
}
export function diagnosisText(game: Game, submission: Submission, cause: ErrorKind) {
  const assignment = game.assignments.find((item) => item.id === submission.assignmentId)!;
  const topic = SUBJECT_MAP[assignment.subject].topics.find(
    (item) => item.id === assignment.topic,
  )!;
  return `在${topic.name}作业中完成 ${submission.completed}/${assignment.quantity} 题，正确 ${submission.correct} 题。教师暂推测：${ERROR_LABELS[cause]}，仍需后续练习验证。`;
}
