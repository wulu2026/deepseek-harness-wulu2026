# Capture — 技术实现 (05)

## 1. 阶段 0 — 技术验证（先做，阻塞实现）

在编写任何宿主服务代码之前，先运行这些小型提取/探测。输出到 `capture/docs/spikes/`（现在创建占位）。

**S1 存储 API**

- 提取 `dsh-storage`、`dsh-storage-domain`、`dsh-storage-json` 的 README（已有部分）。确定：插件如何注册存储域；目录路径；事务/原子写入 API；如何从宿主读写。
- 交付物：`capture/docs/spikes/S1-storage.md`，含代码片段。

**S2 客户端—宿主数据流**

- 确定客户端如何对宿主服务方法调用 `ctx.remote.commands.execute()`，以及宿主服务如何暴露；检查 dsh-client-ui-workspace 的用法和 `remoteAccess` 包。
- 交付物：`S2-client-host.md`。

**S3 插件的智能体预设/技能**

- 插件能否注册技能/智能体预设；若不能，使用 `systemPrompt.section()` + 工具描述。
- 交付物：`S3-agent-preset.md`。

**S4 作业 API**

- 检查 `dsh-jobs` 包：作业创建/进度/取消。
- 交付物：`S4-jobs.md`。

**S5 媒体/图像提供商**

- 检查 DeepSeek 账户服务（是否暴露图像生成？）+ 已配置的 LLM 提供商。决定模拟 HTTP 提供商的形态。
- 交付物：`S5-media-providers.md`。

对每个技术验证：使用 `/tmp/asarx.mjs` 从 app.asar 提取相关 README，阅读，总结 API，存储片段。后续在实时运行中使用 `cordis_inspect_query` 作为权威。

## 2. 构建与打包

宿主使用**纯 JS 工厂 bundle**（无编译步骤）；客户端为工厂（require）模式（同模板）。更丰富的 TS UI 可以后续再搭 `tsdown`/`vite`，但阶段 1 使用提取的 `client.js` 工厂以最小化风险并符合 DSH 实践（不重复引入 React）。

宿主（`index.js`）必须：

- 默认导出还是 `apply(ctx, config)`？遵循 `apply(ctx, config)` 形式，`Config` 可选。
- 通过 ctx 注册服务（名称在 S1/S2 中发现）。
- `inject`：若使用可选服务，在 `inject` 中声明，例如 `inject: ['storage', 'jobs']`（验证名称）。

客户端（`client.js`）：

- `window.__ModuleLoader__.load({...})` 工厂；导入：`require('react')`。其他基线模块通过 `require`。

区域 JSON：

- `locale/en.json`、`locale/zh.json`，含 `meta.title/description` + 所有 UI 键。

图标：简单 SVG，≤ 256KiB。

## 3. 文件布局（阶段 1）

```text
capture/
├─ package.json
├─ cordis.patch.yml
├─ index.js              # Host apply + Config
├─ host/
│   ├─ storage.js        # 插件存储适配器
│   ├─ models.js         # 实体工厂 + 校验
│   ├─ services.js       # capture 核心
│   ├─ tools.js          # 工具注册
│   └─ agents.js         # 系统提示词章节 + 工具提示
├─ client.js             # Client 工厂（渲染外壳）
├─ ui/                   # （阶段 1 保持内联；仅当加入编译步骤时再拆分）
├─ locale/en.json
├─ locale/zh.json
├─ icon.svg
├─ skills/...            # 可选（仅在支持时）
├─ tests/
│   ├─ host-smoke.mjs
│   ├─ client-smoke.mjs
│   └─ compat-check.mjs
└─ docs/...
```

阶段 2+ 增加 `media/` + 提供商。

