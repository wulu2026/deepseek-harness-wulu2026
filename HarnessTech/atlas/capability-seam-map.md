# Capability Seam Map — 全景表

> **来源**：`docs/capability-seams.md`（由 `scripts/gen-doc-graphs.ts` 生成，Mermaid 图 + 表格）+ 各包 README + Agent Notes。
> **约定**：每个缝 = **Definition（接口契约） + Provider(s)（实现） + Consumer(s)（消费者）**。三角色齐备才叫缝。

---

## 核心缝（产品主干）

| `ctx` Key | Definition 包 | Provider 实现包 | 直接 Consumer | 关键约束 / 备注 |
|-----------|--------------|----------------|--------------|----------------|
| `ctx.llm` | `llm` | `llm-deepseek`, `llm-pi-ai`, `llm-replay` | `agent-loop`, `compaction-basic` | Adapter 注册 provider 实现；loop/compaction 调用 provider-neutral stream service |
| `ctx.tools` | `tools` | — (registry) | `agent-loop`, `tool-ask-user`, `tool-bash`, `tool-cordis`, `tool-fs`, `tool-terminal`, `tool-skill`, `tool-subagent`, `tool-todo`, `tool-web` | 统一管道：pre-execute → guards → execute → projectContent → post-execute → finalizeContent → result |
| `ctx.systemPrompt` | `system-prompt` | — | `agent-loop`, `tools`, `tool-fs`, `tool-terminal`, `tool-web` | 收集有序 prompt sections + tool schemas；每步组装 |
| `ctx.sessions` | `session` | — | `agent-loop`, `agent`, `session-persistence`, `session-query`, `subagent`, `message-feedback` | Append-only SessionEvent log；单一事实来源 |
| `ctx.sessionPersistence` | `session-persistence` | `session-persistence-jsonl` | `agent-loop`, `tool-bash`, `hooks-*`, `session-query`, `message-feedback` | Handle-based：`create/open/stat/list` → `SessionHandle(read/append/flush/close)` |
| `ctx.sessionQuery` | `session-query` | `session-query-sqlite` | `session-reference`, `tool-session-query` | 逻辑语料库、有界读、血统、语义过滤、SQLite FTS |
| `ctx.sessionProjections` | `session-projection` | — | `api-session-controller`, `tool-todo`, `session-title` | 域注册 fold units；eager drive 维护 watermark |
| `ctx.agents` | `agent` | — | `agent-loop`, `acp`, `subagent` | Live Agent handles + factory seam + initiator propagation |
| `ctx.agentLoop` | `agent-loop` | — | `base`, `sdk-minimal` | 具体 driver 实现；profile 入口层依赖 |
| `ctx.agentDefaultModel` | `agent-default-model` | — | `api-session-controller`, `headless` | 读 volatile Config 中的默认 ModelSelection |
| `ctx.agentPresets` | `agent-preset-registry` | — | — | YAML preset 登记 + 版本保留 + 隔离 realm |

---

## 执行/环境缝（Shell、子进程、沙箱、终端）

| `ctx` Key | Definition 包 | Provider 实现包 | 直接 Consumer | 关键约束 / 备注 |
|-----------|--------------|----------------|--------------|----------------|
| `ctx.shell` | `shell` | `bash-local`, `bash-sandbox`, `pwsh-local` | `hooks-claude-code`, `hooks-codex`, `tool-bash`, `tool-pwsh`, `shell-env` | Bash executor seam；local spawns via `ctx.subprocess` |
| `ctx.subprocess` | `subprocess` | `subprocess-local`, `subprocess-ssh` | `bash-local`, `bash-sandbox`, `lsp-stdio`, `terminal-bash`, `subagent-acp`, `subagent-claude-code`, `subagent-codex` | 子进程管理 seam；进程树 ownership |
| `ctx.sandbox` | `sandbox` | `sandbox-local`, `sandbox-ssh` | `bash-sandbox`, `fs-sandbox`, `terminal-bash` | 进程隔离 seam；bwrap/Landlock/Seatbelt backend |
| `ctx.sandboxPolicy` | `sandbox-policy` | — | `bash-sandbox`, `fs-sandbox`, `terminal-bash` | 沙箱策略 home；配置驱动 |
| `ctx.terminals` | `terminal` | `terminal-bash` | `tool-terminal` | Persistent PTY session registry |
| `ctx.shellEnv` | `shell-env` | — | `tool-bash`, `tool-pwsh` | Managed bash env registry |

