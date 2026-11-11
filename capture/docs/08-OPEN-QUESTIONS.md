# Capture — 开放问题与技术验证 (08)

每个问题含 ID、阻塞阶段、负责方、验证方法。

---

### Q1. 存储：官方存储域 API 在哪里？目录约定？事务？

- 阻塞：阶段 1
- 验证：提取 `dsh-storage*` README + 检查运行时；用 `cordis_inspect_query` 查询 `storage` 服务。
- 技术验证 S1。

### Q2. DeepSeek 账户是否提供图像/视频生成？

- 阻塞：阶段 2（决定提供商优先级）
- 验证：检查 `dsh-deepseek-account`、`dsh-deepseek-llm-api-extensions`、`dsh-llm-deepseek` README。
- 技术验证 S5。

### Q3. 客户端—宿主服务调用机制？

- 阻塞：阶段 1（所有 UI）
- 验证：工作区浏览器如何调用 `session/create`：提取 `dsh-api-session-controller` 与 `remoteAccess` 文档；查找 `ctx.remote.commands.execute` 示例。
- 技术验证 S2。

### Q4. 覆盖层的宽度/能力？

- 阻塞：阶段 1（UI 容器）
- 验证：`ui-plugin` 槽位列表 + 检查槽位 `listSubTree`；`shell.overlay` 是否支持宽侧板。
- 技术验证 S2/UI。

### Q5. 插件能否注册智能体预设/技能？

- 阻塞：阶段 1（智能体）
- 验证：插件能否注册技能/智能体预设；否则用 systemPrompt 章节。
- 技术验证 S3。

### Q6. 作业服务的导出名称？

- 阻塞：阶段 1/阶段 2
- 验证：检查 `dsh-jobs`。
- 技术验证 S4。

### Q7. 工具注册 API 的确切形式（`ctx.tools.register` 还是 defineTool）？

- 阻塞：阶段 1
- 验证：检查 `dsh-tools`。

### Q8. 交付物文件引用 API（present + 文件引用）以暴露生成的媒体。

- 阻塞：阶段 3
- 验证：检查 `dsh-tool-present`、`dsh-deliverable-file-references`。

### Q9. 媒体 MIME/本地路径如何暴露给 Web UI 的 `<img>/<video>`（是否需要宿主路由？）。

- 阻塞：阶段 2
- 验证：使用 DSH 文件引用流程（推荐）；除非必要，避免自定义路由。

### Q10. 项目全局存储的并发与多会话访问。

- 阻塞：阶段 1
- 验证：S1 + 进程内锁。

### Q11. 一致性智能体的输出契约（差异提案）。

- 阻塞：阶段 1
- 验证：工具 `propose_change` + UI 差异渲染假设。

### Q12. 技能打包：自定义插件的区域设置与元数据。

- 阻塞：阶段 0 基础项
- 验证：装饰模板 + dsh-archived 宿主插件检查清单。

## 技术验证计划

执行时在 `capture/docs/spikes/` 中创建技术验证笔记；不要提交虚假答案。

## 决策触发条件

- 如果 S1 显示存储域需要 profile 级对等依赖，调整 package.json 依赖。
- 如果 Q2 显示 DeepSeek 无图像生成，默认使用 HTTP 提供商并记录设置说明。
