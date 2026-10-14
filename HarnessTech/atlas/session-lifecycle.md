# Session Lifecycle — 完整链路

> **来源**：`docs/subsystems/session.md`、`docs/subsystems/persistence.md`、`packages/core/session/README.md`、相关 Agent Notes。
> **范围**：Session 从创建、事件追加、持久化、迁移、查询、导出、分叉、销毁的端到端链路。

---

## 1. 生命周期状态机

```
┌─────────────┐
│  不存在      │
└──────┬──────┘
       │ ctx.sessions.create(id, { seed?, meta? })
       ▼
┌─────────────┐     append(SessionEvent)      ┌─────────────┐
│  内存态      │ ─────────────────────────────▶ │  内存态      │
│  (可写)      │  (session/event 同步通知)      │  (可写/脏)   │
└──────┬──────┘                                 └──────┬──────┘
       │                                               │
       │ ctx.sessions.flush(session)                   │ agent.dispose() / 进程退出
       ▼                                               ▼
┌─────────────┐     session-persistence-jsonl         ┌─────────────┐
│  持久化态    │ ◀──────────────────────────────────── │  持久化态    │
│  (只读/可写)  │  SessionHandle.append() + flush()    │  (已落盘)    │
└──────┬──────┘                                 └──────┬──────┘
       │                                               │
       │ ctx.sessions.open(id, 'read')                 │ ctx.sessions.open(id, 'write')
       ▼                                               ▼
┌─────────────┐                                 ┌─────────────┐
│  冷读态      │                                 │  热写态      │
│  (detached)  │                                 │  (单写者)    │
└─────────────┘                                 └─────────────┘
```

---

## 2. 创建与恢复

### 2.1 全新创建 (`ctx.sessions.create`)

```ts
// 入口：packages/core/session/src/index.ts → SessionStore.create()
const handle = await ctx.sessions.create(id, {
  seed?: readonly SessionEvent[],      // 可选：replay/fork 前缀
  meta?: { cwd, forkLineage?, ... },   // SessionHeader 元数据
})
```

**流程**：
1. 分配 `SessionId`（= 传入 `id`，branded string）。
2. 构建 `SessionHeader`：`formatVersion = SESSION_FORMAT_VERSION`、`cwd`、`isSeeded = false`、`origin = 'startup'`。
3. 若提供 `seed`：验证事件连续性、`surfaceOp` 合法性、header 规范化 → `Session.create(id, seed, header)`。
4. 在内存存储注册 `Session` 实例，返回 `SessionHandle`（`access: 'write'`）。
5. **同步发布**：`session/event` 通知已追加的 seed 事件（若有）。
6. 物理落盘**延迟到首次 `append` 或显式 `flush`**（JSONL backend 优化）。

### 2.2 恢复 (`ctx.sessions.open(id, 'read'|'write')`)

```ts
// 入口：SessionPersistence.open()
const handle = await ctx.sessionPersistence.open(id, 'write') // 或 'read'
```

**流程**：
1. Backend 定位最新 generation：`session.vN.jsonl[.zstd]`（数字最大者）。
2. 读取物理头部 → 翻译为当前 `SessionHeader`（历史版本自动翻译）。
3. **版本门控**：
   - `header.formatVersion > SESSION_FORMAT_VERSION` → 拒绝（future version）。
   - `header.formatVersion < SESSION_FORMAT_VERSION` → 组装 **静态相邻迁移链**（`vK → vK+1 → ... → current`），**一次性** 解码迁移，得到当前逻辑事件。
4. 构造 `Session.fromRestore(id, seed, header, inheritedEventCount, eventState, projections)`。
5. 返回 `SessionHandle`（`access` 为请求的模式）。

**关键不变量**：
- **Committed generation paths are never renamed, replaced, or deleted.** 迁移产出 *version-named successor* (`session.v{N+1}.jsonl`) 与源并存。
- **Read open 不发布 successor**；Write open 先编码/验证/独占发布最终版本，源文件不变。

---

## 3. 事件追加与持久化

### 3.1 内存追加 (`Session.append`)

```ts
session.append('user/message', { content: [...], source: {...} }, {
  surfaceOp: 'append',           // 必填：SurfaceEventType 必须声明如何进入 surface
  sourceEventSeqs?: [seq, ...]   // 可选：引用的早期事件 seq（替换时必填）
})
```

