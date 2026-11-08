import { LegacyIcon } from './LegacyIcon';
import { useState } from 'react';
import { DESKTOP_APPS, GAME_TITLE, type BusinessAppId } from '../config/desktop';
import type { Game } from '../sim/types';

export function FileExplorer({
  game,
  open,
  save,
  settings,
  initialFolder,
  recentApps = [],
}: {
  game: Game;
  open: (id: BusinessAppId) => void;
  save: () => void;
  settings: () => void;
  initialFolder?: string;
  recentApps?: BusinessAppId[];
}) {
  const [folder, setFolder] = useState(initialFolder ?? '我的电脑');
  const apps = DESKTOP_APPS.filter((app) =>
    folder === '最近的文档'
      ? recentApps.includes(app.id)
      : folder === '我的电脑' ||
        folder === '本地磁盘 (C:)' ||
        folder === '我的文档' ||
        app.group === folder,
  );
  return (
    <div className="file-explorer">
      <div className="explorer-menu">
        <button onClick={settings}>文件(F)</button>
        <button onClick={() => setFolder('我的电脑')}>查看(V)</button>
        <button onClick={save}>保存当前游戏</button>
        <span>{GAME_TITLE}</span>
      </div>
      <div className="explorer-tools">
        <button disabled={folder === '我的电脑'} onClick={() => setFolder('我的电脑')}>
          <LegacyIcon name="back" size={20} />
          后退
        </button>
        <button disabled={folder === '我的电脑'} onClick={() => setFolder('我的电脑')}>
          <LegacyIcon name="up" size={20} />
          向上
        </button>
        <label>
          地址(D)
          <select value={folder} onChange={(event) => setFolder(event.target.value)}>
            {[
              '我的电脑',
              '本地磁盘 (C:)',
              '我的文档',
              '最近的文档',
              '学校教务',
              'Office 文档',
              '通讯与记录',
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="explorer-main">
        <aside>
          <section>
            <h3>系统任务</h3>
            <button onClick={settings}>管理游戏存档</button>
            <button onClick={save}>保存当前进度</button>
            <button onClick={() => open('dashboard')}>进入校园教务平台</button>
          </section>
          <section>
            <h3>其他位置</h3>
            {['我的电脑', '我的文档', '学校教务', 'Office 文档', '通讯与记录'].map((value) => (
              <button key={value} onClick={() => setFolder(value)}>
                {value}
              </button>
            ))}
          </section>
          <section>
            <h3>详细信息</h3>
            <strong>{game.settings.teacher}的电脑</strong>
            <p>春山中学 · 高三年级组</p>
            <p>
              {game.settings.className}
              <br />
              50 名学生 · 2011届
            </p>
          </section>
        </aside>
        <main>
          <h2>{folder === '我的电脑' ? '文件存储在这台计算机上' : folder}</h2>
          <div className="explorer-folders">
            {(folder === '我的电脑'
              ? ['我的文档', '本地磁盘 (C:)', '学校教务', 'Office 文档', '通讯与记录']
              : ['学校教务', 'Office 文档', '通讯与记录'].filter((value) => value !== folder)
            ).map((value) => (
              <button
                key={value}
                onDoubleClick={() => setFolder(value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') setFolder(value);
                }}
              >
                <LegacyIcon
                  name={
                    value.includes('磁盘') ? 'drive' : value === '我的文档' ? 'documents' : 'folder'
                  }
                  size={32}
                />
                <span>{value}</span>
              </button>
            ))}
          </div>
          <h2>教务资料与应用程序</h2>
          <div className="explorer-files">
            {apps.map((app) => (
              <button
                key={app.id}
                onDoubleClick={() => open(app.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') open(app.id);
                }}
              >
                <LegacyIcon name={app.icon} size={36} />
                <span>
                  <strong>{app.short}</strong>
                  <small>{app.software}</small>
                </span>
              </button>
            ))}
          </div>
        </main>
      </div>
      <footer>{apps.length} 个项目 · 双击打开文档或应用程序</footer>
    </div>
  );
}
