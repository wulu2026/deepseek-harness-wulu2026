# Trust Boundary Map — 信任边界与权限矩阵

> **来源**：`packages/sandbox/`、`packages/subprocess/`、`packages/ssh/`、`packages/terminal/`、`packages/shell/`、相关 Agent Notes、`docs/architecture.md`。
> **范围**：沙箱/子进程/SSH/Terminal/网络的信任边界、权限矩阵、逃逸面分析。

---

## 1. 总体信任模型

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         HOST PROCESS (Trusted)                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Cordis Context (ctx)                                               │   │
│  │  ├─ ctx.agents, ctx.sessions, ctx.tools, ctx.systemPrompt, ...     │   │
│  │  ├─ ctx.llm (adapter registry)                                      │   │
│  │  └─ ctx.sessionPersistence (durable storage)                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        ▼                          ▼                          ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│  Local Shell  │         │  Sandboxed    │         │  Remote SSH   │
│  (bash-local) │         │  (bwrap/      │         │  (ssh/)       │
│               │         │   Landlock/   │         │               │
│  Trusted:     │         │   Seatbelt)   │         │  Trusted:     │
│  - Full FS    │         │               │         │  - Remote FS  │
│  - Net access │         │  Untrusted:   │         │  - Remote cmd │
│  - Process    │         │  - FS: scoped │         │  Untrusted:   │
│    spawn      │         │    roots only │         │  - Remote net │
└───────────────┘         │  - Process:   │         └───────────────┘
                          │    confined   │
                          └───────────────┘
```

### 核心原则：
- **Host 进程 = 完全受信**（持有用户凭证、完整文件系统、网络、进程控制）。
- **沙箱/子进程/SSH 会话 = 部分受信/非受信**——通过 **Capability Seams** 最小化权限。
- **边界在配置中显式声明**（`ctx.sandboxPolicy`、`ctx.shellEnv`、`ctx.permissionPresets`），而非硬编码。

---

## 2. 沙箱

### 2.1 Seam: `ctx.sandbox` (Definition: `packages/sandbox/sandbox`)

| Backend | 实现包 | 隔离机制 | 适用平台 | 逃逸面 |
|---------|--------|----------|----------|--------|
| `sandbox-local` | `packages/sandbox/sandbox-local` | **bwrap** (bubblewrap) + **Landlock** (Linux 5.13+) | Linux | Landlock 规则绕过、bwrap namespace 泄露 |
| `sandbox-ssh` | `packages/sandbox/sandbox-ssh` | Remote host 上的同等机制 | Linux (remote) | SSH 通道劫持、远程 bwrap 规则绕过 |
| *(Windows)* | `packages/sandbox/sandbox-windows-acl` | **Windows ACL** + Job Objects | Windows | ACL 误配、Job Object 逃逸 |

### 2.2 策略配置 (`ctx.sandboxPolicy`)

```yaml
# cordis.yml 示例
ctx.sandboxPolicy:
  defaultProfile: "restricted"
  profiles:
    restricted:
      readRoots: ["/home/user/project", "/tmp/dsh-scratch"]
      writeRoots: ["/tmp/dsh-scratch"]
      network: false
      process:
        maxProcs: 32
        allowPtrace: false
    permissive:
      readRoots: ["/home/user"]
      writeRoots: ["/home/user/project"]
      network: true
```

### 策略执行点：
- `bash-sandbox` → `ctx.shell` backend → spawn 前 wrap argv → `ctx.sandbox` backend `wrapCommand()`。
- `fs-sandbox` → `ctx.fs` provider → 每次操作前校验路径在 `readRoots`/`writeRoots` 内。
- `terminal-bash` → `ctx.terminals` backend → PTY spawn 前 wrap。

### 2.3 逃逸面清单

| 向量 | 缓解 | 剩余风险 |
|------|------|----------|
| 文件系统遍历 | `readRoots`/`writeRoots` 绝对路径前缀匹配 + `realpath` 解析 | Symlink 竞争、mount namespace 泄露 |
| 网络访问 | `network: false` → 无网络 namespace / 禁用 socket | 通过父进程 fd 传递、unix domain socket 泄露 |
| 进程生成 | `maxProcs`、禁用 `ptrace`、seccomp 过滤 | `clone(CLONE_NEWUSER)` 绕过、setuid binary |
| 环境变量 | 显式 allowlist；敏感变量 (`*_KEY`、`*_TOKEN`) 自动剥离 | 间接泄露（如 `HOME` 推导配置路径） |

---

## 3. 子进程管理

### 3.1 Seam: `ctx.subprocess` (Definition: `packages/subprocess/subprocess`)

| Provider | 实现包 | 用途 | 信任级别 |
|----------|--------|------|----------|
| `subprocess-local` | `packages/subprocess/subprocess-local` | 本地进程树管理 | Trusted (Host 同权) |
| `subprocess-ssh` | `packages/subprocess/subprocess-ssh` | 远程主机进程管理 | Partial (依赖 SSH 通道) |

### 3.2 执行流

```
tool-bash.execute()
    │
    ▼
