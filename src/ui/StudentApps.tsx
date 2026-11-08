import { LegacyIcon, ClassicGlyph } from './LegacyIcon';
import { useEffect, useState } from 'react';
import type { SheetCommand } from './ClassicFrame';
import { SUBJECTS } from '../config/game';
import { studentAnalysis } from '../sim/analytics';
import type { Game } from '../sim/types';
import {
  AppHeader,
  Avatar,
  Delta,
  Empty,
  MiniTrend,
  Panel,
  SearchBox,
  StudentSelect,
  SubjectBars,
  Tag,
  type OpenApp,
} from './shared';

export function StudentsApp({
  game,
  selectedId,
  open,
}: {
  game: Game;
  selectedId?: number;
  open: OpenApp;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState<'id' | 'total' | 'improvement'>('id');
  const [current, setCurrent] = useState(selectedId ?? 1);
  useEffect(() => {
    if (selectedId) setCurrent(selectedId);
  }, [selectedId]);
  const student = game.students.find((item) => item.id === current)!;
  const analysis = studentAnalysis(game, current);
  const observations = game.observations
    .filter((item) => item.studentId === current)
    .slice(-5)
    .reverse();
  const seat = game.seats.indexOf(current);
  const neighbor = game.students.find(
    (item) => item.id === game.seats[seat % 2 === 0 ? seat + 1 : seat - 1],
  );
  const students = game.students
    .filter(
      (item) =>
        (item.name.includes(query) || String(item.id).includes(query)) &&
        (filter !== 'border' || studentAnalysis(game, item.id).borderline),
    )
    .sort((a, b) =>
      sort === 'id'
        ? a.id - b.id
        : sort === 'total'
          ? studentAnalysis(game, b.id).latest.total - studentAnalysis(game, a.id).latest.total
          : studentAnalysis(game, b.id).improvement - studentAnalysis(game, a.id).improvement,
    );
  return (
    <>
      <AppHeader
        eyebrow="STUDENT ARCHIVE"
        title="学生档案管理"
        description="用成绩、课堂与谈话，慢慢拼出一个更完整的学生。"
      />
      <div className="archive-layout">
        <Panel className="student-list-panel">
          <div className="list-controls">
            <SearchBox value={query} onChange={setQuery} />
            <div className="filter-row">
              <select
                aria-label="学生范围"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              >
                <option value="all">全班学生 · 50 人</option>
                <option value="border">本科临界学生</option>
              </select>
              <button
                className="icon-button"
                title="切换学号、总分、进步排序"
                onClick={() =>
                  setSort(sort === 'id' ? 'total' : sort === 'total' ? 'improvement' : 'id')
                }
              >
                <ClassicGlyph name="sort" size={15} />
              </button>
            </div>
            <small>当前按{sort === 'id' ? '学号' : sort === 'total' ? '总分' : '进步'}排序</small>
          </div>
          <div className="student-list">
            {students.map((item) => (
              <button
                key={item.id}
                className={current === item.id ? 'selected' : ''}
                onClick={() => setCurrent(item.id)}
              >
                <Avatar student={item} small />
                <span>
                  <strong>{item.name}</strong>
                  <small>学号 {String(item.id).padStart(2, '0')}</small>
                </span>
                <b>{studentAnalysis(game, item.id).latest.total.toFixed(0)}</b>
              </button>
            ))}
            {!students.length && <Empty>没有匹配的学生</Empty>}
          </div>
        </Panel>
        <div className="student-detail">
          <Panel>
            <div className="profile-heading">
              <Avatar student={student} />
              <div>
                <h2>
                  {student.name}
                  <Tag>{student.gender}</Tag>
                  {analysis.borderline && <Tag tone="amber">本科临界</Tag>}
                </h2>
                <p>
                  学号 {String(current).padStart(2, '0')} · 第 {Math.floor(seat / 10) + 1} 排{' '}
                  {(seat % 10) + 1} 列 · 同桌 {neighbor?.name}
                </p>
              </div>
              <strong className="profile-score">
                {analysis.latest.total.toFixed(1)}
                <small>最近总分</small>
              </strong>
            </div>
            <div className="profile-facts">
              <div>
                <span>学生自述目标</span>
                <b>{student.goal} 分</b>
              </div>
              <div>
                <span>较开学摸底</span>
                <Delta value={analysis.improvement} />
              </div>
              <div>
                <span>成绩估计区间</span>
                <b>
                  {analysis.low}～{analysis.high}
                </b>
              </div>
              <div>
                <span>优先了解</span>
                <b>{analysis.weakest.name}学习情况</b>
              </div>
            </div>
            <div className="button-row">
              <button className="button" onClick={() => open('talk', current)}>
                <LegacyIcon name="qq" size={14} />
                发起谈话
              </button>
              <button className="button subtle" onClick={() => open('teaching', current)}>
                <LegacyIcon name="notepad" size={14} />
                安排个别辅导
              </button>
              <button className="button subtle" onClick={() => open('parents', current)}>
                <LegacyIcon name="users" size={14} />
                联系家长
              </button>
            </div>
          </Panel>
          <Panel title="各科表现" note="满分不同，横向比较采用得分比例">
            <SubjectBars scores={analysis.latest.scores} />
          </Panel>
          <Panel title="最近观察" note="线索可能片面，请交叉验证">
            {observations.length ? (
              <div className="observation-list">
                {observations.map((observation) => (
                  <article key={observation.id}>
                    <span className="observation-dot" />
                    <div>
                      <small>
                        第 {observation.day} 天 · {observation.source}
                      </small>
                      <p>{observation.text}</p>
                      {observation.hypothesis && <blockquote>{observation.hypothesis}</blockquote>}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <Empty
                action={
                  <button className="button subtle" onClick={() => open('talk', current)}>
                    通过谈话了解
                  </button>
                }
              >
                尚无观察记录
              </Empty>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

export function ScoresApp({
  game,
  open,
  command,
}: {
  game: Game;
  open: OpenApp;
  command?: SheetCommand;
}) {
  const [examIndex, setExamIndex] = useState(game.exams.length - 1);
  const [compareIndex, setCompareIndex] = useState(0);
  const [subject, setSubject] = useState('total');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [descending, setDescending] = useState(true);
  const [sort, setSort] = useState('total');
  const [trendId, setTrendId] = useState(0);
  const [showTrend, setShowTrend] = useState(false);
  useEffect(() => {
    if (!command) return;
    if (command.type === 'trend') {
      setShowTrend(true);
      return;
    }
    setShowTrend(false);
    if (command.type === 'ascending' || command.type === 'descending') {
      setSort('total');
      setDescending(command.type === 'descending');
    } else setFilter(command.type === 'borderline' ? 'border' : 'all');
  }, [command]);
  const exam = game.exams[Math.min(examIndex, game.exams.length - 1)];
  const comparison = game.exams[Math.min(compareIndex, game.exams.length - 1)];
  const value = (result: (typeof exam.results)[number], key: string) =>
    key === 'total'
      ? result.total
      : key === 'progress'
        ? result.total -
          (comparison.results.find((item) => item.studentId === result.studentId)?.total ??
            result.total)
        : result.scores[key];
  const rows = exam.results
    .filter((result) => {
      const student = game.students.find((item) => item.id === result.studentId)!;
      return (
        (student.name.includes(query) || String(student.id).includes(query)) &&
        (filter === 'all' ||
          (filter === 'border' && Math.abs(result.total - game.settings.cutoff) <= 35) ||
          (filter === 'risk' && result.total < game.settings.cutoff) ||
          (filter === 'uneven' &&
            Math.max(...SUBJECTS.map((s) => result.scores[s.id] / s.max)) -
              Math.min(...SUBJECTS.map((s) => result.scores[s.id] / s.max)) >
              0.23))
      );
    })
    .sort((a, b) => (value(b, sort) - value(a, sort)) * (descending ? 1 : -1));
  const rankBySubject = [...exam.results].sort((a, b) => value(b, subject) - value(a, subject));
  const sortBy = (key: string) => {
    if (sort === key) setDescending(!descending);
    else {
      setSort(key);
      setDescending(true);
    }
  };
  const trendValues = game.exams.map((exam) =>
    trendId
      ? exam.results.find((result) => result.studentId === trendId)!.total
      : exam.results.reduce((sum, result) => sum + result.total, 0) / 50,
  );
  return (
    <>
      <AppHeader
        title={`${game.settings.className} 2011届成绩统计表`}
        description="成绩数据只读。单击表头排序，单击学生查看档案。"
      />
      <Panel className={`excel-data-panel ${showTrend ? 'hidden-sheet' : ''}`}>
        <div className="toolbar wrap">
          <label>
            当前考试
            <select
              value={examIndex}
              onChange={(event) => setExamIndex(Number(event.target.value))}
            >
              {game.exams.map((item, index) => (
                <option key={item.id} value={index}>
                  {item.name} · D{item.day}
                </option>
              ))}
            </select>
          </label>
          <label>
            对比考试
            <select
              value={compareIndex}
              onChange={(event) => setCompareIndex(Number(event.target.value))}
            >
              {game.exams.map((item, index) => (
                <option key={item.id} value={index}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            科目排名
            <select
              value={subject}
              onChange={(event) => {
                setSubject(event.target.value);
                setSort(event.target.value);
              }}
            >
              {[['total', '总分'], ...SUBJECTS.map((s) => [s.id, s.name])].map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            学生范围
            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="all">全班</option>
              <option value="border">临界生 ±35 分</option>
              <option value="risk">参考线以下</option>
              <option value="uneven">偏科明显</option>
            </select>
          </label>
          <SearchBox value={query} onChange={setQuery} />
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr className="excel-column-letters" aria-hidden="true">
                <th>◢</th>
                {Array.from({ length: subject === 'total' ? 12 : 7 }, (_, index) => (
                  <th key={index}>{String.fromCharCode(65 + index)}</th>
                ))}
              </tr>
              <tr>
                <th className="excel-row-number">1</th>
                <th>排名</th>
                <th>学生</th>
                {(subject === 'total'
                  ? SUBJECTS
                  : SUBJECTS.filter((item) => item.id === subject)
                ).map((item) => (
                  <th key={item.id}>
                    <button onClick={() => sortBy(item.id)}>
                      {item.name}
                      <ClassicGlyph name="sort" size={11} />
                    </button>
                  </th>
                ))}
                <th>
                  <button onClick={() => sortBy('total')}>
                    总分
                    <ClassicGlyph name="sort" size={11} />
                  </button>
                </th>
                <th>
                  <button onClick={() => sortBy('progress')}>
                    较对比
                    <ClassicGlyph name="sort" size={11} />
                  </button>
                </th>
                <th>成绩估计区间</th>
                <th>薄弱科目</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((result, rowIndex) => {
                const student = game.students.find((item) => item.id === result.studentId)!;
                const analysis = studentAnalysis(game, student.id);
                const progress = value(result, 'progress');
                return (
                  <tr
                    key={student.id}
                    onClick={() => open('students', student.id)}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') open('students', student.id);
                    }}
                  >
                    <td className="excel-row-number">{rowIndex + 2}</td>
                    <td className="rank-cell">{rankBySubject.indexOf(result) + 1}</td>
                    <td>
                      <span className="table-student">
                        <Avatar student={student} small />
                        {student.name}
                      </span>
                    </td>
                    {(subject === 'total'
                      ? SUBJECTS
                      : SUBJECTS.filter((item) => item.id === subject)
                    ).map((item) => (
                      <td key={item.id}>{result.scores[item.id].toFixed(1)}</td>
                    ))}
                    <td className="total-cell">{result.total.toFixed(1)}</td>
                    <td>
                      <Delta value={progress} />
                    </td>
                    <td className="muted">
                      {analysis.low}～{analysis.high}
                    </td>
                    <td>
                      <Tag tone="amber">{analysis.weakest.name}</Tag>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length && <Empty>没有匹配的学生</Empty>}
        </div>
        <p className="table-note">
          共 {rows.length} 名学生 ·
          点击表头排序，点击学生查看档案。区间基于最近已观测成绩，绝非高考承诺。
        </p>
      </Panel>
      <div className="excel-sheet-tabs">
        <span>◀ ▸</span>
        {game.exams.map((item, index) => (
          <button
            key={item.id}
            className={examIndex === index && !showTrend ? 'active' : ''}
            onClick={() => {
              setExamIndex(index);
              setShowTrend(false);
            }}
          >
            {item.name}
          </button>
        ))}
        <button className={showTrend ? 'active' : ''} onClick={() => setShowTrend(true)}>
          成绩趋势图
        </button>
        <small>就绪　|　{rows.length} 条记录</small>
      </div>
      {showTrend && (
        <Panel
          className="excel-trend-panel"
          title="成绩趋势"
          action={
            <select
              aria-label="趋势范围"
              value={trendId}
              onChange={(event) => setTrendId(Number(event.target.value))}
            >
              <option value={0}>全班平均分</option>
              {game.students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
          }
        >
          <MiniTrend
            values={trendValues}
            labels={game.exams.map((exam) => exam.name)}
            width={750}
            height={200}
            cutoff={game.settings.cutoff}
          />
        </Panel>
      )}
    </>
  );
}

export function ObservationsApp({ game, open }: { game: Game; open: OpenApp }) {
  const [source, setSource] = useState('all');
  const [studentId, setStudentId] = useState(0);
  const observations = game.observations
    .filter(
      (observation) =>
        (source === 'all' || observation.source === source) &&
        (!studentId || observation.studentId === studentId),
    )
    .slice()
    .reverse();
  return (
    <>
      <AppHeader
        eyebrow="CLASSROOM JOURNAL"
        title="班级观察记录（只读）"
        description="事实线索、外部反馈与教师推测分别标记，避免让判断代替事实。"
      />
      <div className="toolbar">
        <select
          aria-label="观察来源"
          value={source}
          onChange={(event) => setSource(event.target.value)}
        >
          {['all', '课堂观察', '作业批改', '学生谈话', '家长反馈', '教师推测', '考试分析'].map(
            (value) => (
              <option key={value} value={value}>
                {value === 'all' ? '所有来源' : value}
              </option>
            ),
          )}
        </select>
        <select
          aria-label="观察对象"
          value={studentId}
          onChange={(event) => setStudentId(Number(event.target.value))}
        >
          <option value={0}>全班学生</option>
          {game.students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.name}
            </option>
          ))}
        </select>
        <span className="muted">{observations.length} 条记录</span>
      </div>
      <div className="journal-list">
        {observations.map((observation) => {
          const student = game.students.find((item) => item.id === observation.studentId)!;
          return (
            <Panel key={observation.id}>
              <div className="journal-heading">
                <button className="inline-student" onClick={() => open('students', student.id)}>
                  <Avatar student={student} small />
                  {student.name}
                </button>
                <Tag tone={observation.source === '教师推测' ? 'amber' : 'green'}>
                  {observation.source}
                </Tag>
                <small>第 {observation.day} 天</small>
              </div>
              <p>{observation.text}</p>
              {observation.hypothesis && <blockquote>{observation.hypothesis}</blockquote>}
            </Panel>
          );
        })}
        {!observations.length && <Empty>暂无此类记录，结束一天或发起沟通后会逐步积累。</Empty>}
      </div>
    </>
  );
}
