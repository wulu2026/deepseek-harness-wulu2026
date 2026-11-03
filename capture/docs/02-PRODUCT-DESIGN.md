# Capture — 产品设计 (02)



## 1. 设计原则



1. **Conversation-first**：创作的 primarily interface 是聊天；面板是可视化视图与精 editorial tools。

2. **Structure > prose**: 每个 artifact (chapter, shot) 都是结构化数据 + Rendered text; agent 与人共同维护.

3. **Asset centric consistency**: 文本、镜头、生成结果都 link assets; 维护 identity 是第一优先.

4. **Gradual fidelity**: text → shot → still → clip → trailer, 每层可跳过/回退。

5. **Provenance everywhere**: 展示 "generated from shot X with asset Y v2".

6. **No blocking generation**: 长任务进入 jobs panel; UI stays responsive.

7. **Readable in 2 themes**: 浅/深主题 tokens only.

8. **Keyboard & focus**: 基本 DSH patterns.



## 2. 信息架构 (IA)



```

Session (DSH)

└─ (optional bound ProjectId)

Project (global plugin storage)

├─ Chapters

│   └─ Scenes (optional)

│       └─ Shots (shot list / versioned)

├─ Assets

│   ├─ Characters

│   ├─ Props

│   ├─ Locations

│   └─ Style Packs

├─ Generations (images/videos)

├─ Trailers

└─ Branches (forks)

```



### Client UI surfaces (DSH slots)



- `sidebar.workspaces.session.menu.item` → "Capture: 打开 Studio" action (per session) (row action)

- `main` slot OR `shell.overlay` → Studio Panel (we prefer an overlay blade or right-side panel; detail Q4)

- `settings.general.item` → Capture settings section

- `conversation.input.dock`? (optional) → quick actions bar when a Project is bound (e.g. "生成 shot 图")

- `conversation.chat.node` → register event renderers? Not needed: chat remains standard; our tools insert result references as standard messages.

- `shell.overlay` → dialogs: generation progress, branch diff, trailer preview, export.



Decision: **Project binding Lives in Session**. Open a session → if Project bound, show Studio Panel entry. If no project bound, Studio Panel offers "Create / Open Project" in a lightweight overlay.



## 3. 主要用户旅程 (Journeys)



### J1 创建新作品 (5 min)



```

User: "创建小说作品《末日都市》赛博朋克"

  → Story Manager creates Project + default assets folder.

UI: Studio Panel opens to Project Home (overview, empty chapters).

User: "写第一章：主角爬塔"

  → Outline/Story agents draft Chapter 1 markdown + beats.

UI: Chapter editor shows draft; beats list right panel.

User: "把第一章拆分镜，时长约2分钟"

  → Shot Director generates 8 shots (duration ~ 15s each).

UI: Shot list view.

```



### J2 生成角色图



```

User selects Asset "主角-林" → Generate → form: width/height/model/refs.

Gen Agent compiles identity lock (refs + traits) + style → provider.

Result card appears in Asset detail; auto-bind to shots referencing asset.

Provenance panel.

```



### J3 分镜视频 + 宣传片



```

User: "生成 shot 3 视频"

  → job queued → progress → clip.

User: "用高光 2,5,7 做一个30s 宣传片，赛博朋克电影感"

  → Trailer Agent picks beats + generates title cards + stitches (ffmpeg) → mp4.

  → present() files in session.

```



### J4 一致性检查



```

User: "检查一致性"

  → Consistency Agent scans shots+assets; lists warnings (read-only).

  UI badges per shot.

```



### J5 分支/合并



```

User: "fork 第4章尝试新结局"

  → deep copy Project branch.

  … work …

User: "合并回主线"

  → diff view (chapter + shots) → choose hunks → apply.

```



## 4. 页面与布局



### P1 Project Home (Overlay Blade, 720-960px wide)



Sections:

- Header: Project name, genre, logline, status chips (chapters/shots/assets counts)

- Quick actions: New chapter, Generate assets, Consistency check, Export.

- Recent changes (activity log from plugin storage journal).

- Continue where left off (last-opened chapter/shot).



### P2 Chapter Editor



- Left: chapter list + beats outline (collapsible)

- Center: rich text editor (markdown + blocks: dialogue, direction cues)

- Right: consistency warnings + asset refs mentioned + word count

- Bottom: agent suggestions panel (chips)



### P3 Shot List / Storyboard



- Grid or list of Shots (thumbnail default from still if exists, else placeholder)

- Each shot card: number, duration, type icon, description snippet, dialogue preview, asset chips, gen status badge.

- Detail drawer (right): full description, dialogue, camera, transition, asset bindings, generation controls, variants.

- Toolbar: sort (order), filter by chapter/type/status, bulk regenerate, export csv.

- Drag-reorder shots.



### P4 Asset Library



- Filterable grid: characters/props/locations/style packs.

- Asset detail drawer: refs, traits, identity lock prompt (editable), usage (shots), versions, generate (image).

- "Find reuse" highlight: reuse suggestions based on name/description.



### P5 Generation Queue & Results



- Active jobs with progress/cancel/retry.

- History list with provenance filter & re-roll.

- Media preview modal.



### P6 Trailer Studio



- Beat picker (drag reorder)

- Style & duration presets

- Title card editor

- Music/SFX selection (placeholder)

- Preview panel (mp4) + Export (present)



## 5. 交互模式 (Interaction patterns)



- **Diff-first edits**: agents never overwrite silently; proposed changes (create/update/delete) are shown as diffs with Accept/Reject/Modify.

- **Quick chips**: agent outputs 1-3 actionable chips; user taps.

- **Inline edit**: any artifact field editable; saves immediately with undo.

- **Empty states**: each panel has actionable empty state.

- **Progressive disclosure**: advanced fields (camera lens, transition timing) in "Advanced" accordion.

- **Error**: localized; generation failures show retry + logs.



## 6. 导航与状态



- Project/Chapter/Shots state stored globally (plugin storage); UI reads via selectors. Session binding pointer stored per session (prefer global last-opened).

- When session has no Project, Studio Panel = Project Picker + Create.

- Deep link via command: `/story open <projectId>`.



## 7. 响应式与主题



- DSH tokens (`--dsw-alias-*`) only; no literal colors except artwork.

- Panels scroll internally; outer layout by DSH shell.

- Dark/light tested side-by-side (per verification.md).



## 8. 可访问性



- ARIA roles for lists/buttons/dialogs.

- Keyboard: Escape closes overlays; Tab navigation; chips focusable.

- Reduced motion: honor DSH reduced motion.



## 9. UX 决策：Overlay vs Main panel



DSH main view is session-driven (conversation per session). Options:



- A. Register a `main` slot replacement that shows Studio when active and conversation otherwise (risk: conflicts with host `main`).

- B. Use `shell.overlay` for Studio panel (simpler, less intrusive; recommended for v1).

- C. Settings page only (not enough).



**Recommendation (Phase 0 spike validates)**: Use `shell.overlay` for Studio panel (wide blade) + `sidebar.session` row action entry. If overlay not wide enough, fall back to a right-drawer. Validate DSH slot props.