ctx.shell.execute() (bash-local / bash-sandbox / pwsh-local)
    │
    ├─ bash-local  →  ctx.subprocess.spawn()  →  subprocess-local (本地 child_process)
    └─ bash-sandbox →  ctx.sandbox.wrapCommand() → ctx.subprocess.spawn() → sandbox-local
```

### 关键不变量：
- **`ctx.subprocess` 不直接暴露 `child_process` API**——Consumer 忨须通过 `ctx.shell` 或 `ctx.terminals` 等更高层 seam。
- **`subprocess-local` 仅供 `bash-local`、`lsp-stdio`、`terminal-bash`、subagent providers 使用**——不直接给 model-facing tools。
- **SSH 子进程**：`subprocess-ssh` 复用 `ctx.ssh` 连接；权限受远程主机 `sudo`/`ssh config` 约束。

---

## 4. SSH 执行

### 4.1 Seam Cluster: `ctx.ssh` + `ctx.fs` + `ctx.subprocess` + `ctx.sandbox`

| Seam | Provider | 说明 |
|------|----------|------|
| `ctx.ssh` | `packages/ssh/ssh` | POSIX SSH 连接所有者；密钥由 `ctx.credentials` 解析 |
| `ctx.fs` | `packages/fs/fs-ssh` | 远程文件系统（SFTP）；受 `ctx.sandboxPolicy` 约束 |
| `ctx.subprocess` | `packages/subprocess/subprocess-ssh` | 远程命令执行 |
| `ctx.sandbox` | `packages/sandbox/sandbox-ssh` | 远程沙箱（需远程安装 bwrap/Landlock） |

### 4.2 信任边界

```
Local Host (Trusted)
    │ SSH connection (encrypted, authenticated)
    ▼
Remote Host (Semi-Trusted)
    ├─ Remote FS: scoped to remote readRoots/writeRoots
    ├─ Remote Shell: scoped to remote sandbox policy
    └─ Remote Net: policy-controlled
