# Capture — 技术实现 (05)

本文档记录阶段 1 已完成的真实实现：插件怎么注册、怎么加载、包含哪些内容、各半边分别做了什么，以及阶段 1 修复的全部问题。所有声明均已在真实 `desktop` profile 上安装并冒烟验证（见 `PROGRESS.md` §2 末）。文档按实施阶段组织，尚未做的部分预留占位。

与代码保持一致：如需改动 `index.js`/`client.js`/`package.json`/`cordis.patch.yml`，必须先同步更新本文档的 spec freeze（§10）。

---

## 1. 阶段划分与实现概览

| 阶段 | 目标 | 状态 |
|---|---|---|
| 阶段 0 | 技术验证（S1 存储、S2 客户端—宿主数据流；S3/S4/S5 待做） | 已完成 S1/S2 |
| 阶段 1 | MVP-A：最小骨架（Host/Client 框架、项目 CRUD 工具与路由、composer dock 徽章、sidebar 入口、rightbar 右侧侧边栏页面框架） | 已完成 |
| 阶段 1+ | 扩展实现：章节/镜头/资产 CRUD 工具与路由、客户端面板扩展（资产网格、分镜表格、顶部栏、建议条等） | 待定 |
| 阶段 2 | MVP-B：图像生成（模拟 + HTTP 提供商）、身份锁定、来源追溯 | 待定 |
| 阶段 3 | MVP-C：视频生成、预告片编译（ffmpeg）、`present()` 交付物 | 待定 |
| 阶段 4 | 打磨与公开：多提供商比价、分支对比 UI、时间线编辑器、模板/市场 | 待定 |

---

## 2. 阶段 0 技术验证（先做，阻塞实现）

在编写任何宿主服务代码之前，先运行这些小型提取/探测。输出到 `capture/docs/spikes/`。

### S1 存储 API ✅ 已完成

- 提取 `dsh-storage`、`dsh-storage-domain`、`dsh-storage-json` 的 README。确定：插件通过 `ctx.storageDomain.open(CaptureSpec)` 注册存储域；目录路径由后端决定（插件不自建 IO，ADR-003/010 锁定）；事务/原子写入由 domain 层的单写链保证；从宿主通过 `domain.table(name).put/get/entries` 读写。
- 交付物：`capture/docs/spikes/S1-storage.md`，含代码片段。
- 对 ADR 影响：ADR-003（全局项目存储）已锁定，ADR-010（数据文件路径待定）已解，使用 storage-domain 而非自建 `$DSH_HOME/capture/` 文件树。

### S2 客户端—宿主数据流 ✅ 已完成

- 客户端如何对宿主服务调用：阶段 1 使用 `ctx.webServer.register({ kind: "exact", path, handler })` 暴露 `/api/capture/*` JSON 路由，客户端用同源 `fetch` 调用。**不引入 Typert / `@Remote`**（ADR-015/017）。
- 安全门：直接复制 dsh-archived 的 trust pattern（loopback + `Origin`/`Sec-Fetch-Site`，缺信号拒绝），POST JSON body via `readJsonBody`。
- 交付物：`capture/docs/spikes/S2-client-host.md`。
- 对 ADR 影响：ADR-015（Host exposure via webServer exact routes，不采用 Typert）已锁定。

### S3 插件的智能体预设/技能 — 待做（Q5）

- 插件能否注册技能/智能体预设；若不能，使用 `systemPrompt.section()` + 工具描述。阶段 1 已采用后者。

### S4 作业 API — 待做（Q6）

- 检查 `dsh-jobs` 包：作业创建/进度/取消。

### S5 媒体/图像提供商 — 待做（Q2）

- 检查 DeepSeek 账户服务（是否暴露图像生成？）+ 已配置的 LLM 提供商。决定模拟 HTTP 提供商的形态。

对每个技术验证：落盘到 `capture/docs/spikes/SX-*.md`，记录命令/路径以便复现。后续在实时运行中使用 `cordis_inspect_query` 作为权威。

---

## 3. 阶段 1 已完成实现（最小骨架）

### 3.1 Host 侧（`index.js`）

