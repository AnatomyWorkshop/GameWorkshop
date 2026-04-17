# GW-text游戏渲染规范v1

> 版本：2026-04-14 v1
> 范围：官方标签表、主题色变量、前端渲染管线、组件架构规范、浮窗可扩展性设计。
> 设计背景见 `inspiration/GW-RENDER-SYSTEM.md`。

---

## 一、官方标签表（Official Tag Registry）

### 1.1 设计原则

- **XML 风格**：`<tag>内容</tag>`，与后端 parser 已有的 `<Narrative>`、`<UpdateState>` 保持一致
- **前端提取**：v0 阶段全部在前端 `tokenExtract.ts` 处理，零后端改动
- **封闭枚举**：官方标签有限，前端保证渲染；创作者可自定义标签，但官方不保证渲染
- **不执行脚本**：只产出 token / cleanText，不允许任意 JS 注入

### 1.2 标签分类

#### A 类：叙事信息标签（→ NarrativeTagsBar）

提取后从叙事文本中移除，渲染到顶部标签条。

| 标签 | 用途 | 示例 | 默认图标 |
|---|---|---|---|
| `<time>` | 游戏内时间 | `<time>2025年5月11日 18:15</time>` | 🕐 |
| `<location>` | 当前地点 | `<location>临湖宅邸·书房</location>` | 📍 |
| `<weather>` | 天气/环境 | `<weather>阴雨，能见度低</weather>` | 🌧 |
| `<chapter>` | 章节/幕 | `<chapter>第三幕·背叛</chapter>` | 📖 |

提取规则：`tokenExtract.ts` 的 `extractTokens()`，placement 为 `["narrative_tags"]`。

#### B 类：内联样式标签（→ 消息流内渲染）

提取后**保留在叙事文本中**，由 `preprocessNarrative()` 转为带样式的 `<span>`。不需要在 `token_extract_rules` 里声明，自动处理。

| 标签 | 用途 | CSS 类 | 默认颜色变量 |
|---|---|---|---|
| `<em class="gold">` | 金色强调（重要物品/人名） | `.gw-em-gold` | `--color-em-gold` |
| `<em class="danger">` | 危险/警告 | `.gw-em-danger` | `--color-em-danger` |
| `<em class="info">` | 信息提示/系统消息 | `.gw-em-info` | `--color-em-info` |
| `<aside>` | 旁白/系统提示 | `.gw-aside` | `--color-aside` |
| `<quote>` | 引用/回忆/闪回 | `.gw-quote` | `--color-quote-border` |

处理位置：`runRegexPipeline('narrative')` 阶段（`ALICE_CORE_RULES` order 10–14），在 ReactMarkdown 之前完成替换。`preprocessNarrative()` 已移除，管线统一。

#### C 类：面板数据标签（→ 悬浮面板）

提取后从叙事文本中移除，数据路由到对应面板。

| 标签 | 用途 | 目标面板 | 说明 |
|---|---|---|---|
| `<status>` | 状态摘要 | `panel:phone` | 手机面板状态行 |
| `<news>` | 新闻/动态 | `panel:phone` | 足坛动态等 |
| `<memo>` | 备忘/笔记 | `panel:memo` | 通用备忘面板 |

提取规则：`tokenExtract.ts`，placement 为 `["panel:phone"]` 等。

#### D 类：系统控制标签（后端消费，前端不可见）

| 标签 | 处理层 |
|---|---|
| `<Narrative>` | 后端 parser，叙事文本包裹 |
| `<Options>` | 后端 parser，选项列表 |
| `<UpdateState>` | 后端 WE 引擎，简单 KV 变量更新 |
| `<UpdateVariable>` | 后端 WE 引擎，JSONPatch 格式变量更新 |

### 1.3 可扩展性

创作者可在 `token_extract_rules` 里声明自定义标签：

```json
"token_extract_rules": [
  { "tag": "mood", "placement": ["narrative_tags"], "style": "muted" }
]
```

自定义标签会被 `extractTokens()` 提取，显示为纯文本。官方标签有专属 CSS 类和渲染逻辑。

---

## 二、主题色变量规范

### 2.1 现有变量（已实现）

```css
--color-bg           --color-surface      --color-border
--color-text         --color-text-muted   --color-accent  --color-accent-hover
--color-quote        --color-user-bubble  --color-ai-bubble
--color-user-text    --color-user-border
--color-topbar-bg    --color-input-bg
--font-prose         --bubble-radius      --prose-line-height
```

### 2.2 A 阶段内联样式变量（已补充）

```css
/* B 类内联样式标签颜色 */
--color-em-gold       /* 默认 #d97706 */
--color-em-danger     /* 默认 #ef4444 */
--color-em-info       /* 默认 var(--color-accent) */
--color-aside         /* 默认 var(--color-text-muted) */
--color-quote-border  /* 默认 var(--color-accent) */
```

### 2.3 主题预设

| 主题名 | 状态 | 强调色 | 字体 |
|---|---|---|---|
| `default-dark` | ✅ | 紫色 `#7c6af7` | Inter |
| `gothic` | ✅ | 琥珀金 `#d97706` | Crimson Text |
| `soft-fantasy` | ✅ | 粉紫 `#e879f9` | Quicksand |
| `cyberpunk` | ✅ | 霓虹红 `#ff003c` | JetBrains Mono |
| `parchment` | ✅ | 绯红 `#b71c1c` | Georgia / serif |
| `minimal` | ✅ | 极简白 `#ffffff` | Inter |

### 2.4 主题预设不应只改颜色

在 GW 里，主题预设不应只是“换色表”。如果主题系统只是覆盖 CSS 变量，创作自由度会很快撞墙。  
建议把主题预设拆成 3 层：

1. **色彩层**：颜色、字体、圆角、边框、阴影  
2. **布局层**：中段聊天屏宽度、对齐方式、背景图层、消息容器留白  
3. **组件皮肤层**：TopBar、InputBar、Option buttons、Floating panels 的视觉形态

因此中长期建议把主题声明拆成：

```json
{
  "theme_preset": "gothic",
  "layout_preset": "novel-column"
}
```

其中：
- `theme_preset`：只负责颜色/字体/token
- `layout_preset`：允许完全改变中段消息屏布局，如窄栏小说式、全幅沉浸式、卡片式聊天屏

### 2.5 默认与覆盖策略（无声明也能玩）

目标：保证“创作者不声明时也能玩”、同时允许玩家全局偏好覆盖。

建议优先级（从高到低）：

1. **玩家全局偏好**（User Settings）  
   - 例如：玩家强制 `layout_preset = full-bleed`，或强制字体更大/对比更强  
   - 存储：localStorage / 用户账号设置
2. **游戏包声明**（Game `ui_config`）  
   - 创作者为这个游戏设计的主题与布局  
3. **平台默认**（GW Default）  
   - “无声明”情况下始终落到稳定默认主题与默认布局

落地建议：
- 主题系统要显式支持 `player_override` 的合并策略（只覆盖主题/布局，不覆盖游戏逻辑）。
- 平台默认至少要做到“可读性强、对比足够、移动端不崩”。

---

## 三、渲染管线

```
AI 原始输出
    ↓ 后端 processor/regex.go（strip 占位符、格式化）
    ↓ 后端 parser/parser.go（三层 fallback）
    → 提取 Narrative / Options / StatePatch
    ↓ StreamMeta.Narrative（含 A/B/C 类标签）
    ↓ 前端 extractTokens()
    → A 类标签 → NarrativeTagsBar tokens（从文本移除）
    → C 类标签 → panel tokens（从文本移除）
    → cleanText（仅含 B 类标签 + 普通 Markdown）
    ↓ 前端 runRegexPipeline('narrative')（MessageBubble 内）
    → 清洗噪声（thinking/content 等）+ B 类标签 → <span/div class="gw-*">（仅白名单）
    → 同时移除 `<choice>...</choice>`（避免正文显示，供 options 兜底提取）
    ↓ ReactMarkdown 渲染（rehype-raw + rehype-sanitize）

安全边界（必须写死）：
- 不允许创作者/AI 输出任意 HTML 生效
- 仅允许官方规则生成的 `gw-*` 白名单结构通过 sanitize
- 不允许 `<script>`、事件属性、内联 style 等
```


## 四、组件架构

### 4.1 当前结构（2026-04-17）