**验证链**（同步、单次遍历、深拷贝一次）：
1. `data` 可 JSON 序列化（拒绝 `BigInt`、`function`、`symbol`、`undefined`、负零、非有限数、循环引用、稀疏数组、Map/Set/Date/class instance）。
2. `SurfaceEventType` 必须提供 `surfaceOp`；非 surface 类型禁止提供。
3. `request/header` 规范：`system` 字段禁用；`tools: []`、`adapterDefaults: {}` 必须省略。
4. `surfaceOp.replace` 合法性：`startSeq`/`endSeq` 必为当前 surface nodes；`sourceEventSeqs` 必覆盖所有被影子节点。
5. `assistant/message` 嵌入 `stream: AssistantStreamRecord[]`（精确紧凑流）；禁止 `sourceEventSeqs`。

**通过即提交**：事件进入 log，同步通知 `session/event` 观察者（失败仅记录日志、不回滚）。

### 3.2 持久化检查点 (`session/flush`)

```
session/event (同步通知)
    │
    ▼
Backend 路由到活跃 write handle 的 bounded write-behind window
    │
    ├─ 首个待写事件 → 启动固定批处理窗口（默认 ~10-50ms）
    ├─ 后续事件合并入窗口，不重置 deadline
    │
    ▼
session/flush (显式/loop checkpoint)
    │
    ├─ 取消等待 → drain through quiescence
    ├─ 执行一次持久化 append → 解析 resolve
    └─ 后续显式 flush 重试失败写入
```

**Loop 使用点**：
- `agent-loop` 在 claim 下一个普通 turn 前 → `session/flush` 作为**顺序与错误观测检查点**。
- `session/disposed` 执行相同 final drain + close handle。

---

## 4. 崩溃恢复

**场景**：进程在 turn 中途崩溃 → 物理日志以开放的 `turn/start` 结尾，无 `turn/end`。

**恢复策略**（`agent-loop` resume 路径）：
1. 通过 write handle 读取存储日志（物理上连续的有效前缀）。
2. 计算 `interruptedTurnClosers`：
   - 缺失的 tool errors（为每个未完成的 `tool/call` 合成 `tool/result { isError: true, error: {...} }`）。
   - 任何开放的 `step/end`。
   - 合成 `turn/end { reason: { kind: 'interrupted' } }`（**唯一 loop 从不主动发射的 TurnEndReason**）。
3. 将 closers 作为普通 batch `append` 通过同一 write handle。
4. 发布恢复后的 Session。

**只读观察者**（`session-query`）：在内存中用相同 closers 平衡冷日志，**不写回**。

---

## 5. 分叉

```ts
// 低级原语
ctx.sessions.create(childId, { seed: parentEvents.slice(0, boundary), meta: { parentSession: parentId, seedLength: boundary } })

// 策略 API（SessionStore）
fork(sourceSession, boundary?, childSessionId?)
```

**规则**：
- `boundary` = 包含的 `SessionSeq`（默认：当前最后事件）。
- **必须**落在 turn 边界之外（拒绝开放 turn 内的 prefix，不静默截断）。
- 子 Session 获得：
  - `parentSession`、`isSeeded: true`、`inheritedEventCount = boundary + 1`、`cwd` 继承。
  - `session/end-seed { inherited: true }` 标记在继承前缀切点处插入。
- `dsh-subagent-fork-in-process` 保留「已完成前缀裁剪」语义（工具委托常在父 turn 开放时启动）；普通分支应显式指定 `boundary`。

**恢复时的 `session/end-seed` 语义**：
- 找到 **最后一个** `inherited: true` 的 marker → 当前 Session 的切点。
- 普通 `session/end-seed {}` 标记生命周期边界（用于 compaction 等独立 bracket 的所有者判断「继承的 bracket 已死」）。

---

## 6. 迁移

### 6.1 版本命名

| 版本 | 物理文件名 | 备注 |
|------|------------|------|
| v0 | `session.jsonl[.zstd]` | Legacy |
| v1+ | `session.vN.jsonl[.zstd]` | Lowercase `vN` |

### 6.2 相邻迁移包

每个 `vN → vN+1` 步由**专用包**拥有（如 `session-migration-v3-v4`），仅实现单步转换。
- Reader 在 write open 时**一次性组装静态链**并按顺序应用。
- 迁移包**不**知晓上下游；只负责 `vN` 事件数组 → `vN+1` 事件数组。
- `SESSION_FORMAT_VERSION` 仅在现有判别符无法防止 unsafe interpretation 时递增；同版本变更要求 reader 安全行为。

### 6.3 升级指南

每个 Breaking Change 即时记录在 `docs/upgrade-guide/v<version>/<item>/guide.md`（由 `dsh-create-upgrade-guide` skill 强制）。

---

## 7. 查询与导出

### 7.1 `ctx.sessionQuery` (Seam)

