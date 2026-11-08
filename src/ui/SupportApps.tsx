import { LegacyIcon, ClassicGlyph } from './LegacyIcon';
import { useEffect, useState } from 'react';
import {
  DIFFICULTIES,
  EVENT_CONFIG,
  EXAM_CALENDAR,
  GAME_DAYS,
  PARENT_STYLES,
  SUBJECTS,
  TALK_STYLES,
} from '../config/game';
import { classAnalysis, reportCsv, studentAnalysis } from '../sim/analytics';
import { examStats } from '../sim/exam';
import type { Game, RecordEntry } from '../sim/types';
import { useGame } from '../state/store';
import { downloadText, listRecords } from '../state/storage';
import {
  AppHeader,
  Avatar,
  dayDate,
  Delta,
  Empty,
  Metric,
  Panel,
  percent,
  StudentSelect,
  SubjectBars,
  Tag,
  type OpenApp,
} from './shared';

export function ExamsApp({ game, open }: { game: Game; open: OpenApp }) {
  const dispatch = useGame((state) => state.dispatch);
  const [difficulty, setDifficulty] = useState(0.55);
  const [examIndex, setExamIndex] = useState(game.exams.length - 1);
  const [subject, setSubject] = useState(SUBJECTS[0].id);
  const exam = game.exams[Math.min(examIndex, game.exams.length - 1)];
  const paper = exam.papers.find((item) => item.subject === subject)!;
  const stats = examStats(exam, game.settings.cutoff);
  return (
    <>
      <AppHeader
        eyebrow="EXAMINATION CENTER"
        title="2011届高三考试安排"
        description="试卷覆盖、难度、知识掌握与临场状态共同决定表现。测验本身不提供直接加分。"
      />
      <div className="two-column">
        <Panel title="统一考试安排">
          <div className="exam-timeline">
            {EXAM_CALENDAR.map((item) => (
              <div
                key={item.day}
                className={
                  game.exams.some((exam) => exam.day === item.day && exam.name === item.name)
                    ? 'complete'
                    : ''
                }
              >
                <span>{item.day}</span>
                <div>
                  <strong>{item.name}</strong>
                  <p>
                    {dayDate(item.day)} ·{' '}
                    {item.day === 100 ? '百日最终结算' : '结束当日工作后自动进行'}
                  </p>
                </div>
                <Tag>
                  {game.exams.some((exam) => exam.day === item.day && exam.name === item.name)
                    ? '已归档'
                    : item.day === game.day
                      ? '今日'
                      : '待进行'}
                </Tag>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="组织六科测验" note="额外测验消耗资源并带来疲劳，请按需安排">
          <label className="field-label">
            试卷难度
            <select
              value={difficulty}
              onChange={(event) => setDifficulty(Number(event.target.value))}
            >
              <option value={0.4}>偏基础 · 40%</option>
              <option value={0.55}>标准 · 55%</option>
              <option value={0.7}>偏难 · 70%</option>
            </select>
          </label>
          <p className="muted body-text">
            覆盖全部六科与配置知识点，分值共 750 分；同一天最多一次，统一考试日不额外安排。
          </p>
          <div className="cost-preview">
            <span>
              时间 <b>90 分钟</b>
            </span>
            <span>
              精力 <b>35 点</b>
            </span>
          </div>
          <button
            className="button wide"
            disabled={game.ended}
            onClick={() => {
              if (dispatch({ type: 'quiz', difficulty })) setExamIndex(game.exams.length);
            }}
          >
            <LegacyIcon name="document" size={15} />
            生成试卷并组织测验
          </button>
        </Panel>
      </div>
      <Panel
        title="试卷档案"
        action={
          <div className="toolbar compact">
            <select
              aria-label="查看考试"
              value={examIndex}
              onChange={(event) => setExamIndex(Number(event.target.value))}
            >
              {game.exams.map((item, index) => (
                <option key={item.id} value={index}>
                  {item.name}
                </option>
              ))}
            </select>
            <select
              aria-label="查看试卷科目"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            >
              {SUBJECTS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        }
      >
        <div className="paper-summary">
          <Tag tone="green">
            {SUBJECTS.find((item) => item.id === subject)!.name} ·{' '}
            {SUBJECTS.find((item) => item.id === subject)!.max} 分
          </Tag>
          <Tag>实际难度 {percent(paper.difficulty)}</Tag>
          <Tag>{paper.type}</Tag>
        </div>
        <div className="topic-coverage">
          {SUBJECTS.find((item) => item.id === subject)!.topics.map((topic) => (
            <span key={topic.id}>
              {topic.name}
              <b>
                {percent(
                  paper.topicWeights[topic.id] /
                    Object.values(paper.topicWeights).reduce((sum, value) => sum + value, 0),
                )}
              </b>
            </span>
          ))}
        </div>
        <div className="question-block">
          <small>试卷代表题 · 评分基于全部知识点覆盖</small>
          <h3>{paper.sample.prompt}</h3>
          <p>参考答案：{paper.sample.answer}</p>
        </div>
        <div className="toolbar">
          <span>
            本次全班均分 <b>{stats.average}</b> · 上线 <b>{stats.qualified}/50</b>
          </span>
          <button className="button subtle" onClick={() => open('scores')}>
            查看完整成绩
            <ClassicGlyph name="right" size={14} />
          </button>
        </div>
      </Panel>
    </>
  );
}

export function CalendarApp({ game }: { game: Game }) {
  const [day, setDay] = useState(game.day);
  const scheduled = EXAM_CALENDAR.find((exam) => exam.day === day);
  const logs = game.logs.filter((log) => log.day === day);
  return (
    <>
      <AppHeader
        eyebrow="100-DAY CALENDAR"
        title="2011届高三教学日历"
        description="统一考试按教学日自动执行。点击日期查看真实管理记录或未来考试日程。"
        action={
          <button className="button subtle" onClick={() => setDay(game.day)}>
            <LegacyIcon name="calendar" size={15} />
            回到今日
          </button>
        }
      />
      <div className="calendar-legend">
        <span>
          <i className="dot green" />
          已完成
        </span>
        <span>
          <i className="dot amber" />
          统一考试
        </span>
        <span>
          <i className="dot outline" />
          待进行
        </span>
      </div>
      <Panel>
        <div className="calendar-grid">
          {Array.from({ length: GAME_DAYS }, (_, index) => {
            const number = index + 1;
            const exam = EXAM_CALENDAR.find((item) => item.day === number);
            return (
              <button
                key={number}
                className={`${number < game.day || game.ended ? 'past' : ''} ${number === game.day ? 'today' : ''} ${number === day ? 'selected' : ''} ${exam ? 'exam-day' : ''}`}
                onClick={() => setDay(number)}
                aria-label={`教学日 ${number}${exam ? ` ${exam.name}` : ''}`}
              >
                <strong>{String(number).padStart(2, '0')}</strong>
                <small>{exam?.name ?? (number === game.day ? '今日' : dayDate(number))}</small>
              </button>
            );
          })}
        </div>
      </Panel>
      <Panel
        title={`教学日 ${day} · ${dayDate(day)}`}
        note={scheduled ? scheduled.name : day > game.day ? '尚未开始的教学日' : '教学管理记录'}
      >
        {logs.length ? (
          <div className="day-log">
            {logs.map((log, index) => (
              <div key={index}>
                <span className="observation-dot" />
                <p>{log.text}</p>
              </div>
            ))}
          </div>
        ) : (
          <Empty>
            {day > game.day
              ? scheduled
                ? `届时将自动举行${scheduled.name}，请提前安排复习与恢复。`
                : '未来的记录还没有发生。先把今天的事情做好。'
              : '今日暂无已完成的管理操作。'}
          </Empty>
        )}
      </Panel>
    </>
  );
}

export function ReportApp({
  game,
  replay,
  newGame,
}: {
  game: Game;
  replay: () => void;
  newGame: () => void;
}) {
  const stats = classAnalysis(game);
  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [difficulty, setDifficulty] = useState('all');
  const save = useGame((state) => state.save);
  const notify = useGame((state) => state.notify);
  useEffect(() => {
    let active = true;
    const read = async () => {
      if (game.ended) await save();
      const entries = await listRecords();
      if (active) setRecords(entries);
    };
    void read().catch((error) => notify(String(error), true));
    return () => {
      active = false;
    };
  }, [game.ended, save, notify]);
  const ranked = records
    .filter((record) => difficulty === 'all' || record.difficulty === difficulty)
    .sort((a, b) => b.rate - a.rate || b.average - a.average);
  return (
    <>
      <AppHeader
        eyebrow={game.ended ? 'THE JOURNEY, RECORDED' : 'PROGRESS REPORT'}
        title={game.ended ? '2011年高考成绩报告' : '2011届高三阶段成绩分析'}
        description={
          game.ended
            ? `种子 ${game.settings.seed} · ${DIFFICULTIES[game.settings.difficulty].name}难度 · 百日高考报告`
            : '当前为阶段报告，最终高考将在第 100 天结束后进行。'
        }
        action={
          <button
            className="button subtle"
            onClick={() =>
              downloadText(
                `${game.settings.className}-成绩报告.csv`,
                reportCsv(game),
                'text/csv;charset=utf-8',
              )
            }
          >
            <LegacyIcon name="export" size={15} />
            导出成绩
          </button>
        }
      />
      <div className="report-banner">
        <LegacyIcon name="certificate" size={40} />
        <div>
          <span>
            {game.ended ? '高考本科参考线上线率' : `${stats.lastExam.name} · 本科参考线上线率`}
          </span>
          <h2>
            {Math.round(stats.rate * 100)}
            <small>%</small>
          </h2>
          <p>
            {stats.qualified} 位同学达到 {game.settings.cutoff} 分参考线 · 虚构规则，仅用于游戏
          </p>
        </div>
        <div className="report-banner-side">
          <strong>
            {stats.improvement >= 0 ? '+' : ''}
            {stats.improvement.toFixed(1)}
          </strong>
          <span>全班平均分较摸底变化</span>
        </div>
      </div>
      <div className="metrics-grid">
        <Metric label="全班平均分" value={stats.average.toFixed(1)} unit="分" />
        <Metric label="参考线上人数" value={stats.qualified} unit="/50" />
        <Metric label="600 分以上" value={stats.high} unit="人" />
        <Metric label="全班平均进步" value={<Delta value={stats.improvement} />} unit="分" />
      </div>
      <div className="two-column">
        <Panel title="六科学习表现" note="总分与分科均由实际考试记录统计">
          <SubjectBars scores={stats.subjects} />
        </Panel>
        <Panel title="个人成长排行" note="比较当前考试与开学摸底">
          <div className="growth-list">
            {game.students
              .map((student) => ({ student, analysis: studentAnalysis(game, student.id) }))
              .sort((a, b) => b.analysis.improvement - a.analysis.improvement)
              .slice(0, 5)
              .map(({ student, analysis }, index) => (
                <div key={student.id}>
                  <b>{index + 1}</b>
                  <Avatar student={student} small />
                  <strong>{student.name}</strong>
                  <span>{analysis.latest.total.toFixed(1)} 分</span>
                  <Delta value={analysis.improvement} />
                </div>
              ))}
          </div>
        </Panel>
      </div>
      <Panel
        title="本地历史排行榜"
        note="按上线率、均分排序；不同种子与参考线不等价，需结合规则比较"
        action={
          <select
            aria-label="排行榜难度"
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value)}
          >
            <option value="all">所有难度</option>
            {Object.entries(DIFFICULTIES).map(([id, config]) => (
              <option key={id} value={id}>
                {config.name}
              </option>
            ))}
          </select>
        }
      >
        {ranked.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>排名</th>
                  <th>班级 / 教师</th>
                  <th>难度</th>
                  <th>种子 / 参考线</th>
                  <th>上线率</th>
                  <th>均分</th>
                  <th>进步</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((record, index) => (
                  <tr key={record.id}>
                    <td>{index + 1}</td>
                    <td>
                      {record.className} / {record.teacher}
                    </td>
                    <td>{DIFFICULTIES[record.difficulty].name}</td>
                    <td>
                      {record.seed} / {record.cutoff}
                    </td>
                    <td>{percent(record.rate)}</td>
                    <td>{record.average}</td>
                    <td>{record.improvement}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>完成第 100 天后，本局会自动加入本地排行榜。</Empty>
        )}
      </Panel>
      <div className="button-row">
        <button className="button" onClick={replay}>
          重新挑战相同种子
          <ClassicGlyph name="right" size={15} />
        </button>
        <button className="button subtle" onClick={newGame}>
          创建新的班级
        </button>
        <button
          className="button subtle"
          onClick={() =>
            downloadText(
              '教学管理记录.json',
              JSON.stringify(
                { settings: game.settings, logs: game.logs, observations: game.observations },
                null,
                2,
              ),
            )
          }
        >
          <LegacyIcon name="export" size={15} />
          导出教学记录
        </button>
      </div>
    </>
  );
}
