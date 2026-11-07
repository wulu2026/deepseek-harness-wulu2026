# Capture — PRD (01)

## 1. 范围定义

### 1.1 范围内（v1.0）

- 创作数据模型：Project / Chapter / Scene / Shot / Asset / Generation / Trailer
- 对话驱动的增删改查（智能体工具 + UI 面板）
- 资产库复用与“身份锁定”（identity lock）
- 生成：角色图 / 镜头静帧 / 镜头视频 / 预告片
- 来源追溯与版本
- 导出：Markdown / JSON / .docx（文本）+ mp4（视频）
- 与 DSH 的会话、智能体、交付物、作业、存储集成

### 1.2 范围外（v1）

- 多人协作 / 共享作品库 / 市场（Market）（v2）
- 时间线编辑器（v2）
- 移动端 / Web（UI 兼容 Web 但不测试，v2）
- 非 DeepSeek 提供的专有生成模型比价（v2）
- 版权 / 许可（v2）

## 2. 用户画像 & 用例（Use cases）

### UC-1 新作品（Writer-A）

1. 在 DSH 会话中输入 `/story new "末日都市" / genre: 赛博朋克`。
2. 大纲智能体提议 6 个主要角色 + 三幕结构；作家接受/修改。
3. 作家：“第1章，主角爬塔。” → 故事智能体生成章节草稿（markdown）。
4. “拆分镜” → 镜头导演智能体生成 8 个镜头 + 镜头/动作/对白。
5. “给我主角的设定图” → 角色图生成（图像生成）。
6. “生成第3个镜头的视频” → 镜头视频生成。
7. “把 2 个高光拼成 30 秒宣传片” → 预告片生成。
8. `present()` 交付 mp4；用户下载。

### UC-2 一致性（Writer-A）

- 创建资产“主角-林”（character），绑定 4 张参考图 + 风格种子。
- 在镜头 4 中使用该资产；生成静帧时自动注入身份锁定。
- 后续重新生成可“使用种子 X / 相同参考图”。

### UC-3 剧本（Writer-B）

- 导入现有 .docx 剧本（从模板重新开始）。
- 镜头清单从节拍表自动生成；并派生镜头/地点。
- 导出 screenplay.md（Fountain 风格）+ shot list.csv。

### UC-4 宣传片剪切（Creator-D）

- 从已完成作品导入“高光节拍” → 生成带标题卡的 30 秒预告片。
- 两种风格：预告片（电影感）/ 社交（9:16 竖版裁剪）。

### UC-5 迭代分支

- 作家分叉第 4 章 → 尝试 A/B 结局；比较差异 → 选择。
- 通过子智能体对比一致性问题。

### UC-6 智能体自动一致性检查

- 一致性智能体扫描已完成内容 → 标记：“林在镜头 9 的头发颜色与资产不匹配” → 提出修复建议。

## 3. 信息架构（用户侧）

见 [`02-PRODUCT-DESIGN.md`](02-PRODUCT-DESIGN.md) §2。

4 个主视图（DSH 槽位 `main` 右侧面板？或 `conversation` 旁）：

- **工作室面板** = 项目/章节/分镜（树形）+ 详情编辑器
- **资产库** = 资产列表 + 生成器
- **生成队列与结果** = 进行中 / 历史
- **预告片工作室** = 高光挑选 + 风格 + 导出

DSH 的 main 视图是会话驱动（`uiWorkspace.openSession`），我们计划：

- 使用 `settings.general.item` 注册一个 **“Capture”设置/页面**（可选）
- 使用 `main` 槽位还是 `shell.overlay`？更倾向于**侧边面板 blade**？实际上 DSH Web 的 `main` 按会话显示对话。我们设计为**会话范围**：每个会话*可以*绑定到一个项目。打开“Capture”面板会通过 `shell.overlay` 或 `main` 槽位注册打开一个与会话绑定的工作室（插件自有子视图）。细节见 TECH。

## 4. 功能矩阵 & 优先级

