# Capture — 项目导览



| 元信息 | 值 |

|---|---|

| 产品名（工作名） | **Capture**（中文暂定 **Capture**） |

| 平台（首期） | macOS 桌面端 / DeepSeek Harness Web UI (`dsh web`, profile: `desktop`) |

| 形态 | DSH 0.2.2-alpha.2 **Bundle 插件**（Host + Client 双半边） |

| 状态 | **概念 / 设计阶段**（尚未写代码； awaiting PRD sign-off） |

| 仓库（workspace） | `capture/`（本目录） |

| 主机 | `/Users/constance/Documents/GitHub/deepseek-harness-wulu2026/capture` |



## 这是什么



一个面向**作家、编剧、小说内容创作者**的创作工作室插件。创作者以**对话**为主要交互方式，逐步沉淀出：



- 作品 / 故事（多章节文本）

- 剧本 → 分镜脚本（scene / shot / 对白 / 动作 / 镜头）

- 角色设定与 **资产库**（角色、道具、场景、风格）保证跨作品、跨镜头的一致性

- 基于分镜的**角色图、分镜视频、整段剧情视频**与**高光名场面宣传片**



所有生成结果可复用、有 provenance（这条图/视频是由哪个分镜、哪套资产和哪个 prompt 产生的），并最终内嵌回 DSH 工作流（可作为 deliverable 文件、可被其他 session 创建/引用、可被 agent 继续编辑）。



## 文档索引（按推荐阅读顺序）



1. [`docs/00-PRODUCT-BRIEF.md`](docs/00-PRODUCT-BRIEF.md) — 一句话定位、目标用户、核心价值、非目标

2. [`docs/01-PRD.md`](docs/01-PRD.md) — 产品需求、用户画像、场景、功能矩阵、MVP 范围、指标、风险

3. [`docs/02-PRODUCT-DESIGN.md`](docs/02-PRODUCT-DESIGN.md) — 信息架构、用户旅程、页面与交互流

4. [`docs/03-UI-DESIGN.md`](docs/03-UI-DESIGN.md) — 视觉与组件：布局、组件规格、状态、(tokens)、assets

5. [`docs/04-TECH-ARCHITECTURE.md`](docs/04-TECH-ARCHITECTURE.md) — 在 DSH 内的技术分层：插件、数据、生成 pipeline

6. [`docs/05-TECH-IMPLEMENTATION.md`](docs/05-TECH-IMPLEMENTATION.md) — 实现计划、文件结构、数据模型、API 契约、测试

7. [`docs/06-MILESTONES.md`](docs/06-MILESTONES.md) — 里程碑、发布策略、版本号

8. [`docs/07-DECISIONS.md`](docs/07-DECISIONS.md) — ADR（架构/产品决策记录）

9. [`docs/08-OPEN-QUESTIONS.md`](docs/08-OPEN-QUESTIONS.md) — 待决问题与 Spike 计划

10. [`docs/PROGRESS.md`](docs/PROGRESS.md) — **进度与启动/交接文档**（每次落笔 / 重启对话先读这个）



## 代码与环境约定（v0）



- 宿主目录（DSH 实装）：`/Volumes/DeepSeek Harness .../app.asar`（提取包在 `.dsh-ref/`）

- Workspace / Plugin 工程：本目录 `capture/`

- DSH profile：`desktop`（`DSH_PROFILE_DIR=/Users/constance/.dsh/profiles/desktop`）

- 生成用二进制：`/opt/homebrew/bin/ffmpeg`、`ffprobe` 已装（我们将用 ffmpeg 作最终 MP4 合成兜底；若直接走生成 API，用于预处理/封面）

- Node 26；包管理 dsh profile 的 pnpm 11（minimumReleaseAge 有坑，参见 `dsh-archived` README）



## 如何在新对话中继续



1. 先读 [`docs/PROGRESS.md`](docs/PROGRESS.md) 的"当前状态 / 下一步"与"Quick Resume"。

2. 根据阶段进入对应文档。

3. 任何新增/修改约定时，**追加 ADR** 到 [`docs/07-DECISIONS.md`](docs/07-DECISIONS.md)，并更新 [`docs/PROGRESS.md`](docs/PROGRESS.md)。



## 仓库结构（当前）



```

capture/

├─ README.md

├─ docs/

│  ├─ 00-PRODUCT-BRIEF.md

│  ├─ 01-PRD.md

│  ├─ 02-PRODUCT-DESIGN.md

│  ├─ 03-UI-DESIGN.md

│  ├─ 04-TECH-ARCHITECTURE.md

│  ├─ 05-TECH-IMPLEMENTATION.md

│  ├─ 06-MILESTONES.md

│  ├─ 07-DECISIONS.md

│  ├─ 08-OPEN-QUESTIONS.md

│  └─ PROGRESS.md

├─ (Phase 1 起才会出现) package.json, cordis.patch.yml, index.js, client.js, locale/ ...

└─ (Phase 2 起) 生成器、存储schema、tests

```



## 命名约定



- 插件 ID：`capture`（Host 行 / 客户端 factory 同名；包名 `@local/capture`）。

- 存储命名空间：`capture`（storage domain JSON，见 Phase 0 Spike #1）。

- 客户端 locale namespace：`capture`。

- 默认 WS/Session：在 DSH 内挂载 Host 服务，**不**自己起 WS 服务。

- 所有 DSH-facing 注册限定在本插件 own ctx.effect 内（per practices.md）。



## 目标用户一句话



**"把碎片灵感 → 可读的故事 → 可拍的分镜 → 可看的视频"，并让 AI/agent 帮忙填满每一步。"**

## 开发与贡献

开发团队与后续 agent 必须遵循：

- `AGENTS.md`：Capture 项目级执行规则
- `CONTRIBUTING.md`：贡献流程与 whitespace / commit / branch 规则

特别约定：
- 先 review，再 commit；禁止用户确认前直接 commit。
- spec 先行：Phase 1 前先更新 architecture / implementation docs 与 ADR。
- 不在用户确认前 push。
