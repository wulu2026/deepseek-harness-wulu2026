# Capture — 技术实现 (05)



## 1. Phase 0 — Spikes（先做，阻塞实现）



Run these tiny extraction/probes before coding any Host service. Output goes to `capture/docs/spikes/` (create now placeholder).



**S1 Storage API**

- Extract `dsh-storage`, `dsh-storage-domain`, `dsh-storage-json` READMEs (already partly). Determine: how a plugin registers a storage domain; directory path; transaction/atomic write API; how to read/write from Host.

- Deliverable: `capture/docs/spikes/S1-storage.md` with code snippets.



**S2 Client–Host data flow**

- Determine how Client can invoke `ctx.remote.commands.execute()` against Host service methods vs how Host service is exposed; inspect dsh-client-ui-workspace usage and `remoteAccess` package.

- Deliverable: `S2-client-host.md`.



**S3 Agent presets / skills for plugins**

- Whether plugin can register skill/agent preset; if not, use `systemPrompt.section()` + tool descriptions.

- Deliverable: `S3-agent-preset.md`.



**S4 Jobs API**

- Inspect `dsh-jobs` package: job create/progress/cancel.

- Deliverable: `S4-jobs.md`.



**S5 Media/image providers**

- Inspect DeepSeek account service (does it expose image gen?) + configured LLM providers. Decide mock HTTP provider shape.

- Deliverable: `S5-media-providers.md`.



For each spike: extract relevant README from app.asar using `/tmp/asarx.mjs`, read, summarize API, store snippet. Use `cordis_inspect_query` in a live run later as authority.



## 2. Build & packaging



We will use **plain JS factory bundles** (no compile step) for Host; Client as factory(require) (like template). For a richer TS UI we can later set up `tsdown`/`vite`, but Phase 1 uses extracted `client.js` factory to minimize risk and match DSH practice (no duplicate React).



Host (`index.js`) must:

- default export or `apply(ctx, config)`? Follow `apply(ctx, config)` form with `Config` optional.

- register services via ctx (names discovered in S1/S2).

- `inject`: if optional services used, declare in `inject` e.g. `inject: ['storage', 'jobs']` (validate names).



Client (`client.js`):

- `window.__ModuleLoader__.load({...})` factory; imports: `require('react')`. Other baseline modules via `require`.



Locale JSONs:

- `locale/en.json`, `locale/zh.json` with `meta.title/description` + all UI keys.



Icon: simple SVG, ≤ 256KiB.



## 3. File layout (Phase 1)



```

capture/

├─ package.json

├─ cordis.patch.yml

├─ index.js              # Host apply + Config

├─ host/

│   ├─ storage.js        # plugin storage adapter

│   ├─ models.js         # entity factories + validation

│   ├─ services.js       # capture core

│   ├─ tools.js          # tool registration

│   └─ agents.js         # system prompt sections + tool hints

├─ client.js             # Client factory (renderer shell)

├─ ui/                   # (Phase 1 keep inline; split later only if compile step added)

├─ locale/en.json

├─ locale/zh.json

├─ icon.svg

├─ skills/...            # optional (only if supported)

├─ tests/

│   ├─ host-smoke.mjs

│   ├─ client-smoke.mjs

│   └─ compat-check.mjs

└─ docs/...

```



Phase 2+ adds `media/` + providers.



## 4. package.json template



```json

{

  "name": "@local/capture",

  "version": "0.1.0",

  "private": true,

  "type": "module",

  "exports": {

    ".": "./index.js",

    "./client": "./client.js",

    "./locale/*.json": "./locale/*.json",

    "./icon": "./icon.svg"

  },

  "files": ["index.js", "host/*.js", "client.js", "cordis.patch.yml", "locale/*.json", "icon.svg", "tests/*"],

  "dsh": {

    "bundle": { "patch": "./cordis.patch.yml" },

    "client": {

      "platform": "web",

      "immediately": true,

      "inject": ["@deepseek-ai/dsh-client-ui-conversation", "@deepseek-ai/dsh-client-ui-workspace", "@deepseek-ai/dsh-client-ui-settings", "@deepseek-ai/dsh-client-locale"]

    }

  }

}

```