```
src/
├── api/                        # API 类型 + 请求函数（含 StatItem 等声明式类型）
├── components/                 # 跨页面共享组件
│   ├── game/                   # GameCard, HeroSection, StatsBar, ActionBar
│   ├── layout/                 # AppLayout
│   ├── overlay/                # Popover（FloatingPanel 已迁移到 panels/）
│   └── social/                 # CommentCore
├── pages/
│   ├── game/
│   ├── my-library/
│   ├── public-library/
│   └── play/
│       └── text/               # Text 游玩页（自包含）
│           ├── TextPlayPage.tsx
│           ├── chat/           # ChatInput, MessageBubble, MessageList, StreamingBubble
│           ├── components/
│           │   ├── TextPlayTopBar.tsx
│           │   └── PanelSwitcherMenu.tsx
│           ├── hooks/
│           │   └── usePanels.ts
│           └── panels/         # 悬浮面板系统（自包含）
│               ├── index.ts            # 统一导出 + 新增 preset 指引
│               ├── FloatingPanel.tsx   # 通用外壳（behavior: peek/tool/pinned）
│               ├── PanelsHost.tsx      # 路由宿主，读取 floating_panels 声明
│               ├── panelLayout.ts      # 定位常量
│               ├── hooks/
│               │   └── useDraggable.ts # 拖动 hook（PointerEvent + localStorage）
│               ├── presets/            # 官方内置 preset（无游戏耦合）
│               │   ├── StatsPanel.tsx
│               │   ├── TagsPanel.tsx
│               │   ├── CharacterSheet.tsx
│               │   ├── TelemetryDebug.tsx
│               │   └── HtmlPanel.tsx
│               └── gamePresets/        # 游戏专属 preset（有游戏名耦合）
│                   ├── DataPanel_绿茵好莱坞.tsx
│                   └── SetupFormModal.tsx
├── queries/
├── stores/
├── styles/
└── utils/
    ├── tokenExtract.ts     # A/C 类标签提取（extractTokens, extractChoiceOptions）
    └── regexPipeline.ts    # 爱丽丝规则集 + 管线执行器（runRegexPipeline）
```

**原则**：`components/` 只放真正跨页面复用的组件。页面专属的组件、面板、preset 全部放在对应页面目录下，自包含。

### 4.2 Light 游玩页的预期结构

Light 游玩页的浮窗需求与 Text 完全不同（见第五节），因此独立实现：

```
pages/play/
├── text/                       # Text 游玩页（已有）
└── light/                      # Light 游玩页（待实现）
    ├── LightPlayPage.tsx
    ├── components/
    │   ├── LightPlayTopBar.tsx
    │   └── ...
    ├── stage/                  # VN 舞台：背景图、立绘、对话框
    │   ├── VNStage.tsx
    │   ├── SpriteSlot.tsx
    │   └── DialogueBox.tsx
    └── hud/                    # HUD overlay（如需浮窗）
        └── ...
```

`NarrativeTagsBar` 和 `FloatingPanel`（overlay 容器）在 Text 和 Light 都可能用到，届时从 `pages/play/text/` 提升到 `components/` 或 `components/play/`。

---

## 五、浮窗可扩展性设计

### 5.1 Text 游玩页的浮窗（当前实现）

Text 游玩页的浮窗是**数据展示型**：
- 只读，展示变量/token 数据
- 交互仅限于 hover 显示 / click 固定 / 关闭
- preset 类型：`character_sheet`、`phone_status`、`telemetry_debug`、`narrative_tags`

### 5.2 Light 游玩页的浮窗（待设计）

Light 游玩页的浮窗需要**交互型**支持：
- 可能包含按钮、输入框、选项列表
- 可能需要触发游戏事件（如打开背包、使用道具）
- 可能需要拖拽定位（react-rnd）

因此 Light 的浮窗系统需要**完全自制**，不复用 Text 的 `FloatingPanelHost`。

### 5.3 可扩展的 FloatingPanelDecl 类型设计

当前 `FloatingPanelDecl` 只支持 `type: "preset"`。为了支持 `html_panel` 和未来 Light 游玩页的交互型浮窗，需要扩展类型：

```typescript
// 当前（Text 游玩页）
interface FloatingPanelDecl {
  id: string
  type: 'preset'
  preset: 'narrative_tags' | 'phone_status' | 'character_sheet' | 'telemetry_debug'
  default_pinned?: boolean
  position?: 'top_center_bar' | 'right_stack'
  launcher: { icon: string; placement: 'topbar' }
}

// 扩展后
interface FloatingPanelDecl {
  id: string
  type: 'preset' | 'html_panel' | 'interactive' | 'custom'
  // type: 'preset' — 数据展示型，Text 游玩页用
  preset?: 'narrative_tags' | 'phone_status' | 'character_sheet' | 'telemetry_debug'
  // type: 'html_panel' — iframe 渲染原始 HTML 模板（如 down.txt），变量注入后沙箱执行
  config?: {
    template_url?: string   // 指向游戏资产的 URL，如 /assets/绿茵好莱坞/down.txt
    inject_mode?: 'getAllVariables' | 'raw_replace'  // 变量注入策略
  }
  // type: 'interactive' — 交互型，Light 游玩页用，内容由前端 preset 决定
  interactive_preset?: 'inventory' | 'skill_tree' | 'map' | string
  // type: 'custom' — 创作者自定义（未来，需沙箱）
  behavior?: 'peek' | 'tool' | 'pinned'  // 见 5.3.1
  default_pinned?: boolean
  position?: 'top_center_bar' | 'right_stack' | 'bottom_bar' | 'free'
  launcher: { icon: string; label?: string; placement: 'topbar' | 'stage_hud' | 'none' }
}
```

**v0 阶段**：实现 `type: 'preset'` 和 `type: 'html_panel'`，`interactive` 和 `custom` 留空接口，Light 开发时填充。

### 5.3.1 面板行为预设（behavior）

把 `closeOnPanelClick` / `closeOnOutsideClick` / `headerHidden` 等布尔值收敛为三种行为预设：

| behavior | 关闭手势 | header | 适用场景 |
|----------|----------|--------|----------|
| `peek`（默认） | 点面板内关闭，点外不关 | 隐藏 | 只读展示型，快速查看后收起 |
| `tool` | 点外关闭，点内不关 | 显示 | 工具/设置/调试面板，防误触 |
| `pinned` | 只能点显式关闭按钮 | 显示 | 需要持续交互的面板（如 html_panel） |

`html_panel` 默认使用 `behavior: 'pinned'`，因为它包含可交互内容（手风琴展开/折叠），不能误触关闭。

### 5.3.2 TopBar 图标按钮栏

`launcher.placement === 'topbar'` 的面板在 TopBar 右侧渲染为纯图标按钮（无文字标签）：

```
TopBar 右侧：  ← 返回  |  游戏名  |  [图标1] [图标2] [···]
                                        ↑ 每个 topbar 面板一个按钮
```

实现要点：
- `TextPlayPage` 将 `panelStates` + `onTogglePanel(id)` 同时传给 `TextPlayTopBar` 和 `PanelsHost`
- `TextPlayTopBar` 遍历 `topbarPanels`，渲染 `<button>` + `panel.launcher.icon`
- 激活状态：`panelStates[panel.id] === true` 时按钮高亮（`active` class）
- 原有的 📖/📊/🗂/··· 固定按钮保留，topbar 面板按钮插入其左侧

### 5.4 PanelSwitcherMenu 的可扩展性

`PanelSwitcherMenu` 当前是 Text 游玩页专属的下拉菜单。Light 游玩页的面板入口形式可能完全不同（如 HUD 图标组、快捷键触发）。

因此：
- `PanelSwitcherMenu` 保留在 `pages/play/text/components/`，不提升为通用组件
- Light 游玩页自制面板入口，不复用此组件
- 如果未来两者有共同的"面板状态管理"逻辑，可以把 `usePanels` hook 提升到 `pages/play/` 共享

### 5.5 Light 游戏的组件化创作方向

Light 游戏不应该只是“Text + 背景图”。它应允许 CW 提供更丰富的模板组件，让创作者像搭积木一样组合界面，而不是被当前 Text 页锁死。

建议 Light / Rich 方向的组件库至少包含：

- **舞台组件**：背景图层、立绘槽位、CG 覆盖层、镜头遮罩、时间天气角标
- **对话组件**：对话框、姓名牌、头像条、语音气泡、旁白块、系统提示条
- **HUD 组件**：属性条、地图按钮、背包按钮、任务追踪、小手机面板、日志面板
- **互动组件**：选项框、快捷操作条、拖拽浮窗、可折叠侧栏、标签页容器
- **氛围组件**：环境光层、噪点层、边框装饰、字幕样式、转场蒙版

对应到 CW，建议不要只让创作者填 `ui_config.color_scheme`，而是提供“组件模板选择 + 参数面板”：

- 选择 `DialogueBox` 模板
- 选择 `StatusHUD` 模板
- 选择 `TopBar` / `BottomActionBar` 模板
- 为每个组件填写位置、大小、风格 token、是否可关闭、是否随主题联动

这样 Text/Light 共用的是“声明驱动”和“主题 token”，而不是共用同一套页面容器。

### 5.6 声明位置总表（建议列表化）

