# Plugin Authoring —— 从 0 到发布一个插件

> **定位**：怎么动手发布一个能被社区用到的插件，并最终带上 dsh-plugin 标签被发现。Bridge with docs/cookbook/adding-a-package.md and adding-a-tool.md; pair with capability-seam-map.md for seam choice.

## 0. 起点

- 读 HarnessTech/atlas/capability-seam-map.md 选定一个 gap（Provider-Consumer mismatch / a seam where yourself wrong flow).
- 基于 official profile clone (`--profile` crypto directory patches). Copy from `cp -r packages/bundle/profiles/headless packages/bundle/profiles/my-startup` if working fork local
- isolate with same-workspace dsh (Personalize as needed).

## 1. 从 profile + bundle 开始

- Profile: named composition, lists stacked bundles, out-of-tree plugins, user's `cordis.patch.yml`.
- Bundle: distribution of Cordis config rows + code; plugins listed with explicit package `dependencies` in raw or bundled cardis.yml.
- Add plugins under `cordis-entry` formats; ensure `verify-cordis-config` dependency proof.

## 2. 范式：Definition / Provider / Consumer

Each capability seam must have 3 roles (Service Definition, Service Provider, Consumer) — see capability-seam-map.md.
- 以 Definition package owns `ctx.<key>` and vocab types (interface/class, never TS interface-as-service).
- Provider(s) implement and register (via ctx.effect(() => inject an impl)).
- Consumer tool package injects service and exposes model-facing tool + schema → `ctx.tools`.
- One package may combine roles if one concern (e.g. dsh-user-approval).

## 3. 写插件代码

- New packages follow `scripts/gen` — see cookbook adding-a-package.md (registry UI/persistent volume config).
- A model-facing tool: ctx.tools.register + schema; updates ctx.systemPrompt assembly automatically.
- Emit SessionEvent extensions if model-visible; log durable fact correctly.
- UI presentation for tool cards is pure Host presenter / Web derives from persisted result (see adding-a-tool.md and [dsh code review guideline]); plan state up front.
- Use case other surfaces (settings / remote / feedback) from existing package scaffolds.

## 4. 配置 / 允许

- Policy Options exposed via validated Config fields (not hard-coded); use agent/settings layer if applicable (ctx.settings).
- Contributions sync by HMR; either rely on watcher or re-run.
- Config example for disintegrated composition: patch existing via `--patch` for testing.

## 5. 测试与质量

- At minimum local unit test + snapshot for every changed model/user-visible output (dsh snapshot add test).
- Run `pnpm run test` + `pnpm run typecheck` + docs (if docs changed via doc-sync).
- Use `pnpm run test:expected` only for owner-local process expectations within own test scope.
Cool shadow integration? observations in agent team use Project to fix.

## 6. 分享 / 可被发现

- Publish your repo to GitHub + apply topic `dsh-plugin` [README.md community section].
- Version semantics: declare `@deepseek-ai/dsh-*` peer dependencies (suffix / exact) to user installs.
- Note installation expectation: users run `pnpm dsh plugin` add or bundle composition row under profile config if out-of-tree based (documented in plugin-manager).
- Publish how-to / about your plugin (see community-engagement.md).

## 7. 常见 pitfalls

- Cross-process tools spawned on another machine must use ctx.subprocess + sandbox correctly rather than direct child_process spawn without confinement.
- Can't validate on a wrong aggregate; verify aggregate registration correctly (both host/client as applicable).
- Cordis config raw YAML requires string keys controlling HMR; mistakes cause runtime ambiguity and devastating parse behavior.
- Adding `ctx.*` service without producer causes integration fail (service not resolution), especially remotely-scoped consumers via RPC.
- All model-visible output reproduced in Session events (log).


*基于 dsh 0.2.2-alpha.2（2026-10-29）*
