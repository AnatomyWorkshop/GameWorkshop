# GW Text 游玩页改造路线图

> 整理时间：2026-04-19  
> 来源：RENDER-SPEC §七、§十 + 对比分析文档（`response/comparison/`）  
> 目标：记录已完成的改造、当前架构状态、以及接下来各阶段的改造方向

---

## 一、当前架构状态（2026-04-18 快照）

### 1.1 消息生成全流程

```
用户输入
    ↓
ChatInput.send()
    ↓
useStreamStore.startStream()        ← AbortController，streaming=true
    ↓
streamTurn()                        ← fetchEventSource SSE
    ↓
┌─ 流式输出 ──────────────────────────┐
│  appendDelta(text)                │  ← 每个 token 实时追加 buffer
│  buffer 驱动 StreamingBubble      │  ← 前端实时展示
└────────────────────────────────────┘
    ↓ onDone(TurnResponse)
onTurnDone(turn)                    ← 先于 endStream 执行（避免空白帧）
    ├─ extractChoiceOptions()       ← C 类标签 → 选项按钮
    ├─ setVariables(turn.variables) ← 触发 PanelsHost 重渲染
    ├─ runRegexPipeline('extract')  ← 清洗阶段（A/C 类标签提取前）
    ├─ extractTokens()              ← A 类标签 → narrativeTokens
    └─ refetch()                    ← 重新获取 floors
    ↓
endStream()                         ← buffer 清空
    ↓
MessageBubble 渲染
    ├─ runRegexPipeline('narrative') ← B 类标签 → gw-* span
    ├─ splitSayBlocks()              ← S 类宏 → SayLine 组件
    └─ ReactMarkdown + rehypeRaw     ← 最终渲染
```

### 1.2 面板系统架构

```
panels/
  FloatingPanel.tsx          ← behavior 下沉（peek/tool/pinned）
  PanelsHost.tsx             ← 直接 import，无注册表
  presets/
    CharacterSheet.tsx       ← 平台内置
    TelemetryDebug.tsx
    HtmlPanel.tsx            ← iframe 沙箱，游戏自带 HTML
  gamePresets/
    DataPanel_绿茵好莱坞.tsx  ← 游戏专属（命名约定：Name_slug）
    SetupFormModal.tsx
  hooks/
    useDraggable.ts          ← PointerEvent + localStorage 持久化
```

### 1.3 渲染管线（五类标签）

| 类型 | 处理位置 | 作用 |
|------|---------|------|
| A 类（叙事信息） | `extractTokens()` → `handleTurnDone` | 提取后移除，渲染到 NarrativeTagsBar |
| B 类（内联样式） | `runRegexPipeline('narrative')` | 保留在文本中，转为 `gw-*` span |
| C 类（面板数据） | `extractChoiceOptions()` → `handleTurnDone` | 提取后移除，渲染为选项按钮 |
| D 类（后端剥离） | 后端处理，前端不感知 | — |
| S 类（结构宏） | `splitSayBlocks()` | `[[say|名|台词]]` → SayLine 组件 |

### 1.4 与 SillyTavern 的核心差异

| 维度 | GW | SillyTavern |
|------|----|----|
| 渲染方式 | React 组件树（JSX） | DOM 直接操作（innerHTML） |
| 安全边界 | 白名单解析（rehype-sanitize） | 插件自律，无明确限制 |
| 状态管理 | Zustand 单例 | 全局变量 + DOM 双重状态 |
| 扩展性 | 受限（需改源码） | 开放（插件可 hook 任意阶段） |
| 宏系统 | S 类宏硬编码（splitSayBlocks） | 后端 substituteMacros + 注册表 |
| 变量更新 | 全量重渲染（setVariables） | DOM 选择器定点更新 |

**结论**：GW 在安全性、可维护性、类型安全上优于 ST；在灵活性、更新粒度、生态成熟度上存在差距。性能瓶颈不在渲染方式，而在**全量重渲染 vs 增量更新**。

---

## 二、已完成改造（归档）

### 阶段 A：官方标签落地
- ✅ 五类标签体系建立（A/B/C/D/S）
- ✅ `globals.css` 补充 `gw-em-*` / `gw-aside` / `gw-quote` CSS 类和色变量
- ✅ `runRegexPipeline` 统一管线，`preprocessNarrative()` 移除
- ✅ `extractTokens()` + `extractChoiceOptions()` 前端实现
- ✅ `choiceColumns` 布局参数移除，选项固定纵向排列

### 阶段 B：主题预设完善
- ✅ 6 套主题预设（cyberpunk / parchment / minimal 等）
- ✅ `bg_image` 背景图层支持
- ✅ `theme_preset` + `layout_preset` 落实
- ✅ 底部 `☰` 改造为纵向操作面板
- ✅ 气泡样式切换移除，统一文本流呈现

### 阶段 B.5：架构重构 + 爱丽丝规则集
- ✅ `chat/` 组件归位到 `pages/play/text/chat/`
- ✅ `regexPipeline.ts`：`alice:core`（order 1-14）+ `alice:extended`（order 20-23）
- ✅ `RegexRule` / `RegexProfile` / `RegexProfileRef` 类型
- ✅ `MessageBubble` + `handleTurnDone` 接入管线

### 阶段 B.6：绿茵好莱坞前端改造
- ✅ `FloatingPanelDecl` 扩展（`html_panel` / `behavior` / `launcher`）
- ✅ `FloatingPanel` `behavior` 下沉（peek/tool/pinned）
- ✅ `HtmlPanel.tsx`：`getAllVariables` + `raw_replace` 两种注入模式
- ✅ `DataPanel_绿茵好莱坞.tsx`：4-Tab 布局（档案/履历/人脉/足坛）
- ✅ `useDraggable.ts`：PointerEvent + localStorage 持久化
- ✅ `PanelSwitcherMenu` 声明式入口（`launcher.placement`）

### 全局模型配置（P2 已完成）
- ✅ `GlobalSettingsDrawer`：Provider 预设 + API 配置 + Agent 槽位（内测暂不生效）
- ✅ `gw:settings` 事件总线（AppLayout 齿轮 + TextPlayTopBar 均触发）
- ✅ `gw:runtime` 事件桥接 TopBar 保存 → TextPlayPage 更新
- ✅ `onTurnDone` 先于 `endStream` 执行，避免空白帧

---

## 三、接下来的改造方向

### 阶段 C（必要）：前后端验证闭环

**目标**：跑通"创作配置 → 真实游玩页"的完整数据链路。

#### 前置修复（seed 前必须完成）

**1. ✅ `extract` scope 管线缺失**（已修复 2026-04-18）

`ALICE_CORE_RULES` 里 order-1 的 `<thinking>` 清洗规则只有 `scope: 'narrative'`，没有 `scope: 'extract'` 副本。导致 `handleTurnDone` 调用 `runRegexPipeline('extract')` 时，`<thinking>` 块不被清理，A 类标签提取前会混入 CoT 内容。

修复：在 `src/utils/regexPipeline.ts` 的 `ALICE_CORE_RULES` 里，为 order-1 和 order-2（`<content>` 剥离）各加一条 `scope: 'extract'` 副本：

