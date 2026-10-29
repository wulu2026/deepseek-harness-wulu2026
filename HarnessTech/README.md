# HarnessTech

> DeepSeek Harness（dsh）的研究与生态贡献工作台。给 wulu 本人读：读完能在脑子里跑通这个项目，并知道怎么在真实通道里参与进去、成为其中重要的一员。

## 定位

这个文件夹服务三个目标，对应三个子目录：

1. **研究** —— 把 dsh 的架构、能力缝、数据流、安全边界彻底看懂 → `atlas/`
2. **开发** —— 知道怎么在真实通道里参与 → `ecosystem/`
3. **成为重要一员** —— 跟踪自己的里程碑与产出 → `progress/`

## 目录结构

- `atlas/` —— 认知层：五张全景图（`architecture-overview` / `capability-seam-map` / `session-lifecycle` / `trust-boundary-map` / `evolution-timeline`）
- `ecosystem/` —— 行动层：怎么在真实通道里参与（`contributing-reality` / `plugin-authoring` / `community-engagement`）
- `progress/` —— 轨迹层：里程碑与证据（`roadmap` / `contribution-log` / `plugin-ideas`）
- `deep-dives/` —— 单点深潜（按需产生）
- `methodology/` —— 研究方法论与学习路线

## 阅读顺序

1. `atlas/README.md` → `atlas/architecture-overview.md`：建立整体心智模型（必读）。
2. 想写插件：`ecosystem/plugin-authoring.md`，配合 `atlas/capability-seam-map.md`。
3. 想参与社区：`ecosystem/contributing-reality.md`。
4. 其余按需跳转。

## 写作约定

- **单一中文**：代码标识符、文件路径、包名、命令保留原文。
- **一个事实一个家**：每份文档只讲自己负责的主题；属于别的文档的内容只留一句带链接的话，不重复展开。
- **引用即证据**：关键结论必须带来源，三档——
  - 源码：`[packages/core/agent/src/xxx.ts:行号]`
  - 决策：`[Agent Note: 2026-08-27-handle-based-session-persistence]`
  - 变更：`[PR: #7437]` / `[docs/upgrade-guide/...]`
  - 文档：`[docs/architecture.md]`
- **给人读**：无 YAML、无脚本、无 CI。语言平实直接，不用隐喻和空话。
- **快照版本**：每份文档末尾标注对齐的 checkout 版本。

## 责任边界（一个事实一个家）

| 文件 | 唯一责任 |
|---|---|
| `atlas/architecture-overview.md` | 整体怎么跑：心智模型 |
| `atlas/capability-seam-map.md` | 全部 `ctx.*` 能力缝的唯一权威清单 |
| `atlas/session-lifecycle.md` | Session 数据怎么活 |
| `atlas/trust-boundary-map.md` | 哪里可信、哪里不可信 |
| `atlas/evolution-timeline.md` | 为什么变成现在这样 |
| `ecosystem/` | 怎么在真实通道里参与 |
| `progress/` | 里程碑与贡献账本 |
| `deep-dives/` | 单点深潜 |
| `methodology/` | 研究方法论与学习路线 |

*基于 dsh 0.2.2-alpha.2（2026-10-29）*
