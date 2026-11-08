import { STUDY_MINUTES, getSubjects } from '../config/game';
import { completeHomework } from './homework';
import { forget, learn, subjectMastery, weakestTopic } from './knowledge';
import { clamp, mean, Random } from './random';
import type { Game, GainTrace, Student, StudyLedger } from './types';

export function simulateStudent(
  game: Game,
  student: Student,
  rng: Random,
  gains: GainTrace[],
): StudyLedger {
  forget(student, game.day);
  const subjects = getSubjects(game.settings);
  const own = game.settings.subject;
  const bySubject = Object.fromEntries(subjects.map((subject) => [subject.id, 0]));
  let remaining = STUDY_MINUTES;
  const ledger: StudyLedger = {
    studentId: student.id,
    budget: STUDY_MINUTES,
    teaching: 0,
    homework: 0,
    autonomous: 0,
    rest: 0,
    bySubject,
    behavior: '',
  };
  const active = game.actions.filter((action) => action.targets.includes(student.id));
  // 心理疏导、班会与谈话也占用学生时间，教师资源不能凭空创造额外学习时长。
  const supportTime = Math.min(
    remaining,
    active.filter((action) => ['relax', 'meeting', 'talk', 'parent'].includes(action.kind)).length *
      12,
  );
  remaining -= supportTime;
  ledger.rest += supportTime;
  const homework = game.assignments.filter(
    (assignment) => assignment.day === game.day && assignment.targets.includes(student.id),
  );
  let workload = 0;
  for (const assignment of homework) {
    const submission = completeHomework(game, student, assignment, rng);
    game.submissions.push(submission);
    const minutes = Math.min(remaining, submission.completed * 2);
    remaining -= minutes;
    workload += minutes;
    ledger.homework += minutes;
    bySubject[assignment.subject] += minutes;
    const fit = clamp(
      1 -
        Math.abs(
          assignment.difficulty - student.knowledge[assignment.subject][assignment.topic].mastery,
        ) *
          0.8,
      0.35,
      1,
    );
    learn(
      game,
      student,
      assignment.subject,
      assignment.topic,
      minutes,
      0.95 * fit,
      '作业训练',
      gains,
    );
  }
  const teaching = active.filter((action) =>
    ['lesson', 'review', 'practice', 'feedback', 'tutor'].includes(action.kind),
  );
  const minutesByKind = { lesson: 30, review: 22, practice: 28, feedback: 24, tutor: 24 };
  const totalExtra = teaching.reduce(
    (sum, action) => sum + minutesByKind[action.kind as keyof typeof minutesByKind],
    0,
  );
  const baseDemand = subjects.length * 23;
  const scale = Math.min(1, remaining / (baseDemand + totalExtra));
  for (const subject of subjects) {
    const minutes = 23 * scale;
    const index = Math.floor((game.day - 1) / 2) % subject.topics.length;
    const topic =
      student.habits.help > 0.6 && student.psyche.trust > 0.5 && rng.next() < 0.3
        ? weakestTopic(student, subject.id)
        : subject.topics[index].id;
    learn(
      game,
      student,
      subject.id,
      topic,
      minutes,
      subject.id === own ? 0.88 : 1,
      subject.id === own ? '常规课程' : '其他教师课程',
      gains,
    );
    remaining -= minutes;
    ledger.teaching += minutes;
    bySubject[subject.id] += minutes;
  }
  for (const action of teaching) {
    const minutes = minutesByKind[action.kind as keyof typeof minutesByKind] * scale;
    const node = student.knowledge[action.subject][action.topic];
    const rates = {
      lesson: 1.15 * (1.1 - node.mastery * 0.35),
      review: 0.95,
      practice: 1.05 * (0.85 + student.ability.transfer * 0.3),
      feedback: 1.1,
      tutor: 1.65,
    };
    let rate = rates[action.kind as keyof typeof rates];
    if (action.kind === 'feedback') {
      const evidence = game.submissions.filter(
        (submission) =>
          submission.studentId === student.id &&
          submission.reviewed &&
          game.assignments.find((assignment) => assignment.id === submission.assignmentId)
            ?.topic === action.topic,
      );
      const latest = evidence.at(-1);
      if (latest) rate *= latest.matched ? 1.45 : 0.55;
    }
    learn(game, student, action.subject, action.topic, minutes, rate, action.kind, gains);
    if (action.kind === 'review') node.fluency = clamp(node.fluency + 0.012 * (1 - node.fluency));
    remaining -= minutes;
    ledger.teaching += minutes;
    bySubject[action.subject] += minutes;
  }
  remaining = Math.max(0, remaining);
  const investment = clamp(
    0.1 +
      student.habits.discipline * 0.34 +
      student.psyche.motivation * 0.3 +
      student.habits.review * 0.14 +
      student.psyche.trust * student.habits.help * 0.1 -
      student.psyche.fatigue * 0.26 -
      student.habits.delay * 0.14 +
      rng.range(-0.07, 0.07),
    0.05,
    0.9,
  );
  const selfTime = remaining * investment;
  const stressed = student.psyche.anxiety > 0.65 && student.psyche.stress > 0.6;
  const subject = rng.weighted(
    subjects.map((subject) => ({
      value: subject,
      weight:
        0.12 +
        (1 - subjectMastery(student, subject.id)) * 0.6 +
        (subject.id === own && workload > 65 ? -0.18 : 0) +
        (student.goal > 580 ? student.ability[subject.ability] * 0.2 : 0),
    })),
  );
  const topic =
    student.habits.review + student.habits.discipline > 1
      ? weakestTopic(student, subject.id)
      : rng.pick(subject.topics).id;
  learn(
    game,
    student,
    subject.id,
    topic,
    selfTime,
    stressed ? 0.52 : 0.94,
    stressed ? '焦虑下的重复刷题' : '自主复习',
    gains,
  );
  ledger.autonomous = selfTime;
  bySubject[subject.id] += selfTime;
  ledger.rest += remaining - selfTime;
  ledger.behavior =
    student.psyche.fatigue > 0.7
      ? '疲劳影响投入'
      : stressed
        ? '反复刷题，效率有限'
        : investment > 0.55
          ? '主动复习薄弱点'
          : student.habits.delay > 0.5
            ? '投入断续，出现拖延'
            : '按计划完成基础复习';
  const load = (ledger.teaching + ledger.homework + selfTime) / STUDY_MINUTES;
  const recovery = 0.028 + student.family.support * 0.014 + (ledger.rest / STUDY_MINUTES) * 0.035;
  student.psyche.fatigue = clamp(
    student.psyche.fatigue + 0.042 * load + Math.max(0, workload - 45) * 0.00045 - recovery,
  );
  student.psyche.stress = clamp(
    student.psyche.stress +
      Math.max(0, workload - 45) * 0.0003 +
      student.family.pressure * 0.006 -
      student.family.support * 0.005 -
      0.001,
  );
  student.psyche.anxiety = clamp(
    student.psyche.anxiety * 0.992 + student.psyche.stress * 0.005 + (game.day > 90 ? 0.002 : 0),
  );
  student.psyche.motivation = clamp(
    student.psyche.motivation +
      (game.ecology.atmosphere - 0.5) * 0.003 -
      Math.max(0, student.psyche.fatigue - 0.65) * 0.007,
  );
  const seat = game.seats.indexOf(student.id);
  const neighborId = game.seats[seat % 2 === 0 ? seat + 1 : seat - 1];
  if (neighborId) {
    const relation = student.relations[neighborId] ?? 0;
    student.relations[neighborId] = clamp(
      relation +
        (game.ecology.mutual - 0.45) * 0.004 -
        (relation < 0 ? student.psyche.stress * 0.002 : 0),
      -1,
      1,
    );
  }
  return ledger;
}

export function updateEcology(game: Game) {
  const students = game.students;
  const smooth = (old: number, target: number) => clamp(old * 0.92 + target * 0.08);
  game.ecology.atmosphere = smooth(
    game.ecology.atmosphere,
    mean(
      students.map(
        (student) =>
          student.psyche.motivation * 0.5 +
          student.habits.discipline * 0.3 +
          (1 - student.psyche.fatigue) * 0.2,
      ),
    ),
  );
  game.ecology.discipline = smooth(
    game.ecology.discipline,
    mean(students.map((student) => student.habits.discipline * 0.7 + student.psyche.trust * 0.3)),
  );
  game.ecology.stress = mean(students.map((student) => student.psyche.stress));
  game.ecology.trust = mean(students.map((student) => student.psyche.trust));
  game.ecology.mutual = smooth(
    game.ecology.mutual,
    mean(
      students.map(
        (student) =>
          student.habits.help * 0.4 +
          mean(Object.values(student.relations).map((relation) => clamp(relation))) * 0.6,
      ),
    ),
  );
  game.ecology.cohesion = smooth(
    game.ecology.cohesion,
    game.ecology.trust * 0.5 + game.ecology.mutual * 0.5,
  );
}
