import {
  ArrowRight,
  BookOpen,
  CheckCheck,
  CircleHelp,
  FileCheck2,
  GripVertical,
  LayoutGrid,
  Plus,
  Send,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { ACTIONS, ERROR_LABELS, MEETING_STYLES, SUBJECT_MAP } from '../config/game';
import { studentAnalysis } from '../sim/analytics';
import type { ActionKind, ErrorKind, Game } from '../sim/types';
import { useGame } from '../state/store';
import { AppHeader, Avatar, Empty, Panel, StudentSelect, Tag, type OpenApp } from './shared';

function scopeTargets(game: Game, scope: string, studentId: number) {
  const subject = SUBJECT_MAP[game.settings.subject];
  return scope === 'student'
    ? [studentId]
    : game.students
        .filter(
          (student) =>
            scope === 'all' ||
            (scope === 'foundation'
              ? studentAnalysis(game, student.id).latest.scores[subject.id] / subject.max < 0.65
              : studentAnalysis(game, student.id).latest.scores[subject.id] / subject.max >= 0.65),
        )
        .map((student) => student.id);
}
function ScopeField({
  game,
  scope,
  setScope,
  studentId,
  setStudentId,
}: {
  game: Game;
  scope: string;
  setScope: (scope: string) => void;
  studentId: number;
  setStudentId: (id: number) => void;
}) {
  return (
    <>
      <label>
        适用范围
        <select value={scope} onChange={(event) => setScope(event.target.value)}>
          <option value="all">全班统一</option>
          <option value="foundation">基础层 · 最近单科得分低于 65%</option>
          <option value="advanced">提高层 · 最近单科得分达到 65%</option>
          <option value="student">指定学生</option>
        </select>
      </label>
      {scope === 'student' && (
        <label>
          选择学生
          <StudentSelect game={game} value={studentId} onChange={setStudentId} />
        </label>
      )}
    </>
  );
}

export function TeachingApp({ game, selectedId }: { game: Game; selectedId?: number }) {
  const dispatch = useGame((state) => state.dispatch);
  const subject = SUBJECT_MAP[game.settings.subject];
  const [kind, setKind] = useState<ActionKind>(selectedId ? 'tutor' : 'lesson');
  const [topic, setTopic] = useState(subject.topics[0].id);
  const [scope, setScope] = useState(selectedId ? 'student' : 'all');
  const [studentId, setStudentId] = useState(selectedId ?? 1);
  const [meeting, setMeeting] = useState(MEETING_STYLES[0]);
  useEffect(() => {
    if (selectedId) {
      setStudentId(selectedId);
      setKind('tutor');
      setScope('student');
    }
  }, [selectedId]);
  const config = ACTIONS[kind];
  const isSubject = !['meeting', 'relax'].includes(kind);
  const targets = scopeTargets(
    game,
    kind === 'tutor' ? 'student' : isSubject ? scope : 'all',
    studentId,
  );
  const submit = () =>
    dispatch({
      type: 'teach',
      kind,
      topic: isSubject ? topic : undefined,
      targets,
      style: kind === 'meeting' ? meeting : undefined,
    });
  return (
    <>
      <AppHeader
        eyebrow="TEACHING STUDIO"
        title="2011届高三教学工作计划"
        description={`任教学科：${subject.name}。其他学科由系统教师授课，共享学生每天 240 分钟的学习预算。`}
      />
      <div className="two-column">
        <Panel title="安排教学行动" note="消耗教师资源，学习效果在结束今日后计算">
          <div className="form-grid">
            <label>
              教学方式
              <select
                value={kind}
                onChange={(event) => {
                  const next = event.target.value as ActionKind;
                  setKind(next);
                  if (next === 'tutor') setScope('student');
                }}
              >
                {(
                  [
                    'lesson',
                    'review',
                    'practice',
                    'feedback',
                    'tutor',
                    'relax',
                    'meeting',
                  ] as ActionKind[]
                ).map((value) => (
                  <option key={value} value={value}>
                    {ACTIONS[value].name}
                  </option>
                ))}
              </select>
            </label>
            {isSubject && (
              <label>
                知识点
                <select value={topic} onChange={(event) => setTopic(event.target.value)}>
                  {subject.topics.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.parent} / {item.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {isSubject && kind !== 'tutor' && (
              <ScopeField
                game={game}
                scope={scope}
                setScope={setScope}
                studentId={studentId}
                setStudentId={setStudentId}
              />
            )}
            {kind === 'tutor' && (
              <label>
                辅导对象
                <StudentSelect game={game} value={studentId} onChange={setStudentId} />
              </label>
            )}
            {kind === 'meeting' && (
              <label>
                班会主题
                <select value={meeting} onChange={(event) => setMeeting(event.target.value)}>
                  {MEETING_STYLES.map((style) => (
                    <option key={style}>{style}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <div className="info-note">
            <CircleHelp size={17} />
            <p>{config.hint} 所有方式都存在时间成本，重复训练会逐渐降低额外收益。</p>
          </div>
          <div className="cost-preview">
            <span>
              覆盖 <b>{targets.length} 人</b>
            </span>
            <span>
              时间 <b>{config.time} 分钟</b>
            </span>
            <span>
              精力 <b>{config.energy} 点</b>
            </span>
          </div>
          <button className="button wide" onClick={submit} disabled={game.ended}>
            <Plus size={15} />
            确认安排
          </button>
        </Panel>
        <div>
          <Panel title="今日资源" note="每日恢复，不跨日累积">
            <div className="resource-large">
              <div>
                <strong>
                  {game.resources.time}
                  <small>分钟</small>
                </strong>
                <span>可用管理时间</span>
              </div>
              <div>
                <strong>
                  {game.resources.energy}
                  <small>点</small>
                </strong>
                <span>可用教师精力</span>
              </div>
            </div>
          </Panel>
          <Panel title="已安排的行动" note={`教学日 ${game.day} · 共 ${game.actions.length} 项`}>
            {game.actions.length ? (
              <div className="schedule-list">
                {game.actions.map((action) => (
                  <div key={action.id}>
                    <span className="schedule-icon">
                      <BookOpen size={17} />
                    </span>
                    <div>
                      <strong>{ACTIONS[action.kind].name}</strong>
                      <p>
                        {subject.topics.find((item) => item.id === action.topic)?.name ??
                          action.style ??
                          '集体活动'}{' '}
                        · {action.targets.length} 人
                      </p>
                    </div>
                    <Tag>
                      {['talk', 'parent', 'relax', 'meeting'].includes(action.kind)
                        ? '已反馈'
                        : '待结算'}
                    </Tag>
                  </div>
                ))}
              </div>
            ) : (
              <Empty>尚未安排教学，可先从一个薄弱知识点开始。</Empty>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

export function HomeworkApp({ game, open }: { game: Game; open: OpenApp }) {
  const dispatch = useGame((state) => state.dispatch);
  const subject = SUBJECT_MAP[game.settings.subject];
  const [tab, setTab] = useState('assign');
  const [topic, setTopic] = useState(subject.topics[0].id);
  const [scope, setScope] = useState('all');
  const [studentId, setStudentId] = useState(1);
  const [quantity, setQuantity] = useState(16);
  const [difficulty, setDifficulty] = useState(0.55);
  const [assignmentId, setAssignmentId] = useState('all');
  const [onlyPending, setOnlyPending] = useState(true);
  const [current, setCurrent] = useState<string | null>(null);
  const [cause, setCause] = useState<ErrorKind>('concept');
  const submissions = game.submissions
    .filter(
      (submission) =>
        (assignmentId === 'all' || submission.assignmentId === assignmentId) &&
        (!onlyPending || !submission.reviewed),
    )
    .slice()
    .reverse();
  const active = game.submissions.find((submission) => submission.id === current) ?? submissions[0];
  const targets = scopeTargets(game, scope, studentId);
  const activeAssignment = game.assignments.find(
    (assignment) => assignment.id === active?.assignmentId,
  );
  return (
    <>
      <AppHeader
        eyebrow="HOMEWORK LAB"
        title="作业布置与批改"
        description="常规正误已自动统计；典型错误需要教师诊断，后续讲评才能更有针对性。"
      />
      <div className="tab-row">
        <button className={tab === 'assign' ? 'active' : ''} onClick={() => setTab('assign')}>
          <Plus size={14} />
          布置作业
        </button>
        <button className={tab === 'review' ? 'active' : ''} onClick={() => setTab('review')}>
          <FileCheck2 size={14} />
          提交与诊断<Tag>{game.submissions.filter((item) => !item.reviewed).length}</Tag>
        </button>
        <button className={tab === 'stats' ? 'active' : ''} onClick={() => setTab('stats')}>
          <LayoutGrid size={14} />
          知识点统计
        </button>
      </div>
      {tab === 'assign' && (
        <div className="two-column">
          <Panel title={`${subject.name}专项作业`} note="每日每生一份；分层范围互不重叠">
            <div className="form-grid">
              <label>
                训练知识点
                <select value={topic} onChange={(event) => setTopic(event.target.value)}>
                  {subject.topics.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <ScopeField
                game={game}
                scope={scope}
                setScope={setScope}
                studentId={studentId}
                setStudentId={setStudentId}
              />
              <label>
                作业难度
                <select
                  value={difficulty}
                  onChange={(event) => setDifficulty(Number(event.target.value))}
                >
                  <option value={0.35}>基础 · 35%</option>
                  <option value={0.55}>标准 · 55%</option>
                  <option value={0.75}>挑战 · 75%</option>
                </select>
              </label>
              <label>
                作业数量 <b>{quantity} 题</b>
                <input
                  aria-label="作业数量"
                  type="range"
                  min="4"
                  max="60"
                  step="2"
                  value={quantity}
                  onChange={(event) => setQuantity(Number(event.target.value))}
                />
              </label>
            </div>
            <div className="info-note">
              <CircleHelp size={17} />
              <p>
                约占学生 {quantity * 2}{' '}
                分钟。大量作业会挤占其他学科与恢复时间，难度过高也可能降低完成率。
              </p>
            </div>
            <div className="cost-preview">
              <span>
                范围 <b>{targets.length} 人</b>
              </span>
              <span>
                时间 <b>15 分钟</b>
              </span>
              <span>
                精力 <b>8 点</b>
              </span>
            </div>
            <button
              className="button wide"
              disabled={game.ended || !targets.length}
              onClick={() => {
                if (dispatch({ type: 'assign', topic, quantity, difficulty, targets }))
                  setTab('review');
              }}
            >
              <Send size={15} />
              布置作业
            </button>
          </Panel>
          <Panel title="作业档案" note="结束今日后生成学生真实提交">
            {game.assignments.length ? (
              <div className="schedule-list">
                {game.assignments
                  .slice()
                  .reverse()
                  .slice(0, 20)
                  .map((assignment) => (
                    <button
                      key={assignment.id}
                      onClick={() => {
                        setAssignmentId(assignment.id);
                        setTab('review');
                        setCurrent(null);
                      }}
                    >
                      <span className="schedule-icon">
                        <BookOpen size={17} />
                      </span>
                      <div>
                        <strong>
                          {subject.topics.find((item) => item.id === assignment.topic)?.name}
                        </strong>
                        <p>
                          D{assignment.day} · {assignment.targets.length} 人 · {assignment.quantity}{' '}
                          题
                        </p>
                      </div>
                      <Tag tone={assignment.day < game.day || game.ended ? 'green' : ''}>
                        {assignment.day < game.day || game.ended ? '已提交' : '待结算'}
                      </Tag>
                    </button>
                  ))}
              </div>
            ) : (
              <Empty>还没有作业档案，先布置一份适量的训练。</Empty>
            )}
          </Panel>
        </div>
      )}
      {tab === 'review' && (
        <>
          <div className="toolbar">
            <select
              aria-label="作业批次"
              value={assignmentId}
              onChange={(event) => {
                setAssignmentId(event.target.value);
                setCurrent(null);
              }}
            >
              <option value="all">所有作业批次</option>
              {game.assignments
                .slice()
                .reverse()
                .map((assignment) => (
                  <option key={assignment.id} value={assignment.id}>
                    D{assignment.day} ·{' '}
                    {subject.topics.find((item) => item.id === assignment.topic)?.name}
                  </option>
                ))}
            </select>
            <label className="check-label">
              <input
                type="checkbox"
                checked={onlyPending}
                onChange={(event) => setOnlyPending(event.target.checked)}
              />
              仅看未诊断
            </label>
            <span className="muted">{submissions.length} 份提交</span>
          </div>
          {active && activeAssignment ? (
            <div className="review-layout">
              <Panel className="submission-list">
                {submissions.slice(0, 200).map((submission) => {
                  const student = game.students.find((item) => item.id === submission.studentId)!;
                  return (
                    <button
                      key={submission.id}
                      className={active.id === submission.id ? 'selected' : ''}
                      onClick={() => setCurrent(submission.id)}
                    >
                      <Avatar student={student} small />
                      <div>
                        <strong>{student.name}</strong>
                        <span>
                          D{submission.day} · 正确 {submission.correct}/{submission.completed}
                        </span>
                      </div>
                      {submission.reviewed ? <CheckCheck size={16} /> : <ArrowRight size={14} />}
                    </button>
                  );
                })}
                {submissions.length > 200 && (
                  <p className="table-note">显示最近 200 条，请选择批次查看历史。</p>
                )}
              </Panel>
              <Panel
                title={`${game.students.find((item) => item.id === active.studentId)!.name}的典型作答`}
                note={`D${active.day} · ${subject.topics.find((item) => item.id === activeAssignment.topic)?.name}`}
                action={
                  <button
                    className="text-button"
                    onClick={() => open('students', active.studentId)}
                  >
                    查看档案
                  </button>
                }
              >
                <div className="answer-stats">
                  <Tag>
                    完成 {active.completed}/{activeAssignment.quantity} 题
                  </Tag>
                  <Tag tone="green">正确 {active.correct} 题</Tag>
                  <Tag tone="amber">未完成 {activeAssignment.quantity - active.completed} 题</Tag>
                </div>
                <div className="question-block">
                  <small>代表题目</small>
                  <h3>{active.question.prompt}</h3>
                </div>
                <div className="answer-grid">
                  <div>
                    <small>学生答案</small>
                    <p>{active.answer}</p>
                  </div>
                  <div>
                    <small>标准答案</small>
                    <p>{active.question.answer}</p>
                  </div>
                </div>
                <div className="info-note">
                  <CircleHelp size={18} />
                  <p>可观察线索：{active.clue}</p>
                </div>
                <label className="field-label">
                  教师判断 · 主要原因
                  <select
                    value={cause}
                    disabled={active.reviewed || game.ended}
                    onChange={(event) => setCause(event.target.value as ErrorKind)}
                  >
                    {Object.entries(ERROR_LABELS).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                {active.reviewed ? (
                  <div className="gentle-note">
                    <CheckCheck size={17} />
                    <p>
                      {active.diagnosis
                        ? `已记录推测：${ERROR_LABELS[active.diagnosis]}。通过后续讲评与作业验证。`
                        : '已自动核对正误，暂无典型错误需要诊断。'}
                    </p>
                  </div>
                ) : (
                  <button
                    className="button wide"
                    disabled={game.ended}
                    onClick={() => {
                      if (dispatch({ type: 'diagnose', submissionId: active.id, cause }))
                        setCurrent(null);
                    }}
                  >
                    记录诊断 · 5 分钟 / 2 精力
                  </button>
                )}
              </Panel>
            </div>
          ) : (
            <Empty
              action={
                <button
                  className="button subtle"
                  onClick={() => {
                    setOnlyPending(false);
                    setAssignmentId('all');
                  }}
                >
                  查看全部提交
                </button>
              }
            >
              暂无符合条件的提交。新作业需要结束今日后才能批改。
            </Empty>
          )}
        </>
      )}
      {tab === 'stats' && (
        <Panel title="知识点作业统计" note="统计来自已提交作业，诊断分布仅代表教师推测">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>知识点</th>
                  <th>提交份数</th>
                  <th>完成题数</th>
                  <th>正确率</th>
                  <th>已诊断份数</th>
                  <th>最多的教师推测</th>
                </tr>
              </thead>
              <tbody>
                {subject.topics.map((topic) => {
                  const ids = game.assignments
                    .filter((item) => item.topic === topic.id)
                    .map((item) => item.id);
                  const rows = game.submissions.filter((item) => ids.includes(item.assignmentId));
                  const completed = rows.reduce((sum, item) => sum + item.completed, 0);
                  const correct = rows.reduce((sum, item) => sum + item.correct, 0);
                  const diagnoses = Object.keys(ERROR_LABELS)
                    .map((id) => ({
                      id,
                      count: rows.filter((item) => item.diagnosis === id).length,
                    }))
                    .sort((a, b) => b.count - a.count);
                  return (
                    <tr key={topic.id}>
                      <td>{topic.name}</td>
                      <td>{rows.length}</td>
                      <td>{completed}</td>
                      <td>{completed ? `${Math.round((correct / completed) * 100)}%` : '—'}</td>
                      <td>{rows.filter((item) => item.reviewed).length}</td>
                      <td>
                        {diagnoses[0].count
                          ? ERROR_LABELS[diagnoses[0].id as ErrorKind]
                          : '尚无诊断'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </>
  );
}

export function SeatingApp({ game, open }: { game: Game; open: OpenApp }) {
  const dispatch = useGame((state) => state.dispatch);
  const [selected, setSelected] = useState<number | null>(null);
  const [dragged, setDragged] = useState<number | null>(null);
  const [mode, setMode] = useState('total');
  const swap = (a: number, b: number) => {
    if (a !== b) dispatch({ type: 'swap', a, b });
    setSelected(null);
    setDragged(null);
  };
  return (
    <>
      <AppHeader
        eyebrow="CLASSROOM SEATING"
        title="2011届高三教室座位表"
        description="拖动交换，或依次点击两个座位。每次交换消耗 10 分钟 / 4 精力，需要约 3 天适应。"
        action={
          <select
            aria-label="座位图显示"
            value={mode}
            onChange={(event) => setMode(event.target.value)}
          >
            <option value="total">显示最近总分</option>
            <option value="subject">显示任教学科</option>
          </select>
        }
      />
      <Panel>
        <div className="classroom-front">
          <span>黑板 / 讲台</span>
          <small>前排</small>
        </div>
        <div className="seating-grid">
          {game.seats.map((id, index) => {
            const student = game.students.find((item) => item.id === id)!;
            const analysis = studentAnalysis(game, id);
            return (
              <button
                draggable={!game.ended}
                key={index}
                className={`seat-card ${index % 2 === 1 ? 'desk-end' : ''} ${selected === index ? 'selected' : ''} ${dragged === index ? 'dragging' : ''}`}
                onDragStart={(event) => {
                  setDragged(index);
                  event.dataTransfer.setData('text/plain', String(index));
                  event.dataTransfer.effectAllowed = 'move';
                }}
                onDragEnd={() => setDragged(null)}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const raw = event.dataTransfer.getData('text/plain');
                  if (raw && /^\d+$/.test(raw)) swap(Number(raw), index);
                }}
                onClick={() =>
                  selected === null
                    ? setSelected(index)
                    : selected === index
                      ? setSelected(null)
                      : swap(selected, index)
                }
                onDoubleClick={() => open('students', id)}
                aria-label={`${Math.floor(index / 10) + 1}排${(index % 10) + 1}列 ${student.name}`}
              >
                <span className="seat-number">
                  {Math.floor(index / 10) + 1}-{(index % 10) + 1}
                  <GripVertical size={10} />
                </span>
                <span className={`seat-monogram tone-${student.id % 5}`}>
                  {student.name.slice(-1)}
                </span>
                <strong>{student.name}</strong>
                <small>
                  {mode === 'total'
                    ? analysis.latest.total.toFixed(0)
                    : analysis.latest.scores[game.settings.subject].toFixed(1)}{' '}
                  分
                </small>
                {analysis.borderline && (
                  <i className="borderline-dot" title="最近成绩处于临界范围" />
                )}
              </button>
            );
          })}
        </div>
        <div className="classroom-bottom">
          <span>
            <i className="dot amber" />
            本科临界范围（最近考试）
          </span>
          <span>5 排 × 10 列 · {new Set(game.seats).size} 名学生</span>
        </div>
      </Panel>
      {selected !== null && (
        <Panel
          title={`已选中 ${game.students.find((item) => item.id === game.seats[selected])!.name}`}
        >
          <div className="toolbar">
            <p>点击另一个座位进行交换，双击学生查看档案。</p>
            <button className="button subtle" onClick={() => setSelected(null)}>
              取消选择
            </button>
            <button className="button" onClick={() => open('students', game.seats[selected])}>
              查看学生
            </button>
          </div>
        </Panel>
      )}
      <div className="info-note">
        <Users size={18} />
        <p>
          距离、视力、同桌互助、闲聊与关系摩擦会共同影响日常学习。换座位后的效果会逐步体现在观察记录和成绩变化中。
        </p>
      </div>
    </>
  );
}
