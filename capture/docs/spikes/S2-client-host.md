# Spike S2 — 客户端 ↔ Host 数据流

日期：2026-11-07
状态：✅ Closed
对应问题：Q3

## 问题

Capture client UI 如何获取/修改 Capture Host 数据，如何避免在浏览器与 Host 之间构造难维护的通道？

## 方法

- 已存在宿主插件 `dsh-archived`：它面向 Web bundle 无编译流水线，使用 `ctx.webServer.register({ kind: "exact", path, handler })` 暴露 JSON API，并实现 loopback + same-origin trust gate。
- 已在 asar 中提取 `dsh-typert-protocol`：Typert 需要 `@Remote` + 生成的 descriptors/codec 产物；自 `dsh` 0.2.x 生态大量以 Typert 作 structured RPC，但该流水线要求 build-time generator，当前 Capture docs 阶段仍按 plain bundle 形态推进（Host half `index.js` plain ESM，Client half `client.js` factory）。

## 发现

1. **Host route 是现有可直接复用的安全通道。**
   `ctx.webServer.register({ kind: "exact", path, handler })` 允许暴露 `/api/capture/*` JSON endpoints，Handler 负责 method gate、trust gate、统一 JSON fail envelope。
2. **安全门应直接复制 dsh-archived 的 trust pattern：** loopback + `Origin` match (or `Sec-Fetch-Site: same-origin`)，缺信号拒绝；POST JSON body via `readJsonBody`。
3. **Phase 1 不需要 Typert。** plain bundle 直接暴露 routes；客户端用 same-origin `fetch` 调用； mutations 返回最新 payload/错误码，客户端刷新或根据 payload 更新。
4. **Generation 进度** 可用 polling（按 job ID GET），Phase 3 再评估 streaming/perf。
5. **Authz**：mac 桌面 owner 场景 Host 调用恒允许；远程/非 owner 在 Phase 1 不作为目标，但 route 仍遵守 gateway 同 trust pattern（不直接暴露 root route / 未 guarded path）。

## 决策

- `Capture` Host 半边 Host `inject` 包含：`"storage", "storageDomain", "webServer"`; Jobs 在 Phase 2/3 先通过 abstract 队列，不强制强 coupled service（storage + route 为主）。
- Phase 1 提供 `/api/capture/*` exact endpoints:
  - `GET  /api/capture/state`
  - `POST /api/capture/projects` create
  - `GET  /api/capture/projects/:id/state`
  - `POST /api/capture/chapters`
  - `POST /api/capture/shots`
  - `POST /api/capture/assets`
  - `POST /api/capture/generations` (Phase 2+)
  - `GET  /api/capture/generations/:id`
  - `POST /api/capture/trailers` (Phase 3+)
  - `POST /api/capture/exports` (Phase 1+)
- 状态流：每次 POST 成功返回 `{ ok, result, etag? }`；客户端以返回结果 optimistic update；长流程用 polling job status。
- 不在 Phase 1 启动 Typer build pipeline；当需要 binary / streaming for generation Phase 3 时重新评估 `@Remote` descriptors.

## 对 ADR 的影响

- 追加 ADR-015：Capture Host API 使用 `webServer` exact route，而不是 Typert，作为 Phase 1/2 MVP 标准 (ADR-003 remains valid for storage)。Typert 留待 binary/streaming requirement (Phase 3+).

## 剩余风险与延后

- **polling 1s 负载**：Job routes return JSON only; Phase 3 需要每 job 状态 endpoint; 可 upgrade to Typer stream.
- **跨多客户端一致性**：无 progress push; Phase1 allows manual refresh.
- **error 契约**：所有 routes 必须返回 `ok`; error code stable list enumerated in Phase1 spec.
