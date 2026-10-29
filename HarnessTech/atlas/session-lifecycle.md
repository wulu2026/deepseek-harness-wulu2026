# Session Lifecycle — 完整链路

> 定位：Session 数据怎么活——创建 / 恢复 / 追加 / 持久化 / 崩溃恢复 / 分叉 / 迁移 / 查询 / 导出 / 销毁 + 不变量 + 操作映射。 SSOT: docs/architecture.md、docs/subsystems/session.md、docs/subsystems/persistence.md、docs/session-format-status.md。

## 1. 生命周期状态机

create -> open(write) -> step/append -> flush -> close (normal)
resume -> open(write) -> replay 与 migrate -> ... (same path)
(read-only open for query/export; fork 生成新 Session)

Header-only stat/list 是 directory scan，不是 open; write open 遇 active owner 抛 SessionAlreadyOwnedError。

## 2. 创建与恢复

- 工厂 Setup 在 SessionStore entry 与 session/created 之前; AgentRegistry 创建期启用; closing events commit before removal。
- Recovery on open(write): reader (agent-loop) synthesizes interruptedTurnClosers 并 append; bounded write-behind window flush; migration inserts missing interrupted turn/end 仅针对 released restart already sealed by later turn/start。
- Goal activation 在 durable replay 里armed/disarmed absent: resume/fork 需 later human-authorized /goal resume mutation 才继续自动 work。
- Fork: ctx.agents.create({ sessionId, seed, inheritedEventCount, meta: { isSeeded: true } })，只有 agent-loop-published sessions persist。

## 3. 事件追加与持久化

- append-only SessionEvent log; deriveMessages() 投影 model history; appendCommit 通过 handle。
- Handle-based: SessionPersistence -> SessionHandle.read/append/flush/close + AsyncDisposable; single writer. write-behind: session/event 同步通知 -> backend routing bounded window -> session/flush drain。
- JSONL v0 session.jsonl[.zstd], v1+ session.vN.jsonl[.zstd]; SQLite monotonic SCHEMA_VERSION. write open first encodes + verifies + exclusively publishes successor beside unchanged source; read open 仅 in-memory result 不发布 successor。
- JSONL framing/compression/publication by provider; each adjacent migration package owns exactly one vN->vN+1 step.

## 4. 崩溃恢复

- Reader (agent-loop) 是 recovery owner: 合成 interruptedTurnClosers 并 append; ordinary repair of unsealed interrupted tail 仍 handle consumer responsibility; hard process loss before settlement 留 no durable attempt stream。
- assistant/message embeds exact compact timed stream; assistant/attempt captures failed/retried/cancelled/stream-error settlements without polluting history。
- v2 embedded streams, v3 canonical envelopes, v4 writer and adjacent migration.

## 5. 分叉（Session / Agent / LiveShare）

- Session-level fork 见 2。
- Agent delegation: ctx.subagents 多 provider behind 一 seam (spawn/fork in-process, dsh-sdk, acp, codex, claude-code); one activation manager (+ start-time-vs-runtime split)。
- Agent Teams experimental: ctx.agentTeams — implicit Lead identity + named continuable teammate + direct peer inbox + shared task DAG。
- LiveShare fork: 与 tier orthogonal; fork creates new Session owned by viewer, source untouched, bounded ceiling (READ_ONLY_FORK_CEILING = view surface; WRITE_FORK_CEILING adds host bounded edit/write); guard installation required, cold activation uses Host ordinary Agent lookup. See docs/subsystems/liveshare.md。

## 6. 迁移（Adjacent migration）

- SESSION_FORMAT_VERSION 是 sole writer number; finalized/released = 4 (evidenceTag dsh-v0.2.0-rc.2). Same-version changes allowed via safe reader; bump 只 when discriminators cannot prevent unsafe interpretation; adjacent generation 各 own -migration-vN-vN+1 package。
- Header-only read 不 propagate successor; open(write) first publishes; SQLite monotonic SCHEMA_VERSION。
- Upgrading: source persistence migration tooling; historical refs: docs/persistence-changes/historical-formats.

## 7. 查询与导出

- ctx.sessionQuery: bounded exact reads with relationship traces + semantic filters + full text via SQLite index; concrete backend adds full-text reconciliation/ranking/snippets/cursor generations.
- ctx.sessionReferenceResolver: prepared message contexts; ctx.fileReferences: path-only completion within agent cwd (no content read)。
- Projection snapshots combine fold outputs for client views; AgentRegistry turns turn/step state via turnBoundaryOf(session)。
- Export: docs/subsystems/session-query.md + tool-catalog; tool-session-query for model; session-log-export Remote。

## 8. 销毁

- Teardown through AgentHandle; 运行时 exceptions swallow; AgentRegistry removal triggers session/projection cleanup on exit; projection units released when Session removed; subscriptions detach at end.

## 9. 关键不变量速查

1. Model-visible == logged (reconstruct request from log).
2. Single writer (Handle ownership; active open(write) returns SessionAlreadyOwnedError).
3. Header-only read never publishes successor.
4. Migration inserts interrupted turn/end only for released restart sealed by later turn/start.
5. Committed generation paths never rename/replace/delete.
6. Fork persists only via agent-loop-published sessions.
7. Projection is pure fold of committed events; carrier reads not mutators.
8. After attachment start, surface replacement/image-offload starts a new request series.

## 10. 常见操作映射表

| 想做 | 怎么做 |
|---|---|
| 新开会话并下消息 | ctx.agents.create({...}) + Agent.followup(content) |
| 恢复老 Session | open(write) -> replay + migration |
| turn 边界 fork | agents.create({sessionId,seed,inheritedEventCount,meta:{isSeeded:true}}) |
| 导出 / 搜索历史 | ctx.sessionQuery / ctx.sessionReferenceResolver / tool-session-query |
| detached reader | separate thread reader of session/event |
| unsealed tail repair | handle consumer responsibility |

## 11. 相关证据

- docs/session-format-status.md (writer/finalized/release records)
- .agents/notes/implemented/architecture/2026-08-27-handle-based-session-persistence.md
- .agents/notes/implemented/architecture/2026-08-31-released-session-format-migrations.md
- .agents/notes/implemented/architecture/2026-08-19-session-projection-mandatory-seam.md
- .agents/notes/implemented/architecture/2026-09-06-v3-canonical-session-envelopes.md
- .agents/notes/implemented/architecture/2026-09-01-v2-embedded-assistant-streams.md
- .agents/notes/implemented/architecture/2026-09-02-system-prompt-as-surface-node.md
- docs/subsystems/{session.md,persistence.md,session-projection.md,session-query.md}


*基于 dsh 0.2.2-alpha.2（2026-10-29）*
