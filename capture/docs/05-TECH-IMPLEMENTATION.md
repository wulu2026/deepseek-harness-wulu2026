# Capture — 技术实现 (05)

本文档记录阶段 1 已完成的真实实现：插件怎么注册、怎么加载、包含哪些内容、各半边分别做了什么，以及阶段 1 修复的全部问题。所有声明均已在真实 `desktop` profile 上安装并冒烟验证（见 `PROGRESS.md` §2 末）。

与代码保持一致：如需改动 `index.js`/`client.js`/`package.json`/`cordis.patch.yml`，必须先同步更新本节 §18 的 spec freeze。

---

## 1. 阶段 0 — 技术验证（先做，阻塞实现）

在编写任何宿主服务代码之前，先运行这些小型提取/探测。输出到 `capture/docs/spikes/`。

**S1 存储 API** ✅ 已完成

- 提取 `dsh-storage`、`dsh-storage-domain`、`dsh-storage-json` 的 README。确定：插件通过 `ctx.storageDomain.open(CaptureSpec)` 注册存储域；目录路径由后端决定（插件不自建 IO，ADR-003/010 锁定）；事务/原子写入由 domain 层的单写链保证；从宿主通过 `domain.table(name).put/get/entries` 读写。
- 交付物：`capture/docs/spikes/S1-storage.md`，含代码片段。
- 对 ADR 影响：ADR-003（全局项目存储）已锁定，ADR-010（数据文件路径待定）已解，使用 storage-domain 而非自建 `$DSH_HOME/capture/` 文件树。

**S2 客户端—宿主数据流** ✅ 已完成

- 客户端如何对宿主服务调用：阶段 1 使用 `ctx.webServer.register({ kind: "exact", path, handler })` 暴露 `/api/capture/*` JSON 路由，客户端用同源 `fetch` 调用。**不引入 Typert / `@Remote`**（ADR-015/017）。
- 安全门：直接复制 dsh-archived 的 trust pattern（loopback + `Origin`/`Sec-Fetch-Site`，缺信号拒绝），POST JSON body via `readJsonBody`。
- 交付物：`capture/docs/spikes/S2-client-host.md`。
- 对 ADR 影响：ADR-015（Host exposure via webServer exact routes，不采用 Typert）已锁定。

**S3 插件的智能体预设/技能** — 待做（Q5）

- 插件能否注册技能/智能体预设；若不能，使用 `systemPrompt.section()` + 工具描述。阶段 1 已采用后者。

**S4 作业 API** — 待做（Q6）

- 检查 `dsh-jobs` 包：作业创建/进度/取消。

**S5 媒体/图像提供商** — 待做（Q2）

- 检查 DeepSeek 账户服务（是否暴露图像生成？）+ 已配置的 LLM 提供商。决定模拟 HTTP 提供商的形态。

对每个技术验证：落盘到 `capture/docs/spikes/SX-*.md`，记录命令/路径以便复现。后续在实时运行中使用 `cordis_inspect_query` 作为权威。

---

## 2. 构建与打包

宿主使用**纯 JS 工厂 bundle**（无编译步骤）；客户端为工厂（require）模式（同模板）。更丰富的 TS UI 可以后续再搭 `tsdown`/`vite`，但阶段 1 使用纯 JS `client.js` 工厂以最小化风险并符合 DSH 实践（不重复引入 React）。

宿主（`index.js`）必须：

- 遵循 `apply(ctx, config)` 形式，`Config` 可选。
- 通过 `ctx` 注册服务（名称在 S1/S2 中发现，并在 `inject` 中声明）。
- `inject`：若使用可选服务，在 `inject` 中声明，例如 `inject: ['storage', 'jobs']`（验证名称）。
- **所有注册必须通过 `ctx.effect` 托管**，卸载时逆序注销（P0 fix，ADR-016）。
- 不能将 DSH 内部 bundle（如 `@deepseek-ai/dsh-storage-domain`）及 `zod` 声明为插件包的 pnpm 依赖（ADR-019）；如需 schema 校验，内联构建器并使用 passthrough schema。

