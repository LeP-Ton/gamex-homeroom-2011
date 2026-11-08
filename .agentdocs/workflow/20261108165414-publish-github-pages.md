# 首次提交与 GitHub Pages 发布

## 背景与目标

- 会话-29起，用户明确要求提交当前游戏并发布到 GitHub Pages。
- 项目仍在 `main`，与上一轮相同；当前没有提交与远程仓库。
- 已确认 GitHub 账号为 `LeP-Ton`，账号下没有本游戏仓库，目标公开仓库为 `gamex-homeroom-2011`。

## 约束与原则

- 将此前完整游戏与2011界面实现一并作为首次提交；不改变模拟和存档规则。
- `.local/`、`node_modules/`、`dist/`、日志和临时构建文件继续排除，不上传本地备份。
- GitHub 连接器不支持创建仓库或配置 Pages，改用本机已登录的 GitHub CLI；凭据不写入源码和工作流。
- 发布前验证测试、构建、仓库子路径和静态资源；发布后验证真实线上入口。

## 阶段与 TODO

- [x] 检查分支、变更历史、GitHub 账号与已有仓库
- [x] 配置相对资源路径与 Pages 自动部署
- [x] 本地测试、构建和资源子路径验证
- [ ] 首次提交、创建仓库与推送
- [ ] 启用 Pages，确认线上发布与浏览器游玩

## 代码与文档变更

- `vite.config.ts`：添加 `base: './'`，由 Vite 生成相对脚本、样式和壁纸路径。
- `.github/workflows/pages.yml`：`main` 推送与手动触发；Node.js 24、`npm ci`、`npm test`、`npm run build`；构建成功后上传并部署 `dist/`。
- 工作流使用 Vite 官方部署示例中的官方动作提交，已通过 GitHub API 核实各提交存在；仅部署任务具有 Pages 与身份令牌写权限。
- `README.md`：在线游戏、仓库与部署记录入口，以及浏览器存档迁移说明。
- `AGENTS.md`：补充长期有效的发布方式与仓库信息。
- `.agentdocs/index.md`：登记本任务与读取场景。

## 关键风险

- Pages 运行在仓库子目录，绝对根路径会导致脚本、CSS 或壁纸404，需检查真实构建产物。
- GitHub Actions 与本地环境不同，需要确认远程安装、测试、构建与部署均成功。
- 在线域名与本地端口的浏览器存储隔离，进度应通过文件导出/导入迁移。

## 验证

- 本地自动化与构建：27/27测试通过，6.90秒；TypeScript与Vite生产构建通过。
- 仓库子路径资源：构建入口的JS、CSS与两处壁纸引用均解析到`/gamex-homeroom-2011/`内，对应文件存在；工作流YAML语法验证通过。
- GitHub Actions：待验证。
- 线上 HTTP、资源与浏览器：待验证。

## 参考

- [Vite 静态部署与 GitHub Pages](https://vite.dev/guide/static-deploy#github-pages)
- [GitHub Pages REST API](https://docs.github.com/en/rest/pages/pages)

## 当前状态

发布配置和提交前验证已完成，准备创建首次提交并推送。