- 存储域 `"capture"`：版本 1，表 `projects/chapters/shots/assets/generations/trailers`；阶段 1 仅操作 `projects` 表；内联 `defineDomain` / `domainTable` 微型构建器，使用 passthrough schema `{ parse: (v) => v }`（ADR-019，不引入 zod）。
- 模型面向工具：`capture_project_create({ name, genre?, logline? })`、`capture_project_list({})`，snake_case 命名（ADR-018），`ctx.tools.register` 返回的 disposer 经 `ctx.effect` 托管。
- Web 路由：`GET /api/capture/state`、`POST /api/capture/projects`，`ctx.webServer.register({ kind: "exact", ... })`；trust gate + method gate + 统一 JSON 信 envelop；异常返回 `HTTP 500 { ok: false, error: "CaptureInternalError", message }`；非 JSON POST body 返回 `HTTP 400 invalid-json-body`；非匹配 method 返回 `HTTP 405`。
- systemPrompt 章节：`ctx.systemPrompt.section({ name: "capture", order: 100, text })`，返回的 disposer 经 `ctx.effect` 托管（P0 修复，ADR-016）。
- 生命周期与清理：teardown effect 注销路由、关闭存储域；存储域句柄复用（`ctx.storageDomain.get("capture")`），避免 `already-open`。

### 3.2 Client 侧（`client.js`）

- 客户端模块系统工厂模式：`window.__ModuleLoader__.load({ id: "@local/capture", factory(require) {...} })`；`factory(require)` 内 `require("react")`，通过 React `createElement` 手写组件，不引入 `@deepseek-ai/dsh-client-ui-primitives` 作为运行时模块（ADR-009）。
- 三个槽位注册：
  - `conversation.composer.dock`（`id: capture, order: 4`）：`CapturePanel` 渲染底部徽章 "Capture N project(s)"。
  - `sidebar.panellist`（`id: capture.open, order: 450, label: "Capture"`）：`MenuEntry` 渲染左侧全局导航图标，点击打开/关闭 Capture工作室面板。
  - `rightbar` / `sidebar.right.pane.tab`（`key: capture`）：`StudioPanel` 渲染右侧 Capture工作室页面（当前代码中 `StudioPanel` 仅实现项目列表 + 新建表单，资产网格、分镜表格等 UI 待阶段 1+ 扩展）。
- `safeJson` 响应解析（P1 防护）：对非 JSON 响应返回 `{ ok: false, error: "HTTP_<status>", message: <前 200 字符> }`，避免 `res.json()` 解析纯文本崩溃客户端。
- 状态管理：`useState({ projects, error, loading })`；`useEffect` 挂载时 `fetch("/api/capture/state", { credentials: "same-origin" })`，通过 `safeJson` 解析，卸载时置 `active = false` 防止状态更新。

### 3.3 已验证证据（2026-11-11 安装后）

- `plugin_manager list_bundles`：`@local/capture` `enabled: true`、`installed: true`、`application: applied`。
- `cordis_inspect_query Tool.listTools`：含 `capture_project_create`、`capture_project_list`。
- `cordis_inspect_query Service.listService`：含 `storage`、`storageDomain`、`webServer`、`systemPrompt`、`tools`。
- `GET http://127.0.0.1:<port>/api/capture/state` → `HTTP 200 {"ok":true,"projects":[]}`。
- Web GUI composer dock 渲染 "Capture 0 project(s)" 面板。

### 3.4 阶段 1 修复的全部问题

| ID | 问题 | 修复 | 提交 |
|---|---|---|---|
| P0 | `ctx.systemPrompt.section()` 返回的 disposer 未被 `ctx.effect` 托管，重载/HMR 时崩溃 | 通过 `ctx.effect(disposeSection, "capture:system-prompt-section")` 托管 | `12a685e49a` |
| P1-a | 插件包依赖 DSH 内部 bundle 与 zod，加载失败 | 内联 `defineDomain`/`domainTable`，使用 passthrough schema | `c1e7dee24d` |
| P1-b | 工具名使用点分式，注册失败 | 改为 `capture_project_create`、`capture_project_list`（snake_case） | `c1e7dee24d` |
| P1-c | `inject` 漏声明 `systemPrompt` | 补入 `"systemPrompt"` | `c1e7dee24d` |
| P1-d | 重复打开同名存储域，抛 `already-open` | 先 `ctx.storageDomain.get("capture")` 复用已打开句柄 | `c1e7dee24d` |
| P1-e | 客户端 `res.json()` 解析非 JSON 响应崩溃 | 引入 `safeJson` | `c1e7dee24d` |
| P1-f | `trustReport` 信任门过严，拒绝桌面壳转发请求 | `Origin` 缺席时放行 | `c1e7dee24d` |

