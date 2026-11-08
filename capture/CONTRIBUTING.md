# Capture 贡献指南

## 工作流

1. 先更新 `docs/` 设计与规格，再写代码。
2. 每个 Spike closure 后：
   - 把结论写入 `docs/spikes/SX-*.md`
   - 更新 `docs/04-TECH-ARCHITECTURE.md` 或 `docs/05-TECH-IMPLEMENTATION.md`
   - 追加 ADR 到 `docs/07-DECISIONS.md`
3. **不要在用户 review 之前 commit。**
4. commit 时 `git diff --check` 必须通过；所有 Markdown 末尾仅 1 个换行，不允许 trailing whitespace。
5. 分支名避免与目录名重名；当前文档约定分支形态可自行约定，但 `docs/capture` 路径不变。
6. PR 描述和提交消息遵循仓库根 `docs/AGENTS.md` 要求（label、area、PR description）。

## 主要命令

```sh
git status --short
git diff --stat -- capture
git diff --check -- capture
```

不要在 Capture docs 未 review 时直接 `git commit`.
