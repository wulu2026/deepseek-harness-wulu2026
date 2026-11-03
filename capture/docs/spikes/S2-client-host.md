# Spike S2 — 客户端-宿主数据流（进行中 / 未完成）



日期：2026-11-01 (first pass)



## 发现（确定）

- 远程方法暴露机制基于 Typert (`@deepseek-ai/dsh-typert-protocol` + 生成 host JS)：见 `*/lib/typert.host.js`。Host 服务通过 `@Remote` 装饰，Client 通过生成的 proxy 调用。生成器 `@deepseek-ai/dsh-typert-generator`。

- Host 访问控制：`ctx.remoteAccess`（role/binding/policy），owner 恒允许；非 owner 需声明。mac 桌面 owner 场景不必定义策略，但基础面仍由 gateway 解析。

- UI 数据访问常见路径：client 组件使用注入的 host service proxy；Workspace 行 action 则通过 slot `inject` factory 闭包注入 Host-provided callbacks (practices #2).

- 连接 broker 与 remoteAccess 由 base 层装配（webServer/index-inject）。



## 未解

- 是否所有插件必须生成 Typert host stub？能否手动编写？Need inspect 一个 plugin 是否有 client-host calls：dsh-archived client 使用 `ctx.remote.commands.execute(...)`? Search service `commands` in base.

- Slot 的 `inject()` factory 如何得到 Host-side callback? `ctx.slots.register({ inject: () => ({ exportSession }) })` — inject factory runs client-side (client context), host callbacks need remote. Need inspect dsh-client-ui-workspace example exportSession: imports `./export-session.ts`, likely client-side implementation calling remote API.

- 推荐油门：Phase 1 client 可先用 `ctx.remote.commands.execute(sessionId, '/story ...')` + 面板用 host data? 但 structured UI needs direct read. Need decide host service with typert stub.



## Next

- Extract `dsh-typert-generator` (if available) or read source package in app.asar.

- Inspect `dsh-commands` package for command execution + how plugin registers commands.

- Inspect `dsh-api-session-controller` typert host to see manual patterns.

- If Typert mandatory, accept generating typert.host.js by hand or add build generator in implementation phase.
