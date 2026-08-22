# LifeOS Web UI

[English](README.md)

`lifeos-web` 是 LifeOS 的第一方 React Web UI，基于 Vite/React 构建，通过 [`lifeos-cli`](https://github.com/lifeos-plus/lifeos-cli) 提供的 LifeOS Web API 与同一数据库交互。Web API 实现保留在 `lifeos-cli` 中，本仓库只包含浏览器 界面及其构建、验证和依赖管理工具链。OpenAPI 契约固定到特定 `lifeos-cli` release，并在拉取文档时按 `scripts/pinned-schema.sha256` 校验 SHA-256；刷新流程见 CONTRIBUTING.md。

## 当前范围

默认导航覆盖 LifeOS 已实现的面：愿景、习惯、规划、时间记录、财务、健康、统计、 日程/日历、笔记、人员与设置。

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

开发服务器默认只监听 loopback；仅当需要远程调试时才设置 `VITE_DEV_HOST=0.0.0.0`，因为 dev 代理会访问无认证的本地 Web API。

## 构建

```bash
npm ci
npm run build
```

构建产物 `dist/` 可由 LifeOS Web API 进程托管：

```bash
lifeos web serve --static-dir <path-to>/lifeos-web/dist
```

## 验证

```bash
bash ./scripts/validate.sh
```

## 项目政策

- 贡献流程：[CONTRIBUTING.md](CONTRIBUTING.md)
- 安全披露：[SECURITY.md](SECURITY.md)
- 社区规范：[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

## License

本项目使用 Apache License 2.0，详见 [LICENSE](LICENSE)。
