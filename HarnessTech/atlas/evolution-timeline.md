# Evolution Timeline — 架构演进关键节点

> 定位：版本里程碑 / Breaking Change / API 表面演进 / 架构决策主线；不会成体系讲成因与证据. SSOT: .agents/notes/implemented/architecture/，docs/upgrade-guide/, docs/session-format-status.md, Cookbooks。

## 版本里程碑概览

| 时期 | 核心主题 | 关键产出 |
|---|---|---|
| 2026-H1 | Cordis 迁移 / 插件化骨架 / Session v0 | vendor/cordis, core package split, JSONL v0 |
| 2026-Q3 | Session format 版本化 & 相邻迁移 / Capability Seams 显性化 | SESSION_FORMAT_VERSION, migration packages, seam docs generator |
| 2026-Q4 | Agent/Loop 分离 / Initiator Scope / 双 SDK projection / 预稳定 API 治理 | dsh-agent/agent-loop split, Python SDK, upgrade guide forced-vocabulary |

## 关键节点详表（按时间倒序）

- **2026-10-29 (this checkout)**: dsh 0.2.2-alpha.2. New subsystems: Forge (experimental:forge/github/session/client-ui-forge/bundle) + LiveShare (experimental:liveshare; view/write; ceilings + fork). Added api/session-controller history streams & snapshot (session-controller regenerated), scope controllers (job/terminal/credentials/settings/workspace/file/change), profile-context wiring, permission presets. Upgrade guides expanded rc.2/rc.3/rc.4 stack; experimental Agent Teams, PTC script format changes.
- **2026-10-12 (Peer principals / remote access)** [agent note: 2026-10-12-peer-principal-and-remote-access] — peer principal identity, Remote access-control policy across business packages.
- **2026-10-19 (CUA profile consent storage)** [2026-10-19-cua-profile-consent-storage] — CUA consent persisted per-profile, no auto-apply; storage boundary hardened.
- **2026-10-21 (Session history stream/snapshot)** [2026-10-21-session-history-stream-and-snapshot] — session history streaming endpoint/contiguous stream files.
- **2026-10-23 (Store-scoped image reads)** [2026-10-23-store-scoped-image-reads] — image view now session-scoped rather than ambient-paths.
- **2026-10-25 (CUA bundle-id consent, shared-preset delegation tools)** [2026-10-25-cua-bundle-id-consent; 2026-10-25-shared-preset-delegation-tools (bug-fix)] — consent tied to bundle id, delegation restricted preset.
- **2026-10-20 (PTC script evaluation/retention)** [2026-10-20-ptc-script-evaluation-and-retention] + (rc.3 guide included PTC caller cancellation) — changes PTC format; upgrade guide v0.2.1-rc.2/ptc-script-format.
- 2026-09-26 CUA application consent [2026-09-26-cua-application-consent] / 2026-09-09 deprecate synchronous session event reads
- **2026-09-09 deprecate synchronous Session event reads** (Agent note 2026-09-09-deprecate-synchronous-session-event-reads): Session.eventAt / snapshotEvents / ownEvents deprecated; new code must not call; alternative SessionHandle.read/append + flush. Trigger: separation of Source plane vs Artifact Plane.
- 2026-09-06 V3 canonical session envelopes (SessionEvent type version and env normalized).
- 2026-09-02 **System Prompt as Surface Node** (moved from EpochHeader to surface node 0).
- 2026-09-01 V2 embedded assistant streams (assistant/message embeds exact compact timed stream; assistant/attempt for settled failures).
- 2026-08-31 Released Session format migrations (adjacent, committed-generation immutability).
- 2026-08-27 Handle-based Session persistence (SessionHandle read/append/flush/close, single writer, write-behind window, crash recovery).
- 2026-08-19 Session projection mandatory seam (ctx.sessionProjections become required; eager watermark drive).
- 2026-08-10 npm release sequences (DH DSH workspace:*, vendor/native workspace:~; PeerDeps layering).
- 2026-07-30 followup enqueue & owned runs; 2026-07-29 tsx/esm source launch contract; 2026-07-28 removed synthetic log-only turns; 2026-07-15 Agent initiator scope; 2026-07-10 Parallel Tool Call Execution; 2026-06-18 Session Surface; 2026-06-13 capability seams manifesto.
- Additional design decisions 2026-09 through 2026-10 are in .agents/notes/implemented/{architecture,process,feature,bug-fix}/ (no further 1-liner here; newest first).

