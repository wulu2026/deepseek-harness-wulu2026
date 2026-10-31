# showcase/

> 对外内容输出工作台：一套独立的 dsh 源码分析 + 一个竖屏录屏优化的交互展示页。目标渠道：小红书等技术内容平台。

## 定位

- 与 `atlas/` 的关系：atlas 是自己的研究笔记（认知层）；这里是面向公众的传播层。分析由源码证据独立支撑，不复用 atlas 框架，含明确的第三方判断（亮点与代价）。
- 证据标准与 HarnessTech 一致：关键结论带 `[文件:行号]` 引用。

## 目录

- `analysis/` —— 六篇源码分析，按叙事顺序编号：
  1. `01-everything-is-a-plugin.md` —— 全插件架构：没有核心的核心
  2. `02-request-journey.md` —— 一次请求的旅行：turn/step 与三个事件域
  3. `03-session-as-ledger.md` —— 会话即账本：事件溯源与无密钥回放
  4. `04-capability-seam.md` —— 能力缝三角色：换 provider = 换执行世界
  5. `05-engineering-culture.md` —— 门禁即文化：330 个脚本守住一个仓库
  6. `06-independent-judgment.md` —— 独立判断：三亮点、三代价、一句话结论
- `presentation/dsh-showcase/` —— 自包含交互展示页（打开 `dsh-showcase.html` 即用），八幕滚动叙事，与六篇分析共用故事线。

## 录屏建议

- 窗口调至手机比例：浏览器开发者工具设备模式选 iPhone（390×844）或直接拉一个竖长窗口。
- 页面带 scroll-snap，逐幕滚动不会停在半路；右下角「自动播放」每 5.6 秒推进一幕，适合无人操作录屏；滚轮/触摸/按键会立即停止自动播放。
- 口播稿可直接用 `analysis/06` 的判断框架收口：亮点 → 代价 → 谁该关注 → 一句话结论。

*基于 develop 分支 2026-10-31 检出（版本号 dsh 0.2.2-alpha.2，release tag 后 362 个提交）*