你的理解是对的。随着主题、组件、浮窗越来越多，**声明位置必须列表化**，否则创作者会不知道“这个效果该写在哪”。  
建议在文档里始终维护一张“声明位置总表”：

| 目标 | 推荐声明位置 | 说明 |
|---|---|---|
| 主题色、字体、阴影 | `ui_config.theme_preset` / `ui_config.color_scheme` | 色彩 token 与局部覆写 |
| 中段聊天屏布局 | `ui_config.layout_preset` / `ui_config.message_layout` | 决定列宽、对齐、背景层、留白 |
| 顶部叙事标签 | `ui_config.narrative_tags` | token 条 / 标签条 / 标题副标题条 |
| 数据与调试浮窗 | `ui_config.floating_panels` | preset / launcher / position |
| 内联文本样式 | 叙事正文中的官方标签 | 如 `<em class="gold">` / `<aside>` / `<quote>` |
| Light 舞台组件 | `ui_config.stage` / `ui_config.components` | 背景、立绘槽位、HUD、对话框模板 |
| 交互型浮窗 | `ui_config.components[].interactive_panel` | Light / Rich 方向用 |

### 5.7 分析：下一步优先级建议

当前 Text 游玩页的架构（主题层 + 浮窗组件层 + 内联标签渲染）已能满足绝大多数文字交互类需求。为了不偏离内测与游戏落地的核心路径，接下来的优先级建议如下：

1. **最高优先级：跑通“创作配置 → 真实游玩页”的数据闭环**
   当前所有的主题、皮肤、面板展示都只在 `/play/test` 这个 Mock 页面中生效。真实游戏页需要能够从后端或本地数据库读取到创作者配置的 `ui_config`，并正确地将设定的 `theme_preset` 与 `floating_panels` 注入渲染。完成此步后，Text 游戏的框架才算真正可用。

2. **高优先级：Light 模式（VN舞台）基础框架**
   要想大幅提升平台对创作者与玩家的吸引力，引入能够支持立绘、背景图切换、音乐播放的 `LightPlayPage` (VNRenderer) 势在必行。它能在复用当前文本逻辑的同时，提供极强的视觉冲击力。

3. **不建议此时继续在 Text 模式上做重构解耦**
   目前前端代码结构（分离的面板、自包含的页目录、声明式的主题）已经达到了极好的解耦平衡。再往下抽象沙箱机制或第三方包导入，会陷入基建泥潭。内测期间建议锁死当前的官方组件库，验证跑通全流程。

---

## 六、渲染方式的打包 / 解包（Render Profiles）

你提出的“渲染方式上传到数据库，公共库导入时云端下载”方向是可行的，但必须同时满足：
- **离线导入可用**（不联网也能玩）
- **安全可控**（不允许下发任意前端代码执行）
- **可缓存可版本化**（同一个 profile 的渲染稳定可复现）

因此建议把“渲染方式”定义为**声明式 RenderProfile（JSON）+ 资源清单**，而不是“前端渲染代码”。

### 6.1 RenderProfile 的形态

```json
{
  "id": "profile:dark-blue-novel",
  "version": "1.0.3",
  "theme_preset": "default-dark",
  "layout_preset": "novel-column",
  "floating_panels": { "panels": [ /* preset refs */ ] },
  "narrative_tags": { /* items */ },
  "assets": [
    { "kind": "image", "path": "bg/nebula.webp", "sha256": "..." }
  ]
}
```

关键原则：
- profile 只引用“官方组件库里的组件/preset”，不携带 JS。
- profile 可带资源（背景图/字体文件/音频）但必须有 hash 校验。

### 6.2 游戏包与云端 registry 的关系

你的最新要求可以成立，而且很适合作为**内测后短期阶段的轻量方案**：
- 只支持**官方渲染库**，不开放第三方渲染包
- 游戏导入时只拉取它声明的官方 RenderProfile / RenderBundle
- 游戏卸载时同步删除对应安装记录与缓存引用，避免前端代码冗余
- 非官方渲染方式留到后续阶段，再单独做安全模型与沙箱

短期推荐把游戏包声明收敛为：

```json
{
  "ui_config": {
    "render_profile_ref": {
      "id": "official:dark-blue-novel",
      "version": "1.0.3"
    }
  }
}
```

对应的客户端策略：
1. 导入游戏时读取 `render_profile_ref`
2. 到**官方 registry** 查询该 profile 的声明与资源清单
3. 下载并安装到本地缓存目录（按 `id + version` 去重）
4. 在本地库中为这款游戏记录一个“已绑定 render profile”
5. 运行时只加载这个 profile 对应的官方 preset / assets，不复制一份前端实现到游戏包里
6. 卸载游戏时解除绑定；若没有其他游戏再引用该 profile，则自动清理缓存

这个方案的优点：
- **轻量**：游戏包不重复携带前端渲染代码
- **一致**：所有内测渲染都来自官方库，问题更容易复现
- **可控**：只允许官方 preset，升级和回滚更稳定
- **便于演进**：未来要开放非官方渲染时，可以在 registry 层扩展，不必推翻现有结构

短期需要接受的边界：
- **首次导入依赖联网**：如果本地还没有该官方 profile，就必须联网拉取
- **本地离线导入能力有限**：短期不追求“完全离线导入任意风格包”
- **离线 fallback 应保底可玩**：如果 profile 下载失败，至少回退到平台默认 `theme_preset / layout_preset`

因此短期结论是：
- **可行，而且建议就这样做**
- **不要让游戏包自带前端渲染代码**
- **不要在短期阶段引入非官方渲染方式**

中期再升级为“双轨制”：
- 公共库导入：优先官方 registry 下载
- 本地离线导入：允许携带官方 RenderProfile 快照或资源镜像
- 两者都仍然只引用官方组件/preset，不携带任意 JS

### 6.3 是否需要游戏包内自带前端渲染代码？

短期答案：**不需要，也不应该**。

v0/v1 阶段强烈不建议。原因：
- 安全与审核成本爆炸（任意 JS、DOM 操作、外链资源）
- 兼容性难以保证（版本升级会破坏旧包）
- 一旦允许“带代码”，你就很难再阻止生态走向不可维护

更合适的架构是：
- 官方提供稳定的组件与 preset（Text/Light 各自一套）
- 创作者通过 CW 选择组件与参数，CW 输出声明式 profile
- 短期由官方 registry 按需安装，随游戏卸载清理
- 中期再补本地离线镜像 / embed fallback

如果未来确实要开放“自定义渲染代码”，建议单独设计沙箱：
- iframe 隔离 + CSP + 无 cookie + 白名单 API
- 明确该能力是“高级/不保证兼容”的实验特性

---

## 七、SillyTavern MVU 的画面能在 WE/GW 复现到什么程度？

以 “绿茵好莱坞” 为例，它的小手机状态栏和 UI 本质上来自：
- 浏览器端执行 JS（JS-Slash-Runner）
- regex_scripts 注入大段 HTML/CSS
- 可播放音频、拖拽、动态 DOM 更新

在 WE/GW 的目标路径里，我们不走“执行脚本注入 HTML”，而走：
- **WE 产结构化数据**（Variables / Tokens / Telemetry）

---

## 八、悬浮窗（FloatingPanel）现状与分类建议

### 8.1 现状（Text 游玩页）

当前 Text 页的浮窗都属于“展示型容器”，核心可配置项来自 `FloatingPanel`：
- `headerHidden`：是否显示标题栏（标题/关闭按钮所在）
- `closeOnOutsideClick`：点击面板外是否关闭
- `closeOnPanelClick`：点击面板内是否关闭（用于“点击即关闭”的轻面板）
- `draggable`：是否允许拖拽（目前用于调试或少数面板）

结合现有 preset（如 `character_sheet` / `phone_status` / `telemetry_debug`），当前默认策略倾向于：
- 展示型面板：隐藏 header，点击面板内关闭（快速查看）
- 调试面板：显示 header，点击外部关闭（避免误触）

### 8.2 分类思路（建议）

你提出的分类标准是可行的，而且比“按具体面板名硬编码”更稳定：

1. **可互动 / 不可互动**
   - 不可互动（只读展示）：允许 `closeOnPanelClick=true`（点一下就收起，成本最低）
   - 可互动（包含输入、按钮、列表、滑动等）：应强制 `closeOnPanelClick=false`，避免误触导致丢操作

2. **关闭手势：点内 / 点外**
   - 点外关闭：适合“工具箱/设置面板/调试面板”
   - 点内关闭：适合“轻提示/一眼读完的信息卡”

更进一步的落地方向是把这些行为抽象成“面板行为预设”，例如：
- `behavior: 'peek'`（点内关闭、点外不关、无 header）
- `behavior: 'tool'`（点外关闭、点内不关、有 header）
- `behavior: 'pinned'`（都不自动关闭，只能点显式按钮关闭）

