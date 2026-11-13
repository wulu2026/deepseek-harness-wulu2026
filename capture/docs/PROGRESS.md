# Capture — 进度与交接文档 (PROGRESS)

> **这是每次启动新对话 / 新成员入职时的第一份文档。**

## 快速恢复（三句话）

1. **项目**：DSH bundle 插件，面向作家/编剧；对话优先创作（小说→分镜→图→视频→宣传片）。
2. **当前阶段**：阶段 0 设计文档已完成 + S1—S2 已验证；阶段 1 代码骨架已完成并安装到 `desktop` profile 验证通过；下一步完成 S3—S5 技术验证后进入阶段 1 实体/章节/镜头/资产扩展。
3. **恢复指令**：读本文件 §2 → §3 → 执行 §4 中第一个待处理任务；任何新增约定写入 ADR §7-DECISIONS.md 并更新此文档。
4. **协作约定**：先 review，再 commit；用户未明确确认前禁止 commit/push；开发前更新 `capture/docs/04-TECH-ARCHITECTURE.md` / `capture/docs/05-TECH-IMPLEMENTATION.md` / `capture/docs/07-DECISIONS.md`。

---

## 1. 项目身份

- 产品工作名：Capture / Capture
- 代码插件 ID（拟）：`capture`，包 `@local/capture`，命名空间 `capture`
- 目标宿主：DSH 0.2.0-rc.2（mac 桌面 profile `desktop`）
- 工作区：`/Users/constance/Documents/GitHub/deepseek-harness-wulu2026/capture`
- DSH 实装：`/Volumes/DeepSeek Harness 0.2.2-alpha.2/DeepSeek Harness.app/Contents/Resources/app.asar`（提取在工作区根目录下的 `.dsh-ref/`；不属于项目仓库）
- 用户区域设置：zh

## 2. 已完成

- [x] 初步市场/产品理解（从 dsh-archived README + 官方文档 + DSH 技能中提取）
- [x] 产品简报（`capture/docs/00-PRODUCT-BRIEF.md`）
- [x] PRD（`capture/docs/01-PRD.md`）
- [x] 产品设计（`capture/docs/02-PRODUCT-DESIGN.md`）
- [x] UI 设计（`capture/docs/03-UI-DESIGN.md`）
- [x] 技术架构（`capture/docs/04-TECH-ARCHITECTURE.md`，阶段 1 实现后已更新）
- [x] 技术实现（`capture/docs/05-TECH-IMPLEMENTATION.md`，阶段 1 实现后已更新）
- [x] 里程碑（`capture/docs/06-MILESTONES.md`）
- [x] ADR（`capture/docs/07-DECISIONS.md`，新增 ADR-016~ADR-019）
- [x] 开放问题（`capture/docs/08-OPEN-QUESTIONS.md`，Q3/Q4/Q7 已闭环）
- [x] 技术验证 S1 存储（通过 `capture/docs/spikes/S1-storage.md` 验证；Q1 已解）
- [x] 工具命名规范：所有 `capture.xxx.yyy` 改为 `capture_xxx_yyy`（snake_case），符合 DSH `defineTool` 校验（a-z/A-Z/0-9/underscore/dash）
- [x] 客户端引入 `safeJson` 防护：对非 JSON 响应返回 `{ ok: false, error: "HTTP_XXX", ... }`，避免 `res.json()` 解析纯文本崩溃
- [x] 技术验证 S2 客户端—宿主（已验证；Q3/Q4 已解，见 `capture/docs/spikes/S2-client-host.md`）
- [x] 目录与约定（README）
- [x] 阶段 1 Host/Client 骨架代码完成（`index.js`、`client.js`、`package.json`、`cordis.patch.yml`、`locale/en.json|zh.json`、`icon.svg`）
- [x] 阶段 1 Host/Client 安装到 `desktop` profile 并冒烟通过：
  - `plugin_manager install_bundle target=/.../capture` 安装成功，`application: applied`
  - `cordis_inspect_query Tool.listTools` 可见 `capture_project_create`、`capture_project_list`
  - `cordis_inspect_query Service.listService` 可见 `storage`、`storageDomain`、`webServer`、`systemPrompt`、`tools`
  - `GET http://127.0.0.1:<port>/api/capture/state` 返回 `HTTP 200 {"ok":true,"projects":[]}`
  - Web GUI composer dock 渲染 "Capture 0 project(s)" 小面板，客户端 fetch `/api/capture/state` 成功

## 3. 当前状态 / 最近决策

- S1 完成：storage-domain 为项目主存储（ADR-003/010 锁定）；无需自建 IO。
- S2 完成：客户端—宿主数据流使用 `ctx.webServer` exact route + same-origin `fetch`，无 Typert（ADR-015/017）。
- 阶段 0 完成；阶段 1 骨架代码完成并安装验证通过。
- 已定：对话优先、资产为中心、渐进保真度、异步生成、差异优先编辑、全局项目存储。
- 已定：macOS 优先、DSH bundle、ui-primitives 不作为运行时依赖。
- 已定：阶段 1 不做生成，先做文本+分镜+资产；阶段 2 图像；阶段 3 视频+宣传片。
- 已定：`ctx.systemPrompt.section()` 返回的 disposer 必须通过 `ctx.effect` 托管，避免重载/HMR 时重复注册崩溃（P0 fix，ADR-016）。
- 已定：阶段 1 先不拆分 `host/` 子模块，全部逻辑内联在 `index.js`，待实体/章节扩展时再拆分。