---

## 文件系统/存储缝

| `ctx` Key | Definition 包 | Provider 实现包 | 直接 Consumer | 关键约束 / 备注 |
|-----------|--------------|----------------|--------------|----------------|
| `ctx.fs` | `fs` | `fs-local`, `fs-sandbox`, `fs-ssh`, `fs-observation-policy` (event gate) | `tool-fs` | Filesystem provider seam；providers 共享执行世界 |
| `ctx.attachments` | `attachment` | `attachment-local` | `api-session-controller`, `tool-fs`, `llm-pi-ai`, `llm-deepseek` | Host 先提交接受的图片；provider adapters 解析 durable refs |
| `ctx.storage` | `storage` | `storage-json`, `storage-sqlite` | `storage-domain` | Backends 并行注册；domain forms mount on hub |
| `ctx.storageDomain` | `storage-domain` | — | `workspace` | 等待所有 backend 就绪后发布 domain facility |
| `ctx.spillStore` | `spill` | `spill-local`, `spill-policy` | — | Tool-result spill 存储 + 策略 |
| `ctx.fileReferences` | `file-reference` | `file-reference-local` | `api-session-controller` | Agent cwd 内 path-only completion；不读文件内容 |

---

## 凭证/授权/设置缝

| `ctx` Key | Definition 包 | Provider 实现包 | 直接 Consumer | 关键约束 / 备注 |
|-----------|--------------|----------------|--------------|----------------|
| `ctx.credentials` | `credentials` | `credentials-local` | `api-settings-controller`, `llm-deepseek`, `llm-pi-ai` | Config 携带 secret 引用；provider 所有值；每操作 resolve |
| `ctx.deepseekAccount` | `deepseek-account` | `deepseek-account-platform` | `api-account-controller`, `llm-deepseek` | Host 所有浏览器授权 + 本地凭证；UI 拿 state 不拿 token |
| `ctx.authorization` | `authorization` | — | `llm-pi-ai` | Flow 由知道如何获取凭证的插件注册；keyed by record |
| `ctx.settings` | `settings` | — | `api-settings-controller` | Volatile Config fields 从 active profile entries 投影 |
| `ctx.configEditor` | `config-editor` | — | `settings`, `agent-default-model` | 应用文件锁 + HMR queue 下持久化 profile config patches |

---

## 子代理/委托缝

| `ctx` Key | Definition 包 | Provider 实现包 | 直接 Consumer | 关键约束 / 备注 |
|-----------|--------------|----------------|--------------|----------------|
| `ctx.subagents` | `subagent` | `subagent-spawn-in-process`, `subagent-fork-in-process`, `subagent-dsh-sdk`, `subagent-acp`, `subagent-codex`, `subagent-claude-code` | `tool-ralph`, `tool-subagent`, `tool-subagent-control` | Provider registry contract + model-facing delegation tools |
| `ctx.subagentModelSelection` | `tool-subagent` | — | `tool-subagent` | 默认关闭的 settings namespace；delegation tools 采样 |

---

## 网络/浏览器/计算机使用缝

