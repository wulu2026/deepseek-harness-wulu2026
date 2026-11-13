# Capture — 技术架构 (04)

## 1. 摘要

Capture 是 DeepSeek Harness (DSH) 的一个 **bundle 插件**，面向作家/编剧，对话优先创作（小说→分镜→图→视频→宣传片）。形态为 DSH Bundle，通过 profile 安装，分为 **宿主侧（Host half，`index.js`）与客户端侧（Client half，`client.js`）** 两半边，通过 Cordis 插件协议加载。

本文档记录阶段 1 完成后的真实架构：插件如何注册、如何加载、包含哪些内容、各半边分别做了什么，以及客户端—宿主数据流的具体走向。所有声明均已在真实 `desktop` profile 上安装并冒烟验证（见 `PROGRESS.md` §2 末）。

---

## 2. 代码布局（阶段 1）

```text
@local/capture
├─ package.json          # dsh.bundle.patch + dsh.client（声明 client 平台 web、immediately、inject 客户端包）
├─ cordis.patch.yml      # Loader patch：insert 行 id=capture，name='@local/capture'
├─ index.js              # Host apply()：开 storage domain、注册 capture.* 工具、注册 /api/capture/* 路由、注册 systemPrompt 章节
├─ client.js             # Client 工厂：window.__ModuleLoader__.load({id, factory(require)})，渲染 CapturePanel 到 conversation.composer.dock
├─ locale/en.json        # 英文 UI 字典（meta.title/description）
├─ locale/zh.json        # 中文 UI 字典（meta.title/description）
├─ icon.svg              # 插件图标（≤ 256KiB）
└─ tests/                # 空，阶段 1 待补充 host-smoke.mjs / client-smoke.mjs / compat-check.mjs
```

阶段 1 **不拆分** `host/` 子模块，全部逻辑内联在 `index.js`；待实体/章节/镜头/资产扩展时再拆分为 `host/storage.js`、`host/models.js`、`host/services.js`、`host/tools.js`、`host/agents.js`。

安装方式：`plugin_manager install_bundle target=/abs/path/to/capture`（绝对路径，本地目录链接），不要手动编辑 profile 的 `package.json`/`cordis.patch.yml`。

---

## 3. 插件注册与加载机制

### 3.1 Cordis 插件协议（Host 半边 `index.js`）

`index.js` 导出 Cordis 风格的插件对象：

- `export const inject = ["storage", "storageDomain", "webServer", "tools", "systemPrompt"]`
  - 声明硬依赖服务，DSH Loader 在这些服务全部就绪后才激活该插件 fiber，避免启动竞态。
  - 五个服务名均与 DSH 实现一致（已在 `cordis_inspect_query Service.listService` 中确认）：
    - `storage`：存储中心（`@deepseek-ai/dsh-storage`），提供 `backend` 注册表与 `mount`/`form`。
    - `storageDomain`：已挂载的域设施（`@deepseek-ai/dsh-storage-domain`），提供 `open(spec)`、`get(name)`、`closeAll()`。
    - `webServer`：浏览器 HTTP 承载服务（`@deepseek-ai/dsh-host-webserver`），提供 `register(route)`、`getOrigin()`。
    - `tools`：模型面向工具注册与分发器（`@deepseek-ai/dsh-tools`），提供 `register(definition)` 返回 disposer。
    - `systemPrompt`：提示词章节注册表（`@deepseek-ai/dsh-system-prompt`），提供 `section(section)` 返回 disposer。
- `export async function apply(ctx, config)`：插件入口，在依赖激活后执行，执行以下注册（全部通过 `ctx.effect` 托管，卸载时逆序注销，见 §3.6）：
  1. 打开存储域 `"capture"`（版本 1，表 `projects/chapters/shots/assets/generations/trailers`，阶段 1 仅使用 `projects`）；若已打开则复用句柄，避免 `already-open` 导致整个 Host 崩溃。
  2. 注册 `systemPrompt` 章节 `"capture"`（`order: 100`），告知模型 Capture 存在及可用工具。
  3. 注册模型面向工具 `capture_project_create`、`capture_project_list`（`ctx.tools.register`），每个返回的 disposer 用 `ctx.effect` 托管。
  4. 注册同源 JSON 路由 `GET /api/capture/state`、`POST /api/capture/projects`（`ctx.webServer.register`），每个返回的 disposer 用 `ctx.effect` 托管。
  5. 注册 teardown effect：关闭路由、关闭存储域。

### 3.2 Cordis 插件协议（Client 半边 `client.js`）

