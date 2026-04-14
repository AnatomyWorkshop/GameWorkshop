# Text 游玩页设计计划

> 版本：2026-04-13 v4（补充已知缺陷与修复优先级）
> 范围：Text 游玩页的完整视觉与交互设计，包括渲染体系、主题系统、悬浮数据面板、布局结构。
> 参考：SillyTavern power-user.js / style.css、PLAN-FLOATING-DATA-PANEL-AND-REGEX.md、from-v0-dev

---

## 零、已知缺陷清单（2026-04-13 实测）

> 优先级：🔴 阻塞体验 / 🟡 影响功能 / 🟢 优化项

### 🔴 P0 — 阻塞性问题

| 问题 | 根因 | 修复方向 |
|---|---|---|
| 世界书抽屉打不开 / 数据面板不渲染 | `GET /play/sessions/:id` 后端接口缺失，`useSession` 永远返回 404，`game_id` 拿不到，`useGame` 不触发，`ui_config` 为空 | 后端已加接口（需重启），前端 `Session` 类型补 `variables` 字段 |
| 浮窗按钮错位 + 出现两个 | `FloatingPanelHost` launcher 按钮用 `fixed top-12 right-3` 硬编码定位，与 TopBar 按钮重叠；且 `panels` 数组有两个 panel（phone + stats），各自渲染一个 launcher | 改为注入 TopBar 右侧按钮区（通过 props 传 `extraButtons`），不用 fixed 定位 |
| 公共游戏库 → 个人游戏库导入路径需切断 | 两个库耦合，导入逻辑分散 | 导入入口统一收归个人游戏库，公共库只做浏览/跳转 |

### 🔴 P0 — 消息流体验

| 问题 | 根因 | 修复方向 |
|---|---|---|
| 用户消息发出后不立即显示 | `ChatInput` 发送后等 `refetch()` 才更新 floors，有延迟感 | 发送后立即把用户消息 optimistic 插入 floors（或用 `pendingMessage` 机制扩展到 user 侧） |
| AI 回复流式生成时元数据行（时间/楼层号）缺失 | `StreamingBubble` 没有元数据行，只有纯文本 | `StreamingBubble` 加占位元数据行（时间用当前时间，楼层号用 `floors.length + 1`，显示 loading 状态） |
| 对标 ST：用户消息发出即渲染，AI 流式生成 | 现有实现基本正确，但 optimistic user 消息缺失导致体验割裂 | 见上 |

### 🟡 P1 — 功能性问题

| 问题 | 根因 | 修复方向 |
|---|---|---|
| 绿茵好莱坞无法正常展现（MVU 渲染效果差距大） | 1. `ui_config` 链路断（P0 问题）；2. MVU 变量体系复杂（嵌套 YAML），WE Flatten 结果未验证；3. 模型/API Key 未配置时走公共 key，能力受限 | 先修 P0，再验证变量链路，再评估模型问题 |
| 维多利亚游戏无法正常运行 | 同上，`ui_config` 链路断，世界书不可读，AI 无法获取游戏规则 | 修 P0 后验证 |
| 回复逻辑相较原生酒馆能力差 | 三个可能原因：① WE 引擎 prompt 组装问题；② 前端没有正确传递 API Key/模型；③ 模型本身能力不足。目前无法区分，因为世界书不可读（P0 未修） | 修 P0 → 配置模型 → 跑一局 → 看 `/api/play/sessions/:id/prompt-preview` 确认 prompt 是否正确 |
| `NarrativeTagsBar` 初始显示"—" | 进入游玩页时 `variables` state 为空，需等第一回合才有数据 | 进入页面时调用 `GET /sessions/:id/variables` 初始化 |

### 🟢 P2 — 优化项

| 问题 | 说明 |
|---|---|
| `FloatingPanelHost` 面板位置固定，多个面板重叠 | 多个面板时需要垂直错开，或改为可拖拽 |
| `phone_status` preset 只展示字符串/数字，不支持对象类型变量 | 绿茵好莱坞的 `足坛动态` 是对象数组，需要扩展渲染逻辑 |
| 面板 pinned 状态不持久化 | 刷新后重置，需要 localStorage 记忆 |
| 变量变化无动画 | 数值变化时无高亮，体验平淡 |

---

## 一、当前状态（2026-04-13）

