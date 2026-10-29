# Roadmap —— 里程碑与验收标准

> 定位：把「成为生态重要一员」拆成可验收的阶段。原则：**每阶段以对外可见的产出为验收标准，不以「读完某份源码」为标准**。通道对齐 `ecosystem/contributing-reality.md` 的四条：Discussions、生态插件、内容、社区互助。

## 里程碑总览

| 阶段 | 主题 | 关键产出 | 对应通道 |
|---|---|---|---|
| M0 | 环境与心智模型 | 源码可跑、读懂五张图 | （打基础） |
| M1 | 第一个自有 profile | 不改核心代码跑通一个业务场景 | 插件生态 |
| M2 | 第一个插件 | 发布一个带 `dsh-plugin` 标签的插件 | 插件生态 |
| M3 | 第一篇 how-to / 博客 | 写清一个别人没写清的点 | 内容 |
| M4 | 社区影响力 | 被采用 / 被感谢 / 被引用 | 社区互助 + 内容 |

## 各阶段验收标准

### M0 环境与心智模型
- [ ] 依赖与构建就绪：`corepack pnpm install` + `pnpm run build:artifacts` 通过（本机当前 node_modules 未装，先补）；
- [ ] 能用自己的话讲清「请求 → 循环 → 工具 → 持久化」链路；
- [ ] 读完 `atlas/architecture-overview.md` 与 `atlas/capability-seam-map.md`。

### M1 第一个自有 profile
- [ ] 基于官方 profile（如 `headless`）创建 `my-*` profile；
- [ ] 通过 `cordis.yml` 组合出业务所需插件，**不改核心代码**；
- [ ] 跑通一个端到端业务场景（接内部 API / 数据库 / 工作流之一）。

### M2 第一个插件
- [ ] 写 1 个自定义工具或能力 Provider，遵循 Definition/Provider/Consumer 三角色；
- [ ] 工具带 Session 事件、UI 呈现、测试；
- [ ] 发布到 GitHub 并打 `dsh-plugin` 标签。

### M3 第一篇 how-to / 博客
- [ ] 选题来自真实研究（别人没写清、或我踩坑解决的点）；
- [ ] 发布并提交到社区可见处（Discussions / 博客 / README 链接）。

### M4 社区影响力
- [ ] 至少一个外部信号：插件被 fork/star、内容被引用、答疑被感谢、或 Discussions 被 upvote；
- [ ] 形成可复用的复刻路径（把经验写回 `ecosystem/`）。

## 当前状态

- 状态：M0 进行中（2026-10-29，本知识库正在重建）。


*基于 dsh 0.2.2-alpha.2（2026-10-29）*
