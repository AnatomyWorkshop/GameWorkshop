# GW 渲染体系设计：正则语法 + 主题色 + Text/Light 统一架构

> 版本：2026-04-14 v2
> 范围：从 SillyTavern 明月秋青分析出发，设计 GW 自己的渲染管线、官方正则语法表、主题色体系，以及 Text 游戏与 Light 游戏的架构关系。
> 补充：Text 游戏定位澄清、WE 引擎职责边界、TH 对比、前端轻正则的合理性论证。

---

## 零、Text 游戏的定位与 WE 引擎原则

### 0.1 Text 游戏是什么

Text 游戏是 WE 引擎驱动的一种游戏类型，定位是**扩展性强的纯叙事游戏**：

- 渲染容器是消息流（MessageList），不是 VN 舞台
- 支持悬浮数据面板（FloatingPanel）、叙事标签条（NarrativeTagsBar）
- 通过 `ui_config` 声明式驱动，创作者不写前端代码
- 变量系统、世界书、记忆系统全部由 WE 引擎后端提供

Text 游戏**不是** Light 游戏的子集，而是与 Light 平行的渲染模式（见第五节）。

### 0.2 WE 引擎的职责边界

WE 引擎的目标是**后端编译各类游戏**，具体职责是：

| 职责 | 属于 WE 引擎 | 不属于 WE 引擎 |
|------|------------|--------------|
| 变量存储与更新 | ✅ | |
| Prompt 组装（宏展开、世界书注入） | ✅ | |
| AI 输出解析（Narrative/Options/StatePatch） | ✅ | |
| 后端正则（strip 占位符、格式化） | ✅ | |
| 记忆系统、调度任务 | ✅ | |
| 视觉渲染（颜色、字体、布局） | | ❌ 前端职责 |
| 叙事标签提取（`<time>` → token） | 可选（v1 优化） | v0 前端处理即可 |
| ui_config 解析与渲染 | | ❌ 前端职责 |

**关键判断：前端轻正则（token 提取、内联样式标签渲染）不违背 WE 引擎原则。** 这些是渲染层决策，后端只负责把干净的叙事文本下发，前端根据 `ui_config` 声明决定如何渲染。

### 0.3 TH 是怎么决定的

TH 的选择是**完全不做 AI 输出解析**：

- 宏系统（`runtime.ts`）只在 prompt 组装时运行，不处理 AI 输出
- turn 响应只有 `generated_text`（原始 AI 输出），无 tokens、无结构化字段
- 前端用 MarkdownIt + DOMPurify 直接渲染，无自定义 tag 提取
- 没有官方标签表，没有 `<time>`/`<location>` 这类约定

TH 的哲学是：**AI 输出是不透明文本，不做结构化解析**。这是一种保守选择，适合通用 ST 兼容场景，但牺牲了创作者的表达能力。

**GW 的选择不同**：WE 引擎已经有 `parser/parser.go`（三层 fallback 解析 Narrative/Options/StatePatch），这本身就是对 AI 输出做结构化解析。在此基础上，前端再做轻量的 token 提取是自然延伸，不是违背原则。

---

## 一、ST 渲染体系 vs GW 现状对比

### ST 的做法（明月秋青为例）

ST 的"渲染"分两层，完全解耦：

**层 1 — Prompt 层（后端/LLM 侧）**
- 宏系统：`{{getvar::key}}`、`{{time}}`、`{{char}}` 等，在 prompt 组装时展开
- 正则处理器：`ApplyToAIOutput`，对 AI 输出做文本替换（strip 占位符、提取标签）
- 这一层决定 AI **输出什么格式的文本**

**层 2 — 渲染层（前端侧）**
- CSS 变量：`--golden`、`--SmartThemeBodyColor` 等，控制视觉风格
- 前端正则：对 AI 输出的 HTML/Markdown 做二次处理，把 `<time>` 等标签转成带样式的 DOM
- 这一层决定文本**如何呈现给玩家**

ST 的核心设计哲学：**AI 输出结构化标签，前端负责把标签渲染成视觉效果**。创作者通过 prompt 约束 AI 输出格式，通过 CSS/正则控制视觉。

### GW 现状

