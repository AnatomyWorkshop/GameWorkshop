# Text 游玩页悬浮数据面板：WE 引擎驱动 + 创作者声明 UI + Regex Token 渲染

> 版本：2026-04-12 v2（补充 WE 引擎集成路径 + platform 层缺口分析）

目标：在 Text 游玩页右上角提供悬浮窗按钮，点击后呈现自由悬浮窗，UI/规格/呈现信息改编自 MVU 设计但完全通过 WE 引擎数据驱动。

- 简单游戏（如 Victoria）：一行数值条或极简面板，不打扰叙事。
- 复杂游戏（如"绿茵好莱坞"）：创作者自定义图标入口 + 可移动/可常驻的展示页。
- 正则渲染（如 `<time>...</time>`）：走"token 化 + 组件渲染"的安全路径，不执行任意脚本。

---

## 1. WE 引擎现有能力盘点（2026-04-12）

### 1.1 每回合数据下发

WE 引擎在每次 turn/stream 响应中已经下发：

| 字段 | 类型 | 说明 |
|------|------|------|
| `Variables` | `map[string]any` | 完整合并变量快照（`sandbox.Flatten()`，5 层级联） |
| `Narrative` | `string` | AI 生成叙事文本 |
| `Options` | `[]string` | 玩家选项 |
| `VN` | `*VNDirectives` | 可选 VN 指令（仅 VN 模式） |
| `TokenUsed` | `int` | LLM token 消耗 |
| `FloorID` / `PageID` | `string` | 回合/页面标识 |

**已有但不在 turn 响应中的数据：**

| 数据 | 获取方式 | 说明 |
|------|---------|------|
| `ui_config` | `GET /api/play/games/:slug` | 游戏详情中的 `Config.UIConfig` |
| 变量快照 | `GET /api/play/sessions/:id/variables` | 独立拉取 |
| 历史回合 | `GET /api/play/sessions/:id/floors` | 含所有过往叙事/选项 |
| 记忆条目 | `GET /api/play/sessions/:id/memories` | fact/summary/open_loop |
| 变量修改 | `PATCH /api/play/sessions/:id/variables` | 前端可直接写入 chat scope |

### 1.2 变量系统

5 层级联 sandbox（Page → Floor → Branch → Chat → Global），`Flatten()` 合并后下发。前端拿到的始终是扁平 `map[string]any`，渲染层自行按前缀分组。

**结论：变量数据完全够用，面板所需的所有数值/状态都可以从 `Variables` 字段直接读取。**

### 1.3 Regex 处理器

当前 `processor/regex.go` 仅做文本替换（`ApplyToUserInput` / `ApplyToAIOutput`），不产出结构化数据。

**缺口：无法从 AI 输出中提取 `<time>...</time>` 等标签为结构化 token。**

### 1.4 宏系统

`macros/expand.go` 支持 `{{char}}`/`{{user}}`/`{{persona}}`/`{{getvar::key}}`/`{{time}}`/`{{date}}`。在 Pipeline 组装时调用，展开后的文本进入 prompt。

**结论：宏系统与面板无直接关系，但 `{{getvar::key}}` 确保了 prompt 中可以引用变量值。**

---

## 2. Text 游戏如何使用 WE 引擎驱动悬浮面板

### 2.1 数据流架构

```
创作者声明 ui_config（游戏包）
        ↓
WE 后端存储在 GameTemplate.Config.UIConfig
        ↓
前端加载游戏时 GET /api/play/games/:slug 获取 ui_config
        ↓
每回合 turn/stream 响应携带 Variables（完整快照）
        ↓
前端根据 ui_config 声明 + Variables 数据渲染悬浮面板
```

**核心原则：后端只负责数据（变量 + 配置），前端只负责渲染（面板 + 样式）。**

### 2.2 面板数据来源映射

