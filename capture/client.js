/** Capture browser client leaf. Runs as a lazy factory with React from host module table. */
window.__ModuleLoader__.load({
  id: "@local/capture",
  factory(require) {
    const React = require("react");
    const h = React.createElement; // explicit element factory (no JSX step)
    const { useState, useEffect, useCallback } = React;
    // DSH Web Shell 平台种子模块，运行时始终可 require，无需 package.json 声明（ADR-021）。
    const { Button, Input, Modal, Tag } = require("@deepseek-ai/dsh-client-ui-primitives");

    // ---- Chunk 加载（package-local chunks）----
    // factory 本身保持同步；StudioPanel 通过 React.lazy 异步加载包内 chunk。
    // client.studiopanel.js 是自包含 chunk，内部包含 TopBar / LeftPanel / RightBoard / API，不依赖外部相对模块。
    const StudioPanel = React.lazy(async () => {
      const mod = await require.async("./client.studiopanel.js");
      return { default: mod.default || mod };
    });

    // ---- Safe JSON（CapturePanel 内联，避免依赖外部模块）----
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
    // 内联组件，直接 fetch（不依赖任何 chunk，避免加载顺序问题）。
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
            // 传入工厂函数 () => dispose，由 ctx.effect 在卸载/HMR 时调用该工厂拿到 disposer 并执行注销。
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
        // StudioPanel 是 React.lazy 组件，必须用 React.Suspense 包裹，否则 chunk 加载时
        // React 会抛出未捕获的 promise，导致槽位渲染崩溃（React error #426）。
        ctx.slots.inject("sidebar.right.pane.tab", () =>
          ctx.slots.register(
            {
              name: "sidebar.right.pane.tab",
              key: "capture",
            },
            (props) =>
              h(
                React.Suspense,
                {
                  fallback: h(
                    "div",
                    {
                      style: {
                        padding: "16px",
                        color: "var(--dsw-alias-fg-muted, #888)",
                        textAlign: "center",
                      },
                    },
                    "加载中…",
                  ),
                },
                h(StudioPanel, props),
              ),
          ),
        );
      },
    };
  },
});
