import { ArrowDown, ArrowUp, ArrowUpRight, ChevronRight, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { SUBJECTS } from '../config/game';
import { gameDate } from '../config/desktop';
import { studentAnalysis } from '../sim/analytics';
import type { Game, Student } from '../sim/types';

export type AppId =
  | 'dashboard'
  | 'students'
  | 'seating'
  | 'scores'
  | 'homework'
  | 'exams'
  | 'teaching'
  | 'talk'
  | 'parents'
  | 'observations'
  | 'calendar'
  | 'report';
export type OpenApp = (id: AppId, studentId?: number) => void;
export const percent = (value: number) => `${Math.round(value * 100)}%`;
export const dayDate = (day: number) =>
  gameDate(day).toLocaleDateString('zh-CN', {
    timeZone: 'UTC',
    month: 'long',
    day: 'numeric',
  });
export function Avatar({ student, small = false }: { student: Student; small?: boolean }) {
  return (
    <span className={`avatar ${small ? 'small' : ''} tone-${student.id % 5}`}>
      {student.name.slice(-2)}
    </span>
  );
}
export function Tag({ children, tone = '' }: { children: ReactNode; tone?: string }) {
  return <span className={`tag ${tone}`}>{children}</span>;
}
export function Empty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-mark">✦</span>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function AppHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="app-header">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}
export function Panel({
  title,
  note,
  action,
  children,
  className = '',
}: {
  title?: string;
  note?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-heading">
          <div>
            <h2>{title}</h2>
            {note && <span>{note}</span>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Metric({
  label,
  value,
  unit,
  detail,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  detail?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={`metric ${accent ? 'accent' : ''}`}>
      <span>{label}</span>
      <strong>
        {value}
        <small>{unit}</small>
      </strong>
      {detail && <div className="metric-detail">{detail}</div>}
    </div>
  );
}
export function Delta({ value }: { value: number }) {
  return (
    <span className={`delta ${value < 0 ? 'negative' : ''}`}>
      {value < 0 ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
      {Math.abs(value).toFixed(1)}
    </span>
  );
}
export function StudentSelect({
  game,
  value,
  onChange,
}: {
  game: Game;
  value: number;
  onChange: (id: number) => void;
}) {
  return (
    <select
      aria-label="选择学生"
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
    >
      {game.students.map((student) => (
        <option key={student.id} value={student.id}>
          {String(student.id).padStart(2, '0')} · {student.name}
        </option>
      ))}
    </select>
  );
}
export function StudentRow({
  student,
  game,
  onClick,
}: {
  student: Student;
  game: Game;
  onClick: () => void;
}) {
  const analysis = studentAnalysis(game, student.id);
  return (
    <button className="student-row" onClick={onClick}>
      <Avatar student={student} small />
      <div className="student-row-name">
        <strong>{student.name}</strong>
        <span>{analysis.weakest.name}可重点跟进</span>
      </div>
      <span className="student-score">
        {analysis.latest.total.toFixed(1)}
        <small> 分</small>
      </span>
      <ChevronRight size={15} />
    </button>
  );
}
export function SearchBox({
  value,
  onChange,
  placeholder = '搜索姓名或学号',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="search-box">
      <Search size={15} />
      <input
        aria-label={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
export function MiniTrend({
  values,
  width = 480,
  height = 150,
  labels = [],
  cutoff,
}: {
  values: number[];
  width?: number;
  height?: number;
  labels?: string[];
  cutoff?: number;
}) {
  const low = Math.floor((Math.min(...values, cutoff ?? Infinity) - 15) / 20) * 20;
  const high = Math.ceil((Math.max(...values, cutoff ?? 0) + 15) / 20) * 20;
  const x = (index: number) => 38 + (index / Math.max(1, values.length - 1)) * (width - 60);
  const y = (value: number) => height - 28 - ((value - low) / (high - low || 1)) * (height - 45);
  const points = values.map((value, index) => `${x(index)},${y(value)}`).join(' ');
  return (
    <svg
      className="trend-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`成绩趋势：${values.map((value) => value.toFixed(1)).join('、')}`}
    >
      {[low, Math.round((low + high) / 2), high].map((tick) => (
        <g key={tick}>
          <line
            x1="38"
            y1={y(tick)}
            x2={width - 18}
            y2={y(tick)}
            stroke="#e8eae5"
            strokeDasharray="3 5"
          />
          <text x="0" y={y(tick) + 4} className="chart-label">
            {tick}
          </text>
        </g>
      ))}
      {cutoff !== undefined && (
        <g>
          <line
            x1="38"
            y1={y(cutoff)}
            x2={width - 18}
            y2={y(cutoff)}
            stroke="#bb825f"
            strokeDasharray="5 4"
          />
          <text x={width - 18} y={y(cutoff) - 7} textAnchor="end" className="chart-label">
            参考线 {cutoff}
          </text>
        </g>
      )}
      {values.length > 1 && (
        <polygon
          points={`${x(0)},${height - 28} ${points} ${x(values.length - 1)},${height - 28}`}
          fill="#eaf1e9"
          opacity="0.8"
        />
      )}
      <polyline
        points={points}
        fill="none"
        stroke="#426753"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {values.map((value, index) => (
        <g key={index}>
          <circle cx={x(index)} cy={y(value)} r="4" fill="#426753" stroke="#fff" strokeWidth="2">
            <title>
              {labels[index]}：{value.toFixed(1)}
            </title>
          </circle>
          <text x={x(index)} y={height - 5} textAnchor="middle" className="chart-label">
            {labels[index]}
          </text>
        </g>
      ))}
    </svg>
  );
}
export function SubjectBars({ scores }: { scores: Record<string, number> }) {
  return (
    <div className="subject-bars">
      {SUBJECTS.map((subject) => (
        <div key={subject.id}>
          <span>{subject.name}</span>
          <div className="bar-track">
            <i style={{ width: percent(scores[subject.id] / subject.max) }} />
          </div>
          <b>
            {scores[subject.id].toFixed(1)}
            <small>/{subject.max}</small>
          </b>
        </div>
      ))}
    </div>
  );
}
export function TextButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button className="text-button" onClick={onClick}>
      {children}
      <ArrowUpRight size={14} />
    </button>
  );
}
