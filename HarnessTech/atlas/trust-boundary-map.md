# Trust Boundary Map — 信任边界与权限矩阵

> 定位：哪里可信、哪里不可信；Sandbox / subprocess / SSH / terminal / network/browser/Computer Use / LiveShare ceilings / Windows ACL / 权限矩阵 / 最小权限清单。 SSOT: docs/architecture.md, docs/subsystems/sandbox.md, ssh.md, terminal.md, liveshare.md, computer-use.md, browser-use.md。Done boundary: see anchor doc sections referenced below.

## 1. 总体信任模型

- DSH does not assume untrusted code safe after plugin changes; new behavior attaches to documented extension points confined by privilege.
- User content, model output, and Remote-assembled structures are treated as untrusted when logged; secrets never persisted in events.
- Security boundary lives at execution (subprocess / fs / sandbox / accounts), not at seam authority; seams are swappable capability contracts.
- Telemetry / SDK sends output outside the process; Account access stays Host-local (tokens not in UI), Remote access decides through business-registered role-based policies.

## 2. 沙箱

- Provider seam ctx.sandbox; File-effect modes via ctx.sandboxPolicy; enforcement providers: bwrap (Linux) / Landlock (Linux) / Seatbelt (macOS) / Windows integration + ACLs. Active ctx.sandboxPolicy read by both bash-sandbox and fs-sandbox (single root).
- Modes: read-only / workspace-write (default) / danger-full-access; escalation happens through tools/pwsh/pwsh run sandbox_permissions field, and approval.
- Windows ACL diagnostic: diagnose-windows-sandbox-acl skill probes WRITE_DAC/WRITE_OWNER and AppContainer ACEs (S-1-15-2-*) on target root & its ancestors.
- Deep dive: deep-dives/windows-sandbox-acl.md [actual case - root lacked WriteOwner; fix added single FullControl ACE for current user, no changes to files/owners; verified restore-available].
```yaml
# cordis.yml 常见配置
plugins:
  # agent-default sandbox via sandbox-policy.
  - name: tool-bash
    config:
      sandbox-mode: workspace-write
```

## 3. 子进程管理

- Fully-explicit SubprocessSpawnSpec (offset reader, unclassified Outcome, managed DSH_* env vocabulary); shell taps through scoped subprocess spawn registration.
- Tools invoke ctx.sandbox.wrap before spawning; process-tree ownership stays in ctx.subprocess (Local/SSH) with kill escalation, stdio dispositions, and CWD separation.
- Bash executors + PTY (terminal) + LSP hosts all share ctx.subprocess.

## 4. SSH 执行

- ctx.ssh owns authenticated OpenSSH connection, helper identity, independent program streams, disconnect cleanup; paired remote providers: fs-ssh / subprocess-ssh / sandbox-ssh.
- Supports POSIX SSH connection + remote fs, subprocess, sandbox [docs/subsystems/ssh.md].

## 5. 持久终端

- terminal seam: bounded screen reads + exact-agent session identity + backend lifecycle.
- `terminal-bash` pairs with ctx.subprocess + ctx.sandbox; tool-terminal owns model-facing micro-API; profiles perhaps default shell resolution.

## 6. 网络 / 浏览器 / 计算机使用

- ctx.web seam search/fetch; providers directory curated (exa, perplexity, deepseek, web-fetch-http); web-search empty include URL allowed.
- Browser use: 3 potential providers (playwright-mcp, chrome-devtools-mcp, stagehand-native); per-live-Session ownership; common action API none — provider owns tools.
- Computer use (Cua): 2 native/MCP drivers; opt-in provider; ACL consent workflow from 2026-09-26-cua-application-consent; bundle ID consent updated 2026-10-25-cua-bundle-id-consent; profile storage 2026-10-19-cua-profile-consent-storage. CUA access granted only for chosen applications.
- MCP resources seam: connection-owned providers serve shared resource tools in calling agent scope.
- Webhook dispatches trusted registrations; non-null result becomes an ordinary Session.

## 7. 权限矩阵汇总

