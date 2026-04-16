# [已归档] 架构重构日志：chat 组件迁移 + 正则管线 + 类型扩展

> 归档日期：2026-04-15  
> 内容已整合到 `docs/RENDER-SPEC.md` 第七至十节。  
> 本文件保留作历史记录，不再维护。



### 1. `components/chat/` → `pages/play/text/chat/`

**问题**：`ChatInput`、`MessageList`、`MessageBubble`、`StreamingBubble` 放在 `components/chat/` 下，但它们深度耦合 Text 游玩页的逻辑：

- `ChatInput` 直接调用 `streamTurn`、`sessionsApi.regen/suggest`，监听 `gw:choose` 事件，内嵌主题切换菜单
- `MessageBubble` 包含 `preprocessNarrative()`（B 类标签替换）、`splitSayBlocks()`（say 宏解析）、floor 编辑/删除 API 调用
- `MessageList` 处理 floor 扁平化、optimistic message、streaming buffer

这些组件不会被 Light 游玩页、论坛、Rich 游戏复用。放在 `components/` 会误导后续开发者认为它们是通用组件，导致 Light/Rich 开发时被错误引用或需要大改。

**操作**：
- 将四个文件移动到 `src/pages/play/text/chat/`
- 更新 `TextPlayPage.tsx` 的 import 路径（`@/components/chat/*` → `./chat/*`）
- 删除 `src/components/chat/` 目录

**结果**：`src/components/` 现在只剩真正跨页面共享的组件：
```
components/
├── game/       GameCard, HeroSection, StatsBar, ActionBar
├── layout/     AppLayout
├── overlay/    FloatingPanel, Popover
└── social/     CommentCore
```

---

### 2. 正则替换管线（RegexPipeline）

**问题**：前端没有统一的 AI 输出预处理步骤。`preprocessNarrative()` 只处理 B 类标签，但 `<thinking>` 块、`<content>` 包裹等模型输出噪声没有被清理，会直接渲染给玩家。

**新增**：`src/utils/regexPipeline.ts`

```
AI 原始输出
    ↓ runRegexPipeline(text, regexProfiles, 'narrative')   ← 新增
    ↓ extractTokens()（A/C 类标签提取）
    ↓ preprocessNarrative()（B 类标签 → gw-* span）
    ↓ ReactMarkdown 渲染
```

**alice:core 内置规则**（内测期间默认启用）：
- `order: 1` — 移除 `<thinking>...</thinking>` CoT 块
- `order: 2` — 剥离 `<content>...</content>` 包裹（保留内容）

**扩展机制**：
- 官方规则挂 `alice` 命名空间，`OFFICIAL_PROFILES` 注册表管理
- 创作者可在 `ui_config.regex_profiles` 声明额外规则（`bundled: true` 随游戏包携带）
- 未知 ref 且非 bundled：静默跳过，不联网拉取（内测阶段）
- 无效正则：try/catch 静默跳过，不破坏渲染

**接入点**：
- `MessageBubble`：渲染前对 assistant 消息跑 `runRegexPipeline(..., 'narrative')`
- `TextPlayPage.handleTurnDone`：token 提取前对 `turn.narrative` 跑 `runRegexPipeline(..., 'extract')`

---

### 3. `api/types.ts` 类型扩展

**`FloatingPanelDecl`** 扩展为支持 Light 游玩页：
```typescript
type: 'preset' | 'interactive' | 'custom'
interactive_preset?: 'inventory' | 'skill_tree' | 'map' | string
position?: 'top_center_bar' | 'right_stack' | 'bottom_bar' | 'free'
launcher: { icon: string; placement: 'topbar' | 'stage_hud' | 'none' }
```

**新增类型**：
- `RegexRule` — 单条规则（order/pattern/replacement/scope/flags）
- `RegexProfile` — 可打包分发的规则集
- `RegexProfileRef` — 游戏包内的引用声明（支持 bundled 内联规则）

**`UIConfig`** 新增 `regex_profiles?: RegexProfileRef[]`

---

