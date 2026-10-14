# 机构级代码库研究方法论（归档版）

> **状态**：归档参考。实际执行采用「结构化导读 + 关键节点深潜」轻量方案，见 `../atlas/README.md`。
> **归档时间**：2026-10-14
> **归档原因**：原方法论适合「解决具体问题」的工程研究，不适合「建立整体直觉」的研读场景。

---

## 完整方法论内容

### 核心范式
**Design Science Research + Empirical Software Engineering 双范式**
- 研究「它是什么/怎么运作」（描述性）
- 研究「它为何这样设计/演化得如何」（规范性/解释性）

### 理论镜头
1. **架构描述语言** (ISO/IEC 42010) — 多视图架构描述
2. **能力缝理论** — Service Definition / Provider / Consumer 三角色完整性
3. **插件生态演化模型** — 依赖网络、版本共演化、知识流动
4. **社会技术系统视角** — 贻献者网络、决策治理、隐性知识显性化

### 证据分层体系

```
L0: 客观不变量（事实层）
    源码 AST / 依赖图 / 构建产物 / Schema 版本 / 接口签名
    Git 历史：提交、分支、合并、作者、时间、关联 Issue/PR
    CI/CD 流水线定义、基准测试数据、覆盖率报告

L1: 设计意图与决策痕迹（意图层）
    ADR / RFC / 设计文档 / PR 描述 / Review 评论
    Agent Notes（.agents/notes/）
    升级指南、Breaking Change 记录

L2: 运行时行为与质量属性（行为层）
    端到端追踪、性能剖析、故障注入、混沌工程
    可用性测试、安全审计

L3: 生态位与演化动力学（演化层）
    依赖网络演化、包发布节奏、贡献者网络、知识流动
    与上游 Cordis、下游应用的共演化
```

**原则**：每一层结论必须可追溯到下一层原始证据。

### 结构化分析框架

#### 架构重构视图集
- 逻辑视图（包/模块/能力缝）
- 部署视图
- 进程视图
- 数据视图
- 演化视图

#### 能力缝图谱模板
```
Service Definition (接口契约)
    ↓ 实现映射
Service Provider(s) (多实现、可替换)
    ↓ 消费映射
Consumer(s) (调用模式、回退策略、测试桩)
    ↓ 演化历史
Versioned Contracts + Migration Paths
```

#### 决策考古学四步法
1. **决策点**：何时、由谁、在什么约束下
2. **备选方案**：被拒绝的方案及理由（防幸存者偏差）
3. **后果追踪**：后续是否反悔、补丁、重构
4. **隐性知识显性化**：Review 评论、即时通讯、口头传承

#### 质量属性权衡分析表
| 属性 | 度量指标 | 当前水平 | 目标/权衡 | 证据来源 |
|------|----------|----------|-----------|----------|
| 可扩展性 | 新增工具/Provider 所需 LOC/天 |  |  |  |
| 可测试性 | 忀照测试覆盖率、确定性比例 |  |  |  |
| 安全性 | 沙箱逃逸面、权限最小化程度 |  |  |  |
| 可观测性 | 追踪完整性、调试成本 |  |  |  |

### 知识产出与验证

| 产出物 | 受众 | 验证机制 |
|--------|------|----------|
| Architecture Compendium | 核心维护者、新入职者 | 专家评审 + 自动化一致性检查 |
| Capability Seam Catalog | 插件开发者 | 接口契约测试套件 |
| Decision Registry | 架构师、Tech Lead | 关联到 ADR/Agent Notes，可追溯 |
| Evolution Dashboard | 管理层、社区 | CI 集成，实时更新 |
| Threat Model & Security Baseline | 安全团队 | 定期渗透测试、依赖扫描 |
| Onboarding Curriculum | 新贡献者 | 通过率、上手时间 |

### 持续研究基础设施（即代码）

```yaml
research_infrastructure:
  data_lake:
    - git_history_warehouse
    - ast_knowledge_graph
    - ci_metrics_timeseries
    - issue_pr_network

  analysis_pipelines:
    - architecture_conformance
    - decision_drift_detection
    - knowledge_freshness_score

  publication:
    - living_docs_site
    - api_compatibility_matrix
    - contributor_guide_gen
```

---

## 针对 DeepSeek Harness 的特化策略

优先建立：
1. **Plugin Dependency & Capability Seam Graph** — 40+ 包的 `peerDependencies`、`ctx.effect()` 注册、`SessionEventMap` 扩展
2. **Session Format Evolution Timeline** — `SESSION_FORMAT_VERSION`、迁移脚本、升级指南演化树
3. **Snapshot Test Coverage Map** — 哪些能力缝有快照、哪些缺口、冗余度
4. **Dual-SDK Projection Consistency Checker** — TS/Python SDK 对循环/事件的投影一致性
5. **Agent Notes Decision Graph** — `.agents/notes/` 结构化为可查询决策知识库

---

## 原版建议的 wulutech/ 目录结构（归档参考）

```
wulutech/
├── methodology/
│   ├── RESEARCH_METHODOLOGY.md
│   ├── EVIDENCE_CATALOG.md
│   └── ANALYSIS_FRAMEWORK.md
├── evidence/
│   ├── git/
│   ├── ast/
│   ├── ci/
│   └── notes/
├── models/
│   ├── capability_seams.yaml
│   ├── package_dependency_graph.json
│   └── session_format_evolution.json
├── analyses/
│   ├── architecture_compendium/
│   ├── decision_registry/
│   └── quality_tradeoffs/
└── publications/
    ├── for_maintainers/
    ├── for_plugin_authors/
    └── for_new_contributors/
```

---

## 批判性反思（导致方案调整的关键问题）

| 问题 | 后果 | 修正方向 |
|------|------|----------|
| 过度学院派，预设重基建 | 启动成本极高，易「造工具不做研究」 | 轻量化：无数据湖、无知识图谱、无 CI 仪表盘 |
| 缺乏「以问题为锚」，全景扫描 | 大量沉没成本在无关细节 | 改为「结构化导读」：先给全景图，按需深潜 |
| 忽略「通过修改来理解」 | 无法验证隐性知识（如 Waterfall next()） | 深潜阶段引入「最小改动验证」作为可选手段 |
| 交付物与受众错位 | 产出过重、维护负担大、更新滞后 | 产出极简：`atlas/` 全景图 + `deep-dives/` 挙需记录 |

---

## 存档说明

此文档保留作为**方法论演进的见证**。实际执行方案见：
- `../atlas/README.md` — 结构化导读执行计划
- `../atlas/architecture-overview.md` — 首张全景图（进行中）

---

*归档者：wulu*
*日期：2026-10-14*