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

### 4.1 当前结构（迁移后）

```
src/
├── api/                        # API 类型 + 请求函数
├── components/                 # 跨页面共享组件
│   ├── chat/                   # MessageBubble, MessageList, ChatInput, StreamingBubble
│   ├── game/                   # GameCard, HeroSection, StatsBar, ActionBar
│   ├── layout/                 # AppLayout
│   ├── overlay/                # FloatingPanel, Popover
│   └── social/                 # CommentCore
├── pages/
│   ├── game/
│   ├── my-library/
│   ├── public-library/
│   └── play/
│       └── text/               # Text 游玩页（自包含）
│           ├── TextPlayPage.tsx
│           ├── components/
│           │   ├── TextPlayTopBar.tsx
│           │   └── PanelSwitcherMenu.tsx  ← 从 features/ 移入
│           ├── hooks/
│           │   └── usePanels.ts
│           └── panels/
│               ├── PanelsHost.tsx
│               ├── StatsPanel.tsx
│               ├── TagsPanel.tsx
│               ├── panelLayout.ts
│               └── presets/    ← 从 components/play/presets/ 移入
│                   ├── CharacterSheet.tsx
│                   ├── PhoneStatus.tsx
│                   └── TelemetryDebug.tsx
├── queries/
├── stores/
├── styles/
└── utils/
    └── tokenExtract.ts
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

当前 `FloatingPanelDecl` 只支持 `type: "preset"`。为了支持 Light 游玩页的交互型浮窗，需要扩展类型：

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

// 扩展后（支持 Light 游玩页）
interface FloatingPanelDecl {
  id: string
  type: 'preset' | 'interactive' | 'custom'
  // type: 'preset' — 数据展示型，Text 游玩页用
  preset?: 'narrative_tags' | 'phone_status' | 'character_sheet' | 'telemetry_debug'
  // type: 'interactive' — 交互型，Light 游玩页用，内容由前端 preset 决定
  interactive_preset?: 'inventory' | 'skill_tree' | 'map' | string
  // type: 'custom' — 创作者自定义（未来，需沙箱）
  default_pinned?: boolean
  position?: 'top_center_bar' | 'right_stack' | 'bottom_bar' | 'free'
  launcher: { icon: string; placement: 'topbar' | 'stage_hud' | 'none' }
}
```

**v0 阶段**：只实现 `type: 'preset'`，`interactive` 和 `custom` 留空接口，Light 开发时填充。

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

这样 `FloatingPanelDecl` 的声明就可以从“列一堆布尔值”变成“选一个行为 preset + 少量覆写”，可维护性会更好。
- **GW 用 preset 渲染**（phone_status / telemetry_debug / character_sheet）
- **可选的 Light/VNRenderer** 在舞台层承载更丰富的画面与 HUD

因此结论是：
- “小手机面板的视觉形态”现在就能做：用 `floating_panels` + `preset: phone_status`，并用 token/变量填充内容。  
- “MVU 变量严格更新”在 WE 层能做：用 `<UpdateVariable>` / JSONPatch 规则、后端校验与落库。  
- “脚本注入 HTML + 任意 DOM 能力”不会支持：用 preset + 声明式组件替代。  
- 音乐/播放列表/跨回合持久音频：可作为 GW 的官方组件（例如 `AudioPlayerHUD`）逐步补齐，但仍是“声明式引用”，不是脚本执行。

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

### 阶段 C：后端 token 提取（官方标签稳定后，可选）

- [ ] `StreamMeta` 加 `Tokens []NarrativeToken` 字段
- [ ] 后端 `ExtractTokens()` 提取 A 类官方标签
- [ ] 前端 `handleTurnDone` 直接读 `turn.tokens`，移除前端 regex

### 阶段 D：Light 游玩页（Light 开发时）

- [ ] `LightPlayPage` 自制 VN 舞台 + HUD
- [ ] `FloatingPanelDecl.type: 'interactive'` 实现交互型浮窗
- [ ] 共享组件提升：`NarrativeTagsBar`、`FloatingPanel` 移到 `components/`

---

## 八、当前前端架构状态（2026-04-15）

