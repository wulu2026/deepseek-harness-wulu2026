# HarnessTech/atlas — 结构化导读图集

## 定位

> 五张全景图 + 一套责任边界。认知层，回答「这个项目整体怎么跑、数据怎么活、哪里可信、怎么一路演变来的、所有扩展点在哪儿」。所有图的目的都是：读完能在脑子里跑通全链路，并且知道某个主题该去哪张图找。

## 目录（5 张核心图）

| 图 | 文件 | 唯一责任 |
|---|---|---|
| 1 | `architecture-overview.md` | 整体怎么跑：心智模型（哲学 / 组合 / 子系统 / Session 日志 / Agent 与 Loop / Turn Flow / 能力缝概览 / 插件系统 / 类型模式 / 持久化 / 系统提示 / 工具管道 / 不变量 / 扩展点 / 双 SDK） |
| 2 | `capability-seam-map.md` | 全部 ~107 条 `ctx.*` 能力缝的**唯一权威清单**（由 `docs/capability-seams.md` generated 表 restructuring） |
| 3 | `session-lifecycle.md` | Session 数据怎么活：状态机 / 创建与恢复 / 追加与持久化 / 崩溃恢复 / 分叉 / 迁移 / 查询与导出 / 销毁 / 不变量 / 操作映射 |
| 4 | `trust-boundary-map.md` | 哪里可信哪里不可信：sandbox / 子进程 / SSH / 终端 / 网络 / CUA / LiveShare 天花板 / ACL / 权限矩阵 / 最小权限清单 |
| 5 | `evolution-timeline.md` | 为什么变成现在这样：版本里程碑 / 关键节点 / Breaking Change / API 表面演进 / 架构决策主线 |

## 建议阅读顺序

1. **第 1 位**：`architecture-overview.md` —— 建立整体心智模型（约 30 分钟），必读。
2. **第 2 位**：`capability-seam-map.md` —— 搞懂如何插件化、想换后端时查缝。
3. **第 3 位**：`session-lifecycle.md` —— Session 落盘 / 恢复 / 迁移的完整链路。
4. **第 4 位**：`evolution-timeline.md` —— 为什么现在这么设计。
5. **第 5 位**：`trust-boundary-map.md` —— 安全边界 / 最小权限配置。

## 一个主题，去哪张图找（责任边界）

| 你想搞清楚… | 去 |
|---|---|
| 全体哲学、运行时组合、Turn Flow、关键不变量、扩展点 | `architecture-overview.md` |
| 所有 `ctx.*` 是谁的 seam、Provider/Consumer 是谁 | `capability-seam-map.md` |
| Session 创建 / 恢复 / 追加 / 持久化 / 迁移 / 分叉 / 查询 / 销毁 | `session-lifecycle.md` |
| 沙箱 / bwrap/Landlock/Seatbelt / Windows ACL / SSH / 终端 / CUA / LiveShare 天花板 | `trust-boundary-map.md` |
| 为什么变成现在这样、版本节点、Breaking Change、升级指南索引 | `evolution-timeline.md` |

## 用法

1. 先读 `architecture-overview.md`，别急着深潜。
2. 遇到不认识的 `ctx.*`：查 `capability-seam-map.md`。
3. 遇到不懂的 Session 行为：查 `session-lifecycle.md`。
4. 遇到「なぜ」：查 `evolution-timeline.md`，它会把疑问指向具体 Agent Note / 升级指南。
5. 涉及权限与隔离：查 `trust-boundary-map.md`，必要时翻 `../deep-dives/`。

说明一件事：`architecture-overview.md` 的能力缝只给**概览**并指向 `capability-seam-map.md`；不要在总览里堆缝的具体 Provider/Consumer，避免两处事实漂移。深潜记录都落在 `../deep-dives/`。


*基于 dsh 0.2.2-alpha.2（2026-10-29）*
