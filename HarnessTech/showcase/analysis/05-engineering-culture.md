# 05 门禁即文化：330 个脚本如何守住一个仓库

> 核心命题：dsh 把「工程品味」编译进了 CI。当代码生产变得越来越便宜，这个仓库示范了验证侧该怎么跟上。

## 规模

`scripts/` 下 330 个顶层 TypeScript 文件，绝大多数是门禁（verify-*）与生成器。统一调度入口是 `run-gates.ts`，定义了 `ci-primary`、`ci-coverage`、`ci-unit`、`ci-snapshot`、`hygiene`、`doc-sync`、`i18n` 等聚合门禁组 [scripts/run-gates.ts:18-39]；执行器支持并发控制、fail-fast 与 `allowFailure` 策略 [run-gates.ts:126-139]。

## 有性格的门禁

| 门禁 | 检查什么 |
|---|---|
| `verify-application-entrypoints` | 每个 bin/可执行入口显式归类，禁止绕开 `dsh` profile 启动应用 [docs/architecture.md:45] |
| `verify-cordis-config` | 所有 cordis 配置的 Loader 元数据、插件解析、source-plane 解析 [scripts/verify-cordis-config.ts:62-89] |
| `verify-export-jsdoc` | 公开导出必须有 JSDoc；函数式导出必须有 `@param`/`@returns` [scripts/verify-export-jsdoc.ts:1-8] |
| `verify-client-ui-i18n` | 拒绝 Client 源码里的硬编码文案，locale 字典是唯一合法文案来源 [scripts/verify-client-ui-i18n.ts:110-140] |
| `doc-typecheck` | **文档里围起来的 ts 代码块必须能编译** [docs/AGENTS.md] |
| `verify-doc-budgets` | **文档有字数预算**：architecture.md ≤ 2400 词，超标即红 [docs/AGENTS.md] |
| `duplication` | 跨文件 TypeScript 克隆检测 [package.json] |

值得停顿的是后两条：这个仓库把「文档会腐烂」当作工程问题而非态度问题——代码块要过编译器，篇幅要过预算，「一个事实一个家」靠门禁维护而不是靠编辑自觉。

## 测试金字塔

| 层 | 配置 | 机制 |
|---|---|---|
| unit | `vitest.config.ts` | 覆盖 `packages/*/*/tests`、`apps/*/tests`、`scripts/**/*.spec.ts` [vitest.config.ts:137-141] |
| coverage | 同上 | **逐文件 100%**；`coverage-uncovered-locations` 报告每个未覆盖点精确到 `path:line:col` [vitest.config.ts:12-16] |
| e2e | `vitest.e2e.config.ts` | 真实 API；无 key 自跳过；长超时、重试、并发控制，不跑覆盖率 [vitest.e2e.config.ts:40-61] |
| snapshot | `vitest.snapshot.config.ts` | 录制/回放分离：replay 无密钥默认跑，record 才读 `.env` [vitest.snapshot.config.ts:28-32] |
| expected | `vitest.expected.config.ts` | owner-local 进程期望 |
| bench | `vitest.bench.config.ts` | 性能门禁：CI scale/headroom 预算防回退，`maxWorkers: 2` [vitest.bench.config.ts:5-29] |

Git 侧由 lefthook 守住：pre-commit 跑翻译配对、归档笔记保护、staged lint、空白检查、vendor manifest 守卫；pre-push 跑 typecheck [lefthook.yml:5-49]。

## 独立观察

把这套体系放在「AI 辅助编码普及」的背景下看，它的意义超出了单个仓库：

1. **验证成本必须低于生成成本**。当 AI 让写代码变便宜，人工 review 成为瓶颈，唯一出路是把尽可能多的评审判断机械化。dsh 的门禁清单就是一份「机器可执行的评审意见」。
2. **文化靠门禁传承**。「禁止新增 `as unknown`」「一个事实一个家」「waterfall 必须调 `next()`」这类约定，写在文档里会被遗忘，写成门禁才会存活。
3. **覆盖率的选择**。逐文件 100% 是最有争议的一条（见 `06-independent-judgment.md`），但配套做法值得注意：他们不靠 `test` 命令跑覆盖率，而是把 `test:coverage` 单独设为 CI 门禁 [AGENTS.md]，本地开发和 CI 信号分离。

*基于 dsh 0.2.2-alpha.2（2026-10-29）*