| 面板需求 | WE 数据来源 | 获取方式 |
|---------|-----------|---------|
| 角色属性/数值 | `Variables["力量"]` 等 | turn 响应 `Variables` 字段 |
| 金币/资源 | `Variables["总资产.金币"]` | turn 响应 `Variables` 字段 |
| 当前位置/时间 | `Variables["当前地点"]` | turn 响应 `Variables` 字段 |
| 叙事标签（时间/地点） | AI 输出中的 `<time>` 标签 | 需要 regex token 提取（见 §6） |
| 面板布局/样式 | `ui_config.floating_panels` | 游戏加载时一次性获取 |
| 历史摘要 | memories API | `GET /sessions/:id/memories` |
| 调试信息（延迟/token） | `TokenUsed` + 前端计时 | turn 响应 |

### 2.3 前端渲染流程（每回合）

```
1. 收到 turn 响应（含 Variables + Narrative + Options）
2. 从缓存的 ui_config 读取面板声明
3. 按声明过滤 Variables → 面板数据
4. 如果有 narrative_tags 声明 → 从 Narrative 提取 token（前端 regex）
5. 渲染：叙事区 + 选项区 + 悬浮面板（overlay，不挤压叙事流）
```

---

## 3. 总体原则

- 创作者优先：未声明则不展示，避免"默认 UI 绑架所有游戏"。
- 数据/样式/逻辑分离：
  - 数据：后端提供 `Variables`（每回合）+ `ui_config`（一次性）。
  - 样式：前端内置封闭枚举（可新增，不修改旧枚举）。
  - 逻辑：不执行任意 JS/EJS；不让作者写循环/表达式脚本。
- WE 兼容：变量依旧是扁平 KV；任何"分组/聚合"仅发生在渲染层。
- 渐进增强：先把体系搭好（声明 → 渲染 → 交互）；拖拽/缩放/布局记忆后置。

---

## 4. UX：悬浮窗交互设计

进入游戏后：
- 右上角显示悬浮窗按钮（如 📊 或创作者自定义图标）。
- 若声明 `narrative_tags`：默认常驻显示（顶端叙事标签条）。
- 若声明 `stats_bar` / `stats_panel`：默认常驻或按配置默认折叠。
- 若声明 `floating_panels`：显示创作者提供的图标入口。
- 若完全无声明：不显示任何数据 UI；按钮点击仅打开"更多/技术信息"。

交互规则：
- hover：临时显示（不改变 pinned 状态）。
- click：切换 pinned（固定/取消）。
- pinned 时再次 click：关闭（恢复纯叙事流）。

悬浮窗特性：
- 自由拖拽（v1 可先固定位置，v2 加 draggable）。
- 不遮挡输入区（z-index 分层，输入区始终可达）。
- 移动端：底部抽屉替代悬浮窗（响应式降级）。

---

## 5. 概念模型：variables / tokens / panels / launchers

### 5.1 variables（WE 变量）
- 形态：`map[string]any`（扁平化 key，5 层级联合并）。
- 示例：`"总资产.金币": 12`、`"当前地点": "临湖宅邸"`。
- 来源：每回合 turn 响应的 `Variables` 字段，无需额外请求。

### 5.2 tokens（叙事标签/内联标签）
用于把 `<time>...</time>` 这类标记变成结构化信息，不依赖 HTML 注入。

token 结构：
```json
{
  "type": "time",
  "text": "临湖宅邸 2025年5月11日 星期日 18:15",
  "style": "gold",
  "placement": ["top_bar"]
}
```

提取策略（见 §6 详述）：
- v0：前端 regex 提取（零后端改动，立即可用）。
- v1：后端 regex processor 扩展，产出结构化 `tokens[]`。

### 5.3 panels（展示页/浮窗）
面板是"展示容器"，不承担复杂交互（交互尽量放回消息流里的按钮/选项）。

面板来源：
- **preset（推荐）**：前端内置几种固定面板类型（稳定、可维护）。
- **layout DSL（进阶）**：作者声明一个"可组合的展示树"，由前端用 primitives 渲染。

### 5.4 launchers（创作者图标入口）
launcher 能声明：
- icon（emoji / 简单 SVG 名称 / 资源路径）
- 位置（topbar / panel_toolbar / message_meta）
- 默认行为（toggle / open-only）

