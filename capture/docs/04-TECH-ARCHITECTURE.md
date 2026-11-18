# Capture — 技术架构 (04)

## 1. 摘要

Capture 是 DeepSeek Harness (DSH) 的一个 **bundle 插件**，面向作家/编剧，对话优先创作（小说→分镜→图→视频→宣传片）。形态为 DSH Bundle，通过 profile 安装，分为 **宿主侧（Host half，`index.js`）与客户端侧（Client half，`client.js`）** 两半边，通过 Cordis 插件协议加载。

本文档记录技术架构：插件如何注册、如何加载、包含哪些内容、各半边分别做了什么，以及客户端—宿主数据流的具体走向。所有声明均已在真实 `desktop` profile 上安装并冒烟验证（见 `PROGRESS.md` §2 末）。阶段 2+ 的架构大类（AI 创作与多Agent、UI 与对话联动、数据与存储扩展等）已预留占位，待后续实现时补全。

---

## 2. 插件框架与骨架（阶段 1 已实现，最小骨架）

### 2.1 概述与形态

- DSH Bundle 插件，通过 `plugin_manager install_bundle target=/abs/path/to/capture` 安装到 profile，不要手动编辑 profile 的 `package.json`/`cordis.patch.yml`。
- Host + Client 双半边，通过 Cordis 插件协议加载。
- 纯 JS 工厂 bundle（无编译步骤），Host 为 ESM `apply(ctx, config)` 入口，Client 为 `window.__ModuleLoader__.load({...})` 工厂。

### 2.2 代码布局与文件结构

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

阶段 1 **不拆分** `host/` 子模块，全部逻辑内联在 `index.js`；待实体/章节/镜头/资产扩展时再拆分为 `host/storage.js`、`host/tools.js`、`host/services.js`、`host/agents.js` 等。

### 2.3 Host 侧架构（`index.js`）

`index.js` 导出 Cordis 风格的插件对象：

- **`inject` 硬依赖服务**：`["storage", "storageDomain", "webServer", "tools", "systemPrompt"]`
  - DSH Loader 在这些服务全部就绪后才激活该插件 fiber，避免启动竞态。
  - 五个服务名均与 DSH 实现一致（已在 `cordis_inspect_query Service.listService` 中确认）。
  - `storage`：存储中心（`@deepseek-ai/dsh-storage`），提供 `backend` 注册表与 `mount`/`form`。
  - `storageDomain`：已挂载的域设施（`@deepseek-ai/dsh-storage-domain`），提供 `open(spec)`、`get(name)`、`closeAll()`。
  - `webServer`：浏览器 HTTP 承载服务（`@deepseek-ai/dsh-host-webserver`），提供 `register(route)`、`getOrigin()`。
  - `tools`：模型面向工具注册与分发器（`@deepseek-ai/dsh-tools`），提供 `register(definition)` 返回 disposer。
  - `systemPrompt`：提示词章节注册表（`@deepseek-ai/dsh-system-prompt`），提供 `section(section)` 返回 disposer。

- **`apply(ctx, config)`**：插件入口，在依赖激活后执行，全部注册通过 `ctx.effect` 托管，卸载时逆序注销：
  1. 打开存储域 `"capture"`（版本 1，表 `projects/chapters/shots/assets/generations/trailers`，阶段 1 仅使用 `projects`）；若已打开则复用句柄，避免 `already-open` 导致整个 Host 崩溃。
  2. 注册 `systemPrompt` 章节 `"capture"`（`order: 100`），告知模型 Capture 存在及可用工具。
  3. 注册模型面向工具 `capture_project_create`、`capture_project_list`（`ctx.tools.register`），每个返回的 disposer 用 `ctx.effect` 托管。
  4. 注册同源 JSON 路由 `GET /api/capture/state`、`POST /api/capture/projects`（`ctx.webServer.register`），每个返回的 disposer 用 `ctx.effect` 托管。
  5. 注册 teardown effect：关闭路由、关闭存储域。

