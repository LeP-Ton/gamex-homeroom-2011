import { describe, expect, it } from 'vitest';
import {
  ACTIONS,
  CLASS_SIZE,
  DIFFICULTIES,
  GAME_DAYS,
  STUDY_MINUTES,
  SUBJECTS,
} from '../config/game';
import { classAnalysis, makeRecord, studentAnalysis } from './analytics';
import { createGame, DEFAULT_SETTINGS } from './generate';
import { execute } from './engine';
import { examStats, sitExam } from './exam';
import { generateEvents } from './events';
import { forget, learn, subjectMastery } from './knowledge';
import { Random, mean } from './random';
import { deserializeGame, serializeGame, validateGame } from './save';
import { playStrategyDay, simulateRun } from './strategies';
import type { Difficulty, Game, GameCommand } from './types';

const create = (seed = '验收班级', difficulty: Difficulty = 'normal') =>
  createGame({ ...DEFAULT_SETTINGS, seed, difficulty });
const apply = (game: Game, command: GameCommand) => {
  const result = execute(game, command);
  expect(result.ok, result.message).toBe(true);
  return result.game;
};

describe('确定性与存档', () => {
  it('相同种子重建完全一致的50人班级', () => {
    const first = create();
    expect(first).toEqual(create());
    expect(first.students).toHaveLength(CLASS_SIZE);
    expect(new Set(first.students.map((student) => student.name)).size).toBe(CLASS_SIZE);
    expect(first.students).not.toEqual(create('另一个班级').students);
  });
  it('相同种子和复杂行动序列产生完全相同结果', () => {
    const run = () => {
      let game = create();
      game = apply(game, { type: 'swap', a: 0, b: 49 });
      for (let day = 0; day < 12; day++) game = playStrategyDay(game, 'balanced');
      const submission = game.submissions[0];
      game = apply(game, { type: 'diagnose', submissionId: submission.id, cause: 'concept' });
      return apply(game, { type: 'advance' });
    };
    expect(run()).toEqual(run());
  });
  it('保存完整队列、观察、事件与随机状态，读档续算等于连续模拟', () => {
    let game = create();
    for (let day = 0; day < 8; day++) game = playStrategyDay(game, 'balanced');
    game = apply(game, { type: 'teach', kind: 'lesson', topic: 'math-2' });
    const loaded = deserializeGame(serializeGame(game));
    expect(loaded).toEqual(game);
    let uninterrupted = game;
    let continued = loaded;
    for (let day = 0; day < 8; day++) {
      uninterrupted = playStrategyDay(uninterrupted, 'balanced');
      continued = playStrategyDay(continued, 'balanced');
    }
    expect(continued).toEqual(uninterrupted);
  });
  it('拒绝损坏校验、错误版本与非法数值的存档', () => {
    const game = create();
    const envelope = JSON.parse(serializeGame(game));
    envelope.game.rng++;
    expect(() => deserializeGame(JSON.stringify(envelope))).toThrow();
    const corrupt = structuredClone(game);
    corrupt.students[0].knowledge.math['math-0'].mastery = NaN;
    expect(() => validateGame(corrupt)).toThrow();
    corrupt.students[0].knowledge.math['math-0'].mastery = 0.5;
    corrupt.seats[1] = corrupt.seats[0];
    expect(() => validateGame(corrupt)).toThrow();
  });
  it('调试副本无法导入普通模式或生成排行榜记录', () => {
    const game = createGame(DEFAULT_SETTINGS, true);
    expect(() => deserializeGame(serializeGame(game))).toThrow(/调试/);
    expect(deserializeGame(serializeGame(game), true).debug).toBe(true);
    game.ended = true;
    expect(makeRecord(game)).toBeNull();
  });
});

