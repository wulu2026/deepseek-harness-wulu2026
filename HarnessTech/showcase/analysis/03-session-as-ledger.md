# 03 会话即账本：事件溯源的回报

> 核心命题：Session 不是状态快照，而是一条只增不改的事件日志；模型看到的一切都能从日志重建。这个选择直接造就了 dsh 最独特的测试能力。

## 事件溯源

`Session` 是内存中的追加型 `SessionEvent` 日志，LLM 消息历史由 `deriveMessages()` 从日志**派生**，而非单独维护一份状态 [docs/subsystems/session.md:5-11]。核心事件类型在 `SessionEventMap` 里定义，共 14 种，每个都带完整 JSDoc 契约：`turn/start`、`turn/end`、`step/start`、`step/end`、`user/message`、`developer/message`、`system/message`、`assistant/message`、`assistant/attempt`、`tool/call`、`tool/result`、`request/header`、`request/context` 等 [packages/core/session/src/types.ts:287-327]。

铁律是「**模型可见 ⟺ 已记录**」：任何到达模型请求的输入必须能从会话日志重建；新增模型可见输入，就必须新增会话事件 [docs/architecture.md:128]。这条不变量把「AI 看到了什么」这个通常只能靠猜的问题，变成了日志查询。

## 持久化的诚实分级

`SessionPersistence` 把事件日志作为持久化主体，事件从 seq 0 连续保存、永不重写；`append` 是 best-effort，`flush` 才是耐久性屏障——Session 是否真正落盘由 flush 决定 [packages/session/session-persistence/src/index.ts:124-143]。对外只暴露 handle 化接口：`create/open/stat/list/flush` [session-persistence/src/index.ts:152-187]。

`turn/end` 的 JSDoc 写得更直白：循环在 turn 边界**不会**等待 flush——每个请求的耐久检查点由 `dsh-session-checkpoint-policy` 负责，在 `whenIdle()` 后读存储的消费者自己 flush [types.ts:296-303]。性能与耐久性的权衡被显式写进了类型契约。

## 版本纪律

`SESSION_FORMAT_VERSION = 4` [types.ts:68-90]。物理格式是 `session.jsonl[.zstd]`（v0）与 `session.vN.jsonl[.zstd]`（v1+），**已提交的世代永不改名、替换或删除**；打开旧世代时通过「相邻迁移链」逐代解码（每个迁移包只负责一步 `vN → vN+1`），写入时发布一个全新的版本命名后继，原文件原样保留 [docs/architecture.md:126]。

这意味着：你今天录的会话，未来的版本永远读得出来；迁移失败也永远不会破坏原始数据。

## 失败也有位置

`assistant/attempt` 保存已了结的失败、重试、取消、流错误尝试，但**不进入模型历史** [docs/architecture.md:124]。失败的尝试留在账本里供排查，却不会污染模型后续看到的上下文。这是事件溯源特有的奢侈：状态派生意味着「哪些算数」可以在读取侧决定。

## 回报：无密钥回放测试

事件溯源最大的红利在测试。`test:snapshot` 把真实 API 会话录制成 fixtures，之后**无需任何密钥**就能通过发货的 profile 完整回放，比对持久化输出 [vitest.snapshot.config.ts:28-32]；replay 可并行，record/refresh 才读真实 key 且串行写回 [vitest.snapshot.config.ts:48-72]。

Agent 产品的测试死结是模型输出的不确定性。dsh 的解法是：既然一切模型交互都已经是日志里的事件，那就把日志本身变成测试输入。**架构选择直接消灭了测试难题**，这是事件溯源最漂亮的一次兑现。

*基于 develop 分支 2026-10-31 检出（版本号 dsh 0.2.2-alpha.2）*
