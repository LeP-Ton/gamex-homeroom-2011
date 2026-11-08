import { LegacyIcon, WindowsFlag, ClassicGlyph } from './LegacyIcon';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import {
  DESKTOP_APPS,
  GAME_TITLE,
  shortGameDate,
  type BusinessAppId,
  type LegacyIconName,
} from '../config/desktop';
import { DIFFICULTIES, EXAM_CALENDAR } from '../config/game';
import { DEFAULT_SETTINGS } from '../sim/generate';
import type { GameSettings } from '../sim/types';
import { useGame } from '../state/store';
import { listSaves, loadGame } from '../state/storage';
import { Dashboard } from './Dashboard';
import { StudentsApp, ScoresApp, ObservationsApp } from './StudentApps';
import { HomeworkApp, SeatingApp, TeachingApp } from './LearningApps';
import { CalendarApp, ExamsApp, ReportApp } from './SupportApps';
import { ConversationApp } from './ClassicChat';
import { DebugPanel } from './DebugPanel';
import { Modal, NewGame, SaveManager } from './Settings';
import { ClassicFrame, type SheetCommand } from './ClassicFrame';
import { FileExplorer } from './FileExplorer';
import { TrayBalloon } from './TrayBalloon';

type WindowId = BusinessAppId | 'computer' | 'recycle';
interface AppWindow {
  id: WindowId;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  minimized: boolean;
  maximized: boolean;
  studentId?: number;
  folder?: string;
  selectionKey?: number;
}
interface Shortcut {
  id: string;
  app: WindowId;
  label: string;
  icon: LegacyIconName;
  folder?: string;
}
const SHORTCUTS: Shortcut[] = [
  { id: 'computer', app: 'computer', label: '我的电脑', icon: 'computer' },
  { id: 'documents', app: 'computer', label: '我的文档', icon: 'documents', folder: '我的文档' },
  { id: 'recycle', app: 'recycle', label: '回收站', icon: 'recycle' },
  { id: 'dashboard', app: 'dashboard', label: 'Internet Explorer', icon: 'ie' },
  { id: 'parents', app: 'parents', label: '腾讯 QQ', icon: 'qq' },
  { id: 'scores', app: 'scores', label: '班级成绩表.xls', icon: 'excel' },
  { id: 'teaching', app: 'teaching', label: '教学计划.doc', icon: 'word' },
  { id: 'students', app: 'students', label: '学生信息管理', icon: 'users' },
  { id: 'seating', app: 'seating', label: '班级座位表', icon: 'seating' },
  { id: 'homework', app: 'homework', label: '作业批改系统', icon: 'homework' },
  { id: 'observations', app: 'observations', label: '班级观察.txt', icon: 'notepad' },
];
const windowInfo = (id: WindowId) =>
  id === 'computer'
    ? {
        title: '我的电脑',
        short: '我的电脑',
        icon: 'computer' as const,
        kind: 'explorer',
        file: '我的电脑',
        software: 'Windows 资源管理器',
      }
    : id === 'recycle'
      ? {
          title: '回收站',
          short: '回收站',
          icon: 'recycle' as const,
          kind: 'explorer',
          file: '回收站',
          software: 'Windows 资源管理器',
        }
      : DESKTOP_APPS.find((app) => app.id === id)!;
