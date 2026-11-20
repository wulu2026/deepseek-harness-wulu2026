// TopBar.js — Capture工作室页面顶部栏
// 联动开关（占位）+ 章节切换器 + 项目/资产标签
// 所有基础控件优先使用 @deepseek-ai/dsh-client-ui-primitives（平台种子模块）

const React = require("react");
const h = React.createElement;
const { Pill } = require("@deepseek-ai/dsh-client-ui-primitives");

function TopBar({ onToggleLink, onChapterChange, onTabChange, activeTab, chapter }) {
  const linkOn = false; // 阶段 1 占位，固定关闭，仅视觉反馈

  return h(
    "div",
    {
      style: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "0 0 12px 0",
        borderBottom: "1px solid var(--dsw-alias-stroke-muted, #e5e5e5)",
      },
    },
    [
      // 联动开关（占位，阶段 1 不做实际高亮跳转逻辑）
      h(Pill, {
        active: linkOn,
        onPress: () => {
          if (typeof onToggleLink === "function") onToggleLink(!linkOn);
        },
        label: linkOn ? "联动：开" : "联动：关",
      }),
      // 章节切换器（原生 <select>，阶段 1 静态选项）
      h(
        "select",
        {
          value: chapter || "第 1 章",
          onChange: (e) => {
            if (typeof onChapterChange === "function") onChapterChange(e.target.value);
          },
          style: {
            padding: "6px 10px",
            border: "1px solid var(--dsw-alias-stroke-default, #ccc)",
            borderRadius: "6px",
            fontSize: 13,
            color: "var(--dsw-alias-fg-default, #111)",
            background: "var(--dsw-alias-bg-surface, #fff)",
            cursor: "pointer",
          },
        },
        [
          h("option", { value: "第 1 章" }, "第 1 章"),
          h("option", { value: "第 2 章" }, "第 2 章"),
          h("option", { value: "第 3 章" }, "第 3 章"),
        ],
      ),
      // 项目 / 资产 标签切换（primitives Pill）
      h(
        Pill,
        {
          active: activeTab === "project",
          onPress: () => {
            if (typeof onTabChange === "function") onTabChange("project");
          },
          label: "项目",
        },
      ),
      h(
        Pill,
        {
          active: activeTab === "asset",
          onPress: () => {
            if (typeof onTabChange === "function") onTabChange("asset");
          },
          label: "资产",
        },
      ),
    ],
  );
}

module.exports = TopBar;