这样 `FloatingPanelDecl` 的声明就可以从”列一堆布尔值”变成”选一个行为 preset + 少量覆写”，可维护性会更好。
- **GW 用 preset 渲染**（phone_status / telemetry_debug / character_sheet）
- **可选的 Light/VNRenderer** 在舞台层承载更丰富的画面与 HUD

因此结论是：
- “小手机面板的视觉形态”现在就能做：用 `floating_panels` + `preset: phone_status`，并用 token/变量填充内容。  
- “MVU 变量严格更新”在 WE 层能做：用 `<UpdateVariable>` / JSONPatch 规则、后端校验与落库。  
- “脚本注入 HTML + 任意 DOM 能力”不会支持：用 preset + 声明式组件替代。  
- 音乐/播放列表/跨回合持久音频：可作为 GW 的官方组件（例如 `AudioPlayerHUD`）逐步补齐，但仍是”声明式引用”，不是脚本执行。

### 8.3 P2 阶段：FloatingPanel 重构方向

**当前问题**

`behavior` 预设目前只在 `PanelsHost.behaviorProps()` 里转换为布尔 props，`FloatingPanel` 组件本身仍然接受散装的 `closeOnPanelClick` / `closeOnOutsideClick` / `headerHidden`。这带来两个问题：

1. **可交互面板的 bug 风险**：`PhoneStatus` 多 Tab 扩展后，Tab 按钮点击会冒泡到面板根节点，触发 `closeOnPanelClick` 关闭。当前 `peek` 行为（点内关闭）与可交互内容天然冲突，必须在 P2 前解决。

2. **逻辑分散**：`behavior` 的语义在 `PanelsHost` 里，`FloatingPanel` 不知道自己是什么行为，调试困难。

**重构方案：`behavior` 下沉到 `FloatingPanel`**

```tsx
// 重构后的 FloatingPanel props
interface FloatingPanelProps {
  id: string
  title: string
  icon?: React.ReactNode
  onClose: () => void
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
  /**
   * 面板行为预设（取代散装布尔值）：
   * - peek：无 header，点面板内任意位置关闭。适合只读快速查看（character_sheet、phone_status 旧版）
   * - tool：有 header + 关闭按钮，点面板外关闭。适合工具/调试面板（telemetry_debug）
   * - pinned：有 header + 关闭按钮，只能点 × 关闭。适合含交互内容的面板（PhoneStatus 多 Tab、html_panel）
   */
  behavior?: 'peek' | 'tool' | 'pinned'
  draggable?: boolean
  // 以下 props 保留向后兼容，behavior 优先
  titleHidden?: boolean
  closeOnOutsideClick?: boolean
  headerHidden?: boolean
  closeOnPanelClick?: boolean
}
```

内部推导逻辑：

```tsx
const resolvedBehavior = behavior ?? (
  closeOnPanelClick ? 'peek' :
  closeOnOutsideClick ? 'tool' :
  'pinned'
)
const showHeader = resolvedBehavior !== 'peek'
const clickInsideCloses = resolvedBehavior === 'peek'
const clickOutsideCloses = resolvedBehavior === 'tool'
```

**`peek` 行为的点击关闭需要精确化**

当前 `closeOnPanelClick` 是在根节点 `onClick` 上触发，任何子元素点击都会冒泡关闭。重构后 `peek` 行为应改为：只在点击**面板背景**（根节点本身，非子元素）时关闭，避免误触内部文字选中等操作：

```tsx
// 根节点 onClick 改为：
onClick={(e) => {
  if (clickInsideCloses && e.target === e.currentTarget) onClose()
}}
```

**`PanelsHost` 简化**

重构后 `PanelsHost` 里的 `behaviorProps()` 函数可以删除，直接传 `behavior` 给 `FloatingPanel`：

```tsx
<FloatingPanel behavior={p.behavior ?? (p.type === 'html_panel' ? 'pinned' : 'peek')} ...>
```

**实施时机**：在 `PhoneStatus` 多 Tab 扩展之前完成，否则 Tab 点击会触发面板关闭。

---

## 六、Text 游玩页扩展畅想

> 当前 MVP 只做稳核心链路。以下是内测后可以逐步加入的组件和能力，供创作者参考设计方向。

### 6.1 消息流增强

**`[[say|角色|台词]]` 对话块**（已实现）
角色头像 + 台词气泡，适合多角色叙事。未来可扩展：
- 角色头像从 `ui_config.characters` 读取自定义图片
- 台词气泡颜色按角色配色区分

**`[[image|url|caption]]` 内联图片块**（待实现）
在消息流内插入图片（场景图、道具图、地图局部），不切换到 VN 舞台。适合 Text 游戏偶尔需要视觉辅助的场景。

**`[[choice|选项1|选项2|...]]` 内联选项块**（已实现，可扩展）
当前选项以圆角按钮呈现。可扩展为：
- 卡片式选项（带图标/描述）
- 带风险提示的选项（`[[choice|danger|攻击|逃跑]]`）

**消息流背景图层**（待实现，阶段 B）
Text 游戏以文字为主，背景图作为氛围渲染：低饱和度纹理、渐变、高度模糊的场景图。不切换场景，只做氛围。

### 6.2 数据面板扩展

**`inventory` preset**（待实现）
物品栏面板，展示 `物品栏.*` 前缀的变量，支持图标和数量。适合 RPG 类游戏。

**`map` preset**（待实现）
简单地图面板，展示当前位置和可前往地点。数据来自变量，渲染为 SVG 或图片叠加标记。

**`timeline` preset**（待实现）
时间线面板，展示关键事件历史。数据来自 `生涯记录.*` 类变量或专用 `<event>` 标签。

**变量变化动画**（待实现）
每回合对比前后 diff，数值变化时短暂高亮（金币 +10 绿色闪烁，HP -5 红色闪烁）。

### 6.3 NarrativeTagsBar 扩展

当前标签条只显示文本。可扩展：
- **进度条标签**：`{ type: 'bar', key: '生命值', max: 100 }` → 渲染为细进度条
- **图标标签**：`{ type: 'icon', key: '状态', icon_map: { '中毒': '☠', '燃烧': '🔥' } }`
- **可点击标签**：点击展开对应浮窗面板

### 6.4 TopBar 扩展

**可隐藏 TopBar**（设计待定，见 F9-RENDER-PLAN.md §2.3）
沉浸式阅读模式，TopBar 滑出视口，鼠标移到顶部时临时浮现。

**世界书抽屉**（待实现）
TopBar 📖 按钮打开右侧抽屉，展示游戏世界书词条（只读）。需要后端 `GET /play/games/worldbook/:id` 接口。

**存档管理**（待实现）
TopBar ⧉ 按钮打开存档列表，支持切换/新建/删除存档。

### 6.5 导入链路的当前限制

**本地 JSON 导入**：纯前端解析，`ui_config` 被丢弃（硬编码 `null`）。测试官方标签渲染必须走后端导入（PNG 或公共库），不能用本地 JSON 导入。

**修复方向**：本地 JSON 导入时，解析 `data.ui_config` 字段并存入 localStorage 的 `LibItem`，`TextPlayPage` 优先读 `session.game_id` 对应的后端 `ui_config`，fallback 到 localStorage 里的 `ui_config`。

---

## 七、实施清单

### 阶段 A：官方标签落地

- [x] 架构调整：`components/play/presets/` → `pages/play/text/panels/presets/`
- [x] 架构调整：`features/playPanels/` → `pages/play/text/components/`
- [x] `globals.css` 补充 `--color-em-gold` 等 5 个内联样式变量
- [x] `globals.css` 补充 `.gw-em-gold` / `.gw-em-danger` / `.gw-em-info` / `.gw-aside` / `.gw-quote` CSS 类
- [x] `MessageBubble` 加 `preprocessNarrative()` 函数（B 类标签 → gw-* span）
- [x] `themes.ts` 为现有 3 套主题补齐内联样式色变量
- [x] `api/types.ts` 扩展 `FloatingPanelDecl`（加 `interactive` / `custom` type，加 `position: 'free'`）

### 阶段 B：主题预设完善

- [x] `themes.ts` + `globals.css` 补充 `cyberpunk` / `parchment` / `minimal` 等全套 6 种预设
- [x] `TextPlayPage` 支持 `ui_config.color_scheme.bg_image`（背景图层）
- [x] `TextPlayPage` 落实 `theme_preset` 与 `layout_preset`
- [x] 底部 `☰` 上拉菜单改造为纵向操作面板，点击空白处关闭
- [x] 移除原有的组件换肤（极简/玻璃）机制，将样式统一收敛到主题内
- [x] 移除气泡样式切换与代码，全局固定使用文本流呈现

### 阶段 B.5：架构重构 + 爱丽丝规则集（2026-04-15）