```typescript
{ order: 1, pattern: '<thinking>[\\s\\S]*?</thinking>', replacement: '', scope: 'extract', flags: 'gi' },
{ order: 2, pattern: '<content>([\\s\\S]*?)</content>',  replacement: '$1',  scope: 'extract', flags: 'gi' },
```

**2. 游戏包启用 `delta_variable` 工具**（game.json，可选但建议）

后端 `delta_variable` 工具已完成，但需要游戏包在 `game.json` 里显式启用：

```json
{ "enabled_tools": ["get_variable", "set_variable", "delta_variable"] }
```

绿茵好莱坞等数值变化频繁的游戏建议加上，验证阶段可以先不加（用 `set_variable` 绝对值凑合）。

#### 验证步骤

1. **重新 seed 数据库**
   ```bash
   ./seed.exe --data ../data/cloud/games --force
   ```
   验证 victoria `game.json` 的 `floating_panels` 和 `stats_bar.items` 写入正确。

2. **前后端联调清单**

   | 验证项 | 预期结果 | 失败时检查 |
   |--------|---------|-----------|
   | SSE 流建立 | `event: token` 实时到达，`event: meta` 在末尾 | `streamTurn()` 的 `base_url` / `api_key` 配置 |
   | `<choice>` 块提取 | 选项按钮出现在消息下方 | `extractChoiceOptions()` + `handleTurnDone` |
   | `<UpdateState>` → 变量 | StatsPanel 数值在回合结束后更新 | `turn.variables` → `setVariables()` → PanelsHost |
   | A 类标签提取 | `<time>` / `<location>` 出现在 NarrativeTagsBar | `extractTokens()` + `token_extract_rules` |
   | `<thinking>` 不泄露 | 玩家消息里看不到 CoT 内容 | extract scope 修复（前置修复 1） |
   | 面板开关 | TopBar 面板菜单能打开/关闭 StatsPanel | `PanelSwitcherMenu` + `launcher.placement` |

3. **已知短期接受的限制**
   - 本地 JSON 导入丢失 `ui_config`：`MyLibraryPage` 硬编码 `ui_config: null`，测试官方标签渲染必须走后端导入（PNG 或公共库）

#### 验证中发现的问题（2026-04-18）

**P0 — 已修复**

- ✅ 引号着色（B 类管线，2026-04-18）：`renderQuoted()` React 渲染层方案存在结构性缺陷（`strong`/`em` 内引号颜色冲突、跨节点状态断裂）。改为 B 类管线规则：`regexPipeline.ts` order 15/16 将 `"..."` / `"..."` 转为 `<span class="gw-quoted">`，CSS `::before`/`::after` 补回引号符号。`renderQuoted` / `colorQuotedString` 已从 `MessageBubble.tsx` 完全移除，`strong` 组件恢复默认样式。
- ✅ 列表字号不一致：`ul`/`ol` 用 `text-sm`（14px），`p` 用 `text-[15px]`，导致同一消息内段落和列表字号不同。修复：列表改为 `text-[15px]` 与段落一致。
- ✅ AI 不进入剧情 / 输出"自行描述"：`system_prompt_template` 为空，`preset_entries` 只有 UpdateState 和输出格式规则，AI 无叙事者身份指令，默认进入"游戏主持人"模式反复询问玩家信息。修复：在 `victoria/game.json` 的 `preset_entries` 新增 `victoria_narrator_identity`（`injection_order: -1`），明确叙事者身份、开局确认后立即进入剧情的规则，以及禁止输出"自行描述"等游戏外引导语的硬性约束。
- ✅ `<Options>/<option>` 格式选项未提取：前端 `extractChoiceOptions()` 只处理 `<choice>` 格式，victoria 使用 `<Options><option>` XML 格式，导致选项按钮不出现。修复：扩展 `extractChoiceOptions()` 支持两种格式（格式 A 无结果时 fallback 到格式 B）。

**P1 — 待修复（前端）**

- 动态选项数量（2-5 个）：当前输出格式规则要求固定 3 个 option，后续可放开为 2-5 个，需同步更新 `preset_entries` 中的格式规则。

- ✅ **流式滚动锁死**（已修复 2026-04-18）：`MessageList.tsx` 改用 `useRef<boolean>` 追踪用户是否主动上翻，`followOutput` 改为函数形式——用户离开底部时返回 `false` 停止跟随，流式结束后重置。新消息到达（非流式）始终强制滚到底。

- ✅ **流式输出字号抖动**（已修复 2026-04-18）：`StreamingBubble` prose 模式容器 `div` 加 `fontSize: '15px'`，未闭合段落的裸文本节点继承基准字号，消除流式与静态渲染间的字号跳变。

- ✅ **工具调用标签泄露**（前端兜底，2026-04-18）：`regexPipeline.ts` ALICE_CORE_RULES 加 order 0 规则，清洗 `<｜DSML｜function_calls>` 块（narrative + extract 两个 scope）。后端根本修复待 `game_loop.go` 处理。

- **DSML 工具调用标签仍然泄露（全角竖线变体，2026-04-19）**：第十回合出现 `<｜DSML｜function_calls>...<｜DSML｜invoke name="set_variable">...` 泄露到消息正文，悬浮窗无数据更新。

  根本原因：
  1. **正则未覆盖全角竖线**：order 0 规则匹配的是 ASCII `|`（U+007C），实际泄露的分隔符是全角竖线 `｜`（U+FF5C）。正则未命中，标签透传到渲染层。
  2. **变量未更新**：工具调用以文本形式出现在 narrative 说明 LLM 没有走 structured tool_calls 路径，而是把工具调用写成了纯文本。后端 agentic loop 没有执行这些工具，`sb.Flatten()` 里没有变量变化，`turn.variables` 不含更新值，面板无法更新。

  修复方向：
  1. **前端 order 0 扩展**：正则改为同时匹配 ASCII `|` 和全角 `｜`：`<[|｜]DSML[|｜]function_calls>[\\s\\S]*?</[|｜]DSML[|｜]function_calls>`
  2. **后端根本修复**：`game_loop.go` 在流式输出完成后、构建 `TurnResponse` 前，剥离所有 DSML 工具调用块。同时检查为何 GLM 模型在此场景下输出文本格式工具调用而非 structured tool_calls，可能需要调整 tool 定义格式或 prompt 约束。

- ✅ **Edit 按钮查看原始内容**（已修复 2026-04-18）：assistant 消息的 Edit 按钮现在显示 `message.content`（管线处理前的原始文本，含 `[[say|...]]`、`<UpdateState>` 等标签），方便调试。`MetaLine` 新增 `canViewRaw` / `onViewRaw` prop，user 消息走可编辑路径，assistant 消息走只读查看路径（EditBox 展示原文，保存无效果）。

- **AI 屡次与玩家对话**（待 reseed 验证）："爱丽丝，未来的王，你现在打算怎么做？"——AI 仍在用第二人称直接提问玩家，没有进入纯叙事模式。这是 `preset_entries` 问题（需 reseed 验证），也可能是后端 `injection_position` 的注入顺序问题。待 reseed 后验证，若仍存在则需加强叙事者指令或检查后端 prompt 组装逻辑。

