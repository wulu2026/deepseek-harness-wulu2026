# 01 一切皆插件：一场彻底的架构赌注

> 核心命题：dsh 把「全插件」从口号变成了被编译器和 CI 强制执行的事实。

## 命题本身

官方架构文档开门见山：模型适配器、工具注册表、会话日志、**甚至 agent 循环本身**，都是插件 [docs/architecture.md:9]。没有特权核心可供打补丁，扩展 dsh 的唯一方式是「在旁边挂载一个插件」，且所有注册都是可逆的 effect——插件卸载时自动回滚 [docs/architecture.md:11]。

这不是修辞。仓库用三个机制把它变成硬约束：

1. **服务即键名**。Cordis 里插件是实现了 Service 的对象，通过 `ctx.<key>`（如 `ctx.tools`、`ctx.llm`、`ctx.sessions`）认领稳定键名，消费者按键名找服务，而不是 import 具体实现 [docs/cordis-primer.md:9-11]。
2. **依赖即加载顺序**。插件用 `inject` 声明所需服务，等依赖就位才激活，启动编排不靠手写顺序 [docs/cordis-primer.md:12]。
3. **入口收敛**。所有 Node 应用只能通过 `dsh --profile <name>` 启动；`verify-application-entrypoints` 把每个 package bin、demo、脚本显式归类，拒绝任何绕开 dsh 启动器的路径 [docs/architecture.md:43-45]。也就是说，**连"写一个 main 函数跑起来"这种本能都被门禁挡住了**。

## 规模感

- 372 个 workspace 包，分 46 个组（`find packages -maxdepth 3 -name package.json` 实测）。
- `vendor/` 里钉着 9 个 Cordis 生态包的源码副本：cordis、cosmokit、group、hmr、include、loader、logger-console、schemastery、timer [vendor/]。
- Cordis 本身有一篇 arXiv 论文背书：《A Programming Paradigm for Spatiotemporal Composability》[README.md:8]。

## 组合机制：一个运行中的 dsh 是怎么拼出来的

一个运行实例 = 启动时按序叠加的插件树 [docs/architecture.md:15]：

```
profile（具名组合，存于 Harness home）
  └─ 有序叠加 bundle（发行格式：config 行 + 挂载的代码）
       └─ cordis.patch.yml（用户补丁）
            └─ home patch → --patch overlays（命令行覆盖）
```

`dsh-base` 是 `web`/`headless`/`sdk`/`acp` 四个 profile 共享的第一层：模型适配器、工具、持久化、沙箱与审批策略、设置、凭证、遥测 [docs/architecture.md:23]。想看自己机器实际启动什么：`dsh --profile web --dump-config`，打印出来的每一行都可以被你自己的 patch 替换 [docs/architecture.md:31-37]。

唯一的例外是 `sdk-minimal`：一个 bundle 拥有完整显式的 SDK 插件树，故意不套 `dsh-base` [docs/architecture.md:23]——例外也被显式命名和文档化，而不是藏在代码里。

## 事件系统：五种分发模式

插件间通信靠类型化事件，五种分发模式是事件的公开契约：`emit`（广播）、`waterfall`（环绕中间件）、`parallel`（并行）、`serial`（依序）、`bail`（先到先得）[docs/cordis-primer.md:17-27]。新事件必须用 `@mode` 标注，生成目录会对照分发点检查声明——**事件语义本身也被门禁化了**。

## 独立观察

「全插件」架构在框架领域并不新鲜（Eclipse、VS Code 都是），但 dsh 的赌注在于两点：

1. **粒度下潜到了 agent 循环**。多数 agent 框架把循环当作不可替换的内核，把插件点留在外围工具。dsh 反其道而行，这意味着「换一个循环实现」和「换一个工具」在架构上是同一量级的事情。
2. **约束靠门禁而非自觉**。入口收敛、effect 可逆、事件 `@mode` 标注，全部由 CI 检查。架构赌注要兑现，靠的不是开发者的美德，而是 330 个门禁脚本（见 `05-engineering-culture.md`）。

代价同样真实，见 `06-independent-judgment.md`。

*基于 dsh 0.2.2-alpha.2（2026-10-29）*