- [x] `components/chat/` → `pages/play/text/chat/`（Text 专属组件归位，`components/` 只留真正共享组件）
- [x] 新增 `utils/regexPipeline.ts`：爱丽丝规则集（`alice:core`）+ 管线执行器
- [x] `api/types.ts` 新增 `RegexRule` / `RegexProfile` / `RegexProfileRef` 类型
- [x] `UIConfig` 新增 `regex_profiles?: RegexProfileRef[]`
- [x] `MessageBubble` 接入 `runRegexPipeline`（渲染前跑爱丽丝规则集）
- [x] `TextPlayPage.handleTurnDone` 接入 `runRegexPipeline`（token 提取前跑 extract 规则）

### 阶段 B.6：绿茵好莱坞前端改造（P1，当前阶段）

> 对应 `inspiration/绿茵好莱坞-改造方案.md` 第七节任务清单。

- [x] **`FloatingPanelDecl` 类型扩展**（`api/types.ts`）
  - 新增 `type: 'html_panel'`，`config.template_url`，`config.inject_mode`
  - 新增 `behavior: 'peek' | 'tool' | 'pinned'`，`launcher.label`
- [x] **爱丽丝规则集重构**（`regexPipeline.ts`）
  - `alice:core`（order 1-19）：只保留平台通用规则，不含游戏专属标签
  - 新增 `alice:extended`（order 20-39）：通用扩展标签，游戏按需引用
  - `stat-up` / `stat-down` / `result-card` / `media-quote` 移入 `alice:extended`
- [x] **CSS 扩展**（`globals.css`）
  - `alice:core` 区块：现有 `gw-em-*` / `gw-aside` / `gw-quote`
  - `alice:extended` 区块：`gw-em-stat-up` / `gw-em-stat-down` / `gw-result-card` / `gw-media-quote`，含扩展注释
- [x] **F22 StatsPanel 进度条扩展**（`StatsPanel.tsx`）
  - `shouldShowBar()` 函数：`group === '核心能力'` / `'体能'` / `'竞技状态'` 自动渲染进度条
  - `fifaColor()` 函数：≥80 绿 / ≥60 黄 / <60 红
- [x] **TopBar 图标按钮栏**（`TextPlayTopBar.tsx`）
  - `launcher.placement === 'topbar'` 的面板渲染为纯图标按钮，插入固定按钮左侧
  - 激活状态高亮（`color-accent`）
- [x] **`HtmlPanel.tsx` 新建**（`pages/play/text/panels/presets/HtmlPanel.tsx`）
  - `getAllVariables` 模式：注入 mock JS-Slash-Runner API（绿茵好莱坞 down.txt）
  - `raw_replace` 模式：替换 `const raw = null;`（美高之路）
  - `key={hashVars}` 强制重建，等 `streamDone` 后渲染
- [x] **`PanelsHost` 扩展**（`PanelsHost.tsx`）
  - `behaviorProps()` 函数：将 `behavior` 预设转为 FloatingPanel 布尔 props
  - 新增 `html_panel` 路由，传入 `streamDone`
  - 移除旧的 preset 硬编码 behavior 逻辑
- [x] **`TextPlayPage` 传入 `streamDone`**（`TextPlayPage.tsx`）
  - 两处 `PanelsHost` 均传入 `streamDone={!streaming}`

### 待完成（P2）

**前置：FloatingPanel 重构（✅ 已完成）**

- [x] `FloatingPanel.tsx`：新增 `behavior` prop，内部推导 `showHeader` / `bgClickCloses` / `outsideClickCloses`
  - `peek`：无 header，`onClick` 只在 `e.target === e.currentTarget` 时关闭（背景点击，不响应子元素冒泡）
  - `tool`：有 header，`mousedown` 监听外部点击关闭
  - `pinned`：有 header，只有 × 按钮能关闭（× 按钮加了 `e.stopPropagation()`）
  - 旧版散装 props（`closeOnPanelClick` / `closeOnOutsideClick` / `headerHidden`）保留并标记 `@deprecated`，向后兼容推导逻辑：`closeOnPanelClick → peek`，`closeOnOutsideClick → tool`，否则 `pinned`
  - `canDrag = draggable && showHeader`，`peek` 行为无 header 时自动禁用拖拽
- [x] `PanelsHost.tsx`：删除 `behaviorProps()` 转换函数，改为 `resolveBehavior()` 直接返回 `behavior` 字符串传给 `FloatingPanel`
  - 默认规则：`html_panel → pinned`，`telemetry_debug → tool`，其余 `peek`

**功能扩展（FloatingPanel 重构完成后）**

- [x] `PhoneStatus_绿茵好莱坞.tsx`：4-Tab 布局（档案/履历/人脉/足坛），`behavior: 'pinned'`
  - 档案 Tab：`display_vars` 指定变量 + 基本信息/竞技能力/核心能力三组 KV
  - 履历 Tab：俱乐部现状 + 生涯记录
  - 人脉 Tab：`社交关系` 对象，好感度 + 亲密状态
  - 足坛 Tab：`足坛动态` 对象，发布者/时间/内容/点赞数
  - 文件命名加游戏标识（见 8.4 节扩展设计说明）
- [x] `game.json` 补充 `preset_entries` 叙事标签指令（`order: 1`，告知 AI 何时输出 stat-up/stat-down/result-card/media-quote）
- [x] 绿茵好莱坞 `game.json`：`regex_profiles: [{ ref: "alice:extended" }]`，`html_panel` 面板（down.txt），panel `behavior`/`label` 字段补全，JSONPatch 冲突条目 `enabled: false`

### 阶段 C：后端 token 提取（官方标签稳定后，可选）

- [ ] `StreamMeta` 加 `Tokens []NarrativeToken` 字段
- [ ] 后端 `ExtractTokens()` 提取 A 类官方标签
- [ ] 前端 `handleTurnDone` 直接读 `turn.tokens`，移除前端 regex

### 阶段 D：Light 游玩页（Light 开发时）

- [ ] `LightPlayPage` 自制 VN 舞台 + HUD
- [ ] `FloatingPanelDecl.type: 'interactive'` 实现交互型浮窗
- [ ] 共享组件提升：`NarrativeTagsBar`、`FloatingPanel` 移到 `components/`

---

## 八、当前前端架构状态（2026-04-17）

> 详细目录结构见第四节 4.1。

架构要点：
- `panelRegistry.ts` 和 `gamePresets/index.ts`（注册表）已删除，`PanelsHost` 改为直接 import
- `FloatingPanel` 已从 `components/overlay/` 迁移到 `panels/FloatingPanel.tsx`，`behavior` 下沉到组件内部
- `StatsPanel` / `TagsPanel` 已从 `panels/` 根目录移入 `panels/presets/`
- `preprocessNarrative()` 已移除，B 类标签转换统一走 `runRegexPipeline('narrative')`
- `StatItem` 类型已扩展（`display` / `bar_max` / `bar_color`），`StatsPanel` 去除硬编码逻辑

---

### 8.4 浮窗面板扩展设计

#### 当前架构（已实现）

面板系统分两层：

**平台内置 preset**（`presets/` 目录，`PanelsHost` 直接 import）
- `character_sheet`：通用角色属性展示，任何游戏可用
- `telemetry_debug`：调试工具，显示 token 用量等
- `html_panel`：iframe 沙箱渲染，游戏自带 HTML 文件

**游戏专属 preset**（`gamePresets/` 目录，通过注册表解耦）
- `PanelsHost` 只 import `panelRegistry`，不感知具体游戏
- 游戏面板在 `gamePresets/index.ts` 里注册，`PanelsHost` 永远不动
- 新增游戏面板：创建 `ComponentName_游戏slug.tsx` → 在 `index.ts` 加一行 `registerPreset`

```
panels/
  panelRegistry.ts              ← Map + registerPreset / getPreset
  PanelsHost.tsx                ← import './gamePresets'（副作用触发注册）
  presets/                      ← 平台内置，PanelsHost 直接 import
  │  CharacterSheet.tsx
  │  TelemetryDebug.tsx
  │  HtmlPanel.tsx
  gamePresets/                  ← 游戏专属，唯一需要维护的地方
     index.ts                   ← registerPreset('phone_status', ...)
     PhoneStatus_绿茵好莱坞.tsx
```

#### 关于"游戏包自带面板"的可行性判断

**为什么不做运行时动态 TSX 加载**

游戏包里放 `.tsx` 源码需要在浏览器里运行编译器，不可行。放预编译 ESM bundle 技术上可行（`import(url)`），但有三个硬问题：

1. React 多实例：游戏 bundle 里的 React 和平台的 React 是两份，hooks 会报错。需要 import map 或 module federation 解决，维护成本高。
2. 平台升级风险：每次平台升级 React 版本，所有游戏预编译 bundle 可能失效。
3. 游戏创作者门槛：需要自己跑构建工具，externalize 依赖，这对非开发者不现实。

