import { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FolderOpen,
  Printer,
  Search,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { DESKTOP_APPS, shortGameDate, type BusinessAppId } from '../config/desktop';
import { reportCsv, classAnalysis } from '../sim/analytics';
import type { Game } from '../sim/types';
import { useGame } from '../state/store';
import { downloadText } from '../state/storage';
import { LegacyIcon } from './LegacyIcon';

export interface SheetCommand {
  type: 'ascending' | 'descending' | 'borderline' | 'all' | 'trend';
  token: number;
}
interface Props {
  appId: BusinessAppId;
  game: Game;
  open: (id: BusinessAppId) => void;
  save: () => void;
  settings: () => void;
  newGame: () => void;
  help: () => void;
  close: () => void;
  dataCommand: (type: SheetCommand['type']) => void;
  windowApps?: BusinessAppId[];
}
interface MenuItem {
  label: string;
  action: () => void;
  shortcut?: string;
}

export function ClassicFrame(props: Props) {
  const { appId, game, open } = props;
  const app = DESKTOP_APPS.find((app) => app.id === appId)!;
  const [menu, setMenu] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const notify = useGame((state) => state.notify);
  const exportScores = () =>
    downloadText(
      `${game.settings.className}-2011成绩统计.csv`,
      reportCsv(game),
      'text/csv;charset=utf-8',
    );
  const findStudent = () => {
    if (appId !== 'students' && appId !== 'scores') {
      open('students');
      return;
    }
    const field = document.querySelector<HTMLElement>(
      `.app-window[data-app="${appId}"] .search-box input`,
    );
    field?.focus();
  };
  useEffect(() => {
    // 业务视图有各自的显式字号，整体缩放才能同步改变表格、表单与文档内容。
    document
      .querySelector<HTMLElement>(`.app-window[data-app="${appId}"] .app-content`)
      ?.style.setProperty('zoom', String(zoom / 100));
  });
  useEffect(() => {
    const find = (event: KeyboardEvent) => {
      if (
        event.ctrlKey &&
        event.key.toLowerCase() === 'f' &&
        document.querySelector('.app-window.focused')?.getAttribute('data-app') === appId
      ) {
        event.preventDefault();
        findStudent();
      }
    };
    window.addEventListener('keydown', find);
    return () => window.removeEventListener('keydown', find);
  });
  const copySummary = async () => {
    const stats = classAnalysis(game);
    try {
      await navigator.clipboard.writeText(
        `${game.settings.className} ${shortGameDate(game.day)}\n班级均分：${stats.average}\n参考线上人数：${stats.qualified}/50\n参考线：${game.settings.cutoff}`,
      );
      notify('班级摘要已复制。');
    } catch {
      notify('未能访问剪贴板，可使用文件菜单导出成绩。', true);
    }
  };
  const menus: { label: string; items: MenuItem[] }[] = [
    {
      label: '文件(F)',
      items: [
        { label: '新建班级...', action: props.newGame },
        { label: '打开存档...', action: props.settings, shortcut: 'Ctrl+O' },
        { label: '保存', action: props.save, shortcut: 'Ctrl+S' },
        { label: '另存为...', action: props.settings },
        {
          label: app.kind === 'notepad' ? '导出观察记录...' : '导出成绩表...',
          action:
            app.kind === 'notepad'
              ? () =>
                  downloadText(
                    '班级观察记录.txt',
                    game.observations
                      .map(
                        (observation) =>
                          `[${shortGameDate(observation.day)}] ${game.students.find((student) => student.id === observation.studentId)!.name}（${observation.source}）\n${observation.text}`,
                      )
                      .join('\r\n\r\n'),
                    'text/plain;charset=utf-8',
                  )
              : exportScores,
        },
        { label: '打印...', action: () => window.print(), shortcut: 'Ctrl+P' },
        { label: '关闭', action: props.close },
      ],
    },
    {
      label: '编辑(E)',
      items: [
        { label: '查找学生...', action: findStudent, shortcut: 'Ctrl+F' },
        { label: '复制班级摘要', action: () => void copySummary() },
      ],
    },
    {
      label: app.kind === 'excel' || app.kind === 'word' ? '视图(V)' : '查看(V)',
      items: [
        { label: '教务平台首页', action: () => open('dashboard') },
        { label: '学生档案', action: () => open('students') },
        { label: '班级座位表', action: () => open('seating') },
        { label: '教学日历', action: () => open('calendar') },
      ],
    },
    ...(app.kind === 'excel'
      ? [
          {
            label: '数据(D)',
            items: [
              { label: '按总分升序', action: () => props.dataCommand('ascending') },
              { label: '按总分降序', action: () => props.dataCommand('descending') },
              { label: '筛选本科临界生', action: () => props.dataCommand('borderline') },
              { label: '显示全部学生', action: () => props.dataCommand('all') },
            ],
          },
        ]
      : []),
    {
      label: '工具(T)',
      items: [
        { label: '教学计划...', action: () => open('teaching') },
        { label: '作业布置与批改...', action: () => open('homework') },
        { label: '考试安排...', action: () => open('exams') },
        { label: '存档管理...', action: props.settings },
      ],
    },
    {
      label: '帮助(H)',
      items: [
        { label: '游戏操作说明', action: props.help },
        {
          label: `关于 ${app.software}`,
          action: () => notify(`${app.software} · 2011 年校园电脑界面。当前数据来自本局班级记录。`),
        },
      ],
    },
  ];
  if (app.kind === 'excel' || app.kind === 'word') {
    menus.push(
      {
        label: '插入(I)',
        items: [
          app.kind === 'excel'
            ? { label: '成绩趋势图表...', action: () => props.dataCommand('trend') }
            : { label: '考试安排文档...', action: () => open('exams') },
          { label: '班级观察记录...', action: () => open('observations') },
        ],
      },
      {
        label: '格式(O)',
        items: [
          { label: '放大显示', action: () => setZoom((value) => Math.min(140, value + 10)) },
          { label: '缩小显示', action: () => setZoom((value) => Math.max(80, value - 10)) },
          { label: '标准大小（100%）', action: () => setZoom(100) },
        ],
      },
      {
        label: '窗口(W)',
        items: (props.windowApps ?? [appId]).map((id, index) => ({
          label: `${index + 1} ${DESKTOP_APPS.find((app) => app.id === id)!.file}`,
          action: () => open(id),
        })),
      },
    );
    if (app.kind === 'word')
      menus.push({
        label: '表格(A)',
        items: [
          { label: '学生考试成绩表...', action: () => open('scores') },
          { label: '教室座位表...', action: () => open('seating') },
        ],
      });
    const order = [
      '文件(F)',
      '编辑(E)',
      '视图(V)',
      '插入(I)',
      '格式(O)',
      '工具(T)',
      '数据(D)',
      '表格(A)',
      '窗口(W)',
      '帮助(H)',
    ];
    menus.sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
  }
  const changeZoom = (delta: number) => {
    const next = Math.max(80, Math.min(140, zoom + delta));
    setZoom(next);
  };
  return (
    <div className={`classic-chrome chrome-${app.kind}`}>
      <div className="classic-menubar" role="menubar" aria-label={`${app.title}菜单栏`}>
        {menus.map((item) => (
          <div className="classic-menu" key={item.label}>
            <button
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={menu === item.label}
              className={menu === item.label ? 'active' : ''}
              onClick={() => setMenu(menu === item.label ? null : item.label)}
            >
              {item.label}
            </button>
            {menu === item.label && (
              <>
                <button
                  className="menu-dismiss"
                  aria-label="收起菜单"
                  onClick={() => setMenu(null)}
                />
                <div role="menu" className="classic-menu-popup">
                  {item.items.map((entry) => (
                    <button
                      role="menuitem"
                      key={entry.label}
                      onClick={() => {
                        setMenu(null);
                        entry.action();
                      }}
                    >
                      <span>{entry.label}</span>
                      <small>{entry.shortcut}</small>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
        <span className="menubar-brand">
          {app.kind === 'excel'
            ? 'Excel 2003'
            : app.kind === 'word'
              ? 'Word 2003'
              : app.kind === 'qq'
                ? 'QQ2011'
                : '春山中学'}
        </span>
      </div>
      {app.kind !== 'notepad' && (
        <div className="classic-toolbar">
          {app.kind === 'ie' ? (
            <>
              <button
                disabled={appId === 'dashboard'}
                title="后退到教务首页"
                onClick={() => open('dashboard')}
              >
                <ChevronLeft size={21} />
                后退
              </button>
              <button title="打开学生档案" onClick={() => open('students')}>
                <LegacyIcon name="school" size={22} />
                学生档案
              </button>
              <span className="toolbar-separator" />
              <button title="查找学生" onClick={findStudent}>
                <Search size={19} />
                搜索
              </button>
              <button title="教学日历" onClick={() => open('calendar')}>
                <LegacyIcon name="calendar" size={23} />
                日历
              </button>
            </>
          ) : (
            <>
              <button title="新建班级" onClick={props.newGame}>
                <LegacyIcon name={app.icon} size={22} />
              </button>
              <button title="打开存档" onClick={props.settings}>
                <LegacyIcon name="folder" size={22} />
              </button>
              <button title="保存存档" onClick={props.save}>
                <LegacyIcon name="save" size={22} />
              </button>
              <span className="toolbar-separator" />
              <button title="打印当前文档" onClick={() => window.print()}>
                <Printer size={18} />
              </button>
              <button title="导出成绩表" onClick={exportScores}>
                <Download size={18} />
              </button>
              <span className="toolbar-separator" />
              <button title="复制班级摘要" onClick={() => void copySummary()}>
                <Copy size={17} />
              </button>
              <button title="查找学生" onClick={findStudent}>
                <Search size={18} />
              </button>
            </>
          )}
          <span className="toolbar-separator" />
          <span className="office-font-name">{app.kind === 'word' ? '宋体' : '宋体 / 12'}</span>
          <button title="缩小文档" disabled={zoom <= 80} onClick={() => changeZoom(-10)}>
            <ZoomOut size={16} />
          </button>
          <span className="zoom-display">{zoom}%</span>
          <button title="放大文档" disabled={zoom >= 140} onClick={() => changeZoom(10)}>
            <ZoomIn size={16} />
          </button>
          <button className="toolbar-help" title="帮助" onClick={props.help}>
            <LegacyIcon name="help" size={19} />
          </button>
        </div>
      )}
      {app.kind === 'ie' && (
        <div className="ie-address">
          <span>地址(D)</span>
          <input aria-label="教务内网地址" readOnly value="http://192.168.1.8/jwgl/default.asp" />
          <ChevronDown size={13} />
          <button onClick={() => open('dashboard')}>
            <ChevronRight size={14} />
            转到
          </button>
          <span>链接</span>
        </div>
      )}
      {app.kind === 'word' && (
        <div className="word-ruler" aria-label="文档标尺">
          <span />
          {Array.from({ length: 17 }, (_, index) => (
            <i key={index}>{index || '◂'}</i>
          ))}
          <span />
        </div>
      )}
      {app.kind === 'excel' && (
        <div className="excel-formula">
          <span>A1</span>
          <b>fx</b>
          <input
            aria-label="成绩表内容说明"
            readOnly
            value={`${game.settings.className} 2011届考试成绩统计（成绩只读）`}
          />
        </div>
      )}
    </div>
  );
}