| 能力 | ST | GW 现状 | 差距 |
|---|---|---|---|
| 宏展开 | `{{getvar::key}}` 等 | ✅ `macros/expand.go` 已实现 | 基本对齐 |
| AI 输出正则 | `ApplyToAIOutput` | ✅ `processor/regex.go` 已实现 | 基本对齐 |
| AI 输出解析 | 无统一 parser | ✅ `parser/parser.go` 三层 fallback | GW 更强 |
| 前端 token 提取 | 前端正则 | ✅ `tokenExtract.ts` v0 已实现 | 基本对齐 |
| 主题色体系 | `--SmartTheme*` ~10 个变量 | ✅ `--color-*` ~16 个变量 | GW 更完整 |
| 创作者声明式 UI | 无（全局用户级） | ✅ `ui_config` 游戏包级 | GW 独有优势 |
| 官方正则语法表 | 无（自由发挥） | ❌ 缺失 | 需要建立 |
| 渲染标签规范 | 无（各角色卡自定义） | ❌ 缺失 | 需要建立 |

**结论：GW 的底层管线已经比 ST 更完整，缺的是"官方规范"——告诉创作者应该用什么标签、什么格式，前端保证渲染。**

---

## 二、GW 官方正则语法表（提案）

### 2.1 设计原则

1. **XML 标签风格**：`<tag>内容</tag>`，与 WE 引擎 parser 已有的 `<Narrative>`、`<UpdateState>` 保持一致
2. **前端提取，后端不感知**：v0 阶段全部在前端 `tokenExtract.ts` 处理，零后端改动
3. **封闭枚举**：官方标签有限，创作者可扩展但官方只保证官方标签的渲染
4. **不执行脚本**：只产出 token/cleanText，不允许任意 JS 注入

### 2.2 官方标签表

#### 叙事信息标签（渲染到 NarrativeTagsBar）

| 标签 | 用途 | 示例 | 渲染位置 |
|---|---|---|---|
| `<time>` | 游戏内时间 | `<time>2025年5月11日 18:15</time>` | NarrativeTagsBar 🕐 |
| `<location>` | 当前地点 | `<location>临湖宅邸·书房</location>` | NarrativeTagsBar 📍 |
| `<weather>` | 天气/环境 | `<weather>阴雨，能见度低</weather>` | NarrativeTagsBar 🌧 |
| `<chapter>` | 章节/幕 | `<chapter>第三幕·背叛</chapter>` | NarrativeTagsBar（可选） |

#### 内联样式标签（渲染到消息流内）

| 标签 | 用途 | 示例 | 渲染效果 |
|---|---|---|---|
| `<em class="gold">` | 金色强调 | `<em class="gold">命运之轮</em>` | 金色文字 |
| `<em class="danger">` | 危险/警告 | `<em class="danger">生命值危急</em>` | 红色文字 |
| `<em class="info">` | 信息提示 | `<em class="info">获得道具：蒸汽手枪</em>` | 蓝色文字 |
| `<aside>` | 旁白/系统提示 | `<aside>【系统】存档已自动保存</aside>` | 灰色斜体，缩进 |
| `<quote>` | 引用/回忆 | `<quote>她曾说过：...</quote>` | 引用块样式 |

#### 面板数据标签（渲染到悬浮面板）

| 标签 | 用途 | 目标面板 | 说明 |
|---|---|---|---|
| `<status>` | 状态摘要 | `panel:phone` | 绿茵好莱坞手机面板 |
| `<news>` | 新闻/动态 | `panel:phone` | 足坛动态 |
| `<memo>` | 备忘/笔记 | `panel:memo` | 通用备忘面板 |

#### 系统控制标签（被 parser 消费，不渲染）

| 标签 | 用途 | 处理层 |
|---|---|---|
| `<UpdateState>` | 变量更新（简单 KV） | 后端 parser 已处理 |
| `<UpdateVariable>` | 变量更新（JSONPatch） | 后端 WE 引擎处理 |
| `<Narrative>` | 叙事文本包裹 | 后端 parser 已处理 |
| `<Options>` | 选项列表 | 后端 parser 已处理 |

### 2.3 创作者使用方式

在游戏包的 `system_prompt` 或 `post_history_instructions` 里约束 AI 输出格式：

```
每次回复必须在叙事文本开头输出：
<time>当前游戏内时间</time>
<location>当前地点</location>

如果发生重要事件，可以使用：
<em class="gold">重要物品或人名</em>
```

在 `ui_config.token_extract_rules` 里声明前端如何处理：

```json
"token_extract_rules": [
  { "tag": "time",     "placement": ["narrative_tags"] },
  { "tag": "location", "placement": ["narrative_tags"] },
  { "tag": "status",   "placement": ["panel:phone"] }
]
```