**`html_panel` 已经是"游戏包自带面板"的正确答案**

游戏包里放一个 HTML 文件（如 `down.txt`），平台注入变量，iframe 沙箱执行。游戏创作者完全控制 UI，不需要任何构建工具，兼容 SillyTavern 生态的现有卡片。这覆盖了"游戏包自带面板"需求的 80%。

`html_panel` 当前的限制：
- 每次变量变化重建 iframe，内部状态丢失（Tab 选中、滚动位置等）
- 无法访问平台主题色变量（`--color-accent` 等 CSS 变量在 iframe 内不继承）
- 高度固定（560px），不能自适应内容

#### 扩展路线图

**近期（当前阶段）：静态注册表 + html_panel**

现状已满足需求。游戏专属 TSX 面板通过 `gamePresets/index.ts` 注册，`html_panel` 覆盖零代码场景。

**中期：增强 html_panel 通信能力**

给 iframe 加 `postMessage` 通信桥，解决状态丢失问题：

```
平台 → iframe：{ type: 'gw:vars_update', variables: {...} }
iframe → 平台：{ type: 'gw:resize', height: 420 }（自适应高度）
```

这样变量更新时不重建 iframe，内部状态保留，且 iframe 可以主动上报所需高度。同时注入平台主题色到 iframe 的 CSS 变量，让 HTML 面板能跟随主题。

**中期：数据驱动 preset（`data_driven`）**

在 `game.json` 里声明 Tab 结构和变量映射，平台提供通用渲染引擎，游戏不写任何代码：

```jsonc
{
  "id": "phone",
  "preset": "data_driven",
  "tabs": [
    {
      "id": "profile", "label": "档案",
      "groups": [
        { "title": "基本信息", "prefix": "基本信息" },
        { "title": "竞技能力", "prefix": "竞技能力", "exclude": ["竞技能力.核心能力"] }
      ]
    },
    { "id": "news", "label": "动态", "type": "news_feed", "var": "足坛动态" },
    { "id": "network", "label": "人脉", "type": "relation_map", "var": "社交关系" }
  ]
}
```

平台内置几种 Tab 类型（`kv_groups`、`news_feed`、`relation_map`、`progress_bars`），覆盖大多数游戏的数据展示需求。游戏创作者只需要声明数据结构，不需要写 HTML 或 TSX。

**远期：WE 引擎能力对齐**

WE 引擎（SillyTavern 生态）的核心能力是：游戏包携带完整的 JS 逻辑，在沙箱里执行，通过标准 API 与宿主通信。GW 的对应方向是：

- `html_panel` + postMessage 桥 = WE 的 iframe 扩展模式
- `data_driven` preset = WE 的声明式 UI 模式
- `gamePresets/` 注册表 = WE 的插件注册模式（平台开发者用）

三条路并行，游戏创作者按能力选择：零代码用 `data_driven`，有 HTML 能力用 `html_panel`，需要深度集成找平台开发者加 `gamePresets`。

---

## 九、爱丽丝规则集（Alice Ruleset）

### 9.1 定位

爱丽丝规则集（`alice:core`）是 GW 官方内置的正则替换规则集，对所有 Text 游戏渲染默认启用。它在渲染管线的最前端运行，负责清理模型输出噪声、标准化格式，让后续的标签提取和 Markdown 渲染得到干净的输入。

**管线位置**：
```
AI 原始输出
    ↓ runRegexPipeline(text, regexProfiles, 'narrative')  ← 爱丽丝规则集在此
    ↓ extractTokens()（A/C 类标签提取）
    ↓ preprocessNarrative()（B 类标签 → gw-* span）
    ↓ ReactMarkdown 渲染
```

### 9.2 当前规则表

规则定义在 `src/utils/regexPipeline.ts`，按 `order` 升序执行。

**alice:core（所有游戏默认启用）**

| order | 规则说明 | pattern | replacement | scope |
|---|---|---|---|---|
| 1 | 移除 CoT 思考块 | `<thinking>[\s\S]*?</thinking>` | `""` | narrative |
| 2 | 剥离 content 包裹 | `<content>([\s\S]*?)</content>` | `"$1"` | narrative |
| 3 | 移除 choice 块 | `<choice>[\s\S]*?</choice>` | `""` | narrative |
| 10 | `<em class="gold">` → 金色强调 | — | `gw-em-gold` | narrative |
| 11 | `<em class="danger">` → 红色警告 | — | `gw-em-danger` | narrative |
| 12 | `<em class="info">` → 蓝色提示 | — | `gw-em-info` | narrative |
| 13 | `<aside>` → 旁白块 | — | `gw-aside` | narrative |
| 14 | `<quote>` → 引用块 | — | `gw-quote` | narrative |

**alice:extended（游戏按需引用：`{ ref: "alice:extended" }`）**

| order | 规则说明 | pattern | replacement | scope |
|---|---|---|---|---|
| 20 | `<em class="stat-up">` → 数值提升（绿） | — | `gw-em-stat-up` | narrative |
| 21 | `<em class="stat-down">` → 数值下降（红） | — | `gw-em-stat-down` | narrative |
| 22 | `<result-card>` → 结果卡片 | — | `gw-result-card` | narrative |
| 23 | `<media-quote>` → 媒体引用块 | — | `gw-media-quote` | narrative |
| 24-39 | 预留 | — | — | — |

### 9.3 扩充规则指南

根据真实游戏测试结果，在 `ALICE_CORE_RULES` 数组追加新规则：

```typescript
{
  order: 3,           // 唯一序号，数字越小越先执行
  pattern: '...',     // JS 正则字符串（不含 / 包裹）
  replacement: '...',  // 纯文本或 $1/$2 捕获组引用
  scope: 'narrative', // 'narrative'=渲染前 | 'extract'=token提取前
  flags: 'gi',        // 可选，默认 'g'
}
```

**候补规则（待真实游戏测试后确认）**：
- `<recap>...</recap>` — 部分游戏用于内部总结，不应展示给玩家
- `<theater>...</theater>` — 明月秋青格式的剧场块
- `<timeline>...</timeline>` — 时间线块

### 9.4 创作者自定义规则（bundled）

创作者可在游戏包内声明额外规则，随游戏导入时安装：

```json
{
  "ui_config": {
    "regex_profiles": [
      {
        "ref": "creator:my-format",
        "bundled": true,
        "rules": [
          { "order": 10, "pattern": "<theater>[\\s\\S]*?</theater>", "replacement": "", "scope": "narrative", "flags": "gi" }
        ]
      }
    ]
  }
}
```

爱丽丝规则集（`alice:core`）始终最先加载，创作者规则的 `order` 建议从 10 起步，避免与官方规则冲突。

---

## 十、计划归档与接下来的方向

### 已完成（2026-04-17 归档）

**P0 已完成项**
- ✅ `<choice>` C 类标签前端实现：`extractChoiceOptions()` 已在 `tokenExtract.ts` 实现，`handleTurnDone` 读取并 `setLastOptions`，选项纵向渲染为按钮
- ✅ `choiceColumns` 布局参数已移除，选项固定纵向排列，不再依赖 `ui_config` 声明
- ✅ `runRegexPipeline` 统一管线：`preprocessNarrative()` 已移除，B 类标签转换全部走 `alice:core`，`splitSayBlocks` 路径对齐

**架构已完成项**
- ✅ `FloatingPanel` 迁移到 `panels/`，`behavior` 下沉到组件内部
- ✅ `StatsPanel` / `TagsPanel` 移入 `panels/presets/`，`StatItem` 类型声明式扩展（`display` / `bar_max` / `bar_color`）
- ✅ `runtimeCfg` 响应式：`gw:runtime` 事件桥接 TopBar 保存 → TextPlayPage 更新
- ✅ 错误信息人性化：DeepSeek 401 / 429 / concurrent_generation 等场景有明确提示
- ✅ `onTurnDone` 先于 `endStream` 执行，避免 floors 更新前 buffer 已清的空白帧

---

### 接下来的计划（2026-04-17）

#### P0：前后端验证闭环（当前阶段）

**目标**：跑通"创作配置 → 真实游玩页"的完整数据链路。

1. **重新 seed 数据库**
   - `./seed.exe --data ../data/cloud/games --force`
   - 验证 victoria `game.json` 的 `floating_panels`（tags/stats/character）和 `stats_bar.items` 写入正确

2. **前后端联调**
   - 启动后端，导入 victoria 游戏，验证 SSE 流正常（`event: token` + `event: meta`）
   - 验证 `<choice>` 块被正确提取并渲染为选项按钮
   - 验证 `<UpdateState>` → `variables` → StatsPanel 更新链路
   - 验证 DeepSeek API key + base_url 配置后能正常生成

