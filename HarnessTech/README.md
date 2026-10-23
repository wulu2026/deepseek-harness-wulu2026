# HarnessTech

本文件夹是对 **DeepSeek Harness** 代码库的结构化导读与研究笔记集。

> **定位**：给人看的全景图 + 按需深潜记录。不求机器可查，只求读完能在脑子里跑通。

---

## 目录结构

```
HarnessTech/
├── README.md                          # 本文件：入口导航
├── atlas/                             # 结构化导读图集（核心资产）
│   ├── README.md                      # 怎么读这套图（必读入口）
│   ├── architecture-overview.md       # 架构总览：哲学、运行时组合、核心子系统、Turn Flow、关键不变量
│   ├── capability-seam-map.md         # 所有 ctx.xxx 缝的 Definition / Provider(s) / Consumer(s) 全景表
│   ├── session-lifecycle.md           # Session 创建/恢复/追加/持久化/迁移/分叉/查询/销毁完整链路
│   ├── evolution-timeline.md          # 关键版本节点、Breaking Change、架构决策演进时间线
│   └── trust-boundary-map.md          # 沙箱/子进程/SSH/Terminal/网络的信任边界与权限矩阵
├── deep-dives/                        # 按需产生的深潜记录
│   ├── local-desktop-build-and-dmg.md     # 本机 Desktop 构建与 DMG 安装实录
│   └── local-desktop-build-and-dmg_CN.md  # 中文实录
└── methodology/
    └── INSTITUTIONAL_RESEARCH_METHODOLOGY.md  # 归档的机构级研究方法论（初版，供参考）
```

---

## 快速开始

| 如果你想… | 先读 |
|-----------|------|
| 建立整体心智模型 | `atlas/architecture-overview.md` |
| 搞懂插件/缝机制、想换后端 | `atlas/capability-seam-map.md` |
| 搞懂 Session 怎么落盘/恢复/迁移 | `atlas/session-lifecycle.md` |
| 搞懂「为什么现在这么设计」 | `atlas/evolution-timeline.md` |
| 搞懂安全边界、最小权限配置 | `atlas/trust-boundary-map.md` |
| 看方法论演进 | `methodology/INSTITUTIONAL_RESEARCH_METHODOLOGY.md` |
| 本机启动和安装 macOS Desktop | [`deep-dives/local-desktop-build-and-dmg_CN.md`](deep-dives/local-desktop-build-and-dmg_CN.md) |

**建议阅读顺序**：`atlas/README.md` → `architecture-overview.md` → 按兴趣跳转其余图。

---

## 维护约定

- **只增不改**：新认知追加到对应文件末尾或新增小节；不重写已有段落。
- **引用即证据**：文中标注 `[源码路径:行号]` / `[Agent Note:日期-标题]` / `[PR:#号]`，随时可回溯。
- **不过度设计**：没有 YAML 模型、没有自动化脚本、没有 CI 门禁。这是给**人**读的。

---

## 关联链接

- [主项目仓库](../README.md)
- [DeepSeek Harness 架构文档](../docs/architecture.md)
- [Agent Notes 决策记录](../.agents/notes/)

---

*最后更新：2026-10-23*
*维护者：wulu*