**P0 修复（ADR-016）**：`ctx.systemPrompt.section()` 返回的 disposer 必须通过 `ctx.effect(disposeSection, "capture:system-prompt-section")` 托管。此前未托管，导致插件重载/HMR 时重复注册同名章节，抛 `prompt section "capture" is already registered`，整个 Host 激活崩溃。修复后卸载时逆序注销，重载不再崩溃。

### 2.4 Client 侧架构（`client.js`）

`client.js` 使用客户端模块系统工厂模式（与 DSH shipped 包的 `lib/client.js` 格式一致）：

- `window.__ModuleLoader__.load({ id: "@local/capture", factory(require) {...} })`
  - `factory(require)` 内 `require("react")`，通过 React `createElement` 手写组件（不引入 `@deepseek-ai/dsh-client-ui-primitives` 作为运行时模块，符合 ADR-009）。
  - 返回 `{ inject: ["slots"], apply(ctx) {...} }`，由 `cordis-client-runner` 激活为客户端 Cordis 插件。
  - `apply(ctx)` 注册三个槽位：
    - `conversation.composer.dock`（`kind: list, scope: session`）：底部徽章 "Capture N project(s)"，轻量状态入口。
    - `sidebar.panellist`（`kind: list, scope: root`）：左侧全局导航 "Capture" 图标，点击打开/关闭 Capture工作室面板。
    - `shell.overlay`（`kind: list, scope: root`）：右侧 Capture工作室面板，右侧常驻。

### 2.5 区域设置与元数据

- `locale/en.json`、`locale/zh.json` 各含 `meta.title` / `meta.description`，供插件管理面板显示。
- `package.json` `dsh.client.inject` 声明客户端依赖 `@deepseek-ai/dsh-client-ui-conversation`、`@deepseek-ai/dsh-client-ui-workspace`、`@deepseek-ai/dsh-client-ui-settings`、`@deepseek-ai/dsh-client-locale`，平台 `web`，`immediately: true`。

### 2.6 加载顺序

1. DSH profile Loader 读取 `cordis.patch.yml` 的 insert 行 `id: capture, name: '@local/capture'`。
2. Loader 解析 `@local/capture`（通过 `plugin_manager install_bundle` 建立的 profile `node_modules` 链接）。
3. Host 纤维：按 `inject` 声明的服务依赖顺序激活，再执行 `apply(ctx, config)`，完成 storage/domain/tools/webServer/systemPrompt 注册。
4. Client 纤维：客户端模块系统加载 `client.js` 工厂，`apply(ctx)` 注册 `conversation.composer.dock` 槽位条目，页面渲染 `CapturePanel`。

---

## 3. 客户端—宿主数据流（S2 已验证）

- **通道**：Host `ctx.webServer.register` 暴露 `/api/capture/*` exact 路由；Client 通过同源 `fetch` 调用。阶段 1 **不引入 Typert / `@Remote`**，保持 plain bundle 形态（ADR-015/017）。
- **信任门限**：Host 路由处理前执行 `trustReport(request)`：`Sec-Fetch-Site: cross-site` 拒绝；`Origin: null` 拒绝；有 `Origin` 则比对 `host`；缺席 `Origin`（桌面壳转发/非浏览器客户端）放行。此模式复用 dsh-archived。
- **Body 解析**：POST 路由通过 `readJsonBody` 逐块读取并 `JSON.parse`，解析失败返回 `__parseError` → `HTTP 400 invalid-json-body`。
- **结果信封**：所有路由返回 `{ ok: boolean, ... }`，客户端根据 `ok` 决定是 optimistic update 还是展示错误。
- **进度**：阶段 1 仅同步返回；长生成（阶段 3）后续改为按 job ID 轮询 `GET`。
- **已验证**：Web GUI 页面与 Host 路由同源（`http://127.0.0.1:<port>`），`GET /api/capture/state` 返回 `HTTP 200 {"ok":true,"projects":[]}`；客户端面板显示 "Capture 0 project(s)"，说明客户端 fetch 路由无网络障碍。

