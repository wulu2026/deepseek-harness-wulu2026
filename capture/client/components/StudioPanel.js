// StudioPanel.js — 右侧 Capture工作室页面容器
// 持有顶层状态（projects、selectedProjectId、activeTab、chapter），组合 TopBar / LeftPanel / RightBoard。
// 1.2 阶段：顶部栏 + 左右两列布局；RightBoard 三个区域为占位，后续替换为真实内容。

const React = require("react");
const { useState, useEffect, useCallback } = React;
const h = React.createElement;
const TopBar = require("./TopBar.js");
const LeftPanel = require("./LeftPanel.js");
const RightBoard = require("./RightBoard.js");
const { fetchState } = require("../lib/api.js");

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
  }, [fetchProjects]);

  const handleSelectProject = (id) => {
    setSelectedProjectId(id);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleChapterChange = (nextChapter) => {
    setChapter(nextChapter);
  };

  if (state.loading) {
    return h(
      "div",
      {
        style: {
          padding: "16px",
          color: "var(--dsw-alias-fg-muted, #888)",
          textAlign: "center",
        },
      },
      "加载中…",
    );
  }

  if (state.error) {
    return h(
      "div",
      {
        style: {
          padding: "16px",
          color: "var(--dsw-alias-danger-default, #900)",
          textAlign: "center",
        },
      },
      state.error,
    );
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
      // 顶部栏
      h(TopBar, {
        onToggleLink: () => {
          // 阶段 1 占位：仅视觉反馈，不做实际高亮跳转
        },
        onChapterChange: handleChapterChange,
        onTabChange: handleTabChange,
        activeTab,
        chapter,
      }),
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
              }, activeTab === "project" ? "项目" : "资产"),
              h(LeftPanel, {
                projects: state.projects,
                selectedProjectId,
                onSelectProject: handleSelectProject,
                activeTab,
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

module.exports = StudioPanel;