3. **已知待修复**
   - `extract` scope 管线：`runRegexPipeline('extract')` 目前没有 `scope: 'extract'` 的规则，`<thinking>` 块在 token 提取前不会被清理。修复：在 `ALICE_CORE_RULES` 里为 order-1 规则加 `scope: 'extract'` 副本
   - 本地 JSON 导入丢失 `ui_config`：`MyLibraryPage` 硬编码 `ui_config: null`，测试官方标签渲染必须走后端导入（短期接受此限制）

#### P1：内测前补全

1. **爱丽丝规则集扩充**：根据真实游戏测试结果补充候补规则（`<recap>` / `<theater>` 等），不提前硬编码未验证规则

2. **主题扩展预留**：内测阶段锁定官方 6 套主题 + `color_scheme` 局部覆盖；中期再加 `custom_theme`

3. **`html_panel` postMessage 桥**：变量更新时不重建 iframe，内部状态保留（Tab 选中、滚动位置）

#### P2：全局模型管理（CC-Switch 式）

**目标**：任何页面（包括 Text 游玩页）都能访问统一的模型配置，支持 WE 引擎多槽位独立绑定。

**入口**：AppLayout 右上角齿轮按钮 → 全局 Drawer（`GlobalSettingsDrawer`）。Text 游玩页全屏在 AppLayout 外，通过 `window.dispatchEvent(new CustomEvent('gw:settings'))` 触发同一个 Drawer，Drawer 挂载在 App 根节点。

**槽位设计**

WE 引擎的 Agent 功能对应 4 个槽位，每个槽位独立配置 provider + key + model：

| 槽位 | 用途 | 默认行为 |
|---|---|---|
| `narrator` | 主叙事生成（每轮对话） | 必填，fallback 到全局配置 |
| `director` | 剧情导演（分析玩家行为、决定剧情走向） | 可选，不填则由 narrator 兼任 |
| `verifier` | 变量校验（检查 `<UpdateState>` 合法性） | 可选，不填则跳过校验 |
| `memory` | 记忆压缩（长对话摘要） | 可选，不填则不启用记忆压缩 |

**`RuntimeConfig` 扩展**

```typescript
// stores/runtime.ts（已有 slots 字段，补充 provider 预设）
export interface SlotRuntimeConfig {
  base_url?: string
  api_key?: string
  model_label?: string
  enabled?: boolean   // 新增：槽位是否启用（false = 由 narrator 兼任）
}

export interface RuntimeConfig {
  base_url?: string   // 全局 fallback
  api_key?: string
  model_label?: string
  slots?: Partial<Record<'narrator' | 'director' | 'verifier' | 'memory', SlotRuntimeConfig>>
}
```

**UI 结构（GlobalSettingsDrawer）**

```
GlobalSettingsDrawer（右侧 Drawer，宽 360px）
├── 标签页：模型配置 / 关于
└── 模型配置 Tab
    ├── 全局配置（Fallback）
    │   ├── Provider 预设按钮（DeepSeek / OpenAI / Gemini / Anthropic / 自定义）
    │   ├── Base URL
    │   ├── API Key（password input）
    │   └── Model
    └── 槽位配置（可折叠，默认折叠）
        ├── narrator（叙事生成）— 始终显示
        ├── director（剧情导演）— 可启用/禁用
        ├── verifier（变量校验）— 可启用/禁用
        └── memory（记忆压缩）— 可启用/禁用
            每个槽位：启用开关 + Provider 预设 + Base URL + Key + Model
```

**Text 游玩页内的调用方式**

游玩页内每轮对话走 `narrator` 槽位（fallback 全局）。其他槽位是异步后台调用，不阻塞主叙事流：

```
玩家发送消息
    ↓
narrator 槽位 → SSE 流式生成叙事（主链路，当前已实现）
    ↓ 同时异步触发（不阻塞渲染）：
    ├── director 槽位 → POST /api/play/sessions/:id/direct
    │     分析本轮行为，更新剧情状态变量（后端异步，结果在下一轮体现）
    ├── verifier 槽位 → POST /api/play/sessions/:id/verify
    │     校验 <UpdateState> 的变量合法性，返回 patch 修正
    └── memory 槽位 → 后端定时触发（每 N 轮），不由前端直接调用
```

前端调用时，`streamOpts` 按槽位分别传入：

```typescript
// TextPlayPage 构建 streamOpts
const cfg = getRuntimeConfig()
const narratorSlot = cfg.slots?.narrator
const streamOpts: StreamOptions = {
  api_key:  narratorSlot?.api_key  ?? cfg.api_key,
  base_url: narratorSlot?.base_url ?? cfg.base_url,
  model:    narratorSlot?.model_label ?? cfg.model_label,
  branch_id: branchId,
}
```

**TopBar 模型配置入口简化**

P2 完成后，TextPlayTopBar 的"当前模型"菜单项改为触发全局 Drawer（`window.dispatchEvent(new CustomEvent('gw:settings'))`），不再内嵌独立的模型配置 Drawer，消除重复实现。

**实施步骤**

1. `stores/runtime.ts`：`SlotRuntimeConfig` 加 `enabled` 字段
2. 新建 `components/GlobalSettingsDrawer.tsx`：完整的多槽位配置 UI
3. `App.tsx`：挂载 `GlobalSettingsDrawer`，监听 `gw:settings` 事件
4. `AppLayout.tsx`：右上角加齿轮按钮，触发 `gw:settings`
5. `TextPlayTopBar.tsx`：模型配置菜单项改为触发 `gw:settings`，删除内嵌 Drawer
6. `TextPlayPage.tsx`：`streamOpts` 按 narrator 槽位构建（fallback 全局）

#### 中期（内测后）

- **Light 游玩页**：自制 VN 舞台（背景图、立绘、对话框），不复用 Text 的 `chat/` 组件
- **`data_driven` preset**：在 `game.json` 里声明 Tab 结构和变量映射，平台提供通用渲染引擎，零代码创作
- **变量更新优化**：`React.memo` + 浅比较，避免全量重渲染（P1 性能项）
- **RegexProfile 公共库**：创作者可发布规则集，游戏包引用时自动拉取安装

---

### 创作者快速参考

已拆分为独立文档：[`CREATOR-QUICKREF.md`](./CREATOR-QUICKREF.md)

涵盖：最小配置、B 类内联标签、选项按钮、stats/tags/character_sheet/html_panel 面板声明、behavior 预设、主题配置、完整 floating_panels 示例。

---

## 十一、悬浮窗拖动实现方案

> 悬浮窗的分类、preset 规范、行为预设（behavior）、声明规范等已迁移至 `TEXT-PLAY-SPEC.md` 第二章，本节专注于**可拖动（draggable）**的实现方式与适用性分析。

### 11.1 实现方案对比

| 方案 | 原理 | 包大小 | 适合场景 | 缺点 |
|------|------|--------|---------|------|
| 原生 JS（mousedown/mousemove/mouseup） | 监听鼠标事件，手动更新 `left/top` | 0 | 简单面板，无需触摸支持 | 需要自己处理边界、触摸、多指 |
| `react-draggable` | 封装鼠标/触摸事件，提供 `<Draggable>` 包裹组件 | ~5KB | 桌面端悬浮窗 | 不维护，TypeScript 支持一般 |
| `@use-gesture/react` + 手动定位 | hook 方式，处理鼠标/触摸/惯性 | ~10KB | 需要触摸支持的面板 | 需要自己写定位逻辑 |
| CSS `position: fixed` + `transform: translate` | 拖动时只改 transform，不改 top/left | 0 | 性能敏感场景 | 初始位置计算稍复杂 |

**推荐方案**：原生 JS + `transform: translate`，零依赖，性能好，实现约 40 行。

### 11.2 实现方式（PointerEvent + localStorage）

实际实现在 `panels/hooks/useDraggable.ts`，使用 `PointerEvent` + `setPointerCapture`，比 `mousedown/mousemove` 更可靠（自动处理鼠标离开窗口、触摸设备）。

```tsx
// 用法：面板根节点挂 ref + transform，拖动手柄挂 dragHandleProps
const { ref, offset, dragHandleProps } = useDraggable({ id: 'stats', enabled: draggable })

<div ref={ref} style={{ ...style, transform: `translate3d(${offset.dx}px, ${offset.dy}px, 0)` }}>
  <div {...dragHandleProps} style={{ ...dragHandleProps.style }}>  {/* header，cursor: grab */}
    ...
  </div>
</div>
```

关键点：
- `setPointerCapture` 确保拖动过程中鼠标移出面板也能持续跟踪，无需全局 `mousemove` 监听
- `transform: translate3d` 叠加在 `position: fixed` 的初始位置上，不触发 layout reflow
- 位置持久化到 `localStorage`（key: `gw_panel_pos_{id}`），刷新后恢复
- `dragHandleProps` 包含 `onPointerDown/Move/Up` + `style: { cursor: 'grab' }`，直接展开到手柄元素上
- `enabled: false` 时 hook 返回空 props，面板行为与不拖动完全一致，无额外开销

