# Capture — 决策记录 (ADR-lite)



记录重大产品/技术决策。格式：编号-标题、状态、背景、决策、后果、日期。



---



## ADR-001 — 平台与形态：macOS DSH Bundle 插件

- 状态：Accepted

- 日期：2026-11-01

- 决策：构建为 DSH 0.2.2-alpha.2 bundle，先 mac 桌面端，Host+Client 双半边。

- 后果：不可 standalone; 必须借助 profile install; agents accessible.



## ADR-002 — 对话优先（Dialogue-first）

- 状态：Accepted

- 决策：创作与编辑的主要入口是聊天；面板负责可视化/结构化编辑。

- 后果：agent tools 是一等；UI 必须支持 diff-first.



## ADR-003 — 全局项目存储（非 session-derived）

- 状态：Accepted (pending S1 validation)

- 背景：DSH 默认 state per session; 但 Project 应夸 session 可见.

- 决策：Project 数据存 host storage（plugin-owned），session 仅存 Project pointer.

- 风险：replay/undo 语义；journal 需设计。 accepted for MVP.



## ADR-004 — 资产为中心的一致性

- 状态：Accepted

- 决策：角色/道具/场景/风格เป็น一等实体；生成时 inject identity lock.

- 后果：Phase 1 强制 asset CRUD + binding.



## ADR-005 — 不新增 session event 类型

- 状态：Accepted

- 决策：严格遵守 DSH practices #22；plugin 仅使用已有 events + plugin storage.

- 后果：建议 edits via tool results + host records; no `plugin:` except if necessary.



## ADR-006 — 渐进保真度（Progressive fidelity）

- 状态：Accepted

- 决策：text → shot → still → clip → trailer; each independently editable/regenerable.



## ADR-007 — 生成以 Job 异步、可取消

- 状态：Accepted

- 决策：所有 generation 走 jobs + progress; UI nonblocking.



## ADR-008 — Diff-first edits by agent

- 状态：Accepted

- 决策：agent edits 以 proposal 形式，用户 accept/reject/modify; 不 silent overwrite.

- 后果: propose/apply tool pair.



## ADR-009 — 原生 UI 组件（不 import ui-primitives module）

- 状态：Accepted (per practices #34)

- 决策: client half 自写 controls + theme tokens; 不 `require('@deepseek-ai/dsh-client-ui-primitives')`.

- 后果: 更多工作，但安全。



## ADR-010 — 数据文件路径 TBD (S1)

- 状态：Pending

- 决策：最终位置待 S1; 默认 `$DSH_HOME/capture/` fallback.



## ADR-011 — 提供方抽象（MediaProvider）

- 状态：Accepted

- 决策: 接口化; mock/HTTP/本地 provider 可插; 不内嵌 key.



## ADR-012 — 先 overlay blade，后 main panel

- 状态：Accepted (pending S2)

- 决策: Studio 作为 shell.overlay 宽 blade in v1.



## ADR-013 — ffmpeg 兜底合成 trailer

- 状态：Accepted

- 决策: 最终 MP4 通过 ffmpeg concat/trim/transcode， provider 仅供 clips.



## ADR-014 — 命名包 `@local/capture`

- 状态: Accepted (may rename before publish)

- 决策：本地开发与 phase 1 使用 @local scope；publish 时改 registry scope maybe `@deepseek-ai`/author's scope.



更新：新增决策追加到此文件并更新 PROGRESS.md.