`cordis.patch.yml`:

```yaml

- insert:

    - id: capture

      name: '@local/capture'

      config: {}

```



Display metadata in locale JSON:

```json

{

  "meta": { "title": "Capture", "description": "Write stories, build shot lists, generate consistent characters and trailers." }

}

```



## 5. Data model & validation



Use plain JS objects with versioned schemas. Each entity has `schemaVersion: 1`. Storage root:



```

<DSH_HOME>/capture/

  projects/

    <projectId>.json

    <projectId>.lock

  media/

    <projectId>/

      assets/<assetId>/refs/...

      generations/<generationId>/...

  journal/

    <projectId>.jsonl (operation log)

  index.json (list of project ids + metadata)

```



(Before finalizing, S1 may redirect to `storages/` official. Keep configurable root.)



ID generation: `crypto.randomUUID()`.



State mutation: apply() pure-ish functions + atomic write via `dsh-atomic-write` if inspect confirms; otherwise write temp + fs.rename (atomic on same fs).



## 6. Host service API (draft; validate in spikes)



```ts

// ctx.capture (service)

createProject({ name, genre?, logline? }): Project

getProject(id): Project | null

listProjects(): ProjectSummary[]

updateProject(id, patch): Project

deleteProject(id): { ok, reason? }

forkProject(id, { branchName? }): { newProjectId }

// chapters

createChapter(projectId, { title?, index? }): Chapter

updateChapter(projectId,chapterId,patch)

deleteChapter(...)

// shots

createShot(...); updateShot(...); deleteShot(...); reorderShots(projectId, shotIds)

// assets

createAsset(...); updateAsset(...); deleteAsset(...); bindAssetToShot(...)

// generation

requestGeneration({ kind, sourceShotId?, assetId?, params })

getGeneration(id)

listGenerations(projectId?, status?)

cancelGeneration(id)

// trailers

createTrailer(...); renderTrailer(id) // job

exportProject(projectId, { format })

```



Tool names mirror under `ctx.tools.register('capture', ...)` with typed params (actual API TBD S?).



## 7. Concurrency & consistency



- Single-writer per project via in-process lock; generation jobs async.

- Atomic writes ensure crash safety; on startup, scan for `.tmp` and recover.

- Journal records each high-level op with timestamp+actor (user/agent) for undo & audit.



## 8. Fork/rollback



- Fork = deep clone project tree (new ids with `origin` pointer).

- Undo = journal-based revert of last N ops (proposal; storage-level).



## 9. Media provider architecture



```js

// providers/base.js

export class MediaProvider {

  static id='base'

  capabilities() { return { image:false, video:false, maxDurationSec:0 } }

  async generateImage	params) { throw }

  async generateVideo(params) { throw }

}

```



Configured via settings (host config or `cordis.patch.yml` config). Implementations:

- `mock` (Phase 0-1): produces placeholder PNG via a tiny built-in? Need a dependency allowed? Plain Node can write a 1x1 png buffer; for tests use buffer. Better: generate SVG→PNG? Use `sharp` maybe not available. For development, produce SVG placeholder images (still useful for thumbnails) and store; ffmpeg can still concat (images as frames? Need mp4 from images). For smoke tests we don't need real media; a 1-second black mp4 via ffmpeg (`ffmpeg -f lavfi -i color=c=black:s=320x180:d=1`) is acceptable. We'll implement providers lazily and gate behind availability.

- `http-image` (OpenAI-compatible) in Phase 2.

- `dreamina` etc not without API knowledge.



Generations all recorded, output file refs.



## 10. Video compile (ffmpeg)



