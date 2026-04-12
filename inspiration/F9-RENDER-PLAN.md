# F9 渲染体系设计与实施计划

> 版本：2026-04-12 v1
> 范围：Text 游玩页的消息渲染方式、CSS 变量体系、主题预设、背景图接入。
> 参考：SillyTavern index.html、from-v0-dev 项目、游戏界面设计对比与优化方案.md

---

## 一、核心决策：气泡 vs 非气泡

### ST 的做法

SillyTavern 使用**非气泡设计**：
- 消息无背景色气泡，文字直接渲染在页面背景上
- 左侧头像 + 角色名 + 消息文本纵向排列
- 用户消息与 AI 消息通过颜色区分，不通过位置区分
- 信息密度高，适合长文本叙事

### v0-dev 的做法

v0-dev 也使用**非气泡设计**，但更现代：
- 用户消息：左边框 accent 色 + accent 色文字，无背景
- AI 消息：纯 prose 排版，无背景，markdown 完整渲染
- 角色名显示在消息上方
- 操作按钮（编辑/翻译/朗读/书签）显示在消息下方

### 当前 GW 的做法

当前使用**气泡设计**：
- 用户消息：右对齐 accent 色气泡
- AI 消息：左对齐 surface 色气泡
- 简单直观，但长文本阅读体验差，不适合叙事游戏

### 决策：双模式渲染，创作者声明

**不强制选择一种**，由创作者在游戏包里声明渲染模式，前端按声明渲染：

```typescript
// ui_config 新增字段
message_style?: 'bubble' | 'prose'   // 默认 'prose'（非气泡）
```

| 模式 | 适用场景 | 视觉特征 |
|---|---|---|
| `prose`（默认）| 叙事游戏、长文本、沉浸式 | 无气泡，左边框区分用户/AI，prose 排版 |
| `bubble` | 对话游戏、短消息、聊天感 | 传统气泡，左右对齐 |

**内测阶段默认 `prose`**，因为 Victoria 是叙事游戏，prose 模式更合适。

---

## 二、CSS 变量体系（F9-A）

### 当前状态

`color_scheme` 只注入三个变量（bg/text/accent），其余颜色硬编码在组件里。

### 目标变量体系

所有颜色、字体、圆角统一用 CSS 变量，组件内不出现硬编码颜色值。

```css
/* ── 基础色 ── */
--color-bg              /* 页面背景 */
--color-surface         /* 卡片/抽屉/面板背景 */
--color-border          /* 边框 */
--color-text            /* 主文字 */
--color-text-muted      /* 次要文字 */
--color-accent          /* 强调色（按钮/链接/高亮）*/

/* ── 消息渲染 ── */
--color-user-bubble     /* bubble 模式：用户气泡背景 */
--color-ai-bubble       /* bubble 模式：AI 气泡背景 */
--color-user-text       /* prose 模式：用户消息文字色 */
--color-user-border     /* prose 模式：用户消息左边框色 */

/* ── 布局组件 ── */
--color-topbar-bg       /* TopBar 背景（支持半透明）*/
--color-input-bg        /* 输入框背景 */

/* ── 排版 ── */
--font-prose            /* 消息正文字体 */
--bubble-radius         /* 气泡圆角（bubble 模式）*/
--prose-line-height     /* prose 模式行高 */
--prose-max-width       /* prose 模式最大宽度 */
```

### 默认值（default-dark 主题）

```css
:root {
  --color-bg:           #0f172a;
  --color-surface:      #1e293b;
  --color-border:       #334155;
  --color-text:         #f1f5f9;
  --color-text-muted:   #94a3b8;
  --color-accent:       #3b82f6;

  --color-user-bubble:  var(--color-accent);
  --color-ai-bubble:    var(--color-surface);
  --color-user-text:    var(--color-accent);
  --color-user-border:  var(--color-accent);

  --color-topbar-bg:    rgba(15, 23, 42, 0.85);
  --color-input-bg:     var(--color-surface);

  --font-prose:         'Inter', system-ui, sans-serif;
  --bubble-radius:      1rem;
  --prose-line-height:  1.75;
  --prose-max-width:    680px;
}
```

### 实现方式

`TextSessionPage` 的 `useEffect` 扩展，支持 `ui_config.color_scheme` 注入所有变量：

```typescript
// ui_config.color_scheme 扩展
color_scheme?: {
  bg?: string
  surface?: string
  border?: string
  text?: string
  text_muted?: string
  accent?: string
  user_text?: string      // prose 模式用户消息颜色
  topbar_bg?: string      // TopBar 背景（支持 rgba）
}
```

创作者只需声明想覆盖的变量，其余继承主题默认值。

---

## 三、消息渲染组件重构（F9-A 核心）

### Prose 模式（默认）

