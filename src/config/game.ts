import type { ActionKind, ClassTrack, Difficulty, ErrorKind, SubjectConfig } from '../sim/types';

const topics = (subject: string, group: string, names: string[]) =>
  names.map((name, index) => ({
    id: `${subject}-${index}`,
    name,
    parent: group,
    difficulty: 0.32 + index * 0.065,
    weight: index === names.length - 1 ? 1.25 : 1,
  }));
export const SCIENCE_SUBJECTS: SubjectConfig[] = [
  {
    id: 'chinese',
    name: '语文',
    short: '语',
    max: 150,
    teachable: true,
    ability: 'language',
    topics: topics('chinese', '语言与表达', [
      '现代文阅读',
      '文言文阅读',
      '古诗词鉴赏',
      '语言文字运用',
      '作文构思',
      '议论文写作',
    ]),
  },
  {
    id: 'math',
    name: '数学',
    short: '数',
    max: 150,
    teachable: true,
    ability: 'logic',
    topics: topics('math', '数学核心知识', [
      '集合与逻辑',
      '函数',
      '三角函数',
      '数列',
      '立体几何',
      '解析几何',
      '概率与统计',
      '导数',
    ]),
  },
  {
    id: 'english',
    name: '英语',
    short: '英',
    max: 150,
    teachable: true,
    ability: 'language',
    topics: topics('english', '语言综合能力', [
      '词汇与语法',
      '阅读理解',
      '完形填空',
      '听力',
      '应用文写作',
      '读后续写',
    ]),
  },
  {
    id: 'physics',
    name: '物理',
    short: '物',
    max: 100,
    teachable: false,
    ability: 'logic',
    topics: topics('physics', '物理规律', ['运动与力', '能量与动量', '电磁场', '电路与实验']),
  },
  {
    id: 'chemistry',
    name: '化学',
    short: '化',
    max: 100,
    teachable: false,
    ability: 'memory',
    topics: topics('chemistry', '物质与变化', ['物质结构', '反应原理', '有机化学', '化学实验']),
  },
  {
    id: 'biology',
    name: '生物',
    short: '生',
    max: 100,
    teachable: false,
    ability: 'memory',
    topics: topics('biology', '生命科学', ['细胞与代谢', '遗传与进化', '稳态与调节', '生态系统']),
  },
];
export const ARTS_SUBJECTS: SubjectConfig[] = [
  ...SCIENCE_SUBJECTS.slice(0, 3),
  {
    id: 'politics',
    name: '政治',
    short: '政',
    max: 100,
    teachable: false,
    ability: 'memory',
    topics: topics('politics', '思想政治', ['经济生活', '政治生活', '文化生活', '生活与哲学']),
  },
  {
    id: 'history',
    name: '历史',
    short: '史',
    max: 100,
    teachable: false,
    ability: 'memory',
    topics: topics('history', '历史脉络', [
      '古代中国政治',
      '近代中国探索',
      '世界近代变革',
      '当代世界格局',
    ]),
  },
  {
    id: 'geography',
    name: '地理',
    short: '地',
    max: 100,
    teachable: false,
    ability: 'logic',
    topics: topics('geography', '地理环境', ['地球运动', '自然环境', '区位因素', '区域发展']),
  },
];
// 全学科字典只用于查找；整局遍历必须取本局科类，防止把九科同时加入模拟。
export const ALL_SUBJECTS = [...SCIENCE_SUBJECTS, ...ARTS_SUBJECTS.slice(3)];
export const SUBJECT_MAP = Object.fromEntries(ALL_SUBJECTS.map((subject) => [subject.id, subject]));
export const CLASS_TRACKS = {
  science: { name: '理科班', subjects: SCIENCE_SUBJECTS },
  arts: { name: '文科班', subjects: ARTS_SUBJECTS },
} satisfies Record<ClassTrack, { name: string; subjects: SubjectConfig[] }>;
export function isClassTrack(value: unknown): value is ClassTrack {
  return value === 'science' || value === 'arts';
}
export function getSubjects(settings: { track?: ClassTrack }) {
  return CLASS_TRACKS[settings.track ?? 'science'].subjects;
}
export function getTrackName(settings: { track?: ClassTrack }) {
  return CLASS_TRACKS[settings.track ?? 'science'].name;
}
export const TOTAL_MAX = SCIENCE_SUBJECTS.reduce((sum, subject) => sum + subject.max, 0);
export const GAME_DAYS = 100;
export const CLASS_SIZE = 50;
export const STUDY_MINUTES = 240;
export const EXAM_CALENDAR = [
  { day: 25, name: '阶段月考', difficulty: 0.49 },
  { day: 50, name: '第一次模拟考', difficulty: 0.53 },
  { day: 75, name: '第二次模拟考', difficulty: 0.57 },
  { day: 100, name: '高考', difficulty: 0.55 },
];
export const DIFFICULTIES: Record<
  Difficulty,
  {
    name: string;
    description: string;
    base: number;
    spread: number;
    time: number;
    energy: number;
    support: number;
  }
