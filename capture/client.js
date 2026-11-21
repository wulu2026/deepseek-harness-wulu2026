/** Capture browser client leaf. Runs as a lazy factory with React from host module table. */
window.__ModuleLoader__.load({
  id: "@local/capture",
  factory(require) {
    const React = require("react");
    const h = React.createElement; // explicit element factory (no JSX step)
    const { useState, useEffect, useCallback } = React;
    // DSH Web Shell 平台种子模块，运行时始终可 require，无需 package.json 声明（ADR-021）。
    const { Button, Input, Modal, Tag } = require("@deepseek-ai/dsh-client-ui-primitives");

    // Safe JSON parsing for fetch responses. Returns { ok, error?, message? } envelope.
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

    // API 封装（内联，避免相对路径同步 require）
    async function fetchState() {
      const res = await fetch("/api/capture/state", { credentials: "same-origin" });
      return safeJson(res);
    }
    async function createProject(body) {
      const res = await fetch("/api/capture/projects", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      return safeJson(res);
    }

    // ---- Chunk 加载（package-local chunks）----
    // factory 本身保持同步；Studio 挂载时再异步加载包内 chunk。
    const TopBar = React.lazy(async () => {
      const TopBarMod = await require.async("./client.topbar.js");
      return { default: TopBarMod.default || TopBarMod };
    });

    // ---- CapturePanel (composer dock, ambient badge) ----
    function CapturePanel() {
      const [state, setState] = React.useState({ projects: [], error: null, loading: true });

      React.useEffect(function () {
        let active = true;
        fetchState()
          .then((result) => {
            if (!active) return;
            if (result?.ok) {
              setState({ projects: result.projects || [], error: null, loading: false });
            } else {
              setState({ projects: [], error: result?.error || "STATE_FAILED", loading: false });
            }
          })
          .catch((error) => {
            if (!active) return;
            setState({ projects: [], error: String(error?.message ?? error), loading: false });
          });
        return function () {
          active = false;
        };
      }, []);

      const count = state.projects.length;
      return h(
        "div",
        {
          style: {
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 10px",
            color: "var(--dsw-alias-fg-default, #111)",
            border: "1px solid var(--dsw-alias-stroke-default, #ccc)",
            borderRadius: "6px",
          },
        },
        h("span", null, "Capture"),
        h("span", null, state.loading ? "loading…" : count + " project(s)"),
        state.error ? h("span", { style: { color: "var(--dsw-alias-danger-default, #900)" } }, state.error) : null,
      );
    }

    // ---- LeftPanel (左侧区：基础项目列表，内联) ----
    function LeftPanel({ projects, selectedProjectId, onSelectProject }) {
      return h(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 0 } },
        [
          h(
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

    // ---- RightBoard (右侧故事板占位，内联) ----
    function RightBoard({ chapter }) {
      return h(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: "12px" } },
        [
          h("h4", {
            style: { margin: "0 0 8px 0", fontSize: 14, color: "var(--dsw-alias-fg-default, #111)" },
          }, "故事大纲 / 剧情摘要（占位）"),
          h("p", { style: { margin: "0 0 8px 0", color: "var(--dsw-alias-fg-muted, #888)" } }, "暂无大纲内容。"),
          h("h4", {
            style: { margin: "16px 0 8px 0", fontSize: 14, color: "var(--dsw-alias-fg-default, #111)" },
          }, "世界观与人物设定（占位）"),
          h("p", { style: { margin: "0 0 8px 0", color: "var(--dsw-alias-fg-muted, #888)" } }, "暂无资产设定摘要。"),
          h("h4", {
            style: { margin: "16px 0 8px 0", fontSize: 14, color: "var(--dsw-alias-fg-default, #111)" },
          }, "分镜脚本表格（占位）"),
          h("p", { style: { margin: 0, color: "var(--dsw-alias-fg-muted, #888)" } }, "本章暂无镜头。"),
        ],
      );
    }

    // ---- StudioPanel (容器，组合 TopBar(chunk) + LeftPanel + RightBoard) ----
    function StudioPanel() {
      const [state, setState] = useState({
        projects: [],
        error: null,
        loading: true,
      });
      const [selectedProjectId, setSelectedProjectId] = useState(null);
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
          // 顶部栏（TopBar 来自异步 chunk）
          h(
            React.Suspense,
            { fallback: h("div", { style: { height: "45px" } }) },
            h(TopBar, {
              onToggleLink: () => {
                // 阶段 1 占位：仅视觉反馈
              },
              onChapterChange: handleChapterChange,
              onTabChange: () => {
                // 阶段 1 占位：不做标签切换
              },
              activeTab: "project",
              chapter,
            }),
          ),
          // 左右两列
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
              // 左侧区（约 260px）
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
                  h("h3", {
                    style: {
                      margin: "0 0 12px 0",
                      fontSize: 15,
                      color: "var(--dsw-alias-fg-default, #111)",
                    },
                  }, "项目"),
                  h(LeftPanel, {
                    projects: state.projects,
                    selectedProjectId,
                    onSelectProject: handleSelectProject,
                  }),
                ],
              ),
              // 右侧故事板（剩余宽度）
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

    // ---- Sidebar menu entry (sidebar.panellist) ----
    //
    // Clicking this entry opens the Capture Studio Tab in the native right
    // sidebar via sidebarRight.openTab("capture").
    function MenuEntry(props) {
      const { ctx } = props;

      const handleOpen = () => {
        const sidebarRight = ctx.get?.("sidebarRight");
        console.log("[capture] handleOpen: ctx.get('sidebarRight') =", sidebarRight ? "yes" : "undefined");
        if (sidebarRight && typeof sidebarRight.openTab === "function") {
          console.log("[capture] handleOpen: calling sidebarRight.openTab('capture')");
          sidebarRight.openTab("capture");
          console.log("[capture] handleOpen: sidebarRight.openTab('capture') returned, no error");
        } else {
          console.warn("[capture] handleOpen: sidebarRight service not available. Did you add the dependency in package.json?");
        }
      };

      return h(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            padding: "10px 8px",
            cursor: "pointer",
            borderRadius: "8px",
            color: "var(--dsw-alias-fg-default, #111)",
            fontSize: 12,
          },
          onClick: handleOpen,
        },
        [h("span", null, "📁"), h("span", null, "Capture")],
      );
    }

    return {
      inject: ["slots", "sidebarRightTabs"],
      apply(ctx) {
        console.log("[capture] apply() called");
        console.log("[capture] ctx.services:", Object.keys(ctx).filter(k => k.startsWith("sidebar") || k === "slots" || k === "inject").join(", "));
        ctx.slots.inject("conversation.composer.dock", () =>
          ctx.slots.register(
            {
              name: "conversation.composer.dock",
              id: "capture",
              order: 4,
            },
            CapturePanel,
          ),
        );

        ctx.slots.inject("sidebar.panellist", () =>
          ctx.slots.register(
            {
              name: "sidebar.panellist",
              id: "capture.open",
              order: 450,
              label: "Capture",
            },
            (props) => h(MenuEntry, { ...props, ctx }),
          ),
        );

        // Register Tab type via sidebarRightTabs service.
        ctx.inject(["sidebarRightTabs"], (injected) => {
          console.log("[capture] sidebarRightTabs received:", injected ? "yes" : "undefined");
          const sidebarRightTabs = injected.get?.("sidebarRightTabs") || injected.sidebarRightTabs;
          if (sidebarRightTabs && typeof sidebarRightTabs.register === "function") {
            const tabDefinition = {
              id: "capture",
              kind: "capture",
              title: () => "Capture",
              priority: "extension",
              keepMounted: true,
            };
            const dispose = sidebarRightTabs.register(tabDefinition);
            ctx.effect(() => dispose, "capture:sidebar-tab-type");
            console.log("[capture] tab registered OK");
          } else {
            console.warn("[capture] sidebarRightTabs service or register method not available");
          }
        });

        // Register Tab body to keyed slot.
        ctx.slots.inject("sidebar.right.pane.tab", () =>
          ctx.slots.register(
            {
              name: "sidebar.right.pane.tab",
              key: "capture",
            },
            StudioPanel,
          ),
        );
      },
    };
  },
});
