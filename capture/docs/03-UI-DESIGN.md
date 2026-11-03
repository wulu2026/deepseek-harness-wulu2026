# Capture — UI 设计 (03)



## 1. 设计哲学



- **	host look**: 与 DSH Settings/Plugin Manager 一致：卡片式列表、圆角 8px、token 配色.

- **Media-first**: Shot/asset cards prominently display thumbnail; text secondary.

- **Density**: medium; 信息-rich 但不 clutter.

- **Status via badge**: gen status, consistency warnings, asset usage.



## 2. Layout grid (overlay blade)



```

┌ Studio Panel (overlay, width 960px max) ─────────────────────────┐

│ [Header: Project picker + tabs + actions]                        │

├─ Left nav (220px) ─┬─ Main content (flex) ─┬─ Right detail (320) │

│  Projects           │                       │  (contextual)     │

│  Chapters           │                       │                   │

│  Shots              │                       │                   │

│  Assets             │                       │                   │

│  Generations        │                       │                   │

│  Trailers           │                       │                   │

└────────────────────┴───────────────────────┴─────────────────────┘

```



Tabs at top for cross-cutting: Project / Chapter / ShotList / Assets / GenQueue / Trailers; left nav shows sub-items within selected tab.



## 3. Color tokens



Use DSH theme tokens only:

- `--dsw-alias-bg-layer-default` (panel bg)

- `--dsw-alias-bg-layer-raised` (cards)

- `--dsw-alias-fg-default`, `--dsw-alias-fg-muted`

- `--dsw-alias-stroke-default`

- `--dsw-alias-accent-default`

- `--dsw-alias-warning-default`, `--dsw-alias-danger-default`, `--dsw-alias-success-default`



Artwork (icons/thumbnails) may use literal colors.



## 4. Typography



- H1 18px/24; H2 16/22; body 14/20; caption 12/16.

- Font: inherit from DSH.



## 5. Components (specs)



### 5.1 ProjectCard

- Header: name (H2) + genre chip + count.

- Body: logline (2 lines) + last activity.

- Footer: Open, Fork, Export.



### 5.2 ChapterEditor

- Title input (H2 style).

- Body markdown editor (toolbar: bold/italic/heading/list/quote).

- Beats sidebar: reorderable list, drag handle.

- Assets referenced pills.



### 5.3 ShotCard (grid)

- Thumbnail area 16:9 (placeholder with type icon if no still).

- Number badge top-left, duration top-right.

- Title/description 2 lines.

- Asset chips bottom.

- Gen status dot.

- Hover: play preview (if video exists).



### 5.4 ShotDetailDrawer

- Fields: Order, Type (select), Duration (slider sec), Description (textarea), Dialogue (speaker + text), Camera (shot size/angle/movement), Transition, SFX/music.

- Asset bindings: chips with add/remove.

- Generation: Generate still / video; params accordion.

- Variants: list + diff.



### 5.5 AssetCard

- Thumbnail (square) + name + kind badge + version.

- Usage count chip.



### 5.6 AssetDetail

- Traits form (depends on kind).

- Reference images (upload, reorder, delete).

- Identity lock prompt (editable, "Regenerate lock" button).

- Usage list (shots) with jump.

- Version history.



### 5.7 GenerationJobRow

- Kind icon + source label + progress bar + cancel/retry.

- Output previews thumbnail.



### 5.8 TrailerTimeline (simple)

- Horizontal chips of beats with duration; total duration.

- Style selector; title cards editor.

- Preview player (native <video>).

- Export button.



### 5.9 Empty states

- "No projects yet — create one with /story new or click Create".

- All lists follow DSH empty-state style (icon + text + primary action).



### 5.10 Status/badges

- Gen queued (gray) / running (accent spinner) / done (success) / failed (danger) / cancelled (muted).

- Consistency warning (warning dot + tooltip).

- Asset reuse count.



## 6. Icons & assets



- Original simple SVG icon for plugin (reuse? invent new one; no copied branded). Provide `icon.svg` package root.

- Shot type icons: minimal SVG set (custom, not dependency).

- No raster unless as generated media.



## 7. Localization



- Locale JSON (`locale/en.json`, `locale/zh.json`) for all UI text incl. meta title/description.

- Use DSH `ctx.locale` service (client).



## 8. Motion



- Use DSH AnimatedRows for lists where appears.

- No custom layout observers.

- Reduced motion respected.



## 9. Validation



- Light/dark screenshots side-by-side (when browser control available).

- No literal colors except artwork.

- Check slot rendering no crash.