### 已完成

| 模块 | 状态 | 说明 |
|---|---|---|
| CSS 变量体系 | ✅ | `globals.css` 完整变量体系，三套主题预设 |
| prose / bubble 双渲染 | ✅ | `MessageBubble` 支持 `message_style` 切换 |
| 消息元数据行 | ✅ | `MM/DD HH:mm \| #N \| ✏️ ···` 格式 |
| first_mes 沉浸式渐入 | ✅ | fade-in 动画 + CSS mask gradient |
| 主题字体引入 | ✅ | Crimson Text / Quicksand / Inter |
| GameStatsPanel | ✅ | 消息流顶部 inline overlay，读取 display_vars |
| TechStatsModal | ✅ | 楼层数 / 模型 / Memory Tab |
| TopBar 变量色 | ✅ | `var(--color-topbar-bg)` 半透明支持 |
| **默认主题深蓝** | ✅ | `:root` + `default-dark` 改为 `#0d1117` 系，紫色强调 |
| **内容区居中** | ✅ | 消息流 + 输入区统一 `max-w-[720px] mx-auto` |
| **布局改 flex** | ✅ | `TextSessionPage` 从 grid 改为 `flex flex-col` |

### 待实现

| 模块 | 优先级 | 说明 |
|---|---|---|
| TopBar 可隐藏 | 中 | 交互方案待定（见 §2.3），暂未实现 |
| NarrativeTagsBar | 高 | 叙事标签条，读取 token/var（见 §3.3） |
| FloatingPanelHost | 高 | 悬浮面板容器（见 §3.4） |
| phone_status preset | 中 | 绿茵好莱坞手机面板 |
| character_sheet preset | 中 | 角色属性面板 |
| 背景图接入（F9-B） | 低 | 等背景图设计完成 |
| 主题体系升级 | 低 | chat_width / font_scale / custom_css 沙箱 |

---

## 二、布局重构：深蓝 + 居中 + 可隐藏 TopBar

### 2.1 整体色调迁移

当前默认主题是纯黑（`#0f0f0f`），改为深蓝色调，更有质感、更现代：

```css
/* 新默认主题（替换 :root 默认值）*/
:root {
  --color-bg:           #0d1117;   /* GitHub 深蓝黑 */
  --color-surface:      #161b22;   /* 卡片/面板 */
  --color-border:       #21262d;   /* 边框 */
  --color-text:         #e6edf3;   /* 主文字 */
  --color-text-muted:   #7d8590;   /* 次要文字 */
  --color-accent:       #7c6af7;   /* 紫色强调（保持）*/
  --color-topbar-bg:    rgba(13, 17, 23, 0.88);
}
```

三套主题预设（gothic / soft-fantasy / default-dark）保持不变，`:root` 默认值改为深蓝。

### 2.2 内容居中 + 两侧留白

对标 ST 的 `--sheldWidth` 机制，Text 游玩页内容区居中，两侧留白：

```
┌─────────────────────────────────────────────────────────┐
│                    TopBar（全宽）                         │
├──────────┬──────────────────────────────┬───────────────┤
│          │                              │               │
│  左留白   │      消息流（居中内容区）       │   右留白       │
│          │      max-width: 720px        │               │
│          │      mx-auto                 │               │
│          │                              │               │
├──────────┴──────────────────────────────┴───────────────┤
│                    ChatInput（全宽）                      │
└─────────────────────────────────────────────────────────┘
```

**实现方式**：

```typescript
// ui_config 新增
chat_width?: number   // 0-100，默认 65（65% 视口宽度）
```

```css
/* TextSessionPage 布局 */
.gw-message-area {
  max-width: var(--chat-width, 720px);
  margin: 0 auto;
  width: 100%;
}
```

两侧留白区域未来可放背景图（F9-B），或保持纯色。

### 2.3 TopBar 可隐藏（待设计）

> 交互方案尚未最终确定，暂未实现。以下为候选方案，待讨论后选定再实施。

**候选方案 A：专用隐藏按钮**
- TopBar 右侧增加一个 `⌃` 折叠图标按钮
- 点击后 TopBar `transform: translateY(-100%)` 滑出，消息区扩展到顶部
- 鼠标移到顶部 20px hover zone 时临时浮现，1.5s 后再次隐藏

