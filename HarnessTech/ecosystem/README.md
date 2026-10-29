# ecosystem —— 行动层导航

> 定位：告诉你在 `ecosystem/` 下该读什么、给谁读、按什么顺序读。不展开任何一条贡献通道的具体做法——那些在各自文档里。

## 三份文档，各是什么、给谁看

| 文件 | 唯一责任 | 给谁看 |
|---|---|---|
| [`contributing-reality.md`](./contributing-reality.md) | 真实贡献通道与边界：上游现在收不收 PR，能走哪四条路，「重要一员」此刻指什么 | 想参与但不知道往哪使劲的人 |
| [`plugin-authoring.md`](./plugin-authoring.md) | 从 0 到发布一个插件：profile / bundle / overlay 机制、能力缝三角色、自定义工具、分享 | 想动手写插件、产出可见作品的人 |
| [`community-engagement.md`](./community-engagement.md) | 怎么在社区里有效参与：高质量报 bug、upvote、内容选题、答疑积累信任 | 想靠讨论与内容建立影响力的人 |

## 阅读顺序

1. 先读 [`contributing-reality.md`](./contributing-reality.md)：它划定边界、给出四条真实通道，是所有行动的前提。不先读它，容易把精力投到「现在根本走不通」的方向上。
2. 再按目标分叉：
   - 目标「做出一个别人能用的东西」→ 读 [`plugin-authoring.md`](./plugin-authoring.md)，动手时配合 `../atlas/capability-seam-map.md` 查能力缝。
   - 目标「在社区里被看见、被信任」→ 读 [`community-engagement.md`](./community-engagement.md)。
3. 两条路不互斥：一个被他人安装、被社区讨论的插件，本身就是最硬的内容与信任来源。

## 与其它目录的关系

- 这个目录只讲「怎么做」（行动）；「是什么、为什么」在 `../atlas/`（认知层）。
- 做完之后记到 `../progress/`（轨迹层），沉淀里程碑与证据。

*基于 dsh 0.2.2-alpha.2（2026-10-29）*