---

## 6. 游戏包声明（ui_config）

已有字段：`ui_config.stats_bar.items`（Victoria 已在用）。

完整声明结构：

```json
{
  "ui_config": {
    "narrative_tags": {
      "items": [
        { "id": "time", "source": "token", "token_type": "time", "style": "gold" },
        { "id": "loc", "source": "var", "key": "当前地点", "style": "muted" }
      ]
    },
    "stats_panel": {
      "enabled": true,
      "position": "top_overlay",
      "style": "labels",
      "order": ["存活天数", "当前位置", "金币", "银币", "铜币"]
    },
    "floating_panels": {
      "panels": [
        {
          "id": "phone",
          "type": "preset",
          "preset": "phone_status",
          "default_open": false,
          "default_pinned": true,
          "launcher": { "icon": "📱", "placement": "topbar" }
        },
        {
          "id": "character",
          "type": "preset",
          "preset": "character_sheet",
          "default_open": false,
          "launcher": { "icon": "👤", "placement": "topbar" }
        }
      ]
    },
    "token_extract_rules": [
      { "tag": "time", "style": "gold", "placement": ["top_bar"] },
      { "tag": "location", "style": "muted", "placement": ["top_bar"] },
      { "tag": "status", "style": "info", "placement": ["panel:phone"] }
    ]
  }
}
```

### 6.1 stats_panel
封闭枚举保证长期稳定：
- `position`: `top_overlay | right_float | center_sheet | none`
- `style`: `labels | bars | card | text | minimal`
- `order/hide`: 控制展示顺序与过滤（仍基于扁平 key）

### 6.2 floating_panels：预设优先
预设至少包含：
- `phone_status`：模拟"绿茵好莱坞"的手机信息面板（展示变量 + 叙事摘要）。
- `character_sheet`：角色属性面板（按前缀分组展示变量）。
- `telemetry_debug`：延迟/token_usage/provider 等调试信息。

layout DSL（后续）只允许 primitives：
- `value` / `badge` / `progress` / `table` / `list` / `radar5`
- 每个 node 只能绑定 `var.key` 或 `token.type`，不允许任意表达式执行。

### 6.3 token_extract_rules（新增）
创作者声明哪些 XML 标签需要从叙事文本中提取为结构化 token：
- `tag`：匹配 `<tag>...</tag>`
- `style`：渲染样式
- `placement`：展示位置（`top_bar` / `panel:id`）

前端用这些规则对 Narrative 做 regex 提取，无需后端改动。

---

## 7. Regex 渲染：从"替换字符串"升级为"token 化 + 安全清理"

### 7.1 当前 WE regex 能力

`processor/regex.go` 支持 `ApplyToUserInput` / `ApplyToAIOutput`，纯文本替换。规则结构：
```go
RegexRule { Pattern, Replacement, ApplyTo, Enabled }
```

### 7.2 Token 提取策略

**v0（前端提取，零后端改动）：**

前端收到 `Narrative` 后，根据 `ui_config.token_extract_rules` 做 regex 提取：

```typescript
function extractTokens(narrative: string, rules: TokenExtractRule[]): {
  tokens: NarrativeToken[];
  cleanText: string;
} {
  let clean = narrative;
  const tokens: NarrativeToken[] = [];
  for (const rule of rules) {
    const regex = new RegExp(`<${rule.tag}>([\\s\\S]*?)</${rule.tag}>`, 'g');
    let match;
    while ((match = regex.exec(clean)) !== null) {
      tokens.push({ type: rule.tag, text: match[1], style: rule.style, placement: rule.placement });
    }
    clean = clean.replace(regex, '');
  }
  return { tokens, cleanText: clean };
}
```

这个方案立即可用，不需要任何后端改动。

**v1（后端提取，结构化下发）：**

扩展 `processor/regex.go`，在 `ApplyToAIOutput` 之外新增 `ExtractTokens`：
- 输入：AI 原始输出 + `token_extract_rules`
- 输出：`tokens[]` + `clean_text`
- 在 turn 响应中新增 `Tokens` 字段

