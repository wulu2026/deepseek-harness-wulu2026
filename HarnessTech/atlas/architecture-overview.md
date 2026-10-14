# DeepSeek Harness Architecture Overview

> **Audience**: Developers, architects, and contributors who want a holistic mental model of the codebase.
> **Scope**: This is a *hand-authored guide*, not a generated catalog. It explains *why* things are structured this way, not just *what* exists.
> **Source**: Synthesized from `docs/architecture.md`, `docs/subsystems/*.md`, `docs/capability-seams.md`, package READMEs, and key Agent Notes.

---

## 1. High-Level Philosophy

DeepSeek Harness is **an all-plugin Cordis agent harness**. There is no privileged core to patch—every part (model adapter, tool registry, session log, agent loop) is a plugin, replaceable from configuration.

**Three pillars**:

| Pillar | What it means |
|--------|---------------|
| **Composition over inheritance** | Behavior is added by mounting plugins beside others; registrations are effects that unwind on unload. |
| **Model-visible ⟺ logged** | Anything reaching a model request must be reconstructable from the session log. New model-visible input requires a session event. |
| **Capability seams** | A swappable capability = Service Definition + Service Provider(s) + Consumer(s). One role alone is not a seam. |

---

## 2. Runtime Composition: Profiles & Bundles

```
dsh --profile web
      │
      ▼
┌─────────────────────────────────────┐
│ Layer 1: dsh-base (shared spine)    │  ← model adapters, tools, persistence, sandbox, settings, credentials, telemetry
├─────────────────────────────────────┤
│ Layer 2: dsh-web-app                │  ← browser application, host services
├─────────────────────────────────────┤
│ Layer 3: Home cordis.patch.yml      │  ← user overrides
├─────────────────────────────────────┤
│ Layer 4: --patch overlays (CLI)     │  ← ephemeral test/dev patches
└─────────────────────────────────────┘
```

- **Profile** = named composition stored in Harness home; lists bundles + optional out-of-tree plugins + user `cordis.patch.yml`.
- **Bundle** = distribution format for Cordis config rows + code; stays patchable by layers above.
- Shipped profiles: `web`, `headless`, `sdk`, `sdk-minimal`, `acp`, `desktop`.
- **Application launch rule**: Only `dsh` profiles launch supported Node apps; package bins, demos, and public SDK argv escapes are forbidden.

---

## 3. Core Subsystems (The Product API Spine)

Located in `packages/core/`. Six packages form the turn loop:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TURN FLOW (one loop iteration)                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. driver (agent-loop) claims queued prompt                                 │
│    └─ opens turn on session log (ctx.sessions)                              │
│ 2. assemble request prefix via system-prompt (ctx.systemPrompt)             │
│    └─ derives history from session log                                      │
│ 3. stream model response via LLM seam (ctx.llm)                             │
│ 4. dispatch tool calls via tool registry (ctx.tools)                        │
│ 5. append every model-visible fact back to session log                      │
│ 6. next step derives from updated log                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Package | Owns | `ctx` key | Subsystem Doc |
|---------|------|-----------|---------------|
| `session/` | Append-only `SessionEvent` log, in-memory store | `ctx.sessions` | [session.md](../subsystems/session.md) |
| `system-prompt/` | Prompt-section + tool-schema assembly | `ctx.systemPrompt` | [system-prompt.md](../subsystems/system-prompt.md) |
| `tools/` | Scoped tool registry, guarded execution pipeline | `ctx.tools` | [tools.md](../subsystems/tools.md) |
| `agent/` | `Agent` interface, live registry, `agent/*` events | `ctx.agents` | [core.md](../subsystems/core.md) |
| `agent-loop/` | Default driver implementing `Agent` contract | `ctx.agentLoop` | [core.md](../subsystems/core.md) |
| `scope/` | Scoped-registration primitive (library, no `ctx` key) | — | [scope.md](../subsystems/scope.md) |