## Breaking Change 记录表（升级指南索引）

用户-facing change requires guide writing. Source: docs/upgrade-guide/ onward.

| Release | 专题 | Guide path | Impact |
|---|---|---|---|
| 0.2.2-alpha.2 | Session history stream / snapshots / scope controllers / LiveShare permission (user-facing Remote API changes) | docs/upgrade-guide/v0.2.2/ (if added) | SDK / data layouts |
| 0.2.1-rc.4 / rc.3 / rc.2 | Model listing refresh, model-badge package removal, PTC script format, CUA consent storage & bundle ID, worktree naming, Session follow activation, attachment read access | docs/upgrade-guide/v0.2.1-rc.4 & rc.3 & rc.2 | profiles & persistence |
| v4 (in progress) | Session v3→v4 migration | docs/upgrade-guide/v4/session-migration-v3-v4/guide.md | durable Session readers |
| v3 | Canonical request-header normalization | docs/upgrade-guide/v3/canonical-request-header/guide.md | plugin header consumption |
| v3 | System prompt → surface node | docs/upgrade-guide/v3/system-prompt-surface-node/guide.md | prompt assembly consumers |
| v2 | Embedded assistant streams | docs/upgrade-guide/v2/embedded-assistant-streams/guide.md | UI/telemetry/replay |
| v1 | Session format v0→v1 | docs/upgrade-guide/v1/session-format-v1/guide.md | persistence |
| — | Source launch tsx/esm | docs/upgrade-guide/source-launch-tsx-esm/guide.md | launchers |
| — | Agent/Loop separation | docs/upgrade-guide/agent-loop-separation/guide.md | plugins depending agent-loop internals |

Always list upgrade-guide/ directory tree for authoritative current list.

## API 表面演进（对外可感知）

| Surface | Frequency | Governance |
|---|---|---|
| CLI (dsh --profile) | Low | upgrades guides + --help diff |
| Profiles / cordis.yml keys | Medium | guides + config-catalog.md (generated) |
| Session vocabulary SessionEventMap | medium (merge-extensible) | same-version safe reader |
| SESSION_FORMAT_VERSION | Low | Adjacent migration packages + upgrade guide |
| TS / Python SDK APIs | Medium | SDK expected outputs + snapshot test (verify in same PR) |
| Tool schemas | High | snapshot tests (golden) |

## 架构决策演进主线

1. Cordis-first plugins -> everything must be swap.
2. Session log authority -> events evolve with migration adjacency.
3. Agent-handling split at core vs AgentLoop -> initiator safety scope.
4. Seams surfaced & documented -> capability-seam-map drift detection builds.
5. Projection & handle persistence to avoid heavy locking.
6. Pre-stable APIs governed via upgrade guides + docs gating.
7. 2026-10 added external remote access & session control controllers enabling GUI-driven workflows.
8. Experimental: Forge/LiveShare/Agent Teams — opt-in capabilities.

## 仍在演进 / dev notes 里值得读

- Agent note 2026-09-19-no-unknown-casts (lint contract enforcement).
- Plan-mode pending selections, streaming compaction semantics.
- Node 24 floor migration note [implemented 2026-10-15-node-24-runtime-floor].
- Schema changes for V4 are not breaking beyond header, still reader-lazy migration unit.
- Forge/LiveShare universes early preliminary (version varies by composition).
- Node memory 8GiB cap in AGENTS.md build.

## 使用这条时间线

1. Changed something? find nearest release row; if external API shape changes add guide.
2. Broad vertical move? quote Agent note title + code path in CV/context.
3. Read `.agents/notes/implemented/architecture/` summary entries (see file naming).


*基于 dsh 0.2.2-alpha.2（2026-10-29）*
