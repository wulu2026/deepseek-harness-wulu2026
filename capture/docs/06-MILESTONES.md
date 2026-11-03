# Capture — 里程碑 (06)



## 阶段



### Phase 0 — Spikes & Spec (1-2 周)

- S1-S5 完成

- ADR 锁定存储、客户端-宿主数据流、媒体提供方、overlay vs main

- 不写 production code; 最多 smoke fixtures.



### Phase 1 — MVP-A 文本 & 分镜 (4-6 周)

- Host storage + entities + tools

- Client Studio panel (project/chapter/shot/asset/export)

- Agents: Story Manager, Outline, Shot Director, Asset Manager, Consistency (read-only), Exporter

- Host smoke + client smoke + compat-check

- **Exit**: E1-E6



### Phase 2 — MVP-B 图像生成 (3-4 周)

- Provider abstraction + HTTP + mock; gen jobs

- Identity lock; character/shot still gen; provenance

- Gen queue UI

- **Exit**: E7-E8



### Phase 3 — MVP-C 视频 & 宣传片 (4-5 周)

- shot video gen; trailer compile (ffmpeg); title cards

- vertical crop; present() deliverables

- **Exit**: E9



### Phase 4 — Polish & Public (4-6 周)

- multi-provider cost/queue; branch compare UI; timeline (maybe)

- templates; market packaging; docs; e2e/browser acceptance

- **Exit**: v1.0.0 publish-ready



## 版本



- v0.1.0 (end Phase 1) — internal test

- v0.2.0 (end Phase 2) — beta image

- v0.3.0 (end Phase 3) — beta video

- v1.0.0 (end Phase 4) — public



## 风险/依赖表



| dep | risk | owner |

|---|---|---|

| DSH storage API unclear | block Phase 1 | Spike S1 |

| image gen availability/cost | block Phase 2 | Spike S5 |

| client-host data flow | block all UI | Spike S2 |

| agent preset registration | weaker agents | Spike S3/S8 |



## Definition of Ready/Done per phase

- Phase entry: all blocking spikes from previous phase done + ADRs merged.

- Phase exit: acceptance E-list + tests green + progress doc updated.
