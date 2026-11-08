import {
  ACTIONS,
  DIFFICULTIES,
  EVENT_CONFIG,
  EXAM_CALENDAR,
  GAME_DAYS,
  MEETING_STYLES,
  PARENT_STYLES,
  SUBJECT_MAP,
  TALK_STYLES,
} from '../config/game';
import { simulateStudent, updateEcology } from './ai';
import { addObservation, generateEvents, resolveEvent } from './events';
import { sitExam } from './exam';
import { diagnosisText } from './homework';
import { clamp, mean, Random } from './random';
import type { Game, GameCommand, Outcome, Student } from './types';

function spend(game: Game, time: number, energy: number) {
  if (game.resources.time < time || game.resources.energy < energy)
    throw new Error(`资源不足：需要 ${time} 分钟、${energy} 点精力。`);
  game.resources.time -= time;
  game.resources.energy -= energy;
}
function selected(game: Game, ids?: number[]) {
  const targets = ids ?? game.students.map((student) => student.id);
  if (
    !targets.length ||
    new Set(targets).size !== targets.length ||
    targets.some((id) => !game.students.some((student) => student.id === id))
  )
    throw new Error('请选择有效且不重复的学生。');
  return targets;
}
function topicValid(game: Game, topic?: string) {
  return SUBJECT_MAP[game.settings.subject].topics.some((item) => item.id === topic);
}
function applyConversation(game: Game, student: Student, kind: 'talk' | 'parent', style: string) {
  const p = student.psyche;
  if (kind === 'parent') {
    const matched =
      style === '共同支持' ||
      (style === '协调作息' && p.fatigue > 0.35) ||
      (style === '反馈进步' && p.confidence < 0.6);
    const fit = matched ? 1 : -0.35;
    student.family.support = clamp(
      student.family.support + 0.04 * fit * (1 - student.family.support),
    );
    student.family.trust = clamp(student.family.trust + 0.025 * fit);
    student.family.pressure = clamp(
      student.family.pressure + (style === '强调要求' ? 0.045 : -0.025),
    );
    p.stress = clamp(p.stress + (style === '强调要求' ? 0.025 : -0.018));
    student.lastParent = game.day;
    addObservation(
      game,
      student,
      '家长反馈',
      student.family.pressure > 0.55
        ? `家长表示“很担心孩子跟不上”，对${style}的建议仍有顾虑。家庭中的实际情况还需与学生核对。`
        : `家长愿意尝试“${style}”，提到孩子在家${p.fatigue > 0.45 ? '时常感到困倦' : '基本能够按时休息'}。这只是家长视角的反馈。`,
    );
    return;
  }
  const sensitive = student.personality === '敏感' || student.personality === '谨慎';
  const fit =
    style === '严肃提醒'
      ? p.trust > 0.65 && !sensitive
        ? 0.6
        : -0.6
      : style === '缓解焦虑'
        ? p.anxiety > 0.4
          ? 1
          : 0.35
        : style === '倾听困难'
          ? sensitive
            ? 1
            : 0.65
          : style === '制定学习计划'
            ? student.habits.discipline < 0.65
              ? 0.8
              : 0.45
            : 0.75;
  p.trust = clamp(p.trust + fit * 0.055 * (1 - p.trust));
  p.confidence = clamp(p.confidence + fit * 0.045 * (1 - p.confidence));
  p.motivation = clamp(p.motivation + fit * 0.035 * (1 - p.motivation));
  p.anxiety = clamp(p.anxiety - fit * 0.035);
  if (style === '严肃提醒') {
    p.stress = clamp(p.stress + 0.04);
    student.habits.discipline = clamp(student.habits.discipline + Math.max(0, fit) * 0.015);
  }
  if (style === '制定学习计划') student.habits.review = clamp(student.habits.review + fit * 0.015);
  student.lastTalk = game.day;
  const quote =
    fit < 0
      ? '“我知道了。”回答有些简短，也许需要换一种沟通方式。'
      : style === '缓解焦虑' || style === '倾听困难'
        ? `“最近${p.anxiety > 0.45 ? '总担心考试发挥不好' : p.fatigue > 0.4 ? '有时觉得休息不够' : '有些题反复做还是卡住'}，谢谢老师愿意听我说。”`
        : '“我愿意试试，不过可能需要一点时间。”';
  addObservation(
    game,
    student,
    '学生谈话',
    `${style}后，${quote}`,
    '一次谈话不能代表长期状态，建议结合后续作业与课堂表现验证。',
  );
}
function advance(game: Game, rng: Random) {
  const gains: Game['traces'][number]['gains'] = [];
  // 邻座影响使用日初快照，避免先结算的学生给后面的学生额外优势。
  const snapshot = { ...game, students: structuredClone(game.students), seats: [...game.seats] };
  const ledgers = game.students.map((student) => {
    const daily = { ...snapshot, submissions: game.submissions, nextId: game.nextId };
    const ledger = simulateStudent(daily, student, rng, gains);
    game.nextId = daily.nextId;
    return ledger;
  });
  updateEcology(game);
  for (let i = 0; i < 4; i++) {
    const student = rng.pick(game.students);
    const ledger = ledgers.find((item) => item.studentId === student.id)!;
    const seat = game.seats.indexOf(student.id);
    const recentlyMoved = game.day - student.seatChanged < 4;
    addObservation(
      game,
      student,
      '课堂观察',
      recentlyMoved
        ? `换到第 ${Math.floor(seat / 10) + 1} 排后，${student.psyche.fatigue > 0.5 ? '听讲时仍有倦意' : student.habits.focus > 0.6 ? '今天能较稳定地跟上板书' : '偶尔分心，仍在适应新环境'}，还需要连续观察。`
        : `${ledger.behavior}。${student.habits.participation > 0.6 ? '课堂有主动发言。' : '小组讨论时发言较少。'}`,
    );
  }
  const scheduled = EXAM_CALENDAR.find((exam) => exam.day === game.day);
  if (scheduled) {
    sitExam(game, rng, scheduled.name, scheduled.difficulty, game.day === GAME_DAYS);
    game.logs.push({
      day: game.day,
      kind: 'exam',
      text: `${scheduled.name}已完成，成绩与试卷已归档。`,
    });
  }
  const events = generateEvents(game, rng);
  game.traces.push({
    day: game.day,
    ledgers,
    gains,
    averageFatigue: mean(game.students.map((student) => student.psyche.fatigue)),
    averageStress: game.ecology.stress,
    events,
  });
  if (!game.debug) game.traces = game.traces.slice(-7);
  game.logs.push({
    day: game.day,
    kind: 'advance',
    text: `完成今日结算：50 位学生的自主学习、教学、作业与状态已更新${events ? `，新增 ${events} 条待处理事务` : ''}。`,
  });
  game.actions = [];
  if (game.day === GAME_DAYS) {
    game.ended = true;
    game.resources = { time: 0, energy: 0 };
  } else {
    game.day++;
    const limit = DIFFICULTIES[game.settings.difficulty];
    game.resources = { time: limit.time, energy: limit.energy };
  }
}