| 方法 | 说明 |
|------|------|
| `list(filter?)` | 列举 Session 摘要（`stat` 只读 header，不加载事件） |
| `read(id, opts)` | 有界读取：`offset`/`length`/`filter`/`trace` |
| `search(query)` | 语义/全文搜索（SQLite FTS backend） |
| `trace(id, fromSeq, toSeq)` | 血统追踪（turn/step/tool 调用链） |

**Backend**：`session-query-sqlite` → SQLite 虚表 + FTS5；冷读缓存 keyed by `stat().revision`。

### 7.2 导出

- `SessionHandle.read(0, Infinity)` → 全量事件数组。
- `session.deriveMessages()` → 模型可见 `Message[]`（cached + frozen）。
- `session.snapshotEvents(from, to)` → 指定范围深冻结事件（**已弃用**，新代码禁用）。

---

## 8. 销毁

| 触发 | 行为 |
|------|------|
| `AgentHandle.dispose()` | 1. 停止 loop 并 await 退出 2. `session/flush` 3. 注销 agent 4. 从 store 移除 session 5. 解绑 scoped world |
| `ctx.sessions.delete(id)` | 仅存储层删除（不触发 loop teardown） |
| 进程硬退出 | 依赖 `session/flush` checkpoint + crash recovery 机制 |

**注意**：`AgentHandle.dispose()` 是 **capability**——仅持有者可执行；factory provider 为结构性共有人。

---

## 9. 关键不变量速查

| 不变量 | 违反后果 | 守护机制 |
|--------|----------|----------|
| `seq` 单调连续 | Replay 乱序、迁移失败 | `Session.append` 分配 `seq = log.length`；persistence `append` 校验首事件 seq |
| SurfaceEvent 必带 `surfaceOp` | 导出历史错误 | `Session.append` 编译期拒绝非 surface 类型带 `surfaceOp`；surface 类型不带则报错 |
| `request/header` 规范化 | Header 重构不一致 | `foldRequestHeader` 仅认最新快照；seed/append/restore 拒绝非规范 header |
| Committed generation 不重命名/删除 | 迁移链断裂、审计失效 | JSONL provider 仅在 write open 时创建 `vN+1` successor；源文件只读 |
| 单写者所有权 | 并发写损坏 | `open(id, 'write')` 遇活跃 owner → `SessionAlreadyOwnedError` |
| `turn/end` 原因完整 | 无法区分清洁停止/截断/错误 | `TurnEndReasonMap` merge-extensible；`max-tokens` 优先于 `completed` |

---

## 10. 常见操作映射表

| 想做… | 调用链 |
|-------|--------|
| 新建会话并开始对话 | `ctx.agents.create({ sessionId, agentOptions })` → `agent-loop.create()` → `ctx.sessions.create()` |
| 恢复历史会话继续 | `ctx.agents.resume({ resumeSessionId })` → `agent-loop.resume()` → `ctx.sessionPersistence.open('write')` |
| 分叉到某个 turn 边界 | `ctx.sessions.fork(parentSession, turnEndSeq)` |
| 读取会话标题/摘要 | `ctx.sessionQuery.list()` / `ctx.sessionTitle` |
| 全量导出 JSONL | `ctx.sessionPersistence.open(id, 'read').then(h => h.read(0, Infinity))` |
| 手动迁移旧版本 | `pnpm run migrate-sessions -- --from v3 --to v4`（由迁移包提供 CLI） |

---

## 11. 相关 Agent Notes（决策记录）

| 标题 | 日期 | 关键结论 |
|------|------|----------|
| Released Session Format Migrations | 2026-08-31 | 相邻迁移包、版本命名、committed generation 不动、静态链组装 |
| Handle-based Session Persistence | 2026-08-27 | `SessionHandle` 单写者、write-behind window、flush checkpoint、crash recovery 归 reader |
| V3 Canonical Session Envelopes | 2026-09-06 | `request/header` 规范化、拒绝 legacy `request/header-delta` |
| System Prompt as Surface Node | 2026-09-02 | System prompt 从 header 移出 → `system/message` surface node 0 |
| V2 Embedded Assistant Streams | 2026-09-01 | `assistant/message` 内嵌 `stream`；`assistant/attempt` 保留失败尝试 |
| Session Projection Mandatory Seam | 2026-08-19 | `ctx.sessionProjections` 强制注册；缺失显式失败 |
| Deprecate Synchronous Session Event Reads | 2026-09-09 | `eventAt`/`snapshotEvents`/`ownEvents` 弃用；改用 handle-based 读取 |

---

*生成时间：2026-10-14 | 来源：`docs/subsystems/session.md`、`docs/subsystems/persistence.md`、相关 Agent Notes*