---

## 三、主题色体系设计

### 3.1 现有变量（已实现）

```css
--color-bg           /* 页面背景 */
--color-surface      /* 卡片/面板背景 */
--color-border       /* 边框 */
--color-text         /* 主文字 */
--color-text-muted   /* 次要文字 */
--color-accent       /* 强调色（按钮/链接/高亮） */
--color-accent-hover
--color-user-bubble  /* 用户消息气泡背景 */
--color-ai-bubble    /* AI 消息气泡背景 */
--color-user-text    /* 用户消息文字色 */
--color-user-border  /* 用户消息边框色 */
--color-topbar-bg    /* TopBar 背景（半透明） */
--color-input-bg     /* 输入框背景 */
--font-prose         /* 正文字体 */
--bubble-radius      /* 气泡圆角 */
--prose-line-height  /* 行高 */
```

### 3.2 需要补充的变量

```css
/* 叙事标签条 */
--color-tag-time      /* 时间标签色，默认 gold */
--color-tag-location  /* 地点标签色，默认 muted */
--color-tag-weather   /* 天气标签色，默认 muted */

/* 内联样式 */
--color-em-gold       /* <em class="gold"> 颜色，默认 #d97706 */
--color-em-danger     /* <em class="danger"> 颜色，默认 #ef4444 */
--color-em-info       /* <em class="info"> 颜色，默认 var(--color-accent) */
--color-aside         /* <aside> 旁白颜色，默认 var(--color-text-muted) */
--color-quote         /* <quote> 引用颜色，默认 var(--color-text-muted) */
--color-quote-border  /* <quote> 左边框颜色 */

/* 背景图支持 */
--bg-image            /* 背景图 URL */
--bg-overlay          /* 背景遮罩透明度 0-1 */
--bg-blur             /* 背景模糊强度 px */
```

### 3.3 官方主题预设扩展

在现有三套（default-dark / gothic / soft-fantasy）基础上补充：

| 主题名 | 定位 | 强调色 | 字体 | 适用游戏类型 |
|---|---|---|---|---|
| `default-dark` | 深蓝默认 ✅ | 紫色 `#7c6af7` | Inter | 通用 |
| `gothic` | 哥特暗黑 ✅ | 琥珀金 `#d97706` | Crimson Text | 中世纪/黑暗奇幻 |
| `soft-fantasy` | 柔幻奇境 ✅ | 粉紫 `#e879f9` | Quicksand | 轻奇幻/恋爱 |
| `cyberpunk` | 赛博朋克 ❌ | 霓虹青 `#00fff0` | JetBrains Mono | 科幻/都市 |
| `parchment` | 羊皮纸 ❌ | 棕褐 `#92400e` | Crimson Text | 古风/历史 |
| `minimal` | 极简白 ❌ | 深灰 `#374151` | Inter | 现代都市/现实 |

---

## 四、前端正则 vs 后端正则：职责划分

### 4.1 当前实现（v0）

```
AI 原始输出
    ↓ 后端 processor/regex.go（ApplyToAIOutput）
    → 文本替换（strip 占位符、格式化）—— WE 引擎职责
    ↓ 后端 parser/parser.go（三层 fallback）
    → 提取 Narrative / Options / StatePatch —— WE 引擎职责
    ↓ StreamMeta.Narrative（干净叙事文本，但可能含 <time> 等标签）
    ↓ 前端 tokenExtract.ts（extractTokens）—— 前端渲染职责
    → 提取 <time>/<location> 等 token，返回 cleanText
    ↓ MessageBubble 渲染 cleanText（含内联样式标签）
    ↓ preprocessNarrative() 处理 <em class="gold"> 等 —— 前端渲染职责
    ↓ NarrativeTagsBar 渲染 tokens
```

### 4.2 职责划分原则

**后端处理（WE 引擎，processor/regex.go）**：
- strip 类：移除 AI 不应该输出但偶尔会输出的内容（如 `<UpdateState>` 残留、多余空行）
- 格式化类：统一换行符、移除 markdown 代码块包裹
- 这些是**对所有游戏通用的清理**，不依赖 ui_config，是 WE 引擎的核心职责

**前端处理（tokenExtract.ts + preprocessNarrative）**：
- 提取类：把 `<time>`、`<location>` 等标签提取为结构化 token
- 渲染类：把 `<em class="gold">` 等内联标签转为带样式的 React 组件
- 这些是**依赖 ui_config 声明的游戏专属渲染**，后端不感知，是前端渲染层的职责

