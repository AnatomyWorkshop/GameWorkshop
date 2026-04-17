# Text 游玩页功能规范总表

> 版本：2026-04-16 v1
> 范围：Text 游玩页（`pages/play/text/`）所有已规范功能的命名、交互规则、实现状态。
> 详细设计见 `RENDER-SPEC.md`；本文件是可查阅的规范速查表。

---

## 一、标签渲染规范

### 1.1 五类标签总览

AI 输出的文本经过多层管线处理，不同类型的标签在不同阶段被提取或转换。

| 类别 | 格式 | 处理层 | 是否留在正文 | 渲染目标 |
|------|------|--------|-------------|---------|
| A 类 | `<tag>text</tag>` | 前端 `extractTokens()` | 否，从正文移除 | 叙事标签条悬浮窗 |
| B 类 | `<tag>text</tag>` | 前端 `runRegexPipeline('narrative')` | 是，转为 `<span class="gw-*">` | 消息流内渲染 |
| C 类 | `<tag>text</tag>` | 前端 `extractTokens()` | 否，从正文移除 | 对应悬浮面板 / 选项区 |
| D 类 | `<Tag>...</Tag>` | 后端 parser / WE 引擎 | 不到达前端 | 后端消费 |
| S 类 | `[[macro\|field1\|...]]` | 前端 `splitSayBlocks()` 等结构解析器 | 是，转为 React 组件树 | 消息流内渲染 |

**安全边界**：禁止直接渲染原始 HTML；仅 `gw-*` 白名单类名允许通过 `rehype-sanitize`；禁止 `<script>`、事件属性、内联 style；S 类宏只有官方实现，不可通过 bundled 规则扩展。

---

### 1.2 A 类：叙事信息标签

提取后从正文移除，路由到叙事标签条悬浮窗（`TagsPanel`，`preset: tags`）。
不需要创作者额外声明，在 `ui_config.token_extract_rules` 中声明 `placement: ["narrative_tags"]` 即可启用。

| 标签 | 用途 | 典型示例 | 实现状态 |
|------|------|---------|---------|
| `<time>` | 游戏内时间 | `<time>1888年 雾月</time>` | ✅ |
| `<location>` | 当前地点 | `<location>贝克街221B</location>` | ✅ |
| `<weather>` | 天气/环境 | `<weather>阴雨绵绵</weather>` | ✅ |
| `<chapter>` | 章节/幕 | `<chapter>第三幕·背叛</chapter>` | ✅ |
| `<status>` | MVU 式状态摘要 | `<status>体能:低 伤势:轻</status>` | 🔲 规划中 |
| `<memo>` | 自动记录到备忘录 | `<memo>线索：带血的怀表</memo>` | 🔲 规划中 |

样式映射：`style: "gold"` → `var(--color-em-gold)`；`"info"` → `var(--color-em-info)`；`"muted"` → `var(--color-text-muted)`。

自定义标签可在 `token_extract_rules` 声明，显示为纯文本，无专属 CSS 类。

---

### 1.3 B 类：内联样式标签

保留在正文，由 `ALICE_CORE_RULES`（order 10–14）转为带 `gw-*` 类名的 HTML 元素，经 `rehype-sanitize` 白名单过滤后渲染。不需要创作者声明，平台原生支持。

| AI 输出标签 | 渲染后 DOM | CSS 变量 | 用途说明 |
|------------|-----------|---------|---------|
| `<em class="gold">` | `<span class="gw-em-gold">` | `--color-em-gold` | 重要物品、关键人名、稀有掉落 |
| `<em class="danger">` | `<span class="gw-em-danger">` | `--color-em-danger` | 危险提示、生命值降低、警告 |
| `<em class="info">` | `<span class="gw-em-info">` | `--color-em-info` | 普通强调、系统提示高亮 |
| `<aside>` | `<div class="gw-aside">` | `--color-aside` | 旁白、系统音、次要描述 |
| `<quote>` | `<div class="gw-quote">` | `--color-quote-border` | 回忆、闪回、信件摘录、引语 |

---

### 1.4 C 类：面板数据标签 / 选项标签