---

## 4. 阶段 1 实施计划（UI/UX 分步骤）

按以下顺序实现。UI/UX 设计见 `02-PRODUCT-DESIGN.md` / `03-UI-DESIGN.md`，此处仅记录实施步骤与状态。

| 步骤 | 内容 | 状态 |
|---|---|---|
| 1 | Capture工作室页面框架（右侧侧边栏工作区页面，key 为 `capture`） | 已完成 |
| 2 | Capture工作室左侧区：项目列表（名称、类型、一句话梗概、创建时间、最后修改时间）+ 新建项目弹窗 | 进行中 |
| 3 | Capture工作室左侧区：资产网格卡片（角色/场景/物品三类切换）+ 新建资产弹窗（名称、描述） | 待定 |
| 4 | Capture工作室右侧故事板：故事大纲 / 剧情摘要显示 | 待定 |
| 5 | Capture工作室右侧故事板：世界观与人物设定显示 | 待定 |
| 6 | Capture工作室右侧故事板：分镜脚本表格（编号、时长、景别+角度、运镜、画面描述、出场角色与动作、台词/旁白、音效/音乐、资产绑定、状态徽章，支持横向滑动、行内编辑） | 待定 |
| 7 | Capture工作室右侧故事板顶部：联动开关（占位，仅视觉反馈）+ 章节切换器 + 项目/资产标签 | 待定 |
| 8 | 底部智能体建议条（占位，不可交互） | 待定 |
| 9 | 全流程串联验证 | 待定 |

### 4.1 阶段 1 UI 子任务拆解（按实施顺序）

| 子任务 | 归属步骤 | 内容 | 状态 |
|---|---|---|---|
| 1.1 | 1 | 切换右侧侧边栏槽位（`shell.overlay` → `rightbar` / `sidebar.right.pane.tab`，key 为 `capture`） | 已完成 |
| 1.2 | 7 | StudioPanel 顶部栏 + 左右两列布局（联动开关 + 章节切换器 + 项目/资产标签；左侧区容器；右侧故事板三个区域占位） | 待定 |
| 2.1 | 2 | 左侧区项目列表行：名称（加粗）、类型标签（使用 primitives `Tag`）、一句话梗概（1 行溢出省略）、创建时间、最后修改时间；悬停高亮、选中背景加深 | 进行中 |
| 2.2 | 2 | 底部“新建项目”按钮（使用 primitives `Button` variant primary）+ 新建项目弹窗（使用 primitives `Modal`；表单使用 primitives `Input`；名称、类型、一句话梗概；底部 取消 / 保存；空状态提示） | 待定 |
| 2.3 | 2 | 新建项目提交：调用现有 `POST /api/capture/projects`，成功后刷新列表、清空表单 | 待定 |
| 3.1 | 3 | 资产网格卡片：上方横向 Tab（角色/场景/物品，使用 primitives `Pill`）；下方网格（2-3 列自适应）；每卡缩略图占位、名称、类型徽章（使用 primitives `Tag`）、版本；点击卡片弹出资产详情占位（使用 primitives `Modal`）；底部“新建资产”按钮（使用 primitives `Button`） | 待定 |
| 4.1 | 4 | 右侧故事板第一部分：故事大纲 / 剧情摘要（章节标题 + 一句话梗概 + 关键节拍列表，可折叠；暂无数据时空状态） | 待定 |
| 5.1 | 5 | 右侧故事板第二部分：世界观与人物设定（当前项目资产设定摘要，可折叠；阶段 1 静态占位） | 待定 |
| 6.1 | 6 | 右侧故事板第三部分：分镜脚本表格（10 列，横向滚动，行选中高亮，行内编辑占位，状态徽章/待审核徽章；暂无数据时空状态） | 待定 |
| 7.1 | 7 | 联动开关交互占位（可切换开/关，视觉反馈；第 1 阶段不做实际高亮跳转逻辑） | 待定 |
| 8.1 | 8 | 底部智能体建议条（可折叠，阶段 1 不可交互占位，文案“暂无智能体建议”） | 待定 |
| 9.1 | 9 | 全流程串联验证（`desktop` profile 安装成功，左侧 "Capture" 图标打开右侧侧边栏，中间对话框可见，项目列表 + 新建项目弹窗正常，无控制台报错） | 待定 |