describe('资源与动作边界', () => {
  it('拒绝缺失状态、断裂提交与损坏试卷，解析错误用中文提示', () => {
    const game = playStrategyDay(create(), 'balanced');
    const missing = structuredClone(game);
    delete (missing.students[0].psyche as Partial<(typeof missing.students)[0]['psyche']>).fatigue;
    expect(() => validateGame(missing)).toThrow();
    const broken = structuredClone(game);
    broken.submissions[0].assignmentId = '不存在';
    expect(() => validateGame(broken)).toThrow();
    const paper = structuredClone(game);
    paper.exams[0].papers[0].topicWeights = {};
    expect(() => validateGame(paper)).toThrow();
    expect(() => deserializeGame('错误文件')).toThrow(/无法解析/);
  });
  it('成功指令不改写旧状态的学生、提交和历史记录', () => {
    const game = playStrategyDay(create(), 'balanced');
    const before = structuredClone(game);
    const next = apply(game, {
      type: 'diagnose',
      submissionId: game.submissions[0].id,
      cause: 'concept',
    });
    expect(game).toEqual(before);
    const savedNext = structuredClone(next);
    apply(next, { type: 'advance' });
    expect(next).toEqual(savedNext);
  });
  it('教学不直接增加成绩或立即改变知识，结束今日后才学习', () => {
    const game = create();
    const next = apply(game, { type: 'teach', kind: 'lesson', topic: 'math-0' });
    expect(next.exams).toEqual(game.exams);
    expect(next.students[0].knowledge).toEqual(game.students[0].knowledge);
    const settled = apply(next, { type: 'advance' });
    expect(settled.students[0].knowledge.math['math-0'].mastery).toBeGreaterThan(
      game.students[0].knowledge.math['math-0'].mastery,
    );
  });
  it('教师时间和精力只扣一次，失败指令不改变原始状态或随机数', () => {
    let game = create();
    game = apply(game, { type: 'teach', kind: 'lesson', topic: 'math-0' });
    expect(game.resources.time).toBe(DIFFICULTIES.normal.time - ACTIONS.lesson.time);
    const duplicate = execute(game, { type: 'teach', kind: 'lesson', topic: 'math-0' });
    expect(duplicate.ok).toBe(false);
    expect(duplicate.game).toBe(game);
    game.resources.time = 0;
    const rejected = execute(game, { type: 'quiz', difficulty: 0.55 });
    expect(rejected.ok).toBe(false);
    expect(rejected.game.rng).toBe(game.rng);
  });
  it('谈话和家校联络冷却生效', () => {
    let game = create();
    game = apply(game, { type: 'teach', kind: 'talk', targets: [1], style: '鼓励' });
    game = apply(game, { type: 'advance' });
    expect(execute(game, { type: 'teach', kind: 'talk', targets: [1], style: '鼓励' }).ok).toBe(
      false,
    );
  });
  it('无法布置其他学科、重复作业或非法知识点', () => {
    let game = create();
    expect(
      execute(game, {
        type: 'assign',
        subject: 'english',
        topic: 'english-0',
        quantity: 10,
        difficulty: 0.5,
        targets: [1],
      }).ok,
    ).toBe(false);
    game = apply(game, {
      type: 'assign',
      topic: 'math-0',
      quantity: 10,
      difficulty: 0.5,
      targets: [1],
    });
    expect(
      execute(game, {
        type: 'assign',
        topic: 'math-1',
        quantity: 10,
        difficulty: 0.5,
        targets: [1],
      }).ok,
    ).toBe(false);
    expect(execute(game, { type: 'teach', kind: 'lesson', topic: '无效' }).ok).toBe(false);
  });
  it('座位交换后每位学生恰好有一个位置，其他档案保持一致', () => {
    const game = create();
    const next = apply(game, { type: 'swap', a: 0, b: 49 });
    expect(new Set(next.seats).size).toBe(CLASS_SIZE);
    expect(next.seats[0]).toBe(50);
    expect(next.seats[49]).toBe(1);
    expect(next.students.find((student) => student.id === 50)!.seatChanged).toBe(1);
    expect(execute(next, { type: 'swap', a: 0, b: 50 }).ok).toBe(false);
  });
  it('每日学生时间不重复使用，按科目分配与总量一致', () => {
    const game = playStrategyDay(create(), 'cram');
    for (const ledger of game.traces[0].ledgers) {
      const study = ledger.teaching + ledger.homework + ledger.autonomous;
      expect(study + ledger.rest).toBeCloseTo(STUDY_MINUTES, 6);
      expect(
        Object.values(ledger.bySubject).reduce((sum, minutes) => sum + minutes, 0),
      ).toBeCloseTo(study, 6);
      expect(study).toBeLessThanOrEqual(STUDY_MINUTES + 0.00001);
    }
  });
  it('大量单科任务确实挤占其他学科学习时间', () => {
    const idle = playStrategyDay(create(), 'observe');
    const cram = playStrategyDay(create(), 'cram');
    expect(mean(cram.traces[0].ledgers.map((ledger) => ledger.bySubject.english))).toBeLessThan(
      mean(idle.traces[0].ledgers.map((ledger) => ledger.bySubject.english)),
    );
  });
});

