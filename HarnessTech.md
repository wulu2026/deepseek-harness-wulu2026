# DeepSeek Harness 专家进阶路线图

> **创建时间**：2026-10-22 | **来源**：与 AI 助手的首次规划对话
> **用途**：创业二开参考、团队培训大纲种子、核心贡献者入场清单

---

## 👤 你的画像

| 维度 | 描述 |
|------|------|
| **角色** | 软件架构师 + 微小创业企业负责人 |
| **核心诉求** | 深度应用/二次开发支撑业务、日常对外培训、冲刺核心贡献者 |
| **现有基础** | 跑通过 Demo (`pnpm dsh --profile headless`) |
| **学习偏好** | 自顶向下建立心智模型 → 最短路径拿到二开能力 → 同步沉淀培训素材 |

---

## 🗺️ 4 阶段进阶路线图

| 阶段 | 核心产出 | 预估工时 | 适合培训的切片 |
|------|----------|----------|----------------|
| **P0：架构全景 & 心智模型** (1-2 周) | 能画出「请求→循环→工具→持久化」全链路图；能向新人讲清 5 分钟架构概览 | 20-30h | ✅ Day 1 课程 |
| **P1：Profile 与插件二开** (2-3 周) | 能发布自定义 Profile；写出 3-5 个业务工具/插件；跑通自有业务场景 | 40-60h | ✅ 实战工作坊 |
| **P2：Session 深度 & 疑难排障** (2-3 周) | 读懂 SessionEventMap、Compaction、Spill、Attachment；能定位生产级卡顿/泄漏 | 30-40h | ✅ 进阶排障专题 |
| **P3：核心贡献者入场券** (持续) | 提交 1-2 个非琐碎 PR；写过升级指南；参与过 1 个 RFC/ADR 讨论 | 持续 | ✅ 贡献指南内训 |

---

## 🎯 P0 立即可开始的 3 个动作（本周内）

### 1. 建立「架构速查图」—— 你的培训底图

```bash
# 克隆并建立你的阅读笔记仓库（私有或公开）
git clone https://github.com/your-org/dsh-arch-notes.git
cd dsh-arch-notes
```

**必读 4 个文件，按序产出 1 张手绘/数字架构图**：

| 文件 | 产出 | 关键问题（带着问题读） |
|------|------|--------------------------|
| `docs/architecture.md` | 核心循环图 | Agent Loop 如何驱动？Session 如何持久化？插件如何挂载？ |
| `packages/README.md` | 包依赖拓扑图 | 哪些包是「能力接口」，哪些是「实现」？core/session/llm/shell 的分层？ |
| `docs/cordis-primer.md` | Cordis 生命周期图 | `ctx.effect` vs `ctx.on`？Waterfall 语义？配置 overlay 机制？ |
| `docs/session-format-status.md` | Session 版本演进表 | 什么时候 bump `SESSION_FORMAT_VERSION`？迁移策略？ |

> 💡 **培训技巧**：把这张图做成「5 分钟讲清 DSH 架构」的标准切片，以后每期培训开场复用。

---

### 2. 跑通「最小二开闭环」—— 你的创业验证器

```bash
# 1. 基于 headless profile 创建你的业务 profile
cp -r packages/bundle/profiles/headless packages/bundle/profiles/my-startup

# 2. 编辑 cordis.yml：只加你业务必须的插件
# 3. 写 1 个自定义工具（参考 packages/shell/src/tools/）
# 4. 跑通：pnpm dsh --profile my-startup "你的业务任务"
```

**验收标准**：
- [ ] 不改核心代码，仅通过 Profile + 自定义工具跑通 1 个端到端业务场景
- [ ] 能向团队演示：「改 3 个文件，接入我们的内部 API/数据库/工作流」

---

### 3. 建立「每日 15 分钟源码阅读」仪式

按 **「能力缝」纵向切**：

| 周 | 纵向切片 | 入口包 | 产出 |
|----|----------|--------|------|
| 1 | **Agent Loop & Session** | `packages/core` | 能画出 `runTurn` → `step` → `toolCall` → `persist` 流程图 |
| 2 | **LLM & Tool Calling** | `packages/llm` | 读懂 `ModelProvider`、`ToolCallHandler`、流式/重试/成本控制 |
| 3 | **Shell & Sandbox** | `packages/shell` + `packages/sandbox` | 理解 `Request → Spec → Exec` 分层、PTY/沙箱边界 |
| 4 | **Plugin System** | `packages/skill` + `vendor/cordis` | 彻底搞懂 `ctx.effect` 注册、`dispose`、水监听器链 |
| 5 | **Client & UI** | `packages/client` | 响应式状态、i18n 字典、Web/Desktop 双端构建 |

> 每天只读 **1 个核心文件 + 写 3 行笔记**，周末汇总成 1 页「架构决策卡」，直接变培训素材。

---

## 📦 为你准备的「随时可用」资源包

| 资源 | 形式 | 你如何用 |
|------|------|----------|
| **架构决策卡模板** | Markdown | 每周产出 1 张，积累成内部 Wiki |
| **Profile 脚手架** | `pnpm dsh create-profile <name>` | 秒级生成符合规范的业务 Profile |
| **工具开发 Checklist** | PR 模板 | 新工具必过项：Session 事件、UI Card、测试、文档 |
| **培训大纲 v0.1** | Notion/Markdown | 基于上述 4 阶段，直接排课表 |
| **贡献者入场清单** | GitHub Issue | 标准化「首个 PR」验收标准 |

---

## 🤝 后续协作模式

你可以随时让我以以下方式陪跑：

1. **手把手 P0-1**：建架构笔记仓库，画第一张核心循环图
2. **拆解必读文件**：把 4 个必读文件的「高频考点/坑点」逐个拆解
3. **P1 Profile 实战**：你描述 1 个业务场景，指导在 1 小时内跑通最小闭环
4. **共建培训大纲**：把 4 阶段拆成 8-10 个 2h 课时，含讲义/练习/答疑

---

## 📝 待办：下一步动作

- [ ] 创建 `dsh-arch-notes` 仓库
- [ ] 完成 4 个必读文件的精读 + 输出架构图 v0.1
- [ ] 创建 `my-startup` Profile 并跑通 1 个业务场景
- [ ] 建立每日 15 分钟阅读仪式（设置日历提醒）
- [ ] 梳理出第一期培训大纲（8-10 课时）

---

*此文件将作为你 DeepSeek Harness 专家之路的「第 0 号文档」，建议每阶段结束更新一次，见证成长轨迹。*