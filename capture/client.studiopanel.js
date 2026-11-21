// client.studiopanel.js — 右侧 Capture工作室页面容器（package-local chunk，自包含）
// 内部包含：safeJson、API 封装、TopBar、LeftPanel、RightBoard、StudioPanel
// 不依赖外部任何相对模块，所有静态依赖一起放进该 chunk。

window.__ModuleLoader__.load({
  id: "@local/capture",
  chunk: "client.studiopanel.js",
  factory(require) {
    const React = require("react");
    const { useState, useEffect, useCallback } = React;
    const h = React.createElement;
    // DSH Web Shell 平台种子模块，运行时始终可 require，无需 package.json 声明（ADR-021）。
    const { Button, Input, Modal, Tag } = require("@deepseek-ai/dsh-client-ui-primitives");

    // ---- Safe JSON（内联，避免依赖外部模块）----
    async function safeJson(response) {
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const text = await response.text();
        return { ok: false, error: `HTTP_${response.status}`, message: text.slice(0, 200) };
      }
      try {
        return await response.json();
      } catch (e) {
        return { ok: false, error: "INVALID_JSON", message: String(e?.message ?? e) };
      }
    }

    // ---- API（内联，避免依赖外部模块）----
    const BASE = "/api/capture";
    async function fetchState() {
      const res = await fetch(`${BASE}/state`, { credentials: "same-origin" });
      return safeJson(res);
    }
    async function createProject(body) {
      const res = await fetch(`${BASE}/projects`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      return safeJson(res);
    }

    // ---- TopBar（顶部栏，内联）----
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
          // 联动开关（占位，阶段 1 仅视觉反馈）
          h(
            "span",
            {
              style: {
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                border: "1px solid var(--dsw-alias-stroke-default, #ccc)",
                borderRadius: "6px",
                fontSize: 12,
                color: "var(--dsw-alias-fg-default, #111)",
                cursor: "pointer",
                background: "var(--dsw-alias-bg-surface, #fff)",
              },
              onClick: () => {
                if (typeof onToggleLink === "function") onToggleLink(!linkOn);
              },
            },
            [
              h("span", { style: { width: "8px", height: "8px", borderRadius: "4px", background: linkOn ? "var(--dsw-alias-accent-default, #0066cc)" : "var(--dsw-alias-stroke-muted, #e5e5e5)" } }),
              h("span", null, linkOn ? "联动：开" : "联动：关"),
            ],
          ),
        ],
      );
    }

    // ---- LeftPanel（左侧区，内联）----
    function LeftPanel({ projects, selectedProjectId, onSelectProject, activeTab, onTabChange }) {
      const handleTabSwitch = (tab) => {
        if (typeof onTabChange === "function") onTabChange(tab);
      };

      const header = h(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "12px",
          },
        },
        [
          h("h3", {
            style: {
              margin: 0,
              fontSize: 15,
              color: "var(--dsw-alias-fg-default, #111)",
            },
          }, activeTab === "project" ? "项目" : "资产"),
          h(
            "div",
            { style: { display: "flex", gap: "6px" } },
            [
              h(Tag, {
                active: activeTab === "project",
                onPress: () => handleTabSwitch("project"),
                label: "项目",
              }),
              h(Tag, {
                active: activeTab === "asset",
                onPress: () => handleTabSwitch("asset"),
                label: "资产",
              }),
            ],
          ),
        ],
      );

      const content = activeTab === "asset"
        ? h(
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
          )
        : h(
            "ul",
            { style: { listStyle: "none", padding: 0, margin: 0 } },
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
          );

      return h(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 0 } },
        [header, content],
      );
    }

    // ---- RightBoard（右侧故事板，内联）----
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
          open ? h("div", { style: { padding: "12px" } }, children) : null,
        ],
      );
    }
    function RightBoard({ chapter, onChapterChange }) {
      return h(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: "12px" } },
        [
          // 右侧故事板顶部章节选择器
          h(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                gap: "10px",
                paddingBottom: "8px",
                borderBottom: "1px solid var(--dsw-alias-stroke-muted, #e5e5e5)",
              },
            },
            [
              h("span", {
                style: {
                  fontSize: 13,
                  color: "var(--dsw-alias-fg-muted, #888)",
                },
              }, "章节："),
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
            ],
          ),
          h(CollapsibleSection, { title: "故事大纲 / 剧情摘要" }, [
            h("p", { style: { margin: "0 0 6px 0", color: "var(--dsw-alias-fg-muted, #888)" } }, "暂无大纲内容。"),
          ]),
          h(CollapsibleSection, { title: "世界观与人物设定" }, [
            h("p", { style: { margin: 0, fontSize: 13, color: "var(--dsw-alias-fg-muted, #888)" } }, "暂无资产设定摘要。"),
          ]),
          h(CollapsibleSection, { title: "分镜脚本表格" }, [
            h("p", { style: { margin: 0, fontSize: 13, color: "var(--dsw-alias-fg-muted, #888)" } }, "本章暂无镜头。"),
          ]),
        ],
      );
    }

    // ---- StudioPanel（容器，组合 TopBar / LeftPanel / RightBoard）----
    function StudioPanel() {
      const [state, setState] = useState({
        projects: [],
        error: null,
        loading: true,
      });
      const [selectedProjectId, setSelectedProjectId] = useState(null);
      const [activeTab, setActiveTab] = useState("project");
      const [chapter, setChapter] = useState("第 1 章");

      const fetchProjects = useCallback(async () => {
        try {
          const result = await fetchState();
          if (result?.ok) {
            setState((s) => ({ ...s, projects: result.projects || [], error: null, loading: false }));
          } else {
            setState((s) => ({ ...s, error: result?.error || "STATE_FAILED", loading: false }));
          }
        } catch (e) {
          setState((s) => ({ ...s, error: String(e?.message ?? e), loading: false }));
        }
      }, []);

      useEffect(() => {
        fetchProjects();
      }, [fetchProjects]);

      const handleSelectProject = (id) => { setSelectedProjectId(id); };
      const handleTabChange = (tab) => { setActiveTab(tab); };
      const handleChapterChange = (nextChapter) => { setChapter(nextChapter); };

      if (state.loading) {
        return h("div", { style: { padding: "16px", color: "var(--dsw-alias-fg-muted, #888)", textAlign: "center" } }, "加载中…");
      }
      if (state.error) {
        return h("div", { style: { padding: "16px", color: "var(--dsw-alias-danger-default, #900)", textAlign: "center" } }, state.error);
      }

      return h(
        "div",
        {
          style: {
            height: "100%",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            background: "var(--dsw-alias-bg-surface, #fff)",
          },
        },
        [
          h(TopBar, {
            onToggleLink: () => {
              // 阶段 1 占位：仅视觉反馈
            },
            onChapterChange: handleChapterChange,
            onTabChange: () => {
              // 阶段 1 占位：不做标签切换
            },
            activeTab,
            chapter,
          }),
          h(
            "div",
            {
              style: {
                flex: 1,
                display: "flex",
                flexDirection: "row",
                gap: "12px",
                overflow: "hidden",
              },
            },
            [
              h(
                "div",
                {
                  style: {
                    flex: "0 0 260px",
                    display: "flex",
                    flexDirection: "column",
                    overflowY: "auto",
                    borderRight: "1px solid var(--dsw-alias-stroke-muted, #e5e5e5)",
                    padding: "12px",
                    background: "var(--dsw-alias-bg-layer-default, #fafafa)",
                  },
                },
                [
                  h(LeftPanel, {
                    projects: state.projects,
                    selectedProjectId,
                    onSelectProject: handleSelectProject,
                    activeTab,
                    onTabChange: handleTabChange,
                  }),
                ],
              ),
              h(
                "div",
                {
                  style: {
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    overflowY: "auto",
                    padding: "12px",
                  },
                },
                [h(RightBoard, { chapter })],
              ),
            ],
          ),
        ],
      );
    }

    return StudioPanel;
  },
});