### 11.3 在 PanelsHost 中的集成方式

两种集成位置：

**方案 A：wrapper div 上（PanelsHost 控制）**
```tsx
// PanelsHost 为每个 draggable 面板包一个可拖动 wrapper
<DraggableWrapper enabled={p.draggable} style={gameStyle(idx)}>
  <DataPanel_绿茵好莱坞 ... />
</DraggableWrapper>
```
优点：面板组件无需感知拖动逻辑，关注点分离。
缺点：wrapper 需要知道哪个区域是拖动手柄（需要约定 `data-drag-handle`）。

**方案 B：面板组件自身处理**
面板组件自己在 header 上挂载拖动逻辑，`PanelsHost` 只传 `draggable` prop。
优点：面板完全自主控制拖动区域和视觉反馈（cursor: grab）。
缺点：每个面板都要实现，重复代码多。

**推荐方案 A**，配合 `data-drag-handle` 约定，面板 header 区域加此属性即可启用拖动。

### 11.4 是否适合 Text 游戏

| 面板类型 | 拖动价值 | 建议 |
|---------|---------|------|
| `tags`（叙事标签条） | 低，全宽固定在 TopBar 下方，拖动无意义 | 不启用 |
| `stats` / `character_sheet` | 中，面板较小，遮挡概率低 | 可选，默认不启用 |
| `data_panel`（如绿茵好莱坞） | 高，560×800px 大面板，容易遮挡内容 | 建议启用 |
| `telemetry_debug` | 低，调试用，位置固定即可 | 不启用 |
| `html_panel` | 中，取决于内容大小 | 可选 |
| `interactive`（规划中） | 高，交互型面板需要用户自由定位 | 启用 |

**结论**：Text 游戏中，`data_panel` 类大面板最有拖动价值，其余面板默认不启用。`draggable` 作为 `FloatingPanelDecl` 的可选字段，由创作者在 game.json 中声明，默认 `false`。

### 11.5 触摸支持

移动端需要额外处理 `touchstart/touchmove/touchend`，逻辑与鼠标事件对称。
Text 游戏主要面向桌面端，短期可以只实现鼠标拖动，触摸支持留到移动端适配阶段。

---

## 十二、面板菜单入口声明设计（2026-04-16）

### 12.1 设计目标

**游戏导入时决定一切**：`PanelSwitcherMenu` 下拉菜单里显示哪些入口、每个入口的图标和文字，全部由游戏的 `ui_config.floating_panels.panels` 声明，前端不硬编码任何游戏相关入口。

**内置面板也走声明**：`stats`（状态栏）和 `tags`（叙事标签）不再是硬编码入口，而是通过 `preset: "stats"` / `preset: "tags"` 在 `floating_panels` 里声明，和游戏专属面板完全对等。

**`placement` 控制可见性**：
- `placement: "topbar"` — 出现在 PanelSwitcherMenu 下拉菜单中
- `placement: "none"` — 不出现在菜单中（调试面板等）

**`launcher.label` 控制文字**：菜单里显示的文字完全由 `launcher.label` 决定，游戏可以自定义（如"数据面板"、"球员档案"、"背包"等）。

### 12.2 `floating_panels` 声明示例

```jsonc
// game.json ui_config.floating_panels
{
  "panels": [
    {
      "id": "data",
      "type": "preset",
      "preset": "data_panel",
      "launcher": { "icon": "📊", "label": "数据面板", "placement": "topbar" }
    },
    {
      "id": "stats",
      "type": "preset",
      "preset": "stats",
      "launcher": { "icon": "📈", "label": "状态栏", "placement": "topbar" }
    },
    {
      "id": "tags",
      "type": "preset",
      "preset": "tags",
      "launcher": { "icon": "🏷", "label": "叙事标签", "placement": "topbar" }
    },
    {
      "id": "debug",
      "type": "preset",
      "preset": "telemetry_debug",
      "launcher": { "icon": "🔧", "label": "调试", "placement": "none" }
    }
  ]
}
```

### 12.3 PanelSwitcherMenu 简化

菜单只做一件事：遍历 `floatingPanels`，过滤 `placement !== 'none'`，渲染入口按钮。不再有任何硬编码的内置入口（统计、叙事标签分隔线等）。

```
PanelSwitcherMenu
  └── floatingPanels.filter(p => p.launcher.placement !== 'none')
       └── 每个面板一个按钮，显示 launcher.icon + launcher.label
```

### 12.4 PanelsHost 路由扩展

`PanelsHost` 新增对 `preset: "stats"` 和 `preset: "tags"` 的路由，与现有 `character_sheet`、`telemetry_debug` 并列：

```
preset: "data_panel"      → 游戏注册 preset（gamePresets 注册表）
preset: "character_sheet" → 内置 CharacterSheet
preset: "stats"           → 内置 StatsPanel
preset: "tags"            → 内置 TagsPanel（固定在 TopBar 下方）
preset: "telemetry_debug" → 内置 TelemetryDebug（FloatingPanel tool 行为）
```

### 12.5 实现方式（稳定最小路径）

**不违背之前设想**，这是对原有设计的自然延伸：

1. **`floating_panels` 是唯一数据源**：游戏在 `game.json` 里声明所有面板，包括官方内置（`stats`、`tags`、`character_sheet`）和游戏专属（`data_panel` 等）。前端不硬编码任何面板入口。

2. **PanelsHost 按 preset 名称直接路由**（不用注册表）：
   ```
   preset: "data_panel"      → import DataPanel_绿茵好莱坞 直接渲染
   preset: "character_sheet" → import CharacterSheet 直接渲染
   preset: "stats"           → import StatsPanel 直接渲染
   preset: "tags"            → import TagsPanel 直接渲染
   preset: "telemetry_debug" → import TelemetryDebug 直接渲染
   ```
   注册表（`panelRegistry`）保留但不是必须路径，直接 import 更可靠、更易调试。

3. **面板数据来源**：
   - 官方面板（stats/tags/character_sheet）：数据来自 `variables`（WE 引擎每轮更新）
   - 游戏专属面板（data_panel）：同样来自 `variables`，组件自己解析所需字段
   - 叙事标签（tags）：来自 `variables` 或 `tokens`（A 类标签提取）
   - 所有面板数据随每轮 `handleTurnDone` 更新，无需额外订阅

4. **面板尺寸**：组件自描述，`PanelsHost` 只提供 `position: fixed` 定位 wrapper，不强制宽高。

5. **关闭**：每个面板组件自带关闭按钮，通过 `onClose` prop 回调到 `PanelsHost` → `closePanel(id)`。

6. **WE 引擎集成**：变量通过 `<UpdateState>` 写入 WE 引擎 → SSE meta 事件携带 `variables` 快照 → `handleTurnDone` 调用 `setVariables` → `PanelsHost` 将最新 `variables` 传入所有面板组件 → 组件重渲染。这条链路已经完整，面板数据自动随每轮更新。

### 12.6 当前问题与修复

**问题 1：注册表时序不可靠**
`panelRegistry` 依赖 `import './gamePresets'` 的副作用触发注册，在某些打包/HMR 场景下时序不保证。

**修复**：PanelsHost 直接 import `DataPanel_绿茵好莱坞`，按 preset 名称 if/else 路由，不依赖注册表。

**问题 2：需要重新 seed**
game.json 里 `preset: "data_panel"` 的改动需要重新 seed 才能写入数据库。在 seed 之前，后端返回的 `ui_config` 里仍是旧数据（`preset: "phone_status"`），`getPreset('phone_status')` 返回 undefined，面板不渲染。

**修复**：同时支持 `phone_status` 和 `data_panel` 两个 preset 名称路由到同一个组件，消除对 seed 时序的依赖。

**问题 3：`tags` 面板的 `panelStates` 初始化**
`TextPlayPageReal` 里 `usePanels()` 无初始状态，`tags` 面板默认关闭。TagsPanel 原来由 `panelStates['tags']` 控制，但菜单里没有 `tags` 入口（游戏未在 `floating_panels` 里声明），所以永远不会打开。

**修复**：TagsPanel 改为由 `floating_panels` 声明控制，游戏在 game.json 里加 `preset: "tags"` 入口即可。

### 12.7 实现状态

- ✅ `placement !== 'none'` 过滤（PanelSwitcherMenu）
- ✅ `launcher.label` 作为菜单文字
- ✅ 无外部框架直接渲染
- ✅ `onClose` prop 传入组件
- ✅ PanelsHost 直接 import 替代注册表（已完成，注册表已删除）
- ✅ `phone_status` / `data_panel` 双名称兼容（已完成）
- ✅ `tags` / `stats` 走 `floating_panels` 声明路径（已完成）
