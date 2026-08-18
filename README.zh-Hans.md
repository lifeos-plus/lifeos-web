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
- 契约刷新与版本对齐详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 验证

```bash
bash ./scripts/validate.sh
```

## 发布

`lifeos-web` 以 `vX.Y.Z` tag 与 GitHub Release 发布版本，每个版本会记录构建时所固定的 `lifeos-cli` 契约版本。发布流程详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 项目政策

- 贡献流程：[CONTRIBUTING.md](CONTRIBUTING.md)
- 安全披露：[SECURITY.md](SECURITY.md)
- 社区规范：[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

## License

本项目使用 Apache License 2.0，详见 [LICENSE](LICENSE)。