| ID | 功能 | 阶段 | 优先级 | 负责智能体 |
|---|---|---|---|---|
| F1.1 | 项目增删改查（名称、类型、一句话梗概） | 1 | P0 | Story Manager |
| F1.2 | 章节/场景增删改查 | 1 | P0 | Story Manager |
| F1.3 | 富文本编辑器（markdown + 块） | 1 | P0 | UI |
| F1.4 | 大纲 / 节拍表 | 1 | P1 | Outline Agent |
| F2.1 | 镜头实体增删改查 | 1 | P0 | Shot Director |
| F2.2 | 镜头清单版本 | 1 | P1 | Story Manager |
| F2.3 | Fountain 风格剧本导入/导出 | 1 | P1 | Exporter |
| F3.1 | 资产增删改查（角色/道具/地点/风格） | 1 | P0 | Asset Manager |
| F3.2 | 资产版本管理 | 1 | P1 | Asset Manager |
| F3.3 | 参考图上传（文件） | 1 | P0 | UI |
| F3.4 | 身份锁定模板 | 1 | P0 | Asset Manager |
| F4.1 | 角色图生成 | 2 | P0 | Gen Agent |
| F4.2 | 镜头静帧生成 | 2 | P0 | Gen Agent |
| F4.3 | 镜头视频生成 | 3 | P0 | Gen Agent |
| F4.4 | 预告片剪辑 | 3 | P0 | Trailer Agent |
| F4.5 | 竖版/社交裁剪 | 3 | P2 | Trailer Agent |
| F5.1 | 资产绑定到镜头 | 2 | P0 | Shot Director |
| F5.2 | 一致性检查（智能体） | 2 | P1 | Consistency Agent |
| F6.1 | 分支/分叉 + 差异 + 选择 | 1 | P1 | Story Manager |
| F7.1 | 高光节拍 → 预告片 | 3 | P0 | Trailer Agent |
| F7.2 | 标题卡 / 字幕 | 3 | P2 | Trailer Agent |
| F8.1 | 大纲/场景/镜头智能体 | 1 | P0 | 全部 |
| F8.2 | 一致性智能体 | 2 | P1 | 全部 |
| F9.1 | 导出 md/json/docx | 1 | P1 | Exporter |
| F9.2 | 导出 mp4 + `present()` | 3 | P0 | Exporter |

## 5. 数据 & 状态（数据契约）

### 5.1 规范实体

```text
Project {
  id, name, genre, logline, audience?, tone?,
  stylePackId?, createdAt, updatedAt,
  chapters: [ChapterId], assets: [AssetId]
}
Chapter { id, projectId, index, title, synopsis, beats[], status, text(md), wordCount }
Scene? (optional; chapter -> shots directly OR via scene; we keep optional scene for screenplay mode)
Shot {
  id, projectId, chapterId?, sceneId?,
  order, durationSec,
  type: establishing|character|action|dialogue|insert|transition,
  description (narrative / action),
  dialogue?: { speaker, text, v.o? },
  camera: { shotSize, angle, movement, lens? },
  transition?: { type, duration },
  audio?, sfx?, music?,
  assetBindings: { characters:[AssetId], props:[], location?, stylePack? },
  generation?: { stillImageId?, videoClipId?, lastGeneratedAt, seed? },
  variants?: ShotVariant[]
}
Asset {
  id, projectId, kind: character|prop|location|stylePack,
  name, description,
  referenceImages: [fileRef],
  tags[], traits (character: age, gender, hair, voice...),
  identityLockPrompt (generated), version, createdAt, updatedAt,
  usedBy: [{ shotId, role }]
}
Generation {
  id, kind, sourceShotId? , assetId?,
  status: queued|running|done|failed|cancelled,
  progress, startedAt, finishedAt,
  params (prompt, seed, model, width, height, duration, ...),
  outputs: [fileRef],
  provenance: { shotId, assetVersions, promptHash }
}
Trailer {
  id, projectId, style: cinematic|social|vertical,
  durationTargetSec, beats: [shotId|highlight], titleCards[],
  status, outputs: [mp4Ref], progress
}
```

### 5.2 存储放置

- 主机存储域：插件命名空间 `capture`（在技术验证中确认；见开放问题 Q1）。
- JSON 文件位于 `$DSH_HOME/storages/capture/` 或插件自有应用数据目录（检查后确定）。
- 媒体：`$DSH_HOME/.../capture/media/<projectId>/<assetId>/...` + 通过 DSH 交付物/引用服务提供文件引用。
- **按会话 vs 全局**：项目是全局实体（跨会话），媒体文件是全局的。会话只持有当前“工作集”指针 + 智能体上下文 + 聊天。这对 DSH 不寻常（大多数状态是会话派生的）。理由：作为存储服务 + 其上投影；允许任意会话中的智能体打开项目。

