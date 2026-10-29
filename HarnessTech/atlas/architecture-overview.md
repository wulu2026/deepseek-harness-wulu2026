# DeepSeek Harness Architecture Overview

## 1. High-Level Philosophy

Everything is a plugin. DeepSeek Harness（DSH，`dsh`）是基于 [Cordis](../../docs/cordis-primer.md) 的 agent harness：插件向共享 context 贡献 service、typed event 与 reversible effect。模型 adapter、tool registry、session log、agent loop 都是 ordinary 可替换插件，[docs/architecture.md#Cordis].

没有 privileged core 可 patch；扩展就是 mount 一个插件 beside the others，注册都是 effect，卸载插件 effect unwind. **Model-visible ⟺ logged**：任何模型可见输入皆必须可从 Session log 重建；新 model-visible input 需 session event.

Capability seam = Definition(服务声明) + Provider(实现) + Consumer(使用者)，三角色齐备才算缝，一个角色不是缝.

## 2. Runtime Composition: Profiles & Bundles

运行中的 dsh 是 boot 时按 layer 组成的插件树. profile = 命名 composition，bundle = config rows + mounted code 的分发格式.
层 stacking 顺序：profile ordered bundles → profile's `cordis.patch.yml` → home patch → `--patch` overlays. Patch 通过 row id 替换 / 插入. `preset` patch 在 declaration 的 `config.plugins` 内应用相同逻辑.

shipping profiles: `web`,`headless`,`sdk`,`sdk-minimal`,`acp`. base layer = [`dsh-base`](../../packages/bundle/base/README.md): `dsh-web-app` adds browser app, `dsh-headless` one-shot runner, `dsh-sdk-app` SDK JSON-RPC, `dsh-acp-app` automation-only ACP, `dsh-sdk-minimal` deliberate exception: one bundle owns its complete explicit SDK tree and does **not** apply dsh-base.

YAML 控制 HMR：base 启用 config-only `dsh-hmr`；headless/sdk/acp 禁用；`sdk-minimal` 省略.

Inspect the tree your machine boots: `dsh --profile web --dump-config`.

One anomaly: application launch **only** through named `dsh` profiles. Vendor CLIs/demos/direct in-process mounting/public SDK argv escape all forbidden [AGENTS.md#application-launch].

## 3. Core Subsystems (产品 API 主干)

Table (from docs/architecture.md):

| Package | Owns | ctx key |
|---|---|---|
| core/session | append-only SessionEvent log + in-memory store | ctx.sessions |
| core/system-prompt | prompt-section & tool-schema assembly | ctx.systemPrompt |
| core/tools | scoped tool registry + guarded execution pipeline | ctx.tools |
| core/agent | Agent interface + live registry + agent/* events | ctx.agents |
| core/agent-loop | default driver implementing the interface | ctx.agentLoop |
| core/scope | per-agent scoped-registration primitive (no ctx key) | library |
| llm/llm | Message/stream vocabulary + adapter seam | ctx.llm |

这里只列 7 个主干；全量能力缝 see `capability-seam-map.md` (107 ctx keys).

## 4. The Session Log: Single Source of Truth

`deriveMessages()` 投影模型历史; assistant/message embeds exact compact timed stream; assistant/attempt 保留失败/重试/取消/stream-error attempts 但不添 model history. Sessions consumers see current logical format; v0 = `session.jsonl[.zstd]`, v1+ `session.vN.jsonl[.zstd]`; committed generation paths never rename/replace/delete.

Player-loop is event-driven: Session events broadcast via `session/event`; storage via SessionPersistence (jsonl); adjacent migrations vN→vN+1 each package-owned; SQLite uses monotonic SCHEMA_VERSION.

Projection seam: dsh-session-projection sets ctx.sessionProjections, registered fold units fold committed events; AgentRegistry.exposes turn/step via turnBoundaryOf(session); AgentLoop owns modelSelection/inbox.

## 5. Agent & Agent Loop: The Live Handle

AgentRegistry owns live Agent handles + create/resume factory + process-local initiator propagation. AgentLoop is concrete driver implementing interface; both expose agent/* events.

A **turn** = one drain of admitted input; **step** = one model request + its tool executions; **round** = outer iteration (goal round / Ralph); **exchange** = consecutive turns from human-input turn to next such; per-doc glossary defines.

AgentLoop initializes Agents with rollback and awaits serial `agent/created` before queued work; closing events commit before removal.

## 6. Turn Flow (Detailed)

```
turn/start
  claim next-step input + one queued message
  snapshot Session model selection; assemble prompt sections + step-admitted tool schemas
  agent/pre-step (waterfall) : reject | enter(messages, startsRequestSeries?)  → reject/empty-first-enter closes the turn with no step
  step/start → agent/request (waterfall) → prepareCall(cancellation commits neither system nor users) → synchronous admission
  system/message per-node reconciliation + user/message per entered message + request/header & request/context as needed
  derive & freeze model history from log
  stream bound prepared call → llm/stream → agent/assistant-stream start + chunk* + end
  assistant/message | assistant/attempt
  tool/call* (barriers + rolling pool) → tools/pre-execute → tools/execute → post-execute → tool/result*
  step/end
  tools owe another request or next-step input → claim → next step
  agent/turn-stopping (serial terminal checkpoint)
  turn/end
```
See [docs/agent-lifecycle.md] for full sequence diagram (generated, PR merges required for edits beyond doc).

Key: `turn/*`,`step/*`,`system/message`,`user/message`,`assistant/message`,`assistant/attempt`,`tool/*` are durable; `agent/pre-step`,`agent/request`,`llm/stream`,`tools/*` waterfalls require next(); `agent/turn-stopping` serial with no next().

## 7. Capability Seams: The Swappable Backbones

Seam = swappable capability (three roles). Reasons why one provider swap changes whole product: filesystem & subprocess providers share one execution world (pointing them at a remote sandbox moves Bash/PTY/LSP with them, no fork). Experimental Agent Teams exposes opt-in ctx.agentTeams with durable roster + task DAG + inbox.

**See capability-seam-map.md (107 seams below) — present file = authoritative list; overview only points to it.**
Canonical seams: ctx.llm, ctx.tools, ctx.sessions, ctx.fs, ctx.subprocess, ctx.shell, ctx.sandbox, ctx.commands, ctx.jobs, ctx.commands... all in seam map.

## 8. Plugin System & Cordis

Plugins mount as plugins beside others, registration is an effect disposing on unload. ctx-based service injection; typed events via declaration merging; merge-extensible maps (`SessionEventMap`, etc.). cordis.yml allows `!!js` under plugin config and disabled only (never `!js`); other metadata literal; overlays for conditional composition.

Registrations are effects: every contribution through ctx.effect()/ctx.on(); register() returns disposer.

## 9. Type Patterns (Repo-Wide)

Strict ts + noImplicitAny; every `any` explained.
`…Map → derived-union` (e.g. `SessionEventMap` → `SessionEvent`), branded opaque ids (`Branded<B>` for cross-boundary ids), declaration merging for typed events; merge-extensible maps fall through documented default; closed unions end in assertNever.
Source plane vs artifact plane; Host/Client aggregates split to avoid Context merge collision; base paths map to src; run `build:artifacts` then `build:check`.

## 10. Persistence & Durability

SessionEnd log appended JSONL; v0/v1+ generations (committed paths never renamed). Handle-based persistence (SessionPersistence handle: read/append/flush/close, single writer), absorbed write-behind window. V3 canonical envelopes, V4 current writer (released v4, evidenceTag dsh-v0.2.0-rc.2). SQLite uses monotonic SCHEMA_VERSION. Handle-based model relies on SessionHandle; crash recovery synthesizes interrupted closers.
See [session-format-status.md] for writer/release authority; [session-lifecycle.md] for flow.

## 11. System Prompt Assembly

ctx.systemPrompt collects sections + tool schemas; per step. system prompt travels as system/message history: empty text clears it; capable routes append; others consolidate at first system node. prompt sections are dialog & instruction, agent.pre-step validates. MODEL SELECT_SNAPSHOT before assembly (AssembleContext.modelSelection); retries retain.

## 12. Tool Pipeline

`ctx.tools.execute()` receives raw batches + concurrency limits; pipeline: pre-execute → guards → execute → projectContent → post-execute → finalizeContent → result.

Parallel tool call: `ToolDefinition.isConcurrencySafe(args) → bool`, opt-in, must not mutate parent state.

## 13. Key Design Invariants (Don't Break These)

- **Registrations are effects**: each register() returns disposer; leak => stale behavior.
- **Switch on discriminant tags**; closed unions assertNever; merge-extensible → default.
- **Waterfall listeners MUST call next()** — returning without short-circuits (docs/cordis-primer.md).
- **Waterfall listeners preserve `startsRequestSeries` declaration** unless intentional replacement.
- **A capability seam comprises Service Definition / Service Provider / Consumer roles. Complete, never one role.**
- **Prefer explicit resolve(request):Spec at package boundaries** over hidden defaults.
- **No hard-coded tunables** — config-driven, validated Config field (not DEFAULT_* constant or test hook).
- **Opaque ids branded** (Branded<B>).
- **Trust TS at same-process typed boundaries**, validate at parser/config/queued/model-tool-json/durable/file/worker/process/wire boundaries.
- **No as unknown / <unknown> casts** — preserve or reduce baseline.
- **Effect-first**: new behavior attaches to documented extension point; changing agent-loop requires docs/architecture update.
- **Synchronize with history**: any model-visible input → Session event.

## 14. Extension Points (Where New Behavior Goes)

Table from docs/architecture.md: add model provider (register ctx.llm adapter); model-facing capability (register ctx.tools); agent preset (ctx.agents presets, isolated realm); shell exec (ctx.shell); terminal (ctx.terminals + tool-terminal); human command (ctx.commands); background job (ctx.jobs); webhook Session (ctx.webhookRuntime); additional filesystem access (ctx.fs + fs/* events); process confinement (ctx.sandbox); request/tool/turn interception (agent/* and tools/* event; agent/turn-stopping stops turn); context (agent.inject); UI (ctx.agents + session/event rendering); Web Client Chat node (register ConversationNodeDefinition); durable state (extend SessionEventMap); session titles (ctx.sessionTitle provider sole); objective (ctx.goals); turn-boundary fork; new storage backend (implement SessionPersistence).

Full cookbook: docs/cookbook/{adding-a-package, adding-a-tool, adding-an-llm-adapter, adding-a-settings-card, extension-cookbook}.

## 15. Dual SDK Projection

TS SDK (packages/sdk) and Python (python/sdk) project the same loop; agent-loop / session-lifecycle / SessionEventMap changes update both SDK expected outputs in same PR; `pnpm run test` covers neither (need test:snapshot / expected).

## 16. Testing Strategy (For Context)
- Policy [docs/testing.md]. Snapshot tests (keyless recorded Session, under snapshots/ — only top-level tree for Session-driven cases); CI coverage gate is test:coverage (per-file 100% on packages/*/*/src, runs ~48 workers). Unit tests locally: pnpm run test. Real-API e2e: test:e2e (skips without DEEPSEEK_API_KEY).
- Doc gates: doc-sync + test:docs for doc changes.

## 17. Where to Go Next

From here, where you go next depends on purpose:
- Contribution-ready attempt: read docs/contributing.md has stated external PRs currently not accepted — channels are Discussions, plugin ecosystem, content, community help (HarnessTech/ecosystem/contributing-reality).
- To study the whole loop concretely: read packages/core/agent-loop/README.md and docs/subsystems/core.md + tools.md + session.md.
- To write a plugin first: HarnessTech/ecosystem/plugin-authoring.md together with docs/capability-seams.md + docs/cookbook/adding-a-package.md.
- To debug persistence corruption: session-lifecycle.md + storage.md subsystem; safe repair prevents auto path re-migrate.
- To debug sandbox: trust-boundary-map.md + § deep-dives/windows-sandbox-acl.md.

Adjacent maps: `capability-seam-map.md`, `session-lifecycle.md`, `trust-boundary-map.md`, `evolution-timeline.md`.

## 18. Glossary (Canonical Terms)

seam = swappable capability, 3 roles; scope/key/agent.ctx (per-agent registration keyed by live agent, flat, no inheritance down to subagents; subtree via lineage); turn/step/round/exchange (loop hierarchy); goal/goal round/goal activation (durable objective & revision, armed/disarmed); human command / command plane (slash commands no model turn); Ralph loop / round / handoff. Full glossary: [docs/glossary.md].


*基于 dsh 0.2.2-alpha.2（2026-10-29）*