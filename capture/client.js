/** Capture browser client leaf. Runs as a lazy factory with React from host module table. */
window.__ModuleLoader__.load({
  id: "@local/capture",
  factory(require) {
    const React = require("react");
    const h = React.createElement; // explicit element factory (no JSX step)

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

    return {
      // only slots are required in Phase 1
      inject: ["slots"],
      apply(ctx) {
        ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register({
          name: "conversation.composer.dock",
          id: "capture",
          order: 4,
        }, CapturePanel));
      },
    };
  },
});