提取后从正文移除，数据路由到对应 UI 容器。`<choice>` 是平台内置标签，无需声明；其余为规划中。

| 标签 | 用途 | 目标容器 | 实现状态 |
|------|------|---------|---------|
| `<choice>` | 玩家选项列表（前端兜底） | 消息底部选项按钮组 | ✅ |
| `<news>` | 新闻/动态 | `panel:phone` | 🔲 规划中 |

**`<choice>` 解析规则**：提取块内容，按行分割，去除前缀序号（`1.`、`2.`），渲染为选项按钮组。
优先级：后端 `<Options>` 解析成功时使用后端结果；后端未返回选项时前端提取 `<choice>` 作为兜底。

当前主路径：变量通过 `<UpdateState>` / `<UpdateVariable>` 更新，面板读取 `variables` 对象渲染。C 类标签为补充路径，用于不适合写入变量的临时数据。

---

### 1.5 D 类：系统控制标签

后端消费，前端不可见。若后端未在下发前剥离，前端 `ALICE_CORE_RULES` order 8 可作为兜底移除。

| 标签 | 处理层 | 用途 |
|------|--------|------|
| `<Narrative>` | 后端 parser | 叙事文本包裹 |
| `<Options>` | 后端 parser | 选项列表 |
| `<UpdateState>` | 后端 WE 引擎 | 简单 KV 变量更新 |
| `<UpdateVariable>` | 后端 WE 引擎 | JSONPatch 格式变量更新 |

---

### 1.6 S 类：结构宏（多字段 UI 组件）

S 类宏处理多字段、有语义结构的场景，输出 React 组件树，不走正则管线。格式：`[[宏名|参数1|参数2|...]]`。
与 B 类的区别：B 类是单值包裹（正则替换），S 类是多字段结构（专用解析器 → React 组件）。

| 宏 | 格式 | 字段 | 解析器 | 渲染组件 | 实现状态 |
|----|------|------|--------|---------|---------|
| say | `[[say\|名字\|台词]]` | 名字 / 台词 | `splitSayBlocks()` | `SayLine` | ✅ |
| say（带副标题） | `[[say\|名字\|副标题\|台词]]` | 名字 / 副标题 / 台词 | `splitSayBlocks()` | `SayLine` | ✅ |
| card | `[[card\|标题\|正文]]` | 标题 / 正文 | 待实现 | `InfoCard` | 🔲 规划中 |
| image | `[[image\|url\|说明]]` | URL / 说明文字 | 待实现 | `InlineImage` | 🔲 规划中 |

**say 宏渲染**：头像首字母圆圈（颜色来自 `ui_config.characters[角色名].color`）+ 主标题 + 副标题（可选）+ 对话气泡。

---

### 1.7 正则替换管线

正则替换在 `runRegexPipeline()` 中按 `order` 顺序执行，分两个 scope。

```
AI 原始输出
    ↓ runRegexPipeline('narrative')   ← 清洗组（order 1-9）+ B 类渲染组（order 10-19）
    ↓ extractTokens()                 ← A/C 类标签提取，从叙事文本移除
    ↓ splitSayBlocks()                ← S 类 say 宏结构解析
    ↓ ReactMarkdown 渲染
```

| scope | 执行时机 | 用途 |
|-------|---------|------|
| `extract` | `extractTokens()` 之前 | 预处理：清洗 `<thinking>`、格式化噪声 |
| `narrative` | `MessageBubble` 渲染前 | B 类标签转 HTML、`<choice>` 移除 |

**官方内置规则（alice:core）**

| order | 分组 | 规则说明 | 处理方式 |
|-------|------|---------|---------|
| 1 | 清洗 | 移除 `<thinking>...</thinking>` | 整块移除 |
| 2 | 清洗 | 剥离 `<content>...</content>` 包裹 | 保留内容 |
| 10–14 | B 类渲染 | `<em class="gold/danger/info">`、`<aside>`、`<quote>` | → `gw-*` span/div |

**待加入规则（测试后按需启用）**

