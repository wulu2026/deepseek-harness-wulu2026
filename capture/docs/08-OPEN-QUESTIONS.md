# Capture — 开放问题与技术验证 (08)

每个问题含 ID、阻塞阶段、负责方、验证方法。

---

### Q1. 存储：官方存储域 API 在哪里？目录约定？事务？ ✅ 已解

- 阻塞：阶段 1
- 验证：提取 `dsh-storage*` README + 检查运行时；用 `cordis_inspect_query` 查询 `storage` 服务。
- 技术验证 S1。
- **结论（2026-11-07）**：使用 `ctx.storageDomain.open(spec)` 打开声明式域；服务方法为 `open(spec)` / `get(name)` / `closeAll()`（已由 `cordis_inspect_query Service.listService` 确认）。目录由 profile 配置的存储后端决定，插件不自建路径（ADR-010）。事务/原子性由 domain 层单写链保证：写入先落耐久再改内存，后端失败不改内存。相关 ADR：ADR-003、ADR-010。

### Q2. DeepSeek 账户是否提供图像/视频生成？

- 阻塞：阶段 2（决定提供商优先级）
- 验证：检查 `dsh-deepseek-account`、`dsh-deepseek-llm-api-extensions`、`dsh-llm-deepseek` README。
- 技术验证 S5。

### Q3. 客户端—宿主服务调用机制？ ✅ 已解

- 阻塞：阶段 1（所有 UI）
- 验证：工作区浏览器如何调用 `session/create`：提取 `dsh-api-session-controller` 与 `remoteAccess` 文档；查找 `ctx.remote.commands.execute` 示例。
- 技术验证 S2。
- **结论（2026-11-07，2026-11-11 端到端复验）**：阶段 1/2 **不采用** Typert / `@Remote`，改用 `ctx.webServer.register({ kind: "exact", path, handler })` 暴露 `/api/capture/*` JSON 路由，客户端用同源 `fetch` 调用（ADR-015/017）。已验证：`GET /api/capture/state` 返回 `HTTP 200 {"ok":true,"projects":[]}`，Web GUI 面板显示 "Capture 0 project(s)"。spike 记录：`docs/spikes/S2-client-host.md`。

### Q4. 覆盖层的宽度/能力？ ⏳ 部分已解

- 阻塞：阶段 1（UI 容器）
- 验证：`ui-plugin` 槽位列表 + 检查槽位 `listSubTree`；`shell.overlay` 是否支持宽侧板。
- 技术验证 S2/UI。
- **结论（2026-11-11）**：已通过 `cordis_inspect_query Slots.listSubTree` 确认 `shell.overlay` 为 `kind: list, scope: root`，注册需 `id`（必填）、`order`/`label`（可选），用途为“Frame-wide floating layer, above every column and outside their scroll containers”，`replaceRisk: none`；同批复核了 `conversation.composer.dock`（`kind: list, scope: session`），阶段 1 实际使用该槽位并验证渲染成功。`shell.overlay` 的宽侧板具体布局仍待在阶段 2 实现 `StudioPanel` 时确认。

### Q5. 插件能否注册智能体预设/技能？

- 阻塞：阶段 1（智能体）
- 验证：插件能否注册技能/智能体预设；否则用 systemPrompt 章节。
- 技术验证 S3。

### Q6. 作业服务的导出名称？

- 阻塞：阶段 1/阶段 2
- 验证：检查 `dsh-jobs`。
- 技术验证 S4。

### Q7. 工具注册 API 的确切形式（`ctx.tools.register` 还是 defineTool）？ ✅ 已解

- 阻塞：阶段 1
- 验证：检查 `dsh-tools`。
- **结论（2026-11-11）**：使用 `ctx.tools.register(definition)`，直接传定义对象，**不用** `defineTool`（`@deepseek-ai/dsh-tools` 同样是插件包不可依赖的内部 bundle）。`definition` 必须包含 `name`、`description`、`parameters`、`output: { schema, render }`；`register()` 返回 disposer，须用 `ctx.effect` 托管。工具名须符合 `a-z`/`A-Z`/`0-9`/`_`/`-`（见 ADR-018）。`output.render(args, value)` 返回 `ContentBlock[]`，文本块形状为 `{ type: "text", text: string }`。已验证 `capture_project_create`、`capture_project_list` 出现在 `Tool.listTools` 中。

### Q8. 交付物文件引用 API（present + 文件引用）以暴露生成的媒体。

- 阻塞：阶段 3
- 验证：检查 `dsh-tool-present`、`dsh-deliverable-file-references`。

### Q9. 媒体 MIME/本地路径如何暴露给 Web UI 的 `<img>/<video>`（是否需要宿主路由？）。

- 阻塞：阶段 2
- 验证：使用 DSH 文件引用流程（推荐）；除非必要，避免自定义路由。

### Q10. 项目全局存储的并发与多会话访问。 ✅ 已解（阶段 1 范围）

- 阻塞：阶段 1
- 验证：S1 + 进程内锁。
- **结论（2026-11-07）**：不需要插件自建进程内锁。storage-domain 的每个域内只有一条写入链，写入按调用顺序串行执行，且先落耐久再改内存；后端写失败时内存不变（或按 `unknown-state` 隔离该域）。多会话并发访问同一 `capture` 域时由该层保证一致性。已由 `cordis_inspect_query Service.listService` 确认 `storageDomain.open/get/closeAll` 为全部对外方法。

### Q11. 一致性智能体的输出契约（差异提案）。