**候选方案 B：双击消息流**
- 双击消息流空白区域切换 TopBar 显示/隐藏
- 更沉浸，但可发现性差

**候选方案 C：快捷键**
- `F11` 或 `Ctrl+\` 切换全屏沉浸模式（隐藏 TopBar + ChatInput）
- 适合长篇阅读场景

**实现要点（方案确定后）**：
- `TextSessionPage` 维护 `topbarHidden: boolean` state
- 隐藏时 TopBar `position: absolute; transform: translateY(-100%)` 脱离文档流
- 鼠标进入顶部 hover zone → `topbarPeeking: true` → 1.5s 后 `false`
- TopBar 按钮自定义（`ui_config.topbar_buttons`）同步实现

---

## 三、悬浮数据面板体系（WE 引擎驱动）

> 完整设计见 `PLAN-FLOATING-DATA-PANEL-AND-REGEX.md`，本节为前端实现摘要。

### 3.1 数据流

```
游戏包 ui_config（一次性加载）
    ↓
WE 后端每回合下发 Variables（扁平 KV）
    ↓
前端根据 ui_config 声明 + Variables 渲染面板
```

**核心原则**：后端只管数据，前端只管渲染。未声明则不展示任何额外 UI。

### 3.2 三个渲染宿主

```
TextSessionPage
├── NarrativeTagsBar      ← 叙事标签条（常驻，很薄）
├── FloatingButtonGroup   ← 右上角按钮组（📊 + 创作者自定义图标）
├── MessageList           ← 消息流（居中，max-width）
│   └── GameStatsPanel    ← inline overlay（现有实现）
├── FloatingPanelHost     ← 悬浮面板容器（overlay，不挤压消息流）
└── ChatInput
```

### 3.3 NarrativeTagsBar（叙事标签条）

位于 TopBar 下方，常驻显示，极薄（约 28px 高）：

```
┌─────────────────────────────────────────────────────────┐
│ [← 返回] [Victoria] [📖] [📊] [🗂] [···]               │  TopBar
├─────────────────────────────────────────────────────────┤
│ 🕐 2025年5月11日 18:15  📍 临湖宅邸                      │  NarrativeTagsBar
├─────────────────────────────────────────────────────────┤
│                                                         │
│              消息流                                      │
```

**数据来源**：
- `source: "token"` → 从 AI 叙事文本中提取 `<time>...</time>` 等标签（前端 regex）
- `source: "var"` → 直接读取 `Variables["当前地点"]` 等变量

**游戏包声明**：
```json
"narrative_tags": {
  "items": [
    { "id": "time", "source": "token", "token_type": "time", "icon": "🕐" },
    { "id": "loc",  "source": "var",   "key": "当前地点",    "icon": "📍" }
  ]
}
```

### 3.4 FloatingPanelHost（悬浮面板）

创作者声明的自定义面板，overlay 浮在消息流上方，不挤压布局：

```json
"floating_panels": {
  "panels": [
    {
      "id": "phone",
      "type": "preset",
      "preset": "phone_status",
      "launcher": { "icon": "📱", "placement": "topbar" }
    },
    {
      "id": "character",
      "type": "preset",
      "preset": "character_sheet",
      "launcher": { "icon": "👤", "placement": "topbar" }
    }
  ]
}
```

**内置 preset 类型**：

| preset | 说明 | 适用游戏 |
|---|---|---|
| `phone_status` | 模拟手机界面，展示变量 + 叙事摘要 | 绿茵好莱坞 |
| `character_sheet` | 角色属性面板，按前缀分组展示变量 | RPG 类 |
| `telemetry_debug` | 延迟 / token / 模型调试信息 | 开发调试 |

**交互规则**：
- hover → 临时显示
- click → 切换 pinned（固定/取消）
- pinned 时再次 click → 关闭
- v1 加 draggable（react-rnd）

### 3.5 Regex Token 提取（前端 v0 方案）

前端收到 Narrative 后，根据 `token_extract_rules` 提取结构化 token：

```typescript
function extractTokens(narrative: string, rules: TokenExtractRule[]) {
  let clean = narrative
  const tokens: NarrativeToken[] = []
  for (const rule of rules) {
    const re = new RegExp(`<${rule.tag}>([\\s\\S]*?)</${rule.tag}>`, 'g')
    clean = clean.replace(re, (_, text) => {
      tokens.push({ type: rule.tag, text, style: rule.style, placement: rule.placement })
      return ''  // 从叙事文本中移除标签
    })
  }
  return { tokens, cleanText: clean }
}
```

零后端改动，立即可用。

---

## 四、主题体系升级：对标 ST

### 4.1 ST 主题系统分析

ST 的主题是**全局用户级**的 JSON 文件，包含：
- 颜色变量（`--SmartThemeBodyColor` 等约 10 个）
- 布局参数（`chat_width`、`blur_strength`、`font_scale`）
- 行为开关（`timer_enabled`、`timestamps_enabled`、`expand_message_actions`）
- 任意 CSS（`custom_css` 字段，可注入任意样式）

**ST 的局限**：主题是全局的，不能按角色/游戏切换。创作者无法保证玩家看到的视觉效果。

**GW 的优势**：主题绑定在游戏包里，创作者设计一次，所有玩家看到一致效果。

### 4.2 GW 主题字段扩展

在 ST 的基础上，GW 的 `ui_config.theme_config` 支持更完整的声明：

```typescript
interface ThemeConfig {
  // 基础（已实现）
  preset?: 'default-dark' | 'gothic' | 'soft-fantasy'
  color_scheme?: {
    bg?: string; surface?: string; border?: string
    text?: string; text_muted?: string; accent?: string
    user_text?: string; user_border?: string; topbar_bg?: string
  }