| Surface | Read | Write | Execute | Notes |
|---|---|---|---|---|
| Session log | read most | log-only events | no | sealed V migrations |
| tool-bash (sandboxed) | confined | confined | argv confined | shared workspace root |
| tool-fs | confined | confined | no | containment + lstat recheck |
| tool-pwsh / terminals | confined read/write per pwsh-local/pwsh | yes (Host write permissions) | yes | no remote confinement by default |
| settings/credentials | redacted view | write-only storage | transform-only offload | refs only, values server-side |
| shared Session viewer (LiveShare) | view/read tools (`read`, `read_image`, `glob`, `grep`, `present`, `todo_write`, `skill`, `web_search`, `web_fetch`) | bounded edit/write only in write tier | none in view; writes only provided tools | view spies read sandbox; write adds bounded edit/write; allowsFork orthogonal |
| LiveShare fork (child) | ceiling comparable | restricted write | path-bearing confined replacement; bash/pwsh/cua/plugin_manager/schedule all refused | each child records share/ boundary |
| product telemetry (session-telemetry) | redacted export | handoffs output leave the process | none | opt-in only; mounting alone collects nothing |

## 8. 配置最小权限的实操清单

- sandbox-mode: workspace-write for ordinary; escalate to danger-full-access only with sandbox_permissions field and recorded justification.
- Validate gap on icacls / mismatched roots: ensure `sandbox-policy` read by both bash-sandbox and fs-sandbox to avoid divergent roots.
- Working-directory protections preserve project identity/write root/process dirs while switching execution directory (see [docs/subsystems/working-directory.md]).
- LiveShare: purpose-built routes, viewer never gets tools beyond tier; coating inspects destination per turn; narrowing write-infused share reduces layer when last write gone.
- CUA: only explicitly user-consented apps, executed through native/driver-mcp selection, cross-cutting permission-presets bundle approval_policy plus sandbox-mode and audit event.
- Credentials always via refs and per-operation resolution—even after rotate applies to next request.

## 9. LiveShare 天花板（additional out-of-the-box）

From [docs/subsystems/liveshare.md]:
- ViewerSessionMode has two tiers, both name a sandbox: `view` (read-only sandbox in granted workspace and reads; no writes) and `write` (bounded writable sandbox inside the same workspace two new tools plus sandboxed `edit` and `write`). Forking isn't tier-variant; `allowsFork` orthogonal and attachments allow irrespective of tier or fork switch.
- Fork ceilings: READ_ONLY_FORK_CEILING permits view surface list; WRITE_FORK_CEILING adds host's bounded edit/write. Path-bearing tool gets confined replacements; `bash/pwsh/cua/plugin_manager/schedule_*` and unlisted rejected.
- Source Session enforcement: `installSourceSessionAccess` registers confined replacement for every view-surface tool and bounded edit/write if any share allows write. `agent/pre-step` records viewer admission per turn (Host memory), replacements read it; turn owner keeps own tools. Source layer releases when no over-session share left (under Agent disposal).
- Revocation/withdrawal: share removed revokes children + stops source turn; child guard rechecks share; write->view downgrade rejects future writes without granting new tools; not promise immediate running-turn cancel.
- Retry identity pinned to viewer/share/source/operation-id with bound boundary; durable child id from owner minting.

- Source details: [docs/subsystems/liveshare.md#define-enabling-and-visibility] through Forks/retries/constraints/constraining — read on demand.

## 10. 关键 Agent Notes / 常见误区

- Agent team + LiveShare security postures in 2026-10-13/... Agent Notes and skill pages; always read latest Agent Note linked in each subsystem's notes.
- Misread: ctx remote projection expects UI roles correctly; sandboxes may stay active while tiers narrow.
- Pitfalls: assuming Web search credentials reuse; under-cloning ACL high-integrity levels; neglecting CUA permission activation.

## 11. 审计清单（安全 Review 时逐项核对）

1. File surfaces fully confined (Tool + paths + containment + recheck)?
2. Process spawns intercepted by sandboxPolicy; no get-out jail route?
3. Terminal / SSH accessible only via owning agent/ session context?
4. CUA & Browser Use capabilities configured through opt-in plugin at all times?
5. LiveShare active tier = minimal and each allowed tool names explicit?
6. Remote access for non-owner Peer covered by business policies.
7. Authenticated credentials refs only; no values exposed to UI.
8. Agents reporting workspace changes have concrete turn range.


*基于 dsh 0.2.2-alpha.2（2026-10-29）*