客户端（`client.js`）：

- `window.__ModuleLoader__.load({...})` 工厂；导入：`require('react')`。其他基线模块通过 `require`。
- 通过 `ctx.slots.inject` / `ctx.slots.register` 注册 UI 槽位。

区域 JSON：

- `locale/en.json`、`locale/zh.json`，含 `meta.title/description` + 所有 UI 键。

图标：简单 SVG，≤ 256KiB。

---

## 3. 文件布局（阶段 1）

```text
capture/
├─ package.json          # dsh.bundle.patch + dsh.client
├─ cordis.patch.yml      # insert 行：id=capture，name='@local/capture'
├─ index.js              # Host apply + 所有注册（storage domain / 工具 / 路由 / systemPrompt / teardown）
├─ client.js             # Client 工厂（CapturePanel 渲染到 conversation.composer.dock）
├─ locale/en.json
├─ locale/zh.json
├─ icon.svg
├─ tests/                # 空，阶段 1 待补充 host-smoke.mjs / client-smoke.mjs / compat-check.mjs
└─ docs/                 # 本文档族
```

阶段 2+ 增加 `media/` + 提供商、`host/` 子模块拆分。

---

## 4. package.json 模板（阶段 1 实际内容）

```json
{
  "name": "@local/capture",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./index.js",
    "./client": "./client.js",
    "./locale/*.json": "./locale/*.json",
    "./icon": "./icon.svg"
  },
  "files": [
    "index.js",
    "client.js",
    "cordis.patch.yml",
    "locale/*",
    "icon.svg",
    "tests/*",
    "README.md"
  ],
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": {
      "platform": "web",
      "immediately": true,
      "inject": [
        "@deepseek-ai/dsh-client-ui-conversation",
        "@deepseek-ai/dsh-client-ui-workspace",
        "@deepseek-ai/dsh-client-ui-settings",
        "@deepseek-ai/dsh-client-locale"
      ]
    }
  }
}
```

`cordis.patch.yml`：

```yaml
- insert:
    - id: capture
      name: '@local/capture'
      config: {}
```

显示元数据放在区域 JSON：

```json
{
  "meta": { "title": "Capture", "description": "Create story chapters, shot lists, reusable assets, and generate consistent media through agent collaboration." }
}
```

---

## 5. 数据模型与校验（阶段 1）

阶段 1 因插件包不可将 `@deepseek-ai/dsh-storage-domain` 及 `zod` 作为 pnpm 依赖（ADR-019），内联了 `defineDomain` / `domainTable` 微型构建器，并使用 passthrough schema `{ parse: (v) => v }`，让 `storageDomain.loadAll()` / `put()` 先能工作；真正的 Zod 校验留待后续阶段补上。

每个实体通用字段：`id`、`name`、`genre`、`logline`、`createdAt`、`updatedAt`。ID 生成：`crypto.randomUUID()`，时间戳：`Date.now()`。

阶段 1 仅操作 `projects` 表；`chapters/shots/assets/generations/trailers` 表已在 domain spec 中声明，待后续阶段使用。

（最终确定前，S1 可能重定向到官方 `storages/`。保持根可配置。）

---

## 6. 宿主服务 API（阶段 1 已实现）

`ctx.storageDomain`（存储域）：

- 域名 `capture`，版本 1，表 `projects/chapters/shots/assets/generations/trailers`。
- `domain.table("projects").put(id, record)` / `.entries()` 读写。

`ctx.tools.register`（模型面向工具，snake_case 命名，ADR-018）：

| 工具名 | 参数 | 返回 |
|---|---|---|
| `capture_project_create` | `{ name: string (required), genre?: string, logline?: string }` | `{ ok: true, project: { id, name, createdAt } }` 或 `{ ok: false, error: "INVALID_PROJECT_NAME", message }` |
| `capture_project_list` | `{}` | `{ ok: true, projects: [{ id, name, genre, createdAt }] }` |