## 4. package.json 模板

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
  "files": ["index.js", "host/*.js", "client.js", "cordis.patch.yml", "locale/*.json", "icon.svg", "tests/*"],
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": {
      "platform": "web",
      "immediately": true,
      "inject": ["@deepseek-ai/dsh-client-ui-conversation", "@deepseek-ai/dsh-client-ui-workspace", "@deepseek-ai/dsh-client-ui-settings", "@deepseek-ai/dsh-client-locale"]
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
  "meta": { "title": "Capture", "description": "Write stories, build shot lists, generate consistent characters and trailers." }
}
```

## 5. 数据模型与校验

使用带版本模式的普通 JS 对象。每个实体有 `schemaVersion: 1`。存储根：

```text
<DSH_HOME>/capture/
  projects/
    <projectId>.json
    <projectId>.lock
  media/
    <projectId>/
      assets/<assetId>/refs/...
      generations/<generationId>/...
  journal/
    <projectId>.jsonl（操作日志）
  index.json（项目 id 列表 + 元数据）
```

（最终确定前，S1 可能重定向到官方 `storages/`。保持根可配置。）

ID 生成：`crypto.randomUUID()`。

状态变更：近似纯函数 + 原子写入，若检查确认则用 `dsh-atomic-write`；否则写临时文件 + `fs.rename`（同文件系统上原子）。

## 6. 宿主服务 API（草案；在技术验证中验证）

```ts
// ctx.capture（服务）
createProject({ name, genre?, logline? }): Project
getProject(id): Project | null
listProjects(): ProjectSummary[]
updateProject(id, patch): Project
deleteProject(id): { ok, reason? }
forkProject(id, { branchName? }): { newProjectId }
// 章节
createChapter(projectId, { title?, index? }): Chapter
updateChapter(projectId,chapterId,patch)
deleteChapter(...)
// 镜头
createShot(...); updateShot(...); deleteShot(...); reorderShots(projectId, shotIds)
// 资产
createAsset(...); updateAsset(...); deleteAsset(...); bindAssetToShot(...)
// 生成
requestGeneration({ kind, sourceShotId?, assetId?, params })
getGeneration(id)
listGenerations(projectId?, status?)
cancelGeneration(id)
// 预告片
createTrailer(...); renderTrailer(id) // 作业
exportProject(projectId, { format })
```

工具名在 `ctx.tools.register('capture', ...)` 下镜像，带类型参数（实际 API 待 S？验证）。

## 7. 并发与一致性

- 通过进程内锁实现每个项目单写者；生成作业异步。
- 原子写入确保崩溃安全；启动时扫描 `.tmp` 并恢复。
- 日志记录每个高层操作，带时间戳+执行者（用户/智能体），用于撤销与审计。

## 8. 分叉/回滚

- 分叉 = 深克隆项目树（新 id 带 `origin` 指针）。
- 撤销 = 基于日志回退最近 N 个操作（提案；存储层）。

## 9. 媒体提供商架构

```js
// providers/base.js
export class MediaProvider {
  static id='base'
  capabilities() { return { image:false, video:false, maxDurationSec:0 } }
  async generateImage(params) { throw }
  async generateVideo(params) { throw }
}
```

通过设置配置（宿主配置或 `cordis.patch.yml` 配置）。实现：

- `mock`（阶段 0-1）：生成占位 PNG 通过小型内置实现？需要允许的依赖吗？纯 Node 可写入 1x1 png 缓冲区；测试用缓冲区。更好：SVG→PNG？可能没有 `sharp`。开发时生成 SVG 占位图（对缩略图仍有用）并存储；ffmpeg 仍可拼接（图像作为帧？需要从图像生成 mp4）。冒烟测试不需要真实媒体；1 秒黑色 mp4 通过 ffmpeg（`ffmpeg -f lavfi -i color=c=black:s=320x180:d=1`）可接受。我们将惰性实现提供商并置于可用性门控之后。

- `http-image`（OpenAI 兼容）在阶段 2。

- `dreamina` 等在没有 API 知识的情况下不做。

所有生成都记录，输出文件引用。

## 10. 视频编译（ffmpeg）

使用 `ffmpeg` 进行：

- 拼接片段，可选交叉淡化
- 叠加标题卡（通过 drawtext 文本）
- 导出尺寸：1920x1080、1080x1920（竖版）、1080x1080。

仅阶段 3。

## 11. 客户端实现计划

阶段 1 UI 最小但完整：

- 项目选择器 + 创建
- 章节编辑器（文本域 + 简单 markdown）
- 镜头清单表格（可编辑单元格）
- 资产库（列表 + 创建）
- 一致性警告面板（文本）
- 导出 MD/CSV
- 差异审阅对话框（智能体提议的编辑）

目前使用 React `createElement`（工厂风格）；样式用 token + 通过 `styles.insert` 注入的 CSS 字符串？DSH 允许组件局部样式作为 React 元素。我们将创建 `<style>` 标签组件。

状态管理：

- 宿主拥有数据；客户端通过远程调用 `capture.*` 并刷新。
- 使用简单 store（context + useState）。数据流：操作 -> 远程调用 -> 重新加载受影响的视图。

## 12. 工具定义（草案参数）

每个工具返回 JSON 结果，尽可能幂等。认证？仅宿主侧；信任 DSH 会话。

示例：

```text
capture_project.create { name, genre?, logline? }
capture_project.list {}
capture_project.get { projectId }
capture_chapter.create { projectId, title, index? }
capture_chapter.update { projectId, chapterId, patch }
capture_shotlist.generate { projectId, chapterId, targetDurationSec? }
capture_shot.update { projectId, shotId, patch }
capture_asset.create { projectId, kind, name, description, traits? }
capture_asset.bind { projectId, assetId, shotId, role }
capture_generation.request { kind, sourceShotId?, assetId?, params }
capture_trailer.create { projectId, beatShotIds[], style, durationTargetSec }
capture_export { projectId, format } -> 文件引用
```

差异优先的智能体工作流：对于智能体提议的编辑，使用工具 `capture_propose_change` 创建“待处理提案”，返回 proposalId；UI 渲染差异；`capture_apply_proposal(proposalId)` 持久化。这防止盲目覆盖。

## 13. 测试（宿主冒烟计划）

脚本 `tests/host-smoke.mjs`：

1. 将 DSH_HOME 设为临时目录（设环境变量）和基本 profile？实际上宿主冒烟可能模拟 ctx。按 dsh-archived：创建临时 DSH_HOME + 假 ctx，加载 index.js 的 apply，调用服务。
2. 场景：创建项目 → 章节 → 5 个镜头 → 资产 → 绑定 → 模拟生成 → 导出 md → 重启加载 → 断言数量/数据。
3. 验证媒体文件存在。
4. 清理临时目录。

客户端冒烟：在 node 中加载工厂，带桩全局 `__ModuleLoader__` + React；断言不抛错？按 dsh-archived 的 client-smoke。

兼容性检查：提取/读取已安装的 app.asar？更简单：断言引用的服务名称/导出存在于 app 包中（轻量）。按 dsh-archived 的 compat-check（读取 app.asar）。我们将针对自己的导入进行定制。

## 14. 安装/开发工作流（Mac）

开发：

1. `mkdir -p /path/to/dev/capture`（本仓库）
2. `cd ~/.dsh/profiles/desktop`（profile）——但技能文档说不要手写 profile；使用 `plugin_manager install_bundle`。
   - 由于是开发，我们可以调用 `plugin_manager action=install_bundle target=/abs/path`（本地目录链接）。
3. 添加 HMR 根（可选）用于宿主代码变更：profile `cordis.patch.yml` 的 hmr 条目根包含仓库路径（技能/文档）。请求用户许可。
4. 重启 `dsh web`？如果配置了根，HMR 可能拾取宿主变更；客户端变更刷新浏览器。
5. 验证能力：`cordis_inspect_query` 服务名；设置显示条目；覆盖层打开。

后续发布：npm publish；`dsh plugin --profile web add ...`。

## 15. 回滚/迁移

- 每个实体上的版本字段（`schemaVersion`）。
- 加载时，若 `schemaVersion < current`，就地运行迁移器（`migrateV1toV2` 等）并写回。
- 迁移前保留备份 `.bak`。

## 16. 可观测性

- 宿主日志通过 `ctx.log`（命名空间 `capture`）。
- 指标通过可选产品分析（若存在，注入）。
- 默认无遥测。

## 17. 此处提出的开放问题 → 见 08

Q1（存储官方位置）、Q2（DeepSeek 图像生成可用性）等。

---

## 18. Phase 1 exact DSH API bindings (spec freeze update)

### 18.1 Host plugin services to declare

```js
export const inject = ["storage", "storageDomain", "webServer", "tools"];