| 建议 order | 规则 | 触发场景 | 处理方式 |
|-----------|------|---------|---------|
| 3 | 移除 `<recap>` | 内部情节总结，不展示给玩家 | 整块移除 |
| 4 | 移除 `<theater>` | 明月秋青吐槽剧场格式 | 整块移除 |
| 7 | 剥离 `<narrative>` | 少数模型包裹正文 | 保留内容 |
| 8 | 移除 `<UpdateState>` | D 类标签后端未剥离时的前端兜底 | 整块移除 |

规则来源优先级：`ui_config.regex_profiles`（游戏声明）> 平台内置 `ALICE_CORE_RULES`。
创作者 bundled 规则 `replacement` 只允许纯文本，禁止 HTML。

---

## 二、悬浮窗规范

### 2.1 悬浮窗逻辑维度

悬浮窗的行为由以下正交维度组合决定，preset 只是一组默认值的快捷方式，未来创作者可以独立覆写各维度。

| 维度 | 可选值 | 说明 |
|------|--------|------|
| **关闭触发源**（behavior） | `peek` / `tool` / `pinned` | 见 2.3 节 |
| **可拖动** | `draggable: true/false` | 当前全部不可拖动；实现方案见 RENDER-SPEC.md 第十一节 |
| **定位方式** | `right_stack` / `topbar_below` / `free` | 决定面板出现的位置 |
| **尺寸来源** | 内容自适应 / 固定尺寸 / 创作者声明 | 当前 preset 均为固定尺寸 |
| **外壳来源** | frameless（自带 UI）/ FloatingPanel 包裹 | frameless 面板自己负责标题、关闭按钮、边框 |
| **数据来源** | `variables` / `tokens` / 内部状态 / iframe 注入 | 决定面板内容如何更新 |
| **标题/显示名** | 无 / 来自 `variables` / 来自 `launcher.label` / 创作者自定义 | 不是 preset 的固有属性 |

---

### 2.2 内置 preset 分类

所有悬浮窗由 `ui_config.floating_panels.panels` 声明，`PanelsHost` 按 `preset` 名路由渲染，`PanelSwitcherMenu` 按声明顺序展示入口。

内置 preset 按**内容语义**分类，每类代表一种已预设好逻辑和样式的悬浮窗，创作者直接引用即可。

| 语义类型 | preset 名 | 典型内容 | behavior | draggable | 定位 | 外壳 | 数据来源 | 实现状态 |
|---------|----------|---------|---------|-----------|------|------|---------|---------|
| 场景信息条（如位置、时间、天气） | `tags` | 叙事标签横向滚动条 | `peek` | ✗ | topbar_below | frameless | `tokens` + `variables` | ✅ |
| 角色/状态卡（如属性、数值、进度条） | `stats` | 声明式状态条，支持进度条 | `pinned` | ✗ | right_stack | frameless | `variables` | ✅ |
| 角色/状态卡（如属性、数值、进度条） | `character_sheet` | 变量 KV 展示，按前缀分组 | `pinned` | ✗ | right_stack | frameless | `variables` | ✅ |
| 游戏专属数据面板（如球员档案、装备栏） | `data_panel` | 游戏自定义，完全自主样式 | `pinned` | ✗ | right_stack | frameless | `variables` | ✅ |
| 游戏专属数据面板（旧名兼容） | `phone_status` | 同 `data_panel` | `pinned` | ✗ | right_stack | frameless | `variables` | ✅ 兼容 |
| 调试/工具面板（如 token 用量、模型信息） | `telemetry_debug` | 技术指标展示 | `tool` | ✗ | right_stack | FloatingPanel | 内部状态 | ✅ |
| 外部 HTML 模板（如从 ST 迁移的面板） | `html_panel` | iframe 沙箱渲染 | `pinned` | ✗ | right_stack | FloatingPanel | `variables` 注入 | ✅ |
| 可交互面板（如背包、技能树、地图） | `interactive` | 游戏事件驱动，含按钮/列表 | `pinned` | ✓ | free | frameless | 游戏事件 | 🔲 规划中 |
| 备忘录/日志（如线索记录、对话历史） | — | 自动追加内容，可滚动 | `pinned` | ✗ | right_stack | frameless | C 类标签 `<memo>` | 🔲 规划中 |
| 关系/社交图谱（如好感度、阵营） | — | 人物关系网络或列表 | `pinned` | ✓ | free | frameless | `variables` | 🔲 规划中 |
| 地图/空间（如区域地图、房间布局） | — | 静态图片或 SVG 标注 | `pinned` | ✓ | free | frameless | `variables` | 🔲 规划中 |

