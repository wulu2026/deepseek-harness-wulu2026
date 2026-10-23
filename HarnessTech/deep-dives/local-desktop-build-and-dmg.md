# Running Desktop Locally and Installing the macOS DMG

> Recorded: 2026-10-23 | Environment: Apple Silicon Mac, Node.js 24.19.0, pnpm 11.28.5 | Version: DeepSeek Harness Desktop 0.2.1-rc.2

## Outcome

The development app launched locally. The unsigned ARM64 DMG passed image verification, and the copied app launched from `~/Applications/DeepSeek Harness.app`. The DMG is at:

```text
apps/desktop/.desktop-build/targets/mac-arm64/unsigned-artifacts/deepseek-harness-0.2.1-rc.2-mac-arm64-unsigned.dmg
```

All seven repository artifact-build gates passed. The primary runtime smoke checks for Python, Node, pnpm, and Office document round trips passed. After installation, the main process, Renderer, and Desktop Host were confirmed running.

## Reproducible Steps

1. Install repository dependencies:

   ```sh
   pnpm install --frozen-lockfile
   ```

2. Build repository artifacts, then start the built development app:

   ```sh
   pnpm run build:artifacts
   pnpm run start:desktop
   ```

   First launch downloads Electron and prepares the target-specific Node, Python, pnpm, and Python wheels. Runtime preparation is followed by smoke checks. `dev:desktop` runs the artifact build, builds the Desktop shell, and launches the app.

3. Confirm the packaging version against the current product version, then build the local test DMG:

   ```sh
   pnpm run package:desktop:mac:arm64:unsigned
   ```

   This local unsigned mode needs no `.env.macos`, Apple account, certificate, or update-service configuration. The command builds, prepares the runtime, assembles the app, and runs smoke checks. A separate `prepare:desktop` step is not required.

4. Open the DMG in Finder and drag `DeepSeek Harness.app` to Applications. To install under the current user's home directory from Terminal:

   ```sh
   hdiutil attach -readonly -nobrowse "apps/desktop/.desktop-build/targets/mac-arm64/unsigned-artifacts/deepseek-harness-0.2.1-rc.2-mac-arm64-unsigned.dmg"
   ditto "/Volumes/<DMG volume name>/DeepSeek Harness.app" "$HOME/Applications/DeepSeek Harness.app"
   hdiutil detach /dev/diskN
   open "$HOME/Applications/DeepSeek Harness.app"
   ```

   Replace `<DMG volume name>` with the volume printed by `hdiutil attach`, and `/dev/diskN` with the actual device. Installing to the current user's `~/Applications` does not require administrator privileges.

## Observations

- `pnpm install --filter @deepseek-ai/dsh-desktop...` installs Desktop and its workspace dependencies, but not every package needed by the repository-wide artifact build. Starting from that partial install can fail on missing compiled workspace `lib` files; `build:artifacts` also reports missing ACP, HMR, and other dependencies. Use `pnpm install --frozen-lockfile` for the complete Desktop build.
- First-time Electron and primary-runtime preparation downloads several large archives. Downloads are cached under `apps/desktop/.desktop-build` and can be reused by later runs and packaging.
- Development uses `apps/desktop/.desktop-build/development/home`; the installed app uses the normal Harness home and `$DSH_HOME/profiles/desktop`. Their data and plugin directories are separate; installing the DMG does not migrate development data.
- Development logs reported that the Renderer DevTools port `9222` was occupied, but the Desktop Host still became ready. Set `DSH_DESKTOP_RENDERER_DEBUG_PORT` to another port or `DSH_DESKTOP_OPEN_DEVTOOLS=0` to disable automatic DevTools opening.
- This DMG is for local testing, not release: it skips Developer ID signing and Apple notarization, has no release update configuration, and cannot be uploaded as an update package. macOS may require approval under System Settings → Privacy & Security on first open.
- Configure the API key in the app's welcome UI. Do not put credentials in this note, build commands, or terminal logs.

## References

- [Desktop development flow](../../apps/desktop/README.zh.md#develop)
- [Local unsigned macOS DMG guide](../../apps/desktop/packaging/README.zh.md#local-macos-dmg-without-release-signing)
- [Build and runtime preparation in the development launcher](../../apps/desktop/scripts/dev.ts#L94-L124)
- [Primary runtime assembly and smoke checks](../../apps/desktop/scripts/prepare-primary-runtime.ts)