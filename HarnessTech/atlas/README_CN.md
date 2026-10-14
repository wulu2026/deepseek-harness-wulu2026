# HarnessTech/atlas — 结构化导读图集

> **定位**：给人看的全景图。不求器可查，只求读完能在脑子里跑通。
> **无 YAML，无自动化基建，无 Phase 门槛** —— 读完即用，按需深潜。

---

## 目录

| 文件 | 说明 | 建议阅读顺序 |
|------|------|--------------|
| [`architecture-overview.md`](architecture-overview.md) | **核心总览**：整体哲学、运行时组合、核心子系统、Session 日志、Agent/Loop、能力缝、类型模式、持久化、关键不变量、扩展点、双 SDK | **第 1 位**（必读） |
| [`capability-seam-map.md`](capability-seam-map.md) | **能力缝全景表**：所有 `ctx.xxx` 缝的 Definition / Provider(s) / Consumer(s) 三角色完整映射 | 第 2 位 |
| [`session-lifecycle.md`](session-lifecycle.md) | **Session 生命周期**：创建/恢复/分叉/持久化/迁移/查询/导出的完整链路与状态机 | 第 3 位 |
| [`evolution-timeline.md`](evolution-timeline.md) | **演化时间线**：关键版本节点、Breaking Change、架构决策演进（从 Git/Notes/Upgrade Guides） | 第 4 位 |
| [`trust-boundary-map.md`](trust-boundary-map.md) | **信任边界图**：沙箱/子进程/SSH/Terminal/网络的信任边界与权限矩阵 | 第 5 位 |

---

## 怎么用

1. **先读 `architecture-overview.md`** — 建立整体心智模型（~30 分钟）。
2. **按兴趣跳转**：
   - 想懂「插件怎么被发现/注册/替换」→ 看 `capability-seam-map.md` 的 `ctx.llm` / `ctx.tools` / `ctx.fs` 等核心缝。
   - 想懂「Session 怎么落盘/恢复/迁移」→ 看 `session-lifecycle.md`。
   - 想懂「为什么要这样设计/演变过来的」→ 看 `evolution-timeline.md`。
   - 想懂「哪里是 trusted/untrusted」→ 看 `trust-boundary-map.md`。
3. **遇到不懂的节点** → 告诉我「这儿展开」，我现场拉源码/历史/Notes 给你讲清（产出放 `../deep-dives/`）。

---

## 维护约定

- **只增不改**：新认知追加到对应文件末尾或新增小节；不重写已有段落。
- **引用即证据**：文中标注 `[源码路径:行号]` / `[Agent Note:日期-标题]` / `[PR:#号]`，你随时可回溯。
- **不過度设计**：没有 YAML 模型、没有自动化脚本、没有 CI 门禁。这是给**你**读的。

---

## 关联目录

```
HarnessTech/
├── atlas/              # 本目录：全景图（核心资产）
├── deep-dives/         # 挙需产生的深潜记录（如 plugin-registration-deep-dive.md）
├── methodology/        # 方法论归档（INSTITUTIONAL_RESEARCH_METHODOLOGY.md）
└── README.md           # HarnessTech 根目录入口
```

---

*2026-10-14 创建*