/** Capture browser client leaf. Runs as a lazy factory with React from host module table. */
window.__ModuleLoader__.load({
  id: "@local/capture",
  factory(require) {
    const React = require("react");
    const h = React.createElement; // explicit element factory (no JSX step)
    const { useState, useEffect, useCallback } = React;

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

    // ---- CapturePanel (composer dock, ambient badge) ----
    function CapturePanel() {
      const [state, setState] = React.useState({ projects: [], error: null, loading: true });

      React.useEffect(function () {
        let active = true;
        fetch("/api/capture/state", { credentials: "same-origin" })
          .then((res) => safeJson(res))
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

    // ---- StudioPanel (right sidebar workspace page) ----
    //
    // Mounted inside DSH's native right sidebar via sidebar.right.pane.tab slot.
    // Layout (width, height, scroll) is owned by the sidebar shell; this component
    // only renders its content area. No position:fixed / width / right styles here.
    function StudioPanel() {
      const [state, setState] = useState({
        projects: [],
        error: null,
        loading: true,
      });
      const [newName, setNewName] = useState("");

      const fetchProjects = useCallback(async () => {
        try {
          const result = await safeJson(
            await fetch("/api/capture/state", { credentials: "same-origin" }),
          );
          if (result?.ok) {
            setState((s) => ({
              ...s,
              projects: result.projects || [],
              error: null,
              loading: false,
            }));
          } else {
            setState((s) => ({
              ...s,
              error: result?.error || "STATE_FAILED",
              loading: false,
            }));
          }
        } catch (e) {
          setState((s) => ({
            ...s,
            error: String(e?.message ?? e),
            loading: false,
          }));
        }
      }, []);

      useEffect(() => {
        fetchProjects();
      }, []);

      const handleCreate = async (e) => {
        e.preventDefault();
        if (!newName.trim()) return;
        try {
          const result = await safeJson(
            await fetch("/api/capture/projects", {
              method: "POST",
              credentials: "same-origin",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: newName.trim() }),
            }),
          );
          if (result?.ok) {
            setNewName("");
            fetchProjects();
          } else {
            setState((s) => ({ ...s, error: result?.error || "CREATE_FAILED" }));
          }
        } catch (e) {
          setState((s) => ({ ...s, error: String(e?.message ?? e) }));
        }
      };

      return h(
        "div",
        {
          style: {
            height: "100%",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            padding: "16px",
            background: "var(--dsw-alias-bg-surface, #fff)",
          },
        },
        [
          // Header
          h(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 0 16px 0",
                borderBottom:
                  "1px solid var(--dsw-alias-stroke-muted, #e5e5e5)",
              },
            },
            [
              h(
                "span",
                {
                  style: {
                    fontWeight: 600,
                    fontSize: 16,
                    color: "var(--dsw-alias-fg-default, #111)",
                  },
                },
                "Capture 工作室",
              ),
            ],
          ),
          // Body
          h(
            "div",
            { style: { flex: 1 } },
            [
              state.loading
                ? h("div", null, "加载中…")
                : null,
              state.error
                ? h("div", {
                    style: {
                      color: "var(--dsw-alias-danger-default, #900)",
                      marginBottom: 12,
                    },
                  }, state.error)
                : null,
              h(
                "h3",
                {
                  style: {
                    margin: "0 0 12px 0",
                    fontSize: 16,
                    color: "var(--dsw-alias-fg-default, #111)",
                  },
                },
                "项目",
              ),
              // Create form
              h(
                "form",
                {
                  onSubmit: handleCreate,
                  style: {
                    display: "flex",
                    gap: 8,
                    marginBottom: 16,
                    alignItems: "center",
                  },
                },
                [
                  h("input", {
                    type: "text",
                    placeholder: "新建项目名称",
                    value: newName,
                    onChange: (e) => setNewName(e.target.value),
                    style: {
                      flex: 1,
                      padding: "6px 10px",
                      border:
                        "1px solid var(--dsw-alias-stroke-default, #ccc)",
                      borderRadius: "6px",
                      fontSize: 14,
                    },
                  }),
                  h(
                    "button",
                    {
                      type: "submit",
                      style: {
                        padding: "6px 14px",
                        background: "var(--dsw-alias-accent-bg, #0066cc)",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: 14,
                      },
                    },
                    "创建",
                  ),
                ],
              ),
              // Project list
              h(
                "ul",
                {
                  style: { listStyle: "none", padding: 0, margin: 0 },
                },
                state.projects.map((p) =>
                  h(
                    "li",
                    {
                      key: p.id,
                      style: {
                        padding: "8px 12px",
                        borderBottom:
                          "1px solid var(--dsw-alias-stroke-muted, #f0f0f0)",
                        fontSize: 14,
                        color: "var(--dsw-alias-fg-default, #111)",
                      },
                    },
                    [
                      h("span", null, p.name || "未命名项目"),
                      h("span", {
                        style: {
                          marginLeft: "auto",
                          color: "var(--dsw-alias-fg-subtle, #666)",
                          fontSize: 12,
                        },
                      },
                      p.createdAt
                        ? new Date(p.createdAt).toLocaleString()
                        : ""),
                    ],
                  ),
                ),
              ),
              state.projects.length === 0
                ? h("p", {
                    style: {
                      color: "var(--dsw-alias-fg-muted, #888)",
                      margin: 0,
                    },
                  }, "暂无项目。使用上方表单创建一个项目。")
                : null,
            ],
          ),
        ],
      );
    }

    // ---- Sidebar menu entry (sidebar.panellist) ----
    //
    // Clicking this entry opens the Capture Studio Tab in the native right
    // sidebar via sidebarRight.openTab("capture"). All service access is
    // defensively guarded so the plugin does not crash if a service is not
    // available in the current profile.
    function MenuEntry() {
      const handleOpen = () => {
        const sidebarRight =
          typeof ctx.get === "function" ? ctx.get("sidebarRight") : undefined;
        if (sidebarRight && typeof sidebarRight.openTab === "function") {
          sidebarRight.openTab("capture");
        } else {
          console.warn("[capture] sidebarRight service or openTab method not available");
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
      // only slots are required in Phase 1
      inject: ["slots"],
      apply(ctx) {
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
            MenuEntry,
          ),
        );

        // Double registration for right sidebar workspace page:
        //
        // 1. Register Tab type via sidebarRightTabs service (defensive).
        //    ctx.inject may not exist in all DSH versions; guard with typeof.
        if (typeof ctx.inject === "function") {
          ctx.inject(["sidebarRightTabs"], (sidebarRightTabs) => {
            if (sidebarRightTabs && typeof sidebarRightTabs.register === "function") {
              const tabDefinition = {
                id: "capture-studio-tab",
                kind: "capture",
                title: "Capture",
                priority: "extension",
                keepMounted: true,
              };
              ctx.effect(() => sidebarRightTabs.register(tabDefinition), "capture:sidebar-tab-type");
            } else {
              console.warn("[capture] sidebarRightTabs service or register method not available");
            }
          });
        }

        // 2. Register Tab body to keyed slot.
        //    key MUST strictly equal tabDefinition.id above.
        ctx.slots.inject("sidebar.right.pane.tab", () =>
          ctx.slots.register(
            {
              name: "sidebar.right.pane.tab",
              key: "capture-studio-tab",
            },
            StudioPanel,
          ),
        );
      },
    };
  },
});