```

### 凭证流转：
- `ctx.credentials` (local) → `ctx.deepseekAccount` / `ctx.authorization` → SSH key reference。
- **Key material never leaves `ctx.credentials` provider**——`ctx.ssh` 仅持有 reference，连接时由 provider resolve。

---

## 5. 持久终端

### 5.1 Seam: `ctx.terminals` (Definition: `packages/terminal/terminal`)

| Provider | 实现包 | 后端 |
|----------|--------|------|
| `terminal-bash` | `packages/terminal/terminal-bash` | PTY + `bash-local` 或 `bash-sandbox` |

### 5.2 会话所有权模型

```ts
// 终端会话创建
const term = await ctx.terminals.create({
  owner: agent.id,           // 绑定到具体 Agent
  shell: 'bash',
  cwd: '/project',
  cols: 120, rows: 40
})
```

### 权限传递：
- Terminal 继承创建时 Agent 的 `ctx.sandboxPolicy` profile。
- `owner` 字段用于 **归属审计**——仅 owner 可 `write`/`resize`/`close`。
- PTY 数据流：`terminal-bash` → `ctx.subprocess` (或沙箱) → OS PTY。

### 5.3 逃逸面

| 向量 | 缓解 |
|------|------|
| PTY 注入 (恶意转义序列) | `terminal-bash` 输入过滤 + `cols/rows` 限制 |
| 会话劫持 | `owner` 校验 + `ctx.approval` 对敏感操作要求人工确认 |
| 资源耗尽 | `maxProcs`、输出缓冲区上限、空闲超时回收 |

---

## 6. 网络/浏览器/计算机使用

### 6.1 Web Access (`ctx.web`)

| Provider | 网络权限 | 认证 |
|----------|----------|------|
| `web-search-exa` | HTTPS only | API key via `ctx.credentials` |
| `web-search-perplexity` | HTTPS only | API key via `ctx.credentials` |
| `web-search-deepseek` | HTTPS only | `ctx.deepseekAccount` |
| `web-fetch-http` | 配置 `allowDomains`/`denyDomains` | 无/自定义 header |

### 策略：
`ctx.web` seam **不直接暴露 TCP/UDP**——Consumer 只能通过注册的 provider（搜索/抓取）间接访问网络。

### 6.2 Browser Use (`ctx.browserUse`)

- **One provider-owned name per service instance**。
- Provider **独享 browser resources**（Playwright/Chrome DevTools/Stagehand）。
- **Shared service 无 browser operation API**——工具由 provider 自行注册。
- 逃逸面：Browser sandbox 逃逸、下载文件写入非预期路径、Cookie/存储泄露。

### 6.3 Computer Use (`ctx.computerUse`)

- **One provider-owned name per service instance**。
- Provider 独享 **模型工具**（点击、输入、截图等）。
- **无通用 action API、无运行时选择、无 Session workflow lock**。
- 逃逸面：桌面级控制（鼠标/键盘/屏幕）、文件系统全读写、进程生成。

---

## 7. 权限矩阵汇总

| Capability | Local Shell | Sandboxed Shell | SSH Shell | Terminal | Web Search | Browser Use | Computer Use |
|------------|-------------|-----------------|-----------|----------|------------|-------------|--------------|
| **文件系统读** | 全盘 | `readRoots` | 远程 `readRoots` | 继承 owner | 无 | Provider 决定 | 全盘 (Provider) |
| **文件系统写** | 全盘 | `writeRoots` | 远程 `writeRoots` | 继承 owner | 无 | Provider 决定 | 全盘 (Provider) |
| **网络访问** | 是 | `network: false/true` | 远程策略 | 继承 owner | 仅 HTTPS 到允许域 | 仅允许域 | Provider 决定 |
| **进程生成** | 是 | 受限 (`maxProcs`, no ptrace) | 远程受限 | 继承 owner | 无 | Provider 决定 | 是 (Provider) |
| **凭证访问** | 通过 `ctx.credentials` resolve | 同上 | 通过 SSH key reference | 同上 | API key resolve | OAuth/cookie | 无直接访问 |
| **用户交互** | 无 | 无 | 无 | PTY I/O | 无 | 视觉/输入模拟 | 完整桌面控制 |
| **审计日志** | `session/event` + tool calls | 同上 | 同上 + SSH 审计 | `terminal/*` events | `tool/call` + `tool/result` | Provider 事件 | Provider 事件 |

---

## 8. 配置最小权限的实操清单

| 场景 | 推荐配置 |
|------|----------|
| **本地开发助手** | `bash-local` + `fs-local` + `web-fetch-http` (allowDomains: 文档站点) |
| **CI/CD 运行器** | `bash-sandbox` (restricted) + `fs-sandbox` (writeRoots: artifacts) + `network: false` |
| **远程服务器运维** | `ssh` + `fs-ssh` (readRoots: /etc, writeRoots: /tmp) + `bash-sandbox` (remote) |
| **非受信代码执行** | `bash-sandbox` (restricted, network: false) + `fs-sandbox` (writeRoots: 仅沙箱临时目录) + `terminal-bash` (owner=隔离 agent) |
| **浏览器自动化** | `browser-use` (playwright-mcp) + 专用 browser profile + 下载目录限制在沙箱内 |
| **桌面自动化** | `computer-use` (cua-driver-native) + 虚拟显示器 + 网络隔离 |

---

## 9. 关键 Agent Notes（决策记录）

| 标题 | 日期 | 关键结论 |
|------|------|----------|
| Handle-based Session Persistence | 2026-08-27 | 沙箱/子进程/SSH 共享执行世界；provider swap 整组迁移 |
| Capability Seams | 2026-06-13 | Seam 三角色完整性；沙箱为独立 seam |
| Parallel Tool Call Execution | 2026-07-10 | `isConcurrencySafe` opt-in；共享状态必须容忍并发 |

---

## 10. 常见误区与避坑指南

| 误区 | 事实 |
|------|------|
| "沙箱能完全隔离" | **只能最小化权限**；Landlock/seccomp/bwrap 有已知绕过；防御纵深需 OS 级加固 |
| "SSH 远程执行等同本地" | **信任级别不同**；远程主机可能被入侵；凭证仅为 reference，不缓存明文 |
| "Terminal 只是个 PTY" | **有所有权模型**；`owner` 绑定 Agent；需 `ctx.approval` 保护敏感操作 |
| "Web search 就是 curl" | **Provider 抽象**；API key 走 `ctx.credentials`；域名白名单可配置 |
| "Computer use 只是个工具" | **完全桌面控制**；仅在完全隔离环境（VM/容器）运行；生产环境慎用 |

---

## 11. 审计清单（安全 Review 时逐项核对）

- [ ] 每个 `ctx.sandbox` backend 是否有对应的 `ctx.sandboxPolicy` profile？
- [ ] `bash-sandbox` / `fs-sandbox` / `terminal-bash` 是否都显式声明了使用的 policy profile？
- [ ] SSH 连接是否使用 `ctx.credentials` reference 而非明文密钥？
- [ ] `ctx.web` provider 的 `allowDomains`/`denyDomains` 是否最小化？
- [ ] `browser-use` / `computer-use` provider 是否在专用隔离环境运行？
- [ ] 所有 model-facing tools 的 `execute` 是否正确 forward `exec.signal`（协作式取消）？
- [ ] `ctx.approval` 是否对敏感操作（写入敏感路径、网络访问、进程生成）要求人工确认？
- [ ] Session 日志是否记录了所有权限敏感操作的 `tool/call` + `tool/result`（含 `error`/`meta`）？

---

*生成时间：2026-10-14 | 来源：`packages/sandbox/`、`packages/subprocess/`、`packages/ssh/`、`packages/terminal/`、`packages/shell/`、`docs/architecture.md`、相关 Agent Notes*