每个工具声明 `output: { schema: { type: "object" }, render: (_args, value) => [{ type: "text", text: JSON.stringify(value) }] }`，`render` 产出 `TextBlock`。

`ctx.webServer.register`（同源 JSON 路由，ADR-015）：

| 方法 | 路径 | 契约 |
|---|---|---|
| GET | `/api/capture/state` | `{ ok: true, projects: [{id, name, genre, createdAt}] }` |
| POST | `/api/capture/projects` | body `{ name, genre?, logline? }` → `{ ok: true, project: {...} }` 或 `{ ok: false, error: "INVALID_PROJECT_NAME", message }` |

所有路由：method gate（非匹配返回 405）、trust gate（跨站/Origin null 拒绝）、JSON body 解析失败返回 400 `invalid-json-body`、异常统一返回 500 `CaptureInternalError`。

`ctx.systemPrompt.section`（提示词章节）：

- 注册章节 `"capture"`，`order: 100`，文本说明 Capture 是故事/分镜/预告片创作工作区，指导模型使用 `capture_project_create/list`，并提示“未经用户指示，不要擅自修改项目”。
- **返回的 disposer 必须通过 `ctx.effect` 托管**（P0 fix，ADR-016）。

---

## 7. 并发与一致性

- 阶段 1 通过 storage-domain 的单写链（write chain）保证每个域内写入串行，耐久先于内存变更，后端写失败不改内存。
- 生成作业异步（阶段 3）。
- 原子写入由 storage-domain 后端负责；阶段 1 不自建手动 FS 原子写入。

---

## 8. 分叉/回滚

- 分叉 = 深克隆项目树（新 id 带 `origin` 指针）。
- 撤销 = 基于日志回退最近 N 个操作（提案；存储层）。
- 阶段 1 不实现。

---

## 9. 媒体提供商架构（阶段 2+）

```js
// providers/base.js
export class MediaProvider {
  static id = 'base'
  capabilities() { return { image: false, video: false, maxDurationSec: 0 } }
  async generateImage(params) { throw }
  async generateVideo(params) { throw }
}
```

通过设置配置（宿主配置或 `cordis.patch.yml` 配置）。实现：

- `mock`（阶段 0-1）：开发时生成 SVG 占位图并存储；ffmpeg 仍可拼接（图像作为帧？需要从图像生成 mp4）。冒烟测试不需要真实媒体；1 秒黑色 mp4 通过 ffmpeg 可接受。惰性实现提供商并置于可用性门控之后。
- `http-image`（OpenAI 兼容）在阶段 2。
- `dreamina` 等在没有 API 知识的情况下不做。

所有生成都记录，输出文件引用。

---

## 10. 视频编译（ffmpeg，阶段 3）

使用 `ffmpeg` 进行：

- 拼接片段，可选交叉淡化
- 叠加标题卡（通过 drawtext 文本）
- 导出尺寸：1920x1080、1080x1920（竖版）、1080x1080。

仅阶段 3。

---

## 11. 客户端实现（阶段 1 已实现）

阶段 1 UI 最小但完整：项目列表面板（CapturePanel）渲染于 `conversation.composer.dock`。

- 使用 React `createElement`（工厂风格）；样式用 CSS 变量令牌（`--dsw-alias-fg-default`、`--dsw-alias-stroke-default`、`--dsw-alias-danger-default`），不硬编码颜色。
- 不将 `@deepseek-ai/dsh-client-ui-primitives` 作为运行时模块导入（ADR-009）。
- 状态管理：`useState({ projects, error, loading })`；`useEffect` 挂载时 `fetch("/api/capture/state", { credentials: "same-origin" })`，通过 `safeJson` 解析，卸载时置 `active = false` 防止状态更新。
- `safeJson`（P1 防护）：对非 JSON 响应返回 `{ ok: false, error: "HTTP_<status>", message: <前 200 字符> }`，避免 `res.json()` 解析纯文本崩溃。

阶段 2+ 拟追加：项目选择器 + 创建、章节编辑器、镜头清单表格、资产库、一致性警告面板、导出 MD/CSV、差异审阅对话框。