```
消息容器（无气泡）
  ├─ 角色名行（可选，avatar_mode='script' 时显示）
  │    └─ 角色名 + 类型标签（AI/玩家）
  ├─ 消息内容
  │    ├─ AI 消息：prose 排版，全宽，react-markdown
  │    └─ 用户消息：左边框 + accent 色文字，缩进
  └─ 操作栏（hover 显示）
       └─ 复制 / 编辑（用户消息）/ 删除
```

**用户消息样式**：
```css
border-left: 2px solid var(--color-user-border);
padding-left: 12px;
color: var(--color-user-text);
```

**AI 消息样式**：
```css
/* 纯 prose，无边框，无背景 */
line-height: var(--prose-line-height);
max-width: var(--prose-max-width);
```

**first_mes 样式**（保持现有设计，居中斜体）：
```css
/* 不变，已经是非气泡风格 */
```

### Bubble 模式（可选）

保留现有气泡实现，`message_style='bubble'` 时使用：
- 用户消息：右对齐，`--color-user-bubble` 背景
- AI 消息：左对齐，`--color-ai-bubble` 背景
- 圆角：`--bubble-radius`

### 实现方案

`MessageBubble` 接收 `messageStyle` prop，内部条件渲染：

```typescript
interface Props {
  message: FloorMessage
  isFirstMes?: boolean
  messageStyle?: 'bubble' | 'prose'   // 从 TextSessionPage 传入
  floorId?: string
  sessionId?: string
  onEdited?: ...
  onDeleted?: ...
}
```

`TextSessionPage` 读取 `game.ui_config.message_style`（默认 `'prose'`），传给 `MessageList` → `MessageBubble`。

---

## 四、主题预设（F9-C）

三套内置主题，存放在 `src/styles/themes.ts`。

### default-dark（默认）

```typescript
{
  name: 'default-dark',
  label: '深色默认',
  vars: {
    '--color-bg':         '#0f172a',
    '--color-surface':    '#1e293b',
    '--color-border':     '#334155',
    '--color-text':       '#f1f5f9',
    '--color-text-muted': '#94a3b8',
    '--color-accent':     '#3b82f6',
    '--font-prose':       'Inter, system-ui, sans-serif',
    '--bubble-radius':    '1rem',
  }
}
```

### gothic（哥特）

```typescript
{
  name: 'gothic',
  label: '哥特暗黑',
  vars: {
    '--color-bg':         '#0a0a0a',
    '--color-surface':    '#171717',
    '--color-border':     '#2a2a2a',
    '--color-text':       '#e5e5e5',
    '--color-text-muted': '#737373',
    '--color-accent':     '#d97706',
    '--font-prose':       '"Crimson Text", Georgia, serif',
    '--bubble-radius':    '4px',
    '--prose-line-height':'1.9',
  }
}
```

### soft-fantasy（软幻想）

```typescript
{
  name: 'soft-fantasy',
  label: '柔和幻想',
  vars: {
    '--color-bg':         '#1e1b4b',
    '--color-surface':    '#312e81',
    '--color-border':     '#4338ca',
    '--color-text':       '#f5f3ff',
    '--color-text-muted': '#a5b4fc',
    '--color-accent':     '#e879f9',
    '--font-prose':       '"Quicksand", system-ui, sans-serif',
    '--bubble-radius':    '1.25rem',
  }
}
```

### 主题加载机制

```typescript
// src/styles/themes.ts
export const THEMES = { 'default-dark': ..., 'gothic': ..., 'soft-fantasy': ... }

// TextSessionPage useEffect
const theme = THEMES[game?.ui_config?.theme ?? 'default-dark'] ?? THEMES['default-dark']
// 1. 先注入主题基础变量
Object.entries(theme.vars).forEach(([k, v]) => el.style.setProperty(k, v))
// 2. 再用 color_scheme 覆盖（创作者自定义优先级最高）
if (cs?.bg) el.style.setProperty('--color-bg', cs.bg)
// ...
```

---

## 五、背景图接入（F9-B）

### ui_config 新增字段

```typescript
bg_url?: string        // 背景图 URL（相对路径或绝对 URL）
bg_overlay?: number    // 遮罩透明度 0-1，默认 0.55
bg_blur?: boolean      // 背景图是否模糊，默认 false
```

### 布局结构

```tsx
<div className="gw-theme relative flex flex-col h-screen overflow-hidden">
  {/* 背景层 */}
  {bgUrl && (
    <div className="absolute inset-0 z-0">
      <img
        src={bgUrl}
        className={`w-full h-full object-cover ${bgBlur ? 'blur-sm scale-105' : ''}`}
      />
      <div
        className="absolute inset-0"
        style={{ background: `rgba(0,0,0,${bgOverlay ?? 0.55})` }}
      />
    </div>
  )}
  {/* 内容层 */}
  <div className="relative z-10 flex flex-col h-full">
    <TopBar />          {/* backdrop-blur-md bg-[var(--color-topbar-bg)] */}
    <MessageList />     {/* 气泡/prose 有背景色，不透明 */}
    <GameStatsPanel />
    <ChatInput />       {/* backdrop-blur-md bg-[var(--color-topbar-bg)] */}
  </div>
</div>
```

