# Capture — 技术架构 (04)



## 1. 形态



DSH Bundle（profile-installed）分为 Host half (`index.js`) 与 Client half (`client.js`)。



```

@local/capture

├─ package.json          # dsh.bundle.patch + dsh.client

├─ cordis.patch.yml      # insert row

├─ index.js             # Host apply()

├─ client.js             # factory(require) client

├─ lib/ ... (optional future split)

├─ locale/{en,zh}.json

└─ icon.svg

```



Install via `plugin_manager install_bundle` with abs path (with approved builds as needed).



## 2. Host side (index.js)



### 2.1 Services registered



- `capture` (core service) — Project/Chapter/Shot/Asset/Gen/Trailer storage IO + business logic.

- `captureMedia` (media storage) — file placement + refs.

- `captureGen` (generation orchestrator) — jobs + provider abstraction + queue.

- `captureAgents` maybe not separate service; agent presets registered as DSH plugin presets? (see Q? about skills)

- Tools registered under `ctx.tools` as `capture.*`.



### 2.2 Data storage



- Use DSH storage service (need inspect exact service name/API in Spike S1). Prefer `ctx.storage` if available; otherwise custom storage under `$DSH_HOME/storages/capture/` (JSON) using atomic writes (`dsh-atomic-write`).

- Media files: within storage area or a dedicated app-data dir. **Important**: keep paths stable across sessions; references via DSH deliverable ref API.



### 2.3 Events/projections



- Project/Shot state is global (storage), not per-session. But UI needs reactive updates. Use a session projection? Alternative: host storage emits change events on a `capture/changed` event (service-local) that clients subscribe via remote stream. DSH practices forbid new session event types (only `plugin:` records reserved). We'll use service-local websocket/channel (`remoteEvents`?) or poll with small intervals. **Spike S2** to identify best mechanism (probably `ctx.events`/`Event` service over `remoteAccess`).



### 2.4 Jobs



- Use `dsh-jobs` if available: long gen as Job with progress; else custom async queue with `ctx.schedule` + progress broadcasts. Need inspect.



### 2.5 Security/Routing



- Any Host HTTP routes (if used for media preview/download) follow dsh-archived pattern: restrict to loopback + same-origin + custom header. Prefer no custom route; use DSH file-reference/deliverable (recommended) so files open via host's standard endpoints.



## 3. Client side (client.js)



- Factory(require) pattern, `inject: ['slots','locale', maybe 'remoteAccess','jobs']`.

- Register locale namespace `capture`.

- Register slots:

  - `sidebar.workspaces.session.menu.item` (id `capture.open`, order around 450-500) → "打开 Capture".

  - `shell.overlay` entry → StudioPanel component.

  - `settings.general.item` → settings section (providers/config).

  - optional `conversation.input.dock` quick actions.

- Read Project data via host projection / remote call. Need identify; Spike S2.

- Render React components with own controls (no ui-primitives import as module; use DSH primitives only via type deps if in build; for factory pattern we write own buttons with tokens).



## 4. Generation pipeline (overview)



```

UI/Agent

  -> capture.generateImage({ shotId|assetId, kind, params })

     -> Gen Agent compiles prompt from asset identity lock + style + shot

     -> MediaProvider.generateImage -> file(s)

     -> record Generation row + link to Shot/Asset (version bump)

     -> emit change event -> UI updates; job progress

```



For video:

```

shot video: provider image-to-video or text-to-video (depending capabilities)

  -> store clip

trailer:

  - select beats (shots/highlights)

  - generate title cards (optional)

  - ffmpeg concat/trim/transcode → final mp4 with audio track placeholder

  - certificate/provenance manifest (JSON)

  -> present() file

```



Provider interface & mock in `index.js`; configurable via settings.



## 5. Agent presets / skills



We need register DSH skills so agents know how to call `capture.*` tools. Options:

- Add a bundled skill under `skills/capture/` in package? DSH agent-preset skills live in `dsh-agent-preset` package (built-in). For plugins, likely provide system prompt sections via `ctx.systemPrompt.section()` and/or tool descriptions. Skills registration for plugins? Spike S3.

- Alternatively, include an agent-preset override patch (high complexity). Phase 1 will use systemPrompt sections + tool descriptions; revisit.



## 6. Performance & UX



- All long ops as jobs; UI reads progress via polling/subscriptions (Spike S4).

- Avoid polling agent/status; use job status.

- Heavy lists: chunk via DSH chunked-list? Later.

- Media thumbnails lazy-load via file refs.



## 7. Testing



- Host smoke: temp DSH_HOME; create project/chapter/shot/asset; gen mock; export; restart read.

- Client smoke: factory renders? (stub React/fetch) as dsh-archived client-smoke.

- Compat-check: read app.asar and assert service APIs (we need define contracts after spike).

- E2E (real dsh web): manual Phase 1; `tools/e2e.py` analog optional.



## 8. Security & privacy



- No external calls unless provider configured + user opts in.

- All media local; generation prompts may include user content sent to provider (explicit).

- Roles: any agent in session can call tools; host storage global → agent can read all projects (acceptable v1; maybe scope later).

- API keys only via env (`DSH_CAPTURE_*`), never in storage.



## 9. Extension points summary (verified subset)



From dsh-archived + workspace README, slots:

- `sidebar.workspaces.session.menu.item` (session row menu)

- `sidebar.workspaces.session.row.action` (hover action)

- `shell.overlay` (blade/dialogs)

- `settings.general.item` (settings)

- `conversation.input.dock` (optional quick actions)

- `main` (possibly, avoid conflicts)



Tools: `ctx.tools` register (verify schema).

Storage: `ctx.storage`/domain (verify).

Jobs: `ctx.jobs` (verify).

Session: `ctx.sessions` (verify).

Locale: `ctx.locale.register`.

Slots: `ctx.slots.inject/register`.



Phase 0 spikes validate the above.
