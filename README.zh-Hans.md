# LifeOS Web UI

[English](README.md)

`lifeos-web` 是 LifeOS 的第一方 React Web UI，基于 Vite/React 构建，通过 [`lifeos-cli`](https://github.com/lifeos-plus/lifeos-cli) 提供的 LifeOS Web API 与同一数据库交互。Web API 实现保留在 `lifeos-cli` 中，本仓库只包含浏览器 界面及其构建、验证和依赖管理工具链。

## 当前范围

默认导航覆盖 LifeOS 已实现的面：愿景、习惯、规划、时间记录、财务、统计、 日程/日历、笔记、人员与设置。

## 本地开发

先运行 Web API（在 `lifeos-cli` 检出目录中）：

```bash
uv run --extra web --extra postgres lifeos web serve --host 127.0.0.1 --port 8765
```

再启动前端：

```bash
npm ci
npm run dev
```

Vite 将 `/api` 代理到 `http://127.0.0.1:8765`。

## 构建

```bash
npm ci
npm run build
```

构建产物 `dist/` 可由 LifeOS Web API 进程托管：

```bash
lifeos web serve --static-dir <path-to>/lifeos-web/dist
```

## API 类型与契约固定

- `openapi.json` 是已提交并固定的传输契约基线。
- `src/services/api/generated/schema.ts` 由基线生成，请勿手工编辑。
- `npm run api:check` 会在提交的 `schema.ts` 过期时失败。
- 固定契约默认版本为 `v1.0.0`；`lifeos-cli` 发布新 `openapi.json` release 资产后，运行 `npm run api:refresh` 刷新；可用 `LIFEOS_CLI_SCHEMA_VERSION` 指定其他发布标签。

## 验证

```bash
bash ./scripts/validate.sh
```

基线流程会安装锁定依赖、拒绝高危 `npm audit` 结果、校验生成的 API 类型与翻译目录、构建前端、执行 lint、运行单元/组件测试，并运行 Playwright E2E 测试。

## E2E 测试

E2E 测试位于 `e2e/`，覆盖核心用户闭环（创建愿景 → 添加任务 → 记录时间 → 查看洞察统计）。测试面向真实的 LifeOS Web API（`lifeos-cli web serve`），后端使用隔离的临时 HOME 与一次性 SQLite 数据库，保证被测 HTTP 传输与固定的 OpenAPI 契约一致而非 mock，且绝不会触碰开发者本机配置的数据库。

前置要求：

- 安装带 Web 扩展的 `lifeos` CLI：`uv tool install "lifeos-cli[web,postgres]"`
- 安装 Playwright Chromium 浏览器：`npm run test:e2e:install`

按需运行：

```bash
npm run test:e2e
```

Playwright 会自动启动两个服务：临时 LifeOS Web API（`scripts/e2e/start-api.sh`，默认端口 8765）和 Vite 开发服务器（默认端口 5173，`/api` 代理到临时 API）。可通过 `E2E_API_PORT` 与 `E2E_WEB_PORT` 覆盖端口。CI 中浏览器安装含系统依赖并启用缓存；使用 2 个 worker、2 次重试，失败时保留首次重试 trace 与 HTML 报告（`playwright-report/`）。

## 项目政策

- 贡献流程：[CONTRIBUTING.md](CONTRIBUTING.md)
- 安全披露：[SECURITY.md](SECURITY.md)
- 社区规范：[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

## License

本项目使用 Apache License 2.0，详见 [LICENSE](LICENSE)。