- **`<UpdateState>` 块泄露到消息正文**（待修复）：AI 输出的 `<UpdateState>{"存活天数": 1, ...}</UpdateState>` 块出现在消息气泡中，玩家可见。

  根本原因：`regexPipeline.ts` 的 `ALICE_CORE_RULES` 没有 `scope: 'narrative'` 的 `<UpdateState>` 清洗规则。`handleTurnDone` 调用 `runRegexPipeline('extract')` 提取变量后，`message.content` 原样存入数据库（含 `<UpdateState>` 块）。`MessageBubble` 渲染时 `processedContent` 跑 `runRegexPipeline('narrative')`，但没有对应规则，块原样透传给 `ReactMarkdown`，被渲染为可见文本。

  修复方向：
  1. **前端兜底**（立即可做）：`regexPipeline.ts` ALICE_CORE_RULES 加 order 6 规则，`scope: 'narrative'`，清洗 `<UpdateState>[\\s\\S]*?</UpdateState>`。
  2. **后端根本修复**（推荐）：`game_loop.go` 在构建 `TurnResponse.narrative` / 写入 floor content 前，剥离 `<UpdateState>` 块，只保留叙事正文。前端兜底可作为双重保险保留。

- **AI 导演描述泄露到消息正文**（待 reseed 验证）：AI 输出包含 `**第一步：...**`、`**第二步：...**` 等 Markdown 加粗标题和角色档案表格，这些是 AI 自我组织输出的"导演视角"元叙事，不应出现在玩家可见的叙事正文中。

  根本原因：`victoria/game.json` 的 `preset_entries` 尚未 reseed 到数据库。当前数据库中运行的是旧版 prompt，缺少 `victoria_narrator_identity` 条目（`injection_order: -1`），AI 没有明确的叙事者身份约束，默认进入"游戏主持人"模式，输出结构化的设置说明而非沉浸式叙事。

  修复方向：执行 `./seed.exe --data ../data/cloud/games --force` 重新 seed，使新版 `preset_entries` 生效。若 reseed 后仍存在，检查后端 `injection_position` 注入顺序，确认 `victoria_narrator_identity` 在 system prompt 最前面生效。

- **流式输出中途页面无法滚动**（待修复）：流式输出进行到一定位置后，消息列表停止自动跟随，玩家无法看到新生成的内容，需手动滚动。

  根本原因分析：
  1. **`followOutput` 回调引用不稳定**：`useCallback([streamingBuffer])` 依赖 `streamingBuffer`，每个 token 到达时 `streamingBuffer` 变化，`followOutput` 函数引用随之重建。Virtuoso 内部可能缓存了旧的回调引用，导致新 token 到达时仍用旧回调判断是否跟随。
  2. **`scrollToIndex` 时序问题**：虚拟列表中 `scrollToIndex({ index: totalItems - 1 })` 在 `useEffect` 里调用，此时 Virtuoso 可能尚未完成新 item 的高度测量，导致滚动目标位置计算错误或被忽略。
  3. **`userScrolledUp` 状态误触发**：Virtuoso 在渲染新 item 时可能触发内部滚动事件，`followOutput` 收到 `isAtBottom: false`（因为新 item 还未渲染到底部），误将 `userScrolledUp` 置为 `true`，后续 token 到达时停止跟随。

  修复方向：
  - 将 `followOutput` 改为 `useRef` 存储稳定引用，避免 Virtuoso 缓存旧回调：
    ```typescript
    const followOutputRef = useRef<(isAtBottom: boolean) => false | 'auto' | 'smooth'>()
    followOutputRef.current = (isAtBottom) => { ... }
    const followOutput = useCallback((isAtBottom: boolean) => followOutputRef.current!(isAtBottom), [])
    ```
  - 或改用 Virtuoso 的 `atBottomStateChange` 事件替代 `followOutput` 回调，分离"是否在底部"的状态追踪与"是否跟随"的决策逻辑。
  - `scrollToIndex` 调用加 `align: 'end'` 参数，确保目标 item 滚到可视区底部。

**P2 — 记录**

- 响应时间偏慢：待联调后用实际 SSE 时间戳分析，区分是 TTFT（首 token 延迟）还是总生成时长问题。

---

### 阶段 C.5（必要）：增量更新 + 渲染稳定性

> 从对比分析得出的结论：**这不是可选优化，而是必须解决的架构问题**。
>
> 50 轮对话场景下，GW 全量重渲染约 50ms，ST 增量 innerHTML 约 5ms。差距来源不是渲染方式，而是更新策略。随着游戏对话轮数增加，这个问题会线性恶化。

#### 名词澄清：两个"增量"需求，不要混淆

本阶段涉及两个独立需求，名字相近但层次完全不同：

| 需求 | 是什么 | 在哪里 | 依赖 |
|------|--------|--------|------|
| **`delta_variable` 工具**（后端） | LLM 调用的原子增减工具，`get_variable`/`set_variable` 的兄弟，加在 `builtins.go` | 后端工具层 | 无，现在可做 |
| **`changed_variables` 响应字段**（前后端） | `TurnResponse` 新增字段，只含本轮变化的 key，供前端做增量渲染更新 | 后端响应层 + 前端 store | 无，C 完成后做 |

两者都不依赖 P-4K（宏注册表重构），操作的是完全不同的层。

---

#### C.5.0 ✅ `delta_variable` 工具（后端，已完成 2026-04-18）

**是什么**：一个新的内置 LLM 工具，让 AI 可以对数值变量做原子增减，而不是每次都用 `set_variable` 写绝对值。

**为什么需要**：当前 AI 用 `set_variable` 写绝对值时，多个数值同时变化（体能 -15、速度 +2、好感度 +5）容易出错——AI 需要先读当前值再计算新值，读写之间可能有误差。`delta_variable` 让 AI 直接说"体能减 15"，后端原子执行。

**已实现内容**：

- `internal/engine/tools/builtins.go`：新增 `DeltaVariableTool`（~50 行）
  - 参数：`name`（变量名，支持点分隔路径）+ `delta`（增减量）
  - 执行：读当前值 → 类型检查（float64/int/json.Number）→ 加 delta → 写回 Page 沙箱
  - 非数值变量返回 `{"ok":false,"error":"not a number"}`
  - 变量不存在时以 0 为基准
  - 返回 `{"ok":true,"name":"...","old":85,"new":70}`
- `internal/engine/api/game_loop.go`：注册行（`enabled["delta_variable"]`）
- `internal/engine/api/engine_methods.go`：注册行（同上）

**游戏包启用方式**：在 `game.json` 的 `enabled_tools` 里加 `"delta_variable"`。

---

#### C.5.1 面板渲染增量更新（前后端协同）

**问题根源**：`setVariables(turn.variables)` 每次传入全量变量对象（`sb.Flatten()` 的完整快照），React 浅比较认为引用变了，所有面板无条件重渲染。

**以每条消息为增量的架构需求**：

