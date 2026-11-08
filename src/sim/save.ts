import {
  ACTIONS,
  CLASS_SIZE,
  DIFFICULTIES,
  ERROR_LABELS,
  EVENT_CONFIG,
  GAME_DAYS,
  SUBJECTS,
  TOTAL_MAX,
} from '../config/game';
import { hashSeed } from './random';
import type { Game } from './types';

export function validateGame(value: unknown): asserts value is Game {
  if (!value || typeof value !== 'object') throw new Error('存档不是有效对象。');
  const game = value as Game;
  if (
    game.version !== 1 ||
    !game.settings ||
    !DIFFICULTIES[game.settings.difficulty] ||
    !SUBJECTS.some((subject) => subject.teachable && subject.id === game.settings.subject)
  )
    throw new Error('存档版本或规则不兼容。');
  if (
    typeof game.settings.seed !== 'string' ||
    typeof game.settings.teacher !== 'string' ||
    typeof game.settings.className !== 'string' ||
    !Number.isFinite(game.settings.cutoff) ||
    game.settings.cutoff < 300 ||
    game.settings.cutoff > TOTAL_MAX - 100
  )
    throw new Error('存档开局设置损坏。');
  if (
    !Number.isInteger(game.day) ||
    game.day < 1 ||
    game.day > GAME_DAYS ||
    typeof game.ended !== 'boolean' ||
    typeof game.debug !== 'boolean' ||
    !Number.isInteger(game.rng) ||
    game.rng < 0 ||
    game.rng > 0xffffffff ||
    !Number.isInteger(game.nextId) ||
    game.nextId < 1
  )
    throw new Error('存档时间或随机状态损坏。');
  if (
    !Array.isArray(game.students) ||
    game.students.length !== CLASS_SIZE ||
    !Array.isArray(game.seats) ||
    game.seats.length !== CLASS_SIZE
  )
    throw new Error('存档班级人数不完整。');
  const ids = new Set(game.students.map((student) => student.id));
  if (
    ids.size !== CLASS_SIZE ||
    Array.from({ length: CLASS_SIZE }, (_, index) => index + 1).some((id) => !ids.has(id)) ||
    new Set(game.seats).size !== CLASS_SIZE ||
    game.seats.some((id) => !ids.has(id))
  )
    throw new Error('存档座位数据重复或丢失。');
  for (const student of game.students) {
    if (
      !student.ability ||
      !student.habits ||
      !student.psyche ||
      !student.family ||
      !student.knowledge ||
      !student.relations ||
      !Array.isArray(student.friends) ||
      !Array.isArray(student.conflicts) ||
      typeof student.name !== 'string' ||
      !Number.isInteger(student.id)
    )
      throw new Error('学生数据损坏。');
    const requiredGroups = [
      [student.ability, ['understanding', 'memory', 'logic', 'language', 'transfer', 'speed']],
      [
        student.habits,
        ['discipline', 'focus', 'homework', 'participation', 'review', 'delay', 'help'],
      ],
      [student.psyche, ['confidence', 'motivation', 'anxiety', 'fatigue', 'stress', 'trust']],
      [student.family, ['support', 'pressure', 'trust']],
    ] as const;
    for (const [group, keys] of requiredGroups) {
      const values = group as Record<string, number>;
      if (keys.some((key) => !Number.isFinite(values[key]) || values[key] < 0 || values[key] > 1))
        throw new Error('学生状态缺失或超出范围。');
    }
    for (const subject of SUBJECTS)
      for (const topic of subject.topics) {
        const node = student.knowledge[subject.id]?.[topic.id];
        if (
          !node ||
          !node.errors ||
          !Number.isFinite(node.forgetting) ||
          node.forgetting < 0 ||
          node.forgetting > 0.01 ||
          !Number.isFinite(node.practiced) ||
          Object.keys(ERROR_LABELS).some(
            (key) =>
              !Number.isFinite(node.errors[key as keyof typeof ERROR_LABELS]) ||
              node.errors[key as keyof typeof ERROR_LABELS] < 0,
          )
        )
          throw new Error('知识点数据损坏。');
        if (
          ![node.mastery, node.fluency].every(
            (number) => Number.isFinite(number) && number >= 0 && number <= 1,
          )
        )
          throw new Error('知识掌握数值超出范围。');
      }
    if (
      ![
        student.lastTalk,
        student.lastParent,
        student.seatChanged,
        student.missed,
        student.vision,
        student.goal,
      ].every(Number.isFinite)
    )
      throw new Error('学生进度损坏。');
    if (
      student.vision < 0 ||
      student.vision > 1 ||
      student.goal < 0 ||
      student.goal > TOTAL_MAX ||
      student.friends.some((id) => !ids.has(id)) ||
      student.conflicts.some((id) => !ids.has(id)) ||
      Object.values(student.relations).some(
        (value) => !Number.isFinite(value) || value < -1 || value > 1,
      )
    )
      throw new Error('学生目标或关系数据损坏。');
  }
  for (const key of [
    'actions',
    'logs',
    'observations',
    'assignments',
    'submissions',
    'exams',
    'events',
    'traces',
  ] as const)
    if (!Array.isArray(game[key])) throw new Error(`存档缺少 ${key} 数据。`);
  const limits = DIFFICULTIES[game.settings.difficulty];
  if (
    !game.resources ||
    !Number.isFinite(game.resources.time) ||
    !Number.isFinite(game.resources.energy) ||
    game.resources.time < 0 ||
    game.resources.energy < 0 ||
    game.resources.time > limits.time ||
    game.resources.energy > limits.energy
  )
    throw new Error('教师资源数值损坏。');
  if (
    !game.ecology ||
    Object.values(game.ecology).some(
      (number) => !Number.isFinite(number) || number < 0 || number > 1,
    ) ||
    !game.eventCooldowns ||
    typeof game.id !== 'string'
  )
    throw new Error('班级环境损坏。');
  if (
    !game.exams.length ||
    game.exams.some(
      (exam) =>
        !Array.isArray(exam.results) ||
        exam.results.length !== CLASS_SIZE ||
        new Set(exam.results.map((result) => result.studentId)).size !== CLASS_SIZE ||
        exam.results.some(
          (result) =>
            !ids.has(result.studentId) ||
            !Number.isFinite(result.total) ||
            SUBJECTS.some(
              (subject) =>
                !Number.isFinite(result.scores?.[subject.id]) ||
                result.scores[subject.id] < 0 ||
                result.scores[subject.id] > subject.max,
            ) ||
            Math.abs(
              result.total - SUBJECTS.reduce((sum, subject) => sum + result.scores[subject.id], 0),
            ) > 0.11,
        ),
    )
  )
    throw new Error('考试成绩数据损坏。');
  for (const exam of game.exams) {
    if (
      typeof exam.name !== 'string' ||
      !Number.isInteger(exam.day) ||
      exam.day < 0 ||
      exam.day > game.day ||
      !Array.isArray(exam.papers) ||
      exam.papers.length !== SUBJECTS.length
    )
      throw new Error('试卷档案损坏。');
    for (const subject of SUBJECTS) {
      const paper = exam.papers.find((paper) => paper.subject === subject.id);
      if (
        !paper ||
        !paper.sample ||
        typeof paper.sample.prompt !== 'string' ||
        typeof paper.sample.answer !== 'string' ||
        !Number.isFinite(paper.difficulty) ||
        !paper.topicWeights ||
        subject.topics.some(
          (topic) =>
            !Number.isFinite(paper.topicWeights[topic.id]) || paper.topicWeights[topic.id] <= 0,
        )
      )
        throw new Error('试卷知识覆盖损坏。');
    }
  }
  if (game.ended && (game.day !== GAME_DAYS || !game.exams.at(-1)?.final))
    throw new Error('存档结算状态不一致。');
  const validTargets = (targets: number[]) =>
    Array.isArray(targets) &&
    targets.length > 0 &&
    new Set(targets).size === targets.length &&
    targets.every((id) => ids.has(id));
  const validTopic = (subjectId: string, topicId: string) =>
    SUBJECTS.some(
      (subject) => subject.id === subjectId && subject.topics.some((topic) => topic.id === topicId),
    );
  const validCause = (cause: unknown) =>
    cause === null || (typeof cause === 'string' && Object.hasOwn(ERROR_LABELS, cause));
  if (
    new Set(game.assignments.map((item) => item.id)).size !== game.assignments.length ||
    new Set(game.submissions.map((item) => item.id)).size !== game.submissions.length
  )
    throw new Error('作业档案编号重复。');
  for (const assignment of game.assignments)
    if (
      !SUBJECTS.some(
        (subject) =>
          subject.id === assignment.subject &&
          subject.topics.some((topic) => topic.id === assignment.topic),
      ) ||
      !validTargets(assignment.targets) ||
      !Number.isInteger(assignment.quantity) ||
      assignment.quantity < 4 ||
      assignment.quantity > 60 ||
      !Number.isFinite(assignment.difficulty) ||
      assignment.difficulty < 0.25 ||
      assignment.difficulty > 0.85 ||
      !Number.isInteger(assignment.day) ||
      assignment.day < 1 ||
      assignment.day > game.day
    )
      throw new Error('作业数据损坏。');
  const assignments = new Map(game.assignments.map((item) => [item.id, item]));
  for (const submission of game.submissions) {
    const assignment = assignments.get(submission.assignmentId);
    if (
      !assignment ||
      !assignment.targets.includes(submission.studentId) ||
      !Number.isInteger(submission.completed) ||
      !Number.isInteger(submission.correct) ||
      submission.correct < 0 ||
      submission.correct > submission.completed ||
      submission.completed > assignment.quantity ||
      !submission.question ||
      typeof submission.question.prompt !== 'string' ||
      typeof submission.question.answer !== 'string' ||
      typeof submission.answer !== 'string' ||
      typeof submission.clue !== 'string' ||
      !validCause(submission.actualCause) ||
      !validCause(submission.diagnosis) ||
      typeof submission.reviewed !== 'boolean'
    )
      throw new Error('作业提交数据损坏。');
  }
  for (const action of game.actions)
    if (
      !Object.hasOwn(ACTIONS, action.kind) ||
      action.day !== game.day ||
      !validTargets(action.targets) ||
      (['lesson', 'review', 'practice', 'feedback', 'tutor'].includes(action.kind) &&
        !validTopic(action.subject, action.topic))
    )
      throw new Error('待执行行动损坏。');
  for (const event of game.events)
    if (
      !ids.has(event.studentId) ||
      !EVENT_CONFIG.some((config) => config.id === event.type) ||
      typeof event.title !== 'string' ||
      typeof event.text !== 'string' ||
      typeof event.resolved !== 'boolean' ||
      (event.otherId !== undefined && !ids.has(event.otherId))
    )
      throw new Error('班级事务数据损坏。');
  for (const observation of game.observations)
    if (
      !ids.has(observation.studentId) ||
      typeof observation.text !== 'string' ||
      typeof observation.source !== 'string'
    )
      throw new Error('观察数据损坏。');
  for (const trace of game.traces)
    if (
      !Array.isArray(trace.ledgers) ||
      !Array.isArray(trace.gains) ||
      !Number.isInteger(trace.day) ||
      trace.ledgers.some((ledger) => !ids.has(ledger.studentId) || !Number.isFinite(ledger.budget))
    )
      throw new Error('每日轨迹数据损坏。');
}
export function serializeGame(game: Game) {
  validateGame(game);
  const data = JSON.stringify(game);
  return JSON.stringify({ format: 'GameX-Homeroom', version: 1, checksum: hashSeed(data), game });
}
export function deserializeGame(text: string, allowDebug = false): Game {
  if (text.length > 35_000_000) throw new Error('存档超过支持的大小。');
  let envelope;
  try {
    envelope = JSON.parse(text);
  } catch {
    throw new Error('无法解析存档文件，请选择导出的 GameX JSON 存档。');
  }
  if (
    !envelope ||
    typeof envelope !== 'object' ||
    envelope.format !== 'GameX-Homeroom' ||
    envelope.version !== 1 ||
    envelope.checksum !== hashSeed(JSON.stringify(envelope.game))
  )
    throw new Error('存档格式或校验不正确。');
  validateGame(envelope.game);
  if (envelope.game.debug && !allowDebug) throw new Error('调试副本不能导入普通存档。');
  return envelope.game;
}
