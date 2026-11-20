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
      const [selectedProjectId, setSelectedProjectId] = useState(null);

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
          // Header - 1.2 阶段顶部栏占位：联动开关 + 章节切换器 + 项目/资产标签
          h(
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
              // 联动开关（占位，阶段 1 仅视觉反馈，不做实际高亮跳转逻辑）
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
                    // 阶段 1 占位：仅视觉反馈
                  },
                },
                [
                  h("span", { style: { width: "8px", height: "8px", borderRadius: "4px", background: linkOnState() ? "var(--dsw-alias-accent-default, #0066cc)" : "var(--dsw-alias-stroke-muted, #e5e5e5)" } }),
                  h("span", null, "联动：关"),
                ],
              ),
              // 章节切换器（原生 <select>，阶段 1 静态选项）
              h(
                "select",
                {
                  value: chapterState() || "第 1 章",
                  onChange: (e) => {
                    // 阶段 1 占位：不持久化章节选择
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
              // 项目 / 资产 标签切换（使用 primitives Tag 作为视觉标签）
              h(Tag, null, "项目"),
              h(Tag, null, "资产"),
            ],
          ),
          // Body - 左右两列
          h(
            "div",
            { style: { flex: 1, display: "flex", flexDirection: "column" } },
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
              // 左侧区：项目列表（2.1 阶段样式：名称加粗、类型 Tag、梗概、时间、悬停/选中）
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
                  h(
                    "ul",
                    {
                      style: { listStyle: "none", padding: 0, margin: 0 },
                    },
                    state.projects.map((p) => {
                      const selected = selectedProjectId === p.id;
                      return h(
                        "li",
                        {
                          key: p.id,
                          onClick: () => setSelectedProjectId(p.id),
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
                            "div",
                            {
                              style: {
                                flex: 1,
                                minWidth: 0,
                                display: "flex",
                                flexDirection: "column",
                                gap: "2px",
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
                                  },
                                },
                                p.name || "未命名项目",
                              ),
                              h(
                                "span",
                                {
                                  style: {
                                    fontSize: 12,
                                    color: "var(--dsw-alias-fg-muted, #888)",
                                    overflow: "hidden",
                                    whiteSpace: "nowrap",
                                    textOverflow: "ellipsis",
                                  },
                                },
                                p.genre ? `类型：${p.genre}` : "类型：—",
                              ),
                            ],
                          ),
                          h(Tag, null, p.genre || "未分类"),
                          h(
                            "span",
                            {
                              style: {
                                flex: 1,
                                minWidth: 0,
                                fontSize: 13,
                                color: "var(--dsw-alias-fg-muted, #888)",
                                overflow: "hidden",
                                whiteSpace: "nowrap",
                                textOverflow: "ellipsis",
                                paddingLeft: "12px",
                              },
                            },
                            p.logline ? p.logline : "—",
                          ),
                          h(
                            "span",
                            {
                              style: {
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
                  state.projects.length === 0
                    ? h("p", {
                        style: {
                          color: "var(--dsw-alias-fg-muted, #888)",
                          margin: 0,
                          padding: "12px 0",
                        },
                      }, "暂无项目。使用上方表单创建一个项目。")
                    : null,
                ],
              ),
              // 右侧故事板（占位）
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
                [
                  h("h4", {
                    style: {
                      margin: "0 0 8px 0",
                      fontSize: 14,
                      color: "var(--dsw-alias-fg-default, #111)",
                    },
                  }, "故事大纲 / 剧情摘要（占位）"),
                  h("p", { style: { margin: "0 0 8px 0", color: "var(--dsw-alias-fg-muted, #888)" } }, "暂无大纲内容。"),
                  h("h4", {
                    style: {
                      margin: "16px 0 8px 0",
                      fontSize: 14,
                      color: "var(--dsw-alias-fg-default, #111)",
                    },
                  }, "世界观与人物设定（占位）"),
                  h("p", { style: { margin: "0 0 8px 0", color: "var(--dsw-alias-fg-muted, #888)" } }, "暂无资产设定摘要。"),
                  h("h4", {
                    style: {
                      margin: "16px 0 8px 0",
                      fontSize: 14,
                      color: "var(--dsw-alias-fg-default, #111)",
                    },
                  }, "分镜脚本表格（占位）"),
                  h("p", { style: { margin: 0, color: "var(--dsw-alias-fg-muted, #888)" } }, "本章暂无镜头。"),
                ],
              ),
            ],
          ),
        ],
      );
    }

    // 新建项目弹窗（Modal + Input + Button，primitives）
    function ProjectFormModal({ visible, onClose, onSubmit }) {
      const [name, setName] = useState("");
      const [genre, setGenre] = useState("");
      const [logline, setLogline] = useState("");

      if (!visible) return null;

      return h(
        Modal,
        {
          visible: true,
          onClose,
          title: "新建项目",
        },
        [
          h(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: "10px" } },
            [
              h(Input, {
                placeholder: "项目名称",
                value: name,
                onChange: (e) => setName(e.target.value),
                style: { width: "100%" },
              }),
              h(Input, {
                placeholder: "类型（可选）",
                value: genre,
                onChange: (e) => setGenre(e.target.value),
                style: { width: "100%" },
              }),
              h(Input, {
                placeholder: "一句话梗概（可选）",
                value: logline,
                onChange: (e) => setLogline(e.target.value),
                style: { width: "100%" },
              }),
              h(
                "div",
                { style: { display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" } },
                [
                  h(
                    Button,
                    {
                      variant: "ghost",
                      onPress: onClose,
                    },
                    "取消",
                  ),
                  h(
                    Button,
                    {
                      variant: "primary",
                      onPress: () => {
                        if (!name.trim()) return;
                        onSubmit({ name: name.trim(), genre: genre.trim(), logline: logline.trim() });
                      },
                    },
                    "保存",
                  ),
                ],
              ),
            ],
          ),
        ],
      );
    }

    // 把新建项目弹窗合并进 StudioPanel 的返回树（由 StudioPanel 管理显隐）
    // 注意：StudioPanel 内部未集成 ProjectFormModal，后续 2.2 阶段再集成。
    // 此处导出 ProjectFormModal 供 StudioPanel 引用时使用；当前 client.js 先不注册该槽位。

    // ---- Sidebar menu entry (sidebar.panellist) ----
    //
    // Clicking this entry opens the Capture Studio Tab in the native right
    // sidebar via sidebarRight.openTab("capture").
    function MenuEntry(props) {
      const { ctx } = props; // 从 props 接收 ctx

      const handleOpen = () => {
        // 防御性获取，万一服务没加载也不至于报错崩溃
        const sidebarRight = ctx.get?.("sidebarRight");
        console.log("[capture] handleOpen: ctx.get('sidebarRight') =", sidebarRight ? "yes" : "undefined");
        if (sidebarRight && typeof sidebarRight.openTab === "function") {
          // openTab 接收的是 tab kind，不是 tab id
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

    // 顶部栏占位状态（阶段 1 不持久化）
    function linkOnState() { return false; }
    function chapterState() { return "第 1 章"; }

    return {
      // only slots are required in Phase 1
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
        // NOTE: must be asynchronous/queued. Services may not be ready at apply() time,
        // so use ctx.inject() so DSH delivers the service when it is loaded.
        // Synchronous ctx.get() here would race with service loading and silently
        // fail, so the tab type is never registered.
        ctx.inject(["sidebarRightTabs"], (injected) => {
          console.log("[capture] sidebarRightTabs received:", injected ? "yes" : "undefined");
          console.log("[capture] typeof sidebarRightTabs =", typeof injected);
          console.log("[capture] sidebarRightTabs keys:", Object.keys(injected || {}));
          const sidebarRightTabs = injected.get?.("sidebarRightTabs") || injected.sidebarRightTabs;
          if (sidebarRightTabs && typeof sidebarRightTabs.register === "function") {
            console.log("[capture] typeof sidebarRightTabs.register =", typeof sidebarRightTabs.register);
            const tabDefinition = {
              id: "capture",
              kind: "capture",
              title: () => "Capture",
              priority: "extension",
              keepMounted: true,
            };
            const dispose = sidebarRightTabs.register(tabDefinition);

            // 推荐：把注销器放进 ctx.effect，插件卸载时自动清理
            ctx.effect(() => dispose, "capture:sidebar-tab-type");

            console.log("[capture] registered tabDefinition:", JSON.stringify(tabDefinition));
            console.log("[capture] tab registered OK");
          } else {
            console.warn("[capture] sidebarRightTabs service or register method not available");
            console.log("[capture] ctx.get('sidebarRightTabs') result:", sidebarRightTabs);
            console.log("[capture] typeof sidebarRightTabs:", typeof sidebarRightTabs);
            console.log("[capture] typeof sidebarRightTabs.register:", typeof sidebarRightTabs?.register);
            console.log("[capture] sidebarRightTabs keys:", Object.keys(sidebarRightTabs || {}));
          }
        });

        // Register Tab body to keyed slot.
        // key MUST strictly equal tabDefinition.id above.
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
