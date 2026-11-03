# Capture — PRD (01)



## 1. 范围定义



### 1.1 In scope (v1.0)



- 创作数据模型：Project / Chapter / Scene / Shot / Asset / Generation / Trailer

- 对话驱动的 CRUD（agent tools + UI 面板）

- 资产库复用与 "identity lock"

- 生成：character image / shot still / shot video / trailer

- Provenance & 版本

- 导出：Markdown / JSON / .docx（文本）+ mp4（视频）

- 与 DSH 的 session、agent、deliverables、jobs、storage 集成



### 1.2 Out of scope (v1)



- 多人协作 / 共享作品库 / 市场（Market）（v2）

- Timeline editor（v2）

- 移动端 / web（UI web 兼容但不测，v2）

- 非 DeepSeek 提供的 proprietary 生成 model 比价（v2）

- 版权/ licensing（v2）



## 2. 用户画像 & 用例 (Use cases)



### UC-1 新作品（Writer-A）

1. 在 DSH session 中输入 `/story new "末日都市" / genre: 赛博朋克`。

2. Outline Agent 提议 6 髥主要角色 + 3 幕结构；作家接受/修改。

3. 作家： "第1章，主角爬塔。" → Story Agent 生成章节草稿（markdown）。

4. "拆分镜" → Shot Director Agent 生成 8 个 shots + camera/action/dialogue。

5. "给我主角的设定图" → 角色图生成 (image gen)。

6. "生成第3个 shot 的视频" → shot video 生成。

7. "把 2 个高光拼成 30s 宣传片" → trailer 生成。

8. present() 交付 mp4; 用户下载.



### UC-2 一致性（Writer-A）

- 创建资产 "主角-林"（character），绑定 4 张参考图 + style seed。

- 在 shot 4 中使用该 asset; 生成 still 自动 inject identity lock.

- 后续 regenerate 可 "use seed X / same refs".



### UC-3 剧本（Writer-B）

- 导入现有 .docx 剧本 (start fresh from template).

- Shot list 从 beat sheet 自动生成；VDerive camera/locations.

- 导出 screenplay.md (Fountain-ish) + shot list.csv.



### UC-4 宣传片剪切（Creator-D）

- 从已完成作品导入 "高光 beats" → 生成 30s trailer with title cards.

- 两种风格：trailer (cinematic) / social (9:16 vertical crop).



### UC-5 迭代分支

- Writer fork chapter 4 → try ending A/B; compare diff → pick.

- 通过 subagent 对比 consistency issues.



### UC-6 Agent 自动一致性检查

- Consistency Agent 扫达成时 scan → flag: "林 在 shot 9 的头发颜色与 asset 不匹配" → propose fix.



## 3. 信息架构 (User-facing)



见 [`02-PRODUCT-DESIGN.md`](02-PRODUCT-DESIGN.md) §2.



4 个主视图 (DSH slot `main` 右侧 panel? 或 `conversation` 旁):

- **Studio Panel** = 项目/章节/分镜（树形）+ 详情 editor

- **Asset Library** = 资产列表 + 生成器

- **Generation Queue & Results** = 진행 중 / history

- **Trailer Studio** = 高光挑选 + 风格 + 导出



DSH 的 main view 是 session-driven（`uiWorkspace.openSession`），我们 plan to:

- use `settings.general.item` to register a **"Capture" settings/page** (optional)

- use `main` slot or `shell.overlay`? Prefer a **side-panel blade**? Actually DSH web's `main` shows conversation by session. We design as **Session-scoped**: each Session *can* be bound to a Project. Opening "Capture" panel opens a session-tied studio (plugin-owned subview) via `shell.overlay` or a `main` slot registration. Detail in TECH.



## 4. 功能矩阵 & 优先级



| ID | 功能 | Phase | Prio | Owner Agent |

|---|---|---|---|---|

| F1.1 | Project CRUD（name, genre, logline） | 1 | P0 | Story Manager |

| F1.2 | Chapter/Scene CRUD | 1 | P0 | Story Manager |

| F1.3 | Rich text editor（markdown + block） | 1 | P0 | UI |

