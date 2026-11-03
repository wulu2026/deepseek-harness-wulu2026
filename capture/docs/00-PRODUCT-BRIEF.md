# Capture — 产品简报 (00)



## 1. 一句话定位



> **"给作家与内容创作者的 AI 创作工作室：从灵感卡片到 stories、分镜、成片，一气呵成；以对话作为主控制方式。"**



## 2. 命名



- 工作名：Capture

- 中文搜索友好别名：小说工坊、分镜工坊、剧情视频工坊（PR 阶段再定正式名）



## 3. 目标用户（User Personas）



| Persona | 需求 | 频率 | 痛点 |

|---|---|---|---|

| **A · 网络小说作者**（1.5k-8k 字/章、追更流） | 章节大纲 → 接续写作 → 角色库 → 连载可视化 | 每天 | 角色细节容易 forgotten；设定散落 |

| **B · 短剧 / 微短剧编剧** | 剧本（Scene/Beat） → 分镜（shot list） → 预览成片（30-90s） | 每周 | 文字→镜头的翻译 costs time；人物一致性 |

| **C · 漫画/轻小说 up 主 / Vloger** | 有概念 → 角色图 & 场景 → 图文混播视频 | 每周 | 没有资产编排，图与视频难以复用 |

| **D · 独立视频创作者 / 宣传片** | 高光名场面 → clip → trailer（30s/60s/90s）| 每月 | 无法"只生成最抓眼的一幕" |



非目标（明确排除）：

- 不做剧集分发 / 变现实时（只 produce deliverables）

- 不做复杂协作/多人编辑（单用户单 session + agents 可 fork）

- 不做 DRM/版权分发（作品 belongs to user；导出文件即可）



## 4. 核心价值主张



1. **Dialogue-first**：所有变更（写作、拆分镜、生成图）可以在聊天中完成；UI 是把结果以**结构化、可编辑**形式表面，而不是生成器黑盒。

2. **Consistency by assets**：角色、道具、场景、风格 = 一等实体，可被所有作品/分镜复用，生成时自动注入 "identity lock" prompt。

3. **Gradual fidelity**：文本 → 结构（分镜） → 静图 → shot video → 全片视频。每层都是独立可编辑、可重新生成产物，上层变化不打乱下层。

4. **Agents that co-write**：利用 DSH agent/subagent：Outline Agent、Style/Consistency Agent、Shot Director Agent、Trailer Cutter Agent 等，each owns a scoped context。

5. **Provenance & reproducibility**：每张图、每段 clip 都记录 source shot、asset version、prompt、seed、model；重新生成 = 完整 reconstruct。

6. **Deliverables**：所有最终产物以 DSH `present()` files + `deliverable` 引用形式进入 session，方便 later agent 复用或用户 export。



## 5. 主要功能域（Features）



F1 **作品与章节**：work (作品), chapter, scene; Markdown + 快速结构化 (outline, beats)。



F2 **剧本 & 分镜**：play (剧本), shot list, per-shot: VO/dialogue, action, camera, duration, transition, music/SFX hint, references.



F3 **资产库**：character, prop, location, style pack; reuse & versioning; identity lock (reference images + description).



F4 **AI 生成**：character image / shot still / shot video / full trailer / trailer cutter. Use configured (account) models + fallbacks.



F5 **资产编排 & 一致性**：把人物/场景/道具 binding 到 shot；生成时打包 identity lock + style seed。



F6 **分支 & 迭代**：fork chapter / shot list / shot to A/B variants; compare; pick winner.



F7 **高光名场面 & 宣传片**：从作品/剧本 выбира beat → 生成 trailer (30/60/90s) + 无字幕/配乐 variants.



F8 **Agent 协作**：专用 agents 提供 "outline chapter", "next scene", "shot list from beat", "consistency check", "trailer cut", "rewrite dialogue"; they write into same artifacts with diff.



F9 **Deliverables & Export**：Export .docx/.md screenplay, .csv shot list, images/videos, and a trailer mp4. Use present() + workspace downloads.



## 6. 非功能目标



- 可离线（无外部服务时，AI 生成 disabled，但创作/编辑/资产/导出仍可用）。

- 生成离线不阻塞：所有长任务走 jobs + progress + 取消.

- 隐私：用户数据仅本地 (`$DSH_HOME/.../capture/`), 除非用户显式用 DeepSeek account/image API。

- 可恢复：Session 重启、replay 不 corrupts artifacts (artifacts are session events + projection; derived state only).

- 可测：_host smoke + media stub pipeline_，无需真实生成。



## 7. MVP 切分（Phase 1-3）



- **Phase 1 (MVP-A, 4-6 周)**：Work/Chapter 文本 + 剧本/分镜 CRUD + 资产库 CRUD + 对话驱动（agent 在结构化 artifacts 上 propose diff）。不含生成。

- **Phase 2 (MVP-B)**：Character & Shot still generation（text-to-image）+ consistency lock + provenance。单 Provider 优先。

- **Phase 3 (MVP-C)**：Shot/Full video generation + trailer cut (ffmpeg concat/trim) + export.

- **Phase 4 (polish)**：多 provider 比价/排队、分支对比 UI、timeline editor、模板/市场。



## 8. 业务指标（Success metrics）



- Time-to-first-shot-list（从空作品到可拍分镜）< 15 min (agent-assisted)

- Asset reuse rate ≥ 40%（同一 asset 被 ≥ 2 shots 复用）

- Regeneration waste: 重 roll shot still ≤ 2 次 median

- Retention of agent edits ≥ 80% (accepted without manual rewrite)

- 0 P0 因 generation block the whole UI



## 9. 硬要求（Constraints）



- 必须是 DSH Bundle（profile `bundles` + patch），Host API 从 `cordis` 注册服务，Client 作为 React factory (no duplicate React).

- mac 桌面 first；网页版 later (same web UI).

- 存储：host-side service / storage domain； projection 只读，derived state derived from sessions + plugin storage.

- All user data in `DSH_HOME` only; no telemetry (optional later, off by default).

- Generation uses user's existing DeepSeek / account configuration; do not embed keys. API key from env `DSH_*`.



## 10. 风险



| Risk | Mitigation |

|---|---|

| Generation Provider 不稳定 / 成本高 | Provider 抽象层 + 免费 mock 生成 + 缓存 |

| 角色一致性 prompt 工程复杂 | Asset 锁 + reference images + seed 固定；A/B diff 比较 |

| Agent 误编辑（破坏作品） | Event-based append + git-like diff + soft undo |

| 数据 schema 迁移 cost | stateVersion + migration tests from Phase 1 |

| Video 生成时间长 / UI 长 task | Jobs + progress + 可 cancel + background |

| App.asar API mismatched | compat-check.ts 从 extracted packages 的 typing 做 discover; D0 actions in OPEN QUESTIONS |



## 11. 验收定义 (Definition of Done for v1)



- 用户能 create Project → chapters → 由 chat 创建 shot list → add assets → generate char image → generate one shot video → export trailer 30s.

- Agent 可在 Tools 中看到 capture capabilities.

- 所有生成的文件在 deliverables 与 session 有 references.

- Tests: host smoke + client smoke + compat-check + at least 1 e2e against real dsh web (manual) pass.
