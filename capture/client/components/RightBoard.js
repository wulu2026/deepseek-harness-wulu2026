// RightBoard.js — Capture工作室右侧故事板容器
// 三个区域占位：故事大纲 / 世界观与人物设定 / 分镜脚本表格
// 4.1/5.1/6.1 阶段分别替换为真实内容。

const React = require("react");
const h = React.createElement;

function CollapsibleSection({ title, children }) {
  const [open, setOpen] = React.useState(true);
  return h(
    "div",
    { style: { marginBottom: "12px", border: "1px solid var(--dsw-alias-stroke-muted, #e5e5e5)", borderRadius: "6px" } },
    [
      h(
        "div",
        {
          onClick: () => setOpen(!open),
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
            background: "var(--dsw-alias-bg-layer-raised, #f5f5f5)",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
            color: "var(--dsw-alias-fg-default, #111)",
          },
        },
        [title, h("span", null, open ? "▲" : "▼")],
      ),
      open
        ? h("div", { style: { padding: "12px" } }, children)
        : null,
    ],
  );
}

function RightBoard({ chapter }) {
  return h(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: "12px" } },
    [
      // 第一部分：故事大纲 / 剧情摘要（4.1 阶段）
      h(CollapsibleSection, { title: "故事大纲 / 剧情摘要" }, [
        h("h4", { style: { margin: "0 0 6px 0", fontSize: 13, color: "var(--dsw-alias-fg-default, #111)" } }, "章节：" + (chapter || "第 1 章")),
        h("p", { style: { margin: "0 0 6px 0", fontSize: 13, color: "var(--dsw-alias-fg-muted, #888)" } }, "暂无大纲内容。"),
      ]),
      // 第二部分：世界观与人物设定（5.1 阶段）
      h(CollapsibleSection, { title: "世界观与人物设定" }, [
        h("p", { style: { margin: 0, fontSize: 13, color: "var(--dsw-alias-fg-muted, #888)" } }, "暂无资产设定摘要。"),
      ]),
      // 第三部分：分镜脚本表格（6.1 阶段，占位）
      h(CollapsibleSection, { title: "分镜脚本表格" }, [
        h("p", { style: { margin: 0, fontSize: 13, color: "var(--dsw-alias-fg-muted, #888)" } }, "本章暂无镜头。"),
      ]),
    ],
  );
}

module.exports = RightBoard;