| F1.4 | Outline / beat sheet | 1 | P1 | Outline Agent |

| F2.1 | Shot entity CRUD | 1 | P0 | Shot Director |

| F2.2 | Shot list 版本 | 1 | P1 | Story Manager |

| F2.3 | Fountain-ish screenplay import/export | 1 | P1 | Exporter |

| F3.1 | Asset CRUD (character/prop/location/style) | 1 | P0 | Asset Manager |

| F3.2 | Asset versioning | 1 | P1 | Asset Manager |

| F3.3 | Reference image upload (file) | 1 | P0 | UI |

| F3.4 | Identity lock template | 1 | P0 | Asset Manager |

| F4.1 | Character image gen | 2 | P0 | Gen Agent |

| F4.2 | Shot still gen | 2 | P0 | Gen Agent |

| F4.3 | Shot video gen | 3 | P0 | Gen Agent |

| F4.4 | Trailer cut | 3 | P0 | Trailer Agent |

| F4.5 | Vertical/social crop | 3 | P2 | Trailer Agent |

| F5.1 | Asset binding to shot | 2 | P0 | Shot Director |

| F5.2 | Consistency check (agent) | 2 | P1 | Consistency Agent |

| F6.1 | Branch/fork + diff + pick | 1 | P1 | Story Manager |

| F7.1 | Highlight beats → trailer | 3 | P0 | Trailer Agent |

| F7.2 | Title cards / captions | 3 | P2 | Trailer Agent |

| F8.1 | Outline/Scene/Shot agents | 1 | P0 | all |

| F8.2 | Consistency Agent | 2 | P1 | all |

| F9.1 | Export md/json/docx | 1 | P1 | Exporter |

| F9.2 | Export mp4 + present() | 3 | P0 | Exporter |



## 5. 数据 & 状态（data contracts）



### 5.1 Canonical entities



```

Project {

  id, name, genre, logline, audience?, tone?,

  stylePackId?, createdAt, updatedAt,

  chapters: [ChapterId], assets: [AssetId]

}

Chapter { id, projectId, index, title, synopsis, beats[], status, text(md), wordCount }

Scene? (optional; chapter -> shots directly OR via scene; we keep optional scene for screenplay mode)

Shot {

  id, projectId, chapterId?, sceneId?,

  order, durationSec,

  type: establishing|character|action|dialogue|insert|transition,

  description (narrative / action),

  dialogue?: { speaker, text, v.o? },

  camera: { shotSize, angle, movement, lens? },

  transition?: { type, duration },

  audio?, sfx?, music?,

  assetBindings: { characters:[AssetId], props:[], location?, stylePack? },

  generation?: { stillImageId?, videoClipId?, lastGeneratedAt, seed? },

  variants?: ShotVariant[]

}

Asset {

  id, projectId, kind: character|prop|location|stylePack,

  name, description,

  referenceImages: [fileRef],

  tags[], traits (character: age, gender, hair, voice...),

  identityLockPrompt (generated), version, createdAt, updatedAt,

  usedBy: [{ shotId, role }]

}

Generation {

  id, kind, sourceShotId? , assetId?,

  status: queued|running|done|failed|cancelled,

  progress, startedAt, finishedAt,

  params (prompt, seed, model, width, height, duration, ...),

  outputs: [fileRef],

  provenance: { shotId, assetVersions, promptHash }

}

Trailer {

  id, projectId, style: cinematic|social|vertical,

  durationTargetSec, beats: [shotId|highlight], titleCards[],

  status, outputs: [mp4Ref], progress

}

```



### 5.2 Storage placement



- Host storage domain: plugin namespace `capture`（validate in spike; see OPEN QUESTIONS Q1）.

- JSON files under `$DSH_HOME/storages/capture/` or plugin's own app-data dir (TBD after inspection).

- Media: `$DSH_HOME/.../capture/media/<projectId>/<assetId>/...` + file references via DSH deliverable/reference service.

- **Per-session vs global**: Projects are global entities (cross-session), media files are global. Session only holds the active "working set" pointer + agent context + chat. This is unusual for DSH (most state is session-derived). Justify as storage service + projection on top; allow an agent in any session to open a project.