```
当前（全量）：
  TurnResponse.Variables = { "生命值": 80, "金币": 120, "好感度.艾拉": 65, ... }  ← sb.Flatten() 全量
  → setVariables(全量) → 所有面板重渲染

目标（增量）：
  TurnResponse.Variables      = { ... }  ← 保留，用于首次加载 / 重连初始化
  TurnResponse.ChangedVariables = { "生命值": 75, "好感度.艾拉": 70 }  ← 新增，只含本轮变化的 key
  → mergeVariables(changed) → 只有订阅了这两个变量的面板重渲染
```

**后端需要做的**（`game_loop.go`）：

- `TurnResponse` 新增字段 `ChangedVariables map[string]any \`json:"changed_variables,omitempty"\``
- 在 `CommitTurn` 前记录一次变量快照（`snapshotBefore`），`CommitTurn` 后对比 `sb.Flatten()`，diff 出变化的 key 写入 `ChangedVariables`
- `StreamMeta`（SSE 流式响应）同步新增此字段
- 保留 `Variables`（全量）不变，向后兼容

**前端需要做的**：

1. **`api/types.ts` 更新**：`TurnResponse` 新增 `changed_variables?: Record<string, unknown>`

2. **Zustand store 改造**：`variables` 从 `TextPlayPage` 的 `useState` 迁移到独立 store，支持增量 merge

   ```typescript
   // stores/variables.ts
   interface VariablesStore {
     variables: Record<string, unknown>
     setVariables:   (full:  Record<string, unknown>) => void  // 首次加载 / 重连
     mergeVariables: (changed: Record<string, unknown>) => void // 每轮增量
   }
   ```

3. **面板订阅机制**：面板组件通过 Zustand selector 只订阅自己关心的变量前缀，不再接收整个 `variables` prop

   ```typescript
   // 面板内部：只订阅 "核心能力.*" 前缀
   const stats = useVariablesStore(s =>
     Object.fromEntries(
       Object.entries(s.variables).filter(([k]) => k.startsWith('核心能力'))
     )
   )
   ```

4. **`React.memo` + 精细比较**：面板组件包裹 `React.memo`，比较函数做浅层 key 对比

   ```typescript
   export const StatsPanel = React.memo(StatsPanelInner, (prev, next) =>
     shallowEqual(prev.variables, next.variables)
   )
   ```

5. **`handleTurnDone` 改造**：优先读 `changed_variables`，fallback 到全量

   ```typescript
   if (turn.changed_variables && Object.keys(turn.changed_variables).length > 0) {
     mergeVariables(turn.changed_variables)
   } else {
     setVariables(turn.variables ?? {})
   }
   ```

**实施时机**：阶段 C（前后端验证闭环）完成后实施，此时变量链路已验证，改造风险低。

#### C.5.1.5 ✅ 符号渲染管线（B 类扩展，已完成 2026-04-18）

**已实现**：

- `regexPipeline.ts` ALICE_CORE_RULES 新增 order 15（ASCII `"..."`）和 order 16（中文弯引号 `"..."`），转为 `<span class="gw-quoted">$1</span>`
- `globals.css` 新增 `.gw-quoted`：`color: var(--color-quote)`，`::before`/`::after` 补回引号符号（Unicode `\201C` / `\201D`）
- `MessageBubble.tsx` 移除 `renderQuoted` / `colorQuotedString`，`p` 组件直接渲染 children，`strong` 组件恢复默认样式（不再强制 accent 色）

**流式输出**：✅ `StreamingBubble` 对 buffer 跑 `runRegexPipeline('narrative')`，并加入 `rehypeRaw` + `rehypeSanitize`（复用 `GW_SANITIZE_SCHEMA`），管线输出的 `<span class="gw-quoted">` 在流式过程中实时渲染着色。未闭合引号（流式中途）不着色，闭合后立即生效。

**创作者声明机制**（阶段 F 实施）：`ui_config.symbol_rules` 声明引号字符、着色方案，平台动态生成对应 B 类规则，创作者无需手写正则。

---

#### C.5.2 ✅ 正则管线缓存（已完成 2026-04-18）

`MessageBubble` 的 `processedContent` 改为 `useMemo`，依赖 `[message.content, message.role, regexProfiles]`，历史消息不再每次父组件重渲染都重跑管线。

#### C.5.3 ✅ S/B 类标签路径对齐（已完成 2026-04-18）

`splitSayBlocks` 签名改为 `(raw, profiles)`，解析出 say 块的 `text` 后立即对其执行 `runRegexPipeline('narrative')`。两处调用点均已传入 `regexProfiles`。

#### C.5.4 ✅ 宏标签泄露防御（已完成 2026-04-18）

`splitSayBlocks` 入口加 `normalizeMacroText()`，还原 HTML 实体、反斜杠转义、多层方括号、多余空格四类变体。DEV 模式下对未解析的 `[[` 输出 `console.warn`。`tsconfig.json` 补充 `"types": ["vite/client"]` 以支持 `import.meta.env.DEV`。

---

### 阶段 C.5.5（下一步）：消息编辑全面开放

#### 现状与 ST 对比

ST 的消息编辑逻辑（`script.js` `messageEditDone`）：
- user 和 assistant 消息均可编辑
- 编辑后**不触发重新生成**，只更新当前消息内容并持久化
- 后续消息保持不变，编辑是局部修改而非分支点
- 编辑框展示的是原始文本（未经格式化）

GW 当前状态：
- `canEdit = isUser && !!floorId && !!sessionId && !!onEdited`：只有 user 消息可编辑
- `canViewRaw = !isUser`：assistant 消息只能查看原文（只读）
- 后端 `PATCH /play/sessions/:id/floors/:floorId` 已支持任意 floor 的内容更新
- `EditBox` 组件本身无角色限制，可直接复用

#### GW 的改进设计

相比 ST，GW 可以做得更好：

| 维度 | ST | GW 目标 |
|------|-----|---------|
| 编辑框内容 | 原始文本（含 ST 格式标记） | 原始内容（含 `[[say\|...]]`、`<UpdateState>` 等标签） |
| 保存后渲染 | 调用 `messageFormatting()` 重渲染 | 前端 `onEdited` 回调触发 `message.content` 更新，`useMemo` 自动重跑管线 |
| 重新生成 | 不触发 | 不触发（编辑是局部修改） |
| 编辑历史 | 无 | 无（当前阶段），后续可加 undo |
| 角色区分 | 无区分 | 无区分（user/assistant 均可编辑原始内容） |

**字号抖动修复**（`StreamingBubble` 容器加 `fontSize: 15px`）是正确的，不需要改。

#### 实施要点（现在可以做）

1. **`MessageBubble.tsx`**：
   - `canEdit` 改为 `!!floorId && !!sessionId && !!onEdited`（移除 `isUser` 限制）
   - 移除 `canViewRaw` / `onViewRaw`（合并进统一的 `canEdit` 路径）
   - `commitEdit` 保持不变（已调用 `sessionsApi.editFloor`）
   - `onEdited` 回调触发父组件更新 `message.content`，`useMemo` 自动重跑管线重渲染

2. **`TextPlayPage.tsx`**：
   - 确认 `onFloorEdited` 回调更新了 `floors` 状态中对应消息的 `content` 字段
   - 若当前只更新 user 消息，需扩展为更新任意 role 的消息