> = {
  normal: {
    name: '普通',
    description: '基础较稳，留出更多观察与尝试的空间。',
    base: 0.58,
    spread: 0.2,
    time: 180,
    energy: 100,
    support: 0.68,
  },
  challenge: {
    name: '挑战',
    description: '个体差异明显，有限资源需要更细致的取舍。',
    base: 0.53,
    spread: 0.28,
    time: 150,
    energy: 90,
    support: 0.53,
  },
  hard: {
    name: '困难',
    description: '基础薄弱与复杂状态并存，每次决策都很重要。',
    base: 0.47,
    spread: 0.3,
    time: 120,
    energy: 80,
    support: 0.42,
  },
};
export const ACTIONS: Record<
  ActionKind,
  { name: string; time: number; energy: number; minutes: number; rate: number; hint: string }
> = {
  lesson: {
    name: '知识点讲解',
    time: 45,
    energy: 22,
    minutes: 30,
    rate: 1.15,
    hint: '适合概念薄弱者；基础越扎实，额外收益越小。',
  },
  review: {
    name: '复习巩固',
    time: 30,
    energy: 16,
    minutes: 22,
    rate: 0.95,
    hint: '巩固熟练度与记忆，减少长期遗忘。',
  },
  practice: {
    name: '分层练习',
    time: 40,
    energy: 20,
    minutes: 28,
    rate: 1.05,
    hint: '根据个体基础匹配练习，更适合方法训练。',
  },
  feedback: {
    name: '典型错题讲评',
    time: 35,
    energy: 18,
    minutes: 24,
    rate: 1.1,
    hint: '正确诊断过的错误能得到更有针对性的讲评。',
  },
  tutor: {
    name: '个别辅导',
    time: 30,
    energy: 20,
    minutes: 24,
    rate: 1.65,
    hint: '最多 3 人；效率较高，但占用大量教师时间。',
  },
  relax: {
    name: '考前心理疏导',
    time: 30,
    energy: 15,
    minutes: 0,
    rate: 0,
    hint: '减少压力并付出学习时间成本，反复使用有冷却。',
  },
  meeting: {
    name: '主题班会',
    time: 35,
    energy: 18,
    minutes: 0,
    rate: 0,
    hint: '在纪律、互助与休整之间选择，效果随班级状态变化。',
  },
  talk: {
    name: '学生谈话',
    time: 20,
    energy: 12,
    minutes: 0,
    rate: 0,
    hint: '每位学生间隔 3 天；方式与个性会影响反馈。',
  },
  parent: {
    name: '家校沟通',
    time: 20,
    energy: 10,
    minutes: 0,
    rate: 0,
    hint: '每个家庭间隔 5 天；家长反馈仅作为一条线索。',
  },
};
export const TALK_STYLES = [
  '鼓励',
  '严肃提醒',
  '分析学习问题',
  '倾听困难',
  '制定学习计划',
  '缓解焦虑',
];
export const PARENT_STYLES = ['共同支持', '反馈进步', '协调作息', '强调要求'];
export const MEETING_STYLES = ['互助班会', '纪律提醒', '放松休整'];
export const ERROR_LABELS: Record<ErrorKind, string> = {
  concept: '知识概念不清',
  method: '解题方法不当',
  calculation: '计算或操作失误',
  reading: '审题偏差',
  state: '疲劳或注意力影响',
};
export const EVENT_CONFIG = [
  {
    id: 'missed',
    name: '作业连续未完成',
    cooldown: 8,
    probability: 0.42,
    choices: ['一起制定可完成的小目标', '严肃要求补齐作业'],
  },
  {
    id: 'fatigue',
    name: '家长反映最近熬夜',
    cooldown: 10,
    probability: 0.32,
    choices: ['协调作息并减少额外任务', '请家长加强督促'],
  },
  {
    id: 'conflict',
    name: '邻座之间有些摩擦',
    cooldown: 12,
    probability: 0.18,
    choices: ['分别倾听，约定相处边界', '要求立即停止争执'],
  },
  {
    id: 'help',
    name: '学生发起互助邀请',
    cooldown: 14,
    probability: 0.22,
    choices: ['支持自愿互助并控制时长', '先保持各自复习节奏'],
  },
  {
    id: 'anxiety',
    name: '考试之后的一封留言',
    cooldown: 10,
    probability: 0.35,
    choices: ['陪他拆解目标，允许短暂休整', '强调下次考试的重要性'],
  },
  {
    id: 'seat',
    name: '一份调座位申请',
    cooldown: 16,
    probability: 0.2,
    choices: ['记录需要，安排跟进观察', '说明当前安排，请先适应'],
  },
];
export const SURNAMES =
  '陈 林 李 王 张 刘 黄 赵 吴 周 徐 孙 朱 马 胡 郭 何 高 罗 郑 梁 谢 宋 唐 许 韩 冯 邓 曹 彭 曾 肖 田 董 袁 潘'.split(
    ' ',
  );
export const GIVEN_NAMES =
  '知远 予安 书宁 明轩 若溪 亦辰 沐晴 子衿 景行 一诺 语桐 怀瑾 星河 念初 清和 以宁 嘉树 映雪 望舒 安然 予墨 云舟 听澜 时雨 思齐 乐言 亦可 文博 诗涵 泽宇 佳宁 书航 瑾瑜 昕悦 砚秋 修远 语棠 致远 之恒 知夏 沐言 简宁 梓涵 安禾 向晚 乔木 星野 逸凡 晨曦 元初'.split(
    ' ',
  );
