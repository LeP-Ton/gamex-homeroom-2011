export type Difficulty = 'normal' | 'challenge' | 'hard';
export type ErrorKind = 'concept' | 'method' | 'calculation' | 'reading' | 'state';
export type ActionKind =
  | 'lesson'
  | 'review'
  | 'practice'
  | 'feedback'
  | 'tutor'
  | 'relax'
  | 'meeting'
  | 'talk'
  | 'parent';
export interface TopicConfig {
  id: string;
  name: string;
  difficulty: number;
  weight: number;
  parent: string;
}
export interface SubjectConfig {
  id: string;
  name: string;
  short: string;
  max: number;
  teachable: boolean;
  ability: 'language' | 'logic' | 'memory';
  topics: TopicConfig[];
}
export interface GameSettings {
  teacher: string;
  subject: string;
  className: string;
  difficulty: Difficulty;
  seed: string;
  cutoff: number;
}
export interface Knowledge {
  mastery: number;
  fluency: number;
  forgetting: number;
  practiced: number;
  errors: Record<ErrorKind, number>;
}
export interface Student {
  id: number;
  name: string;
  gender: '男' | '女';
  goal: number;
  personality: '敏感' | '开朗' | '独立' | '谨慎';
  ability: {
    understanding: number;
    memory: number;
    logic: number;
    language: number;
    transfer: number;
    speed: number;
  };
  habits: {
    discipline: number;
    focus: number;
    homework: number;
    participation: number;
    review: number;
    delay: number;
    help: number;
  };
  psyche: {
    confidence: number;
    motivation: number;
    anxiety: number;
    fatigue: number;
    stress: number;
    trust: number;
  };
  family: { support: number; pressure: number; trust: number };
  vision: number;
  friends: number[];
  conflicts: number[];
  relations: Record<number, number>;
  knowledge: Record<string, Record<string, Knowledge>>;
  seatChanged: number;
  lastTalk: number;
  lastParent: number;
  missed: number;
}
export interface Observation {
  id: string;
  day: number;
  studentId: number;
  source: '课堂观察' | '作业批改' | '学生谈话' | '家长反馈' | '教师推测' | '考试分析';
  text: string;
  hypothesis?: string;
}
export interface TeachingAction {
  id: string;
  day: number;
  kind: ActionKind;
  subject: string;
  topic: string;
  targets: number[];
  style?: string;
}
export interface ActionLog {
  day: number;
  text: string;
  kind: string;
  studentId?: number;
}
export interface Assignment {
  id: string;
  day: number;
  subject: string;
  topic: string;
  difficulty: number;
  quantity: number;
  targets: number[];
  graded: boolean;
}
export interface Question {
  prompt: string;
  answer: string;
  wrong: Partial<Record<ErrorKind, string>>;
  kind: 'objective' | 'explanation';
}
export interface Submission {
  id: string;
  assignmentId: string;
  day: number;
  studentId: number;
  completed: number;
  correct: number;
  question: Question;
  answer: string;
  actualCause: ErrorKind | null;
  clue: string;
  diagnosis: ErrorKind | null;
  reviewed: boolean;
  matched: boolean | null;
}
export interface Paper {
  subject: string;
  difficulty: number;
  topicWeights: Record<string, number>;
  type: string;
  sample: Question;
}
export interface ExamScore {
  studentId: number;
  scores: Record<string, number>;
  total: number;
  breakdown: Record<string, { knowledge: number; stateFactor: number; variation: number }>;
}
export interface Exam {
  id: string;
  day: number;
  name: string;
  final: boolean;
  papers: Paper[];
  results: ExamScore[];
}
export interface GameEvent {
  id: string;
  type: string;
  day: number;
  studentId: number;
  otherId?: number;
  title: string;
  text: string;
  resolved: boolean;
  choice?: string;
}
export interface StudyLedger {
  studentId: number;
  budget: number;
  teaching: number;
  homework: number;
  autonomous: number;
  rest: number;
  bySubject: Record<string, number>;
  behavior: string;
}
export interface GainTrace {
  studentId: number;
  subject: string;
  topic: string;
  before: number;
  gain: number;
  minutes: number;
  efficiency: number;
  source: string;
}
export interface DayTrace {
  day: number;
  ledgers: StudyLedger[];
  gains: GainTrace[];
  averageFatigue: number;
  averageStress: number;
  events: number;
}
export interface Ecology {
  atmosphere: number;
  discipline: number;
  mutual: number;
  stress: number;
  trust: number;
  cohesion: number;
}
export interface Game {
  version: 1;
  id: string;
  settings: GameSettings;
  day: number;
  ended: boolean;
  rng: number;
  students: Student[];
  seats: number[];
  resources: { time: number; energy: number };
  actions: TeachingAction[];
  logs: ActionLog[];
  observations: Observation[];
  assignments: Assignment[];
  submissions: Submission[];
  exams: Exam[];
  events: GameEvent[];
  eventCooldowns: Record<string, number>;
  ecology: Ecology;
  traces: DayTrace[];
  debug: boolean;
  nextId: number;
}
export interface Outcome {
  game: Game;
  message: string;
  ok: boolean;
}
export interface RecordEntry {
  id: string;
  seed: string;
  teacher: string;
  className: string;
  difficulty: Difficulty;
  cutoff: number;
  average: number;
  rate: number;
  qualified: number;
  high: number;
  improvement: number;
  debug: false;
}
export type GameCommand =
  | { type: 'teach'; kind: ActionKind; topic?: string; targets?: number[]; style?: string }
  | {
      type: 'assign';
      topic: string;
      difficulty: number;
      quantity: number;
      targets: number[];
      subject?: string;
    }
  | { type: 'diagnose'; submissionId: string; cause: ErrorKind }
  | { type: 'swap'; a: number; b: number }
  | { type: 'event'; eventId: string; choice: number }
  | { type: 'quiz'; difficulty: number }
  | { type: 'advance' };