**结论：当前 v0 的前端正则方案是正确的职责划分，不违背 WE 引擎原则，不需要移到后端。**

后端 v1 可以选择性地把 token 提取也做到后端（`StreamMeta.Tokens` 字段），但这是优化而非必须。官方标签表稳定后再考虑。

### 4.3 内联样式标签的渲染

`<em class="gold">` 这类标签在 `MessageBubble` 的渲染层处理，不是 tokenExtract 的职责。推荐在渲染前用 regex 预处理（零依赖，最简单）：

```typescript
// preprocessNarrative：在 MessageBubble 渲染前调用
function preprocessNarrative(text: string): string {
  return text
    .replace(/<em class="gold">(.*?)<\/em>/gs, '<span class="gw-em-gold">$1</span>')
    .replace(/<em class="danger">(.*?)<\/em>/gs, '<span class="gw-em-danger">$1</span>')
    .replace(/<em class="info">(.*?)<\/em>/gs, '<span class="gw-em-info">$1</span>')
    .replace(/<aside>(.*?)<\/aside>/gs, '<span class="gw-aside">$1</span>')
    .replace(/<quote>(.*?)<\/quote>/gs, '<span class="gw-quote">$1</span>')
}
```

对应 CSS：
```css
.gw-em-gold    { color: var(--color-em-gold, #d97706); font-weight: 600; }
.gw-em-danger  { color: var(--color-em-danger, #ef4444); }
.gw-em-info    { color: var(--color-em-info, var(--color-accent)); }
.gw-aside      { color: var(--color-aside, var(--color-text-muted)); font-style: italic; display: block; padding-left: 1em; border-left: 2px solid var(--color-border); margin: 0.5em 0; }
.gw-quote      { color: var(--color-quote, var(--color-text-muted)); font-style: italic; display: block; padding-left: 1em; border-left: 3px solid var(--color-quote-border, var(--color-accent)); margin: 0.5em 0; }
```

---

## 五、Text 游戏与 Light 游戏的架构关系

### 5.1 当前类型定义

```typescript
type GameType = 'text' | 'light' | 'rich'
```

- `text`：纯文字叙事，消息流渲染，WE 引擎驱动，支持悬浮面板
- `light`：轻量视觉小说，有立绘/背景图，VN 指令驱动
- `rich`：完整 VN，复杂场景切换

### 5.2 Text 和 Light 的本质差异

| 维度 | Text | Light |
|---|---|---|
| 渲染容器 | 消息流（MessageList） | VN 舞台（场景+立绘） |
| AI 输出格式 | `<Narrative>` + `<Options>` + `<UpdateState>` | `<game_response>` VN 指令 |
| 背景图 | 可选（氛围渲染） | 必须（场景切换） |
| 立绘 | 无 | 有（left/center/right slots） |
| 选项呈现 | 消息流内按钮 | VN 选项框 |
| 变量面板 | NarrativeTagsBar + FloatingPanel | 无（或 HUD overlay） |
| 叙事标签 | `<time>`/`<location>` 提取为 token | 无（叙事嵌入对话行） |

**结论：Text 不是 Light 的子集，而是两种平行的渲染模式。** 它们共享同一个 WE 引擎后端，但前端渲染容器完全不同。Text 游戏是 WE 引擎驱动的 light 游戏的一种**扩展性强的变体**，而非 Light 的降级版。

### 5.3 正确的架构关系

```
WE 引擎（后端）— 所有游戏类型共享
├── 变量系统（Variables，5 层级联）
├── 世界书（Worldbook，变量门控）
├── 记忆系统（Memory，stage_tags 过滤）
├── 宏展开（macros/expand.go）
├── 后端正则（processor/regex.go）
├── Parser（三层 fallback）
│   ├── xml_game_response → VN 指令 → Light/Rich 前端
│   └── xml_narrative / fallback → Narrative+Options → Text 前端
└── 调度器（scheduler，P-4G）

前端渲染层（按游戏类型完全独立）
├── TextSessionPage
│   ├── NarrativeTagsBar（token 驱动）
│   ├── MessageList（消息流）
│   ├── FloatingPanelHost（悬浮面板）
│   └── tokenExtract.ts（前端轻正则）
└── LightSessionPage
    ├── VN 舞台（背景图 + 立绘）
    ├── DialogueBox
    └── OptionsOverlay
```