---

### 2.3 面板行为预设（behavior）

behavior 描述的是**关闭触发源**，三种预设互斥。

| behavior | 关闭触发源 | 适用场景 |
|----------|-----------|---------|
| `peek` | 点击面板内任意位置 | 只读轻面板，快速查看后收起；注意：含可交互元素时点击会误触关闭，应改用 `pinned` |
| `tool` | 点击面板外区域 | 工具/调试面板，防止面板内操作误触关闭 |
| `pinned` | 只能点 × 按钮 | 含交互内容的面板（多 Tab、html_panel）；frameless 面板自带 × 按钮 |

当前所有 frameless preset 均使用 `pinned`（自带 × 按钮）。FloatingPanel 外壳的 `telemetry_debug` 使用 `tool`，`html_panel` 使用 `pinned`。

---

### 2.4 官方 preset 参数表

preset 是一组默认维度值的快捷方式，未来创作者可独立覆写各维度。

| preset 名 | 定位 | 尺寸 | 数据来源 | 备注 |
|-----------|------|------|---------|------|
| `stats` | right_stack | 280×360px | `ui_config.stats_bar.items` + `variables` | |
| `character_sheet` | right_stack | 280×360px | `variables` | `display_vars` 过滤待实现 |
| `tags` | topbar_below | 全宽 | `ui_config.narrative_tags.items` + `tokens` | |
| `telemetry_debug` | right_stack | 280×360px | 内部（floorCount / tokenUsed / modelLabel） | FloatingPanel 外壳 |
| `data_panel` | right_stack | 560×800px | `variables`（`display_vars` 可过滤） | frameless，标题来自 `variables` |
| `phone_status` | right_stack | 560×800px | `variables` | 旧名，路由到 `data_panel` |
| `html_panel` | right_stack | 280×360px | `variables` 注入 iframe | FloatingPanel 外壳，标题来自 `launcher.label` |

#### stats_bar.items 字段（StatItem）

| 字段 | 类型 | 说明 |
|------|------|------|
| `key` | string | 变量路径，支持 `group.key` 嵌套；末段为纯数字时作为常量分母（如 `生命.100`） |
| `label` | string | 显示名；含 `.` 时第一段为分组标题，第二段为行标签（如 `"总资产.金币"`） |
| `icon` | string | 行前图标，emoji 或文字符号 |
| `display` | `'bar'` / `'badge'` / `'text'` | 渲染方式，默认 `text` |
| `bar_max` | number | `display: bar` 时的满值，默认 100 |
| `bar_color` | string | `display: bar` 时的颜色；未指定时按值自动着色（≥80% 绿，≥60% 黄，其余红） |

---

### 2.5 悬浮窗声明规范（game.json）

