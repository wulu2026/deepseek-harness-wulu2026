# HarnessTech/methodology — 方法论归档索引

> **定位**：记录研究 DeepSeek Harness 所用方法论的演进历史。正交于 `atlas/`（成果输出）与 `deep-dives/`（具体深潜）。

---

## 📂 目录

| 文件 | 状态 | 说明 |
|------|------|------|
| [`INSTITUTIONAL_RESEARCH_METHODOLOGY.md`](INSTITUTIONAL_RESEARCH_METHODOLOGY.md) | 📦 **归档参考** | 完整的机构级研究方法论（Design Science Research + Empirical SE 双范式、证据分层 L0-L3、结构化分析框架）。适合「解决具体问题」的工程研究，**不适合**「建立整体直觉」的研读场景。 |
| [`PERSONAL_LEARNING_ROADMAP.md`](PERSONAL_LEARNING_ROADMAP.md) | 🟢 **活跃演进** | 个人从「跑通 Demo」到「核心贡献者」的 4 阶段进阶路线图、P0 立即行动、里程碑记录。供培训大纲复用、进度复盘、决策回溯。 |

---

## 🔄 方法论演进脉络

```
2026-10-14  创建 INSTITUTIONAL_RESEARCH_METHODOLOGY.md（完整理论框架）
    │
    ├─► 发现：太重、不适合「建立直觉」场景
    │
    └─► 2026-10-14 创建 atlas/ 轻量方案：结构化导读图集 + 按需深潜
            │
            └─► 2026-10-22 新增 PERSONAL_LEARNING_ROADMAP.md（个人学习路径归档）
```

---

## 🎯 使用指南

| 你想… | 看这里 |
|-------|--------|
| 理解「为什么 atlas 采用现在的轻量结构」 | `INSTITUTIONAL_RESEARCH_METHODOLOGY.md` 的「归档原因」与「核心范式」 |
| 设计自己的代码库研究方法论 | `INSTITUTIONAL_RESEARCH_METHODOLOGY.md` 全文（证据分层 L0-L3 可直接复用） |
| 追踪个人学习进度、调整路线 | `PERSONAL_LEARNING_ROADMAP.md` 的阶段看板与里程碑表 |
| 复用培训大纲素材 | `PERSONAL_LEARNING_ROADMAP.md` 的「适合培训的切片」列 |

---

## 📝 维护约定（同 HarnessTech 根约定）

- **只增不改**：新方法论版本、新学习阶段追加到对应文件末尾；不重写已有段落。
- **引用即证据**：标注 `[源码路径:行号]` / `[Agent Note:日期-标题]` / `[PR:#号]`。
- **不过度设计**：无 YAML、无自动化、无 CI 门禁。给**人**读。

---

## 🔗 关联导航

```
HarnessTech/
├── atlas/                    # 成果输出：全景图集
│   ├── architecture-overview.md
│   ├── capability-seam-map.md
│   ├── session-lifecycle.md
│   ├── evolution-timeline.md
│   └── trust-boundary-map.md
├── deep-dives/               # 具体深潜记录（按需产生）
├── methodology/              # 本目录：方法论归档
│   ├── README.md             # ← 你在这里
│   ├── INSTITUTIONAL_RESEARCH_METHODOLOGY.md
│   └── PERSONAL_LEARNING_ROADMAP.md
└── README.md                 # HarnessTech 根入口
```

---

*最后更新：2026-10-22*
*维护者：wulu*