`client.js` 使用客户端模块系统工历模式（与 DSH shipped 包的 `lib/client.js` 格式一致）：

- `window.__ModuleLoader__.load({ id: "@local/capture", factory(require) {...} })`
  - `factory(require)` 内 `require("react")`，通过 React `createElement` 手写组件（不引入 `@deepseek-ai/dsh-client-ui-primitives` 作为运行时模块，符合 ADR-009）。
  - 返回 `{ inject: ["slots"], apply(ctx) {...} }`，由 `cordis-client-runner` 激活为客户端 Cordis 插件。
  - `apply(ctx)` 内 `ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register({ name: "conversation.composer.dock", id: "capture", order: 4 }, CapturePanel))`，把 `CapturePanel` 注入会话作曲家 dock 槽位（`kind: list, scope: session`，已在 `dsh-client-ui-conversation` 中声明）。

### 3.3 区域设置与元数据

- `locale/en.json`、`locale/zh.json` 各含 `meta.title` / `meta.description`，供插件管理面板显示。
- `package.json` `dsh.client.inject` 声明客户端依赖 `@deepseek-ai/dsh-client-ui-conversation`、`@deepseek-ai/dsh-client-ui-workspace`、`@deepseek-ai/dsh-client-ui-settings`、`@deepseek-ai/dsh-client-locale`，平台 `web`，`immediately: true`。

### 3.4 加载顺序

1. DSH profile Loader 读取 `cordis.patch.yml` 的 insert 行 `id: capture, name: '@local/capture'`。
2. Loader 解析 `@local/capture`（通过 `plugin_manager install_bundle` 建立的 profile `node_modules` 链接）。
3. Host 纤维：按 `inject` 声明的服务依赖顺序激活，再执行 `apply(ctx, config)`，完成 storage/domain/tools/webServer/systemPrompt 注册。
4. Client 纤维：客户端模块系统加载 `client.js` 工厂，`apply(ctx)` 注册 `conversation.composer.dock` 槽位条目，页面渲染 `CapturePanel`。

---

## 4. 宿主侧（Host half，`index.js`）具体实现

### 4.1 存储域（`ctx.storageDomain`）

- 域名 `capture`，版本 1，声明表 `projects`、`chapters`、`shots`、`assets`、`generations`、`trailers`。
- 阶段 1 因插件包不可将 DSH 内部 bundle `@deepseek-ai/dsh-storage-domain` 及 `zod` 作为 pnpm 依赖（ADR-019），内联了 `defineDomain` / `domainTable` 微型构建器，并使用 passthrough schema `{ parse: (v) => v }`，让 `storageDomain.loadAll()` / `put()` 先能工作；真正的 Zod 校验留待后续阶段补上。
- 阶段 1 仅操作 `projects` 表：`put(id, { name, genre, logline, createdAt, updatedAt })`、`entries()` 遍历。
- 记录 ID 用 `crypto.randomUUID()`，时间戳用 `Date.now()`。

### 4.2 模型面向工具（`ctx.tools.register`）

工具名采用 snake_case（`capture_project_create`、`capture_project_list`），符合 DSH 工具名校验（a-z/A-Z/0-9/underscore/dash），见 ADR-018。

每个工具声明：
- `name`、`description`、`parameters`（JSON Schema 受限子集，`type: object`，`additionalProperties: false`）。
- `output`：`{ schema: { type: "object" }, render: (_args, value) => [{ type: "text", text: JSON.stringify(value) }] }`，`render` 产出 `TextBlock`（`{type: "text", text: string}`）。
- `execute(args, exec)`：异步执行，返回 `{ ok: boolean, ... }` 结果信封。

阶段 1 已实现：
- `capture_project_create({ name, genre?, logline? })` → 校验 name 非空，写入 `projects` 表，返回 `{ ok: true, project: { id, name, createdAt } }`。
- `capture_project_list({})` → 读取 `projects` 表全部条目，返回 `{ ok: true, projects: [{ id, name, genre, createdAt }] }`。

### 4.3 Web 路由（`ctx.webServer.register`）

阶段 1 提供两条 exact 路由（均同源信任门限，见 §5）：

| 方法 | 路径 | 处理 |
|---|---|---|
| GET | `/api/capture/state` | 返回 `{ ok: true, projects: [{id, name, genre, createdAt}] }` |
| POST | `/api/capture/projects` | body `{ name, genre?, logline? }`，校验 name，写入 `projects`，返回 `{ ok: true, project: {...} }` |

每条路由返回的 disposer 用 `ctx.effect` 托管；处理函数统一捕获异常并返回 `HTTP 500 { ok: false, error: "CaptureInternalError", message }`；非 JSON POST body 返回 `HTTP 400 { ok: false, error: "invalid-json-body" }`；非匹配 method 返回 `HTTP 405`。