### 4.2 客户端模块结构（阶段 1 扩展中）

为避免全部逻辑堆在 `client.js`，阶段 1 UI 扩展采用“入口工厂 + 子模块拆分”结构：

#### 4.2.1 目录结构

```
client.js                  # 入口工厂：window.__ModuleLoader__.load，require 各模块，apply(ctx) 注册槽位，只做组件拼装
client/
  index.js                 # 统一导出所有组件
  lib/
    api.js                 # 封装 fetch /api/capture/*（GET state, POST projects…），统一 credentials/safeJson/错误包装
    safeJson.js            # 安全 JSON 解析
  hooks/
    useCaptureProjects.js  # 封装 fetchProjects + loading/error 状态
  components/
    CapturePanel.js        # composer dock 徽章 “Capture N project(s)”
    MenuEntry.js           # 侧边栏入口按钮（点击打开右侧工作室）
    StudioPanel.js         # 右侧工作室页面容器：持有顶层状态，布局左右两列
    TopBar.js              # 顶部栏：联动开关 + 章节切换器 + 项目/资产标签
    LeftPanel.js           # 左侧区：项目列表 / 资源网格（按标签切换）
    RightBoard.js          # 右侧故事板：故事大纲 + 世界观设定 + 分镜表格
    ProjectList.js         # 项目列表（ProjectRow）
    ProjectRow.js          # 单行：名称、类型 Tag、梗概、时间、悬停/选中
    ProjectFormModal.js    # 新建项目弹窗（Modal + Input + Button）
    AssetGrid.js           # 资源网格卡片（阶段 2+）
    ShotTable.js           # 分镜脚本表格（10 列、横向滚动、状态徽章）
    AssetDetailModal.js    # 资产详情弹窗（阶段 1+）
    AgentSuggestionBar.js  # 底部智能体建议条（阶段 1+，占位）
```

#### 4.2.2 组件层级

```
StudioPanel（页面容器，持有全局状态）
├── TopBar（顶部栏：联动开关 / 章节切换器 / 项目资产标签）
├── LeftPanel（左侧区：项目列表 / 资源网格）
│   ├── ProjectList → ProjectRow
│   └── ProjectFormModal（弹窗，由 LeftPanel 控制显隐）
└── RightBoard（右侧故事板：故事大纲 / 世界观设定 / 分镜表格）
    └── ShotTable → ShotRow
```

#### 4.2.3 通信机制

- **状态上提 + props 向下 / 回调向上**（首选）：`StudioPanel` 持有 `projects`、`selectedProjectId`、`activeTab` 等顶层状态，通过 props 传给子组件，子组件只负责渲染并通过回调通知上层，彼此隔离，不直接引用。
- **轻量级发布/订阅总线**：用于非父子组件的跨层通信（如新建项目弹窗提交后通知右侧故事板刷新），几十行代码，不引入外部依赖。
- **API 层封装**：所有 `fetch("/api/capture/*")` 集中到 `client/lib/api.js`，统一加 `credentials: "same-origin"`、`safeJson` 解析、错误包装，组件只调用 `api.createProject` 等函数。
- **Modal 生命周期由父控制**：弹窗显隐由父组件状态控制，子组件只负责内部表单渲染，提交通过 `props.onSubmit` 回调。

#### 4.2.4 与 `client.js` 的衔接

`client.js` 是入口工厂，在 `apply(ctx)` 中把组件组合到 `conversation.composer.dock`、`sidebar.panellist`、`sidebar.right.pane.tab` 三个槽位，不再直接承载全部组件实现。入口 `factory(require)` 保持同步，包内动态 chunk 使用包根 `client.<name>.js` 文件名，并由组件 `React.lazy` 与 `require.async("./client.<name>.js")` 在挂载时加载；chunk 注册 `chunk: "client.<name>.js"`，不得使用同步相对 `require()` 或任意目录式 chunk 名。

#### 1.1 已确认事项

`rightbar` / `sidebar.right.pane.tab` 的开关机制已由 S2/Q4 确认：通过 `sidebar.panellist` 点击 `sidebarRight.openTab("capture")` 打开右侧 Capture工作室页面，中间对话框保持可见，右侧侧边栏随 DSH 窗口缩放（ADR-012）。

