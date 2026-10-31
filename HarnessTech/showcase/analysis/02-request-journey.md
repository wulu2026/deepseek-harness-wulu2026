# 02 一次请求的旅行：turn、step 与三个事件域

> 核心命题：dsh 把一次对话拆成精密的事件序列，每一步既是可观测的扩展点，又是可回放的持久事实。

## 两个基本单位

- **step** = 一次模型请求 + 它触发的工具执行。
- **turn** = 零个或多个 step：在第一个输入被认领之前开启，在「不再有欠债」时关闭 [docs/architecture.md:81]。

## 完整流程（官方时序的中文重述）

```text
turn/start
  认领 next-step 输入 + 一条排队消息
  快照当前模型选择；组装 prompt 段落 + 本 step 准入的工具 schema
  → agent/pre-step（瀑布：监听者可接受/改写/拒绝）
    拒绝或空输入 → 无 step 关闭 turn
  step/start
  → agent/request → prepareCall（此时取消不会提交任何内容）
  追加 user/message；按需记录 request/header、request/context
  从日志派生并冻结模型历史
  流式调用 → llm/stream → agent/assistant-stream（live 帧）
  落地 assistant/message（或失败时的 assistant/attempt）
  tool/call → tools/pre-execute → tools/execute → tools/post-execute → tool/result
  step/end
  工具欠债或新输入 → 认领 → 下一个 step
turn/end（含 TurnEndReason）
```

[docs/architecture.md:83-104]

## 代码路径

驱动实现集中在 `packages/core/agent-loop/src/agent.ts`：

- `send()` 把 `UserMessage` 写入 `ReactLoopInbox`；`followup()`/`steer()`/`inject()` 区分 next-turn 与 next-step [agent.ts:170-189]。
- idle 状态下收到请求：创建 running phase 和 AbortController，`ctx.agents.withInitiator` 包裹后启动 `kick()` [agent.ts:230-250]。
- `kick()` 的主体是 `while (await this.turn()) {}`；异常被 containment 吸收，`finally` 恢复 idle 并处理 pending wakeup [agent.ts:268-281]。
- 单个 `turn()`：记录 `turn/start`，循环 `preStep()`/`step()`，依据 `turnEnds`、inbox 状态、abort signal 决定继续、阻塞、报错或终止 [agent.ts:326-432]。
- 单个 `step()`：准备 LLM 请求 → 追加 system/user 消息 → `llm.stream()` → 处理 assistant 流与 tool calls → 工具结果经 `additionalContexts` 回到 next-step inbox [agent.ts:435-610]。
- `prepareRequest()`/`buildRequest()`：写入请求头与上下文、记录工具增删、冻结 boundary 消息，最终形成 `GenerateOptions` [agent.ts:612-744]。

## 三个事件域：选错域是第一个设计错误

dsh 把事件分成三个域，且明说「选对域是多数改动中的第一个决策」[docs/architecture.md:69]：

| 域 | 性质 | 例子 | 用途 |
|---|---|---|---|
| Session 事件 | 持久事实，写入日志 | `turn/start`、`user/message`、`tool/result` | 需要熬过重启的事实 |
| Agent 事件（`agent/*`） | 活进程内 | `agent/pre-step`、`agent/assistant-stream` | 观察/拦截在途工作 |
| 能力事件 | 策略与适配器挂载点 | `fs/*`、`tools/*`、`telemetry/*` | 不 import 循环就能挂策略 |

其中 `agent/pre-step`、`agent/request`、`llm/stream` 和三个 `tools/*` 是**瀑布事件**：监听者必须调用 `next()` 委托，否则整条链短路 [docs/architecture.md:106]。这意味着一个忘记 `next()` 的插件会静默掐断后续所有插件——这是全插件架构给插件作者上的第一课。

## 流式的双重人生

同一段 assistant 输出有两种存在形式：`agent/assistant-stream` 发布进程内的 start/chunk/end 活帧，唯一的远程消费者是 Web 的 Session-follow 适配器；循环把完整紧凑流作为一条 `assistant/message`（或仅日志的 `assistant/attempt`）落盘。进程在落地前硬崩，则不留下任何持久流帧 [docs/architecture.md:124]。

**模型看到的，和 UI 展示的，是两条精心分开的通道**——持久层只认完整落地的事件，瞬时增量全走 live 通道。这个区分是理解 dsh 会话模型的钥匙，下一篇展开。

*基于 develop 分支 2026-10-31 检出（版本号 dsh 0.2.2-alpha.2，release tag 后 362 个提交）*
