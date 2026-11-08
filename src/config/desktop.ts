export const GAME_TITLE = '高三班主任模拟器：2011';
export const GAME_YEAR = 2011;
export const gameDate = (day: number) => new Date(Date.UTC(GAME_YEAR, 1, 28 + day - 1));
export const shortGameDate = (day: number) =>
  gameDate(day).toLocaleDateString('zh-CN', { timeZone: 'UTC' });

export type LegacyIconName =
  | 'computer'
  | 'folder'
  | 'recycle'
  | 'ie'
  | 'excel'
  | 'word'
  | 'qq'
  | 'school'
  | 'calendar'
  | 'notepad'
  | 'save'
  | 'help'
  | 'shutdown';
export type SoftwareKind = 'explorer' | 'ie' | 'excel' | 'word' | 'qq' | 'school' | 'notepad';
export const DESKTOP_APPS = [
  {
    id: 'dashboard',
    title: '班级工作台',
    short: '教务管理平台',
    software: 'Windows Internet Explorer',
    file: '春山中学教务管理平台',
    icon: 'ie',
    kind: 'ie',
    group: '学校教务',
  },
  {
    id: 'students',
    title: '学生档案',
    short: '学生信息管理',
    software: '春山中学教务管理系统 V3.1',
    file: '学生档案管理',
    icon: 'school',
    kind: 'school',
    group: '学校教务',
  },
  {
    id: 'seating',
    title: '座位管理',
    short: '班级座位表',
    software: '春山中学教务管理系统 V3.1',
    file: '教室座位编排',
    icon: 'school',
    kind: 'school',
    group: '学校教务',
  },
  {
    id: 'scores',
    title: '成绩分析',
    short: '班级成绩表.xls',
    software: 'Microsoft Excel',
    file: '2011届高三成绩统计.xls',
    icon: 'excel',
    kind: 'excel',
    group: 'Office 文档',
  },
  {
    id: 'homework',
    title: '作业批改',
    short: '作业批改记录',
    software: '春山中学教务管理系统 V3.1',
    file: '作业布置与批改',
    icon: 'school',
    kind: 'school',
    group: '学校教务',
  },
  {
    id: 'exams',
    title: '试卷与考试',
    short: '考试安排.doc',
    software: 'Microsoft Word',
    file: '2011届高三考试安排.doc',
    icon: 'word',
    kind: 'word',
    group: 'Office 文档',
  },
  {
    id: 'teaching',
    title: '教学计划',
    short: '教学计划.doc',
    software: 'Microsoft Word',
    file: '高三教学计划.doc',
    icon: 'word',
    kind: 'word',
    group: 'Office 文档',
  },
  {
    id: 'talk',
    title: '学生谈话',
    short: '学生谈话记录',
    software: '腾讯 QQ 2011',
    file: '师生联系',
    icon: 'qq',
    kind: 'qq',
    group: '通讯与记录',
  },
  {
    id: 'parents',
    title: '家校沟通',
    short: '腾讯 QQ',
    software: '腾讯 QQ 2011',
    file: '家校联系',
    icon: 'qq',
    kind: 'qq',
    group: '通讯与记录',
  },
  {
    id: 'observations',
    title: '班级观察',
    short: '班级观察.txt',
    software: '记事本',
    file: '班级观察记录.txt',
    icon: 'notepad',
    kind: 'notepad',
    group: '通讯与记录',
  },
  {
    id: 'calendar',
    title: '教学日历',
    short: '教学日历',
    software: '春山中学教务管理系统 V3.1',
    file: '2011届教学日历',
    icon: 'calendar',
    kind: 'school',
    group: '学校教务',
  },
  {
    id: 'report',
    title: '高考成绩报告',
    short: '高考成绩报告.doc',
    software: 'Microsoft Word',
    file: '2011届高考成绩报告.doc',
    icon: 'word',
    kind: 'word',
    group: 'Office 文档',
  },
] as const;
export type BusinessAppId = (typeof DESKTOP_APPS)[number]['id'];
