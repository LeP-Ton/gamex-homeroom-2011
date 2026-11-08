# GameX 高三班主任模拟器：2011

## 项目定位

纯本地、单机的高三教学策略模拟游戏。玩家通过虚拟电脑桌面管理 50 名学生，在 100 个教学日内间接影响知识掌握、状态与最终考试。成绩由知识和考试模型生成，禁止行动直接修改分数。

游戏名为《高三班主任模拟器：2011》，世界内日期为2011年2月28日到6月7日。界面以Windows XP、Office 2003、QQ 2011和校园教务内网为统一基准，不使用现代SaaS卡片桌面。界面是本地模拟，不依赖真实办公软件。

## 技术与结构

- TypeScript、React、Vite、Zustand；IndexedDB 保存完整状态。
- `src/config/`：学科、知识点、考试、行动、难度及事件配置。
- `src/sim/`：与界面解耦的确定性模拟。所有随机性经由可保存状态的伪随机数生成器。
- `src/state/`：共享游戏状态、存档、独立调试状态。
- `src/ui/`：桌面窗口、应用、可观察信息展示。
- `src/config/desktop.ts`：名称、2011年日期、软件映射。`ClassicFrame.tsx`管理年代化菜单/工具栏，`legacy.css`覆盖基础布局，`ClassicChat.tsx`实现QQ式沟通。
- `public/wallpapers/`：随生产资源打包的桌面背景；来源记录在`docs/界面参考与素材.md`。
- `src/assets/xp-icons/`：XP与年代软件的原始位图、尺寸和来源清单；`src/config/icons.ts`统一类型，`LegacyIcon.tsx`按原生帧渲染。不要重新混入现代线框图标。
- `scripts/`：批量平衡测试及统计导出。
- `docs/`：架构、玩法和验收说明。

## 运行与验证

- 安装：`npm install`
- 开发：`npm run dev`；生产：`npm run build`、`npm run preview`
- 自动化验证：`npm test`
- 图标资源验证：`npm run check:icons`，检查PNG尺寸、来源登记和SHA-256；生产构建自动执行。
- 平衡工具：`npm run balance -- --seeds=8 --out=.local/balance.json`
- 发布：`main` 推送触发 `.github/workflows/pages.yml`，Node.js 24 运行 `npm ci`、测试和构建后部署 GitHub Pages；`vite.config.ts` 使用相对路径兼容仓库子目录。
- 源码仓库：`https://github.com/LeP-Ton/gamex-homeroom-2011`；游戏入口：`https://lep-ton.github.io/gamex-homeroom-2011/`。

## 核心约束

- 配置定义学科、知识点、参考线、考试日与可选任教学科，核心逻辑不得假设仅三科。
- 真实学生状态与教师观察分离；普通界面不能泄露隐藏心理、能力或最终成绩。
- 所有游戏操作通过模拟入口验证资源、冷却与目标。学科共享每天有限学习时间。
- 存档包含随机数状态、观察、事件和行动队列；读档必须保持模拟轨迹。
- 界面年代与学生种子分离；旧存档中的种子（包括“春山2027”）不得为更名而重置。显示属性、最近文档和快捷方式回收站只保存界面偏好。
- 开发者调试使用独立副本，不能写入普通存档与本地排行榜。
- 中文沟通、文档、代码注释；复杂约束的注释解释原因。
- 每个代码任务先检查分支；不覆盖现有未提交修改，不擅自创建提交。

## 项目检索方法

必须按 `AGENTS.md → .agentdocs/index.md → 与任务直接相关的 workflow 文档 → 源码` 顺序检索。不全量扫描 workflow。

## 变更记录规范

- 同一任务的相关代码修改合并到一个全新 `.agentdocs/workflow/YYYYMMDDHHmmss-简短描述.md`。
- 更新 `.agentdocs/index.md`，记录内容、读取场景与长期有效的决策。
- 变更文档记录目标、约束、实现、风险、测试和未验证项，不复制完整 diff。
- 仅当整体技术、架构、运行或开发约束变化时更新本文件。普通需求与 Bug 写入 workflow。
- 回滚以会话编号、workflow 和 Git 历史定位，避免影响其他修改。