  // 布局（新增）
  chat_width?: number          // 内容区宽度 vw，默认 65
  font_scale?: number          // 字体缩放，默认 1.0
  font_family?: 'serif' | 'sans' | 'mono' | string  // 自定义字体

  // 消息渲染（新增）
  message_style?: 'prose' | 'bubble'
  bubble_style?: 'default' | 'borderless' | 'outlined'
  prose_line_height?: number   // 默认 1.8

  // 视觉效果（新增）
  blur_strength?: number       // 背景图模糊强度，默认 0
  bg_url?: string
  bg_overlay?: number          // 遮罩透明度 0-1，默认 0.55

  // 行为开关（新增）
  topbar_auto_hide?: boolean   // 默认 false
  topbar_buttons?: { worldbook?: boolean; stats?: boolean; archive?: boolean }

  // 高级（内测后）
  custom_css?: string          // 创作者自定义 CSS（沙箱限制，仅允许 .gw-* 选择器）
}
```

### 4.3 三层优先级（保持现有设计）

```
CSS 默认值（:root）
    ↓ 覆盖
主题预设（THEMES[preset]）
    ↓ 覆盖
创作者 color_scheme 字段
```

### 4.4 主题预设完善

**default-dark（深蓝，新默认）**：
```typescript
{
  '--color-bg':         '#0d1117',
  '--color-surface':    '#161b22',
  '--color-border':     '#21262d',
  '--color-text':       '#e6edf3',
  '--color-text-muted': '#7d8590',
  '--color-accent':     '#7c6af7',
  '--color-topbar-bg':  'rgba(13, 17, 23, 0.88)',
  '--font-prose':       'Inter, system-ui, sans-serif',
}
```

**gothic（哥特暗黑）**：保持现有，Crimson Text 衬线字体，amber 强调色。

**soft-fantasy（柔和幻想）**：保持现有，Quicksand 圆润字体，pink 强调色。

**未来可扩展**：
- `cyberpunk`：霓虹绿/青色，等宽字体
- `parchment`：羊皮纸米色，衬线字体，适合古风游戏
- `minimal`：极简白底，适合现代都市游戏

### 4.5 custom_css 安全边界

ST 允许任意 CSS 注入，GW 需要限制范围（防止破坏全局 UI）：

```
允许：
  .gw-message-area { ... }      ← 消息流区域
  .gw-first-mes { ... }         ← 开场消息
  .gw-topbar { ... }            ← TopBar
  .gw-chat-input { ... }        ← 输入区

不允许（前端过滤）：
  body { ... }                  ← 全局样式
  #root { ... }                 ← 根节点
  任何 !important               ← 强制覆盖
