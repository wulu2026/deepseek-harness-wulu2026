// LeftPanel.js — Capture工作室左侧区容器
// 项目列表 / 资源网格（按标签切换）。1.2 阶段先渲染基础项目列表；
// 2.1 阶段升级为 ProjectRow + ProjectList（类型 Tag、梗概、悬停/选中等）。

const React = require("react");
const h = React.createElement;

function LeftPanel({ projects, selectedProjectId, onSelectProject, activeTab }) {
  if (activeTab === "asset") {
    return h(
      "div",
      {
        style: {
          padding: "12px 0",
          color: "var(--dsw-alias-fg-muted, #888)",
          fontSize: 13,
          textAlign: "center",
        },
      },
      "资产网格（阶段 2+）",
    );
  }

  // 项目模式：基础项目列表（1.2 阶段）
  return h(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: 0 } },
    [
      h(
        "ul",
        {
          style: { listStyle: "none", padding: 0, margin: 0 },
        },
        projects.map((p) => {
          const selected = selectedProjectId === p.id;
          return h(
            "li",
            {
              key: p.id,
              onClick: () => {
                if (typeof onSelectProject === "function") onSelectProject(p.id);
              },
              style: {
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                borderBottom: "1px solid var(--dsw-alias-stroke-muted, #f0f0f0)",
                fontSize: 14,
                color: "var(--dsw-alias-fg-default, #111)",
                background: selected
                  ? "var(--dsw-alias-bg-accent, #eef6ff)"
                  : "var(--dsw-alias-bg-surface, #fff)",
                cursor: "pointer",
              },
            },
            [
              h(
                "span",
                {
                  style: {
                    fontWeight: 600,
                    color: "var(--dsw-alias-fg-default, #111)",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                    minWidth: 0,
                  },
                },
                p.name || "未命名项目",
              ),
              h(
                "span",
                {
                  style: {
                    marginLeft: "auto",
                    fontSize: 12,
                    color: "var(--dsw-alias-fg-subtle, #666)",
                    whiteSpace: "nowrap",
                  },
                },
                p.createdAt ? new Date(p.createdAt).toLocaleString() : "",
              ),
            ],
          );
        }),
      ),
      projects.length === 0
        ? h(
            "p",
            {
              style: {
                color: "var(--dsw-alias-fg-muted, #888)",
                margin: 0,
                padding: "12px 0",
              },
            },
            "暂无项目。使用上方表单创建一个项目。",
          )
        : null,
    ],
  );
}

module.exports = LeftPanel;