---

## 4. AI 创作与多Agent 架构（阶段 1+ 预留）

### 4.1 智能体预设与技能

- 专用智能体：Story Manager（编排器：创建项目/章节/镜头清单，分叉，合并）、Outline Agent（节拍与结构）、Shot Director（从节拍/场景生成镜头清单）、Asset Manager（从文本创建/复用资产）、Consistency Agent（检查资产与镜头使用，报告不匹配，只读建议）、Gen Agent（图像/视频生成作业与提示词编译）、Trailer Agent（节拍选择与预告片编译）、Exporter（导出格式 + `present()`）。
- 工具面通过 `ctx.tools.register` 注册，工具名采用 snake_case，如 `capture_chapter_*`、`capture_shot_*`、`capture_asset_*`（ADR-018）。
- 重推理使用子智能体以保持主上下文精简（按实践 #28 — 后续）。
- 阶段 1 不另行注册 DSH 技能/智能体预设（ADR-005 禁止新增会话事件类型；Q5 留待 S3 验证是否可注册技能，否则用 `systemPrompt.section()` + 工具 `description` 让模型感知 `capture.*` 工具）。

### 4.2 上下文与记忆

- 项目是全局实体（跨会话），存储在主机 `ctx.storageDomain` 的 `capture` 域；会话仅存项目指针 + 智能体上下文 + 聊天（ADR-003）。
- 分叉 = 深克隆项目树（新 id 带 `origin` 指针）；撤销 = 基于日志回退最近 N 个操作（提案；存储层，阶段 1 不实现）。

### 4.3 多Agent 协作与编排

- 差异优先编辑（diff-first edits）：智能体绝不静默覆盖；提议的变更（创建/更新/删除）以差异形式展示，并提供接受/拒绝/修改。
- 提议/应用工具对（propose/apply tool pair）：`capture_propose_change` 创建“待处理提案”，返回 `proposalId`；UI 渲染差异；`capture_apply_proposal(proposalId)` 持久化（阶段 1+）。

### 4.4 预留接口与占位

- 技能注册 API（Q5 待验证）：插件能否注册技能/智能体预设，否则使用 `systemPrompt.section()` + 工具描述。
- 子智能体调度预留；多Agent 协作编排细节待阶段 2 实现时补全。

---

## 5. UI 与对话联动架构（阶段 2+ 待扩展）

### 5.1 客户端侧 UI 槽位

- `shell.overlay`（`kind: list, scope: root`）：右侧 Capture工作室面板，右侧常驻。宽侧板的具体布局待阶段 2 实现 `StudioPanel` 时确认（ADR-012）。
- `sidebar.panellist`（`kind: list, scope: root`）：左侧全局导航 "Capture" 图标入口，点击打开/关闭 Capture工作室面板。
- `conversation.composer.dock`（`kind: list, scope: session`）：底部徽章 "Capture N project(s)"，轻量状态入口。
- `settings.general.item`（阶段 2+）：Capture 提供商/配置页面。

### 5.2 UI 与对话联动

- 联动开关（默认关闭）：打开后，对话框讨论中的镜头/章节会自动高亮并跳转到对应行；智能体提议的编辑在对应行显示“待审核”徽章。
- 智能体建议条（可折叠，显示差优先编辑建议，点击查看 diff 并接受/拒绝）。
- 章节切换器（下拉选择器）、项目/资产标签页切换。

### 5.3 客户端组件预留

