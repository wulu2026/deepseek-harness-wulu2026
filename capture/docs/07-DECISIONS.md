# Capture — 决策记录 (ADR-lite)

记录重大产品/技术决策。格式：编号-标题、状态、背景、决策、后果、日期。

---

## ADR-001 — 平台与形态：macOS DSH Bundle 插件

- 状态：已接受
- 日期：2026-11-01
- 决策：构建为 DSH 0.2.2-alpha.2 bundle，先 mac 桌面端，Host + Client 双半边。
- 后果：不可独立运行；必须借助 profile 安装；智能体可访问。

## ADR-002 — 对话优先（Dialogue-first）

- 状态：已接受
- 决策：创作与编辑的主要入口是聊天；面板负责可视化/结构化编辑。
- 后果：智能体工具是一等公民；UI 必须支持差异优先（diff-first）。

## ADR-003 — 全局项目存储（非会话派生）

- 状态：已接受（S1 已验证，2026-11-07）
- 背景：DSH 默认状态按会话；但项目应跨会话可见。
- 决策：项目数据存宿主 `ctx.storageDomain` 的 `capture` 域（插件自有），会话仅存项目指针。
- 验证：S1 确认存储域为项目主存储（`capture/docs/spikes/S1-storage.md`）；插件不自建文件树与手动原子写入，耐久性由 domain 层单写链保证。
- 风险：重放/撤销语义；日志需设计。MVP 阶段接受。

## ADR-004 — 资产为中心的一致性

- 状态：已接受
- 决策：角色/道具/场景/风格是一等实体；生成时注入身份锁定（identity lock）。
- 后果：阶段 1 强制资产增删改查 + 绑定。

## ADR-005 — 不新增会话事件类型

- 状态：已接受
- 决策：严格遵守 DSH 实践 #22；插件仅使用已有事件 + 插件存储。
- 后果：建议编辑通过工具结果 + 宿主记录；除必要外不使用 `plugin:`。

## ADR-006 — 渐进保真度（Progressive fidelity）

- 状态：已接受
- 决策：文本 → 镜头 → 静帧 → 片段 → 预告片；每层独立可编辑/可重新生成。

## ADR-007 — 生成以作业异步、可取消

- 状态：已接受
- 决策：所有生成走作业 + 进度；UI 不阻塞。

## ADR-008 — 智能体差异优先编辑（Diff-first edits by agent）

- 状态：已接受
- 决策：智能体编辑以提案形式，用户接受/拒绝/修改；不静默覆盖。
- 后果：提议/应用工具对（propose/apply tool pair）。

## ADR-009 — 原生 UI 组件（不导入 ui-primitives 模块）

- 状态：已接受（按实践 #34）
- 决策：客户端半边自写控件 + 主题 token；不 `require('@deepseek-ai/dsh-client-ui-primitives')`。
- 后果：工作量更多，但安全。

## ADR-010 — 数据文件路径：由 storage-domain 后端决定

- 状态：已接受（S1 已解，2026-11-07）
- 决策：不自建 `$DSH_HOME/capture/` 文件树，也不手动做原子写入；项目数据一律通过 `ctx.storageDomain.open(CaptureSpec)` 落到 profile 已配置的存储后端，路径由后端决定。
- 后果：数据位置随 profile 的存储路由变化；插件代码不感知具体路径，也不得直接读写存储文件。

## ADR-011 — 提供商抽象（MediaProvider）

- 状态：已接受
- 决策：接口化；模拟/HTTP/本地提供商可插；不内嵌密钥。

## ADR-012 — 先覆盖式侧板，后主面板

- 状态：已接受（槽位能力已由 S2 确认，2026-11-11；布局待阶段 2 实现）
- 决策：v1 中工作室作为 `shell.overlay` 宽侧板。
- 验证：`cordis_inspect_query Slots.listSubTree` 确认 `shell.overlay` 为 `kind: list, scope: root`，注册需 `id`，`replaceRisk: none`，用途为 frame-wide floating layer。宽侧板的具体布局待在阶段 2 实现 `StudioPanel` 时确认。

## ADR-013 — ffmpeg 兜底合成预告片

- 状态：已接受
- 决策：最终 MP4 通过 ffmpeg 拼接/裁剪/转码，提供商仅提供片段。

## ADR-014 — 命名包 `@local/capture`

- 状态：已接受（发布前可能改名）
- 决策：本地开发与阶段 1 使用 @local 范围；发布时改为 registry 范围，可能 `@deepseek-ai`/作者范围。

更新：新增决策追加到此文件并更新 PROGRESS.md。
---

## ADR-015 — Host exposure via webServer exact routes, not Typert, for Phase 1/2
- 状态：Accepted
- 日期：2026-11-07
- 决策：Capture Phase 1/2 的 Host API 使用 `ctx.webServer` 的 `/api/capture/*` exact routes + dsh-archived trust gate；不采用 `@Remote` / Typert build pipeline。Typert/二进制与 stream 通道延后到 Phase 3+ 需要时再评估。
- 后果：客户端用 same-origin `fetch`，mutation 返回 payload 供 optimistic update； progress 采用 polling；remote/proxy 复杂度显著降低。