---

## 5. 阶段 2+ 预留实现

### 5.1 媒体提供商架构（阶段 2）

```js
// providers/base.js
export class MediaProvider {
  static id = 'base'
  capabilities() { return { image: false, video: false, maxDurationSec: 0 } }
  async generateImage(params) { throw }
  async generateVideo(params) { throw }
}
```

- `mock`（阶段 0-1）：开发时生成 SVG 占位图并存储；ffmpeg 仍可拼接（图像作为帧？需要从图像生成 mp4）。冒烟测试不需要真实媒体；1 秒黑色 mp4 通过 ffmpeg 可接受。惰性实现提供商并置于可用性门控之后。
- `http-image`（OpenAI 兼容）在阶段 2。
- `dreamina` 等在没有 API 知识的情况下不做。
- 所有生成都记录，输出文件引用。

### 5.2 视频编译（ffmpeg，阶段 3）

- 拼接片段，可选交叉淡化
- 叠加标题卡（通过 drawtext 文本）
- 导出尺寸：1920x1080、1080x1920（竖版）、1080x1080。
- 仅阶段 3。

### 5.3 作业 API（阶段 2+）

- 检查 `dsh-jobs` 包：作业创建/进度/取消（Q6 待确定导出名称）。

### 5.4 分叉/回滚（阶段 2+）

- 分叉 = 深克隆项目树（新 id 带 `origin` 指针）。
- 撤销 = 基于日志回退最近 N 个操作（提案；存储层）。

### 5.5 回滚/迁移（阶段 2+）

- 每个实体上的版本字段（`schemaVersion`）。
- 加载时，若 `schemaVersion < current`，就地运行迁移器（`migrateV1toV2` 等）并写回。
- 迁移前保留备份 `.bak`。
- 阶段 1 domain 版本为 1，暂无迁移。

### 5.6 可观测性（阶段 2+）

- 宿主日志通过 `ctx.logger`（命名空间 `capture`），非 `ctx.log`（文档早期笔误，已更正）。
- 指标通过可选产品分析（若存在，注入）。
- 默认无遥测。

---

## 6. 构建与打包

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

## 7. 数据模型与校验（阶段 1）

阶段 1 因插件包不可将 `@deepseek-ai/dsh-storage-domain` 及 `zod` 作为 pnpm 依赖（ADR-019），内联了 `defineDomain` / `domainTable` 微型构建器，并使用 passthrough schema `{ parse: (v) => v }`，让 `storageDomain.loadAll()` / `put()` 先能工作；真正的 Zod 校验留待后续阶段补上。

每个实体通用字段：`id`、`name`、`genre`、`logline`、`createdAt`、`updatedAt`。ID 生成：`crypto.randomUUID()`，时间戳：`Date.now()`。

阶段 1 仅操作 `projects` 表；`chapters/shots/assets/generations/trailers` 表已在 domain spec 中声明，待后续阶段使用。

（最终确定前，S1 可能重定向到官方 `storages/`。保持根可配置。）

---

## 8. 安装/开发工作流（Mac）

开发：

1. 工作区即为插件目录：`/Users/constance/Documents/GitHub/deepseek-harness-wulu2026/capture`。
2. 不要手动编辑 profile 的 `package.json`/`cordis.patch.yml`；使用 `plugin_manager install_bundle target=/abs/path/to/capture`（本地目录链接）。
3. 添加 HMR 根（可选）用于宿主代码变更：profile `cordis.patch.yml` 的 hmr 条目根包含仓库路径。请求用户许可。
4. 客户端变更刷新浏览器。
5. 验证能力：`cordis_inspect_query` 服务名/工具/槽位；设置显示条目；覆盖层打开。

后续发布：npm publish；`dsh plugin --profile web add ...`。

---

## 9. 宿主服务 API 契约（阶段 1 已实现）

### 9.1 `ctx.storageDomain`（存储域）

- 域名 `capture`，版本 1，表 `projects/chapters/shots/assets/generations/trailers`。
- `domain.table("projects").put(id, record)` / `.entries()` 读写。

### 9.2 `ctx.tools.register`（模型面向工具，snake_case 命名，ADR-018）

