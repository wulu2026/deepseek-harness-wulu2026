# Spike S1 — Storage (dsh-storage / domain / json)



日期：2026-11-01

方法：阅读 app.asar 提取包 README + lib 源。包：`dsh-storage`, `dsh-storage-domain`, `dsh-storage-json`, 基础 patch `dsh-base/cordis.patch.yml`.



## 结论



- Base profile **已挂载** storage 三件套：`storage` (hub), `storage-json` (backend, root=`$DSH_HOME/storages`), `storage-domain` (form, backend=json)。因此插件可直接使用 `ctx.storage`/`ctx.storageDomain`，无需新增依赖。

- 服务键：

  - `ctx.storage` (hub) 卫星名 "storage"

  - `ctx.storageDomain` (facility) 由 storage-domain `ctx.provide("storageDomain", facility)` 提供

- 插件声明：`export const inject = ['storage', 'storageDomain']`（可选）。

- 领域 API：`defineDomain({ name, version, tables })`, `domainTable(zodSchema)`, `ctx.storageDomain.open(spec)` returns handle with `.table(name).get/put/update/delete/deleteMany`, `.global`, `.close()`, async writes with persistence & `domain/changed` ordering.

- 值校验：zod schema；内存是最终裁决；介质是持久投影。

- Unit/table 名称必须匹配 `/^[a-z][a-z0-9_]*$/`.

- 变更事件 `domain/changed` 仅进程内（跨进程不可见）。

- 并发：每个领域一条写入链；并发更新不会交错，但调用方需自行安排顺序。

- 不兼容值迁移：`compatibleVersions` 允许当前解码器读取旧数据，重写时转换值。



## 对 ADR-003/010

- 确认 **domain_kv (storage-domain) 是正确 SSOT** for Project data. 路径由 json backend root = `$DSH_HOME/storages`, 领域名如 `capture` -> 存储于 `$DSH_HOME/storages/capture/`（实现细节由 backend 决定). Plugin 不需要自建文件 IO。无需 `dsh-atomic-write`。

- Domain name 命名需合法 `[a-z][a-z0-9_]*` → `capture` 合法。

- Plan: 定义一个 domain `capture`, version 1, tables: projects, chapters, scenes, shots, assets, generations, trailers, branches, journals? —but  preference: define coarse tables with zod records keyed by id. Or separate domains per entity. Use one domain `capture` with multiple tables. Fits.



## Next

- S2 client-host interaction. Need inspect `remoteAccess` / `ctx.remote.commands.execute` patterns in workspace browser.
