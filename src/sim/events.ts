import { EVENT_CONFIG } from '../config/game';
import { clamp, Random } from './random';
import type { Game, GameEvent, Student } from './types';

export function generateEvents(game: Game, rng: Random) {
  let count = 0;
  if (game.events.filter((event) => !event.resolved).length >= 10) return count;
  for (const student of game.students) {
    const seat = game.seats.indexOf(student.id);
    const neighbor = game.seats[seat % 2 === 0 ? seat + 1 : seat - 1];
    const conditions: Record<string, boolean> = {
      missed: student.missed >= 3,
      fatigue: student.psyche.fatigue > 0.57,
      conflict: (student.relations[neighbor] ?? 0) < -0.18 && student.psyche.stress > 0.36,
      help: (student.relations[neighbor] ?? 0) > 0.45 && student.psyche.motivation > 0.6,
      anxiety: student.psyche.anxiety > 0.55 && game.exams.at(-1)!.day >= game.day - 2,
      seat: Math.floor(seat / 10) >= 3 && student.vision < 0.5,
    };
    for (const config of EVENT_CONFIG) {
      const key = `${config.id}-${student.id}`;
      if (
        !conditions[config.id] ||
        game.day - (game.eventCooldowns[key] ?? -100) < config.cooldown ||
        game.events.some(
          (event) => !event.resolved && event.studentId === student.id && event.type === config.id,
        )
      )
        continue;
      if (rng.next() > config.probability) continue;
      const texts: Record<string, string> = {
        missed: `${student.name}最近多次没有完成作业。具体原因还不明确，可能需要了解任务难度与作息。`,
        fatigue: `${student.name}的家长留言：“孩子最近睡得晚，总说还有题没做完，想请老师一起看看。”`,
        conflict: `${student.name}与邻座${game.students.find((item) => item.id === neighbor)!.name}在课间发生了争执，双方的说法不完全相同。`,
        help: `${student.name}提出每天和同桌讨论一道题，希望老师支持这个小计划。`,
        anxiety: `${student.name}在最近一次考试后留言：“我担心努力了还是达不到目标。”`,
        seat: `${student.name}希望调整位置，表示有时看不清板书。还需要结合观察核实。`,
      };
      game.events.push({
        id: `event-${game.nextId++}`,
        type: config.id,
        day: game.day,
        studentId: student.id,
        otherId: neighbor,
        title: config.name,
        text: texts[config.id],
        resolved: false,
      });
      game.eventCooldowns[key] = game.day;
      count++;
      break;
    }
    if (count >= 2) break;
  }
  return count;
}
export function resolveEvent(game: Game, event: GameEvent, choice: number) {
  const student = game.students.find((item) => item.id === event.studentId)!;
  if (choice === 0) {
    student.psyche.trust = clamp(student.psyche.trust + 0.035 * (1 - student.psyche.trust));
    student.psyche.stress = clamp(student.psyche.stress - 0.035);
    if (event.type === 'fatigue') {
      student.psyche.fatigue = clamp(student.psyche.fatigue - 0.055);
      student.family.support = clamp(student.family.support + 0.025);
    }
    if (event.type === 'missed') {
      student.habits.homework = clamp(student.habits.homework + 0.02);
      student.psyche.motivation = clamp(student.psyche.motivation + 0.02);
    }
    if (event.type === 'anxiety') {
      student.psyche.anxiety = clamp(student.psyche.anxiety - 0.05);
      student.psyche.confidence = clamp(student.psyche.confidence + 0.025);
    }
    if (event.type === 'help') {
      game.ecology.mutual = clamp(game.ecology.mutual + 0.035);
      student.psyche.fatigue = clamp(student.psyche.fatigue + 0.018);
    }
    if (event.type === 'conflict' && event.otherId) {
      const other = game.students.find((item) => item.id === event.otherId)!;
      student.relations[other.id] = clamp((student.relations[other.id] ?? 0) + 0.15, -1, 1);
      other.relations[student.id] = clamp((other.relations[student.id] ?? 0) + 0.15, -1, 1);
    }
  } else {
    student.habits.discipline = clamp(student.habits.discipline + 0.012 * student.psyche.trust);
    student.psyche.stress = clamp(student.psyche.stress + (event.type === 'help' ? 0.005 : 0.035));
    student.psyche.trust = clamp(
      student.psyche.trust - (student.personality === '敏感' ? 0.035 : 0.015),
    );
    if (event.type === 'fatigue') student.family.pressure = clamp(student.family.pressure + 0.03);
  }
  event.resolved = true;
  event.choice = EVENT_CONFIG.find((config) => config.id === event.type)!.choices[choice];
  addObservation(
    game,
    student,
    '家长反馈',
    `已处理“${event.title}”：${event.choice}。后续变化仍需观察。`,
  );
}
export function addObservation(
  game: Game,
  student: Student,
  source: Game['observations'][number]['source'],
  text: string,
  hypothesis?: string,
) {
  game.observations.push({
    id: `obs-${game.nextId++}`,
    day: game.day,
    studentId: student.id,
    source,
    text,
    hypothesis,
  });
}