export function apply(ctx, config) {
  // all registrations belong to ctx.effect...
}
```

### 18.2 Storage & domain

```js
import { defineDomain, domainTable } from "@deepseek-ai/dsh-storage-domain";
import { z } from "zod";

const CaptureSpec = defineDomain({
  name: "capture",
  version: 1,
  tables: {
    projects: domainTable(projectSchema),
    chapters: domainTable(chapterSchema),
    shots: domainTable(shotSchema),
    assets: domainTable(assetSchema),
    generations: domainTable(generationSchema),
    trailers: domainTable(trailerSchema),
  },
});

const memory = await ctx.storageDomain.open(CaptureSpec);
```

### 18.3 Host tools (register via `ctx.tools.register(defineTool(...))`)

Prefix: `capture.*`

- `capture_project.create` params `{ name, genre?, logline? }`
- `capture_project.list` params `{}`
- `capture_project.get` params `{ projectId }`
- `capture_chapter.create` params `{ projectId, title?, index? }`
- `capture_chapter.update` params `{ projectId, chapterId, patch }`
- `capture_shotlist.generate` params `{ projectId, chapterId, targetDurationSec? }`
- `capture_shot.update` params `{ projectId, shotId, patch }`
- `capture_asset.create` params `{ projectId, kind, name, description, traits? }`
- `capture_asset.bind` params `{ projectId, assetId, shotId, role }`
- `capture_generation.request` params `{ kind, sourceShotId?, assetId?, params }` (Phase 2 mock)
- `capture_trailer.create` params `{ projectId, beatShotIds[], style, durationTargetSec? }` (Phase 3)
- `capture_export` params `{ projectId, format: "md" | "csv" }` (Phase 1 text only)

Each tool returns a plain JSON result envelope shaped like `{ ok: boolean, ... }`; invalid IDs reject (`INVALID_PROJECT_ID`, `PROJECT_NOT_FOUND`) before execution.

### 18.4 Web routes (Phase 1 uses `ctx.webServer.register({ kind: "exact", ... })`)

All routes use the dsh-archived trust-report pattern (`loopback + Origin/Sec-Fetch-Site`).

<|message|> Method | Path | Contract |
|---|---|---|
| GET | `/api/capture/state` | `{ ok, projects:[{id,name,counts}], currentProjectId? }` |
| POST | `/api/capture/projects` | body `{ name, genre?, logline? }` |
| GET | `/api/capture/projects/:id` | `{ ok, project }` |
| POST | `/api/capture/chapters` | body `{ projectId, title?, index? }` |
| POST | `/api/capture/assets` | body `{ projectId, kind, name, description, traits? }` |
| POST | `/api/capture/exports` | body `{ projectId, format }` → `{ ok, url? }` (files only after export) |

### 18.5 Client state access (no Typert Phase 1/2)
Client uses same-origin `fetch` with `credentials: "same-origin"`. Every mutation calls the POST route and refreshes `stateOf(ctx)` server-side. Long waits are poll-only (`GET /api/capture/generations/:id`) with 1–2 second intervals.

### 18.6 Phase 1 host tasks checklist
- [ ] open domain
- [ ] define zod schemas
- [ ] implement atomic writes via domain (not manual FS)
- [ ] route trust gate + method gate + uniform JSON
- [ ] minimally 8 tool wrappers
- [ ] `ctx.systemPrompt.section("capture", ...)` to educate agents
- [ ] `tools-guard` deny invalid scope if necessary
- [ ] `ctx.log` scoped `capture`
