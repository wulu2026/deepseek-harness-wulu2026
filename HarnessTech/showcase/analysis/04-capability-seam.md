# 04 能力缝：三角色与「换底座」的自由

> 核心命题：能力缝（capability seam）是 dsh 最重要的设计单元——一个可替换能力必须由三个角色共同构成，缺一不可。

## 三角色

一个完整的能力缝 = **Service Definition**（声明接口）+ **Service Provider**（实现接口）+ **Consumer**（使用接口，通常是面向模型的工具）[docs/glossary.md:7-9]。一个包可以身兼多角，但只有一个角色就不构成缝；新增能力意味着设计全部三个角色 [docs/architecture.md:136]。

## 教科书例子：shell 执行

[docs/glossary.md:7-9] 给出的 canonical example：

| 角色 | 包 | 职责 |
|---|---|---|
| Definition | `dsh-shell` | 声明 shell 执行接口（request/spec 分离的解析入口） |
| Provider | `dsh-bash-local` / `dsh-bash-sandbox` | 本地执行 / 沙箱执行两种实现 |
| Consumer | `dsh-tool-bash` | 面向模型的 bash 工具，只认接口 |

Consumer 不关心、也无法关心背后是哪个 Provider——它 import 的是接口键名，不是实现包。

## 更多实例

- **`ctx.fs`**：一个文件系统缝对应三个实现包：`fs-local`、`fs-sandbox`、`fs-ssh`（本地 / 沙箱 / 远程 SSH）[docs/capability-seams.md:383-386]。
- **`ctx.web`**：`packages/web/web` 持有 search/fetch provider 注册表与选择逻辑（Definition 的运行时入口）；`packages/web/tool-web` 声明 `inject: ['tools', 'web', 'systemPrompt']`，通过 `ctx.web` 消费能力，从不直接 import provider 实现 [packages/web/web/src/index.ts:2-7; packages/web/tool-web/src/index.ts:25-27]。

## 缝的杠杆：一次替换，全线搬家

架构文档里最关键的一句话：filesystem 和 subprocess provider **共享同一个执行世界**，所以把它们指向一个远程沙箱，Bash、PTY、LSP 会跟着一起搬走——不需要任何 provider 分叉 [docs/architecture.md:138]。subagent provider 同样跨度极大：同接口下可以从「新建一个子 agent」变到「委托给另一个产品里的一次 turn」[docs/architecture.md:138]。

这就是缝与「依赖注入」的区别：DI 换的是一个类，缝换的是**整个产品运行的世界**。从本地开发到云端沙箱执行，对 dsh 来说不是一次重构，而是一次配置层的 provider 替换。

## 独立观察

能力缝是 dsh 里我最喜欢的概念，因为它把「可替换性」从实现技巧提升为**设计义务**：

1. 它强制你在加能力时先回答「谁会替换这个实现」，把演化压力前置到设计时刻。
2. 三角色的命名让 code review 有了共同语言——「这个 PR 只做了 Definition 没有 Provider」是立刻可识别的半成品。
3. 它也是理解 dsh 包数量的钥匙：372 个包之所以不是灾难，是因为大量包只是同一条缝的不同 Provider，心智成本被三角色结构摊平了。

*基于 develop 分支 2026-10-31 检出（版本号 dsh 0.2.2-alpha.2，release tag 后 362 个提交）*