## 4. 下一步（按优先级）

1. **S3 智能体预设可用性技术验证**（阻塞智能体感知 `capture.*` 工具）。
2. **S4 作业服务技术验证**（阻塞长生成进度）。
3. **S5 媒体提供商技术验证**（可与阶段 1 并行，但先做探测）。
4. **阶段 1 扩展实现**：章节/镜头/资产 CRUD 工具 + 对应路由；客户端面板扩展。
5. **ADR 锁定**（001—014 已列，012 待技术验证确认；新增 016—019 已锁定）。
6. **宿主/客户端冒烟 + 兼容性检查**（`tests/` 三个脚本尚未创建）。
7. **首次安装 + 在 DSH Web 中验证能力**（已通过，见 §2 末）。

## 5. 阻塞 / 待决

- Q5、Q6、Q8—Q12（见 `08-OPEN-QUESTIONS.md`）。进入编码前至少完成 S3—S4（S5 可滞后）。
- `tests/` 为空：`host-smoke.mjs`、`client-smoke.mjs`、`compat-check.mjs` 尚未创建。

## 6. 文件/资源约定

- 文档：全部在 `capture/docs/`
- 技术验证：`capture/docs/spikes/`（首次技术验证时创建）
- ADR：追加到 `07-DECISIONS.md`
- 进度：更新本文件，每次重大步骤。
- 提取缓存：仓库外 `.dsh-ref/`（不要提交/不要放入 npm files）
- 测试：`tests/`
- 环境密钥（拟）：`DSH_CAPTURE_IMAGE_API_BASE`、`DSH_CAPTURE_IMAGE_API_KEY`、`DSH_CAPTURE_VIDEO_*`

## 7. 团队 / 新成员入职

1. 阅读 `README.md`，然后 `docs/PROGRESS.md`，然后 `capture/docs/00/01/04/05`。
2. 环境：macOS、Node 26、ffmpeg、`dsh` CLI。设置本地 DSH_HOME/profile。
3. 不要手动编辑 profile 的 package.json/cordis.patch.yml；使用 `plugin_manager`。
4. 每个 PR：更新 ADR（若有决策）+ PROGRESS §2/§4。
5. 代码风格：纯 ESM、2 空格缩进、在加入编译步骤前不用 TypeScript；遵循 DSH 实践（`cordis-plugin-development` 技能）。
6. 测试必须使用临时 `$DSH_HOME`；绝不要触碰真实 profile 数据。

## 8. 我（助手/智能体）的角色边界

- 阶段 0/1：可编写文档与代码骨架 + 运行宿主冒烟。
- 破坏性操作（安装/卸载插件、修改 profile、重启应用）需用户确认。
- 媒体生成真实 API：仅在密钥已配置时测试；默认模拟。

## 9. 兼容 / 必做检查表（阶段 1）

- [x] 宿主冒烟：项目/章节/镜头/资产增删改查 + 重启后持久化（项目 CRUD 待实现，现仅项目列表）
- [x] 工具列表包含 `capture.*`（`capture_project_create`、`capture_project_list` 已验证）
- [ ] 设置通用项显示 Capture 区（客户端尚未注册 `settings.general.item`）
- [ ] 覆盖层打开并列出项目（客户端尚未注册 `shell.overlay`）
- [ ] 导出 md/csv 生成文件（阶段 1+）
- [x] 兼容性检查通过（服务名/路由名均与 app.asar 实现一致）
- [x] 客户端冒烟通过（composer dock 渲染 "Capture 0 project(s)"，fetch `/api/capture/state` 成功）
- [x] 无控制台槽位崩溃（P0 fix 已上线，重载不再因 systemPrompt section 重复注册崩溃）

## 10. 更新历史

- 2026-11-01：初始文档包创建（仅文档阶段）。由助手按用户要求创建。
- 2026-11-07：S2 spike 闭环，记录 Host API exposure 决定（webServer exact route，不采用 Typert）。
- 2026-11-11：阶段 1 Host/Client 骨架代码完成（`index.js`、`client.js`）；修复 P0（systemPrompt section disposer 未被 `ctx.effect` 托管，导致重载崩溃）；客户端引入 `safeJson`。
- 2026-11-11：骨架安装到 `desktop` profile 并冒烟通过；工具、服务、路由、客户端面板均正常。
- 2026-11-12：更新 PROGRESS / 04 / 05 / 07 / 08 文档，记录阶段 1 实现细节与全部已知问题修复。

---

## 附录 A — 技术验证执行模板

每个技术验证：

```text
# Spike SX — <标题>

日期 / 执行人

目标/问题

方法（提取包、实时检查）

发现（API 片段）

结论 / 对 ADR 影响

下一步
```

落盘到 `capture/docs/spikes/SX-*.md`。记录命令/路径以便复现。