## ADR-016 — 所有注册必须经 `ctx.effect` 托管（systemPrompt section 崩溃修复）

- 状态：已接受
- 日期：2026-11-11
- 背景：`ctx.systemPrompt.section()` 返回一个 disposer，用于在插件卸载时注销该章节。阶段 1 骨架最初丢弃了这个返回值。
- 问题：`PromptLayer.sections.insert` 对同名 section 会抛 `prompt section "capture" is already registered`。插件重载 / HMR 时旧章节未被注销，第二次 `apply` 直接抛出，**整个 Host 插件激活失败**（P0）。
- 决策：任何注册 API 的返回值（disposer）都必须通过 `ctx.effect(disposer, label)` 托管；插件内的注册一律不例外——工具、路由、systemPrompt 章节、存储域句柄全部如此。
- 后果：插件可安全重载/HMR；卸载时按注册逆序注销。同类遗漏可在 review 中按“注册即 effect”规则直接识别。
- 修复提交：`12a685e49a fix(capture): register systemPrompt section disposer via ctx.effect`
- 验证：重载不再崩溃；`cordis_inspect_query Service.listService` 确认 `systemPrompt.section(section)` 返回 disposer。

## ADR-017 — 客户端—宿主数据流：同源 `fetch` 调用 webServer exact route

- 状态：已接受（S2 已验证，2026-11-07；端到端冒烟通过，2026-11-11）
- 背景：客户端需要读取/修改宿主项目数据；Typert 需要 `@Remote` + 构建期生成 descriptors/codec，对无编译流程的 plain bundle 成本过高。
- 决策：Host 通过 `ctx.webServer.register({ kind: "exact", path, handler })` 暴露 `/api/capture/*` JSON 路由；Client 用 `fetch(path, { credentials: "same-origin" })` 调用。所有路由执行 trust gate（`Sec-Fetch-Site: cross-site` 拒绝、`Origin: null` 拒绝、有 `Origin` 则比对 `host`、缺席放行）与 method gate，统一返回 `{ ok, ... }` 信封。
- 后果：无 Typert/remote/proxy 复杂度；阶段 3 需要二进制或流式时再重新评估 `@Remote`。
- 验证：`GET http://127.0.0.1:<port>/api/capture/state` → `HTTP 200 {"ok":true,"projects":[]}`；Web GUI composer dock 面板显示 "Capture 0 project(s)"，证明客户端 fetch 路由无网络障碍。

## ADR-018 — 模型面向工具使用 snake_case 命名

- 状态：已接受
- 日期：2026-11-11
- 背景：阶段 1 骨架最初使用点分式工具名（如 `capture.project.create`）。
- 问题：DSH 工具名校验只接受 `a-z` / `A-Z` / `0-9` / `_` / `-`；点分名不被接受，注册失败。
- 决策：所有工具名使用 `capture_<实体>_<动作>` 形式，例如 `capture_project_create`、`capture_project_list`；实体/动作均用小写 snake_case。
- 后果：工具名与 DSH 校验一致；后续 `capture_chapter_*`、`capture_shot_*`、`capture_asset_*` 等沿用同一规则。
- 修复提交：`c1e7dee24d 最小 Host/Client 骨架 bug fix`

## ADR-019 — 插件包不依赖 DSH 内部 bundle 与 zod

- 状态：已接受
- 日期：2026-11-11
- 背景：阶段 1 骨架最初从 `@deepseek-ai/dsh-storage-domain` 导入 `defineDomain`/`domainTable`，并用 `zod` 定义实体 schema。
- 问题：`@deepseek-ai/dsh-storage-domain` 是 DSH 内部 bundle，`zod` 也不是插件包可解析的 pnpm 依赖；插件以 `link:` 安装后这些导入无法解析，加载失败。
- 决策：`defineDomain` / `domainTable` 在插件内联（逻辑极小，仅做命名与版本校验并返回 spec 对象）；schema 位置先用 passthrough `{ parse: (v) => v }` 保证 `storageDomain.loadAll()` / `put()` 可用，真正的记录校验留待后续阶段以可解析的方式补上。
- 后果：插件零第三方运行时依赖，安装面最小；代价是阶段 1 无字段级校验，写入非法记录不会被存储层拒绝。
- 修复提交：`c1e7dee24d 最小 Host/Client 骨架 bug fix`
- 后续：若需要真实校验，优先在插件自己的 `execute`/route handler 内做显式字段校验，而不是引入 zod。

## ADR-020 — 阶段 1 不拆分 `host/` 子模块

- 状态：已接受（临时）
- 日期：2026-11-12
- 背景：实现文档早期规划了 `host/storage.js`、`models.js`、`services.js`、`tools.js`、`agents.js` 的拆分布局。
- 决策：阶段 1 全部逻辑内联在 `index.js`，不建 `host/` 目录；当实体（章节/镜头/资产）与工具数量增长到单文件难以维护时再拆分，拆分时保持 `package.json` 的 `files` 与 `exports` 同步更新。
- 后果：当前骨架单文件易读、安装面最小；拆分时机由下一轮扩展决定。