## 二、当前架构状态

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
│           ├── chat/       ← 新位置（原 components/chat/）
│           │   ├── ChatInput.tsx
│           │   ├── MessageBubble.tsx
│           │   ├── MessageList.tsx
│           │   └── StreamingBubble.tsx
│           ├── components/ TextPlayTopBar, PanelSwitcherMenu
│           ├── hooks/      usePanels
│           └── panels/     PanelsHost, StatsPanel, TagsPanel, presets/
├── queries/                React Query hooks（通用）
├── stores/                 Zustand stores（通用）
├── styles/                 themes.ts, globals.css
└── utils/
    ├── tokenExtract.ts     A/C 类标签提取
    └── regexPipeline.ts    ← 新增：正则替换管线
```

---

## 三、接下来的计划与建议

### 近期（内测前）

**P0：`<choice>` C 类标签前端实现**

当前 `tokenExtract.ts` 只处理 A 类标签（time/location 等）。需要扩展：
- 在 `extractTokens()` 中识别 `<choice>...</choice>` 块
- 提取后从叙事文本移除，返回 `choices: string[]`
- `TextPlayPage.handleTurnDone` 读取 `choices` 并 `setLastOptions`
- 这样创作者只需在 prompt 末尾要求 AI 输出 `<choice>` 块，前端自动渲染为选项按钮

**P0：`preprocessNarrative()` 补全**

当前 `MessageBubble` 里的 `preprocessNarrative()` 已实现 B 类标签替换，但 `say` 宏（`[[say|...|...|...]]`）走的是独立的 `splitSayBlocks()` 路径。两条路径需要保持一致，避免 say 宏内部的 B 类标签被漏处理。

**P1：主题扩展预留**

`themes.ts` 当前是硬编码的 6 套主题。为游戏包自带主题预留空间：
- `UIConfig` 增加 `custom_theme?: Partial<ThemeVars>` 字段（已有 `color_scheme` 做局部覆盖，但缺少完整主题声明）
- 或者在 `RegexProfileRef` 的同级增加 `ThemeRef`，走类似的 bundled 机制
- 内测阶段：只允许官方 6 套主题 + `color_scheme` 局部覆盖，不开放自定义主题包

**P1：`alice:core` 规则补充**

当前只有 2 条规则。根据实际游戏测试结果，可能需要补充：
- 移除 `<recap>...</recap>` 块（部分游戏用于内部总结，不应展示）
- 移除 `<theater>...</theater>` 块（明月秋青格式）
- 移除 `<timeline>...</timeline>` 块

这些规则应在真实游戏导入测试后确认，不要提前硬编码。

### 中期（内测后）

**Light 游玩页**

`FloatingPanelDecl` 的 `type: 'interactive'` 和 `position: 'free'` 已预留接口。Light 开发时：
- 自制 `LightPlayPage`，不复用 Text 的 `chat/` 组件
- VN 舞台（背景图、立绘槽位、对话框）独立实现
- `NarrativeTagsBar` 和 `FloatingPanel`（overlay 容器）届时可从 `pages/play/text/` 提升到 `components/`

**RegexProfile 公共库**

内测后如果创作者有分发正则表的需求：
- 在公共库增加 `RegexProfile` 类型的条目
- 游戏包 `regex_profiles` 引用时，导入流程自动拉取并安装
- 非官方 profile 导入时需用户确认（安全边界）

**主题包**

类似 RegexProfile 的机制，允许创作者打包完整 `ThemeVars` 随游戏分发。内测阶段不开放，中期再做。

---

## 四、已知限制与注意事项

1. **本地 JSON 导入丢失 `ui_config`**：`MyLibraryPage` 的本地导入硬编码 `ui_config: null`，测试官方标签渲染必须走后端导入。修复方向：解析 `data.ui_config` 并存入 localStorage 的 `LibItem`。

2. **`regexPipeline` 不联网**：内测阶段 `runRegexPipeline` 只加载 `alice:core` 和 `bundled` 规则，未知 ref 静默跳过。这是有意为之，避免内测期间引入网络依赖。

3. **`<choice>` 尚未实现**：`tokenExtract.ts` 还没有 C 类标签支持，`<choice>` 块目前不会被提取，会原样出现在叙事文本中。这是下一个 P0 任务。

4. **`preprocessNarrative` 在 `MessageBubble` 内**：当前 `preprocessNarrative()` 是 `MessageBubble.tsx` 内的私有函数。如果未来 Light 游玩页也需要 B 类标签渲染，应将其提升到 `utils/`。内测阶段保持现状。
