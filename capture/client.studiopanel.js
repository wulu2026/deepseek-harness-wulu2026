// client.studiopanel.js — 右侧 Capture工作室页面容器（package-local chunk，自包含）
// 内部包含：safeJson、API 封装、TopBar、LeftPanel、RightBoard、StudioPanel
// 不依赖外部任何相对模块，所有静态依赖一起放进该 chunk。

window.__ModuleLoader__.load({
  id: "@local/capture",
  chunk: "client.studiopanel.js",
  factory(require) {
    const React = require("react");
    const { useState, useEffect } = React;
    const h = React.createElement;
    // DSH Web Shell 平台种子模块，运行时始终可 require，无需 package.json 声明（ADR-021）。
    const { Button, Input, Modal, Pill, Tag } = require("@deepseek-ai/dsh-client-ui-primitives");

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
    function TopBar({ onToggleLink }) {
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
    function LeftPanel({ projects, selectedProjectId, onSelectProject, activeTab, onTabChange, showCreateModal, setShowCreateModal, createForm, setCreateForm, onCreateProject }) {
      const handleTabSwitch = (tab) => {
        if (typeof onTabChange === "function") onTabChange(tab);
      };

      // ---- 资产状态（3.1 阶段，本地 Mock 数据，Host API 待补齐后切换）----
      const [assetType, setAssetType] = React.useState("character");
      const [showAssetDetail, setShowAssetDetail] = React.useState(false);
      const [selectedAsset, setSelectedAsset] = React.useState(null);
      const [showCreateAssetModal, setShowCreateAssetModal] = React.useState(false);
      const [createAssetForm, setCreateAssetForm] = React.useState({
        name: "",
        description: "",
      });

      const MOCK_ASSETS = [
        {
          id: "asset-1",
          name: "主角 - 林夕",
          kind: "character",
          description: "故事的主角，年轻剑客",
          version: 1,
        },
        {
          id: "asset-2",
          name: "道具 - 青龙剑",
          kind: "prop",
          description: "主角的随身武器",
          version: 1,
        },
        {
          id: "asset-3",
          name: "场景 - 竹林小径",
          kind: "location",
          description: "开篇重要场景",
          version: 1,
        },
      ];

      const filteredAssets = MOCK_ASSETS.filter((a) => a.kind === assetType);

      // ---- AssetCard（资产网格卡片，3.1 阶段）----
      function AssetCard({ asset, onSelect }) {
        return h(
          "div",
          {
            onClick: () => {
              if (typeof onSelect === "function") onSelect(asset);
            },
            style: {
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              width: "140px",
              padding: "12px",
              border: "1px solid var(--dsw-alias-stroke-muted, #e5e5e5)",
              borderRadius: "8px",
              background: "var(--dsw-alias-bg-surface, #fff)",
              cursor: "pointer",
            },
          },
          [
            // 缩略图占位
            h(
              "div",
              {
                style: {
                  width: "100%",
                  height: "100px",
                  borderRadius: "6px",
                  background: "var(--dsw-alias-bg-layer-default, #fafafa)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--dsw-alias-fg-muted, #888)",
                  fontSize: 12,
                },
              },
              "无缩略图",
            ),
            h(
              "span",
              {
                style: {
                  fontWeight: 600,
                  fontSize: 13,
                  color: "var(--dsw-alias-fg-default, #111)",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  minWidth: 0,
                  textAlign: "center",
                },
              },
              asset.name,
            ),
            h(Tag, { active: false, label: asset.kind }),
            h(
              "span",
              {
                style: {
                  fontSize: 11,
                  color: "var(--dsw-alias-fg-subtle, #666)",
                },
              },
              `v${asset.version}`,
            ),
          ],
        );
      }

      // ---- ProjectRow（项目列表行，2.1 阶段）----
      // 每行显示：项目名（加粗）+ 类型标签 + 一句话梗概（1 行溢出省略）+ 创建时间 + 最后修改时间。
      // 悬停高亮；选中后背景加深。
      function ProjectRow({ project, selected, onSelect }) {
        const [hovered, setHovered] = React.useState(false);
        const name = project.name || "未命名项目";
        const genre = project.genre || "无类型";
        const logline = project.logline || "";
        const createdAt = project.createdAt ? new Date(project.createdAt).toLocaleString() : "";
        const updatedAt = project.updatedAt ? new Date(project.updatedAt).toLocaleString() : "";

        return h(
          "li",
          {
            key: project.id,
            onClick: () => {
              if (typeof onSelect === "function") onSelect(project.id);
            },
            onMouseEnter: () => setHovered(true),
            onMouseLeave: () => setHovered(false),
            style: {
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 12px",
              borderBottom: "1px solid var(--dsw-alias-stroke-muted, #f0f0f0)",
              fontSize: 14,
              color: "var(--dsw-alias-fg-default, #111)",
              cursor: "pointer",
              background: selected
                ? "var(--dsw-alias-bg-accent, #eef6ff)"
                : hovered
                  ? "var(--dsw-alias-bg-layer-default, #fafafa)"
                  : "var(--dsw-alias-bg-surface, #fff)",
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
                  gap: "4px",
                },
              },
              [
                h(
                  "div",
                  {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
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
                      name,
                    ),
                    h(Tag, { active: false, label: genre }),
                  ],
                ),
                logline
                  ? h(
                      "p",
                      {
                        style: {
                          margin: 0,
                          fontSize: 12,
                          color: "var(--dsw-alias-fg-muted, #888)",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                          minWidth: 0,
                        },
                      },
                      logline,
                    )
                  : null,
              ],
            ),
            h(
              "div",
              {
                style: {
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: "2px",
                  fontSize: 12,
                  color: "var(--dsw-alias-fg-subtle, #666)",
                  whiteSpace: "nowrap",
                },
              },
              [
                h("span", null, createdAt),
                h("span", null, updatedAt),
              ],
            ),
          ],
        );
      }

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
              h(Pill, {
                active: activeTab === "project",
                onClick: () => handleTabSwitch("project"),
              }, "项目"),
              h(Pill, {
                active: activeTab === "asset",
                onClick: () => handleTabSwitch("asset"),
              }, "资产"),
            ],
          ),
        ],
      );

      const content = activeTab === "asset"
        ? h(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: "12px" } },
            [
              // 资产类型横向 Tab
              h(
                "div",
                { style: { display: "flex", gap: "6px" } },
                [
                  h(Pill, {
                    active: assetType === "character",
                    onClick: () => setAssetType("character"),
                  }, "角色"),
                  h(Pill, {
                    active: assetType === "location",
                    onClick: () => setAssetType("location"),
                  }, "场景"),
                  h(Pill, {
                    active: assetType === "prop",
                    onClick: () => setAssetType("prop"),
                  }, "物品"),
                ],
              ),
              // 资产网格（2-3 列自适应）
              h(
                "div",
                {
                  style: {
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                    gap: "12px",
                  },
                },
                filteredAssets.length > 0
                  ? filteredAssets.map((a) =>
                      h(AssetCard, { key: a.id, asset: a, onSelect: (a) => { setSelectedAsset(a); setShowAssetDetail(true); } }),
                    )
                  : h(
                      "div",
                      {
                        style: {
                          padding: "24px 0",
                          color: "var(--dsw-alias-fg-muted, #888)",
                          fontSize: 13,
                          textAlign: "center",
                        },
                      },
                      "暂无资产，点击“新建资产”创建",
                    ),
              ),
            ],
          )
        : h(
            "ul",
            { style: { listStyle: "none", padding: 0, margin: 0 } },
            projects.map((p) => {
              const selected = selectedProjectId === p.id;
              return h(ProjectRow, {
                key: p.id,
                project: p,
                selected,
                onSelect: onSelectProject,
              });
            }),
          );

      return h(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 0 } },
        [
          header,
          content,
          // 底部按钮（按当前模式显示）
          activeTab === "project"
            ? h(
                "div",
                { style: { marginTop: "12px", display: "flex", justifyContent: "flex-end" } },
                [
                  h(Button, {
                    onClick: () => setShowCreateModal(true),
                    variant: "primary",
                  }, "新建项目"),
                ],
              )
            : h(
                "div",
                { style: { marginTop: "12px", display: "flex", justifyContent: "flex-end" } },
                [
                  h(Button, {
                    onClick: () => {
                      setCreateAssetForm({ name: "", description: "" });
                      setShowCreateAssetModal(true);
                    },
                    variant: "primary",
                  }, "新建资产"),
                ],
              ),
          // 新建项目弹窗（仅项目模式）
          activeTab === "project" && showCreateModal
            ? h(
                Modal,
                {
                  open: true,
                  onClose: () => setShowCreateModal(false),
                  title: "新建项目",
                  closeLabel: "关闭新建项目",
                },
                [
                  h(
                    "div",
                    { style: { display: "flex", flexDirection: "column", gap: "12px" } },
                    [
                      h(Input, {
                        value: createForm.name,
                        onChange: (e) =>
                          setCreateForm({ ...createForm, name: e.target.value }),
                        placeholder: "项目名称",
                      }),
                      h(Input, {
                        value: createForm.genre,
                        onChange: (e) =>
                          setCreateForm({ ...createForm, genre: e.target.value }),
                        placeholder: "类型（可选）",
                      }),
                      h(Input, {
                        value: createForm.logline,
                        onChange: (e) =>
                          setCreateForm({ ...createForm, logline: e.target.value }),
                        placeholder: "一句话梗概（可选）",
                      }),
                      h(
                        "div",
                        {
                          style: {
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: "8px",
                            marginTop: "8px",
                          },
                        },
                        [
                          h(Button, {
                            onClick: () => setShowCreateModal(false),
                          }, "取消"),
                          h(Button, {
                            onClick: () => {
                              if (!createForm.name?.trim()) return;
                              onCreateProject({
                                ...createForm,
                                name: createForm.name.trim(),
                              });
                            },
                            variant: "primary",
                          }, "保存"),
                        ],
                      ),
                    ],
                  ),
                ],
              )
            : null,
          // 资产详情占位弹窗（仅资产模式）
          activeTab === "asset" && showAssetDetail
            ? h(
                Modal,
                {
                  open: true,
                  onClose: () => setShowAssetDetail(false),
                  title: "资产详情",
                  closeLabel: "关闭资产详情",
                },
                [
                  h(
                    "div",
                    { style: { display: "flex", flexDirection: "column", gap: "12px" } },
                    [
                      h("p", null, selectedAsset
                        ? `名称：${selectedAsset.name}`
                        : "未选择资产"),
                      h("p", null, selectedAsset ? `类型：${selectedAsset.kind}` : ""),
                      h("p", null, selectedAsset ? `描述：${selectedAsset.description}` : ""),
                      h("p", null, selectedAsset ? `版本：v${selectedAsset.version}` : ""),
                      h(
                        "div",
                        {
                          style: {
                            display: "flex",
                            justifyContent: "flex-end",
                            marginTop: "8px",
                          },
                        },
                        [
                          h(Button, {
                            onClick: () => setShowAssetDetail(false),
                          }, "关闭"),
                        ],
                      ),
                    ],
                  ),
                ],
              )
            : null,
          // 新建资产弹窗（仅资产模式）
          activeTab === "asset" && showCreateAssetModal
            ? h(
                Modal,
                {
                  open: true,
                  onClose: () => setShowCreateAssetModal(false),
                  title: "新建资产",
                  closeLabel: "关闭新建资产",
                },
                [
                  h(
                    "div",
                    { style: { display: "flex", flexDirection: "column", gap: "12px" } },
                    [
                      h(Input, {
                        value: createAssetForm.name,
                        onChange: (e) =>
                          setCreateAssetForm({ ...createAssetForm, name: e.target.value }),
                        placeholder: "资产名称",
                      }),
                      h(Input, {
                        value: createAssetForm.description,
                        onChange: (e) =>
                          setCreateAssetForm({
                            ...createAssetForm,
                            description: e.target.value,
                          }),
                        placeholder: "资产描述（可选）",
                      }),
                      h(
                        "div",
                        {
                          style: {
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: "8px",
                            marginTop: "8px",
                          },
                        },
                        [
                          h(Button, {
                            onClick: () => setShowCreateAssetModal(false),
                          }, "取消"),
                          h(Button, {
                            onClick: () => {
                              if (!createAssetForm.name?.trim()) return;
                              setShowCreateAssetModal(false);
                              setCreateAssetForm({ name: "", description: "" });
                              // 3.1 阶段为 Mock 数据，不持久化，刷新后重置
                              alert(`已新建资产：${createAssetForm.name.trim()}（Mock，不持久化）`);
                            },
                            variant: "primary",
                          }, "保存"),
                        ],
                      ),
                    ],
                  ),
                ],
              )
            : null,
        ],
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
    function RightBoard({ chapter, chapters, shots, onChapterChange }) {
      const currentChapter = chapters.find((c) => c.title === chapter) || chapters[0];
      const [selectedShotId, setSelectedShotId] = useState(null);
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
            // 章节标题
            h("h4", { style: { margin: "0 0 6px 0", fontSize: 13, color: "var(--dsw-alias-fg-default, #111)" } }, currentChapter?.title || chapter || "第 1 章"),
            // 一句话梗概
            currentChapter?.synopsis
              ? h("p", { style: { margin: "0 0 8px 0", fontSize: 13, color: "var(--dsw-alias-fg-default, #111)" } }, currentChapter.synopsis)
              : h("p", { style: { margin: "0 0 8px 0", fontSize: 13, color: "var(--dsw-alias-fg-muted, #888)" } }, "暂无一句话梗概。"),
            // 关键节拍列表
            h("div", { style: { fontSize: 13, color: "var(--dsw-alias-fg-default, #111)" } }, "关键节拍："),
            currentChapter?.beats?.length
              ? h(
                  "ul",
                  { style: { margin: "0 0 0 0", paddingLeft: "16px" } },
                  currentChapter.beats.map((beat, i) => h("li", { key: i, style: { marginBottom: "4px", fontSize: 13, color: "var(--dsw-alias-fg-default, #111)" } }, beat)),
                )
              : h("p", { style: { margin: "4px 0 0 0", fontSize: 13, color: "var(--dsw-alias-fg-muted, #888)" } }, "暂无节拍内容。"),
          ]),
          h(CollapsibleSection, { title: "世界观与人物设定" }, [
            // 阶段 1 静态占位：展示当前项目资产设定摘要（角色、场景、物品、风格包）
            h("div", { style: { fontSize: 13, color: "var(--dsw-alias-fg-default, #111)" } }, "角色："),
            h("p", { style: { margin: "0 0 8px 0", fontSize: 13, color: "var(--dsw-alias-fg-muted, #888)" } }, "林夕——故事主角，年轻剑客，性格直率，擅长青龙剑。"),
            h("div", { style: { fontSize: 13, color: "var(--dsw-alias-fg-default, #111)" } }, "场景："),
            h("p", { style: { margin: "0 0 8px 0", fontSize: 13, color: "var(--dsw-alias-fg-muted, #888)" } }, "竹林小径——开篇重要场景，翠竹掩映，溪水潺潺。"),
            h("div", { style: { fontSize: 13, color: "var(--dsw-alias-fg-default, #111)" } }, "物品："),
            h("p", { style: { margin: "0 0 8px 0", fontSize: 13, color: "var(--dsw-alias-fg-muted, #888)" } }, "青龙剑——主角随身武器，传说可斩妖除魔。"),
            h("div", { style: { fontSize: 13, color: "var(--dsw-alias-fg-default, #111)" } }, "风格包："),
            h("p", { style: { margin: "0 0 0 0", fontSize: 13, color: "var(--dsw-alias-fg-muted, #888)" } }, "暂无风格包设定。"),
          ]),
          h(CollapsibleSection, { title: "分镜脚本表格" }, [
            h("div", { style: { fontSize: 13, color: "var(--dsw-alias-fg-default, #111)" } }, "本章镜头列表："),
            h(
              "div",
              { style: { overflowX: "auto", marginTop: "8px" } },
              h(
                "table",
                {
                  style: {
                    width: "max-content",
                    minWidth: "100%",
                    borderCollapse: "collapse",
                    fontSize: "12px",
                  },
                },
                [
                  h("thead", null,
                    h(
                      "tr",
                      {
                        style: {
                          background: "var(--dsw-alias-bg-layer-default, #fafafa)",
                          borderBottom: "1px solid var(--dsw-alias-stroke-muted, #e5e5e5)",
                        },
                      },
                      [
                        h("th", { style: { padding: "6px 8px", textAlign: "left", fontWeight: 600, color: "var(--dsw-alias-fg-muted, #888)" } }, "编号"),
                        h("th", { style: { padding: "6px 8px", textAlign: "left", fontWeight: 600, color: "var(--dsw-alias-fg-muted, #888)" } }, "时长(秒)"),
                        h("th", { style: { padding: "6px 8px", textAlign: "left", fontWeight: 600, color: "var(--dsw-alias-fg-muted, #888)" } }, "景别/角度"),
                        h("th", { style: { padding: "6px 8px", textAlign: "left", fontWeight: 600, color: "var(--dsw-alias-fg-muted, #888)" } }, "运镜"),
                        h("th", { style: { padding: "6px 8px", textAlign: "left", fontWeight: 600, color: "var(--dsw-alias-fg-muted, #888)" } }, "画面描述"),
                        h("th", { style: { padding: "6px 8px", textAlign: "left", fontWeight: 600, color: "var(--dsw-alias-fg-muted, #888)" } }, "角色/动作"),
                        h("th", { style: { padding: "6px 8px", textAlign: "left", fontWeight: 600, color: "var(--dsw-alias-fg-muted, #888)" } }, "台词/旁白"),
                        h("th", { style: { padding: "6px 8px", textAlign: "left", fontWeight: 600, color: "var(--dsw-alias-fg-muted, #888)" } }, "音效/音乐"),
                        h("th", { style: { padding: "6px 8px", textAlign: "left", fontWeight: 600, color: "var(--dsw-alias-fg-muted, #888)" } }, "资产绑定"),
                        h("th", { style: { padding: "6px 8px", textAlign: "left", fontWeight: 600, color: "var(--dsw-alias-fg-muted, #888)" } }, "状态"),
                      ],
                    ),
                  ),
                  h(
                    "tbody",
                    null,
                    shots.length > 0
                      ? shots.map((s) => {
                          const selected = selectedShotId === s.id;
                          const statusStyle = {
                            done: { bg: "#eef6ff", color: "#0066cc" },
                            pending: { bg: "#f5f5f5", color: "#888" },
                            review: { bg: "#fff3cd", color: "#856404" },
                          }[s.status] || { bg: "#f5f5f5", color: "#888" };
                          return h(
                            "tr",
                            {
                              key: s.id,
                              onClick: () => setSelectedShotId(s.id),
                              style: {
                                borderBottom: "1px solid var(--dsw-alias-stroke-muted, #f0f0f0)",
                                background: selected
                                  ? "var(--dsw-alias-bg-accent, #eef6ff)"
                                  : "var(--dsw-alias-bg-surface, #fff)",
                                cursor: "pointer",
                              },
                            },
                            [
                              h("td", { style: { padding: "6px 8px", fontSize: 12 } }, s.no),
                              h("td", { style: { padding: "6px 8px", fontSize: 12 } }, s.durationSec),
                              h("td", { style: { padding: "6px 8px", fontSize: 12 } }, s.type),
                              h("td", { style: { padding: "6px 8px", fontSize: 12 } }, s.camera),
                              h("td", { style: { padding: "6px 8px", fontSize: 12, color: "var(--dsw-alias-fg-muted, #888)" } }, s.description),
                              h("td", { style: { padding: "6px 8px", fontSize: 12 } }, s.characters),
                              h("td", { style: { padding: "6px 8px", fontSize: 12, color: "var(--dsw-alias-fg-muted, #888)" } }, s.dialogue || "—"),
                              h("td", { style: { padding: "6px 8px", fontSize: 12 } }, s.audio),
                              h("td", { style: { padding: "6px 8px", fontSize: 12 } }, s.assetBindings.length ? s.assetBindings.join(",") : "—"),
                              h(
                                "td",
                                { style: { padding: "6px 8px" } },
                                h(
                                  "span",
                                  {
                                    style: {
                                      display: "inline-block",
                                      padding: "2px 8px",
                                      borderRadius: "4px",
                                      background: statusStyle.bg,
                                      color: statusStyle.color,
                                      fontSize: 11,
                                    },
                                  },
                                  s.status === "done" ? "完成" : s.status === "pending" ? "排队" : "待审核",
                                ),
                              ),
                            ],
                          );
                        })
                      : h(
                          "tr",
                          null,
                          h("td", {
                            colSpan: 10,
                            style: {
                              padding: "24px 0",
                              color: "var(--dsw-alias-fg-muted, #888)",
                              textAlign: "center",
                              fontSize: 13,
                            },
                          }, "本章暂无镜头。"),
                        ),
                  ),
                ],
              ),
            ),
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
      // 4.1 阶段：章节 Mock 数据（Host chapters API 待补齐后切换到真实接口）
      const [chapters, setChapters] = useState([
        {
          id: "chapter-1",
          title: "第 1 章",
          synopsis: "主角发现神秘遗迹，踏上寻宝之旅。",
          beats: ["遗迹入口发现", "遇到首个守护者", "获得线索碎片"],
        },
        {
          id: "chapter-2",
          title: "第 2 章",
          synopsis: "主角深入遗迹内部，揭开历史真相。",
          beats: ["地下密室探索", "解读古老壁画", "面对最终抉择"],
        },
        {
          id: "chapter-3",
          title: "第 3 章",
          synopsis: "主角带着秘密返回故乡，迎接新的挑战。",
          beats: ["返回故乡", "与旧识重逢", "新危机爆发"],
        },
      ]);
      // 6.1 阶段：分镜脚本 Mock 数据（Host shots API 待补齐后切换到真实接口）
      const [shots, setShots] = useState([
        {
          id: "shot-1",
          no: 1,
          durationSec: 5,
          type: "全景 / 正面",
          camera: "推镜头",
          description: "主角站在遗迹入口，环顾四周。",
          characters: "林夕",
          dialogue: "",
          audio: "风声",
          assetBindings: [],
          status: "done",
        },
        {
          id: "shot-2",
          no: 2,
          durationSec: 8,
          type: "中景 / 侧面",
          camera: "静止",
          description: "主角走向守护者，拔出青龙剑。",
          characters: "林夕，守护者",
          dialogue: "挡住我的路，我就不客气了。",
          audio: "剑鸣",
          assetBindings: ["青龙剑"],
          status: "pending",
        },
        {
          id: "shot-3",
          no: 3,
          durationSec: 6,
          type: "近景 / 45度",
          camera: "跟随",
          description: "青龙剑斩击，光芒闪过。",
          characters: "林夕",
          dialogue: "",
          audio: "砍击声",
          assetBindings: ["青龙剑"],
          status: "review",
        },
      ]);
      const [showCreateModal, setShowCreateModal] = useState(false);
      const [createForm, setCreateForm] = useState({ name: "", genre: "", logline: "" });

      // ---- 数据获取（带卸载标志，避免在已卸载组件上 setState）----
      // 沿用 CapturePanel 的 active 模式：异步请求完成前若组件已卸载，
      // 则不再执行 setState，避免 React 对已卸载组件的状态更新警告。
      const activeRef = React.useRef(true);

      const fetchProjects = async () => {
        try {
          const result = await fetchState();
          if (!activeRef.current) return;
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
          if (!activeRef.current) return;
          setState((s) => ({
            ...s,
            error: String(e?.message ?? e),
            loading: false,
          }));
        }
      };

      useEffect(() => {
        activeRef.current = true;
        fetchProjects();
        return () => {
          activeRef.current = false;
        };
      }, []);

      const handleSelectProject = (id) => { setSelectedProjectId(id); };
      const handleTabChange = (tab) => { setActiveTab(tab); };
      const handleChapterChange = (nextChapter) => { setChapter(nextChapter); };

      // ---- 新建项目：提交 POST /api/capture/projects，成功后刷新列表并清空表单 ----
      const handleCreateProject = async (form) => {
        try {
          const result = await createProject(form);
          if (result?.ok) {
            setShowCreateModal(false);
            setCreateForm({ name: "", genre: "", logline: "" });
            await fetchProjects();
          } else {
            alert(result?.error || "创建项目失败");
          }
        } catch (e) {
          console.error("[capture] createProject failed:", e);
          alert("创建项目失败：" + String(e?.message ?? e));
        }
      };

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
                    showCreateModal,
                    setShowCreateModal,
                    createForm,
                    setCreateForm,
                    onCreateProject: handleCreateProject,
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
                [h(RightBoard, { chapter, chapters, shots, onChapterChange: handleChapterChange })],
              ),
            ],
          ),
        ],
      );
    }

    return StudioPanel;
  },
});