v1 的好处：前端不需要做 regex，数据更干净；但 v0 已经够用，v1 可以后置。

### 7.3 SillyTavern regex 三类用途的 WE 对应

| ST 用途 | WE 实现 |
|---------|---------|
| extract（提取标签） | `token_extract_rules` + 前端 regex |
| strip（移除占位符） | WE regex processor 已支持（`ApplyToAIOutput` 替换为空） |
| compat（占位符→面板） | `token_extract_rules` 的 `placement: "panel:id"` |

---

## 8. Platform 层缺口分析

### 8.1 已满足

| 需求 | 现有能力 | 状态 |
|------|---------|------|
| 变量数据 | `TurnResponse.Variables` / `StreamMeta.Variables` | ✅ 每回合下发 |
| ui_config | `GET /api/play/games/:slug` 返回 `Config.UIConfig` | ✅ 已有 |
| 变量独立查询 | `GET /api/play/sessions/:id/variables` | ✅ 已有 |
| 变量外部修改 | `PATCH /api/play/sessions/:id/variables` | ✅ 已有 |
| 历史回合 | `GET /api/play/sessions/:id/floors` | ✅ 已有 |
| 记忆条目 | `GET /api/play/sessions/:id/memories` | ✅ 已有 |

### 8.2 需要补充

| 缺口 | 优先级 | 说明 |
|------|--------|------|
| turn 响应中无 `Tokens` 字段 | 低（v0 前端提取即可） | v1 后端提取时再加 |
| regex processor 无 token 提取 | 低（v0 不需要） | v1 扩展 `ExtractTokens` |
| turn 响应中无 `telemetry` 结构 | 中 | 目前只有 `TokenUsed`，缺 latency/provider/model |
| 面板位置记忆 | 低 | 需要 per-user per-game 的 UI state 存储（可用 localStorage） |

### 8.3 建议的 platform 层补充（非阻塞，可后置）

**P-TELEMETRY（中优先级）：** 在 `TurnResponse` / `StreamMeta` 中新增 `Telemetry` 字段：
```go
type TurnTelemetry struct {
    LatencyMs    int64  `json:"latency_ms"`
    Provider     string `json:"provider"`
    Model        string `json:"model"`
    TokenUsed    int    `json:"token_used"`
    PromptTokens int    `json:"prompt_tokens"`
}
```

这让 `telemetry_debug` 面板有数据可展示，也方便创作者调试。

---

## 9. 前端实现：保持 Text 页轻量、模块化

把 Text 页数据展示拆成 3 个"宿主"：

1) **NarrativeTagsBarHost**：只渲染 tokens/少量 vars（常驻、很薄）。
2) **StatsPanelHost（📊）**：hover/点击 pin 的展示容器。
3) **FloatingPanelHost**：承载多个 panel window（未来可拖拽/缩放/记忆位置）。

关键约束：
- 所有 host 都是 overlay，不挤压叙事流。
- pointer-events 分层：外层不拦截滚动；只有面板本体可交互。

### 9.1 悬浮窗按钮设计

右上角固定位置，与现有 UI 不冲突：
```
┌─────────────────────────────────┐
│ [叙事标签条]              [📊][📱] │  ← 右上角按钮区
│                                 │
│         叙事文本区               │
│                                 │
│    ┌──────────────┐             │
│    │  悬浮面板     │             │  ← overlay，可拖拽
│    │  金币: 120   │             │
│    │  力量: 15    │             │
│    └──────────────┘             │
│                                 │
│ [选项1] [选项2] [选项3]          │
│ [输入框                        ] │
└─────────────────────────────────┘
```

### 9.2 组件结构