3. **不需要做的**：
   - 不需要后端改动（API 已支持）
   - 不需要重新生成逻辑（编辑是局部修改）
   - 不需要 C.5.1（`changed_variables`）完成后才做，两者独立

#### 与 C.5.1 的关系

编辑 assistant 消息后，`message.content` 更新，`useMemo` 重跑管线，渲染正确。变量面板不受影响（变量来自 `turn.variables`，不来自消息内容）。C.5.1 完成后变量增量更新，与编辑功能完全独立。

---

### 阶段 C.6 ✅：三选一浮窗（ChoicePanel，已完成 2026-04-19）

**已实施**：

- `panels/ChoicePanel.tsx`：独立浮窗，`behavior="pinned"`，`draggable`，可拖动定位，标题显示当前回合序号
- `TextPlayPage`：`lastOptions` 直接传给 `ChoicePanel`，流式期间隐藏，回合结束后自动弹出
- `MessageBubble`：移除 `onChoose` prop，`choices` 改为只读历史展示（降调样式，不可再点击）
- `MessageList`：移除 `lastOptions`/`onChoose` prop，彻底解耦选项交互

**输出路径**：`ChoicePanel.onChoose` → `gw:choose` 事件 → `ChatInput.send()` → `streamTurn()`，与玩家手动输入完全一致，无新逻辑。

**历史选项追溯**：当前 `Floor` 类型无 `options` 字段，历史消息不展示选项记录。后续可在后端 `Floor` 加 `options []string` 字段，前端 `MessageBubble` 的 `choices` prop 从 floor 数据读取，实现楼层回溯重选。

**布局**：

```
┌─────────────────────────────────────────────────────┐
│  TopBar                                             │
├─────────────────────────────────────────────────────┤
│                                                     │
│   消息流（不变）                  ┌──────────────┐  │
│                                  │ 选项·第N轮 ×  │  │
│                                  │ ── 选项 A ──  │  │
│                                  │ ── 选项 B ──  │  │
│                                  │ ── 选项 C ──  │  │
│                                  └──────────────┘  │
├─────────────────────────────────────────────────────┤
│  ChatInput                                          │
└─────────────────────────────────────────────────────┘
```

**选项来源优先级**（见 `TEXT-PLAY-SPEC.md §3.2`）：

1. `TurnResponse.options`（后端 `<Options>` 解析成功）
2. `<choice>` 标签前端兜底提取（后端未返回选项时）
3. `ui_config.first_options`（首轮无用户消息时）

`first_options` 初始化逻辑保留在 `TextPlayPage` 顶层，作为连接 `uiCfg` 与 `lastOptions` 的胶水层 effect，不下沉到 `useGameState`（避免该 hook 额外依赖 `streaming`/`pendingUserInput`）。

---

### 阶段 C.6.5：浮窗管线架构与富文本渲染展望

> 来源：2026-04-19 讨论。记录架构方向，不在近期实施。

#### 浮窗输入输出的管线整齐性

当前浮窗（`FloatingPanel`）是纯展示层，数据来自 `variables`（变量面板）或 `lastOptions`（选项面板）。如果未来浮窗需要独立的输入输出管线（如 Director 浮窗发送指令、ChoicePanel 接收 AI 生成的选项预览），需要以下架构：

```
浮窗输入
    ↓
独立 SSE 流（不走主 ChatInput → streamTurn 路径）
    ↓
浮窗专属 handleTurnDone（只更新浮窗状态，不写 floor）
    ↓
浮窗渲染（ReactMarkdown + remarkSymbols，复用同一渲染配置）
```

关键约束：**浮窗输出不写入 floor**，不污染叙事历史。这要求后端区分"主叙事流"和"浮窗流"两种 turn 类型，或者浮窗走独立的轻量 API 端点（不经过完整 game_loop）。

#### 渲染层是否需要另一个 AI

不需要专门的"渲染 AI"。当前架构已经足够：

- **叙事文本**：narrator LLM 输出 → `parser.go` 解析 → `remarkSymbols` + `ProseComponents` 渲染
- **变量更新**：工具调用（`set_variable`/`delta_variable`）或 `<UpdateState>` → 后端执行 → 面板更新
- **选项生成**：narrator 输出 `<Options>` → `extractChoiceOptions()` → `ChoicePanel`

如果未来需要"选项预览"（点击选项后 AI 生成一段预览文字），可以用 Director slot（已有）做轻量推理，不需要新增 AI 角色。

#### 后端架构对画面展示的支撑能力

当前后端（`TurnResponse` + SSE 流）已经足够支撑：
- ✅ 叙事文本流式输出
- ✅ 变量状态更新（面板数据）
- ✅ 选项列表
- ✅ VN 指令（`VNDirectives`：背景图、BGM、立绘位置）——已有字段，前端尚未实现

**尚未支撑的**：
- ❌ 道具/人物的富文本卡片（需要 `TurnResponse` 新增 `entities` 字段）
- ❌ 像素图/图像生成（需要独立图像生成 API，与叙事流解耦）

#### 富文本道具/人物描述的实现难度

**方案 A：Markdown 内嵌卡片（低难度，近期可做）**

AI 输出特定宏标签，S 类宏系统渲染为卡片组件：

```
[[item|铁剑|攻击+5，耐久80/100]]
[[npc|艾拉|好感度:70，当前状态:警惕]]
```

`splitSayBlocks` 扩展支持 `item`/`npc` 宏，渲染为内嵌卡片。难度低，复用现有 S 类宏架构，阶段 F 宏注册表时一并实施。

**方案 B：像素图/图像生成（高难度，中期）**

需要独立图像生成服务（Stable Diffusion / DALL-E），叙事流触发图像请求，异步返回图片 URL，前端 `<img>` 渲染。与叙事流完全解耦，不影响 TTFT。难度在于：图像生成延迟（5-30s）、风格一致性、成本控制。

**建议**：先做方案 A（宏卡片），满足大部分道具/人物展示需求，成本极低。方案 B 作为可选增强，游戏包通过 `enabled_features: ["image_gen"]` 显式启用。

---

### 阶段 C.7：后端存储层修复 + 符号渲染架构升级

#### C.7.1 后端存储层修复（`<UpdateState>` 根本修复）

**问题根源**（已在 P1 记录）：`game_loop.go` 写入 floor content 时使用的是 AI 原始输出，而不是 `parser.go` 解析后的 `Narrative` 字段。`parser.go` 已经正确地将 `<UpdateState>` 从叙事文本中剥离，但这个干净的结果没有被持久化。

**后端架构现状**（2026-04-18 探查）：

```
AI 原始输出
    ↓
parser.Parse(raw)
    ├─ Narrative  = 叙事正文（已剥离 <UpdateState>/<Options>/<Narrative> 包裹）
    ├─ StatePatch = 变量变更（从 <UpdateState> 提取的 JSON）
    ├─ Options    = 选项列表
    └─ VN         = 视觉小说指令（可选）
    ↓
game_loop.go 写 floor：
    ├─ floor.content = ❌ 原始输出（含 <UpdateState>）← 问题所在
    └─ TurnResponse.Narrative = ✅ 干净叙事文本（但前端历史消息读的是 floor.content）
```

