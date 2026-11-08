import {
  CLASS_SIZE,
  DIFFICULTIES,
  GIVEN_NAMES,
  getSubjects,
  isClassTrack,
  SURNAMES,
  TOTAL_MAX,
} from '../config/game';
import { sitExam } from './exam';
import { clamp, hashSeed, Random } from './random';
import type { Game, GameSettings, Student } from './types';

export const DEFAULT_SETTINGS: GameSettings = {
  teacher: '林老师',
  subject: 'math',
  track: 'science',
  className: '高三（3）班',
  difficulty: 'normal',
  seed: '春山2011',
  cutoff: 450,
};
export function createGame(input: GameSettings, debug = false): Game {
  if (input.track !== undefined && !isClassTrack(input.track))
    throw new Error('请选择文科班或理科班。');
  const subjects = getSubjects(input);
  if (!subjects.some((subject) => subject.id === input.subject && subject.teachable))
    throw new Error('请选择配置允许的任教学科。');
  if (
    !DIFFICULTIES[input.difficulty] ||
    !Number.isFinite(input.cutoff) ||
    input.cutoff < 300 ||
    input.cutoff > TOTAL_MAX - 100
  )
    throw new Error('开局设置不合法。');
  const settings = {
    ...input,
    track: input.track ?? 'science',
    teacher: input.teacher.trim().slice(0, 20) || '林老师',
    className: input.className.trim().slice(0, 30) || '高三（3）班',
    seed: input.seed.trim().slice(0, 80) || '春山2011',
  };
  const rng = new Random(hashSeed(settings.seed));
  const difficulty = DIFFICULTIES[settings.difficulty];
  const game: Game = {
    version: 1,
    id: `class-${hashSeed(JSON.stringify(settings))}`,
    settings,
    day: 1,
    ended: false,
    rng: rng.state,
    students: [],
    seats: [],
    resources: { time: difficulty.time, energy: difficulty.energy },
    actions: [],
    logs: [],
    observations: [],
    assignments: [],
    submissions: [],
    exams: [],
    events: [],
    eventCooldowns: {},
    ecology: {
      atmosphere: 0.6,
      discipline: 0.62,
      mutual: 0.48,
      stress: 0.4,
      trust: 0.57,
      cohesion: 0.54,
    },
    traces: [],
    debug,
    nextId: 1,
  };
  const usedNames = new Set<string>();
  for (let index = 0; index < CLASS_SIZE; index++) {
    let name: string;
    do {
      name = rng.pick(SURNAMES) + rng.pick(GIVEN_NAMES);
    } while (usedNames.has(name));
    usedNames.add(name);
    const base = clamp(difficulty.base + (rng.next() - 0.5) * difficulty.spread * 2, 0.2, 0.88);
    const discipline = clamp(rng.bell() * 0.7 + base * 0.3, 0.12, 0.94);
    const memory = rng.range(0.32, 0.92);
    const pressure = clamp(0.85 - difficulty.support + rng.range(-0.15, 0.25));
    const student: Student = {
      id: index + 1,
      name,
      gender: rng.next() < 0.5 ? '男' : '女',
      goal: Math.round(clamp(base * TOTAL_MAX + rng.range(35, 110), 330, TOTAL_MAX - 70)),
      personality: rng.pick(['敏感', '开朗', '独立', '谨慎'] as const),
      ability: {
        understanding: rng.range(0.3, 0.9),
        memory,
        logic: rng.range(0.28, 0.94),
        language: rng.range(0.3, 0.94),
        transfer: rng.range(0.25, 0.9),
        speed: rng.range(0.35, 0.9),
      },
      habits: {
        discipline,
        focus: clamp(discipline * 0.55 + rng.bell() * 0.45),
        homework: clamp(discipline * 0.6 + rng.range(0.1, 0.4)),
        participation: rng.range(0.2, 0.85),
        review: clamp(discipline * 0.6 + rng.range(0.08, 0.35)),
        delay: clamp(0.8 - discipline * 0.7 + rng.range(-0.12, 0.12)),
        help: rng.range(0.18, 0.85),
      },
      psyche: {
        confidence: clamp(base * 0.6 + rng.range(0.1, 0.35)),
        motivation: rng.range(0.35, 0.84),
        anxiety: clamp(pressure * 0.5 + rng.range(0.1, 0.35)),
        fatigue: rng.range(0.12, 0.35),
        stress: clamp(pressure * 0.5 + rng.range(0.12, 0.35)),
        trust: rng.range(0.36, 0.72),
      },
      family: {
        support: clamp(difficulty.support + rng.range(-0.25, 0.22)),
        pressure,
        trust: rng.range(0.35, 0.8),
      },
      vision: rng.range(0.3, 1),
      friends: [],
      conflicts: [],
      relations: {},
      knowledge: {},
      seatChanged: -20,
      lastTalk: -20,
      lastParent: -20,
      missed: 0,
    };
    for (const subject of subjects) {
      const subjectBase = clamp(base + rng.range(-0.17, 0.17));
      student.knowledge[subject.id] = Object.fromEntries(
        subject.topics.map((topic) => [
          topic.id,
          {
            mastery: clamp(subjectBase + rng.range(-0.16, 0.16), 0.06, 0.94),
            fluency: clamp(subjectBase * rng.range(0.35, 0.75)),
            forgetting: (1 - memory * 0.5) * rng.range(0.00012, 0.0005),
            practiced: 0,
            errors: { concept: 0, method: 0, calculation: 0, reading: 0, state: 0 },
          },
        ]),
      );
    }
    game.students.push(student);
    game.seats.push(student.id);
  }
  for (const student of game.students) {
    for (let i = 0; i < 2; i++) {
      const friend = rng.pick(game.students.filter((other) => other.id !== student.id));
      if (!student.friends.includes(friend.id)) student.friends.push(friend.id);
      if (!friend.friends.includes(student.id)) friend.friends.push(student.id);
      student.relations[friend.id] = friend.relations[student.id] = rng.range(0.4, 0.85);
    }
    if (rng.next() < 0.3) {
      const other = rng.pick(
        game.students.filter(
          (other) => other.id !== student.id && !student.friends.includes(other.id),
        ),
      );
      student.conflicts.push(other.id);
      other.conflicts.push(student.id);
      student.relations[other.id] = other.relations[student.id] = -rng.range(0.2, 0.6);
    }
  }
  game.day = 0;
  sitExam(game, rng, '开学摸底', 0.55);
  game.day = 1;
  game.rng = rng.state;
  game.logs.push({
    day: 1,
    kind: 'system',
    text: `接手${settings.className}，从了解每一位学生开始。`,
  });
  game.students.slice(0, 8).forEach((student) =>
    game.observations.push({
      id: `obs-${game.nextId++}`,
      day: 1,
      studentId: student.id,
      source: '课堂观察',
      text:
        student.habits.participation > 0.55
          ? '摸底讲评时主动回答问题，表达较积极。'
          : '课堂发言不多，还需要通过作业与谈话进一步了解。',
    }),
  );
  return game;
}
