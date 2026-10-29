# 真实贡献通道与边界

> 定位：讲清一条硬边界——上游当前不接受外部 PR，以及真正能走的四条通道；并定义「重要一员」在此阶段的具体含义。不给任何「未来可能开放」的安慰。

## 一条硬边界：现在不收外部 PR

DeepSeek Harness 的官方态度写在 CONTRIBUTING.md 里，没有含糊空间：

> DeepSeek Harness is still at an early stage and under active development. We are sorry that we cannot accept external pull requests at the moment. [CONTRIBUTING.md:9]

官方中文版同样明确：

> DeepSeek Harness 仍处于早期阶段，并在积极开发中。很抱歉，我们目前无法接受外部 PR（Pull Request）。 [CONTRIBUTING.zh.md:9]

这句话有两个意思，都要接受：

- **不接受**：向主仓库提代码 PR，现阶段不会走合入流程。不要把精力压在这条路上。
- **不是唯一途径**：同一段话紧接着说「contributing code ... is far from the only way to help」——贡献代码远非帮助这个仓库的唯一途径 [CONTRIBUTING.md:9]。

## 真实能走的四条通道

CONTRIBUTING.md 逐条列出了官方认可的四条路 [CONTRIBUTING.md:11-17]：

1. **在 GitHub Discussions 里报告问题 / bug**。入口是仓库的 [Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions) [README.md:45]。
   - **Upvote**：为你想引起团队注意的讨论投票。原文说得很实——团队很小、可能无法回复每一条，但会持续关注，并在分配资源时把这些讨论纳入考虑 [CONTRIBUTING.md:12]。
2. **为生态做插件**：写一个让你兴奋的插件并分享出去，给你的 GitHub 项目打上 `dsh-plugin` topic，让别人能搜到你 [CONTRIBUTING.md:14-15]。具体怎么做见 [./plugin-authoring.md](./plugin-authoring.md)。
3. **写博客与 how-to**：围绕 DeepSeek Harness 写文章和操作指南 [CONTRIBUTING.md:16]。选题思路见 [./community-engagement.md](./community-engagement.md)。
4. **社区答疑**：回答别人的问题、帮助其它成员 [CONTRIBUTING.md:17]。

这四条不是「退而求其次」，而是官方定义的正路。官方对仓库的定位是「理念、官方示例、灵感来源，而不是对社区的命令」 [CONTRIBUTING.md:19]。

## 「重要一员」在此阶段指什么

先讲清一个容易被误判的地方：**主仓库 commit 数不是这个阶段的「重要一员」指标**——因为外部 PR 根本不收。

官方对「谁重要」的界定很直接：官方仓库里的包并不天然比社区包更重要 [CONTRIBUTING.md:19]，而且官方已经看到「来自社区的激动人心的项目」在冒出来 [CONTRIBUTING.md:21]。所以这一阶段，判断「重要一员」用的是生态 / 社区影响力，具体是三件事：

- **插件被人用**：有人安装、使用你的 `dsh-plugin`，你的包名出现在别人的 profile 里；
- **内容被人读**：你的博客 / how-to 成为别人解决问题的入口；
- **答疑被感谢**：你的回答真正解决了别人的问题，而不是堆链接。

三者的共同点是「对别人产生了可被观察的价值」。衡量它们的是使用量、引用、感谢，而不是 commit。

## 边界之外，诚实地说

- 现阶段不要期待 PR 被合入，也不要为「将来会开放」而押注。就按现在这条边界规划投入：产出能独立存在、独立被用的东西（插件、内容、答案）。
- 这不是「等开放了再参与」，而是一条现在就能走、且官方明确鼓励的路。

*基于 dsh 0.2.2-alpha.2（2026-10-29）*