---

## 12. 工具定义（阶段 1 已实现）

每个工具返回 JSON 结果信封，尽可能幂等。认证：仅宿主侧；信任 DSH 会话。

- `capture_project_create { name, genre?, logline? }`
- `capture_project_list {}`

差异优先的智能体工作流：对于智能体提议的编辑，使用工具 `capture_propose_change` 创建“待处理提案”，返回 proposalId；UI 渲染差异；`capture_apply_proposal(proposalId)` 持久化。这防止盲目覆盖（阶段 1+）。

---

## 13. 测试（宿主冒烟计划）

脚本 `tests/host-smoke.mjs`（待创建）：

1. 将 `DSH_HOME` 设为临时目录，加载 `index.js` 的 `apply`，用假 `ctx` 调用服务。
2. 场景：创建项目 → 章节 → 5 个镜头 → 资产 → 绑定 → 模拟生成 → 导出 md → 重启加载 → 断言数量/数据。
3. 验证媒体文件存在。
4. 清理临时目录。

客户端冒烟：在 node 中加载工厂，带桩全局 `__ModuleLoader__` + React；断言不抛错。

兼容性检查：断言引用的服务名称/导出存在于 app 包中（轻量）。阶段 1 已通过 `cordis_inspect_query Service.listService` 验证 `storage`/`storageDomain`/`webServer`/`tools`/`systemPrompt`，并通过 `GET /api/capture/state` 验证路由。

`tests/` 目录当前为空，待补充 `host-smoke.mjs`、`client-smoke.mjs`、`compat-check.mjs`。

---

## 14. 安装/开发工作流（Mac）

开发：

1. 工作区即为插件目录：`/Users/constance/Documents/GitHub/deepseek-harness-wulu2026/capture`。
2. 不要手动编辑 profile 的 `package.json`/`cordis.patch.yml`；使用 `plugin_manager install_bundle target=/abs/path/to/capture`（本地目录链接）。
3. 添加 HMR 根（可选）用于宿主代码变更：profile `cordis.patch.yml` 的 hmr 条目根包含仓库路径。请求用户许可。
4. 客户端变更刷新浏览器。
5. 验证能力：`cordis_inspect_query` 服务名/工具/槽位；设置显示条目；覆盖层打开。

后续发布：npm publish；`dsh plugin --profile web add ...`。

---

## 15. 回滚/迁移

- 每个实体上的版本字段（`schemaVersion`）。
- 加载时，若 `schemaVersion < current`，就地运行迁移器（`migrateV1toV2` 等）并写回。
- 迁移前保留备份 `.bak`。
- 阶段 1 domain 版本为 1，暂无迁移。

---

## 16. 可观测性

- 宿主日志通过 `ctx.logger`（命名空间 `capture`），非 `ctx.log`（文档早期笔误，已更正）。
- 指标通过可选产品分析（若存在，注入）。
- 默认无遥测。

---

## 17. 此处提出的开放问题 → 见 08

Q1（存储官方位置，已解，使用 storage-domain）、Q2（DeepSeek 图像生成可用性，阶段 2）、Q5（插件技能注册，阶段 3）、Q6（作业服务导出名称，阶段 2）、Q8—Q12（见 `08-OPEN-QUESTIONS.md`）。

---

## 18. Phase 1 exact DSH API bindings（spec freeze，与代码一致）

### 18.1 Host plugin services to declare

```js
export const inject = ["storage", "storageDomain", "webServer", "tools", "systemPrompt"];

export async function apply(ctx, config) {
  // all registrations belong to ctx.effect so unloading cleans them up
}
```

`systemPrompt` 已加入 `inject`（早期版本漏了，已在 `c1e7dee24d` 中补上）。

### 18.2 Storage & domain

阶段 1 不再从 `@deepseek-ai/dsh-storage-domain` 与 `zod` 导入（插件包不可将 DSH 内部 bundle 与 `zod` 声明为 pnpm 依赖，ADR-019），而是内联 `defineDomain` / `domainTable` 并使用 passthrough schema：