### 5.3 事件溯源考虑

按 DSH 实践：会话日志是事实来源。我们的项目位于主机存储（域存储），不在会话日志中。为了让智能体重放和智能体分叉工作安全：

- **插件存储是项目的单一事实来源（SSOT）**；会话仅引用 projectId。
- **会话可以分叉项目** → 新 projectId（插件存储中深拷贝）或“分支”指针。我们将每个会话的插件存储变更记录为 Operation 记录（日志），以便撤销可用。
- 生成结果在聊天中作为插件记录引用？避免新增会话事件类型（实践 #16 说不要追加 `type: new`）。改用现有 `assistant/message` + `tool/result` 事件；在主机存储 Generation 数据库行。智能体通过工具结果看到。

## 6. 智能体 & 模型策略

- 智能体通过 DSH 智能体预设（技能）定义。每个专用智能体有系统提示词 + 工具范围：
  - **Story Manager**（编排器）：创建项目/章节/镜头清单，分叉，合并。
  - **Outline Agent**：节拍与结构。
  - **Shot Director**：从节拍/场景生成镜头清单。
  - **Consistency Agent**：检查资产与镜头使用，报告不匹配（只读建议）。
  - **Asset Manager**：从文本创建/复用资产。
  - **Gen Agent**（图像/视频）：生成作业与提示词编译。
  - **Trailer Agent**：节拍选择与预告片编译。
  - **Exporter**：导出格式 + present。
- 工具面通过 `ctx.tools` 注册：`capture.*` 工具（需验证实际 API）。
- 重推理使用子智能体以保持主上下文精简（按实践 #28 — 后续）。

## 7. 提供商抽象（生成）

```text
interface MediaProvider {
  generateImage(params): { outputPaths, seed, model }
  generateVideo(params): { outputPaths, duration }
  capabilities: {...}
}
```

实现：

- **DeepSeek 账户（如果支持图像）** — 待检查账户 API。
- **通用 HTTP 图像 API**（用户提供 base URL + key；OpenAI 兼容 `/images/generations`、Stability 等）
- **本地**（ComfyUI/A1111 + ffmpeg 拼接）— 可选，阶段 3。
- **模拟提供商**（阶段 1/开发与测试，通过 sharp/占位图生成占位图像）。

阶段 1 仅交付模拟 + 轻量 HTTP 提供商；真实 API 在技术验证中确认（见开放问题 Q2/Q3）。

## 8. 验收标准

阶段 1：

- E1：`/story new "X"` + `/story chapter add` + `/story shotlist generate` 生成项目 + 章节 + 5 个镜头；显示在工作室面板。
- E2：智能体可通过 `capture.shot.update` 编辑镜头对白；显示差异。
- E3：创建资产 + 绑定到镜头；一致性警告可见。
- E4：分叉章节 → 2 个分支；选择胜出恢复。
- E5：导出 screenplay.md + shotlist.csv。
- E6：主机冒烟 & 客户端冒烟通过；兼容性检查通过。

阶段 2：

- E7：角色图生成 + 预览；来源追溯存储。
- E8：相同种子重新生成可复现（提供商允许时）。

阶段 3：

- E9：镜头视频生成 + 预告片导出（mp4）`present()`。

## 9. 风险缓解的具体承诺

- 阶段 1 强制做会话重放验证（重启 DSH；项目通过主机存储持久化）。
- 所有生成输出写到 `$DSH_HOME/.../capture/media`，并用 DSH `present()` + `deliverable` 文件引用，使其成为一等公民。
- 作业取消 & 部分失败恢复：每个作业提供重试 + 清理临时文件。
- 一致性警告仅建议，不自动更改（人在回路）。

## 10. 发布 & 版本

- v0.1.0：内部测试（阶段 1 完成）
- v0.2.0：带图像生成的 beta（阶段 2）
- v0.3.0：视频 + 预告片（阶段 3）
- v1.0.0：公开 bundle（阶段 4）

MS/semver；见 MILESTONES。

## 11. 指标埋点（阶段 1 即埋点，默认关闭）

- `projects_created`、`shots_generated`、`asset_reuse_count`、`agent_edit_accepted/rejected`、`gen_jobs_*`、`trailer_exports`。
- 通过 `dsh-client-product-analytics`（可选服务，注入）。仅在存在时调用。