### 4.4 系统提示词章节（`ctx.systemPrompt.section`）

注册章节 `"capture"`，`order: 100`，文本说明 Capture 是故事/分镜/预告片创作工作区，指导模型使用 `capture_project_create/list`，并提示“未经用户指示，不要擅自修改项目”。

**P0 修复（ADR-016）**：`ctx.systemPrompt.section()` 返回的 disposer 必须通过 `ctx.effect(disposeSection, "capture:system-prompt-section")` 托管。此前未托管，导致插件重载/HMR 时重复注册同名章节，抛 `prompt section "capture" is already registered`，整个 Host 激活崩溃。修复后卸载时逆序注销，重载不再崩溃。

### 4.5 生命周期与清理

所有注册（工具、路由、systemPrompt 章节、存储域句柄）均通过 `ctx.effect` 关联一个 disposer，插件卸载时逆序执行：先注销路由、再关闭存储域。存储域复用已打开句柄（`ctx.storageDomain.get("capture")`），避免 `already-open`。

---

## 5. 客户端侧（Client half，`client.js`）具体实现

### 5.1 组件 `CapturePanel`

- React 函数组件，`useState({ projects: [], error: null, loading: true })`。
- `useEffect` 在挂载时 `fetch("/api/capture/state", { credentials: "same-origin" })`，通过 `safeJson` 解析（见 §5.2），成功则设置 `projects`，失败则设置 `error`；卸载时置 `active = false` 防止状态更新。
- 渲染为内联 flex 条，显示 "Capture" + "loading…" / "N project(s)"，错误时以危险色显示错误码。
- 样式使用 CSS 变量令牌（`--dsw-alias-fg-default`、`--dsw-alias-stroke-default`、`--dsw-alias-danger-default`），不硬编码颜色。

### 5.2 `safeJson` 响应解析（P1 防护）

对非 JSON 响应（如纯文本错误页）返回 `{ ok: false, error: "HTTP_<status>", message: <前 200 字符> }`，避免 `res.json()` 解析纯文本抛出未捕获异常崩溃客户端（已在 `c1e7dee24d` 中引入）。

### 5.3 槽位注册

`ctx.slots.inject("conversation.composer.dock", ...)` 注册 `{ name: "conversation.composer.dock", id: "capture", order: 4 }`，`CapturePanel` 渲染于会话作曲家 dock（输入框下方的 ambient 区域）。

---

## 6. 客户端—宿主数据流（S2 已验证）

- **通道**：Host `ctx.webServer.register` 暴露 `/api/capture/*` exact 路由；Client 通过同源 `fetch` 调用。阶段 1 **不引入 Typert / `@Remote`**，保持 plain bundle 形态（ADR-015/017）。
- **信任门限**：Host 路由处理前执行 `trustReport(request)`：`Sec-Fetch-Site: cross-site` 拒绝；`Origin: null` 拒绝；有 `Origin` 则比对 `host`；缺席 `Origin`（桌面壳转发/非浏览器客户端）放行。此模式复用 dsh-archived。
- **Body 解析**：POST 路由通过 `readJsonBody` 逐块读取并 `JSON.parse`，解析失败返回 `__parseError` → `HTTP 400 invalid-json-body`。
- **结果信封**：所有路由返回 `{ ok: boolean, ... }`，客户端根据 `ok` 决定是 optimistic update 还是展示错误。
- **进度**：阶段 1 仅同步返回；长生成（阶段 3）后续改为按 job ID 轮询 `GET`。
- **已验证**：Web GUI 页面与 Host 路由同源（`http://127.0.0.1:<port>`），`GET /api/capture/state` 返回 `HTTP 200 {"ok":true,"projects":[]}`；客户端面板显示 "Capture 0 project(s)"，说明客户端 fetch 路由无网络障碍。

---

## 7. 生成管道（概览，阶段 2+）

```text
UI/Agent
  -> capture.generateImage({ shotId|assetId, kind, params })
     -> Gen Agent 从资产身份锁定 + 风格 + 镜头编译提示词
     -> MediaProvider.generateImage -> 文件
     -> 记录 Generation 行 + 链接到 Shot/Asset（版本递增）
     -> 发出变更事件 -> UI 更新；作业进度
```

视频：
- 镜头视频：提供商图生视频或文生视频（取决于能力）→ 存储片段
- 预告片：选择节拍 → 生成标题卡（可选）→ ffmpeg 拼接/裁剪/转码 → 最终 mp4 带音轨占位 → 证书/来源清单（JSON）

