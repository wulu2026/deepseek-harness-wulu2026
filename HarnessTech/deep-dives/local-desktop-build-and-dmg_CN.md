# 本机运行 Desktop 并安装 macOS DMG

> 记录时间：2026-10-23 | 环境：Apple Silicon Mac，Node.js 24.19.0，pnpm 11.28.5 | 版本：DeepSeek Harness Desktop 0.2.1-rc.2

## 结果

本机开发版启动成功；本地未签名 ARM64 DMG 通过镜像校验，应用复制到 `~/Applications/DeepSeek Harness.app` 后成功启动。DMG 位于：

```text
apps/desktop/.desktop-build/targets/mac-arm64/unsigned-artifacts/deepseek-harness-0.2.1-rc.2-mac-arm64-unsigned.dmg
```

仓库 artifacts 构建的 7 个 gate 全部通过。Primary runtime 的 Python、Node、pnpm 与 Office 文档往返 smoke 检查通过。安装后确认主进程、Renderer 和 Desktop Host 均在运行。

## 可复现流程

1. 安装仓库依赖：

   ```sh
   pnpm install --frozen-lockfile
   ```

2. 构建 Desktop 所需的仓库 artifacts，然后启动已构建的开发版：

   ```sh
   pnpm run build:artifacts
   pnpm run start:desktop
   ```

   首次启动会下载 Electron，并准备目标专用的 Node、Python、pnpm 和 Python wheels；运行时准备完成后会执行 smoke 检查。`dev:desktop` 会先运行 artifacts 构建，再构建 Desktop 壳并启动。

3. 按当前产品版本确认打包版本后，生成本机测试 DMG：

   ```sh
   pnpm run package:desktop:mac:arm64:unsigned
   ```

   该本地未签名模式不需要 `.env.macos`、Apple 账号、证书或更新服务配置。命令会完成构建、运行时准备、组装和 smoke 检查；不用预先单独运行 `prepare:desktop`。

4. 在 Finder 中打开 DMG，将 `DeepSeek Harness.app` 拖到 Applications。也可安装到当前用户目录：

   ```sh
   hdiutil attach -readonly -nobrowse "apps/desktop/.desktop-build/targets/mac-arm64/unsigned-artifacts/deepseek-harness-0.2.1-rc.2-mac-arm64-unsigned.dmg"
   ditto "/Volumes/<DMG 卷名>/DeepSeek Harness.app" "$HOME/Applications/DeepSeek Harness.app"
   hdiutil detach /dev/diskN
   open "$HOME/Applications/DeepSeek Harness.app"
   ```

   用 `hdiutil attach` 输出中的卷名替换 `<DMG 卷名>`，并用实际设备名替换 `/dev/diskN`。当前用户的 `~/Applications` 不需要管理员权限。

## 实测注意事项

- `pnpm install --filter @deepseek-ai/dsh-desktop...` 能安装 Desktop 及其 workspace 依赖，但不包含全仓 artifacts 编译所需的全部包。直接用它启动会因缺少已编译的 workspace `lib` 文件而失败，全仓 `build:artifacts` 也会报缺少 ACP、HMR 等依赖。完整桌面构建使用 `pnpm install --frozen-lockfile`。
- 首次准备 Electron 和 primary runtime 需要下载多个较大的归档。下载内容会进入 `apps/desktop/.desktop-build`，后续运行和打包可复用缓存。
- 开发版默认使用 `apps/desktop/.desktop-build/development/home`；安装版使用正常的 Harness home 和 `$DSH_HOME/profiles/desktop`。两者的数据与插件目录分开，不会因为安装 DMG 自动迁移开发数据。
- 开发启动日志曾提示 Renderer DevTools 端口 `9222` 已占用，但 Desktop Host 仍成功就绪。可通过 `DSH_DESKTOP_RENDERER_DEBUG_PORT` 指定其他端口，或设置 `DSH_DESKTOP_OPEN_DEVTOOLS=0` 关闭自动打开 DevTools。
- 该 DMG 是本机测试产物，不是可发布版本：它跳过 Developer ID 签名和 Apple 公证，不含发布更新配置，也不能上传为更新包。macOS 可能要求在“系统设置 → 隐私与安全性”批准首次打开。
- 欢迎界面的 API Key 由使用者在应用中配置；不要把密钥写入本记录、构建命令或终端日志。

## 依据

- [Desktop 开发流程](../../apps/desktop/README.zh.md#develop)
- [本地未签名 macOS DMG 指南](../../apps/desktop/packaging/README.zh.md#local-macos-dmg-without-release-signing)
- [开发启动器中的构建与运行时准备顺序](../../apps/desktop/scripts/dev.ts#L94-L124)
- [Primary runtime 组装与 smoke 检查](../../apps/desktop/scripts/prepare-primary-runtime.ts)