```json
"floating_panels": {
  "panels": [
    {
      "id": "数据面板",
      "type": "preset",
      "preset": "data_panel",
      "display_vars": ["基本信息", "竞技能力"],
      "launcher": {
        "icon": "📊",
        "label": "数据面板",
        "placement": "topbar"
      }
    }
  ]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 面板唯一标识，用于 `panelStates[id]`；同一游戏内不可重复 |
| `type` | `preset` / `html_panel` / `interactive` | 面板类型 |
| `preset` | string | type=preset 时的 preset 名；官方用英文小写下划线，游戏专属可用中文 |
| `display_vars` | string[] | 面板展示的变量路径（可选，用于过滤），嵌套路径用 `.` 分隔 |
| `launcher.icon` | string | 菜单入口显示的图标 |
| `launcher.label` | string | 菜单入口显示的文字；面板内部标题由面板自身决定（如来自 `variables`） |
| `launcher.placement` | `topbar` / `none` | `none` 表示不在菜单中显示（如调试面板） |

---

### 2.6 面板入口规范（PanelSwitcherMenu）

TopBar 右侧 `BarChart2` 图标按钮，点击展开下拉菜单。菜单内容完全由 `floating_panels.panels` 声明驱动，无硬编码入口。

| 规则 | 说明 |
|------|------|
| 显示条件 | `launcher.placement !== 'none'` 的面板按声明顺序排列 |
| 菜单项格式 | `[icon] [label]`，激活时右侧显示 `●` |
| 点击行为 | 切换对应面板显示/隐藏，菜单自动关闭 |
| 关闭菜单 | 点击菜单外区域 / 按 Escape |
| 空状态 | 无可显示面板时显示"暂无面板" |

---

### 2.7 面板定位规范

| 面板类型 | 定位方式 | z-index |
|---------|---------|---------|
| 右侧堆叠面板（stats / character_sheet / data_panel / telemetry_debug / html_panel） | `position: fixed`，右侧，按 `rightStack` 顺序从上到下，间距 12px | 30 |
| tags（叙事标签条） | `position: fixed`，TopBar 正下方，全宽 | 20 |

---

### 2.8 变量更新与面板刷新

面板不需要主动订阅变量，`variables` 作为 prop 传入，React 自动处理重渲染。

```
AI 输出 <UpdateState key="竞技能力.当前体能" value="85"/>
    ↓ 后端 WE 引擎处理
    ↓ SSE meta.variables 快照
    ↓ 前端 handleTurnDone() → setVariables()
    ↓ PanelsHost variables prop 更新
    ↓ 所有开启的面板自动重渲染
```

---

### 2.9 完整加载流程

#### 游戏导入 → 游玩页初始化

```
1. 游戏导入（后端 seed 或公共库）
   └── game.json ui_config 写入数据库

2. 进入游玩页（TextPlayPage）
   ├── useGame(game_id) → 拉取 game.ui_config
   ├── applyTheme(theme_preset) → CSS 变量注入
   ├── color_scheme 覆盖 → 局部 CSS 变量覆写
   └── usePanels() → panelStates 初始化（全部关闭）

3. 加载历史 floors
   ├── useFloors(sessionId) → 拉取历史消息
   ├── 最后一条 floor.page_vars → setVariables（恢复变量状态）
   └── 最后一条 assistant 消息 → extractTokens → setNarrativeTokens（恢复 A 类标签）

4. 玩家打开面板
   └── PanelSwitcherMenu → togglePanel(id) → panelStates[id] = true
       └── PanelsHost 按 preset 路由渲染对应组件
```

#### 每轮交互流程

```
玩家输入 → ChatInput → POST /play/sessions/:id/turn
    ↓ 后端 WE 引擎处理（UpdateState / UpdateVariable）
    ↓ SSE 流式输出 narrative 文本
    ↓ 前端 stream.appendDelta() → buffer 更新 → StreamingBubble 实时渲染
    ↓ SSE 结束 → handleTurnDone(TurnResponse)
        ├── turn.options → setLastOptions（选项按钮）
        ├── turn.variables → setVariables（面板数据更新）
        ├── runRegexPipeline(narrative, profiles, 'extract')
        │   └── extractTokens(cleaned, token_extract_rules) → setNarrativeTokens（A 类标签）
        └── refetch() → useFloors 重新拉取，MessageList 更新
