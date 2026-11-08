import { useEffect, useState } from 'react';
import { EVENT_CONFIG, PARENT_STYLES, TALK_STYLES } from '../config/game';
import { shortGameDate } from '../config/desktop';
import { studentAnalysis } from '../sim/analytics';
import type { Game } from '../sim/types';
import { useGame } from '../state/store';
import { Avatar, Empty, SearchBox, Tag, type OpenApp } from './shared';
import { LegacyIcon } from './LegacyIcon';

export function ConversationApp({
  game,
  selectedId,
  parents = false,
  open,
}: {
  game: Game;
  selectedId?: number;
  parents?: boolean;
  open: OpenApp;
}) {
  const dispatch = useGame((state) => state.dispatch);
  const [studentId, setStudentId] = useState(selectedId ?? 1);
  const [style, setStyle] = useState(parents ? PARENT_STYLES[0] : TALK_STYLES[0]);
  const [tab, setTab] = useState(parents ? 'inbox' : 'conversation');
  const [query, setQuery] = useState('');
  const [fullHistory, setFullHistory] = useState(false);
  const [fontSize, setFontSize] = useState(12);
  useEffect(() => {
    if (selectedId) {
      setStudentId(selectedId);
      setTab('conversation');
    }
  }, [selectedId]);
  const student = game.students.find((item) => item.id === studentId)!;
  const source = parents ? '家长反馈' : '学生谈话';
  const allMessages = game.observations.filter(
    (observation) => observation.studentId === studentId && observation.source === source,
  );
  const messages = fullHistory ? allMessages : allMessages.slice(-15);
  const remaining = Math.max(
    0,
    (parents ? 5 : 3) - (game.day - (parents ? student.lastParent : student.lastTalk)),
  );
  const pending = game.events.filter((event) => !event.resolved).length;
  const contacts = game.students.filter(
    (student) => student.name.includes(query) || String(student.id).includes(query),
  );
  const speech = (way: string) => {
    const words: Record<string, string> = parents
      ? {
          共同支持: `您好，我们一起了解${student.name}最近遇到的学习困难，给孩子适当支持，先定一个能完成的小目标。`,
          反馈进步: `您好，想和您交流一下${student.name}近期的学习表现，也请多留意孩子自己的感受。`,
          协调作息: `您好，复习阶段需要保证休息。我们一起看看${student.name}的作业负担和作息安排。`,
          强调要求: `您好，希望家里加强对${student.name}学习任务的督促，帮助孩子及时完成复习要求。`,
        }
      : {
          鼓励: `${student.name}，老师看到了你的努力。我们一步一步来，把眼前能做好的事情做好。`,
          严肃提醒: `${student.name}，老师想认真提醒你：请重视当前的学习安排，及时完成自己的任务。`,
          分析学习问题: `${student.name}，我们一起看看作业与考试中的问题，找到最需要改进的环节。`,
          倾听困难: `${student.name}，最近有什么不容易的地方？你可以慢慢说，我先听一听。`,
          制定学习计划: `${student.name}，我们把目标拆小，制定一个适合你的复习计划，再定期检查。`,
          缓解焦虑: `${student.name}，一次考试不代表全部。先调整呼吸和作息，再一起面对下一步。`,
        };
    return words[way] ?? way;
  };
  return (
    <div className="qq-client">
      <header className="qq-profile-strip">
        <LegacyIcon name="qq" size={45} />
        <div>
          <strong>
            {game.settings.teacher}　<span className="qq-status">● Q我吧</span>
          </strong>
          <p>2011，高考一起加油！　{game.settings.className}班主任</p>
        </div>
        <span className="qq-status">班级通讯录</span>
      </header>
      <div className="qq-layout">
        <aside className="qq-contacts">
          <SearchBox value={query} onChange={setQuery} placeholder="搜索联系人" />
          {parents && (
            <button className={tab === 'inbox' ? 'selected' : ''} onClick={() => setTab('inbox')}>
              <LegacyIcon name="qq" size={27} />
              <span>
                <strong>班级消息</strong>
                <small>{pending} 条待处理事务</small>
              </span>
            </button>
          )}
          <div className="qq-group-heading">
            ▾ {parents ? '家长联系人' : '本班学生'}（{contacts.length}）
          </div>
          {contacts.map((contact) => (
            <button
              key={contact.id}
              className={studentId === contact.id && tab === 'conversation' ? 'selected' : ''}
              onClick={() => {
                setStudentId(contact.id);
                setTab('conversation');
              }}
            >
              <Avatar student={contact} small />
              <span>
                {contact.name}
                {parents ? '家长' : ''}
                <small>
                  {String(contact.id).padStart(2, '0')} · {parents ? '家校联系' : '学生谈话记录'}
                </small>
              </span>
            </button>
          ))}
        </aside>
        <main className="qq-conversation">
          {tab === 'inbox' ? (
            <>
              <h2 className="qq-inbox-heading">{game.settings.className} · 班级消息盒子</h2>
              <div className="qq-event-list">
                {game.events
                  .slice()
                  .reverse()
                  .map((event) => {
                    const contact = game.students.find(
                      (student) => student.id === event.studentId,
                    )!;
                    const config = EVENT_CONFIG.find((config) => config.id === event.type)!;
                    return (
                      <article className="qq-event" key={event.id}>
                        <header>
                          <Avatar student={contact} small />
                          <strong>{event.title}</strong>
                          <Tag tone={event.resolved ? '' : 'amber'}>
                            {event.resolved ? '已跟进' : '未处理'}
                          </Tag>
                          <small>{shortGameDate(event.day)}</small>
                        </header>
                        <p>{event.text}</p>
                        {event.resolved ? (
                          <p>处理记录：{event.choice}</p>
                        ) : (
                          <div className="event-choices">
                            {config.choices.map((choice, index) => (
                              <button
                                className="button"
                                disabled={game.ended}
                                key={choice}
                                onClick={() =>
                                  dispatch({ type: 'event', eventId: event.id, choice: index })
                                }
                              >
                                {choice}
                              </button>
                            ))}
                            <small>耗时15分钟 / 精力8点</small>
                          </div>
                        )}
                        <button
                          className="text-button"
                          onClick={() => open('students', contact.id)}
                        >
                          查看{contact.name}的档案
                        </button>
                      </article>
                    );
                  })}
                {!game.events.length && <Empty>消息盒子中暂无新事务。</Empty>}
              </div>
            </>
          ) : (
            <>
              <header className="qq-conversation-title">
                <Avatar student={student} small />
                <div>
                  <strong>
                    {student.name}
                    {parents ? '家长' : ''}
                  </strong>
                  <p>
                    {game.settings.className} · 最近总分{' '}
                    {studentAnalysis(game, studentId).latest.total.toFixed(1)} 分
                  </p>
                </div>
                <LegacyIcon name="qq" size={28} />
              </header>
              <div className="qq-history">
                {messages.length ? (
                  messages.map((message) => {
                    const log = game.logs.find(
                      (log) =>
                        log.kind === (parents ? 'parent' : 'talk') &&
                        log.studentId === studentId &&
                        log.day === message.day,
                    );
                    const way = (parents ? PARENT_STYLES : TALK_STYLES).find((way) =>
                      log?.text.includes(way),
                    );
                    return (
                      <div key={message.id}>
                        {way && !message.text.startsWith('已处理') && (
                          <article className="qq-chat-message teacher">
                            <header>
                              {game.settings.teacher}　{shortGameDate(message.day)}
                            </header>
                            <p style={{ fontSize }}>{speech(way)}</p>
                          </article>
                        )}
                        <article className="qq-chat-message">
                          <header>
                            {student.name}
                            {parents ? '家长反馈' : ''}　{shortGameDate(message.day)}
                          </header>
                          <p style={{ fontSize }}>{message.text}</p>
                          {message.hypothesis && <small>教师备注：{message.hypothesis}</small>}
                        </article>
                      </div>
                    );
                  })
                ) : (
                  <Empty>暂无聊天记录。请选择合适的沟通方式。</Empty>
                )}
              </div>
              <div className="qq-chat-tools">
                <button
                  title="切换聊天字号"
                  onClick={() => setFontSize(fontSize === 16 ? 12 : fontSize + 2)}
                >
                  <b>A</b> 字体
                </button>
                <button onClick={() => setFullHistory(!fullHistory)}>
                  {fullHistory ? '最近消息' : '消息记录'}
                </button>
                <button onClick={() => open('students', studentId)}>查看档案</button>
                <small>{fullHistory ? allMessages.length : messages.length} 条反馈</small>
              </div>
              <div className="qq-compose">
                <label>
                  沟通方式：
                  <select
                    aria-label={parents ? '家校沟通方式' : '学生谈话方式'}
                    value={style}
                    onChange={(event) => setStyle(event.target.value)}
                  >
                    {(parents ? PARENT_STYLES : TALK_STYLES).map((way) => (
                      <option key={way}>{way}</option>
                    ))}
                  </select>
                </label>
                <textarea aria-label="即将发送的沟通内容" readOnly value={speech(style)} />
                <div className="qq-compose-footer">
                  <small>
                    {remaining
                      ? `需要再等 ${remaining} 天后跟进`
                      : `消耗20分钟 / ${parents ? 10 : 12}精力`}
                  </small>
                  <button
                    className="button"
                    disabled={game.ended || remaining > 0}
                    onClick={() =>
                      dispatch({
                        type: 'teach',
                        kind: parents ? 'parent' : 'talk',
                        targets: [studentId],
                        style,
                      })
                    }
                  >
                    发送(S)
                  </button>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
