# Windows 沙箱 ACL 排障：grantWrite 失败

> 定位：记录本机（Windows）上 dsh 沙箱在工作区初始化失败的诊断与修复全过程，作为信任边界图 Windows ACL 一节的实证案例。

## 背景

工作区 `D:\GitHub\wulu2026\deepseek-harness-wulu2026` 上，任何工具调用在沙箱初始化阶段直接失败：

```
SetNamedSecurityInfoW failed (Win32 5): grantWrite(D:\GitHub\wulu2026\deepseek-harness-wulu2026)
```

失败发生在工具真正运行之前，连只读的 `working_directory` 都无法通过 `workspace-write` 沙箱执行。

## 结论

根因是**工作区根目录对当前登录账户缺少 WriteOwner 权限**，导致 dsh 无法给沙箱主体下发写权限。修复是给该目录补一条当前账户的完全控制 ACE（文件内容、所有者都不变），修复后沙箱恢复正常。

## 证据链

- dsh 的 Windows 沙箱在每次运行前用 `grantWrite` 给受限主体下发写权限，实现在 `packages/sandbox/sandbox-windows-acl/src/acl.ts`；它需要目标目录具备 `WRITE_DAC` / `WRITE_OWNER`。
- 诊断脚本（技能 `diagnose-windows-sandbox-acl`）读取目录及每一级祖先，逐项核对有效 `WRITE_DAC` / `WRITE_OWNER`，并处理 AppContainer 包 ACE（`S-1-15-2-*`）。
- 本次诊断 `RECAP` 的 verdict 为 `PRECONDITION`：`writeDac: true`、`writeOwner: false`；脚本对该目录执行 `grant_dacl`，补上 `S-1-5-21-...-1001`（当前账户）的 FullControl，验证记录显示 `before.writeOwner=false → after.writeOwner=true`。
- 修复后重跑原本失败的操作（`workspace-write` 沙箱下的读写探针），全部通过；`git status` 保持干净。

## 复验方式

1. 确认当前账户与所有者：`whoami`、`(Get-Acl <路径>).Owner`；
2. 核对目录是否具备 `WRITE_DAC` / `WRITE_OWNER`；
3. 在 `workspace-write` 沙箱下重跑一个写探针（如写并删除一个临时文件），不再报 `grantWrite` 即视为通过；
4. 诊断报告与回滚命令保存在 `D:\GitHub\wulu2026\dsh-sandbox-acl-report\`。

## 关联

- 信任边界总图：`atlas/trust-boundary-map.md` 的「沙箱 / Windows ACL」一节。

*基于 dsh 0.2.2-alpha.2（2026-10-29）*
