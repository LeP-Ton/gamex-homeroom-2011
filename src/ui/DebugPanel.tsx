import { LegacyIcon } from './LegacyIcon';
import { useMemo, useState } from 'react';
import { DIFFICULTIES, SUBJECTS } from '../config/game';
import { classAnalysis } from '../sim/analytics';
import { createGame } from '../sim/generate';
import { playStrategyDay, simulateRun, STRATEGY_LABELS, type Strategy } from '../sim/strategies';
import type { Game } from '../sim/types';
import { downloadText } from '../state/storage';
import { Modal } from './Settings';
import { Panel, StudentSelect, Tag } from './shared';

export function DebugPanel({ source, close }: { source: Game; close: () => void }) {
  const [game, setGame] = useState<Game>(() => ({ ...structuredClone(source), debug: true }));
  const [studentId, setStudentId] = useState(1);
  const [strategy, setStrategy] = useState<Strategy>('balanced');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('state');
  const [traceDay, setTraceDay] = useState<number | null>(null);
  const [seedCount, setSeedCount] = useState(3);
  const [batch, setBatch] = useState<ReturnType<typeof simulateRun>['summary'][]>([]);
  const [progress, setProgress] = useState('');
  const student = game.students.find((item) => item.id === studentId)!;
  const trace = game.traces.find((trace) => trace.day === traceDay) ?? game.traces.at(-1);
  const stats = useMemo(() => classAnalysis(game), [game]);
  const fastForward = async () => {
    setBusy(true);
    let next = game;
    try {
      while (!next.ended) {
        next = playStrategyDay(next, strategy);
        if (next.day % 10 === 0) {
          setProgress(`正在结算 D${next.day}`);
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
      setGame(next);
    } finally {
      setBusy(false);
      setProgress('');
    }
  };
  const runBatch = async () => {
    setBusy(true);
    const results: typeof batch = [];
    try {
      for (let index = 0; index < seedCount; index++) {
        setProgress(`批量种子 ${index + 1}/${seedCount}`);
        await new Promise((resolve) => setTimeout(resolve, 0));
        results.push(
          simulateRun(
            `${source.settings.seed}-调试-${index}`,
            game.settings.difficulty,
            strategy,
            false,
          ).summary,
        );
        setBatch([...results]);
      }
    } finally {
      setBusy(false);
      setProgress('');
    }
  };
  return (
    <Modal title="开发者实验室 · 隔离调试副本" close={close} wide>
      <div className="info-note">
        <LegacyIcon name="settings" size={18} />
        <p>
          此处操作独立副本，不写入正常存档或排行榜。可检查真实属性、每日预算、教学收益与考试评分。
        </p>
      </div>
      <div className="toolbar wrap">
        <Tag tone="amber">
          D{game.day} · {stats.average} 分 · {DIFFICULTIES[game.settings.difficulty].name}
        </Tag>
        <select
          aria-label="调试策略"
          value={strategy}
          onChange={(event) => setStrategy(event.target.value as Strategy)}
        >
          {Object.entries(STRATEGY_LABELS).map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <button
          className="button subtle"
          disabled={busy || game.ended}
          onClick={() => setGame(playStrategyDay(game, strategy))}
        >
          <LegacyIcon name="play" size={13} />
          推进一天
        </button>
        <button className="button" disabled={busy || game.ended} onClick={() => void fastForward()}>
          <LegacyIcon name="forward" size={14} />
          推进至高考
        </button>
        <button
          className="button subtle"
          disabled={busy}
          onClick={() => setGame(createGame(source.settings, true))}
        >
          重置副本
        </button>
      </div>
      {progress && <p className="muted">{progress}</p>}
      <div className="tab-row">
        {[
          ['state', '真实属性'],
          ['trace', '每日收益'],
          ['exam', '评分过程'],
          ['batch', '批量种子'],
        ].map(([id, label]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab !== 'batch' && (
        <div className="toolbar">
          <StudentSelect game={game} value={studentId} onChange={setStudentId} />
          {tab === 'trace' && (
            <select
              aria-label="每日追踪日期"
              value={trace?.day ?? ''}
              onChange={(event) => setTraceDay(Number(event.target.value))}
            >
              {game.traces.map((trace) => (
                <option key={trace.day} value={trace.day}>
                  D{trace.day}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
      {tab === 'state' && (
        <>
          <pre className="debug-json">
            {JSON.stringify(
              {
                ability: student.ability,
                habits: student.habits,
                psyche: student.psyche,
                family: student.family,
                relations: student.relations,
              },
              null,
              2,
            )}
          </pre>
          <Panel title="真实知识掌握">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>科目</th>
                    <th>知识点</th>
                    <th>掌握</th>
                    <th>熟练</th>
                    <th>上次练习</th>
                  </tr>
                </thead>
                <tbody>
                  {SUBJECTS.flatMap((subject) =>
                    subject.topics.map((topic) => {
                      const node = student.knowledge[subject.id][topic.id];
                      return (
                        <tr key={topic.id}>
                          <td>{subject.name}</td>
                          <td>{topic.name}</td>
                          <td>{node.mastery.toFixed(4)}</td>
                          <td>{node.fluency.toFixed(4)}</td>
                          <td>D{node.practiced}</td>
                        </tr>
                      );
                    }),
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
      {tab === 'trace' && (
        <>
          <pre className="debug-json">
            {JSON.stringify(
              trace?.ledgers.find((ledger) => ledger.studentId === studentId) ?? {
                提示: '推进一天后显示学习时间分配。',
              },
              null,
              2,
            )}
          </pre>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>来源</th>
                  <th>科目 / 知识点</th>
                  <th>分钟</th>
                  <th>效率</th>
                  <th>原掌握</th>
                  <th>增量</th>
                </tr>
              </thead>
              <tbody>
                {trace?.gains
                  .filter((gain) => gain.studentId === studentId)
                  .map((gain, index) => (
                    <tr key={index}>
                      <td>{gain.source}</td>
                      <td>
                        {gain.subject} / {gain.topic}
                      </td>
                      <td>{gain.minutes.toFixed(2)}</td>
                      <td>{gain.efficiency.toFixed(3)}</td>
                      <td>{gain.before.toFixed(4)}</td>
                      <td>{gain.gain.toFixed(6)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {tab === 'exam' && (
        <pre className="debug-json">
          {JSON.stringify(
            {
              考试: game.exams.at(-1)!.name,
              满分: '语数英各150，物化生各100',
              评分公式: '满分 × [加权知识^0.86 × 难度因子 × 状态因子 + 有界临场波动]',
              详情: game.exams.at(-1)!.results.find((result) => result.studentId === studentId),
            },
            null,
            2,
          )}
        </pre>
      )}
      {tab === 'batch' && (
        <>
          <div className="toolbar">
            <label>
              种子数量
              <input
                type="number"
                min={1}
                max={12}
                value={seedCount}
                onChange={(event) =>
                  setSeedCount(Math.max(1, Math.min(12, Number(event.target.value) || 1)))
                }
              />
            </label>
            <button className="button" disabled={busy} onClick={() => void runBatch()}>
              运行批量百日模拟
            </button>
            <button
              className="button subtle"
              disabled={!batch.length}
              onClick={() => downloadText('调试批量统计.json', JSON.stringify(batch, null, 2))}
            >
              <LegacyIcon name="export" size={14} />
              导出统计
            </button>
          </div>
          <pre className="debug-json">{JSON.stringify(batch, null, 2)}</pre>
        </>
      )}
    </Modal>
  );
}