**修复方向**：`game_loop.go` 写 floor 时改用 `parsed.Narrative`，而非原始 AI 输出。前端 `regexPipeline.ts` 的 order 6 兜底规则（清洗 `<UpdateState>`）作为双重保险保留。

**关于 narrator/director 分工**：后端已有 Director slot（narrator 之前运行，提供叙事指导）和 Verifier slot（narrator 之后运行，验证一致性）。变量更新目前由 narrator 通过 `<UpdateState>` 标签或工具调用（`set_variable`/`delta_variable`）完成。将变量更新完全移交给独立 LLM 是可行的架构演进方向，但不是当前瓶颈——当前问题只是存储层的一行修复，不需要重构 agent 分工。五类标签体系无需重制。

**✅ 已实施（2026-04-19）**：`game_loop.go:586` 和 `engine_methods.go:703` 均已将 `CommitTurn` 第二参数从原始 AI 输出（`llmResp.Content` / `fullContent`）改为 `parsed.Narrative`。前端 order 6 兜底规则保留作双重保险。

#### C.7.2 符号渲染架构升级（引号着色的根本方案）

**当前方案的局限**：B 类管线（order 15/16）用正则把 `"..."` 转为 `<span class="gw-quoted">`，在字符串层面操作，存在以下问题：

1. **跨 Markdown 节点断裂**：引号跨越 `**bold**`、`*em*` 等 Markdown 语法时，正则在 Markdown 解析前运行，会破坏 AST 结构或被 Markdown 解析器截断
2. **不配对引号无法处理**：流式输出中途引号未闭合时，正则无法匹配，着色延迟到引号闭合后才生效（已知，当前接受）
3. **嵌套引号无法区分**：`"他说'好的'"` 这类嵌套引号，正则无法区分层级
4. **复制时引号丢失**：`::before`/`::after` 伪元素生成的引号符号不在 DOM 里，浏览器复制操作只读取 DOM 文本节点，复制结果会丢失引号。这是 CSS 规范行为，不是 bug。

**✅ 已实施（2026-04-19）：remark 插件方案**

经过评估，`ReactMarkdown components.text` 钩子对应的是 SVG `<text>` 元素而非文本节点，`p` 组件递归 children 是临时方案，覆盖不到 `li`/`blockquote` 等容器。最终选用 **remark 插件**在 mdast AST 层处理，这是正确的架构位置：

```
Markdown 字符串
  → remark 解析（mdast）
  → [remarkSymbols] text 节点 → html 节点（<span class="gw-quoted">"内容"</span>）
  → rehype 转换 → rehype-raw → rehype-sanitize（span[className] 已白名单）
  → react-markdown 渲染
```

**实施内容**：
- `src/utils/remarkSymbols.ts`：独立插件，`SymbolRule[]` 接口，`DEFAULT_RULES` 内置引号规则，`createRemarkSymbols(rules)` 工厂函数供阶段 F 扩展
- `MessageBubble.tsx`：移除 `QUOTE_RE`/`renderTextWithQuotes`/`applyQuotesToNode`，`ProseComponents` 恢复干净，`remarkPlugins` 加入 `remarkSymbols`
- `StreamingBubble.tsx`：同步加入 `remarkSymbols`，流式过程中引号实时着色
- `regexPipeline.ts`：移除 order 15/16，注释说明已迁移至插件
- `globals.css`：移除 `::before`/`::after` 伪元素，保留 `.gw-quoted` 颜色样式

**优势对比**：

| 维度 | 旧方案（B 类管线 + 伪元素） | 新方案（remarkSymbols 插件） |
|------|----------------------------|------------------------------|
| 处理时机 | Markdown 解析前（字符串层） | Markdown 解析后（mdast 节点层） |
| 跨节点安全性 | ❌ 可能破坏 `**bold**` 内引号 | ✅ 只处理纯文本节点，不碰结构 |
| 覆盖范围 | 仅 `p` 组件（递归方案） | ✅ 所有容器（p/li/blockquote/strong/em） |
| 复制引号 | ❌ 伪元素不在 DOM，复制丢失 | ✅ 引号写入 span 内容，可正常复制 |
| 流式覆盖 | ✅ | ✅ StreamingBubble 同步接入 |
| 解耦性 | 散落在管线 + CSS + 组件三处 | ✅ 集中在 `remarkSymbols.ts` 一处 |

**后端迁移路径**（阶段 D.5 后可选）：符号规则稳定后，可移至后端 `parser.go` 在构建 `TurnResponse.Narrative` 时直接输出带 `<span>` 的 HTML，前端插件降级为透传或移除。迁移条件：后端等价白名单机制就绪。

**`gw-em-gold` 框内效果**（✅ 已实现 2026-04-18）：参考 Claude Code 的 `<code>` 样式，给 `gw-em-gold` 加了半透明背景和圆角：

```css
.gw-em-gold {
  color: var(--color-em-gold);
  font-weight: 600;
  background: color-mix(in srgb, var(--color-em-gold) 12%, transparent);
  border-radius: 3px;
  padding: 0.1em 0.35em;
  font-size: 0.9em;
}
```

AI 输出 `<em class="gold">重要名词</em>`，B 类管线转为 `<span class="gw-em-gold">`，CSS 渲染为金色框内文字，效果与 Claude Code 的 inline code 一致。

**阶段 F 扩展**：`ui_config.symbol_rules` 声明的创作者自定义规则，通过 `createRemarkSymbols(rules)` 工厂函数传入，平台动态生成对应规则，创作者无需手写正则。

---

### 阶段 C.8：chat/ 组件解耦重构

> 纯重构，不改行为。在 C 阶段功能验证（reseed + 联调）通过后实施，避免在调试期引入路径变更噪音。

**当前问题**：`MessageBubble.tsx`（605 行）混合了五个独立关注点，`ProseComponents`/`GW_SANITIZE_SCHEMA` 被 `StreamingBubble` 跨文件导入，说明它们已不是 `MessageBubble` 私有。

**目标目录结构**：

```
chat/
  MessageBubble.tsx      ← 只保留主组件逻辑（~200 行）
  StreamingBubble.tsx
  MessageList.tsx
  MetaLine.tsx           ← MoreMenu + MiniAction + MetaLine + EditBox
  SayLine.tsx            ← SayLine 组件

utils/
  regexPipeline.ts       ← 现有，B 类管线规则
  remarkSymbols.ts       ← 现有，符号渲染插件
  macroParser.ts         ← normalizeMacroText + splitSayBlocks（S 类宏解析）

render/                  ← 新目录，渲染配置层（与 React 组件解耦）
  proseComponents.tsx    ← ProseComponents + GW_SANITIZE_SCHEMA
```

**拆分原则**：
- `render/proseComponents.tsx`：渲染配置（Markdown 组件映射 + rehype 白名单），被 `MessageBubble` 和 `StreamingBubble` 共同导入，不再从消息组件导出
- `utils/macroParser.ts`：S 类宏解析逻辑（`normalizeMacroText` + `splitSayBlocks`），纯函数，不依赖 React，可被 Light 游玩页复用
- `chat/MetaLine.tsx`：消息操作 UI（`MoreMenu`/`MiniAction`/`MetaLine`/`EditBox`），强依赖消息 props，不提升到 `components/`
- `chat/SayLine.tsx`：say 宏渲染组件，可选独立（较小，优先级低）