```
TextPlayPage
├── NarrativeTagsBarHost          ← ui_config.narrative_tags 驱动
│   └── TagChip[]                 ← 每个 token/var 一个 chip
├── FloatingButtonGroup           ← 右上角按钮组
│   ├── StatsToggle (📊)
│   └── LauncherButton[] (📱 等)  ← ui_config.floating_panels.launcher 驱动
├── NarrativeArea                 ← 叙事文本（cleanText，已移除 token 标签）
├── StatsPanelHost                ← ui_config.stats_panel 驱动
│   └── StatsPanel (overlay)
├── FloatingPanelHost             ← ui_config.floating_panels 驱动
│   └── FloatingPanel[] (overlay)
│       ├── PhoneStatusPreset
│       ├── CharacterSheetPreset
│       └── TelemetryDebugPreset
├── OptionsArea
└── InputArea
```

---

## 10. 候选开源库

### 10.1 拖拽/缩放
- react-rnd：拖拽 + resize 一体（快速落地）。
- @dnd-kit/core：更通用的拖拽框架（若要做"窗口管理/停靠"）。

### 10.2 浮层定位/可访问性
- @floating-ui/dom：popover/tooltip 定位（用于小提示/上下文菜单）。

### 10.3 快捷键
- react-hotkeys-hook：面板 toggle、pin/unpin、切换窗口。

---

## 11. 分阶段落地

### v0（前端即可完成，零后端改动）
- 加载游戏时从 `GET /api/play/games/:slug` 获取 `ui_config`。
- 每回合从 turn 响应读取 `Variables`。
- 前端根据 `token_extract_rules` 从 Narrative 提取 tokens + cleanText。
- 实现三宿主渲染（tags/stats/panels），无声明则不渲染。
- 📊 的 hover + pin UX 固化为通用行为。
- 悬浮窗固定位置 + 展开/收起。

### v1（后端小幅扩展）
- `TurnResponse` / `StreamMeta` 新增 `Telemetry` 字段。
- regex processor 扩展 `ExtractTokens`，后端产出 tokens。
- turn 响应新增 `Tokens` 字段（前端可切换为后端提取模式）。

### v2（面板能力增强）
- `floating_panels.preset` 增加 `phone_status` / `character_sheet`。
- 面板内容：变量 + 叙事摘要 + 关键条目。
- layout DSL primitives（value/badge/progress/table/list/radar5）。

### v3（可选增强）
- draggable/resizable + 位置记忆（localStorage per-game）。
- 面板聚焦与快捷键。
- 移动端底部抽屉降级。

---

## 12. 额外想法：提升玩家体验

### 12.1 变量变化动画
每回合对比前后 Variables diff，对变化的数值做高亮/闪烁动画（如金币 +10 时短暂绿色闪烁，HP -5 时红色闪烁）。这在前端完全可做，不需要后端支持。

### 12.2 面板主题跟随游戏
`ui_config` 可以声明面板主题色（`theme: "dark"` / `"cyberpunk"` / `"parchment"`），让面板视觉风格与游戏世界观一致。前端内置几套 CSS 变量即可。

### 12.3 叙事摘要面板
利用 WE 的 memories API，在面板中展示"到目前为止发生了什么"的结构化摘要。对于长篇游戏，玩家可以快速回顾关键事件而不需要翻历史。

### 12.4 变量趋势图
对数值型变量（金币、HP、好感度等）记录最近 N 回合的值，在面板中画一条迷你趋势线。前端用 `Variables` 历史 diff 即可实现，或者调用 `GET /sessions/:id/floors` 获取历史变量快照。

### 12.5 创作者预览模式
在创作中心提供"面板预览"功能，让创作者在编辑 `ui_config` 时实时看到面板效果。这可以用 mock Variables 数据驱动，不需要真正运行游戏。

---

## 13. 验收清单

- [ ] 未声明时：Text 页无任何额外 UI（除 📊 的"更多/提示"能力）。
- [ ] 扁平变量结构不变：仅渲染层分组，不引入嵌套存储。
- [ ] Regex 不产 HTML：只产 tokens/cleanText。
- [ ] 面板不会挤压叙事流：始终 overlay。
- [ ] 导入兼容：遇到 `<StatusPlaceHolderImpl/>` 这类占位符，能映射到 preset 面板。
- [ ] 所有面板数据来自 WE 引擎标准 API，无自定义后端接口。
- [ ] v0 阶段零后端改动即可运行。
