import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { DIFFICULTIES } from '../src/config/game';
import { csvEscape } from '../src/sim/analytics';
import { mean, round } from '../src/sim/random';
import { simulateRun, STRATEGY_LABELS, type Strategy } from '../src/sim/strategies';
import type { Difficulty } from '../src/sim/types';

const option = (name: string, fallback: string) =>
  process.argv
    .find((value) => value.startsWith(`--${name}=`))
    ?.split('=')
    .slice(1)
    .join('=') ?? fallback;
const count = Math.max(1, Math.min(100, Number(option('seeds', '3')) || 3));
const output = resolve(option('out', '.local/balance.json'));
const requestedDifficulty = option('difficulty', 'all');
const difficulties = (
  requestedDifficulty === 'all' ? Object.keys(DIFFICULTIES) : [requestedDifficulty]
) as Difficulty[];
if (difficulties.some((difficulty) => !DIFFICULTIES[difficulty]))
  throw new Error('难度参数为 normal、challenge、hard 或 all。');
const rows: ReturnType<typeof simulateRun>['summary'][] = [];
const started = performance.now();
for (const difficulty of difficulties)
  for (let index = 0; index < count; index++)
    for (const strategy of Object.keys(STRATEGY_LABELS) as Strategy[]) {
      const seed = `春山-平衡-${index}`;
      const { summary } = simulateRun(seed, difficulty, strategy, false);
      rows.push(summary);
      console.log(
        `${DIFFICULTIES[difficulty].name} / ${seed} / ${STRATEGY_LABELS[strategy]}：均分 ${summary.average}，上线率 ${Math.round(summary.rate * 100)}%，进步 ${summary.improvement}`,
      );
    }
const aggregates = difficulties.flatMap((difficulty) =>
  (Object.keys(STRATEGY_LABELS) as Strategy[]).map((strategy) => {
    const selected = rows.filter(
      (row) => row.difficulty === difficulty && row.strategy === strategy,
    );
    return {
      难度: DIFFICULTIES[difficulty].name,
      策略: STRATEGY_LABELS[strategy],
      班级数: selected.length,
      平均分: round(mean(selected.map((row) => row.average))),
      上线率: round(mean(selected.map((row) => row.rate)) * 100),
      平均进步: round(mean(selected.map((row) => row.improvement))),
      平均疲劳: round(mean(selected.map((row) => row.fatigue)), 3),
    };
  }),
);
await mkdir(dirname(output), { recursive: true });
await writeFile(
  output,
  JSON.stringify(
    {
      规则: '虚构750分制，本科参考线450，仅本地规则模拟，不写入游戏存档或排行榜',
      种子数: count,
      耗时秒: round((performance.now() - started) / 1000),
      aggregates,
      rows,
    },
    null,
    2,
  ),
);
const csv =
  '\ufeff' +
  [
    ['种子', '难度', '策略', '均分', '上线率', '进步', '疲劳', '压力'],
    ...rows.map((row) => [
      row.seed,
      row.difficulty,
      row.strategy,
      row.average,
      row.rate,
      row.improvement,
      row.fatigue,
      row.stress,
    ]),
  ]
    .map((row) => row.map(csvEscape).join(','))
    .join('\r\n');
await writeFile(output.replace(/\.json$/, '') + '.csv', csv);
console.table(aggregates);
console.log(`已导出：${output}`);