- `CapturePanel`（composer dock 徽章）：React 函数组件，`useState({ projects, error, loading })`，`useEffect` 挂载时 `fetch("/api/capture/state")`，通过 `safeJson` 解析。
- `StudioPanel`（右侧 Capture工作室面板）：`shell.overlay` 注册，固定宽度，右侧常驻。左侧为 Capture工作室左侧区（项目/资产列表），右侧为 Capture工作室右侧故事板（故事大纲 + 世界观与人物设定 + 分镜脚本表格）。

### 5.4 预留占位

- 资产详情弹出对话框、空状态提示、资产横向 Tab（角色/场景/物品）、分镜脚本表格横向滑动与行内编辑等 UI 细节，设计见 `02-PRODUCT-DESIGN.md` / `03-UI-DESIGN.md`，代码待阶段 1 扩展时实现。

---

## 6. 数据与存储架构（阶段 1 已实现，持续扩展）

### 6.1 存储域设计

- 域名 `capture`，版本 1，表 `projects`、`chapters`、`shots`、`assets`、`generations`、`trailers`。
- 阶段 1 因插件包不可将 `@deepseek-ai/dsh-storage-domain` 及 `zod` 作为 pnpm 依赖（ADR-019），内联了 `defineDomain` / `domainTable` 微型构建器，并使用 passthrough schema `{ parse: (v) => v }`，让 `storageDomain.loadAll()` / `put()` 先能工作；真正的 Zod 校验留待后续阶段补上。
- 阶段 1 仅操作 `projects` 表：`put(id, { name, genre, logline, createdAt, updatedAt })`、`entries()` 遍历。
- 记录 ID 用 `crypto.randomUUID()`，时间戳用 `Date.now()`。

### 6.2 实体与字段

每个实体通用字段：`id`、`name`、`genre`、`logline`、`createdAt`、`updatedAt`。

- `Project { id, name, genre, logline, audience?, tone?, stylePackId?, createdAt, updatedAt, chapters: [ChapterId], assets: [AssetId] }`
- `Chapter { id, projectId, index, title, synopsis, beats[], status, text(md), wordCount }`
- `Shot { id, projectId, chapterId?, sceneId?, order, durationSec, type, description, dialogue?, camera, transition?, audio?, sfx?, music?, assetBindings, generation?, variants? }`
- `Asset { id, projectId, kind: character|prop|location|stylePack, name, description, referenceImages: [fileRef], tags[], traits, identityLockPrompt (generated), version, createdAt, updatedAt, usedBy: [{ shotId, role }] }`
- `Generation { id, kind, sourceShotId?, assetId?, status, progress, startedAt, finishedAt, params, outputs: [fileRef], provenance }`（阶段 2+）
- `Trailer { id, projectId, style, durationTargetSec, beats, titleCards[], status, outputs: [mp4Ref], progress }`（阶段 3+）

### 6.3 全局存储与会话指针

- **按会话 vs 全局**：项目是全局实体（跨会话），媒体文件是全局的。会话只持有当前“工作集”指针 + 智能体上下文 + 聊天（ADR-003）。
- 存储路径由 DSH profile 配置的存储后端决定，插件不自建文件树，也不直接读写存储文件（ADR-010）。
- 媒体：通过 DSH 交付物/引用服务提供文件引用，具体路径由存储后端决定。

### 6.4 事件溯源考虑

按 DSH 实践：会话日志是事实来源。项目位于主机存储（域存储），不在会话日志中。为了让智能体重放和智能体分叉工作安全：

- 插件存储是项目的单一事实来源（SSOT）；会话仅引用 projectId。
- 会话可以分叉项目 → 新 projectId（插件存储中深拷贝）或“分支”指针。每个会话的插件存储变更记录为 Operation 记录（日志），以便撤销可用。
- 生成结果在聊天中作为插件记录引用；避免新增会话事件类型（实践 #16 说不要追加 `type: new`）。改用现有 `assistant/message` + `tool/result` 事件；在主机存储 Generation 数据库行。智能体通过工具结果看到。

---

## 7. 安全与隐私

