import { SUBJECT_MAP } from '../config/game';
import { clamp, mean } from './random';
import type { Game, GainTrace, Student } from './types';

export function subjectMastery(student: Student, subject: string) {
  const config = SUBJECT_MAP[subject];
  return (
    config.topics.reduce(
      (sum, topic) => sum + student.knowledge[subject][topic.id].mastery * topic.weight,
      0,
    ) / config.topics.reduce((sum, topic) => sum + topic.weight, 0)
  );
}
export function weakestTopic(student: Student, subject: string) {
  return SUBJECT_MAP[subject].topics.reduce((weak, topic) =>
    student.knowledge[subject][topic.id].mastery < student.knowledge[subject][weak.id].mastery
      ? topic
      : weak,
  ).id;
}
export function seatEffect(game: Game, student: Student) {
  const index = game.seats.indexOf(student.id);
  const row = Math.floor(index / 10);
  const desk = index % 2 === 0 ? index + 1 : index - 1;
  const neighbor = game.students.find((item) => item.id === game.seats[desk]);
  const front = game.students.find((item) => item.id === game.seats[index - 10]);
  const relation = neighbor ? (student.relations[neighbor.id] ?? 0) : 0;
  const help = neighbor
    ? (subjectMastery(neighbor, game.settings.subject) -
        subjectMastery(student, game.settings.subject)) *
      (0.09 + game.ecology.mutual * 0.1)
    : 0;
  const chat =
    neighbor && student.friends.includes(neighbor.id) ? (1 - student.habits.discipline) * 0.1 : 0;
  const dependency =
    neighbor && student.habits.help > 0.72 && neighbor.habits.discipline < 0.45 ? 0.045 : 0;
  const surround = front ? (front.habits.discipline - 0.5) * 0.05 : 0;
  const adaptation = game.day - student.seatChanged < 3 ? 0.06 : 0;
  return clamp(
    1 -
      row * (1 - student.vision) * 0.07 +
      help +
      relation * 0.04 -
      chat -
      dependency +
      surround -
      adaptation,
    0.64,
    1.16,
  );
}
export function learn(
  game: Game,
  student: Student,
  subjectId: string,
  topicId: string,
  minutes: number,
  rate: number,
  source: string,
  gains: GainTrace[],
) {
  if (minutes <= 0) return;
  const subject = SUBJECT_MAP[subjectId];
  const topic = subject.topics.find((item) => item.id === topicId)!;
  const node = student.knowledge[subjectId][topicId];
  const capacity = mean([
    student.ability.understanding,
    student.ability[subject.ability],
    student.ability.speed,
  ]);
  const state =
    (0.58 + student.habits.focus * 0.42) *
    (1 - student.psyche.fatigue * 0.48) *
    (0.58 + student.psyche.motivation * 0.42) *
    (1 - Math.max(0, student.psyche.stress - 0.55) * 0.4);
  const ecology = 0.82 + game.ecology.atmosphere * 0.18 + game.ecology.mutual * 0.09;
  const repeat = 1 / (1 + node.fluency * 0.85);
  const efficiency = (0.5 + capacity * 0.7) * state * seatEffect(game, student) * ecology * rate;
  const gain =
    minutes *
    0.00155 *
    efficiency *
    (1 - node.mastery) ** 1.45 *
    (1 - topic.difficulty * 0.32) *
    repeat;
  gains.push({
    studentId: student.id,
    subject: subjectId,
    topic: topicId,
    before: node.mastery,
    gain,
    minutes,
    efficiency,
    source,
  });
  node.mastery = clamp(node.mastery + gain);
  node.fluency = clamp(node.fluency + minutes * 0.0019 * (1 - node.fluency));
  node.practiced = game.day;
}
export function forget(student: Student, day: number) {
  for (const nodes of Object.values(student.knowledge))
    for (const node of Object.values(nodes)) {
      const gap = day - node.practiced;
      if (gap > 2)
        node.mastery = clamp(
          node.mastery -
            node.forgetting *
              (1 - node.fluency * 0.6) *
              (1 - student.ability.memory * 0.4) *
              Math.min(2, gap / 12),
        );
      node.fluency = clamp(node.fluency - 0.0011);
    }
}