**Key separation**: `agent` owns the *public contract* (`Agent` handle, factory seam, events); `agent-loop` is the *default implementation*. Extension plugins depend on `agent` only—the loop stays swappable.

---

## 4. The Session Log: Single Source of Truth

**`Session` = append-only log of typed `SessionEvent`s**. LLM message history is *derived* (`deriveMessages()`), never stored separately. Replay = re-derivation from same events.

### Event Vocabulary (`SessionEventMap` — merge-extensible)

| Category | Events | Durable? | Surface? |
|----------|--------|----------|----------|
| Turn boundaries | `turn/start`, `turn/end` | ✅ | ❌ |
| Step boundaries | `step/start`, `step/end` | ✅ | ❌ |
| Model-visible messages | `user/message`, `system/message`, `assistant/message`, `tool/result` | ✅ | ✅ |
| Failed attempts | `assistant/attempt` | ✅ | ❌ |
| Tool calls | `tool/call`, `tool/result` | ✅ | `tool/result` only |
| Request metadata | `request/header`, `request/context` | ✅ | ❌ |
| Fork/seeding | `session/end-seed` | ✅ | ❌ |
| Plugin-owned | `compaction/*`, `hook/*`, `plugin:*` | ✅ | ❌ |

**Critical invariants**:
- Every `SurfaceEventType` (`system/message`, `user/message`, `assistant/message`, `tool/result`, `developer/message`) **must** carry `surfaceOp` (`append` or `replace`) declaring how it joins the ordered surface.
- `assistant/message` embeds the **exact compact timed provider stream** (`AssistantStreamRecord[]`) — this is the replay/usage/UI evidence.
- `request/header` logs the full `EpochHeader` (call config + adapter defaults + assembled tool schemas) — the system prompt is *not* in the header (it's derived history via `system/message`).
- Sequence numbers (`seq`) are monotonic and contiguous; `time` is epoch ms.

### Derived History (`deriveMessages()`)

Projects the event log → `Message[]` the model sees:
- Cached: each surface node projected once; surface rewrite rebuilds.
- Frozen: fresh array per call over shared, deep-frozen `Message` objects.
- Projection rules:
  - `user/message` → user message (exact `content`; envelope is log-only metadata)
  - `assistant/message` → assistant message (provider, model, optional adapter-private replay state, embedded stream)
  - `tool/result` → tool-role message (result content + tool-call identity)
  - Injected context (`user/message` with non-`user` source) → user message at chronological position

---

## 5. Agent & Agent Loop: The Live Handle

### `Agent` Handle (public contract, `packages/core/agent`)

```ts
interface Agent {
  readonly id: SessionId
  readonly options: AgentOptions          // provider, model, reasoningEffort, maxTokens
  readonly session: Session               // the durable log
  readonly inbox: Inbox                   // durable pending work (nextTurn / nextStep)
  readonly status: 'idle' | 'running'
  readonly ctx: Context                   // agent-scoped registrations (unwind on dispose)

  cancel(cause, options?)                 // abort active turn; keepInbox preserves pending
  whenIdle(): Promise<void>               // whole-agent quiescence
  runMaintenance(task)                    // non-turn task from true idle
  send(message, target, wakeup)           // unified routing
  followup(message)                       // queue ordinary turn + wake
  steer(message)                          // submit for nearest step boundary
  inject(message)                         // queue context for next pre-step (no wake)
}
```

**Ownership**: `AgentHandle = { agent, dispose() }` — the disposer is a **capability**; only its holder can tear the agent down. The registered factory provider is a structural co-owner.

### Initiator Scope (process-local)

`ctx.agents.withInitiator(agent, fn)` carries the exact live `Agent` through async chains. **Ambient presence is neither liveness proof nor authorization** — explicit identity stays authoritative at worker, process, persistence, and wire boundaries.

### Agent Loop (`packages/core/agent-loop`)

Default driver. Runs each driver inside `ctx.agents.withInitiator()`. Key responsibilities:
- Factory: `create()` / `resume()` → `AgentHandle`
- Turn/step lifecycle (see Turn Flow below)
- Inbox projection (`agent/inbox/*` events)
- Checkpoint policy (`session/flush`)

---

## 6. Turn Flow (Detailed)

```
turn/start
  claim next-step input + one queued message
  assemble prompt sections + tool schemas
  -> agent/pre-step (waterfall)
       reject | enter(messages, startsRequestSeries?)
  reject, or empty first enter -> close turn with no step
  step/start
  agent/request (waterfall) -> prepareCall() resolves route
       cancellation here commits neither system nor users
  reconcile system/message using prepared call capability
  append entered messages as user/message; reconcile retained runtime context
  log request/header and request/context as needed
  derive and freeze model history from log
  stream bound prepared call -> llm/stream -> agent/assistant-stream start
    agent/assistant-stream chunk*
    assistant/message | assistant/attempt -> agent/assistant-stream end
  tool/call* -> tools/pre-execute -> tools/execute -> tools/post-execute -> tool/result*
  step/end
  tools owe another request, or next-step input arrived -> claim -> next step
  -> agent/turn-stopping (serial, no next())
turn/end
```

**Waterfall listeners MUST call `next()`** to delegate; returning without it short-circuits the chain.

**Event domains**:
- **Session events** (`turn/*`, `step/*`, `system/message`, `user/message`, `assistant/message`, `assistant/attempt`, `tool/*`, `request/*`, `session/end-seed`) — durable, appended to log, broadcast via `session/event`.
- **Agent events** (`agent/*`) — live, carry `Agent`, for observation/interception in flight.
- **Capability events** (`fs/*`, `tools/*`, `telemetry/*`) — policy/adapters for a seam, no loop import.

---

## 7. Capability Seams: The Swappable Backbones

A **seam** = Service Definition + Service Provider(s) + Consumer(s). Three roles, complete.

| Seam (`ctx` key) | Definition Package | Shipped Provider(s) | Primary Consumers |
|------------------|-------------------|---------------------|-------------------|
| `ctx.llm` | `llm` | `llm-deepseek`, `llm-pi-ai`, `llm-replay` | `agent-loop`, `compaction-basic` |
| `ctx.tools` | `tools` | — (registry) | `agent-loop`, `tool-*` packages |
| `ctx.fs` | `fs` | `fs-local`, `fs-sandbox`, `fs-ssh` | `tool-fs` |
| `ctx.shell` | `shell` | `bash-local`, `bash-sandbox`, `pwsh-local` | `tool-bash`, `tool-pwsh`, `hooks-*` |
| `ctx.subprocess` | `subprocess` | `subprocess-local`, `subprocess-ssh` | `bash-local`, `bash-sandbox`, `lsp-stdio`, `terminal-bash`, subagents |
| `ctx.sandbox` | `sandbox` | `sandbox-local`, `sandbox-ssh` | `bash-sandbox`, `fs-sandbox`, `terminal-bash` |
| `ctx.terminals` | `terminal` | `terminal-bash` | `tool-terminal` |
| `ctx.sessionPersistence` | `session-persistence` | `session-persistence-jsonl` | `agent-loop`, `session-query`, `hooks-*` |
| `ctx.sessionQuery` | `session-query` | `session-query-sqlite` | `session-reference`, `tool-session-query` |
| `ctx.credentials` | `credentials` | `credentials-local` | `api-settings-controller`, `llm-deepseek`, `llm-pi-ai` |
| `ctx.subagents` | `subagent` | `subagent-spawn-in-process`, `subagent-fork-in-process`, `subagent-dsh-sdk`, `subagent-acp`, `subagent-codex`, `subagent-claude-code` | `tool-subagent`, `tool-ralph`, `tool-subagent-control` |
| `ctx.web` | `web` | `web-search-*`, `web-fetch-http` | `tool-web` |
| `ctx.compaction` | `compaction` | `compaction-basic` | `tool-*` (via loop) |
| `ctx.ptcRuntime` | `ptc-runtime` | `ptc-runtime-node`, `experimental-ptc-runtime-python` | `tools`, `workflow-ptc` |
| `ctx.workflowEngine` | `workflow` | — | `tool-workflow`, `tool-ralph` |
| `ctx.agentPresets` | `agent-preset-registry` | — (registry) | `agent-loop`, cold readers |
| `ctx.skills` | `skill` | `skill-filesystem`, `skill-office`, `skill-badge`, `sandbox-windows-acl` | `tool-skill` |
| `ctx.browserUse` | `browser-use` | `experimental-browser-use-*` | (provider-owned tools) |
| `ctx.computerUse` | `computer-use` | `experimental-computer-use-*` | (provider-owned tools) |

**Why this matters**: Swapping one provider (e.g., `fs-local` → `fs-sandbox`) moves Bash, PTY, and LSP with it—no provider forks needed.

---

## 8. Plugin System & Cordis

**Cordis** = the framework underneath. Plugins contribute:
- **Services** (`ctx.xxx`)
- **Typed events** (declaration merging on `SessionEventMap`, `ContentBlockMap`, etc.)
- **Reversible effects** (`ctx.effect()` / `ctx.on()`) — registry `register()` returns disposer

**Conventions**:
- Service packages default-export their service class; function plugins named-export `name`/`inject`/`Config`/`apply`.
- Optional services use `ctx.get(name)`; reserve `ctx.<name>` for declared injections.
- Waterfall listeners MUST call `next()`.
- Switch on discriminant tags; closed unions end in `assertNever`; merge-extensible unions fall through documented `default`.
- Registrations are effects: every contribution goes through `ctx.effect()` / `ctx.on()`.

---

## 9. Type Patterns (Repo-Wide)

### Map → Derived Union
Almost every extensible sum type:
```ts
interface ThingMap { 'a': { kind: 'a' }; 'b': { kind: 'b' } }
type ThingKind = keyof ThingMap          // 'a' | 'b'
type Thing = ThingMap[keyof ThingMap]    // discriminated union
// Plugin extends via declaration merging:
declare module '@deepseek-ai/dsh-llm' {
  interface ThingMap { 'c': { kind: 'c' } }
}
```
Canonical maps: `ContentBlockMap`, `MessageSourceMap`, `FinishReasonMap`, `TurnEndReasonMap`, `SessionEventMap`.

### Branded IDs
IDs passed between packages are **branded** — structurally strings, non-interchangeable at type level.
- `SessionId` (shared live agent + durable session identity)
- `ToolCallId` (correlates call with result)
- Capability packages brand their own (`JobId`, etc.)
- Constructor: `brandString<T>()` from `dsh-brand` (zero-dependency).

---

## 10. Persistence & Durability

### Seam: `ctx.sessionPersistence` (`SessionPersistence` interface)
- `create(id, header) / open(id, access) / stat() / list()` → `SessionHandle`
- **Handle-based**: every log read/write flows through a handle (single-writer ownership).
- `SessionHandle`: `read()` / `append()` / `flush()` / `close()` (AsyncDisposable).
- Shipped provider: `session-persistence-jsonl` (one artifact per session: `session.vN.jsonl[.zstd]`).

### Flush Checkpoint
- `session/event` is synchronous; backend routes to active write handle's bounded write-behind window.
- `session/flush` cancels wait, drains through quiescence — loop uses it as ordering/error-observation checkpoint before next turn.

### Crash Recovery
- Log crashed mid-turn → open `turn/start`, no `turn/end`.
- Persistence **does not truncate/repair** — returns physically valid contiguous log.
- Repair = reader's job: `agent-loop` resume appends `interruptedTurnClosers` (missing tool errors, open `step/end`, synthetic `turn/end { reason: { kind: 'interrupted' } }`) before publishing Session.
- Read-only observers (session-query) balance in memory only, write nothing.

### Session Format Versioning
- `SESSION_FORMAT_VERSION` (monotonic `SCHEMA_VERSION` in SQLite).
- JSONL v0: `session.jsonl[.zstd]`; v1+: `session.vN.jsonl[.zstd]`.
- **Committed generation paths are never renamed, replaced, or deleted.**
- Adjacent migration: each `vN → vN+1` step owned by a dedicated package; reader composes static migration chain once on write open.
- Same-version changes require safe reader behavior; bump version only when existing discriminators cannot prevent unsafe interpretation.

---

## 11. System Prompt Assembly

`ctx.systemPrompt` collects **ordered sections** + **tool schemas** per step.
- First `system/message` = surface node 0 (before first `user/message`).
- Prepared in-history route: non-empty changes append after cached history.
- Incapable route or new series: normalizes text to first system node (empties later nodes, rewrites head via logged per-node replacements).
- Empty rendering clears all active system nodes (no old prompt model-visible).
- Tool schema changes: capable routes append non-empty updates; incapable routes consolidate at first system node.

---

## 12. Tool Pipeline

`ctx.tools.execute()` → `ToolExecutionInput` (caller-owned, readonly `signal`) → materializes parsed args once → `ToolExecution` → pipeline:

```
tools/pre-execute (waterfall: allow/deny/ask)
  → registered monotonic guards
  → tools/execute (around-dispatch wrappers; only view that may replace signal)
  → projectContent (definition-owned, pre-policy)
  → tools/post-execute (inspect/replace result)
  → finalizeContent (definition-owned, synchronous last-mile)
  → tools/result (immutable authoritative outcome)
```

**ToolDefinition** = `ToolSchema` + mandatory `output` (canonical JSON Schema + `render` + optional `presentationMeta`) + `execute` + optional `projectContent`/`finalizeContent`/`timeoutMs`/`isConcurrencySafe`/`presentCall`/`presentResult`.

**Schema DSL**: unified `ValueSchemaSpec` for parameters and output values (`string`/`number`/`integer`/`boolean`/`null`/`array`/`object`/`json`/`oneOf`); `defineTool` validates, narrows, infers.

**ToolRestriction**: per-scope filter over inherited global tools (`allow`/`deny`); scoped registrations stay exempt.

---

## 13. Key Design Invariants (The "Don't Break These" List)

| Invariant | Where Enforced | Why It Matters |
|-----------|----------------|----------------|
| **Model-visible ⟺ logged** | `Session.append()` validation, `deriveMessages()` | Replay, fork, compaction, telemetry all derive from log |
| **Session events are append-only, contiguous seq** | `Session.append()`, persistence `append()` | Total order, deterministic replay, crash recovery |
| **Waterfall listeners call `next()`** | Convention + tests | Chain delegation; short-circuit = bug |
| **Branded IDs across package boundaries** | TypeScript `Branded<B>` | Prevents `SessionId` passed where `ToolCallId` expected |
| **Capability seam = Definition + Provider + Consumer** | Architecture review, `capability-seams.md` | One role alone is not a seam; swapping works end-to-end |
| **Extension plugins depend on Service Definitions, never concrete providers** | `packages/AGENTS.md`, package `peerDependencies` | Loop stays swappable; `dsh-agent-loop` is replaceable |
| **No hardcoded tunables in plugins** | Config validation at load | Deployment-varying choices = validated `Config` fields |
| **Misconfiguration fails loud at load** | Plugin `config` validation | No silent skipping of missing referents |
| **Opaque cross-boundary IDs are branded** | `dsh-brand`, type checks | Type safety at process/wire boundaries |
| **Source plane vs artifact plane never mixed** | `tsconfig` paths, `pnpm run build` gates | Tests resolve workspace imports to `src`; built `lib/` consumers declare dependency |

---

## 14. Extension Points (Where New Behavior Goes)

| Goal | Mechanism |
|------|-----------|
| Add model provider | Register adapter on `ctx.llm` |
| Add model-facing capability | Register on `ctx.tools`; schema joins prompt assembly |
| Give one session different capabilities | Compose agent preset; service row needs `isolate` realm |
| Add shell execution | Register `ctx.shell` backend; local spawns via `ctx.subprocess` |
| Add persistent terminal | Register `ctx.terminals` backend + `dsh-tool-terminal` |
| Add human command | Register on `ctx.commands`; dispatches without model turn |
| Manage background jobs | Register on `ctx.jobs`; `job_*` tools read/stop |
| Add filesystem access/policy | Register `ctx.fs` provider or listen to `fs/*` events |
| Confine spawned processes | Use `ctx.sandbox` backend; consumers wrap argv before spawn |
| Intercept request/tool/turn | Use `agent/*` or `tools/*` event; `agent/turn-stopping` stops turn |
| Add model-facing context | Call `agent.inject()`; lands in next admitted request |
| Add UI/editor integration | Drive `ctx.agents` and render from `session/event` |
| Add Web Client Chat node | Register `ConversationNodeDefinition` + keyed renderer |
| Add durable session state | Extend `SessionEventMap`; render/replay from log |
| Generate session titles | Register sole `ctx.sessionTitle` provider |
| Manage same-session objective | Use `ctx.goals`; continue through `agent/*` |
| Fork session at turn boundary | `ctx.agents.create({ sessionId, seed, meta: { parentSession, seedLength } })` |
| Store sessions in new backend | Implement `SessionPersistence` over shared handle scaffolding |
| Scope registration to one agent | Use that agent's `agent.ctx` |

---

## 15. Dual SDK Projection

Both **TypeScript SDK** (`packages/sdk`) and **Python SDK** (`python/`) project the same agent loop, session lifecycle, and `SessionEventMap`. Changes to these surfaces update both SDKs in the same PR. Neither `pnpm run test` covers this — snapshot tests do.

---

## 16. Testing Strategy (For Context)

- **Unit tests**: `pnpm run test` (coverage gate: `pnpm run test:coverage` = per-file 100% on `packages/*/*/src`).
- **Real-API e2e**: `pnpm run test:e2e` (self-skip without `DEEPSEEK_API_KEY`).
- **Snapshot tests**: `pnpm run test:snapshot` — keyless recorded-session replay through shipped profiles. **Every non-trivial model- or product-user-visible change updates a snapshot.**
- **Fixtures replay on macOS/Linux**; fix fixtures, not normalizers.
- **Source launch**: `pnpm dsh --profile headless "task"` runs through `tsx/esm`; modules must stay ESM (no CJS-only exports).

---

## 17. Navigating the Codebase (Mental Map)

```
packages/
├── core/           # Session, prompt, tools, agent, loop, scope — the spine
├── llm/            # LLM adapter seam + DeepSeek / Pi.ai / replay providers
├── shell/          # Bash executor seam + local/sandbox/PowerShell impls
├── subprocess/     # Subprocess seam + local/SSH impls
├── sandbox/        # Process confinement seam + bwrap/Landlock/Seatbelt
├── terminal/       # Persistent PTY registry + bash backend
├── fs/             # Filesystem seam + local/sandbox/SSH + model tools
├── session/        # Durable session data plane (persistence + projection + query)
├── session-query/  # Logical corpus, bounded reads, lineage, FTS
├── preset/         # Per-session agent composition from cordis.yml
├── subagent/       # Delegated agents (spawn/fork/ACP/Codex/Claude Code/SDK)
├── workflow/       # PTC script engine + workflow tool
├── compaction/     # Compaction seam + basic provider + command
├── context/        # Model-visible request context (workspace, time, refs)
├── skill/          # Skill loading (catalog + local provider + tool)
├── web/            # Search/fetch seam + Exa/Perplexity/DeepSeek/HTTP
├── browser-use/    # Browser provider registration (Playwright/Chrome DevTools/Stagehand)
├── computer-use/   # Computer provider registration (CUA driver MCP/native)
├── mcp/            # External MCP servers as native tools
├── credentials/    # Credential seam + env/.env provider + auth flows
├── settings/       # User settings seam + file-backed provider
├── attachment/     # Binary attachments (content-addressed storage)
├── spill/          # Output spill storage + policy
├── storage/        # Non-session storage hub + JSON/SQLite + domain forms
├── workspace/      # Workspace entity registry
├── feedback/       # Human feedback (message + session level)
├── interaction/    # Approval/interaction seams, permission presets, ask-user tool
├── goal/           # Same-session goal persistence
├── schedule/       # Host scheduled follow-ups
├── jobs/           # Background job registry + tools
├── guard/          # Loop hygiene guards (repeat reminders, deadline enforcer)
├── extensions/     # Runtime self-modification (live plugin inspect/mount)
├── acp/            # Automation-only ACP server
├── sdk/            # JSON-RPC SDK (client/server)
├── host/           # GUI host services (directory picker, launch, plugin inventory)
├── client/         # Web GUI client (shell, wire, object services, slots)
├── boot/           # App boot, plugin manager, config editor, HMR
├── bundle/         # Installable profile patch layers (base, web-app, headless, sdk, acp, sdk-minimal)
├── experimental/   # Evaluated capabilities without product-support commitment
├── test-support/   # Test infrastructure (testkits, replay, Loader smokes)
├── util/           # Zero-dep utilities (Branded, home/path, timeout, retention)
├── typert/         # Type graph generation + runtime registry + gateway
├── api/            # Remote BFF (session/job/workspace/terminal/settings controllers)
└── document/       # Office-to-PDF conversion
```

---

## 18. Where to Go Next

| If you want to… | Start here |
|-----------------|------------|
| Add a model-facing tool | [cookbook/adding-a-tool.md](../cookbook/adding-a-tool.md) → `packages/core/tools` |
| Add an LLM adapter | [cookbook/adding-an-llm-adapter.md](../cookbook/adding-an-llm-adapter.md) → `packages/llm` |
| Add a filesystem provider | `packages/fs` → `ctx.fs` seam |
| Understand session migration | `.agents/notes/implemented/architecture/2026-08-31-released-session-format-migrations.md` |
| Debug a live agent | `agent/*` events + `agent/assistant-stream` + `session/event` |
| Write a preset | `packages/preset/agent-preset-registry` + `cordis.yml` with `isolate` realm |
| Replace the agent loop | Implement `AgentFactory` + register on `ctx.agents.setFactory()` |
| Add a Web Chat node | [subsystems/conversation.md](../subsystems/conversation.md) → `ConversationNodeDefinition` |

---

## 19. Glossary (Canonical Terms)

| Term | Meaning |
|------|---------|
| **Seam** | Swappable capability: Service Definition + Provider(s) + Consumer(s) |
| **Session** | Append-only log of `SessionEvent`s; single source of truth |
| **Turn** | Zero or more steps; opens before first input claimed, closes when nothing owed |
| **Step** | One model request + the tools it calls |
| **Surface** | Ordered derived model-visible messages (`surfaceOp` = `append`/`replace`) |
| **Initiator** | Process-local `Agent` carried by `ctx.agents.withInitiator()`; not liveness proof |
| **Branded ID** | `Branded<B>` — compile-time string brand, non-interchangeable across types |
| **Profile** | Named composition (bundles + user patch) stored in Harness home |
| **Bundle** | Patchable distribution format for Cordis config rows + code |
| **Waterfall** | Cordis listener chain where each MUST call `next()` to delegate |
| **Effect** | Reversible registration (`ctx.effect()` / `ctx.on()`); `register()` returns disposer |

---

*Generated for `wulutech/atlas/architecture-overview.md` — 2026-10-14*