提供商接口与模拟实现位于后续阶段，阶段 1 不做生成。

---

## 8. 智能体预设 / 技能（阶段 1 决定）

阶段 1 通过 `ctx.systemPrompt.section("capture", ...)` + 工具 `description` 让模型感知 `capture.*` 工具，不另行注册 DSH 技能/智能体预设（ADR-005 禁止新增会话事件类型；Q5 留待 S3 验证是否可注册技能）。

---

## 9. 性能与 UX

- 所有长操作作为作业；UI 通过轮询/订阅读取进度（阶段 3）。
- 避免轮询智能体/状态；使用作业状态。
- 重列表：稍后通过 DSH 分块列表处理；媒体缩略图通过文件引用懒加载。

---

## 10. 安全与隐私

- 除非配置了提供商 + 用户选择加入，否则无外部调用。
- 所有媒体本地；生成提示词可能包含发送给提供商的用户内容（显式）。
- 角色：会话中任何智能体可调用工具；宿主存储全局 → 智能体可读取所有项目（v1 可接受；后续可能限定范围）。
- API 密钥仅通过环境变量（`DSH_CAPTURE_*`），绝不在存储中。

---

## 11. 测试

- 宿主冒烟：临时 `DSH_HOME`；创建项目/章节/镜头/资产；模拟生成；导出；重启读取。
- 客户端冒烟：工厂渲染（桩 React/fetch）按 dsh-archived 的 client-smoke。
- 兼容性检查：读取 app.asar 并断言服务 API（已对 `storage`/`storageDomain`/`webServer`/`tools`/`systemPrompt` 及 `/api/capture/*` 路由通过 `cordis_inspect_query` 验证）。
- 端到端（真实 `dsh web`）：阶段 1 已手动通过（安装 → 工具可见 → 路由 200 → 客户端面板渲染）。

`tests/` 目录当前为空，待补充 `host-smoke.mjs`、`client-smoke.mjs`、`compat-check.mjs`。

---

## 12. 已知问题与修复记录（阶段 1）

| ID | 问题 | 影响 | 修复 | 提交 |
|---|---|---|---|---|
| P0 | `ctx.systemPrompt.section()` 返回的 disposer 未被 `ctx.effect` 托管 | 插件重载/HMR 时重复注册 `"capture"` 章节，抛 `already registered`，整个 Host 激活崩溃 | 通过 `ctx.effect(disposeSection, "capture:system-prompt-section")` 托管，卸载时逆序注销 | `12a685e49a` |
| P1-a | 工具使用 `zod` + `@deepseek-ai/dsh-storage-domain` 作为插件包依赖 | 插件包不可将 DSH 内部 bundle 与 `zod` 声明为 pnpm 依赖，加载会失败 | 内联 `defineDomain`/`domainTable`，使用 passthrough schema，工具名改为 snake_case 直接 `ctx.tools.register` | `c1e7dee24d` |
| P1-b | 工具名使用点分式 `capture.project.create` | 不符合 DSH 工具名校验（a-z/A-Z/0-9/underscore/dash） | 改为 `capture_project_create`、`capture_project_list` | `c1e7dee24d` |
| P1-c | 客户端 `res.json()` 直接解析响应 | 非 JSON 响应（纯文本错误页）会抛未捕获异常，客户端崩溃 | 引入 `safeJson`，对非 JSON 返回 `{ ok: false, error: "HTTP_<status>", message }` | `c1e7dee24d` |

阶段 1 遗留风险（非阻塞）：desktop 平台下 `dsh.client.platform: "web"` 的客户端加载匹配、客户端模块加载时机（已在真实 Web GUI 上验证通过，面板正常渲染）。

---

## 13. 扩展点摘要（阶段 1 已验证子集）

- 槽位：`conversation.composer.dock`（`kind: list, scope: session`，`id: capture, order: 4`）
- 工具：`capture_project_create`、`capture_project_list`（`ctx.tools.register`）
- 存储：`ctx.storageDomain.open("capture")` / `.get("capture")` / `.table("projects")`
- 路由：`ctx.webServer.register({ kind: "exact", path: "/api/capture/*" })`
- 提示词：`ctx.systemPrompt.section({ name: "capture", order: 100, text })`

阶段 2+ 拟追加：`sidebar.workspaces.session.menu.item`、`shell.overlay`、`settings.general.item`、`conversation.input.dock`；`capture_project.get/update/delete`、`capture_chapter.*`、`capture_shot.*`、`capture_asset.*` 等工具与路由。