describe('知识、自主行为和考试模型', () => {
  it('事件必须满足真实条件，同一学生同类事件受冷却限制', () => {
    const game = create();
    for (const student of game.students) {
      student.missed = 0;
      student.vision = 1;
      student.psyche.fatigue = 0;
      student.psyche.anxiety = 0;
      student.psyche.stress = 0;
      student.psyche.motivation = 0;
    }
    const rng = new Random(7);
    expect(generateEvents(game, rng)).toBe(0);
    game.students[0].missed = 3;
    for (let attempt = 0; attempt < 20 && !game.events.length; attempt++) generateEvents(game, rng);
    expect(game.events).toHaveLength(1);
    expect(game.events[0].type).toBe('missed');
    game.events[0].resolved = true;
    game.day++;
    expect(generateEvents(game, rng)).toBe(0);
  });
  it('相同教学对个体产生不同收益', () => {
    const game = playStrategyDay(create(), 'balanced');
    const gains = game.traces[0].gains.filter((gain) => gain.source === 'lesson');
    expect(new Set(gains.map((gain) => gain.gain.toFixed(7))).size).toBeGreaterThan(20);
  });
  it('疲劳和压力降低学习效率，高掌握与熟练度产生边际递减', () => {
    const game = create();
    const fresh = structuredClone(game.students[0]);
    const tired = structuredClone(fresh);
    tired.psyche.fatigue = 1;
    tired.psyche.stress = 1;
    const first: Game['traces'][number]['gains'] = [];
    const second: typeof first = [];
    learn(game, fresh, 'math', 'math-0', 30, 1, '测试', first);
    learn(game, tired, 'math', 'math-0', 30, 1, '测试', second);
    expect(first[0].gain).toBeGreaterThan(second[0].gain);
    const advanced = structuredClone(fresh);
    advanced.knowledge.math['math-0'].mastery = 0.95;
    advanced.knowledge.math['math-0'].fluency = 0.95;
    learn(game, advanced, 'math', 'math-0', 30, 1, '测试', second);
    expect(second[1].gain).toBeLessThan(first[0].gain);
  });
  it('长期未练习的知识点发生遗忘，数值仍合法', () => {
    const game = create();
    const student = game.students[0];
    const before = student.knowledge.math['math-0'].mastery;
    forget(student, 30);
    expect(student.knowledge.math['math-0'].mastery).toBeLessThan(before);
  });
  it('作业、教学与试卷都使用相同配置知识点，提交编号唯一', () => {
    let game = create();
    for (let day = 0; day < 6; day++) game = playStrategyDay(game, 'balanced');
    expect(new Set(game.submissions.map((item) => item.id)).size).toBe(game.submissions.length);
    for (const assignment of game.assignments)
      expect(
        SUBJECTS.find((subject) => subject.id === assignment.subject)!.topics.some(
          (topic) => topic.id === assignment.topic,
        ),
      ).toBe(true);
    for (const paper of game.exams[0].papers)
      expect(Object.keys(paper.topicWeights).sort()).toEqual(
        SUBJECTS.find((subject) => subject.id === paper.subject)!
          .topics.map((topic) => topic.id)
          .sort(),
      );
  });
  it('批改只有一次且记录为教师推测，不直接改成绩', () => {
    let game = playStrategyDay(create(), 'balanced');
    const submission = game.submissions[0];
    const exams = structuredClone(game.exams);
    game = apply(game, { type: 'diagnose', submissionId: submission.id, cause: 'concept' });
    expect(game.exams).toEqual(exams);
    expect(game.observations.at(-1)!.source).toBe('教师推测');
    expect(
      execute(game, { type: 'diagnose', submissionId: submission.id, cause: 'concept' }).ok,
    ).toBe(false);
  });
  it('同等状态下知识更高者具有显著统计成绩优势', () => {
    const game = create();
    for (const student of game.students) {
      student.psyche = { ...game.students[0].psyche };
      for (const nodes of Object.values(student.knowledge))
        for (const node of Object.values(nodes)) {
          node.mastery = student.id <= 25 ? 0.8 : 0.3;
          node.fluency = 0.5;
        }
    }
    const exam = sitExam(game, new Random(300), '模型检验', 0.55);
    expect(mean(exam.results.slice(0, 25).map((result) => result.total))).toBeGreaterThan(
      mean(exam.results.slice(25).map((result) => result.total)) + 200,
    );
  });
  it('普通成绩区间不读取隐藏属性或未来随机数', () => {
    const game = create();
    const original = studentAnalysis(game, 1);
    game.students[0].psyche.anxiety = 1;
    for (const node of Object.values(game.students[0].knowledge.math)) node.mastery = 0;
    game.rng = 100;
    expect(studentAnalysis(game, 1)).toEqual(original);
  });
});