| 工具名 | 参数 | 返回 |
|---|---|---|
| `capture_project_create` | `{ name: string (required), genre?: string, logline?: string }` | `{ ok: true, project: { id, name, createdAt } }` 或 `{ ok: false, error: "INVALID_PROJECT_NAME", message }` |
| `capture_project_list` | `{}` | `{ ok: true, projects: [{ id, name, genre, createdAt }] }` |

每个工具声明 `output: { schema: { type: "object" }, render: (_args, value) => [{ type: "text", text: JSON.stringify(value) }] }`，`render` 产出 `TextBlock`。

### 9.3 `ctx.webServer.register`（同源 JSON 路由，ADR-015）

| 方法 | 路径 | 契约 |
|---|---|---|
| GET | `/api/capture/state` | `{ ok: true, projects: [{id, name, genre, createdAt}] }` |
| POST | `/api/capture/projects` | body `{ name, genre?, logline? }` → `{ ok: true, project: {...} }` 或 `{ ok: false, error: "INVALID_PROJECT_NAME", message }` |

所有路由：method gate（非匹配返回 405）、trust gate（跨站/Origin null 拒绝）、JSON body 解析失败返回 400 `invalid-json-body`、异常统一返回 500 `CaptureInternalError`。

### 9.4 `ctx.systemPrompt.section`（提示词章节）

- 注册章节 `"capture"`，`order: 100`，文本说明 Capture 是故事/分镜/预告片创作工作区，指导模型使用 `capture_project_create/list`，并提示“未经用户指示，不要擅自修改项目”。
- **返回的 disposer 必须通过 `ctx.effect` 托管**（P0 fix，ADR-016）。

---

## 10. spec freeze（与代码一致的 API 绑定）

### 10.1 Host plugin services to declare

```js
export const inject = ["storage", "storageDomain", "webServer", "tools", "systemPrompt"];

export async function apply(ctx, config) {
  // all registrations belong to ctx.effect so unloading cleans them up
}
```

`systemPrompt` 已加入 `inject`（早期版本漏了，已在 `c1e7dee24d` 中补上）。

### 10.2 Storage & domain

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

### 10.3 Host tools (register via `ctx.tools.register`, NOT `defineTool`)

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

### 10.4 Web routes (Phase 1 uses `ctx.webServer.register({ kind: "exact", ... })`)

All routes use the dsh-archived trust-report pattern (loopback + Origin/Sec-Fetch-Site).

| Method | Path | Contract |
|---|---|---|
| GET | `/api/capture/state` | `{ ok, projects:[{id,name,genre,createdAt}] }` |
| POST | `/api/capture/projects` | body `{ name, genre?, logline? }` |

每条路由返回的 disposer 用 `ctx.effect` 托管；处理函数统一捕获异常并返回 `HTTP 500 { ok: false, error: "CaptureInternalError", message }`。

### 10.5 systemPrompt section

```js
const disposeSection = ctx.systemPrompt.section({
  name: "capture",
  order: 100,
  text: "Capture is a story/shoot/trailer creation workspace. Use capture_project_create/list, then chapters, shots, assets and exports. Never modify a project without the user's instruction.",
});
ctx.effect(disposeSection, "capture:system-prompt-section");
```

**不要**使用旧版两位参数调用 `ctx.systemPrompt.section("capture", "...")`；必须传 `PromptSection` 对象 `{ name, order, text }`，并将返回的 disposer 通过 `ctx.effect` 托管（P0 fix，ADR-016）。

### 10.6 Client state access (no Typert Phase 1/2)

Client uses same-origin `fetch` with `credentials: "same-origin"`. Every mutation calls the POST route and refreshes state server-side. `safeJson` guards against non-JSON responses. Long waits are poll-only (`GET /api/capture/generations/:id`) with 1–2 second intervals (Phase 3+).

### 10.7 Phase 1 host tasks checklist

- [x] open domain (with `get` reuse to avoid `already-open`)
- [x] define inline domain builders + passthrough schema (no zod from plugin package)
- [x] route trust gate + method gate + uniform JSON
- [x] two tools: `capture_project_create`, `capture_project_list` (snake_case)
- [x] `ctx.systemPrompt.section()` disposer via `ctx.effect` (P0 fix)
- [x] teardown effect: dispose routes + close domain
- [x] client `safeJson` + `conversation.composer.dock` slot registration
- [ ] minimal 8 tool wrappers (phase 1+)
- [ ] tools-guard deny invalid scope if necessary