```
src/
├── api/                    # 类型 + 请求函数（通用）
├── components/             # 真正跨页面共享的组件
│   ├── game/               GameCard, HeroSection, StatsBar, ActionBar
│   ├── layout/             AppLayout
│   ├── overlay/            FloatingPanel, Popover
│   └── social/             CommentCore
├── pages/
│   ├── game/               游戏详情页
│   ├── my-library/         我的库
│   ├── public-library/     公共库
│   └── play/
│       └── text/           Text 游玩页（自包含）
│           ├── TextPlayPage.tsx
│           ├── chat/       ChatInput, MessageBubble, MessageList, StreamingBubble
│           ├── components/ TextPlayTopBar, PanelSwitcherMenu
│           ├── hooks/      usePanels
│           └── panels/     PanelsHost, StatsPanel, TagsPanel, presets/
├── queries/                React Query hooks（通用）
├── stores/                 Zustand stores（通用）
├── styles/                 themes.ts, globals.css
└── utils/
    ├── tokenExtract.ts     A/C 类标签提取
    └── regexPipeline.ts    爱丽丝规则集 + 管线执行器
```

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

规则定义在 `src/utils/regexPipeline.ts` 的 `ALICE_CORE_RULES` 数组，按 `order` 升序执行。

| order | 规则说明 | pattern | replacement | scope |
|---|---|---|---|---|
| 1 | 移除 CoT 思考块 | `<thinking>[\s\S]*?</thinking>` | `""` | narrative |
| 2 | 剥离 content 包裹 | `<content>([\s\S]*?)</content>` | `"$1"` | narrative |

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

## 十、接下来的计划

### 近期 P0（内测前）

**`<choice>` C 类标签前端实现**

`tokenExtract.ts` 目前只处理 A 类标签。需要扩展：
- 识别 `<choice>...</choice>` 块，提取后从叙事文本移除，返回 `choices: string[]`
- `TextPlayPage.handleTurnDone` 读取 `choices` 并 `setLastOptions`
- 创作者只需在 prompt 末尾要求 AI 输出 `<choice>` 块，前端自动渲染为选项按钮

**`preprocessNarrative()` 与 `splitSayBlocks()` 路径对齐**

say 宏内部的 B 类标签目前走独立路径，可能漏处理。两条路径需要保持一致。

### 近期 P1

**主题扩展预留**

内测阶段：只允许官方 6 套主题 + `color_scheme` 局部覆盖。  
中期：`UIConfig` 增加 `custom_theme?: Partial<ThemeVars>`，允许游戏包声明完整主题，走类似 `RegexProfileRef` 的 bundled 机制。

**爱丽丝规则集扩充**

根据真实游戏导入测试结果，补充候补规则（见 9.3）。不要提前硬编码未经验证的规则。

### 中期（内测后）

- **Light 游玩页**：自制 VN 舞台，不复用 Text 的 `chat/` 组件
- **RegexProfile 公共库**：创作者可发布规则集，游戏包引用时自动拉取安装
- **主题包**：类似 RegexProfile 机制，允许打包完整 `ThemeVars` 随游戏分发

### 已知限制

- **本地 JSON 导入丢失 `ui_config`**：`MyLibraryPage` 硬编码 `ui_config: null`，测试官方标签渲染必须走后端导入
- **`<choice>` 尚未实现**：块目前不会被提取，会原样出现在叙事文本中（下一个 P0）
- **`preprocessNarrative` 在 `MessageBubble` 内**：如果 Light 游玩页也需要 B 类标签渲染，届时提升到 `utils/`

---

## 七、创作者快速参考

### 最小配置（时间/地点标签条）

`system_prompt` 末尾追加：
```
每次回复开头必须输出：
<time>当前游戏内时间</time>
<location>当前地点</location>
```

`ui_config`：
```json
{
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

### 内联样式（无需 ui_config 声明）

```
重要物品或人名：<em class="gold">命运之轮</em>
危险状态：<em class="danger">生命值危急</em>
系统提示：<aside>【系统】存档已自动保存</aside>
引用/回忆：<quote>她曾说过：...</quote>
```

B 类标签不需要在 `token_extract_rules` 里声明，`preprocessNarrative()` 自动处理。

### 手机面板（绿茵好莱坞类型）

`post_history_instructions` 末尾追加：
```
每次回复结尾输出：
<status>体能:{竞技能力.当前体能} 状态:{竞技能力.竞技状态}</status>
```

`ui_config`：
```json
{
  "token_extract_rules": [
    { "tag": "status", "placement": ["panel:phone"] }
  ],
  "floating_panels": {
    "panels": [
      { "id": "phone", "type": "preset", "preset": "phone_status",
        "launcher": { "icon": "📱", "placement": "topbar" } }
    ]
  }
}
```