**alice 规则渲染的归属**：
- 规则数据（`ALICE_CORE_RULES`）→ `regexPipeline.ts`（现有）
- 符号渲染（引号着色）→ `remarkSymbols.ts`（现有）
- Markdown 组件样式（`gw-em-gold` 等 CSS 类的 React 映射）→ `render/proseComponents.tsx`
- CSS 变量和样式 → `globals.css`（现有）

三层分离：规则定义 / AST 转换 / React 渲染配置，各自独立，互不耦合。

---

### 阶段 C.8.5 ✅：TextPlayPage 解耦（已完成 2026-04-19）

`TextPlayPage.tsx` 从 729 行拆分为主组件（~230 行）+ 四个独立 hook：

| Hook | 职责 | 关键依赖 |
|------|------|---------|
| `hooks/useTheme.ts` | 主题预设 + `color_scheme` 覆盖 + `gw:theme` 事件 | `uiCfg`, `gameLoaded` |
| `hooks/useGameState.ts` | `variables` / `narrativeTokens` / `lastOptions` / `choicePanelOpen` + floor 恢复 | `floors`, `uiCfg` |
| `hooks/useStreamConfig.ts` | `runtimeCfg` + `gw:runtime` 事件 → `streamOpts` | `branchId` |
| `hooks/useTurnHandlers.ts` | `handleTurnDone` / `handleChoose` / `handleRetry` / `handleForkFromFloor` | 上述 setters + `refetch` |

`getThemePreset()` 从 `useTheme.ts` 导出，`TextPlayPageMock` 直接复用，消除了主题逻辑的重复。

**保留在顶层组件的逻辑**（有意为之）：
- `first_options` 初始化 effect：连接 `uiCfg` 与 `lastOptions`，依赖 `streaming`/`pendingUserInput`，下沉会增加 `useGameState` 的参数复杂度
- pending 清理 effect：stream store 内务，放在消费 stream store 的组件里最自然
- 自动开局 effect（`gw_setup_` sessionStorage）：3 行逻辑，不值得单独抽 hook

---

### 阶段 C.9.5：✅ game.json 格式清理（ST 残留清除）

**背景**：三个游戏文件（绿茵好莱坞、victoria、longdu）均从 SillyTavern 角色卡导入，保留了 ST 特有字段和结构，与 GW 格式不兼容。

**清理内容**：

| 问题 | 涉及游戏 | 处理方式 |
|------|---------|---------|
| `template: { ... }` 嵌套包装 | 绿茵好莱坞、victoria | 展平到顶层，移除包装层 |
| ST 专有字段（`description`、`personality`、`scenario`、`system_prompt`、`post_history_instructions`、`mes_example`、`alternate_greetings`、`creator`、`character_version`、`source_spec`、`status`、`author_id`、`version`） | 三个游戏均有 | 全部删除 |
| `fallback_options` → `first_options` | longdu | 字段重命名 |
| `system_prompt` 字符串 → `preset_entries` 数组 | longdu | 转换为 `{role, content, enabled, order, position}` 格式 |
| `{{format_message_variable::stat_data}}` ST 宏 | 绿茵好莱坞 | 删除含该宏的 worldbook 词条 |
| say 三格格式示例缺失 | 绿茵好莱坞 | 在 `preset_entries` order 1 补充完整格式说明 |

**`{{user}}` 保留策略**：`{{user}}` 是 GW 模板变量（运行时渲染为玩家选择的名字），不是 ST 残留，不得替换。longdu 的 worldbook 词条中大量使用 `{{user}}` 均已保留。

**清理后各文件顶层字段**：
- 绿茵好莱坞：`slug / title / type / short_desc / tags / first_mes / config / worldbook_entries / preset_entries`
- victoria：`slug / title / type / short_desc / config / preset_entries / worldbook_entries / regex_profiles / regex_rules / materials / preset_tools`
- longdu：`slug / title / type / short_desc / cover_url / config / worldbook_entries / preset_entries`

---

### 阶段 C.9：S 类宏 prompt 规范（待 reseed 验证）

**问题现象**：victoria 游戏 AI 输出对话格式为：

```
[say|温莎|在门口]你好，爱丽丝
```

而正确格式应为：

```
[[say|温莎|在门口|你好，爱丽丝。]]
```

**根本原因**：prompt 问题，不是宏设计问题。

AI 把"在门口"理解为台词（第二格），把实际台词"你好，爱丽丝"写在了宏括号外。说明 `preset_entries` 里的格式示例只展示了两格用法（`[[say|名字|台词]]`），AI 不知道三格格式（`[[say|名字|副标题|台词]]`），自己发明了"两格+外挂台词"的变体。

**宏设计本身正确**：三格格式中副标题（位置/情绪/动作）渲染为名字行右侧小字，台词在气泡内，这正是 AI 想表达的结构。对话内容必须在宏括号内（第三格），这是解析器约束，不是设计缺陷。

**修复方向**：在 `victoria/game.json` 的格式规则 `preset_entries` 里补充三格示例：

```
对话格式：[[say|角色名|位置或动作|台词内容]]
示例：[[say|温莎|在门口|你好，爱丽丝。]]
错误示例（禁止）：[say|温莎|在门口]你好，爱丽丝
```

reseed 后验证。若 AI 仍输出错误格式，检查 `normalizeMacroText()` 是否能兜底处理常见变体（当前已处理 `[[[say`、`[[ say` 等空格变体，但不处理"宏外台词"这种结构性错误）。

---

### 阶段 D（必要）：Light 游玩页

**定位**：Light 是独立游玩页，与 Text 没有统一的游玩页基类。游戏在 `game.json` 里声明类型（`type: "light"`），前端路由到 `LightPlayPage`。

**核心差异**：

| 维度 | Text 游玩页 | Light 游玩页 |
|------|------------|-------------|
| 主体 | 消息流（`MessageList`） | 可编辑 Input 舞台（背景图、立绘、对话框） |
| AI 调用 | 每轮对话驱动叙事 | 局部功能（特定交互触发，不是主循环） |
| 变量呈现 | 浮窗面板（`FloatingPanel`） | 直接叠加在舞台上（HUD 层） |
| 消息生成 | 核心功能 | 辅助功能（如 NPC 对话气泡、事件描述） |
| 模型选择 | 游戏包声明 | 游戏包声明，可选轻量模型（视觉效果优先） |

**主要面板是可编辑 Input**：玩家直接在舞台上操作（点击立绘、拖动物品、填写表单），而不是通过聊天输入框。AI 消息生成是舞台上的局部响应，不是页面的主要交互模式。

**实施要点**：

- `LightPlayPage`：独立页面，VN 舞台 + HUD，不复用 `chat/` 组件
- 舞台层：背景图、立绘位置、对话框，由 `game.json` 的 `stage_config` 声明
- HUD 层：变量直接渲染在舞台上（血条、金币、位置标签），不走 `FloatingPanel`
- AI 调用：通过 `stage_event` 触发（点击 NPC、进入区域），返回局部叙事文本，不走完整 SSE 流
- 共享组件提升：`NarrativeTagsBar`、`FloatingPanel` 移到 `components/`，供 Light 和 Text 共用