const defaultSize = () => ({
  x: window.innerWidth < 950 ? 90 : 184,
  y: 38,
  w: Math.max(350, Math.min(1120, window.innerWidth - (window.innerWidth < 950 ? 110 : 330))),
  h: Math.max(390, window.innerHeight - 115),
});
function readPreference<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function Desktop() {
  const taskbarRef = useRef<HTMLElement>(null);
  const notificationsRef = useRef<HTMLButtonElement>(null);
  const { game, start, restore, dispatch, notice, notify, saved, save } = useGame();
  const [windows, setWindows] = useState<AppWindow[]>([
    { id: 'dashboard', ...defaultSize(), z: 1, minimized: false, maximized: false },
  ]);
  const [modal, setModal] = useState<
    'new' | 'save' | 'help' | 'debug' | 'end' | 'display' | 'run' | null
  >(null);
  const [initialSettings, setInitialSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [booting, setBooting] = useState(true);
  const [launcher, setLauncher] = useState(false);
  const [allPrograms, setAllPrograms] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [locked, setLocked] = useState(false);
  const [selectedShortcut, setSelectedShortcut] = useState<string | null>(null);
  const [context, setContext] = useState<{ x: number; y: number; shortcut?: string } | null>(null);
  const [trash, setTrash] = useState<string[]>(() =>
    readPreference('gamex-2011-shortcut-trash', []),
  );
  const [theme, setTheme] = useState<string>(() => readPreference('gamex-2011-theme', 'blue'));
  const [wallpaper, setWallpaper] = useState<string>(() =>
    readPreference('gamex-2011-wallpaper', 'grass'),
  );
  const [sortNames, setSortNames] = useState(false);
  const [runValue, setRunValue] = useState('');
  const [sheetCommand, setSheetCommand] = useState<SheetCommand>();
  const [propertiesTab, setPropertiesTab] = useState<'theme' | 'desktop' | 'appearance'>('desktop');
  const [recentApps, setRecentApps] = useState<BusinessAppId[]>(() => {
    const value = readPreference<unknown>('gamex-2011-recent-documents', []);
    return Array.isArray(value)
      ? value.filter((id) => DESKTOP_APPS.some((app) => app.id === id)).slice(0, 10)
      : [];
  });
  useEffect(() => {
    try {
      localStorage.setItem('gamex-2011-recent-documents', JSON.stringify(recentApps));
    } catch {
      /* 最近文档只影响界面导航。 */
    }
  }, [recentApps]);
  const zIndex = useRef(5);
  useEffect(() => {
    let active = true;
    listSaves()
      .then(async (slots) => {
        if (slots.some((slot) => slot.slot === 'auto')) {
          const loaded = await loadGame('auto');
          if (active) restore(loaded);
        } else if (active) setModal('new');
      })
      .catch((error) => {
        if (active) {
          notify(String(error), true);
          setModal('new');
        }
      })
      .finally(() => {
        if (active) setBooting(false);
      });
    return () => {
      active = false;
    };
  }, [restore, notify]);
  useEffect(() => {
    try {
      localStorage.setItem('gamex-2011-shortcut-trash', JSON.stringify(trash));
      localStorage.setItem('gamex-2011-theme', JSON.stringify(theme));
      localStorage.setItem('gamex-2011-wallpaper', JSON.stringify(wallpaper));
    } catch {
      /* 界面偏好不可用时，仍可继续游戏与使用文件存档。 */
    }
  }, [trash, theme, wallpaper]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => useGame.getState().clearNotice(), notice.error ? 6500 : 4200);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (game?.ended) open('report');
  }, [game?.ended]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setModal(null);
        setLauncher(false);
        setContext(null);
        setNotifications(false);
      }
      if ((event.ctrlKey || event.metaKey) && ['s', 'o'].includes(event.key.toLowerCase())) {
        event.preventDefault();
        if (event.key.toLowerCase() === 's')
          void save().then((ok) => {
            if (ok) notify('当前进度已保存。');
          });
        else setModal('save');
      }
      if (event.key === 'F1') {
        event.preventDefault();
        setModal('help');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save, notify]);
  function focus(id: WindowId) {
    setWindows((current) =>
      current.map((win) =>
        win.id === id ? { ...win, minimized: false, z: ++zIndex.current } : win,
      ),
    );
  }
  function open(id: WindowId, studentId?: number, folder?: string) {
    const initial = defaultSize();
    if (id !== 'computer' && id !== 'recycle')
      setRecentApps((current) => [id, ...current.filter((item) => item !== id)].slice(0, 10));
    setLauncher(false);
    setContext(null);
    setSelectedShortcut(null);
    setWindows((current) =>
      current.some((win) => win.id === id)
        ? current.map((win) =>
            win.id === id
              ? {
                  ...win,
                  minimized: false,
                  studentId: studentId ?? win.studentId,
                  folder: folder ?? win.folder,
                  selectionKey:
                    studentId || folder ? (win.selectionKey ?? 0) + 1 : win.selectionKey,
                  z: ++zIndex.current,
                }
              : win,
          )
        : [
            ...current,
            {
              id,
              ...initial,
              // 窄桌面级联打开时保留标题栏右侧按钮，避免新图标落到屏幕外。
              x: Math.min(
                initial.x + (current.length % 4) * 18,
                Math.max(0, window.innerWidth - initial.w - 4),
              ),
              y: 38 + (current.length % 4) * 18,
              h: initial.h - (current.length % 4) * 18,
              z: ++zIndex.current,
              minimized: false,
              maximized: window.innerWidth < 720,
              studentId,
              folder,
            },
          ],
    );
  }
  function updateWindow(id: WindowId, values: Partial<AppWindow>) {
    setWindows((current) => current.map((win) => (win.id === id ? { ...win, ...values } : win)));
  }
  function closeWindow(id: WindowId) {
    setWindows((current) => current.filter((win) => win.id !== id));
  }
  function move(id: WindowId, event: PointerEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest('button')) return;
    const win = windows.find((win) => win.id === id)!;
    if (win.maximized) return;
    focus(id);
    const x = event.clientX;
    const y = event.clientY;
    const titlebar = event.currentTarget;
    titlebar.setPointerCapture(event.pointerId);
    const onMove = (pointer: globalThis.PointerEvent) =>
      updateWindow(id, {
        x: Math.max(0, Math.min(window.innerWidth - 160, win.x + pointer.clientX - x)),
        y: Math.max(0, Math.min(window.innerHeight - 70, win.y + pointer.clientY - y)),
      });
    const stop = () => {
      titlebar.removeEventListener('pointermove', onMove);
      titlebar.removeEventListener('pointerup', stop);
      titlebar.removeEventListener('pointercancel', stop);
    };
    titlebar.addEventListener('pointermove', onMove);
    titlebar.addEventListener('pointerup', stop, { once: true });
    titlebar.addEventListener('pointercancel', stop, { once: true });
  }
  function newGame(same = false) {
    setInitialSettings(
      game
        ? {
            ...game.settings,
            seed: same ? game.settings.seed : `春山2011-${Date.now().toString(36).slice(-5)}`,
          }
        : DEFAULT_SETTINGS,
    );
    setModal('new');
  }
  function startGame(settings: GameSettings) {
    start(settings);
    setLocked(false);
    setWindows([
      {
        id: 'dashboard',
        ...defaultSize(),
        z: ++zIndex.current,
        minimized: false,
        maximized: window.innerWidth < 720,
      },
    ]);
    setModal(null);
  }
  function saveNow() {
    void save().then((ok) => {
      if (ok) notify('当前进度已保存。');
    });
  }
  function runProgram() {
    const command = runValue.trim().toLowerCase();
    const commands: Record<string, WindowId> = {
      explorer: 'computer',
      我的电脑: 'computer',
      iexplore: 'dashboard',
      excel: 'scores',
      winword: 'teaching',
      qq: 'parents',
      notepad: 'observations',
      学生档案: 'students',
      座位管理: 'seating',
    };
    if (commands[command]) {
      setModal(null);
      open(commands[command]);
    } else notify('找不到该程序。可输入 explorer、iexplore、excel、winword、qq 或 notepad。', true);
  }
  const pending = game?.events.filter((event) => !event.resolved).length ?? 0;
  const activeId = windows.filter((win) => !win.minimized).sort((a, b) => b.z - a.z)[0]?.id;
  const shortcuts = SHORTCUTS.filter((shortcut) => !trash.includes(shortcut.id)).sort((a, b) =>
    sortNames ? a.label.localeCompare(b.label, 'zh-CN') : 0,
  );
  const currentMinutes = game
    ? 16 * 60 + DIFFICULTIES[game.settings.difficulty].time - game.resources.time
    : 16 * 60;
  const timeText = `${Math.floor(currentMinutes / 60)}:${String(currentMinutes % 60).padStart(2, '0')}`;
  const renderApp = (win: AppWindow) => {
    if (!game) return null;
    switch (win.id) {
      case 'dashboard':
        return <Dashboard game={game} open={open} />;
      case 'students':
        return <StudentsApp game={game} selectedId={win.studentId} open={open} />;
      case 'scores':
        return <ScoresApp game={game} open={open} command={sheetCommand} />;
      case 'seating':
        return <SeatingApp game={game} open={open} />;
      case 'homework':
        return <HomeworkApp game={game} open={open} />;
      case 'teaching':
        return <TeachingApp game={game} selectedId={win.studentId} />;
      case 'exams':
        return <ExamsApp game={game} open={open} />;
      case 'talk':
        return <ConversationApp game={game} selectedId={win.studentId} open={open} />;
      case 'parents':
        return <ConversationApp game={game} selectedId={win.studentId} parents open={open} />;
      case 'observations':
        return <ObservationsApp game={game} open={open} />;
      case 'calendar':
        return <CalendarApp game={game} />;
      case 'report':
        return <ReportApp game={game} replay={() => newGame(true)} newGame={() => newGame()} />;
      case 'computer':
        return (
          <FileExplorer
            recentApps={recentApps}
            game={game}
            initialFolder={win.folder}
            open={open}
            save={saveNow}
            settings={() => setModal('save')}
          />
        );
      case 'recycle':
        return (
          <div className="recycle-view">
            <div className="explorer-menu">
              <button disabled={!trash.length} onClick={() => setTrash([])}>
                还原所有快捷方式
              </button>
              <span>仅存放桌面快捷方式，班级资料不会被删除。</span>
            </div>
            {trash.length ? (
              trash.map((id) => {
                const shortcut = SHORTCUTS.find((shortcut) => shortcut.id === id);
                return (
                  shortcut && (
                    <div className="recycle-item" key={id}>
                      <LegacyIcon name={shortcut.icon} />
                      <strong>{shortcut.label}</strong>
                      <span>原位置：桌面</span>
                      <button
                        className="button"
                        onClick={() => setTrash((current) => current.filter((item) => item !== id))}
                      >
                        还原
                      </button>
                    </div>
                  )
                );
              })
            ) : (
              <div className="recycle-empty">
                <LegacyIcon name="recycle" size={64} />
                <p>回收站为空。</p>
              </div>
            )}
          </div>
        );
    }
  };
  return (
    <div className={`desktop era-2011 xp-${theme} wallpaper-${wallpaper}`}>
      <div
        className="desktop-space"
        onClick={() => {
          setSelectedShortcut(null);
          setContext(null);
          setLauncher(false);
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          setContext({
            x: Math.min(event.clientX, window.innerWidth - 210),
            y: Math.min(event.clientY, window.innerHeight - 210),
          });
        }}
      >
        <div className="xp-wallpaper" />
        <div className="desktop-watermark">
          <span>GameX</span>
          <h1>
            高三班主任模拟器<span>：2011</span>
          </h1>
          <p>春山中学 · 2011届高三年级组</p>
        </div>
        {game && (
          <div className="desktop-countdown">
            <strong>
              距离高考还有 <b>{game.ended ? 0 : 101 - game.day}</b> 天
            </strong>
            <span>
              {shortGameDate(game.day)}　{game.settings.className}
            </span>
          </div>
        )}
      </div>
      <nav className="desktop-icons" aria-label="桌面应用">
        {shortcuts.map((shortcut) => (
          <button
            key={shortcut.id}
            className={selectedShortcut === shortcut.id ? 'selected' : ''}
            onClick={() => {
              setSelectedShortcut(shortcut.id);
              setLauncher(false);
              setContext(null);
            }}
            onDoubleClick={() => open(shortcut.app, undefined, shortcut.folder)}
            onContextMenu={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setSelectedShortcut(shortcut.id);
              setContext({
                x: Math.min(event.clientX, window.innerWidth - 210),
                y: Math.min(event.clientY, window.innerHeight - 160),
                shortcut: shortcut.id,
              });
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') open(shortcut.app, undefined, shortcut.folder);
              if (event.key === 'Delete' && shortcut.id !== 'recycle')
                setTrash((current) => [...new Set([...current, shortcut.id])]);
            }}
            title={`双击打开${shortcut.label}`}
          >
            <LegacyIcon
              name={shortcut.id === 'recycle' && trash.length ? 'recycle-full' : shortcut.icon}
              size={32}
              shortcut={['parents', 'students', 'seating', 'homework'].includes(shortcut.id)}
            />
            <span>{shortcut.label}</span>
          </button>
        ))}
      </nav>
      <main className="windows-area">
        {game &&
          windows.map((win) => {
            const app = windowInfo(win.id);
            return (
              <section
                key={win.id}
                aria-label={app.title}
                data-app={win.id}
                className={`app-window software-${app.kind} ${activeId === win.id ? 'focused' : ''} ${win.maximized ? 'maximized' : ''}`}
                style={{
                  display: win.minimized ? 'none' : undefined,
                  left: win.maximized ? 0 : win.x,
                  top: win.maximized ? 0 : win.y,
                  width: win.maximized ? '100vw' : win.w,
                  height: win.maximized ? 'calc(100dvh - 31px)' : win.h,
                  zIndex: win.z,
                }}
                onPointerDown={() => {
                  if (activeId !== win.id) focus(win.id);
                }}
                onPointerUp={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  if (
                    !win.maximized &&
                    (Math.abs(rect.width - win.w) > 2 || Math.abs(rect.height - win.h) > 2)
                  )
                    updateWindow(win.id, { w: rect.width, h: rect.height });
                }}
              >
                <header
                  className="window-titlebar"
                  onPointerDown={(event) => move(win.id, event)}
                  onDoubleClick={(event) => {
                    if (!(event.target as HTMLElement).closest('button'))
                      updateWindow(win.id, { maximized: !win.maximized });
                  }}
                >
                  <div>
                    <LegacyIcon
                      name={win.id === 'recycle' && trash.length ? 'recycle-full' : app.icon}
                      size={16}
                    />
                    <strong>
                      {app.file}
                      {!['computer', 'recycle'].includes(win.id) ? ` - ${app.software}` : ''}
                    </strong>
                  </div>
                  <div className="window-controls">
                    <button
                      aria-label={`最小化${app.title}`}
                      title="最小化"
                      onClick={() => updateWindow(win.id, { minimized: true })}
                    >
                      <ClassicGlyph name="minimize" size={13} />
                    </button>
                    <button
                      aria-label={`缩放${app.title}`}
                      title={win.maximized ? '向下还原' : '最大化'}
                      onClick={() => updateWindow(win.id, { maximized: !win.maximized })}
                    >
                      {win.maximized ? (
                        <ClassicGlyph name="restore" size={12} />
                      ) : (
                        <ClassicGlyph name="maximize" size={11} />
                      )}
                    </button>
                    <button
                      aria-label={`关闭${app.title}`}
                      title="关闭"
                      onClick={() => closeWindow(win.id)}
                    >
                      <ClassicGlyph name="close" size={14} />
                    </button>
                  </div>
                </header>
                {!['computer', 'recycle'].includes(win.id) && (
                  <ClassicFrame
                    appId={win.id as BusinessAppId}
                    windowApps={windows
                      .filter((win) => win.id !== 'computer' && win.id !== 'recycle')
                      .map((win) => win.id as BusinessAppId)}
                    game={game}
                    open={open}
                    save={saveNow}
                    settings={() => setModal('save')}
                    newGame={() => newGame()}
                    help={() => setModal('help')}
                    close={() => closeWindow(win.id)}
                    dataCommand={(type) => setSheetCommand({ type, token: Date.now() })}
                  />
                )}
                <div className="window-layout">
                  <div
                    className="app-content"
                    key={`${game.id}-${win.id}-${win.selectionKey ?? 0}`}
                  >
                    {app.kind === 'word' ? (
                      <article className="word-document">{renderApp(win)}</article>
                    ) : (
                      renderApp(win)
                    )}
                  </div>
                </div>
                <footer className="window-statusbar">
                  <span>
                    {game.ended ? '高考成绩已归档' : '就绪'}
                    <i />
                    50 名学生
                    <i />
                    教学日 {game.day}/100
                  </span>
                  <span>
                    {saved ? '本地存档可用' : '本地班级资料'}
                    <i />
                    {game.resources.time} 分钟 / {game.resources.energy} 精力
                  </span>
                </footer>
              </section>
            );
          })}
      </main>
      {context && (
        <div className="desktop-context" role="menu" style={{ left: context.x, top: context.y }}>
          {context.shortcut ? (
            <>
              <button
                role="menuitem"
                onClick={() => {
                  const shortcut = SHORTCUTS.find((item) => item.id === context.shortcut)!;
                  open(shortcut.app, undefined, shortcut.folder);
                }}
              >
                打开(O)
              </button>
              <button
                role="menuitem"
                disabled={context.shortcut === 'recycle'}
                onClick={() => {
                  setTrash((current) => [...new Set([...current, context.shortcut!])]);
                  setContext(null);
                }}
              >
                删除快捷方式(D)
              </button>
            </>
          ) : (
            <>
              <button
                role="menuitem"
                onClick={() => {
                  setSortNames(!sortNames);
                  setContext(null);
                }}
              >
                按名称排列图标(N)
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  setSelectedShortcut(null);
                  setContext(null);
                }}
              >
                刷新(E)
              </button>
              <hr />
              <button
                role="menuitem"
                onClick={() => {
                  setWindows((current) => current.map((win) => ({ ...win, minimized: true })));
                  setContext(null);
                }}
              >
                显示桌面
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  setContext(null);
                  newGame();
                }}
              >
                新建班级...
              </button>
              <hr />
              <button
                role="menuitem"
                onClick={() => {
                  setContext(null);
                  setModal('display');
                }}
              >
                属性(R)
              </button>
            </>
          )}
        </div>
      )}
      {launcher && (
        <div className="launcher xp-start-menu">
          <header>
            <span className="start-user-icon">
              <LegacyIcon name="user-portrait" size={32} />
            </span>
            <strong>{game?.settings.teacher ?? '春山中学'}</strong>
          </header>
          <div className="start-menu-columns">
            <div className="start-programs">
              {(allPrograms
                ? DESKTOP_APPS
                : DESKTOP_APPS.filter((app) =>
                    ['dashboard', 'parents', 'scores', 'teaching', 'students', 'homework'].includes(
                      app.id,
                    ),
                  )
              ).map((app) => (
                <button key={app.id} onClick={() => open(app.id)}>
                  <LegacyIcon name={app.icon} size={32} />
                  <span>
                    <strong>{app.short}</strong>
                    <small>{app.software}</small>
                  </span>
                </button>
              ))}
              <button className="all-programs-button" onClick={() => setAllPrograms(!allPrograms)}>
                {allPrograms ? '返回常用程序' : '所有程序'}
                <ClassicGlyph name="right" size={17} />
              </button>
            </div>
            <div className="start-places">
              <button onClick={() => open('computer', undefined, '我的文档')}>
                <LegacyIcon name="documents" size={16} />
                我的文档
              </button>
              <button onClick={() => open('computer', undefined, '最近的文档')}>
                <LegacyIcon name="recent" size={16} />
                最近的文档
              </button>
              <button onClick={() => open('computer')}>
                <LegacyIcon name="computer" size={16} />
                我的电脑
              </button>
              <hr />
              <button
                onClick={() => {
                  setLauncher(false);
                  setModal('display');
                }}
              >
                <LegacyIcon name="display" size={16} />
                显示属性
              </button>
              <button
                onClick={() => {
                  setLauncher(false);
                  setModal('save');
                }}
              >
                <LegacyIcon name="drive" size={16} />
                游戏存档管理
              </button>
              <button
                onClick={() => {
                  setLauncher(false);
                  setModal('help');
                }}
              >
                <LegacyIcon name="help" size={16} />
                帮助和支持
              </button>
              <button
                onClick={() => {
                  setLauncher(false);
                  setModal('run');
                }}
              >
                <LegacyIcon name="run" size={16} />
                运行(R)...
              </button>
              <hr />
              <button
                disabled={!game}
                onClick={() => {
                  setLauncher(false);
                  setModal('debug');
                }}
              >
                <LegacyIcon name="settings" size={16} />
                开发者实验室
              </button>
            </div>
          </div>
          <footer>
            <button
              disabled={!game}
              onClick={() => {
                setLauncher(false);
                void save().then((ok) => {
                  if (ok) setLocked(true);
                });
              }}
            >
              <LegacyIcon name="logoff" size={32} />
              注销
            </button>
            <button
              disabled={!game || game.ended}
              onClick={() => {
                setLauncher(false);
                setModal('end');
              }}
            >
              <LegacyIcon name="shutdown" size={32} />
              关闭计算机
            </button>
          </footer>
        </div>
      )}
      {notifications && (
        <TrayBalloon
          id="qq-message-panel"
          title="QQ 消息提醒"
          icon="qq"
          anchor={notificationsRef}
          taskbar={taskbarRef}
          role="dialog"
          className="notification-panel"
          closeLabel="关闭消息提醒"
          close={() => setNotifications(false)}
        >
          <p>{pending ? `您有 ${pending} 条班级事务需要处理。` : '暂时没有待处理的新消息。'}</p>
          {game?.events
            .filter((event) => !event.resolved)
            .slice(-3)
            .map((event) => (
              <button
                className="balloon-message-item"
                key={event.id}
                onClick={() => {
                  open('parents');
                  setNotifications(false);
                }}
              >
                <b>{event.title}</b>
                <span>{event.text}</span>
              </button>
            ))}
        </TrayBalloon>
      )}
      <footer className="taskbar" ref={taskbarRef}>
        <button
          className={`start-button ${launcher ? 'active' : ''}`}
          aria-label="打开应用菜单"
          onClick={() => {
            setLauncher(!launcher);
            setContext(null);
            setNotifications(false);
          }}
        >
          <WindowsFlag size={26} />
          <span>开始</span>
        </button>
        <div className="quick-launch">
          <button
            title="显示桌面"
            aria-label="显示桌面"
            onClick={() =>
              setWindows((current) => current.map((win) => ({ ...win, minimized: true })))
            }
          >
            <LegacyIcon name="show-desktop" size={16} />
          </button>
          <button
            title="Internet Explorer"
            aria-label="打开教务首页"
            onClick={() => open('dashboard')}
          >
            <LegacyIcon name="ie" size={19} />
          </button>
          <button title="腾讯 QQ" aria-label="打开家校沟通" onClick={() => open('parents')}>
            <LegacyIcon name="qq" size={19} />
          </button>
        </div>
        <div className="taskbar-apps">
          {windows.map((win) => {
            const app = windowInfo(win.id);
            return (
              <button
                key={win.id}
                className={`taskbar-app ${activeId === win.id && !win.minimized ? 'active' : ''}`}
                title={app.title}
                onClick={() =>
                  win.id === activeId && !win.minimized
                    ? updateWindow(win.id, { minimized: true })
                    : focus(win.id)
                }
              >
                <LegacyIcon
                  name={win.id === 'recycle' && trash.length ? 'recycle-full' : app.icon}
                  size={16}
                />
                <span>{app.short}</span>
              </button>
            );
          })}
        </div>
        {game && (
          <button className="end-day-button" disabled={game.ended} onClick={() => setModal('end')}>
            {game.ended ? '高考已完成' : '结束今日工作'}
          </button>
        )}
        <div className="system-tray">
          <span title="简体中文输入法">CH</span>
          <LegacyIcon name="volume-tray" size={14} aria-label="音量" />
          <LegacyIcon name="network-tray" size={15} aria-label="本地连接" />
          <button
            ref={notificationsRef}
            aria-label="系统通知"
            aria-expanded={notifications}
            aria-controls="qq-message-panel"
            aria-haspopup="dialog"
            title="QQ 消息提醒"
            className={pending ? 'has-messages' : ''}
            onClick={() => setNotifications(!notifications)}
          >
            <LegacyIcon name="qq" size={18} />
            {pending > 0 && <i />}
          </button>
          <button
            className="tray-clock"
            aria-label="打开教学日历"
            title={`${game ? shortGameDate(game.day) : '2011/2/28'} · 教学日历`}
            onClick={() => open('calendar')}
          >
            {timeText}
          </button>
        </div>
      </footer>
      {notice && !notifications && (
        <TrayBalloon
          title={notice.error ? '操作提示' : '春山中学教务系统'}
          icon={notice.error ? 'error' : 'info'}
          anchor={notificationsRef}
          taskbar={taskbarRef}
          className={`toast ${notice.error ? 'error' : ''}`}
          closeLabel="关闭通知"
          close={() => useGame.getState().clearNotice()}
        >
          <p>{notice.text}</p>
        </TrayBalloon>
      )}
      {(booting || locked) && (
        <div className="xp-welcome">
          <header />
          <main>
            <div>
              <WindowsFlag size={54} />
              <h1>
                Microsoft{' '}
                <strong>
                  Windows<span>XP</span>
                </strong>
              </h1>
              <p>{GAME_TITLE}</p>
            </div>
            {locked ? (
              <button onClick={() => setLocked(false)}>
                <LegacyIcon name="user-portrait" size={48} />
                <span>
                  {game?.settings.teacher}
                  <small>单击用户名开始游戏</small>
                </span>
              </button>
            ) : (
              <strong>欢迎使用</strong>
            )}
          </main>
          <footer>春山中学 · 高三年级组电脑</footer>
        </div>
      )}
      {modal === 'new' && (
        <NewGame
          initial={initialSettings}
          existing={!!game}
          onStart={startGame}
          close={() => setModal(null)}
        />
      )}
      {modal === 'save' && (
        <SaveManager game={game} close={() => setModal(null)} newGame={() => newGame()} />
      )}
      {modal === 'debug' && game && <DebugPanel source={game} close={() => setModal(null)} />}
      {modal === 'end' && game && (
        <Modal title="关闭计算机 · 结束今日工作" close={() => setModal(null)}>
          <div className="xp-shutdown">
            <LegacyIcon name="shutdown" size={55} />
            <div>
              <h3>确认结束 {shortGameDate(game.day)} 的工作？</h3>
              <p>
                今日已安排 {game.actions.length} 项行动、
                {game.assignments.filter((item) => item.day === game.day).length}{' '}
                份作业。结算后执行学生自主学习、作业提交与班级事务，并自动存档。
                {EXAM_CALENDAR.find((exam) => exam.day === game.day) &&
                  `今日举行${EXAM_CALENDAR.find((exam) => exam.day === game.day)!.name}。`}
              </p>
              <div className="button-row">
                <button
                  className="button"
                  onClick={() => {
                    dispatch({ type: 'advance' });
                    setModal(null);
                  }}
                >
                  确认结束并结算
                </button>
                <button className="button" onClick={() => setModal(null)}>
                  取消
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
      {modal === 'display' && (
        <Modal title="显示 属性" close={() => setModal(null)}>
          <div className="properties-tabs" role="tablist" aria-label="显示属性分类">
            {(
              [
                ['theme', '主题'],
                ['desktop', '桌面'],
                ['appearance', '外观'],
              ] as const
            ).map(([id, label]) => (
              <button
                role="tab"
                aria-selected={propertiesTab === id}
                className={propertiesTab === id ? 'active' : ''}
                key={id}
                onClick={() => setPropertiesTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="display-monitor">
            <div className={`mini-wallpaper ${wallpaper}`} />
            <div />
          </div>
          {propertiesTab === 'desktop' && (
            <label className="field-label">
              桌面背景
              <select value={wallpaper} onChange={(event) => setWallpaper(event.target.value)}>
                <option value="grass">蓝天草地</option>
                <option value="blue">纯蓝色</option>
              </select>
            </label>
          )}
          {propertiesTab !== 'desktop' && (
            <label className="field-label">
              {propertiesTab === 'theme' ? '主题(T)' : '窗口和按钮颜色'}
              <select value={theme} onChange={(event) => setTheme(event.target.value)}>
                <option value="blue">默认（蓝色）</option>
                <option value="olive">橄榄绿</option>
                <option value="silver">银色</option>
              </select>
            </label>
          )}
          <p className="form-footnote">设置只改变游戏中的桌面，不会修改您的真实操作系统。</p>
          <div className="button-row">
            <button className="button" onClick={() => setModal(null)}>
              确定
            </button>
            <button
              className="button"
              onClick={() => {
                setTheme('blue');
                setWallpaper('grass');
              }}
            >
              恢复默认值
            </button>
          </div>
        </Modal>
      )}
      {modal === 'run' && (
        <Modal title="运行" close={() => setModal(null)}>
          <div className="run-description">
            <LegacyIcon name="run" size={32} />
            <p>输入程序名称，Windows 将打开对应的教务程序。</p>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              runProgram();
            }}
          >
            <label className="field-label">
              打开(O)：
              <input
                autoFocus
                value={runValue}
                onChange={(event) => setRunValue(event.target.value)}
                placeholder="例如 excel、winword、qq"
              />
            </label>
            <div className="button-row">
              <button className="button" type="submit">
                确定
              </button>
              <button className="button" type="button" onClick={() => setModal(null)}>
                取消
              </button>
            </div>
          </form>
        </Modal>
      )}
      {modal === 'help' && (
        <Modal title={`${GAME_TITLE} - 帮助和支持`} close={() => setModal(null)}>
          <div className="help-letter">
            <h3>2011年，春山中学高三年级组</h3>
            <p>
              您是一名高三班主任，通过这台电脑管理50名学生。先从 <b>Internet Explorer 教务平台</b>
              了解班级，再打开 <b>Excel 成绩表</b>与学生档案。
            </p>
            <p>
              <b>Word 教学计划</b>安排课程、练习或辅导，作业系统生成真实提交；<b>QQ 2011</b>
              记录家校和师生沟通。成绩由知识积累与考试产生，无法直接编辑。
            </p>
            <p>
              学生每天共享240分钟学习预算，过多单科任务会影响其他科目与恢复。选择结束今日后结算一天，第25、50、75天统一考试，第100天高考。
            </p>
            <p>
              双击桌面图标打开程序，拖动标题栏移动窗口，右下角可调整大小。开始菜单与“我的电脑”可以找到全部应用。Ctrl+S
              保存，Ctrl+O 打开存档管理。
            </p>
            <p>
              桌面右键可排列图标或设置外观；删除的快捷方式可在回收站还原。文件菜单、工具栏与Excel数据菜单都连接游戏操作。
            </p>
          </div>
          <button
            className="button"
            onClick={() => {
              setModal(null);
              open('scores');
            }}
          >
            打开成绩表
          </button>
        </Modal>
      )}
      {!booting && !game && !modal && (
        <div className="empty-desktop-start">
          <h1>{GAME_TITLE}</h1>
          <button className="button" onClick={() => setModal('new')}>
            新建班级
          </button>
          <button className="button" onClick={() => setModal('save')}>
            读取存档
          </button>
        </div>
      )}
    </div>
  );
}
