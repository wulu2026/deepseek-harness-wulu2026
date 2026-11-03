# Capture — 开放问题 & Spike (08)



每个问题含 ID、阻塞阶段、owner、验证方法。



---



### Q1. 存储：官方 storage domain API 在哪里？目录约定？事务？

- Blocker: Phase 1

- Validate: extract `dsh-storage*` README + inspect runtime; `cordis_inspect_query` for `storage` service.

- Spike S1.



### Q2. DeepSeek 账户是否提供 image/video generation？

- Blocker: Phase 2 (决定 provider 优先级)

- Validate: inspect `dsh-deepseek-account`, `dsh-deepseek-llm-api-extensions`, `dsh-llm-deepseek` README.

- Spike S5.



### Q3. Client-Host service invocation mechanism?

- Blocker: Phase 1 (all UI)

- Validate: how workspace browser calls `session/create`: extract `dsh-api-session-controller` & `remoteAccess` docs; find `ctx.remote.commands.execute` examples.

- Spike S2.



### Q4. overlay 宽度/能力？

- Blocker: Phase 1 (UI container)

- Validate: `ui-plugin` slot list + inspect Slots `listSubTree`; whether `shell.overlay` supports wide blade.

- Spike S2/UI.



### Q5. agent preset / skill registration from plugin?

- Blocker: Phase 1 (agents)

- Validate: whether plugins can register skills/agent presets; else systemPrompt section.

- Spike S3.



### Q6. jobs service exported name?

- Blocker: Phase 1/Phase 2

- Validate: inspect `dsh-jobs`.

- Spike S4.



### Q7. tools registration API exactly (`ctx.tools.register` vs defineTool)?

- Blocker: Phase 1.

- Validate: inspect `dsh-tools`.



### Q8. Deliverable file reference API (present + file refs) to expose generated media.

- Blocker: Phase 3.

- Validate: inspect `dsh-tool-present`, `dsh-deliverable-file-references`.



### Q9. 媒体 MIME/本地路径暴露给 web UI `<img>/<video>` (needs host route?).

- Blocker: Phase 2.

- Validate: use DSH file-reference flows (recommended); avoid custom routes unless necessary.



### Q10. 项目 global storage 的并发与多 session 访问.

- Blocker: Phase 1.

- Validate: S1 + in-process locks.



### Q11. Consistency Agent 的 output contract (diff proposal).

- Blocker: Phase 1.

- Validate: tool `proposeChange` + UI diff rendering assumption.



### Q12. Skill packaging: locale & meta for custom plugin.

- Blocker: Phase 0 for basic.

- Validate: decoration template + dsh-archived host-plugin checklist.



## Spike plan



Create spike notes in `capture/docs/spikes/` as we execute; do not commit fake answers.



## Decision triggers



- If S1 shows storage domain requires profile-level peer deps, adjust package.json dependencies.

- If Q2 image gen absent from DeepSeek, default HTTP provider & document setup.