describe('完整百日、统计与平衡边界', () => {
  it('100 天完成高考，所有分数、状态和知识合法，统计与个人一致', () => {
    const { game } = simulateRun('百日验收', 'normal', 'balanced', false);
    expect(game.day).toBe(GAME_DAYS);
    expect(game.ended).toBe(true);
    expect(game.exams.at(-1)!.final).toBe(true);
    expect(game.exams.filter((exam) => [0, 25, 50, 75, 100].includes(exam.day))).toHaveLength(5);
    expect(() => validateGame(game)).not.toThrow();
    for (const student of game.students)
      for (const nodes of Object.values(student.knowledge))
        for (const node of Object.values(nodes)) {
          expect(node.mastery).toBeGreaterThanOrEqual(0);
          expect(node.mastery).toBeLessThanOrEqual(1);
        }
    for (const exam of game.exams)
      for (const result of exam.results) {
        for (const subject of SUBJECTS) {
          expect(result.scores[subject.id]).toBeGreaterThanOrEqual(0);
          expect(result.scores[subject.id]).toBeLessThanOrEqual(subject.max);
        }
        expect(result.total).toBeCloseTo(
          Object.values(result.scores).reduce((sum, score) => sum + score, 0),
          1,
        );
      }
    const stats = examStats(game.exams.at(-1)!, game.settings.cutoff);
    expect(stats.qualified).toBe(
      game.exams.at(-1)!.results.filter((result) => result.total >= game.settings.cutoff).length,
    );
    expect(stats.rate).toBe(stats.qualified / 50);
    expect(classAnalysis(game).average).toBe(stats.average);
    expect(makeRecord(game)).not.toBeNull();
    expect(execute(game, { type: 'advance' }).ok).toBe(false);
    expect(deserializeGame(serializeGame(game))).toEqual(game);
  }, 30000);
  it('三种难度均可百日结算，困难由初始条件与资源定义', () => {
    const normal = create('同班级', 'normal');
    const hard = create('同班级', 'hard');
    expect(classAnalysis(hard).average).toBeLessThan(classAnalysis(normal).average);
    expect(hard.resources.time).toBeLessThan(normal.resources.time);
    for (const difficulty of ['challenge', 'hard'] as Difficulty[]) {
      const result = simulateRun('难度验收', difficulty, 'observe', false);
      expect(result.game.ended).toBe(true);
      expect(result.summary.average).toBeGreaterThan(0);
    }
  }, 30000);
  it('过量重复训练有疲劳与总分机会成本，不能让全班满分', () => {
    const balanced = simulateRun('平衡验收', 'normal', 'balanced', false);
    const cram = simulateRun('平衡验收', 'normal', 'cram', false);
    expect(cram.summary.fatigue).toBeGreaterThan(balanced.summary.fatigue);
    expect(cram.summary.subjects.english).toBeLessThan(balanced.summary.subjects.english);
    expect(cram.summary.average).toBeLessThan(700);
    expect(balanced.summary.average).toBeGreaterThan(cram.summary.average);
  }, 30000);
});