### 阶段 D.5（可选，可插入 D 和 E 之间）：后端 Token 提取

> 官方标签稳定后可做，减少前端计算量，为后端校验变量合法性铺路。

- 后端 `StreamMeta` 加 `Tokens []NarrativeToken` 字段
- 后端 `ExtractTokens()` 提取 A 类官方标签
- 前端 `handleTurnDone` 直接读 `turn.tokens`，移除前端 regex 提取逻辑

---

### 阶段 E（中期）：数据驱动 preset + html_panel 增强

**`html_panel` postMessage 桥**

变量更新时不重建 iframe，内部状态保留（Tab 选中、滚动位置）：

```
平台 → iframe：{ type: 'gw:vars_update', variables: {...} }
iframe → 平台：{ type: 'gw:resize', height: 420 }
```

同时注入平台主题色到 iframe CSS 变量，让 HTML 面板跟随主题。

**`data_driven` preset**

在 `game.json` 里声明 Tab 结构和变量映射，平台提供通用渲染引擎，零代码创作：

```jsonc
{
  "preset": "data_driven",
  "tabs": [
    { "id": "profile", "label": "档案", "groups": [{ "title": "基本信息", "prefix": "基本信息" }] },
    { "id": "news", "label": "动态", "type": "news_feed", "var": "足坛动态" }
  ]
}
```

内置 Tab 类型：`kv_groups`、`news_feed`、`relation_map`、`progress_bars`。

---

### 阶段 F（中期）：宏注册表 + WE 能力对齐

**宏注册表设计**（参考 WE P-5C）

当前 `splitSayBlocks` 硬编码只支持 `say` 宏。中期目标：

```typescript
// 注册表机制
macroRegistry.register('say', SayLineRenderer)
macroRegistry.register('card', CardRenderer)
macroRegistry.register('image', InlineImageRenderer)
```

游戏包可声明自定义宏，平台提供注册 API。

**WE 能力对齐路线**

| GW 机制 | WE 对应 | 状态 |
|---------|---------|------|
| `html_panel` + postMessage 桥 | iframe 扩展模式 | 阶段 E |
| `data_driven` preset | 声明式 UI 模式 | 阶段 E |
| `gamePresets/` 注册表 | 插件注册模式（平台开发者） | 已实现 |
| 宏注册表 | `substituteMacros` 注册表 | 阶段 F |
| Agent 槽位（director/verifier/memory） | WE 多 Agent 架构 | 内测后 |

---

### 阶段 G（中期）：Director 浮窗

> 来源：2026-04-18 讨论。

#### 设想

玩家可以打开一个"导演模式"浮窗，直接与 `director` Agent 对话，干预当前剧情走向，而不是通过普通的玩家输入影响故事。

```
┌──────────────────────────────┐
│  🎬 导演模式                  │
│  ─────────────────────────── │
│  > 让这个 NPC 对我更友善      │
│  > 跳过这段，直接进入冲突     │
│  > 增加一个意外事件           │
│                              │
│  [发送给导演]                 │
└──────────────────────────────┘
```

#### 与普通对话的区别

| 维度 | 普通玩家输入 | Director 浮窗 |
|------|------------|--------------|
| 接收方 | 叙事 AI（narrator） | director Agent |
| 作用层 | 剧情内（角色行动） | 剧情外（叙事指令） |
| 对话历史 | 写入 floor | 不写入 floor，只影响下一轮 system prompt |
| 玩家可见性 | 完全可见 | 可选隐藏（不污染叙事流） |

#### 架构需求

- 后端：`director` Agent 槽位（`agent_slots.director`），接收玩家指令，生成一段临时 system prompt 注入下一轮对话
- 前端：`DirectorPanel.tsx`，`FloatingPanel behavior="tool"`，独立输入框，不走 `ChatInput`
- `game.json`：`enabled_agents: ["director"]` 显式启用，默认关闭

#### 实施时机

内测后，依赖后端 Agent 槽位架构稳定。当前阶段（C/D）不做，记录设想。

---

## 四、阶段顺序总览

```
C    前后端验证闭环（必要，当前阶段）
      ↓ 可并行：C.5.0 delta_variable 工具（后端独立子项）
C.5  增量更新 + 渲染稳定性（✅ 前端部分已完成）
      ├─ C.5.0  ✅ delta_variable 工具（后端）
      ├─ C.5.1  changed_variables 字段 + 前端 store 改造（后端变量验证后做）
      ├─ C.5.1.5 ✅ 符号渲染管线（已升级为 remarkSymbols 插件，见 C.7.2）
      ├─ C.5.2  ✅ 正则管线缓存
      ├─ C.5.3  ✅ S/B 类标签路径对齐
      └─ C.5.4  ✅ 宏标签泄露防御
      ↓
C.6  三选一浮窗（ChoicePanel，C.5 完成后）
      ↓
C.7  后端存储层修复 + 符号渲染架构升级
      ├─ C.7.1  ✅ 后端 floor.content 改用 parsed.Narrative（根本修复 <UpdateState> 泄露）
      └─ C.7.2  ✅ remarkSymbols 插件（mdast 层引号着色，可复制，覆盖所有容器）
      ↓
C.8  chat/ 组件解耦重构（功能验证稳定后）
      ↓
C.8.5 ✅ TextPlayPage 解耦（hooks/useTheme + useGameState + useStreamConfig + useTurnHandlers）
      ↓
C.9  S 类宏 prompt 规范（say 三格格式示例，reseed 验证）
      ↓
C.9.5 ✅ game.json 格式清理（ST 残留清除，{{user}} 保留策略确立）
      ↓
D    Light 游玩页（必要）
      ↓
D.5  后端 Token 提取（可选，官方标签稳定后）
      ↓
E    data_driven preset + html_panel postMessage（中期）
      ↓
F    宏注册表 + WE 能力对齐（中期）
      ↓
G    Director 浮窗（内测后，依赖 Agent 槽位）
```

**C.5 升级为必要阶段的原因**：
- 50 轮对话全量重渲染 ~50ms，随对话轮数线性恶化，内测阶段就会暴露
- 宏标签泄露是玩家可见的 bug，必须在内测前修复
- S/B 路径不对齐会导致 say 宏内的样式标签静默失效，创作者无法感知

**D.5（后端 Token 提取）保持可选**：官方标签稳定前做这个会增加维护成本，等 C.5 完成、标签体系稳定后再评估。

---

## 五、参考文档

- `docs/RENDER-SPEC.md` — 官方标签表、主题色变量、渲染管线、组件架构规范
- `docs/CREATOR-QUICKREF.md` — 创作者快速参考（最小配置、标签用法、面板声明）
- `response/comparison/GW_vs_ST_消息生成全流程对比分析.md` — GW vs ST 全流程对比
- `response/comparison/GW前端后端化分析与WE宏系统一致性.md` — 前端后端化分析、WE 宏系统一致性