Use `ffmpeg` for:

- concat clips with crossfade optional

- overlay title cards (text via drawtext)

- export sizes: 1920x1080, 1080x1920 (vertical), 1080x1080.



Phase 3 only.



## 11. Client implementation plan



Phase 1 UI minimal but complete:

- Project picker + create

- Chapter editor (textarea + markdown simple)

- Shot list table (editable cells)

- Asset library (list + create)

- Consistency warnings panel (text)

- Export MD/CSV

- Diff review dialog (proposed agent edits)



Use React `createElement` (factory style) for now; styled with tokens + CSS string injected via `styles.insert`? DSH allows component-local styles as React elements. We'll create `<style>` tag component.



State management:

- Host owns data; client calls `capture.*` via remote and refreshes.

- Use a simple store (context + useState). Data flows: action -> remote call -> reload affected view.



## 12. Tool definitions (draft params)



Each tool returns JSON result and is idempotent where possible. Authenticate? Host-side only; trust DSH session.



Examples:

```

capture.project.create { name, genre?, logline? }

capture.project.list {}

capture.project.get { projectId }

capture.chapter.create { projectId, title, index? }

capture.chapter.update { projectId, chapterId, patch }

capture.shotlist.generate { projectId, chapterId, targetDurationSec? }

capture.shot.update { projectId, shotId, patch }

capture.asset.create { projectId, kind, name, description, traits? }

capture.asset.bind { projectId, assetId, shotId, role }

capture.generation.request { kind, sourceShotId?, assetId?, params }

capture.trailer.create { projectId, beatShotIds[], style, durationTargetSec }

capture.export { projectId, format } -> file refs

```



Diff-first agent workflow: For edits proposed by agents, use tool `capture.proposeChange` that creates a "pending proposal" returning a proposalId; UI renders diff; `capture.applyProposal(proposalId)` persists. This protects against blind overwrites.



## 13. Tests (host smoke plan)



Script `tests/host-smoke.mjs`:

1. set DSH_HOME to tmp (set env) and basic profile? Actually host smoke may mock ctx. Follow dsh-archived: create temp DSH_HOME + fake ctx, load index.js apply, call service.

2. Scenario: create project → chapter → 5 shots → asset → bind → generation mock → export md → restart load → assert counts/data.

3. Verify media files exist.

4. Cleanup temp.



Client smoke: factory loads in node with stub global __ModuleLoader__ + React; assert no throw? Follow dsh-archived client-smoke.



Compat-check: extract/read installed app.asar? Simpler: assert service names/exports referenced exist in app packages (light). Follow dsh-archived compat-check (reads app.asar). We'll tailor to our imports.



## 14. Installation/dev workflow (Mac)



Dev:

1. `mkdir -p /path/to/dev/capture` (this repo)

2. `cd ~/.dsh/profiles/desktop` (profile) — but skill says do not hand-write profile; use `plugin_manager install_bundle`.

   - Since dev, we can call `plugin_manager action=install_bundle target=/abs/path` (local dir links).

3. Add HMR root (optional) for host code changes: profile `cordis.patch.yml` hmr entry root includes repo path (skill/doc). Ask user permission.

4. Restart `dsh web`? HMR may pick host changes if root configured; client changes refresh browser.

5. Verify capability: `cordis_inspect_query` service names; settings shows entry; overlay opens.



Shipping later: npm publish; `dsh plugin --profile web add ...`.



## 15. Rollback/Migration



- Version field on each entity (`schemaVersion`).

- On load, if `schemaVersion < current`, run migrator (`migrateV1toV2`, etc.) in-place and write back.

- Keep backup `.bak` before migration.



## 16. Observability



- Host logger via ctx.log (namespace `capture`).

- Metrics via optional product analytics if present (inject).

- No telemetry by default.



## 17. Open questions raised here → see 08



Q1 (storage official location), Q2 (DeepSeek image gen availability), etc.