- 除非配置了提供商 + 用户选择加入，否则无外部调用。
- 所有媒体本地；生成提示词可能包含发送给提供商的用户内容（显式）。
- 角色：会话中任何智能体可调用工具；宿主存储全局 → 智能体可读取所有项目（v1 可接受；后续可能限定范围）。
- API 密钥仅通过环境变量（`DSH_CAPTURE_*`），绝不在存储中。
- 路由信任门限：`trust gate` 拒绝跨站与 `Origin: null` 请求，缺席 `Origin`（桌面壳/非浏览器客户端）放行。

---

## 8. 测试策略

- 宿主冒烟：临时 `DSH_HOME`；创建项目/章节/镜头/资产；模拟生成；导出；重启读取。
- 客户端冒烟：工厂渲染（桩 React/fetch）按 dsh-archived 的 client-smoke。
- 兼容性检查：读取 app.asar 并断言服务 API（已对 `storage`/`storageDomain`/`webServer`/`tools`/`systemPrompt` 及 `/api/capture/*` 路由通过 `cordis_inspect_query` 验证）。
- 端到端（真实 `dsh web`）：阶段 1 已手动通过（安装 → 工具可见 → 路由 200 → 客户端面板渲染）。
- `tests/` 目录当前为空，待补充 `host-smoke.mjs`、`client-smoke.mjs`、`compat-check.mjs`。

---

## 9. 已知问题与修复记录（阶段 1）

| ID | 问题 | 影响 | 修复 | 提交 |
|---|---|---|---|---|
| P0 | `ctx.systemPrompt.section()` 返回的 disposer 未被 `ctx.effect` 托管 | 插件重载/HMR 时重复注册 `"capture"` 章节，抛 `already registered`，整个 Host 激活崩溃 | 通过 `ctx.effect(disposeSection, "capture:system-prompt-section")` 托管，卸载时逆序注销 | `12a685e49a` |
| P1-a | 工具使用 `zod` + `@deepseek-ai/dsh-storage-domain` 作为插件包依赖 | 插件包不可将 DSH 内部 bundle 与 `zod` 声明为 pnpm 依赖，加载会失败 | 内联 `defineDomain`/`domainTable`，使用 passthrough schema，工具名改为 snake_case 直接 `ctx.tools.register` | `c1e7dee24d` |
| P1-b | 工具名使用点分式 `capture.project.create` | 不符合 DSH 工具名校验（a-z/A-Z/0-9/underscore/dash） | 改为 `capture_project_create`、`capture_project_list` | `c1e7dee24d` |
| P1-c | 客户端 `res.json()` 直接解析响应 | 非 JSON 响应（纯文本错误页）会抛未捕获异常，客户端崩溃 | 引入 `safeJson`，对非 JSON 返回 `{ ok: false, error: "HTTP_<status>", message }` | `c1e7dee24d` |

阶段 1 遗留风险（非阻塞）：desktop 平台下 `dsh.client.platform: "web"` 的客户端加载匹配、客户端模块加载时机（已在真实 Web GUI 上验证通过，面板正常渲染）。

---

## 10. 扩展点预留

- 槽位：`sidebar.workspaces.session.menu.item`、`shell.overlay`（已注册框架，宽侧板布局待阶段 2 确认）、`settings.general.item`、`conversation.input.dock`。
- 工具：`capture_project.get/update/delete`、`capture_chapter.*`、`capture_shot.*`、`capture_asset.*`、`capture_propose_change`、`capture_apply_proposal` 等。
- 路由：`GET /api/capture/projects/:id/state`、`POST /api/capture/chapters`、`POST /api/capture/shots`、`POST /api/capture/assets`、`POST /api/capture/generations`、`GET /api/capture/generations/:id`、`POST /api/capture/trailers`、`POST /api/capture/exports`。
- 提示词：`ctx.systemPrompt.section({ name: "capture", order: 100, text })`。