```

实现：注入前用 CSS parser 过滤，只保留 `.gw-*` 选择器的规则。

---

## 五、背景图接入（F9-B，待实现）

### 5.1 布局结构

```tsx
<div className="gw-play-page relative flex flex-col h-screen overflow-hidden">
  {/* 背景层 */}
  {bgUrl && (
    <div className="absolute inset-0 z-0">
      <img src={bgUrl} className="w-full h-full object-cover" />
      <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${bgOverlay})` }} />
    </div>
  )}
  {/* 内容层 */}
  <div className="relative z-10 flex flex-col h-full">
    <TopBar />          {/* backdrop-blur + var(--color-topbar-bg) */}
    <NarrativeTagsBar />
    <MessageList />     {/* 居中，max-width */}
    <ChatInput />       {/* backdrop-blur + var(--color-topbar-bg) */}
  </div>
</div>
```

### 5.2 背景图设计原则

Text 游戏以文字叙事为核心，背景图是**氛围渲染**而非视觉主角：
- 低饱和度、暗调纹理（石材、皮革、羊皮纸、星空、雾气）
- 抽象几何或渐变
- 高度模糊的场景图（`bg_blur: true`）
- 避免：具象人物、高对比度、鲜艳色彩

### 5.3 背景图来源

| 来源 | 时间 | 说明 |
|---|---|---|
| 游戏包声明 `bg_url` | 当前设计 | 指向 materials 里的资源路径 |
| `.data/backgrounds/` 内置库 | 近期 | 用户设计/生成后放入，游戏包引用 |
| TopBar `···` → 玩家自定义 | 内测后 | 玩家上传本地图片，存 localStorage |

### 5.4 前置条件

用户先设计背景图放入 `.data/backgrounds/`，游戏包 `bg_url` 指向对应路径，再实现前端接入。

---

## 六、Victoria 和绿茵好莱坞重制计划

### 6.1 Victoria — 现状与改造思路

**游戏类型**：蒸汽朋克叙事 RPG，维多利亚时代架空世界，五大家族权力博弈。

**当前 ui_config 状态**：已有 `stats_bar.items`，展示存活天数/当前位置/金银铜币/六家族声望，通过 `GameStatsPanel` 渲染（inline overlay，📊 按钮控制）。变量通过 `<UpdateState>{...}</UpdateState>` 格式由 AI 下发，后端 WE 引擎解析。

**改造目标**：
1. **NarrativeTagsBar** — 顶部常驻一行，快速显示当前位置和存活天数，不需要打开 📊 面板就能看到核心状态
2. **character_sheet 面板** — 把现有 stats_bar 的内容迁移到悬浮面板，分组展示（资产 / 声望 / 状态），比 inline overlay 更清晰
3. **世界书可编辑**（F12）— 玩家可在游玩中查看并编辑世界书词条，接入 `PATCH /api/play/sessions/:id/worldbook/:entryId`

**game.json `ui_config` 新增字段**：
```json
{
  "narrative_tags": {
    "items": [
      { "id": "day",      "source": "var", "key": "存活天数", "icon": "⏳" },
      { "id": "location", "source": "var", "key": "当前位置", "icon": "📍" }
    ]
  },
  "floating_panels": {
    "panels": [
      {
        "id": "status",
        "type": "preset",
        "preset": "character_sheet",
        "default_pinned": false,
        "launcher": { "icon": "📊", "placement": "topbar" }
      }
    ]
  }
}
```

**变量分组说明**（character_sheet 按 key 前缀自动分组）：
- `总资产.金币` / `总资产.银币` / `总资产.铜币` → 分组"总资产"
- `温莎声望` / `罗斯柴尔德声望` 等 → 无前缀，归入"基础"组（可考虑改为 `声望.温莎` 格式以触发分组）
- `状态.xxx` → 分组"状态"（如饥饿、中毒等临时状态）
- `物品栏.xxx` → 分组"物品栏"

**可选优化**：把 Victoria 的声望变量 key 改为 `声望.温莎`、`声望.罗斯柴尔德` 格式，character_sheet 就能自动分组展示，视觉更整洁。这需要同步修改 `preset_entries` 里的变量更新规则和 `display_vars`。

---

### 6.2 绿茵好莱坞 — 现状与改造思路

**游戏类型**：现代足球生涯模拟，MVU 引擎驱动，变量体系极为复杂（嵌套 YAML 结构，通过 `<UpdateVariable><JSONPatch>` 格式更新）。

**当前 ui_config 状态**：`game.json` 里没有 `ui_config` 字段，完全没有前端数据面板。变量通过 `{{format_message_variable::stat_data}}` 宏注入 prompt，AI 输出 JSONPatch 格式更新。

**变量结构特点**（来自世界书 `[initvar]`）：
- 顶层扁平 key：`当前时间`、`当前地点`、`基本信息.姓名`、`竞技能力.总评价`、`竞技能力.当前体能`
- 嵌套对象：`竞技能力.核心能力`（速度/射门/盘带等 8 项）、`俱乐部现状.各项赛事排名`、`社交关系`、`足坛动态`
- 数组/对象混合：`生涯记录.赛季数据`、`生涯记录.团队荣誉`

**改造目标**：
1. **NarrativeTagsBar** — 展示当前时间和当前地点（直接读 var）
2. **phone_status 面板** — 模拟手机界面，展示核心竞技数据（体能/状态/评价）和足坛动态
3. **character_sheet 面板** — 展示核心能力八项（速度/射门/盘带等），按前缀分组

**game.json `ui_config` 新增字段**：
```json
{
  "narrative_tags": {
    "items": [
      { "id": "time",     "source": "var", "key": "当前时间",  "icon": "🕐" },
      { "id": "location", "source": "var", "key": "当前地点",  "icon": "📍" }
    ]
  },
  "floating_panels": {
    "panels": [
      {
        "id": "phone",
        "type": "preset",
        "preset": "phone_status",
        "default_pinned": false,
        "launcher": { "icon": "📱", "placement": "topbar" }
      },
      {
        "id": "stats",
        "type": "preset",
        "preset": "character_sheet",
        "default_pinned": false,
        "launcher": { "icon": "📊", "placement": "topbar" }
      }
    ]
  }
}
```

**phone_status 面板展示内容**（读 variables 扁平 KV）：
- `竞技能力.当前体能`、`竞技能力.竞技状态`、`竞技能力.总评价`、`竞技能力.身价`
- `俱乐部现状.近期战绩`、`俱乐部现状.球队地位`
- `基本信息.健康状况`

**character_sheet 面板展示内容**：
- 分组"竞技能力"：速度/射门/盘带/传球/防守/体格/精神/稳定性（8 项核心能力）
- 分组"基本信息"：姓名/年龄/国籍/惯用脚

**已知挑战**：
- 绿茵好莱坞的变量是嵌套 YAML 结构，WE 引擎 `Flatten()` 后是否能正确展开为扁平 KV 需要验证
- `足坛动态` 是对象数组，phone_status preset 目前只展示字符串值，需要扩展渲染逻辑
- `竞技能力.核心能力` 是嵌套对象（`{ 速度: 75, 射门: 68, ... }`），Flatten 后应为 `竞技能力.核心能力.速度` 等多级 key

---

### 6.3 两个游戏共同需要的补充

**变量数据来源问题**：目前 `TurnResponse` 里加了 `variables?: Record<string, unknown>` 字段，但后端 `meta` 事件是否实际下发 `variables` 需要验证。如果没有，需要在 `handleTurnDone` 后额外调用 `GET /api/play/sessions/:id/variables` 拉取最新快照。

**首次加载变量**：进入游玩页时，`variables` state 初始为空，NarrativeTagsBar 会显示"—"。需要在 `useEffect` 里初始拉取一次变量快照（`GET /api/play/sessions/:id/variables`），或者等第一回合完成后才显示标签条。

**可以补充的功能**：

| 功能 | 说明 | 优先级 |
|---|---|---|
| 变量变化动画 | 每回合对比前后 diff，数值变化时短暂高亮（金币+10 绿色闪烁，HP-5 红色闪烁） | 中 |
| 声望变量 key 重构 | Victoria 声望改为 `声望.温莎` 格式，触发 character_sheet 自动分组 | 低 |
| phone_status 扩展 | 支持渲染对象类型变量（如足坛动态列表），目前只支持字符串/数字 | 中 |
| 面板位置记忆 | localStorage 记住每个面板的 pinned 状态，下次进入自动恢复 | 低 |
| 世界书可编辑（F12） | 游玩中编辑世界书词条，接入后端 A-20 接口 | 高 |
| 变量趋势迷你图 | 对数值型变量记录最近 N 回合历史，画趋势线（需 floors API） | 低 |

---

## 七、实施顺序

### 阶段 1：布局重构 ✅ 已完成

| 任务 | 文件 | 状态 |
|---|---|---|
| 默认主题改深蓝 | `globals.css` + `themes.ts` | ✅ `#0d1117` 系，紫色强调 |
| 内容区居中 + max-width | `TextSessionPage.tsx` | ✅ `max-w-[720px] mx-auto` |
| 布局改 flex | `TextSessionPage.tsx` | ✅ `flex flex-col`，`flex-1 min-h-0` |
| TopBar 可隐藏 | `TextSessionTopBar.tsx` + `TextSessionPage.tsx` | ⏳ 交互方案待定（见 §2.3） |
| TopBar 按钮自定义 | `TextSessionTopBar.tsx` | ⏳ 待 TopBar 隐藏方案确定后同步 |

### 阶段 2：悬浮面板 v0 ✅ 已完成

| 任务 | 文件 | 状态 |
|---|---|---|
| 类型扩展 | `src/api/types.ts` | ✅ `NarrativeTagItem` / `FloatingPanelDecl` / `TokenExtractRule` |
| Token 提取工具 | `src/utils/tokenExtract.ts` | ✅ 前端 regex，零后端改动 |
| NarrativeTagsBar | `src/components/play/NarrativeTagsBar.tsx` | ✅ 28px 常驻标签条 |
| FloatingPanelHost | `src/components/play/FloatingPanelHost.tsx` | ✅ hover 临时 / click 固定 |
| CharacterSheet preset | `src/components/play/presets/CharacterSheet.tsx` | ✅ 变量按前缀分组 |
| PhoneStatus preset | `src/components/play/presets/PhoneStatus.tsx` | ✅ 手机界面风格 |
| TelemetryDebug preset | `src/components/play/presets/TelemetryDebug.tsx` | ✅ 调试信息 |
| TextSessionPage 集成 | `src/pages/play/TextSessionPage.tsx` | ✅ variables/tokens state + handleTurnDone |

**待验证**：后端 `meta` 事件是否实际下发 `variables` 字段（见 §6.3）。

### 阶段 3：背景图（F9-B，等背景图设计完成）

| 任务 | 文件 | 说明 |
|---|---|---|
| 背景层布局 | `TextSessionPage.tsx` | 背景层 + 内容层分离 |
| TopBar backdrop-blur | `TextSessionTopBar.tsx` | 背景图存在时半透明 |
| ChatInput backdrop-blur | `ChatInput.tsx` | 背景图存在时半透明 |

### 阶段 4：主题体系升级（内测后）

| 任务 | 文件 | 说明 |
|---|---|---|
| chat_width 支持 | `TextSessionPage.tsx` | `--chat-width` CSS 变量 |
| font_scale 支持 | `globals.css` + `TextSessionPage.tsx` | `--font-scale` 变量 |
| custom_css 沙箱注入 | `TextSessionPage.tsx` | 过滤 + 注入 `<style>` 标签 |
| 新主题预设 | `themes.ts` | cyberpunk / parchment / minimal |

---

## 八、ST 对比总结

| 特性 | SillyTavern | GW（目标）|
|---|---|---|
| 主题范围 | 全局用户级，所有角色共享 | 游戏包级，每个游戏独立主题 |
| 主题切换 | 用户手动选择 | 创作者声明，玩家无需操作 |
| CSS 变量数量 | ~10 个 `--SmartTheme*` | ~16 个 `--color-*` + 布局变量 |
| 内容宽度 | `--sheldWidth`（0-100vw）| `chat_width`（vw）+ `max-width` |
| 背景图 | 用户自行设置 | 创作者声明 + 玩家可覆盖 |
| 字体 | 用户自行设置 | 主题预设 + 创作者覆盖 |
| 自定义 CSS | 任意注入（无限制）| 沙箱限制（仅 `.gw-*` 选择器）|
| 游戏专属 UI | 无（全局统一）| 创作者声明悬浮面板 / 标签条 |
| 数据面板 | 无内置（靠插件）| WE 引擎驱动，声明式渲染 |

**GW 核心优势**：创作者设计一次，所有玩家看到一致效果；数据面板与游戏逻辑深度集成；安全边界明确。