| `ctx` Key | Definition 包 | Provider 实现包 | 直接 Consumer | 关键约束 / 备注 |
|-----------|--------------|----------------|--------------|----------------|
| `ctx.web` | `web` | `web-search-exa`, `web-search-perplexity`, `web-search-deepseek`, `web-fetch-http` | `tool-web` | Web access provider registry |
| `ctx.browserUse` | `browser-use` | `experimental-browser-use-playwright-mcp`, `experimental-browser-use-chrome-devtools-mcp`, `experimental-browser-use-stagehand-native` | (provider-owned tools) | **One provider-owned name per service instance**；provider 独享 browser resources |
| `ctx.computerUse` | `computer-use` | `experimental-computer-use-cua-driver-mcp`, `experimental-computer-use-cua-driver-native` | (provider-owned tools) | **One provider-owned name per service instance**；无通用 action API |
| `ctx.mcpResources` | `mcp-resources` | `mcp-client` | `mcp-resources` | Connection-owned providers serve shared resource tools in calling agent scope |
| `ctx.webhookRuntime` | `webhook` | `webhook-github` | — | Webhook rule runtime |

---

## 技能/工作流/PTC/Compaction 缝

| `ctx` Key | Definition 包 | Provider 实现包 | 直接 Consumer | 关键约束 / 备注 |
|-----------|--------------|----------------|--------------|----------------|
| `ctx.skills` | `skill` | `sandbox-windows-acl`, `skill-badge`, `skill-filesystem`, `skill-office` | `tool-skill` | 合并 provider skill catalogs；tool-skill 渲染 session-prefix catalog |
| `ctx.workflowEngine` | `workflow` | — | `tool-ralph`, `tool-workflow` | Workflow script engine |
| `ctx.ptcRuntime` | `ptc-runtime` | `ptc-runtime-node`, `experimental-ptc-runtime-python` | `tools`, `workflow-ptc` | PTC execution seam |
| `ctx.compaction` | `compaction` | `compaction-basic` | (via loop) | Compaction seam；basic provider |
| `ctx.toolResultPruner` | `compaction-tool-result-pruner` | — | `compaction-basic` | Model-free tool-result pruning via replayable surface replacements |
| `ctx.tokenMeter` | `token-meter` | — | `compaction-basic` | Isolated per-session replay folds |

---

## 交互/反馈/目标/调度缝

| `ctx` Key | Definition 包 | Provider 实现包 | 直接 Consumer | 关键约束 / 备注 |
|-----------|--------------|----------------|--------------|----------------|
| `ctx.commands` | `commands` | — | — | Human command registry；无模型 turn 分发 |
| `ctx.userQuestions` | `user-questions` | — | `tool-ask-user` | UI front ends 提供 active human-answer provider |
| `ctx.approval` | `user-approval` | — | `acp`, `tool-bash`, `tools` | Approval seam |
| `ctx.permissionPresets` | `permission-presets` | — | — | Permission presets |
| `ctx.goals` | `goal` | — | — | Same-session goal domain |
| `ctx.schedule` | `schedule` | — | — | Host-owned scheduled follow-ups |
| `ctx.jobs` | `jobs` | `jobs-local` | `api-job-controller`, `tool-bash`, `tool-jobs`, `tool-pwsh`, `tool-terminal` | Background job registry |
| `ctx.messageFeedback` | `message-feedback` | — | — | Per-assistant-message feedback in canonical Session log |
| `ctx.sessionFeedback` | `command-feedback` | — | — | Session-level remark as log-only feedback/record event |

---

## 远程/桌面/Telemetry/实验缝