- 阻塞：阶段 1
- 验证：工具 `propose_change` + UI 差异渲染假设。

### Q12. 技能打包：自定义插件的区域设置与元数据。 ✅ 已解

- 阻塞：阶段 0 基础项
- 验证：装饰模板 + dsh-archived 宿主插件检查清单。
- **结论（2026-11-11）**：`locale/en.json`、`locale/zh.json` 各含 `meta.title` / `meta.description`；`package.json` 的 `exports` 暴露 `./locale/*.json` 与 `./icon`，`files` 包含 `locale/*`、`icon.svg`、`cordis.patch.yml`。安装后由插件管理面板读取显示元数据。

## 技术验证计划

执行时在 `capture/docs/spikes/` 中创建技术验证笔记；不要提交虚假答案。

## 决策触发条件

- 如果 S1 显示存储域需要 profile 级对等依赖，调整 package.json 依赖。
- 如果 Q2 显示 DeepSeek 无图像生成，默认使用 HTTP 提供商并记录设置说明。

---

## 已知问题修复记录（阶段 1）

按 git 提交顺序，记录骨架搭建到安装验证期间遇到并修复的全部问题。

### 1. P0 — systemPrompt section 重载崩溃

- **现象**：插件重载 / HMR 时，Host 插件激活直接失败。
- **原因**：`ctx.systemPrompt.section()` 返回的 disposer 被丢弃，旧 section 未注销；`PromptLayer.sections.insert` 对同名节抛 `prompt section "capture" is already registered`。
- **修复**：`const disposeSection = ctx.systemPrompt.section({...}); ctx.effect(disposeSection, "capture:system-prompt-section");`
- **提交**：`12a685e49a fix(capture): register systemPrompt section disposer via ctx.effect`
- **ADR**：ADR-016

### 2. 插件包依赖 DSH 内部 bundle 与 zod

- **现象**：以 `link:` 安装后导入 `@deepseek-ai/dsh-storage-domain`、`zod` 无法解析，插件加载失败。
- **原因**：两者都不是插件包可解析的 pnpm 依赖。
- **修复**：在插件内联 `defineDomain` / `domainTable`（仅做命名与版本校验）；schema 先用 passthrough `{ parse: (v) => v }`。
- **提交**：`c1e7dee24d 最小 Host/Client 骨架 bug fix`
- **ADR**：ADR-019

### 3. 工具名使用点分式

- **现象**：`capture.project.create` 等工具名注册失败。
- **原因**：DSH 工具名校验仅接受 `a-z`/`A-Z`/`0-9`/`_`/`-`，点号不被接受。
- **修复**：改名为 `capture_project_create`、`capture_project_list`；后续 `capture_<实体>_<动作>` 沿用此规则。
- **提交**：`c1e7dee24d`
- **ADR**：ADR-018

### 4. `inject` 漏声明 `systemPrompt`

- **现象**：`ctx.systemPrompt` 在 `apply` 中不可用。
- **原因**：`inject` 数组只列了 `storage`/`storageDomain`/`webServer`/`tools`。
- **修复**：补入 `"systemPrompt"`，宿主在该服务就绪后才激活插件。
- **提交**：`c1e7dee24d`
- **ADR**：无（属于 ADR-016 同批修复）

### 5. 重复打开同名存储域

- **现象**：重载时 `storageDomain.open("capture")` 抛 `already-open`，整个 Host 崩溃。
- **原因**：同一域名不可重复 open。
- **修复**：先 `ctx.storageDomain.get("capture")` 复用已打开句柄，未命中才 `open`。
- **提交**：`c1e7dee24d`

### 6. 客户端 `res.json()` 解析非 JSON 响应崩溃

- **现象**：路由返回纯文本（如错误页）时客户端抛未捕获异常。
- **原因**：直接 `res.json()`，未检查 `Content-Type`。
- **修复**：引入 `safeJson`，非 JSON 响应返回 `{ ok: false, error: "HTTP_<status>", message: <前 200 字符> }`；JSON 解析失败返回 `INVALID_JSON`。
- **提交**：`c1e7dee24d`

### 7. `trustReport` 信任门过严

- **现象**：桌面壳转发的请求（无 `Origin` 头）被拒绝。
- **原因**：早期实现仅在 `sec-fetch-site === "same-origin"` 时放行。
- **修复**：改为——`Sec-Fetch-Site: cross-site` 拒绝；`Origin: null` 拒绝；有 `Origin` 则比对 `host`；`Origin` 缺席（桌面壳 / 非浏览器客户端）放行。
- **提交**：`c1e7dee24d`

### 8. 文档与代码不一致

- **现象**：`05-TECH-IMPLEMENTATION.md` §18 仍描述旧绑定（`defineTool`、zod、点分工具名、两位 `section()` 调用）。
- **修复**：重写 04/05/07/08/PROGRESS，使文档与已安装验证的代码一致。
- **提交**：本次文档更新

### 验证证据（2026-11-11 安装后）

- `plugin_manager list_bundles`：`@local/capture` `enabled: true`、`installed: true`、`application: applied`。
- `cordis_inspect_query Tool.listTools`：含 `capture_project_create`、`capture_project_list`。
- `cordis_inspect_query Service.listService`：含 `storage`、`storageDomain`、`webServer`、`systemPrompt`、`tools`。
- `GET http://127.0.0.1:<port>/api/capture/state` → `HTTP 200 {"ok":true,"projects":[]}`。
- Web GUI composer dock 渲染 "Capture 0 project(s)" 面板。
