# Capture — 技术架构 (04)

## 1. 形态

DSH Bundle（通过 profile 安装）分为宿主侧（Host half，`index.js`）与客户端侧（Client half，`client.js`）。

```text
@local/capture
├─ package.json          # dsh.bundle.patch + dsh.client
├─ cordis.patch.yml      # insert row
├─ index.js             # Host apply()
├─ client.js             # factory(require) client
├─ lib/ ... (optional future split)
├─ locale/{en,zh}.json
└─ icon.svg
```

通过 `plugin_manager install_bundle` 以绝对路径安装（视需要使用已批准的构建）。

## 2. 宿主侧（index.js）

### 2.1 注册的服务

- `capture`（核心服务）— Project/Chapter/Shot/Asset/Gen/Trailer 存储 IO + 业务逻辑。
- `captureMedia`（媒体存储）— 文件放置 + 引用。
- `captureGen`（生成编排器）— 作业 + 提供商抽象 + 队列。
- `captureAgents` 可能不是独立服务；智能体预设注册为 DSH 插件预设？（关于技能见 Q？）
- 工具以 `capture.*` 注册在 `ctx.tools` 下。

### 2.2 数据存储

- 使用 DSH 存储服务（需在技术验证 S1 中检查确切服务名/API）。优先使用 `ctx.storage`（若可用）；否则在 `$DSH_HOME/storages/capture/`（JSON）下自定义存储，使用原子写入（`dsh-atomic-write`）。
- 媒体文件：位于存储区域或专用应用数据目录。**重要**：保持路径跨会话稳定；通过 DSH 交付物引用 API 提供引用。

### 2.3 事件/投影

- 项目/镜头状态是全局的（存储），非按会话。但 UI 需要响应式更新。使用会话投影？替代方案：宿主存储在 `capture/changed` 事件（服务本地）上发出变更事件，客户端通过远程流订阅。DSH 实践禁止新增会话事件类型（仅保留 `plugin:` 记录）。我们将使用服务本地 websocket/通道（`remoteEvents`？）或以小间隔轮询。**技术验证 S2** 确定最佳机制（很可能是通过 `remoteAccess` 使用 `ctx.events`/`Event` 服务）。

### 2.4 作业

- 若可用则使用 `dsh-jobs`：长生成作为带进度的 Job；否则使用自定义异步队列，配合 `ctx.schedule` + 进度广播。需检查。

### 2.5 安全/路由

- 任何宿主 HTTP 路由（若用于媒体预览/下载）遵循 dsh-archived 模式：限制为回环地址 + 同源 + 自定义请求头。优先不使用自定义路由；使用 DSH 文件引用/交付物（推荐），以便文件通过宿主标准端点打开。

## 3. 客户端侧（client.js）

- 工厂（require）模式，`inject: ['slots','locale', maybe 'remoteAccess','jobs']`。
- 注册区域命名空间 `capture`。
- 注册槽位：
  - `sidebar.workspaces.session.menu.item`（id `capture.open`，顺序约 450—500）→ “打开 Capture”。
  - `shell.overlay` 条目 → StudioPanel 组件。
  - `settings.general.item` → 设置区（提供商/配置）。
  - 可选 `conversation.input.dock` 快捷操作。
- 通过宿主投影/远程调用读取项目数据。需确定；技术验证 S2。
- 渲染自带控件的 React 组件（不将 ui-primitives 作为模块导入；在构建中仅在类型依赖中使用 DSH 原语；工厂模式下手写使用 token 的按钮）。

## 4. 生成管道（概览）

```text
UI/Agent
  -> capture.generateImage({ shotId|assetId, kind, params })
     -> Gen Agent 从资产身份锁定 + 风格 + 镜头编译提示词
     -> MediaProvider.generateImage -> 文件
     -> 记录 Generation 行 + 链接到 Shot/Asset（版本递增）
     -> 发出变更事件 -> UI 更新；作业进度
```

视频：

```text
镜头视频：提供商图生视频或文生视频（取决于能力）
  -> 存储片段
预告片：
  - 选择节拍（镜头/高光）
  - 生成标题卡（可选）
  - ffmpeg 拼接/裁剪/转码 → 最终 mp4 带音轨占位
  - 证书/来源清单（JSON）
  -> present() 文件
```

提供商接口与模拟实现位于 `index.js`；可通过设置配置。

## 5. 智能体预设 / 技能

我们需要注册 DSH 技能，以便智能体知道如何调用 `capture.*` 工具。选项：

- 在包内 `skills/capture/` 下添加捆绑技能？DSH 智能体预设技能位于 `dsh-agent-preset` 包（内置）。对于插件，可能通过 `ctx.systemPrompt.section()` 和/或工具描述提供系统提示词章节。插件的技能注册？技术验证 S3。
- 或者，包含智能体预设覆盖补丁（复杂度高）。阶段 1 将使用 systemPrompt 章节 + 工具描述；后续再议。

## 6. 性能与 UX

- 所有长操作作为作业；UI 通过轮询/订阅读取进度（技术验证 S4）。
- 避免轮询智能体/状态；使用作业状态。
- 重列表：稍后通过 DSH 分块列表处理？媒体缩略图通过文件引用懒加载。

## 7. 测试

- 宿主冒烟：临时 DSH_HOME；创建项目/章节/镜头/资产；模拟生成；导出；重启读取。
- 客户端冒烟：工厂渲染？（桩 React/fetch）按 dsh-archived 的 client-smoke。
- 兼容性检查：读取 app.asar 并断言服务 API（需在技术验证后定义契约）。
- 端到端（真实 dsh web）：阶段 1 手动；可选 `tools/e2e.py` 类似物。

## 8. 安全与隐私

- 除非配置了提供商 + 用户选择加入，否则无外部调用。
- 所有媒体本地；生成提示词可能包含发送给提供商的用户内容（显式）。
- 角色：会话中任何智能体可调用工具；宿主存储全局 → 智能体可读取所有项目（v1 可接受；后续可能限定范围）。
- API 密钥仅通过环境变量（`DSH_CAPTURE_*`），绝不在存储中。

## 9. 扩展点摘要（已验证子集）

来自 dsh-archived + 工作区 README，槽位：

- `sidebar.workspaces.session.menu.item`（会话行菜单）
- `sidebar.workspaces.session.row.action`（悬停操作）
- `shell.overlay`（侧板/对话框）
- `settings.general.item`（设置）
- `conversation.input.dock`（可选快捷操作）
- `main`（可能，避免冲突）

工具：`ctx.tools` 注册（需验证 schema）。

存储：`ctx.storage`/domain（需验证）。

作业：`ctx.jobs`（需验证）。

会话：`ctx.sessions`（需验证）。

区域设置：`ctx.locale.register`。

槽位：`ctx.slots.inject/register`。

阶段 0 技术验证将对上述内容进行确认。