```

#### 悬浮窗声明是否需要改动

当前声明结构完整，无需改动。一个设计冗余值得记录：

`token_extract_rules` 和 `narrative_tags.items` 是两张独立的表，同一个标签需要声明两次（一次控制提取，一次控制显示）。这是有意为之的分层设计——提取规则和显示规则职责不同，合并会让结构更复杂。内测阶段保持现状，创作者参考 2.9 节快速参考示例即可。

---

## 三、选项与输入规范

### 3.1 输入模式

| 模式 | 交互规则 |
|------|---------|
| `free` | 文本框 + 发送按钮，可附带选项按钮 |
| `choice_primary` | 选项按钮为主，文本框为辅 |
| `choice_only` | 只显示选项按钮，无文本框 |
| `command` | 等宽字体文本框，适合指令类游戏 |

声明：`ui_config.input_mode`，默认 `free`。

---

### 3.2 选项来源与渲染

| 来源 | 触发条件 | 渲染位置 |
|------|---------|---------|
| `TurnResponse.options` | 后端 `<Options>` 解析成功 | 最后一条消息下方 |
| `<choice>` 标签 | 后端未返回选项时前端兜底提取 | 同上 |
| `ui_config.first_options` | 首轮无用户消息时 | 首轮消息前 |

列数：`ui_config.choice_columns`，默认 1 列。流式输出期间选项隐藏，流式结束后显示。

---

### 3.3 first-mes 面板

开局消息（first-mes）的 UI 形态非常丰富，包含设置表单、角色介绍、开局选项等多种组合，当前无法归纳为统一规范。待实际游戏测试后补充。

---

## 四、消息工具条（MetaLine）

每条 assistant 消息悬停时显示工具条，提供 AI 辅助动作。所有动作共享状态模型：`loading → result | error`，结果不持久化（本地 state）。

| 动作 | 图标 | 触发条件 | 输出 | 渲染方式 | 实现状态 |
|------|------|---------|------|---------|---------|
| 翻译 | `Languages` | assistant 消息 | 译文字符串 | 消息下方折叠，走 ReactMarkdown | ✅ 前端已实现，后端端点待补 |
| 旁白 | `Volume2` | assistant 消息 | TTS 音频流 | 播放控件 | 🔲 规划中 |
| 书签 | `Flag` | 任意消息 | 标记状态 | 消息高亮 + 书签列表 | 🔲 规划中 |
| 生图 | `Paintbrush` | assistant 消息 | 图片 URL | 消息下方图片 | 🔲 规划中 |

后端接口约定：`POST /play/sessions/:id/{action}`，复用会话 LLM 配置，无需前端传参。

---

## 五、待规范 / 规划中

| 功能 | 状态 | 说明 |
|------|------|------|
| C 类标签：`<status>` / `<news>` | 🔲 规划中 | 路由到对应面板 |
| S 类宏：`card` / `image` | 🔲 规划中 | 信息卡片、内联图片 |
| first-mes 面板规范 | 🔲 待测试后补充 | 开局 UI 形态多样，需实际游戏验证 |
| 面板拖拽定位 | ✅ 已实现 | `draggable: true`，`useDraggable` hook，localStorage 持久化 |
| 交互型面板（`interactive`） | 🔲 Light 阶段 | 背包、技能树、地图等 |
| 音频组件（`AudioPlayerHUD`） | 🔲 规划中 | 声明式引用，非脚本执行 |
| `delta_variable` 工具 | 🔲 P3 后端 | 变量增量更新（+/-），约 60 行 |
| html_panel postMessage 桥 | 🔲 中期 | iframe 与宿主双向通信 |
| MetaLine 翻译后端端点 | 🔲 待补 | `POST /play/sessions/:id/translate` |
| alice:core 待加入规则 | 🔲 测试后按需 | order 3–8，见 1.7 节 |

---

## 六、已知问题

- `character_sheet` 面板目前展示全部变量，尚未支持 `display_vars` 过滤（`data_panel` 已支持）
- `<UpdateState>` 若后端未在下发前剥离，会原样渲染出 JSON 块；需加入 alice:core order 8 规则作为前端兜底
- `peek` 行为（点内关闭）与可交互内容天然冲突：Tab 按钮点击会冒泡到面板根节点触发关闭；多 Tab 面板应使用 `pinned` 行为
- `narrative_tags` 与 `data_panel` 都展示时间/地点时存在重复显示问题，需创作者在声明时自行避免
- `runRegexPipeline('extract')` 在 `handleTurnDone` 里先于 `extractTokens` 执行，但 `ALICE_CORE_RULES` 目前没有 `scope: 'extract'` 的规则——若 AI 输出 `<thinking>` 包裹了 `<time>` 等 A 类标签，extract 阶段不会先清洗，`extractTokens` 可能提取到错误内容。修复方案：为 order 1（`<thinking>` 移除）加 `scope: 'extract'` 副本，或在 extract 阶段也跑 narrative 清洗规则
- `<news>` / `<memo>` 在规范里声明为 C 类标签，但目前没有对应的提取实现；创作者若在 `token_extract_rules` 里声明这两个标签，提取会成功但没有面板消费这些 token