export function execute(input: Game, command: GameCommand): Outcome {
  if (input.ended) return { game: input, ok: false, message: '本局已完成，可查看报告或重新挑战。' };
  // 历史试卷、观察与计算轨迹只追加不改写；共享这些不可变记录，避免到百日末尾每次操作都复制整个历史。
  const game: Game = {
    ...input,
    students: structuredClone(input.students),
    seats: [...input.seats],
    resources: { ...input.resources },
    actions: [...input.actions],
    logs: [...input.logs],
    observations: [...input.observations],
    assignments: [...input.assignments],
    submissions: input.submissions.map((submission) =>
      command.type === 'diagnose' && submission.id === command.submissionId
        ? { ...submission }
        : submission,
    ),
    exams: [...input.exams],
    events: input.events.map((event) => ({ ...event })),
    eventCooldowns: { ...input.eventCooldowns },
    ecology: { ...input.ecology },
    traces: [...input.traces],
  };
  const rng = new Random(game.rng);
  let message = '';
  try {
    switch (command.type) {
      case 'teach': {
        const { kind } = command;
        const config = ACTIONS[kind];
        if (!config) throw new Error('未知教学行动。');
        const targets = selected(game, command.targets);
        const isSubject = ['lesson', 'review', 'practice', 'feedback', 'tutor'].includes(kind);
        if (isSubject && !topicValid(game, command.topic))
          throw new Error('请选择任教学科中的有效知识点。');
        if (kind === 'tutor' && targets.length > 3)
          throw new Error('个别辅导每次最多选择 3 名学生。');
        if (['talk', 'parent'].includes(kind) && targets.length !== 1)
          throw new Error('每次沟通请选择 1 位学生。');
        if (
          game.actions.some(
            (action) =>
              action.kind === kind &&
              action.topic === (isSubject ? command.topic : '') &&
              action.targets.some((id) => targets.includes(id)),
          )
        )
          throw new Error('今日已经安排过相同任务，请为学生留出消化时间。');
        if (kind === 'talk' && !TALK_STYLES.includes(command.style ?? ''))
          throw new Error('请选择谈话方式。');
        if (kind === 'parent' && !PARENT_STYLES.includes(command.style ?? ''))
          throw new Error('请选择沟通方式。');
        if (kind === 'meeting' && !MEETING_STYLES.includes(command.style ?? ''))
          throw new Error('请选择班会主题。');
        if (
          kind === 'relax' &&
          game.logs.some((log) => log.kind === 'relax' && game.day - log.day < 3)
        )
          throw new Error('集体心理疏导需要间隔 3 个教学日。');
        for (const id of targets) {
          const student = game.students.find((item) => item.id === id)!;
          if (kind === 'talk' && game.day - student.lastTalk < 3)
            throw new Error('这位学生刚刚谈过，请间隔 3 天后跟进。');
          if (kind === 'parent' && game.day - student.lastParent < 5)
            throw new Error('刚与这个家庭沟通过，请间隔 5 天后跟进。');
        }
        spend(game, config.time, config.energy);
        game.actions.push({
          id: `act-${game.nextId++}`,
          day: game.day,
          kind,
          subject: game.settings.subject,
          topic: isSubject ? command.topic! : '',
          targets,
          style: command.style,
        });
        for (const id of targets) {
          const student = game.students.find((item) => item.id === id)!;
          if (kind === 'talk' || kind === 'parent')
            applyConversation(game, student, kind, command.style!);
          if (kind === 'relax') {
            student.psyche.anxiety = clamp(
              student.psyche.anxiety - 0.045 * (0.4 + student.psyche.trust),
            );
            student.psyche.stress = clamp(student.psyche.stress - 0.025);
            student.psyche.fatigue = clamp(student.psyche.fatigue - 0.02);
          }
          if (kind === 'meeting') {
            if (command.style === '纪律提醒') {
              student.habits.discipline = clamp(
                student.habits.discipline + 0.009 * student.psyche.trust,
              );
              student.psyche.stress = clamp(student.psyche.stress + 0.018);
            }
            if (command.style === '放松休整') {
              student.psyche.fatigue = clamp(student.psyche.fatigue - 0.035);
              student.psyche.motivation = clamp(student.psyche.motivation + 0.008);
            }
            if (command.style === '互助班会') {
              student.psyche.trust = clamp(student.psyche.trust + 0.008);
              student.psyche.fatigue = clamp(student.psyche.fatigue + 0.006);
            }
          }
        }
        if (kind === 'meeting' && command.style === '互助班会')
          game.ecology.mutual = clamp(game.ecology.mutual + 0.025);
        message = `${config.name}已${isSubject ? '安排，今日结算时执行' : '完成'} · ${targets.length} 人`;
        game.logs.push({
          day: game.day,
          kind,
          text: `${config.name}${command.style ? `（${command.style}）` : ''}${isSubject ? `：${SUBJECT_MAP[game.settings.subject].topics.find((topic) => topic.id === command.topic)!.name}` : ''}，覆盖 ${targets.length} 人。`,
          studentId: targets.length === 1 ? targets[0] : undefined,
        });
        break;
      }
      case 'assign': {
        if (command.subject && command.subject !== game.settings.subject)
          throw new Error('只能直接布置自己任教学科的作业。');
        if (!topicValid(game, command.topic)) throw new Error('作业知识点不属于当前任教学科。');
        if (
          !Number.isInteger(command.quantity) ||
          command.quantity < 4 ||
          command.quantity > 60 ||
          !Number.isFinite(command.difficulty) ||
          command.difficulty < 0.25 ||
          command.difficulty > 0.85
        )
          throw new Error('作业数量为 4～60 题，难度为 0.25～0.85。');
        const targets = selected(game, command.targets);
        if (
          targets.some((id) =>
            game.assignments.some(
              (assignment) => assignment.day === game.day && assignment.targets.includes(id),
            ),
          )
        )
          throw new Error('同一学生每天只接收一份专项作业，可用互不重叠的分层范围。');
        spend(game, 15, 8);
        game.assignments.push({
          id: `hw-${game.nextId++}`,
          day: game.day,
          subject: game.settings.subject,
          topic: command.topic,
          quantity: command.quantity,
          difficulty: command.difficulty,
          targets,
          graded: false,
        });
        message = `作业已布置 · ${targets.length} 人 × ${command.quantity} 题，明日可查看提交`;
        game.logs.push({
          day: game.day,
          kind: 'homework',
          text: `布置${SUBJECT_MAP[game.settings.subject].topics.find((topic) => topic.id === command.topic)!.name}作业，${targets.length} 人 × ${command.quantity} 题，难度 ${Math.round(command.difficulty * 100)}%。`,
        });
        break;
      }
      case 'diagnose': {
        const submission = game.submissions.find((item) => item.id === command.submissionId);
        if (!submission || submission.reviewed) throw new Error('该提交不存在或已经完成诊断。');
        if (!['concept', 'method', 'calculation', 'reading', 'state'].includes(command.cause))
          throw new Error('诊断类型不合法。');
        spend(game, 5, 2);
        submission.reviewed = true;
        submission.diagnosis = command.cause;
        submission.matched = submission.actualCause === command.cause;
        const student = game.students.find((item) => item.id === submission.studentId)!;
        const assignment = game.assignments.find((item) => item.id === submission.assignmentId)!;
        addObservation(
          game,
          student,
          '作业批改',
          `本次专项作业完成 ${submission.completed}/${assignment.quantity} 题，其中正确 ${submission.correct} 题。`,
        );
        addObservation(
          game,
          student,
          '教师推测',
          diagnosisText(game, submission, command.cause),
          '这是教师判断，不是对学生真实动机的确认；后续讲评会检验匹配程度。',
        );
        message = '已记录教学诊断，可在教学计划中安排对应知识点的错题讲评';
        game.logs.push({
          day: game.day,
          kind: 'diagnosis',
          studentId: student.id,
          text: `记录${student.name}的作业诊断与后续讲评方向。`,
        });
        break;
      }
      case 'swap': {
        const { a, b } = command;
        if (
          !Number.isInteger(a) ||
          !Number.isInteger(b) ||
          a < 0 ||
          b < 0 ||
          a >= game.seats.length ||
          b >= game.seats.length ||
          a === b
        )
          throw new Error('请选择两个不同的有效座位。');
        spend(game, 10, 4);
        [game.seats[a], game.seats[b]] = [game.seats[b], game.seats[a]];
        for (const id of [game.seats[a], game.seats[b]])
          game.students.find((student) => student.id === id)!.seatChanged = game.day;
        message = '座位已交换，适应期约 3 天；请通过后续课堂记录观察效果';
        game.logs.push({
          day: game.day,
          kind: 'seat',
          text: `交换 ${Math.floor(a / 10) + 1} 排 ${(a % 10) + 1} 列与 ${Math.floor(b / 10) + 1} 排 ${(b % 10) + 1} 列的座位。`,
        });
        break;
      }
      case 'event': {
        const event = game.events.find((item) => item.id === command.eventId);
        if (
          !event ||
          event.resolved ||
          !EVENT_CONFIG.some((config) => config.id === event.type) ||
          ![0, 1].includes(command.choice)
        )
          throw new Error('该事务已处理或选项不合法。');
        spend(game, 15, 8);
        resolveEvent(game, event, command.choice);
        game.logs.push({
          day: game.day,
          kind: 'event',
          studentId: event.studentId,
          text: `处理${event.title}：${event.choice}。`,
        });
        message = '处理方式已记录，请继续观察后续变化';
        break;
      }
      case 'quiz': {
        if (game.exams.some((exam) => exam.day === game.day))
          throw new Error('今日已有考试，请留出复习与恢复时间。');
        if (EXAM_CALENDAR.some((exam) => exam.day === game.day))
          throw new Error('今日有统一考试，将在结束工作时自动执行。');
        if (
          !Number.isFinite(command.difficulty) ||
          command.difficulty < 0.3 ||
          command.difficulty > 0.8
        )
          throw new Error('试卷难度应为 0.30～0.80。');
        spend(game, 90, 35);
        sitExam(game, rng, `教学日 ${game.day} 测验`, command.difficulty);
        for (const student of game.students) {
          student.psyche.fatigue = clamp(student.psyche.fatigue + 0.035);
          student.psyche.stress = clamp(student.psyche.stress + 0.015);
        }
        message = '六科测验已完成，成绩与试卷参数已归档';
        game.logs.push({
          day: game.day,
          kind: 'quiz',
          text: '组织一次六科测验，收集阶段性教学信息。',
        });
        break;
      }
      case 'advance':
        advance(game, rng);
        message = game.ended
          ? '百日旅程完成，高考报告已生成'
          : `进入教学日 ${game.day}，今日资源已恢复`;
        break;
      default:
        throw new Error('未知操作。');
    }
    game.rng = rng.state;
    return { game, ok: true, message };
  } catch (error) {
    return {
      game: input,
      ok: false,
      message: error instanceof Error ? error.message : '操作未完成。',
    };
  }
}
