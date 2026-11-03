# Capture — 进度 & 交接文档 (PROGRESS)



> **这是每次启动新对话 / 新成员 onboarding 的第一份文档。**



## Quick Resume (三句话)



1. **项目**：DSH bundle 插件，面向作家/编剧；对话优先创作（小说→分镜→图→视频→宣传片）。

2. **当前阶段**：Phase 0 设计文档已完成 + S1 已验证；S2 进行中。代码 **尚未开始**；下一动完成 Spike S2-S5 后开始 Phase 1.

3. **恢复指令**：读本文件 §2 → §3 → 执行 §4 中第一个 pending 任务；任何新增约定写入 ADR §7-DECISIONS.md 并更新此文档。



---



## 1. 项目身份



- 产品工作名：Capture / Capture

- 代码插件 ID（拟）：`capture`, 包 `@local/capture`, namespace `capture`

- 目标宿主：DSH 0.2.0-rc.2 (mac desktop profile `desktop`)

- Workspace： `/Users/constance/Documents/GitHub/deepseek-harness-wulu2026/capture`

- DSH 实装：`/Volumes/DeepSeek Harness 0.2.2-alpha.2-arm64/DeepSeek Harness.app/Contents/Resources/app.asar` (extracted under `.dsh-ref/` at workspace root; not part of project repo)

- User locale: zh



## 2. 已完成



- [x] 初步市场/产品理解（从 dsh-archived README + 官方 docs + DSH skill 提取）

- [x] 产品简报 (`capture/docs/00-PRODUCT-BRIEF.md`)

- [x] PRD (`capture/docs/01-PRD.md`)

- [x] 产品设计 (`capture/docs/02-PRODUCT-DESIGN.md`)

- [x] UI 设计 (`capture/docs/03-UI-DESIGN.md`)

- [x] 技术架构 (`capture/docs/04-TECH-ARCHITECTURE.md`)

- [x] 技术实现 (`capture/docs/05-TECH-IMPLEMENTATION.md`)

- [x] 里程碑 (`capture/docs/06-MILESTONES.md`)

- [x] ADR (`capture/docs/07-DECISIONS.md`)

- [x] 开放问题 (`capture/docs/08-OPEN-QUESTIONS.md`)

- [x] Spike S1 storage (通过 `capture/docs/spikes/S1-storage.md` 验证；Q1 已解)

- [~] Spike S2 client-host (进行中，见 `capture/docs/spikes/S2-client-host.md`; Q3 待解)

- [x] 目录与约定（README）



## 3. 当前状态 / 最近决策

- S1 完成：storage-domain 为项目主存储（ADR-003/010 锁定）；无需自建 IO。

- S2 进行中：Typert/Remote invocation; client–host data flow 仍未最终定。



- Phase 0 进行中（文档已完成；Spikes 未执行）。

- 定：对话优先、资产中心、渐进保真度、异步生成、diff-first edits、全局项目存储。

- 定：macOS-first, DSH bundle, ui-primitives 不作为 runtime dependency.

- 定：Phase 1 不做生成，先做文本+分镜+资产；Phase 2 图像；Phase 3 视频+宣传片.



## 4. 下一步（按优先级）



1. **S2 客户端-宿主数据流 Spike** (进行中; 阻塞 UI; 见 docs/spikes/S2-client-host.md)

2. **S3 agents preset 可用性 Spike**.

3. **S4 jobs Spike**.

4. **S5 media provider Spike**（可与 Phase 1 并行，但先 probes）。

5. ADR 锁定（001-014 已列，部分待 spike 验证：ADR-003, 010, 012）。

6. Phase 1 spec freeze → create code skeleton (package.json, patch, index.js/client.js skeletons) via `plugin_manager install_bundle`.

7. Implement storage adapter & entity modules.

8. Implement tools + minimal client.

9. Host/client smoke + compat-check.

10. First install + verify capability in DSH web.



## 5. 阻塞 / 待决



- Q1-Q12（见 `08-OPEN-QUESTIONS.md`）。进入代码前至少完成 S1-S4（S5 can trail）。



## 6. 文件/资源约定



- docs：全部在 `capture/docs/`

- spike：`capture/docs/spikes/` (create on first spike)

- ADR：追加 `07-DECISIONS.md`

- 进度：更新本文件，每次重大步骤.

- extraction cache：仓库外 `.dsh-ref/`（不要提交/不要入 npm files)

- tests：`tests/`

- env keys（拟）：`DSH_CAPTURE_IMAGE_API_BASE`, `DSH_CAPTURE_IMAGE_API_KEY`, `DSH_CAPTURE_VIDEO_*`



## 7. 团队 / 新成员 onboarding



1. Read `README.md` then `docs/PROGRESS.md` then `capture/docs/00/01/04`.

2. Environment: macOS, Node 26, ffmpeg, `dsh` CLI. Set DSH_HOME/profile local.

3. Do not manually edit profile package.json/cordis.patch.yml; use `plugin_manager`.

4. 每个 PR：更新 ADR（若决策）+ PROGRESS §2/§4.

5. Code style: plain ESM, 2-space indent, no TypeScript until compile step added; follow DSH practices (`cordis-plugin-development` skill).

6. Tests must run with temp `$DSH_HOME`; never touch real profile data.



## 8. 我（assistant/agent）的角色边界



- Phase 0/1: may write docs & code skeleton + run host smoke.

- 破坏性操作（install/uninstall plugin, profile changes, app restart）需用户确认。

- 媒体生成真实 API：仅在 key 已配时 test; 默认 mock.



## 9. 兼容 / 必做检查表（Phase 1）



- [ ] Host smoke: project/chapter/shot/asset CRUD + persist after restart

- [ ] Tool list contains `capture.*`

- [ ] Settings general item shows Capture section

- [ ] Overlay opens & lists projects

- [ ] Export md/csv produces files

- [ ] compat-check passes

- [ ] client smoke passes

- [ ] no console slot crash (visual manual)



## 10. 更新历史



- 2026-11-01: 初始文档包创建（仅文档阶段）. Created by assistant per user request.

- (后续每次更新 append 日期+变更)



---



## Appendix A — Spike 执行模板



每个 Spike:

```

# Spike SX — <title>

日期 / 执行人

目标/问题

方法（提取包、inspect live）

发现（API snippets）

结论 / 对 ADR 影响

下一步

```

落 `capture/docs/spikes/SX-*.md`. Capture commands/paths for reproducibility.