| `ctx` Key | Definition 包 | Provider 实现包 | 直接 Consumer | 关键约束 / 备注 |
|-----------|--------------|----------------|--------------|----------------|
| `ctx.connection` | `client-connection` | — | `api-gateway`, `host-frontend-static` | Browser auth + shared HTTP dispatch |
| `ctx.typert` | `typert-registry` | — | `typert-loader`, `api-gateway` | Runtime type registry |
| `ctx.typertGateway` | `api-gateway` | — | — | Generated Remote descriptors + live Cordis services |
| `ctx.otel` | `otel` | — | `host-product-telemetry-otel`, `session-telemetry-otel` | Shared OTel reporting channels |
| `ctx.productTelemetry` | `host-product-telemetry-otel` | — | — | OTLP/HTTP export；mount alone collects nothing |
| `ctx.sessionTelemetry` | `session-telemetry` | `session-telemetry-otel` | — | Capture/redact/handoff session records；output leaves process |
| `ctx.hmr` | `hmr` | — | `app-boot` | Module + exact config watchers |
| `ctx.pluginManager` | `plugin-manager` | — | `plugin-manager`, `ui-settings-plugin-inventory` | Profile package operations shared with CLI |
| `ctx.profileContext` | `app-boot` | — | `plugin-manager` | Launcher supplies data-only profile locations |
| `ctx.dynamicCordisRunner` | `cordis-host-runner` | — | `tool-cordis` | Dynamic Cordis package host runner |
| `ctx.cordisInspect` | `cordis-host-runner` | — | `tool-cordis` | Dynamic Cordis inspect registry |
| `ctx.worktrees` | `experimental-worktree` | `experimental-worktree` | `experimental-tool-worktree` | Explicit experimental creation from pinned commit |
| `ctx.workingDirectory` | `working-directory` | `working-directory` | `tool-working-directory`, `tool-fs`, `tool-bash`, `tool-pwsh`, `subagent`, `sdk-jsonrpc-server` | One Session projection owns effective execution directory |
| `ctx.directoryPicker` | `host-directory-picker` | `host-directory-picker-native`, `host-directory-picker-browse` | `api-workspace-controller` | Workspace-directory picking seam |

---

## 关键观察（读图指南）

1. **Provider 共享执行世界**：`fs-*` / `subprocess-*` / `sandbox-*` / `shell-*` / `terminal-*` 形成一个 provider cluster。把 `fs-local` 换成 `fs-sandbox`，Bash、PTY、LSP 全随之迁移，**无需 fork provider**。
2. **`ctx.tools` 是唯一的「工具注册表」**：所有 model-facing tools 都在 `ctx.tools` 注册；`schemas()` 显式 allowlist 字段（`output/execute/projectContent/finalizeContent/timeoutMs/isConcurrencySafe/presentCall/presentResult` 永不泄露到模型请求）。
3. **`ctx.llm` 只管 adapter 注册与 stream 调用**：loop 和 compaction 都调用 provider-neutral stream service；DeepSeek 特有扩展在 `ctx.deepseekLlmApiExtensions`（独立缝）。
4. **Subagent providers 差异极大**：从 in-process fork 到 ACP/Codex/Claude Code/SDK 远程委托，**统一接口 `ctx.subagents`**，Consumer 只管 `tool-subagent`。
4. **实验缝 = 无产品承诺**：`experimental-*` 缝随时可能变动/移除；生产环境勿直接依赖。
5. **每个缝的 Definition 包 = 单一事实来源**：找不到接口定义时，去 Definition 包的 `src/index.ts` 或 `src/types.ts`。

---

## 如何用这张表

| 场景 | 用法 |
|------|------|
| 新增 model provider | 看 `ctx.llm` 行 → 实现 `llm` 包的 adapter 接口 → 注册到 `ctx.llm` |
| 新增文件系统后端 | 看 `ctx.fs` 行 → 实现 `FileSystemProvider` 接口 → 注册到 `ctx.fs` |
| 换沙箱后端 | 看 `ctx.sandbox` / `ctx.subprocess` / `ctx.shell` 三行 → 整组换 provider |
| 理解「谁能调用谁」 | 看 **直接 Consumer** 列；间接依赖靠能力缝传递 |
| 审 PR 发现可疑注册 | 对照 Definition 包的接口签名；Provider 必须实现全部方法 |
| 写集成测试 | Mock Definition 接口；测 Consumer 行为；Provider 用 replay/本地实现 |

---

*生成时间：2026-10-14 | 来源：`docs/capability-seams.md` + 各包 README + Agent Notes*