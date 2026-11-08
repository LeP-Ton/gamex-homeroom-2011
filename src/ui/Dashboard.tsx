import { EXAM_CALENDAR, SUBJECT_MAP } from '../config/game';
import { shortGameDate } from '../config/desktop';
import { classAnalysis, studentAnalysis } from '../sim/analytics';
import type { Game } from '../sim/types';
import { LegacyIcon } from './LegacyIcon';
import { percent, type OpenApp } from './shared';

export function Dashboard({ game, open }: { game: Game; open: OpenApp }) {
  const stats = classAnalysis(game);
  const pending = game.events.filter((event) => !event.resolved).length;
  const next = EXAM_CALENDAR.find((exam) => exam.day >= game.day);
  const focus = game.students
    .filter((student) => studentAnalysis(game, student.id).borderline)
    .slice(0, 6);
  const work = game.submissions.filter((submission) => !submission.reviewed).length;
  return (
    <div className="school-portal">
      <div className="portal-welcome">
        欢迎访问春山中学教务管理平台　|　{shortGameDate(game.day)}　|　教师：{game.settings.teacher}
      </div>
      <header className="portal-banner">
        <LegacyIcon name="school" size={56} />
        <div>
          <h1>春山中学教务管理平台</h1>
          <p>CHUNSHAN MIDDLE SCHOOL · 教师工作平台</p>
        </div>
        <span>
          2011届高三
          <br />
          <b>百日教学管理</b>
        </span>
      </header>
      <nav className="portal-navigation">
        {[
          ['首页', 'dashboard'],
          ['学生管理', 'students'],
          ['成绩管理', 'scores'],
          ['教学工作', 'teaching'],
          ['考试安排', 'exams'],
          ['家校联系', 'parents'],
        ].map(([label, id]) => (
          <button key={id} onClick={() => open(id as Parameters<OpenApp>[0])}>
            {label}
          </button>
        ))}
      </nav>
      <div className="portal-marquee">
        <b>系统公告：</b>
        2010—2011学年第二学期高三复习工作已开始。请按时安排教学、检查作业并做好学生沟通记录。
      </div>
      <div className="portal-columns">
        <aside>
          <section>
            <h2>用户信息</h2>
            <p>姓　名：{game.settings.teacher}</p>
            <p>任教学科：{SUBJECT_MAP[game.settings.subject].name}</p>
            <p>班　级：{game.settings.className}</p>
            <p>班级人数：50 人</p>
            <p>教学日：{game.day} / 100</p>
          </section>
          <section>
            <h2>教务功能导航</h2>
            {[
              ['学生档案管理', 'students'],
              ['教室座位编排', 'seating'],
              ['考试成绩统计', 'scores'],
              ['作业布置与批改', 'homework'],
              ['教学计划制定', 'teaching'],
              ['试卷与考试管理', 'exams'],
              ['学生谈话记录', 'talk'],
              ['家校沟通记录', 'parents'],
              ['班级观察记录', 'observations'],
              ['教学日历', 'calendar'],
              ['高考成绩报告', 'report'],
            ].map(([label, id]) => (
              <button key={id} onClick={() => open(id as Parameters<OpenApp>[0])}>
                ▸ {label}
              </button>
            ))}
          </section>
        </aside>
        <main>
          <section className="portal-section">
            <h2>
              班级工作提示<span>教学日 {game.day}</span>
            </h2>
            <div className="portal-today">
              <div>
                <strong>{game.settings.className}</strong>
                <p>2011届 · 班主任课后管理</p>
              </div>
              <p>
                剩余工作时间：<b>{game.resources.time} 分钟</b>
                <br />
                可用精力：<b>{game.resources.energy} 点</b>
              </p>
              <button onClick={() => open('teaching')}>安排今日教学 &gt;&gt;</button>
            </div>
            <ul className="portal-notices">
              <li>
                <button onClick={() => open('parents')}>
                  [班级事务]{' '}
                  {pending
                    ? `有 ${pending} 条学生或家长消息尚未处理`
                    : '暂无待处理事务，请继续关注学生近况'}
                </button>
                <span>{shortGameDate(game.day)}</span>
              </li>
              <li>
                <button onClick={() => open('homework')}>
                  [作业管理]{' '}
                  {work ? `${work} 份提交等待分析与诊断` : '请合理布置专项作业，避免单科任务过量'}
                </button>
                <span>{shortGameDate(game.day)}</span>
              </li>
              <li>
                <button onClick={() => open('calendar')}>
                  [考试通知]{' '}
                  {next
                    ? `${next.name}安排在第 ${next.day} 教学日，距今 ${next.day - game.day} 天`
                    : '本届高考已结束，成绩报告已归档'}
                </button>
                <span>教务处</span>
              </li>
            </ul>
          </section>
          <section className="portal-section">
            <h2>
              最近考试情况<span>{stats.lastExam.name}</span>
            </h2>
            <table className="portal-stats">
              <tbody>
                <tr>
                  <th>全班平均分</th>
                  <td>
                    <b>{stats.average.toFixed(1)}</b> 分
                  </td>
                  <th>参考线上人数</th>
                  <td>
                    <b>{stats.qualified}</b> / 50 人
                  </td>
                </tr>
                <tr>
                  <th>参考线上线率</th>
                  <td>
                    <b>{percent(stats.rate)}</b>
                  </td>
                  <th>本科临界学生</th>
                  <td>
                    <b>{stats.borderline}</b> 人
                  </td>
                </tr>
                <tr>
                  <th>较摸底平均变化</th>
                  <td>
                    {stats.improvement >= 0 ? '+' : ''}
                    {stats.improvement.toFixed(1)} 分
                  </td>
                  <th>本科参考线</th>
                  <td>{game.settings.cutoff} 分（虚构规则）</td>
                </tr>
              </tbody>
            </table>
            <div className="portal-more">
              <button onClick={() => open('scores')}>打开 Excel 成绩表 &gt;&gt;</button>
            </div>
          </section>
          <section className="portal-section">
            <h2>
              本科临界学生跟进表<button onClick={() => open('students')}>全部学生 &gt;&gt;</button>
            </h2>
            <table className="portal-focus">
              <thead>
                <tr>
                  <th>学号</th>
                  <th>姓名</th>
                  <th>最近总分</th>
                  <th>薄弱学科</th>
                  <th>成绩估计区间</th>
                  <th>档案</th>
                </tr>
              </thead>
              <tbody>
                {focus.map((student) => {
                  const analysis = studentAnalysis(game, student.id);
                  return (
                    <tr key={student.id}>
                      <td>{String(student.id).padStart(2, '0')}</td>
                      <td>{student.name}</td>
                      <td>{analysis.latest.total.toFixed(1)}</td>
                      <td>{analysis.weakest.name}</td>
                      <td>
                        {analysis.low}～{analysis.high}
                      </td>
                      <td>
                        <button onClick={() => open('students', student.id)}>查看</button>
                      </td>
                    </tr>
                  );
                })}
                {!focus.length && (
                  <tr>
                    <td colSpan={6}>暂无处于参考线 ±35 分的学生。</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
          <section className="portal-section">
            <h2>今日已安排工作</h2>
            {game.actions.length ? (
              <ul className="portal-actions">
                {game.logs
                  .filter(
                    (log) => log.day === game.day && !['system', 'advance'].includes(log.kind),
                  )
                  .slice(-6)
                  .map((log, index) => (
                    <li key={index}>{log.text}</li>
                  ))}
              </ul>
            ) : (
              <p className="portal-empty">
                今日尚未安排教学行动。可先查看成绩、作业与观察记录，再制定教学计划。
              </p>
            )}
          </section>
        </main>
      </div>
      <footer>
        春山中学 信息中心　Copyright © 2011　|　GameX《高三班主任模拟器：2011》游戏内教务平台
      </footer>
    </div>
  );
}