### 5.4 共享组件（Text 和 Light 都可用）

- `NarrativeTagsBar`：Light 游戏也可以有时间/地点标签条
- `FloatingPanelHost`：Light 游戏也可以有角色属性面板（HUD 形式）
- `ui_config` 结构：主题色、字体、背景图在两种模式下通用
- 官方正则语法表：`<time>`、`<location>` 等标签在两种模式下都有意义

### 5.5 前端轻正则是否应该移到后端？

**不应该，理由：**

1. **渲染是前端职责**：`<em class="gold">` 变成金色文字是视觉决策，后端不应该知道"金色"
2. **ui_config 是前端配置**：`narrative_tags`、`floating_panels` 声明的是前端如何渲染，后端只存储不解析
3. **token 提取可以后端化，但不必须**：后端提取 token 的好处是前端更简单，坏处是后端需要感知 ui_config 的渲染意图，违反职责分离
4. **性能不是瓶颈**：前端 regex 对几百字的叙事文本几乎零开销
5. **TH 的参照**：TH 完全不做 AI 输出解析，GW 的前端轻正则已经是比 TH 更进一步的选择，不需要再往后端推

**可以后端化的部分**（v1 优化，非必须）：
- `StreamMeta` 加 `Tokens []NarrativeToken` 字段，后端提取官方标签
- 前提：官方标签表稳定后再做，避免频繁改后端接口

---

## 六、实施路径

### 阶段 A：官方标签表落地（可立即开始，零后端改动）

1. 在 `globals.css` 补充 `--color-em-gold` 等内联样式变量
2. 在 `MessageBubble` 加 `preprocessNarrative()` 函数，处理内联样式标签
3. 在 `tokenExtract.ts` 补充官方标签的默认 placement 规则
4. 写一份创作者文档（`CREATOR-GUIDE-RENDER.md`），说明官方标签用法

### 阶段 B：主题色扩展（内测后）

1. `themes.ts` 补充 `cyberpunk` / `parchment` / `minimal` 三套预设
2. `globals.css` 补充叙事标签色变量
3. `TextSessionPage` 支持 `ui_config.color_scheme.bg_image`（背景图）

### 阶段 C：后端 token 提取（v1，官方标签稳定后，可选优化）

前提：官方标签表已稳定，不再频繁变动。

1. `StreamMeta` 加 `Tokens []struct{ Type, Text, Style string }` 字段
2. `engine_methods.go` 在 `ApplyToAIOutput` 之后调用 `ExtractTokens()`
3. 前端 `handleTurnDone` 直接读 `turn.tokens`，不再需要前端 regex

注意：这是优化，不是必须。v0 前端 regex 方案已经足够稳定。

### 阶段 D：Light 游戏共享组件（Light 开发时）

1. 把 `NarrativeTagsBar` 和 `FloatingPanelHost` 提取为通用组件
2. `LightSessionPage` 复用这两个组件
3. 官方标签在 Light 模式下也生效

---

## 七、创作者入门示例

### Victoria（叙事 RPG）推荐配置

```
system_prompt 末尾追加：
每次回复开头必须输出：
<time>当前游戏内时间（格式：YYYY年M月D日 HH:mm）</time>
<location>当前地点（格式：区域·具体位置）</location>

重要物品或人名用金色强调：<em class="gold">物品名</em>
危险状态用红色：<em class="danger">危险描述</em>
系统提示用旁白：<aside>【系统】提示内容</aside>
```

```json
"ui_config": {
  "token_extract_rules": [
    { "tag": "time",     "placement": ["narrative_tags"] },
    { "tag": "location", "placement": ["narrative_tags"] }
  ],
  "narrative_tags": {
    "items": [
      { "id": "time",     "source": "token", "token_type": "time",     "icon": "🕐" },
      { "id": "location", "source": "token", "token_type": "location", "icon": "📍" }
    ]
  }
}
```

### 绿茵好莱坞（现代都市）推荐配置

```
post_history_instructions 末尾追加：
每次回复结尾输出手机状态摘要：
<status>体能:{竞技能力.当前体能} 状态:{竞技能力.竞技状态} 地点:{当前地点}</status>
```

```json
"ui_config": {
  "token_extract_rules": [
    { "tag": "time",   "placement": ["narrative_tags"] },
    { "tag": "status", "placement": ["panel:phone"] }
  ]
}
```