### TopBar / ChatInput 半透明处理

背景图存在时，TopBar 和 ChatInput 改为半透明 + backdrop-blur：
```css
/* --color-topbar-bg 默认值 */
--color-topbar-bg: rgba(15, 23, 42, 0.85);

/* 有背景图时创作者可覆盖为更透明的值 */
/* 例：color_scheme.topbar_bg = "rgba(0,0,0,0.4)" */
```

---

## 六、实施顺序

### F9-A：CSS 变量体系 + Prose 模式 ✅ 完成（2026-04-12）

**已完成变更**：

| 文件 | 变更 |
|---|---|
| `src/styles/globals.css` | 扩展完整 CSS 变量体系，新增三套主题 `[data-gw-theme]` 选择器 |
| `src/styles/themes.ts` | 新建，导出 `THEMES`、`applyTheme()`、`clearTheme()` |
| `src/api/types.ts` | `UIConfig` 新增 `theme`、`message_style`、`color_scheme`（完整字段）、`bg_overlay`、`bg_blur` |
| `src/components/chat/MessageBubble.tsx` | 支持 `prose` / `bubble` 双模式，`ProseComponents` 导出供复用，操作栏全部改用 CSS 变量 |
| `src/components/chat/StreamingBubble.tsx` | 支持 `messageStyle` prop，复用 `ProseComponents`，颜色改为 CSS 变量 |
| `src/components/chat/MessageList.tsx` | 新增 `messageStyle` prop，传给 MessageBubble 和 StreamingBubble |
| `src/pages/play/TextSessionPage.tsx` | 主题加载逻辑重写：`applyTheme()` → `color_scheme` 覆盖 → `font` 覆盖，离开时 `clearTheme()` |

**Victoria 默认行为**：`message_style` 未设置 → `prose` 模式；`theme` 未设置 → `default-dark`。

### F9-B：背景图接入（待实现）

**背景图设计原则**：Text 游戏页以文字叙事为核心，背景图的作用是**氛围渲染**而非视觉主角。过于具象或色彩丰富的图会与文字争夺注意力，应优先选择：
- 低饱和度、暗调纹理（石材、皮革、羊皮纸、星空、雾气）
- 抽象几何或渐变
- 高度模糊的场景图（`bg_blur: true`）

**背景图来源规划**：

| 来源 | 时间 | 说明 |
|---|---|---|
| 创作者在游戏包里声明 `bg_url` | 当前设计 | 指向 materials 里的资源路径 |
| `.data/backgrounds/` 内置背景库 | 近期 | 你自己设计/生成后放入，游戏包引用 |
| TopBar `···` 菜单 → 玩家自定义背景 | 内测后 | 允许玩家上传本地图片覆盖创作者背景，存 localStorage |

**玩家自定义背景（内测后）**：
- 入口：TopBar `···` 菜单 → "自定义背景"
- 行为：玩家上传图片后存 `gw_bg_override_{gameId}` localStorage key
- 优先级：玩家背景 > 创作者 `bg_url` > 无背景
- 可随时清除，恢复创作者原始背景

**文件改动**：
- `src/pages/play/TextSessionPage.tsx`：背景层 + 内容层布局重构
- `src/components/play/TextSessionTopBar.tsx`：加 `backdrop-blur`，`···` 菜单加"自定义背景"入口（内测后）
- `src/components/chat/ChatInput.tsx`：加 `backdrop-blur`

### F9-C：主题预设完善（待设计确认）

三套主题变量值已在 `themes.ts` 和 `globals.css` 中定义，待视觉确认后可调整色值。字体（Crimson Text、Quicksand）需在 `index.html` 引入 Google Fonts。

---

## 七、与 ST 的对比总结

| 特性 | SillyTavern | GW（目标）|
|---|---|---|
| 消息渲染 | 非气泡，头像+角色名+文本 | prose 模式（默认）+ bubble 模式（可选）|
| 主题系统 | 插件市场，玩家安装 | 游戏包声明，创作者控制 |
| 背景图 | 玩家自行设置 | 创作者在游戏包里声明 |
| 字体 | 玩家自行设置 | 主题预设 + 创作者覆盖 |
| CSS 变量 | `--SmartThemeBodyColor` 等少量变量 | 完整变量体系，覆盖所有视觉元素 |
| 扩展方式 | JS 插件（任意代码）| `ui_config` 声明式（安全边界）|

**GW 的核心优势**：创作者设计一次，所有玩家看到一致的视觉效果，无需安装插件。