### 5.3 Event-sourcing considerations



Per DSH practices: session log is source of truth. Our Projects live in host storage (domain store), not session log. To let agents replay and agents fork work safely:

- **Plugin storage is the SSOT for Projects**; sessions reference projectId only.

- **Session can fork a project** → new projectId (deep copy in plugin storage) or "branch" pointer. We record plugin storage mutation per session as an Operation record (journal) so undo works.

- Generation results referenced in chat as plugin records? Avoid new session event types (practice #16 says don't append `type: new`). Instead use existing `assistant/message` + `tool/result` events; store Generation DB row on host. Agent sees via tool results.



## 6. Agent & Model strategy



- Agents are defined via DSH agent preset (skills). Each specialized agent has system prompt + tools scope:

  - **Story Manager** (orchestrator): create project/chapter/shotlist, fork, merge.

  - **Outline Agent**: beats & structure.

  - **Shot Director**: shot list from beat/scene.

  - **Consistency Agent**: checks asset vs shot usage, reports mismatches (read-only propose).

  - **Asset Manager**: create/reuse assets from text.

  - **Gen Agent** (image/video): generation jobs & prompt compilation.

  - **Trailer Agent**: beat selection & trailer compile.

  - **Exporter**: export formats + present.

- Tool surface via `ctx.tools` registration: `capture.*` tools (we need verify actual API).

- Subagents for heavy reasoning to keep main context lean (per practice #28 — followup).



## 7. Provider abstraction (Generation)



```

interface MediaProvider {

  generateImage(params): { outputPaths, seed, model }

  generateVideo(params): { outputPaths, duration }

  capabilities: {...}

}

```



Implementations:

- **DeepSeek account (if supports image)** — TBD inspect account API.

- **Generic HTTP image API** (user supplies base URL + key; OpenAI-compatible `/images/generations`, Stability, etc.)

- **Local** (ComfyUI/A1111 + ffmpeg for stitching) — optional, Phase 3.

- **Mock provider** (Phase 1/development & tests, produces placeholder images via sharp/placeholder).



Phase 1 ships only Mock + a thin HTTP provider; real APIs validated in Spike (see OPEN QUESTIONS Q2/Q3).



## 8. 验收标准



Phase 1:

- E1: `/story new "X"` + `/story chapter add` + `/story shotlist generate` produces Project + Chapter + 5 Shots; shown in Studio Panel.

- E2: Agent can edit shot_dialogue via `capture.shot.update`; diff shown.

- E3: Asset create + bind to shot; consistency warning visible.

- E4: Fork chapter → 2 branches; pick winner restores.

- E5: Export screenplay.md + shotlist.csv.

- E6: Host smoke & client smoke pass; compat-check passes.

Phase 2:

- E7: Character image gen + previews; provenance stored.

- E8: Regenerate with same seed reproduces (provider permitting).

Phase 3:

- E9: Shot video generation + trailer export (mp4) present().



## 9. 风险缓解的具体 commit



- Phase 1 强制做 session-replay 验证（restart DSH; projects persist via host storage).

- 所有生成输出写到 `$DSH_HOME/.../capture/media`, 并用 DSH `present()` + `deliverable` file ref，so they are first-class.

- Job 取消 & 部分失败 recovery: 每 job 提供 retry + clean up temp.

- Consistency warnings 仅 propose, 不 auto-change (human in loop).



## 10. 发布 & 版本



- v0.1.0: internal test（Phase 1 done）

- v0.2.0: beta with image gen（Phase 2）

- v0.3.0: video + trailer（Phase 3）

- v1.0.0: public bundle (Phase 4)

MS/semver; see MILESTONES.



## 11. 指标 instrument（Phase 1 即埋点 off by default）



- `projects_created`, `shots_generated`, `asset_reuse_count`, `agent_edit_accepted/rejected`, `gen_jobs_*`, `trailer_exports`.

- 通过 `dsh-client-product-analytics`（optional service, 注入). We call only if present.