```js
const passthroughSchema = { parse: (v) => v };

const CaptureSpec = defineDomain({
  name: "capture",
  version: 1,
  tables: {
    projects: domainTable(passthroughSchema),
    chapters: domainTable(passthroughSchema),
    shots: domainTable(passthroughSchema),
    assets: domainTable(passthroughSchema),
    generations: domainTable(passthroughSchema),
    trailers: domainTable(passthroughSchema),
  },
});

let domain = ctx.storageDomain?.get?.("capture");
if (!domain) {
  domain = await ctx.storageDomain.open(CaptureSpec);
}
```

开启同名域两次会抛 `already-open` 并崩溃整个 Host，故优先复用已打开句柄。

### 18.3 Host tools (register via `ctx.tools.register`, NOT `defineTool`)

Prefix: `capture_*`（snake_case，符合 DSH 工具名校验 a-z/A-Z/0-9/underscore/dash，ADR-018）。

- `capture_project_create` params `{ name: string (required), genre?: string, logline?: string }`
- `capture_project_list` params `{}`

每个工具声明：

```js
{
  name: "capture_project_create",
  description: "Create a new Capture project.",
  parameters: {
    type: "object",
    properties: { name: { type: "string", description: "Project name" }, genre: { type: "string" }, logline: { type: "string" } },
    required: ["name"],
    additionalProperties: false,
  },
  output: {
    schema: { type: "object" },
    render: (_args, value) => [{ type: "text", text: JSON.stringify(value) }],
  },
  async execute(args, exec) { ... }
}
```

每个工具的 `register()` 返回的 disposer 用 `ctx.effect(() => disposable, \`capture:tool:${definition.name}\`)` 托管。

### 18.4 Web routes (Phase 1 uses `ctx.webServer.register({ kind: "exact", ... })`)

All routes use the dsh-archived trust-report pattern (loopback + Origin/Sec-Fetch-Site).

| Method | Path | Contract |
|---|---|---|
| GET | `/api/capture/state` | `{ ok, projects:[{id,name,genre,createdAt}] }` |
| POST | `/api/capture/projects` | body `{ name, genre?, logline? }` |

每条路由返回的 disposer 用 `ctx.effect` 托管；处理函数统一捕获异常并返回 `HTTP 500 { ok: false, error: "CaptureInternalError", message }`。

### 18.5 systemPrompt section

```js
const disposeSection = ctx.systemPrompt.section({
  name: "capture",
  order: 100,
  text: "Capture is a story/shoot/trailer creation workspace. Use capture_project_create/list, then chapters, shots, assets and exports. Never modify a project without the user's instruction.",
});
ctx.effect(disposeSection, "capture:system-prompt-section");
```

**不要**使用旧版两位参数调用 `ctx.systemPrompt.section("capture", "...")`；必须传 `PromptSection` 对象 `{ name, order, text }`，并将返回的 disposer 通过 `ctx.effect` 托管（P0 fix，ADR-016）。

### 18.6 Client state access (no Typert Phase 1/2)

Client uses same-origin `fetch` with `credentials: "same-origin"`. Every mutation calls the POST route and refreshes state server-side. `safeJson` guards against non-JSON responses. Long waits are poll-only (`GET /api/capture/generations/:id`) with 1–2 second intervals (Phase 3+).

### 18.7 Phase 1 host tasks checklist

- [x] open domain (with `get` reuse to avoid `already-open`)
- [x] define inline domain builders + passthrough schema (no zod from plugin package)
- [x] route trust gate + method gate + uniform JSON
- [x] two tools: `capture_project_create`, `capture_project_list` (snake_case)
- [x] `ctx.systemPrompt.section()` disposer via `ctx.effect` (P0 fix)
- [x] teardown effect: dispose routes + close domain
- [x] client `safeJson` + `conversation.composer.dock` slot registration
- [ ] minimal 8 tool wrappers (phase 1+)
- [ ] tools-guard deny invalid scope if necessary
