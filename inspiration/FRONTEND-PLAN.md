# GW 前端页面布局与功能规格

> 版本：2026-04-12 v2（Phase 3 全部完成后大改版）
> 范围：描述四个 MVP 页面的当前实现状态、布局规格、以及内测前仍需补充的功能缺口。
> 原则：前端不绑定后端内部编排策略；只依赖稳定接口与事件。

---

## 一、当前状态速览

| 页面 | 路由 | 实现状态 |
|---|---|---|
| 公共游戏库 `PublicLibraryPage` | `/` | ✅ 基础完成（筛选 UI、卡片网格）|
| 游戏详情页 `GameDetailPage` | `/games/:slug` | ✅ 基础完成（导入/继续/点赞/评论）|
| Text 游玩页 `TextSessionPage` | `/play/:sessionId` | ✅ 核心完成（SSE 流式/错误气泡/存档管理）|
| 个人游戏库 `MyLibraryPage` | `/library` | ✅ 基础完成（导入/导出/运行配置）|

**游戏可玩**：SSE 流式、错误气泡、regen、suggest、存档管理全部接线完毕。配置 LLM Key 后可正常游玩。

**世界书不可读（已知缺口）**：seed 数据缺 `allow_player_worldbook_view: true`，后端返回空，WorldbookDrawer 显示"暂无词条"。修复方式：在三张游戏的 `.data/games/*/game.json` 的 `config` 里加该字段，重新 seed。

---

## 二、术语定义

| 术语 | 含义 |
|---|---|
| `CatalogEntry` | 公共游戏库中经过审查的公开条目 |
| `LibraryEntry` | 个人游戏库中的条目（来自公共库导入、本地导入）|
| `RuntimeBinding` | 绑定在游戏上的运行配置（base_url / api_key / model_label）|
| `input_placeholder` | 来自游戏配置的输入框占位文本，指导玩家如何输入 |
| `Floor` | 一个对话回合（用户输入 + AI 回复）|
| `WorldbookEntry` | 世界书词条（触发关键词 + 内容）|

---

## 三、页面布局规格

---

### 3.1 公共游戏库页 `PublicLibraryPage`

**路由：** `/`

#### 当前布局

```
顶部导航栏（AppLayout）
  ├─ 左：品牌 Logo / 标题
  └─ 右：公共游戏库 | 我的游戏库 NavLink

筛选区（两行 pill）
  ├─ 第一行：全部 / T / L / R（渲染类型）
  └─ 第二行：全部 / 悬疑 / 恋爱 / 校园 / 奇幻 / 科幻 / 经营 / 恐怖 / 轻松（风格标签）

内容区
  └─ 游戏卡片网格（响应式，2-4 列）
       ├─ 封面图（上方，16:9 或 3:4）
       ├─ 标题（中间）
       ├─ 创作者名（下方小字）
       └─ T/L/R 徽章（右上角）
```

#### 已实现功能

- 类型筛选（T/L/R）+ 风格标签双行 pill
- 游戏卡片网格，封面图 + fallback 渐变
- 点击卡片跳转详情页

#### 内测前缺口

| 缺口 | 优先级 | 说明 |
|---|---|---|
| 空状态文案 | 中 | 筛选无结果时显示友好提示 |
| 加载骨架屏 | 低 | 卡片加载时的占位动画 |
| 分页 / 无限滚动 | 低 | 游戏数量少时不急 |

---

### 3.2 游戏详情页 `GameDetailPage`

**路由：** `/games/:slug`

#### 当前布局

```
HeroSection（顶部英雄区）
  ├─ 封面图（左侧，竖版）
  ├─ 标题 + 创作者 + 风格标签
  └─ 简介 / notes

ActionBar（主操作区）
  ├─ 无存档：[▶ 开始游玩]
  └─ 有存档：[↺ 继续] + [＋ 新存档]

StatsBar（次操作区）
  └─ 点赞 / 投币 / 收藏（横排互动条）

CommentCore（评论区）
  └─ Flow / Thread 模式（由游戏配置决定）
```

#### 已实现功能

- 封面图 + fallback 渐变
- tags 展示（风格标签 pill）
- like_count / myReactions 初始化
- 三态导入按钮（无存档/有存档）
- 导入时调用 `POST /api/play/sessions` → 写 localStorage → 跳转游玩页
- 点赞/收藏 API 接线
- 评论列表（只读，`GET /api/social/games/:id/comments`）

#### 内测前缺口

| 缺口 | 优先级 | 说明 |
|---|---|---|
| 评论发布（需登录）| 中 | 点击发评论触发登录弹窗 |
| 游戏统计数字（play_count）| 低 | 显示游玩次数 |
| 版本历史 | 低 | Phase 4 技术债（slug 非唯一后实现）|

---

### 3.3 Text 游玩页 `TextSessionPage`

**路由：** `/play/:sessionId`

这是 MVP 核心页面，也是与 SillyTavern 对比最直接的页面。

#### 当前布局

```
TextSessionTopBar（顶部栏，从左到右）
  ├─ ← 返回按钮
  ├─ 游戏标题（居中）
  ├─ 📖 世界书抽屉入口
  ├─ 📊 统计抽屉入口
  ├─ 🗂 存档抽屉入口
  └─ ··· 更多菜单（当前模型 / 跳转个人库）

MessageList（中段消息流，react-virtuoso 虚拟化）
  ├─ first_mes（居中斜体边框卡片）
  ├─ 用户消息（右对齐 accent 色气泡）
  ├─ AI 消息（左对齐 surface 色气泡，react-markdown 渲染）
  │    └─ 角色识别模式（avatar_mode='script' 时）：
  │         正则匹配消息开头识别说话角色（如 **温莎**：/ [温莎]）
  │         匹配到 ui_config.characters 中的角色名 → 显示对应头像
  │         匹配不到 → 纯左对齐气泡，无头像
  ├─ 流式输出气泡（StreamingBubble，动画光标）
  ├─ 选项按钮（ChoiceButtonsInline，最后一条 AI 消息后）
  └─ "1/1" swipe 占位（无实际 swipe 功能）

错误气泡（streamError 非空时显示，消息流底部）
  ├─ 红色边框 + 错误文本（humanizeError 翻译）
  ├─ [重试] 按钮（调用 regen）
  └─ [✕] 关闭按钮

ChatInput（底端输入区，从左到右）
  ├─ ☰ 汉堡菜单（AI 帮答 / 重新生成）
  ├─ 输入框（input_placeholder 来自游戏配置）
  └─ 发送/停止按钮（生成中变停止）
```

#### 三个右侧抽屉（vaul）

**WorldbookDrawer（世界书）**
```
标题：世界书
内容：分类标签页 + 词条列表
当前状态：只读
修复：allow_player_worldbook_view 已在 victoria/game.json 中设置为 true ✅
```

**WorldbookDrawer 数据结构（2026-04-12 更新）**

游戏包词条现在携带两个新字段：
- `display_category`：词条所属分类（`区域` / `势力` / `事件` / `角色` / `总纲` / `系统`）
- `player_visible`：是否对玩家展示（系统规则类词条为 `false`，前端过滤不显示）

> **后端响应（2026-04-12）**：`WorldbookEntry` 模型已新增 `player_visible bool`（默认 `true`）和 `display_category string` 字段（`models_creation.go`）。`getWorldbook` 接口已更新，现在返回 `constant`、`player_visible`、`display_category` 三个字段。需重新迁移数据库（`AutoMigrate` 会自动加列）并更新 seed 数据中的词条分类。

Victoria 词条分布：
| 分类 | 数量 | 说明 |
|------|------|------|
| 事件 | 20 | 各区大型/中型/特殊/微型事件 |
| 区域 | 10 | 五区基本信息 + 区域规则 |
| 势力 | 7 | 五大家族 + 两个区域机构 |
| 角色 | 5 | 各区特殊 NPC |
| 总纲 | 1 | 世界观总纲（常驻） |
| 系统 | 1 | 开局引导流程（`player_visible: false`，不展示）|

**推荐的 WorldbookDrawer 表现形式（设计建议）**

ST 的世界书是一个平铺列表，对玩家不友好（全是 YAML 格式的 AI 指令）。GW 有机会做得更好：

```
WorldbookDrawer 布局方案

顶部：分类 Tab 横向滚动
  [全部 44] [区域 10] [势力 7] [事件 20] [角色 5] [总纲 1]
  （系统类自动过滤，不出现在 Tab 里）

词条列表（每项）
  ├─ 标题行：词条名（取 comment 最后一段，如"温莎家族"）
  ├─ 关键词 pill（keys 数组，最多显示 3 个，超出省略）
  ├─ 内容预览（前 80 字，点击展开全文）
  └─ 状态标记：[常驻] 徽章（constant=true 的词条）

展开态（点击词条）
  └─ 全文内容（monospace 或 prose 字体，保留缩进）
```

核心设计原则：
1. **分类 Tab 优先**：玩家想了解"势力"时直接切 Tab，不用滚动全部 44 条
2. **标题取 comment 末段**：`世界观/势力/温莎家族` → 显示"温莎家族"，简洁
3. **关键词 pill**：让玩家知道"说什么词会触发这条"，有游戏感
4. **常驻标记**：`constant=true` 的词条（总纲、区域规则）加 [常驻] 徽章，玩家知道这些始终生效
5. **内容折叠**：词条内容是 YAML 格式的 AI 指令，对玩家来说是"世界设定"，折叠后只看标题+关键词，展开才看全文
6. **不展示 `player_visible: false` 的词条**：系统规则对玩家无意义

**ArchiveDrawer（存档管理）**
```
标题：存档
内容：
  ├─ [＋ 新存档] 按钮（顶部）
  ├─ 存档列表（当前存档左边框高亮）
  │    ├─ 标题（inline 重命名，Enter 确认/Escape 取消）
  │    ├─ 创建时间
  │    ├─ ✏️ 重命名图标
  │    └─ 🗑 删除图标（删当前存档跳回详情页）
  └─ 点击存档跳转 /play/:id
```

**StatsDrawer → GameStatsPanel（重新设计）**

当前实现：侧边抽屉，显示楼层数 + 变量 key/value 列表（5 秒轮询，过滤 `_` 前缀）。

**新方案**：📊 点击后不再打开侧边抽屉，改为在消息流顶部展开 inline overlay 面板，分两层：

```
GameStatsPanel（消息流顶部 inline overlay）
  ├─ 游戏变量区（创作者定义的游戏状态，玩家可见）
  │    ├─ 读取 game.ui_config.display_vars 决定展示哪些变量
  │    ├─ 变量以卡片形式展示（非 key:value 列表）
  │    │    Victoria 示例：
  │    │      存活天数 12天  当前位置 中区
  │    │      金币 ◆240  银币 ◆18  铜币 ◆5
  │    │      温莎声望 ████░░ 40  罗斯柴尔德声望 ██░░░░ 20 …
  │    ├─ 数据来自 GET /sessions/:id/variables（5 秒轮询）
  │    └─ 点击面板外部或再次点击📊关闭
  │
  └─ [更多 ▸] 按钮 → 弹出 TechStatsModal

TechStatsModal（弹出层，面向高级用户）
  ├─ 楼层数 / 当前模型标签
  ├─ 最近一次 AI 回复时长（ms）
  ├─ context 窗口用量（已用 / 最大，需后端返回 token_count）
  ├─ Memory 面板（GET /sessions/:id/memories，后端已就绪 A-23）
  └─ Prompt 快照入口（GET /sessions/:id/floors/:fid/snapshot，后端已就绪 A-24）
```

**设计理由**：
- 游戏变量是创作者想让玩家感知的游戏状态，inline overlay 叠在消息流上方，不离开游戏视角
- 技术数据是调试信息，放在"更多"弹层不干扰普通玩家
- Victoria 有明确的 `display_vars` 配置，可直接读取渲染，无需等 Phase 4

**后端依赖**：
- `GET /sessions/:id/variables` ✅ 已就绪
- `GET /sessions/:id/memories` ✅ 已就绪（A-23）
- `GET /sessions/:id/floors/:fid/snapshot` ✅ 已就绪（A-24）
- token_count 字段 🔜 需后端在 SSE 事件中返回

#### 已实现功能

- SSE 流式输出（`@microsoft/fetch-event-source`）
- RuntimeConfig 传入 streamOpts（api_key / base_url / model）
- 错误气泡（humanizeError 翻译 401/403/429/500/连接中断）
- regen（重新生成）
- suggest（AI 帮答，填入输入框）
- 存档管理（新建/重命名/删除）
- 变量面板（5 秒轮询）
- react-markdown + remark-gfm 渲染
- 主题色注入（color_scheme → CSS 变量）
- 选项按钮（ChoiceButtonsInline）

#### 内测前缺口（功能层面，非美化）

| 缺口 | 优先级 | 对标 ST | 说明 |
|---|---|---|---|
| **WorldbookDrawer 分类 Tab 渲染** | 🔴 必须 | ➕ GW 超越 ST | 接入 display_category + player_visible，分 Tab 展示，过滤系统词条 |
| **GameStatsPanel（inline overlay）** | 🔴 必须 | ➕ GW 超越 ST | 消息流顶部展开变量面板，替换当前侧边抽屉方案 |
| **TechStatsModal（更多弹层）** | 🟡 高 | ✅ ST 支持 | 楼层数/token/回复时长/模型/Prompt 快照入口 |
| **停止生成后保留已输出内容** | 🔴 必须 | ✅ ST 支持 | 当前停止后 buffer 清空，已输出内容丢失 |
| **消息编辑**（用户消息 inline 编辑）| 🟡 高 | ✅ ST 支持 | 点击用户消息可编辑并重新提交（需后端 PATCH /floors/:fid）|
| **楼层删除**（删除单条消息）| 🟡 高 | ✅ ST 支持 | 长按或右键删除某一楼层（需后端 DELETE /floors/:fid）|
| **记忆查看面板**（Memory）| 🟡 高 | ✅ ST 支持 | 接入 `GET /sessions/:id/memories`（后端已就绪 A-23），放入 TechStatsModal 或新 Tab |
| **角色头像**（消息气泡旁）| 🟠 中 | ✅ ST 支持 | 从 game.cover_url 或 materials 取头像 |
| **背景图**（游玩页背景）| 🟠 中 | ✅ ST 支持 | 从 game.ui_config.bg_url 或 materials 取背景 |
| **消息复制按钮** | 🟠 中 | ✅ ST 支持 | hover 时显示复制图标 |
| **Swipe 多页**（同一楼层多个候选）| 🟠 中 | ✅ ST 核心功能 | 当前只有"1/1"占位；需后端支持多候选存储 |
| **世界书可编辑**（玩家私有副本）| 🟠 中 | ✅ ST 支持 | Phase 4，后端已就绪（A-20）|
| **输入历史**（↑ 键回调上一条）| 🟡 低 | ✅ ST 支持 | 本地 localStorage 存最近 N 条输入 |

---

### 3.4 个人游戏库页 `MyLibraryPage`

**路由：** `/library`

#### 当前布局

```
已导入游戏区
  ├─ 标题 + [导入本地游戏包] 按钮（右上角）
  ├─ 导入错误提示（红色小字）
  └─ 游戏列表（每项）
       ├─ 封面图（左侧缩略图）
       ├─ 标题 + 来源类型 + 导入日期
       ├─ [导出] 按钮（触发 GET /api/create/templates/:id/export 下载）
       └─ [移除] 按钮（从 localStorage 删除）

运行配置区（当前在页面底部，待迁移）
  ├─ API Base URL 输入框
  ├─ API Key 输入框（password 类型）
  ├─ 模型标签输入框
  └─ [保存] 按钮（写入 localStorage）
```

#### 已实现功能

- 游戏列表（来自 `gw_library` localStorage）
- 本地导入（.json / .png）
- PNG 导入：multipart 上传 `POST /api/create/cards/import`，解包 gw_game 类型
- 游戏包导出（触发浏览器下载）
- 移除游戏（从 localStorage 删除）
- 运行配置（base_url / api_key / model_label，存 `gw_runtime_config`）

#### 内测前缺口

| 缺口 | 优先级 | 说明 |
|---|---|---|
| **点击即继续游玩** | 🔴 必须 | 点击游戏条目直接进入 Text 游玩页（最近存档），无需额外按钮 |
| **未游玩过的默认游玩页** | 🔴 必须 | 无存档时自动创建新存档并进入，或显示"开始游玩"引导界面 |
| **LLM 配置迁移到 ···** | 🔴 必须 | 运行配置从页面底部移到右上角 `···` 菜单内的抽屉/弹层，页面更干净 |
| **列表视觉打磨** | 🟡 高 | 保持列表形式，但封面缩略图更大、间距更舒适、hover 效果更明显 |
| **公共游戏库入口** | 🟠 中 | 未来：已导入游戏可跳回公共游戏库对应详情页 |
| **存档列表预览** | 🟠 中 | 点击游戏条目展开存档列表（或跳详情页），当前只能从详情页进入存档 |
| **ST 角色卡 PNG 导入游玩** | 🟠 中 | 当前只支持 gw_game 类型 PNG；ST chara/ccv3 类型需后端支持 card_id 游玩 |
| **多 Provider 配置 UI** | 🟠 中 | Cherry Studio 风格，接入 `LLMProfile` CRUD（后端已就绪）|

---

## 四、内测前实施计划（美化前必须完成）

> 按实施顺序排列。后端缺口单独列出，稍后交后端补充。

### 第一批 ✅ 全部完成（2026-04-12）

原第一批（阻塞内测）+ 原第二批已完成项合并。

| # | 任务 | 文件 | 状态 |
|---|---|---|---|
| F1 | **WorldbookDrawer 重写**：分类 Tab + player_visible 过滤 + 词条折叠展开 | `TextSessionTopBar.tsx` | ✅ |
| F2 | **GameStatsPanel**：消息流顶部 inline overlay，读取 display_vars 渲染变量卡片 | `TextSessionPage.tsx` + `GameStatsPanel.tsx` | ✅ |
| F3 | **TechStatsModal**：楼层数/模型/Memory Tab/Prompt 快照入口 | `TechStatsModal.tsx` | ✅ |
| F4 | **停止生成保留内容**：`stopStream()` 保留 buffer 为 pendingMessage，floors 刷新后自动清除 | `stores/stream.ts` + `TextSessionPage.tsx` + `ChatInput.tsx` | ✅ |
| F5 | **消息编辑**：用户消息 inline 编辑（Enter 确认/Escape 取消），调用 `PATCH /floors/:fid` | `MessageBubble.tsx` | ✅ |
| F6 | **楼层删除**：`DELETE /floors/:fid`，refetch floors | `MessageBubble.tsx` | ✅ |
| F7 | **记忆查看**：TechStatsModal Memory Tab，接入 `GET /sessions/:id/memories` | `TechStatsModal.tsx` | ✅ |
| F10 | **消息复制按钮** + Toast 反馈 | `MessageBubble.tsx` | ✅ |

**累计变更说明**：
- `UIConfig` 新增 `bg_url`、`display_vars`、`narrative_tags`、`floating_panels` 字段（`types.ts`）
- `WorldbookEntry` 新增 `constant`、`player_visible`、`display_category` 字段（`types.ts`）
- `sessionsApi` 新增 `memories(id)`、`editFloor()`、`deleteFloor()` 方法（`sessions.ts`）
- `useStreamStore` 新增 `stopStream()`、`pendingMessage`、`clearPending()`（`stores/stream.ts`）
- `MessageBubble` 新增 `MetaLine` 元数据行（时间戳/序号/操作按钮），替换旧 hover ActionBar
- Toast 系统（sonner）：复制反馈、SSE 错误、fork 确认全部迁移，删除旧 inline 实现

---

### 第二批（待实现）

#### 渲染体系补全

| # | 任务 | 文件 | 后端依赖 | 说明 |
|---|---|---|---|---|
| F9 | **背景图接入** | `TextPlayPage.tsx` | ✅ 无 | `ui_config.bg_url` → 背景层 + TopBar/ChatInput backdrop-blur；详见 RENDER-SPEC §5 |
| F21 | **B 类内联标签 CSS 映射** | `globals.css` / `ProseComponents` | ✅ 无 | 新增 `gw-em-gold`（金色）、`gw-em-rep-up/down`（声望涨落）、`gw-em-stat-up/down`（能力值变化）class 样式；供维多利亚/绿茵好莱坞等卡使用 |
| F22 | **StatsPanel 进度条扩展** | `panels/StatsPanel.tsx` | ✅ 无 | 当前只对 `label.includes('生命')` 渲染进度条；扩展为：`group === '核心能力'` 且值为 0–100 时自动渲染进度条（绿茵好莱坞球员能力值）|
| F23 | **`html_panel` preset（iframe 沙箱）** | `panels/PanelsHost.tsx` + 新建 `HtmlPanelFrame.tsx` | ✅ 无 | 详见附录"美高之路 HTML 浮窗改造专项"；`done` 事件后提取 HTML 块，注入变量 JSON，`<iframe srcdoc>` 渲染；`FloatingPanelDecl` 新增 `preset: 'html_panel'` |
| F24 | **`splitHtmlPanel()` 工具函数** | `utils/tokenExtract.ts` 或新文件 | ✅ 无 | 从消息内容中分离叙事文本和 HTML 块（正则匹配 `<!DOCTYPE html>[\s\S]*?<\/html>`）；叙事部分正常渲染，HTML 块不在气泡内显示 |

#### WE 引擎能力接入

| # | 任务 | 文件 | 后端依赖 | 说明 |
|---|---|---|---|---|
| F25 | **Phase SSE 阶段推送** | `api/sse.ts` + `TextPlayPage.tsx` | 🔜 P-4H | 后端新增 `phase` 事件（`preparing/director_running/generating/verifying`）；前端在 StreamingBubble 下方显示阶段提示文字，替代当前无差别的"生成中…" |
| F26 | **Preflight 选项预测** | `TextPlayPage.tsx` + `ChatInput.tsx` | 🔜 P-4L | 后端 `PlayTurn` 完成后异步写入 `predicted_choices` 变量；前端轮询 `/variables` 或通过 SSE 接收，在 ChatInput 上方渲染预测选项行（淡入，用户自由输入时收起）|
| F27 | **变量门控世界书可视化** | `WorldbookDrawer` | ✅ 已就绪 | 世界书词条已支持 `var:key=value` 门控；前端在词条展开态显示"触发条件"标签（如"当 温莎声望 ≥ 50 时激活"），让玩家理解词条何时生效 |
| F28 | **记忆阶段标签展示** | `TechStatsModal` Memory Tab | ✅ 已就绪 | Memory 已支持 `stage_tags`；Memory Tab 展示每条记忆的 `stage_tags`，让玩家/创作者了解记忆在哪个游戏阶段注入 |

#### 消息操作扩展（第三批，内测后）

| # | 任务 | 文件 | 后端依赖 | 说明 |
|---|---|---|---|---|
| F8 | **角色识别 + 头像** | `MessageBubble.tsx` | ✅ 无 | `avatar_mode='script'` 时正则匹配角色名 → 显示头像 |
| F11 | **Swipe 多页** | `MessageList.tsx` | 🔴 需后端 | 同一楼层多候选回复，左右滑动切换，计数器 `2/3` |
| F12 | **世界书可编辑** | `TextSessionTopBar.tsx` | ✅ 已就绪 | 玩家私有副本编辑（A-20）|
| F13 | **多 Provider 配置 UI** | `MyLibraryPage.tsx` | ✅ 已就绪 | Cherry Studio 风格，LLMProfile CRUD |
| F14 | **输入历史**（↑ 键）| `ChatInput.tsx` | ✅ 无 | localStorage 存最近 N 条输入，↑/↓ 键切换 |
| F16 | **AI 消息编辑** | `MessageBubble.tsx` | 🔴 需后端 | 后端扩展 PATCH 支持 `role=assistant`；前端 `canEdit` 判断已预留 |
| F17 | **消息翻译** | `MessageBubble.tsx` | 🔴 需后端 | ··· 菜单内"翻译"，结果显示在消息下方折叠区 |
| F18 | **消息朗读（TTS）** | `MessageBubble.tsx` | 🟡 可选 | Web Speech API 或后端 TTS |
| F19 | **消息书签** | `MessageBubble.tsx` | 🔴 需后端 | 标记重要消息，TechStatsModal 可查 |
| F20 | **消息分支** | `MessageList.tsx` | 🔴 需后端 | 从某条消息创建分支对话 |

F16–F20 共享 `MoreMenu` 扩展点，前端结构已就绪，不需要重构。

```
目标 ··· 菜单（第三批完成后）：
  ├─ 复制 ✅
  ├─ 编辑（F16，AI 消息）
  ├─ 翻译（F17）
  ├─ 朗读（F18）
  ├─ 书签（F19）
  ├─ 分支（F20）
  └─ 删除 ✅
```

#### 关于五类标签和 HTML 的演进方向

当前的五类标签体系（A 类块级 / B 类内联 / C 类状态 / D 类选项 / E 类系统）和 HTML 浮窗方案是**暂行设计**，在 VN 渲染组件完整实现后需要重新评估：

- **A 类块级标签**（`<match-result>`、`<news-brief>`、`<sys-event>`）：当前用正则管线转换为 `gw-*` CSS 类渲染。VN 渲染器完成后，这些块级内容可以升级为独立的 React 组件（卡片/面板），而不只是 CSS 样式差异。迁移路径：正则规则不变，只改 replacement 输出的 HTML 结构。
- **B 类内联标签**（`<em class="gold">` 等）：token 消耗偏高，中期可迁移到更短的参数化语法（`{g:文字}`），只需更新 `ALICE_CORE_RULES` 中的 pattern，组件层零改动。
- **HTML 浮窗（`html_panel`）**：`<iframe srcdoc>` 是过渡方案，适合直接复用原卡 HTML。长期方向是创作者用 `phone_status` / `character_sheet` 等声明式 preset 替代手写 HTML，引擎负责渲染，创作者只声明数据结构。
- **C 类状态标签**（`<UpdateState>`）：已由引擎 parser 提取并剥离，不出现在叙事文本中，这部分设计稳定，不需要改变。
- **D 类选项标签**（`[choice|A|B]`）：VN 渲染器完成后，选项渲染会从当前的 `ChoiceButtonsInline` 升级为 VN 风格的选项覆盖层，标签格式本身不变。

---

### 阶段 2.5：内测前细节打磨（视觉 + 体验）

> 这批任务不阻塞功能，但直接影响内测玩家的第一印象。内测玩家应当被当作酒馆老玩家对待——他们对 UI 质量有判断力，粗糙的界面会直接影响对产品的信任感。

#### 2.5-A：个人游戏库重构 ✅ 完成（2026-04-12）

**问题**：当前个人游戏库是简陋的列表 + 底部配置表单，没有直接进入游玩页的路径，LLM 配置占据大量页面空间。

**设计决策**：保持列表形式（不改卡片网格），列表更适合个人库的"管理"属性——玩家需要快速区分和记忆自己的游戏，列表的信息密度更高。

**目标布局**：

```
顶部栏
  ├─ 左：品牌 Logo / 标题
  └─ 右：[导入本地游戏包] + [···] 菜单
                                    └─ LLM 配置（Sheet 抽屉）
                                    └─ 关于 / 帮助

游戏列表（每项，点击即进入游玩页）
  ├─ 封面缩略图（左侧，稍大于当前，圆角）
  ├─ 标题 + 来源标签（catalog / local）
  ├─ 最近游玩时间（小字，如"3 小时前"）
  ├─ 右侧：[导出] [移除] 图标按钮（hover 显示）
  └─ hover 效果：左边框 accent 色高亮

空状态
  └─ 居中插画 + "还没有游戏" + [去公共游戏库逛逛 →] 按钮 + [导入本地游戏包] 按钮
```

**点击即继续游玩逻辑**：
```
点击游戏条目
  → GET /play/sessions?game_id=:id（取列表，按 updated_at 降序）
  → 有存档：跳转 /play/:sessionId（最新一条）
  → 无存档：自动 POST /play/sessions 创建新存档 → 跳转 /play/:sessionId
```

无需额外的"继续游玩"按钮，点击本身就是继续游玩。

**LLM 配置迁移**：从页面底部移到 `···` 菜单内的 Sheet 抽屉，字段不变（base_url / api_key / model_label），视觉更干净。

**实现文件**：`src/pages/my-library/MyLibraryPage.tsx`（重写）

**已完成变更**：
- 页面全面重写，移除底部 LLM 配置表单
- 点击游戏条目直接进入游玩页：`sessionsApi.list()` 取最新存档 → 跳转 `/play/:id`；无存档时自动 `sessionsApi.create()` 创建
- LLM 配置迁移到右上角 `···` 菜单 → vaul `Drawer`（右侧抽屉），字段不变
- 游戏列表视觉升级：更大的封面缩略图（w-16 h-12）、圆角卡片、hover 时 accent 边框
- 来源标签（本地 / 公共库）pill 徽章
- 最近游玩时间（`timeAgo` 相对时间，如"3 小时前游玩"）
- 导出/移除按钮改为 hover 显示的图标按钮（Download / Trash2）
- 导航中加载状态（Loader2 旋转动画）
- 空状态引导："还没有游戏" + [去公共游戏库逛逛] + [导入本地游戏包]
- `updateLastPlayed()` 工具函数，点击游玩时更新 localStorage 时间戳

---

#### 2.5-B：消息元数据行（时间戳 + 回合序号 + 操作按钮）✅ 完成（2026-04-12）

**对标 v0-dev**：v0-dev 在每条消息下方显示一行元数据，格式为 `04/12 15:53 | #3 | ✏️ ···`，10px 字号，opacity 40%，与操作按钮并列。

**对标 ST**：ST 的元数据分散在多处——时间戳在角色名旁（`.timestamp`），消息 ID 在头像下方（`.mesIDDisplay`），操作按钮在消息底部（`.mes_buttons`）。ST 的操作按钮默认 opacity 0.3，hover 时 1.0。

**GW 方案**（采用 v0-dev 的统一行方案，更简洁）：

```
每条消息内容下方，单行元数据：
  ┌─────────────────────────────────────────────────────┐
  │ 04/12 15:53 | #3 | ✏️ ···                          │
  └─────────────────────────────────────────────────────┘

布局：flex items-center gap-1.5 text-[10px]
颜色：var(--color-text-muted)
透明度：时间/序号 opacity-40，分隔符 opacity-25
hover 整行：opacity 提升到 60%
```

**字段说明**：
- 时间：`MM/DD HH:mm` 格式，来自 `Floor.created_at`
- 回合序号：`#N`，N = floor 在 floors 数组中的索引 + 1（每个 floor 是一个回合）
- 操作按钮：
  - ✏️ 画笔（编辑，仅用户消息）— 替代当前 hover 操作栏的编辑按钮
  - ··· 更多菜单 — 包含：复制、删除、（未来：翻译、朗读、书签）
- 按钮样式：h-4 w-4，opacity-40，hover 时 opacity-80，无背景

**与当前实现的差异**：
- 当前：操作栏在消息上方，hover 时整行出现（ActionBar 组件）
- 目标：操作按钮移到消息下方元数据行内，始终可见（低 opacity），不再需要 hover 才出现的 ActionBar
- 好处：操作入口始终可见，不需要"发现" hover 才有按钮；元数据行提供时间和回合上下文

**first_mes 的元数据行**：不显示。first_mes 是游戏开场白，不属于任何回合，不需要时间戳和操作按钮。

**实现文件**：`src/components/chat/MessageBubble.tsx`（重写操作栏为元数据行）

**已完成变更**：
- 移除旧的 hover `ActionBar` 组件，替换为始终可见的 `MetaLine` 元数据行
- 元数据行格式：`04/12 15:53 | #3 | ✏️ ···`，10px 字号，opacity-40，hover 时 opacity-60
- 时间戳：`MM/DD HH:mm` 格式，来自 `Floor.created_at`
- 回合序号：`#N`，使用 `Floor.seq`
- 编辑按钮（✏️ Pencil）：仅用户消息显示，点击进入 inline 编辑
- ··· 更多菜单（`MoreMenu` 组件）：弹出菜单包含"复制"和"删除"，预留后续扩展位
- first_mes 不显示元数据行
- `MessageList` 新增 `floorSeq` 和 `createdAt` 传递给 `MessageBubble`
- `MessageBubble` Props 新增 `createdAt?: string` 和 `turnNumber?: number`

---

#### 2.5-C：first_mes 开场呈现 ✅ 完成（2026-04-12）

**当前实现**：居中斜体边框卡片，`w-[88%]`，`border: 1px solid var(--color-border)`，`text-center`。

**ST 的做法**：first_mes 没有特殊样式，和普通 AI 消息完全一样（左侧头像 + 角色名 + 消息文本）。支持 swipe 切换 alternate_greetings。

**v0-dev 的做法**：first_mes 也没有特殊样式，和普通 AI 消息一样的 prose 排版。

**问题**：当前的居中斜体设计在短文本时效果不错（像一段引言），但 Victoria 的 first_mes 是一段较长的叙事文本（几百字），居中排版 + 斜体在长文本下阅读体验差。

**方案 C 被否决**：分隔线 + "开场" 标签会弱化沉浸感，像系统 UI 而非故事入口。

**设计方向**：first_mes 是玩家进入游戏世界的第一瞬间，应该让玩家感觉"我已经在故事里了"，而不是"系统正在给我展示一段文本"。未来创作者需要亲自设计开场体验（通过 `ui_config` 声明），但当前需要一个默认方案，要求：沉浸、普适、不依赖创作者额外配置。

**默认开场方案（沉浸式渐入）**：

```
消息流顶部，first_mes 渲染：

  （上方留白，约 40-60px，让内容不贴顶）

  first_mes 内容
    ├─ 使用标准 ProseComponents 渲染（左对齐，非斜体，非居中）
    ├─ 与后续 AI 消息相同的字体和行高
    ├─ 首段文字 opacity 从 0.6 渐变到 1.0（CSS gradient mask 或 animate-fade-in）
    ├─ 整体 padding 比普通消息稍大（px-6 而非 px-4）
    └─ 不显示元数据行（无时间戳、无操作按钮）

  （下方一段自然间距后，进入正常消息流）
```

**视觉效果**：first_mes 像是"故事自然开始了"，没有任何 UI 元素提醒玩家这是一条特殊消息。唯一的区别是首段有轻微的渐入效果（像翻开书的第一页），以及稍大的内边距给予呼吸感。

**创作者自定义开场（未来，`ui_config` 扩展）**：
```typescript
// 未来 ui_config 新增
first_mes_style?: 'default' | 'cinematic' | 'letter' | 'custom'
// default：上述渐入方案
// cinematic：全屏背景 + 文字逐行显示（需动画系统）
// letter：信件/羊皮纸样式卡片
// custom：创作者提供自定义 CSS class
```

这些留到创作者工具成熟后再实现，当前只做 `default`。

**实现文件**：`src/components/chat/MessageBubble.tsx`（`isFirstMes` 分支重写）

**已完成变更**：
- 移除居中斜体边框卡片，改为沉浸式渐入
- 使用标准 `ProseComponents` 渲染（左对齐，非斜体，非居中）
- 稍大内边距（`px-6 pt-10 pb-4`）给予呼吸感
- CSS 动画 `gw-fade-in`：0.8s ease-out，从 opacity 0 + translateY(8px) 渐入
- 首段文字 CSS mask gradient：顶部 opacity 0.5 渐变到 1.0，像翻开书的第一页
- 不显示元数据行（无时间戳、无操作按钮）
- `globals.css` 新增 `.gw-first-mes` 动画和 mask 规则

---

#### 2.5-D：个人游戏库到游玩页的路径

**原始设想**：从个人游戏库点击游戏后，不直接进入 Text 游玩页，而是先进入一个"默认游玩准备界面"（类似 ST 的 Welcome Screen），展示游戏信息、存档选择等。

**分析后结论：不需要单独的准备界面。**

理由：
1. 当前 2.5-A 已实现"点击即继续游玩"——有存档直接进入最近存档，无存档自动创建。路径已经是最短的。
2. ST 的 Welcome Screen 是因为 ST 没有"游戏库"概念，需要一个地方展示最近聊天。GW 有个人游戏库承担这个角色。
3. 如果玩家想管理存档（新建/切换/删除），Text 游玩页的 TopBar 🗂 存档抽屉已经提供了这个能力。
4. 额外加一层"准备界面"反而增加了进入游戏的摩擦。

**首次进入的体验**（无存档时）：
```
个人游戏库点击游戏
  → 自动 POST /play/sessions 创建存档
  → 跳转 /play/:sessionId
  → Text 游玩页加载，floors 只有 first_mes
  → first_mes 以沉浸式渐入方式呈现（2.5-C）
  → ChatInput placeholder 引导玩家输入（来自 ui_config.input_placeholder）
  → 玩家发送第一条消息，游戏正式开始
```

`input_placeholder` 本身就是引导文字（如"输入你的行动…"），不需要额外的引导提示。

**如果未来需要更丰富的首次体验**：可以在 `ui_config` 新增 `welcome_screen` 字段，创作者声明是否在首次进入时显示一个全屏欢迎画面（游戏封面 + 简介 + [开始冒险] 按钮）。但这属于创作者工具范畴，不是内测前必须的。

---

#### 2.5-E：公共游戏库视觉升级 ✅ 完成（2026-04-12）

**问题**：当前卡片过于简陋，封面图比例不统一，缺少悬停效果，整体像一个功能原型而非产品。

**目标**：
```
游戏卡片（升级）
  ├─ 封面图：统一 2:3 竖版比例，object-cover，圆角 12px
  ├─ 悬停效果：封面图轻微放大（scale-105）+ 底部渐变遮罩显示简介
  ├─ 标题：封面下方，font-medium，1 行截断
  ├─ 创作者名：小字，text-muted
  ├─ 类型徽章：右上角 T/L/R，半透明背景
  └─ 底部互动数字：❤ 点赞数（小字，右下角）
```

**页面整体**：
- 顶部导航加品牌感（Logo 字体/图标）
- 筛选 pill 改为更有质感的样式（active 状态更明显）
- 网格间距和卡片阴影调整
- 空状态文案（筛选无结果时）

**实现文件**：`src/pages/public-library/PublicLibraryPage.tsx`、`src/components/game/GameCard.tsx`（如有）

**已完成变更**：
- `GameCard` 全面重写：封面改为 2:3 竖版比例（`aspect-[2/3]`），hover 时 `scale-105` 放大
- hover 遮罩：底部渐变 `from-black/70` 显示简介（`line-clamp-3`）
- 类型徽章：右上角半透明背景 + `backdrop-blur`
- 信息区：标题 + 作者名（author_id 前 8 位）+ 点赞数（Heart 图标）
- fallback 渐变色调降低饱和度，更沉稳
- `PublicLibraryPage` 升级：类型 pill 改为 `text-xs font-medium`，风格标签改为描边样式（非 active 时 `border: 1px solid var(--color-border)`），hover 时边框变 accent
- 网格增加 `xl:grid-cols-5` 响应式列
- 空状态文案（筛选无结果 / 暂无游戏）
- 加载更多按钮改为描边样式，hover 时边框变 accent

---

#### 2.5-F：Text 游玩页细节打磨 ✅ 完成（2026-04-12）

**TopBar 对比 v0-dev**：

v0-dev TopBar 包含：← 返回 | 标题（居中）| 📖世界书 | 📊统计 | 🗂存档 | ··· 菜单（当前模型 + 跳转库）。
GW 当前 TopBar 完全一致，已实现所有 v0-dev 的 TopBar 功能。无需额外制作"非玩家阅读的复杂数据按钮"——📊 已经触发 GameStatsPanel（玩家数据），"更多 ▸" 已经进入 TechStatsModal（技术数据）。

**消息流**：
- prose 模式 AI 消息段落间距微调
- 流式输出光标保持当前 `animate-pulse`

**TopBar**：
- 游戏标题截断处理（长标题 ellipsis）
- `···` 菜单加"自定义背景"入口（F9-B 实现后）

**ChatInput**：
- 输入框 focus 时边框高亮（`onFocus` → `borderColor: accent`，`onBlur` → 恢复）
- 发送按钮 disabled 状态（输入为空且非 streaming 时 `disabled`，已有 `opacity-50`）
- 底部栏加 `backgroundColor: var(--color-bg)` 确保背景图模式下不透明

**TopBar**：
- 标题加 `min-w-0` 确保 flex 布局下 `truncate` 生效
- TopBar 背景改用 `var(--color-topbar-bg)` CSS 变量（支持半透明，为 F9-B 背景图做准备）
- 返回按钮改用 CSS 变量色（`var(--color-text-muted)` → hover `var(--color-text)`）

---

#### 2.5-G：F9-B 背景图接入

详见 [F9-RENDER-PLAN.md](./F9-RENDER-PLAN.md) 第五节。

**实现文件**：
- `src/pages/play/TextSessionPage.tsx`：背景层 + 内容层布局重构
- `src/components/play/TextSessionTopBar.tsx`：backdrop-blur
- `src/components/chat/ChatInput.tsx`：backdrop-blur

**前置条件**：用户先设计背景图放入 `.data/backgrounds/`，游戏包 `bg_url` 指向对应路径。

---

#### 2.5-H：F9-C 主题字体引入 ✅ 完成（2026-04-12）

gothic 主题需要 Crimson Text，soft-fantasy 需要 Quicksand，default-dark 使用 Inter。在 `index.html` 引入 Google Fonts（含 preconnect）：

```html
<link href="https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Quicksand:wght@400;500;600&display=swap" rel="stylesheet">
```

**实现文件**：`GameWorkshop/index.html`

---

#### 2.5 优先级排序

| 优先级 | 任务 | 状态 | 理由 |
|---|---|---|---|
| 🔴 P0 | 2.5-A 个人游戏库重构 | ✅ 完成 | 玩家进入游戏的主路径 |
| 🔴 P0 | 2.5-B 消息元数据行 | ✅ 完成 | 信息密度和操作入口 |
| 🔴 P0 | 2.5-C first_mes 开场 | ✅ 完成 | 沉浸式渐入，无 UI 标签 |
| ~~🔴 P0~~ | ~~2.5-D 未游玩默认页~~ | 不需要 | 2.5-A 已实现自动创建存档，input_placeholder 已提供引导 |
| 🟡 P1 | 2.5-E 公共库视觉升级 | ✅ 完成 | 2:3 竖版封面 + hover 遮罩 + 描边 pill |
| 🟡 P1 | 2.5-G F9-B 背景图 | 待实现 | 氛围感核心，等用户设计好背景图后立即实现 |
| 🟠 P2 | 2.5-F 游玩页细节 | ✅ 完成 | ChatInput focus + TopBar 变量色 |
| 🟠 P2 | 2.5-H 主题字体 | ✅ 完成 | Crimson Text + Quicksand + Inter |

---

#### ST vs GW 消息操作对比

| 功能 | SillyTavern | v0-dev | GW（当前）|
|---|---|---|---|
| 时间戳 | 角色名旁 `.timestamp`，可配置显示 | 消息下方 `04/12 15:53` | ✅ 消息下方 `MM/DD HH:mm` |
| 消息 ID | 头像下方 `#0` `#1` | 消息下方 `#3` | ✅ 消息下方 `#N`（Floor.seq）|
| 编辑（用户）| 铅笔按钮 → textarea 替换 | 铅笔按钮 inline | ✅ 铅笔按钮 inline |
| 编辑（AI）| 铅笔按钮 → textarea 替换 | 铅笔按钮 inline | 🔜 F16（需后端扩展 PATCH 支持 assistant）|
| 删除 | 编辑模式内垃圾桶 | ··· 菜单内 | ✅ ··· 菜单内 |
| 复制 | 编辑模式内 / 扩展菜单 | ··· 菜单内 | ✅ ··· 菜单内 |
| 翻译 | 扩展菜单 `.mes_translate` | ··· 菜单内 | 🔜 F17 ··· 菜单内 |
| 朗读 | 扩展菜单 `.mes_narrate` | ··· 菜单内 | 🔜 F18 ··· 菜单内 |
| 书签 | 独立按钮 `.mes_bookmark` | ··· 菜单内 | 🔜 F19 ··· 菜单内 |
| 分支 | `.mes_create_branch` | 无 | 🔜 F20 ··· 菜单内 |
| Swipe | 消息底部左右箭头 + 计数器 | 无 | 🔜 F11（第三批）|
| 按钮可见性 | 默认 opacity 0.3，hover 1.0 | 默认 opacity 0.4，hover 0.8 | ✅ 默认 opacity 0.4，hover 0.8 |
| first_mes | 无特殊样式，支持 swipe | 无特殊样式 | 居中斜体卡片（2.5-C 待斟酌）|

---

### 后端缺口清单（前三批）

第一批无后端依赖，可立即开始。第二批需要后端先补充以下接口：

```
# 第二批前置（F5/F6）
PATCH  /api/play/sessions/:id/floors/:fid
  body: { content: string }
  说明：编辑楼层内容（仅允许编辑 role=user 的楼层）

DELETE /api/play/sessions/:id/floors/:fid
  说明：删除单个楼层（同时删除该楼层所有 MessagePage，session.floor_count 减 1）

# TechStatsModal token 计数（可选，内测后）
SSE 事件新增 token_count 字段
  或 GET /api/play/sessions/:id/stats 返回 { token_used, token_max, last_latency_ms }
```

> **后端响应（2026-04-12）**：`PATCH /api/play/sessions/:id/floors/:fid` 和 `DELETE /api/play/sessions/:id/floors/:fid` 已实现（`engine/api/routes.go` + `engine_methods.go`）。PATCH 编辑激活页中第一条 `role=user` 消息；DELETE 删除楼层及其所有 MessagePage，并将 `session.floor_count` 减 1。F5/F6 前端实现可直接开始。

---

## 五、F9 渲染体系（独立文档）

详见 [F9-RENDER-PLAN.md](./F9-RENDER-PLAN.md)。

**核心决策摘要**：
- 消息渲染支持双模式：`prose`（默认，非气泡，适合叙事）和 `bubble`（气泡，适合对话）
- 由创作者在游戏包 `ui_config.message_style` 里声明，内测默认 `prose`
- CSS 变量体系完整覆盖所有视觉元素，组件内无硬编码颜色
- 三套内置主题：`default-dark` / `gothic` / `soft-fantasy`，`ui_config.theme` 切换
- 背景图通过 `ui_config.bg_url` 声明，TopBar/ChatInput 自动 backdrop-blur

**实施顺序**：F9-A（变量体系 + prose 模式）→ F9-B（背景图）→ F9-C（主题预设完善）

## 六、创作者渲染体系与全局风格扩展

### ST 的做法与 GW 的差异

ST 把前端渲染完全交给了"美化风格插件"（CSS 主题 + JS 扩展），任何人都可以写插件改变整个界面。这带来了极高的自由度，但也带来了混乱：插件质量参差不齐，玩家需要自己安装管理，创作者无法保证玩家看到的和自己设计的一致。

**GW 的方向**：渲染权交给创作者，而不是玩家或插件市场。创作者在游戏包里声明渲染规则，前端解析执行。玩家打开游戏时看到的就是创作者设计的样子，无需安装任何插件。

### 当前已有的创作者渲染字段（`ui_config`）

```typescript
color_scheme: { bg, text, accent }   // 主题色，已接入（TextSessionPage useEffect）
input_placeholder: string             // 输入框提示文本，已接入
input_mode: 'free' | 'choice'        // 输入模式，已接入
avatar_mode: 'none' | 'script'       // 角色头像模式（F8，第三批）
characters: Record<name, { avatar_url, color? }>  // 角色头像映射（F8，第三批）
bg_url: string                        // 背景图（F9，第二批）
display_vars: string[]                // 展示给玩家的变量列表（F2，第一批）
```

### 角色识别与头像（F8，延后到第三批）

**原则**：头像渲染是创作者声明的功能，不是默认行为。游戏包里没有 `avatar_mode: 'script'` 就不触发任何识别逻辑，纯气泡模式。

**实现方式**（无需宏注册，纯前端）：
```
avatar_mode = 'script' 时：
  正则匹配 AI 消息开头（**角色名**：/ 【角色名】/ [角色名]）
  匹配到 characters 中的 key → 显示对应头像
  匹配不到 → 纯左对齐气泡，无副作用
```

Victoria 当前 `avatar_mode` 未设置（默认 `none`），内测阶段纯气泡。后续重制时创作者在游戏包里加声明即可，前端无需改动。

### 全局风格扩展路径

当前 `color_scheme` 只控制三个 CSS 变量（bg/text/accent），已经能改变整体色调。扩展到"改动整个画面风格"的路径是渐进的，不需要大重构：

**阶段 1（当前）**：`color_scheme` → 三个 CSS 变量，控制背景/文字/强调色

**阶段 2（第二批 F9）**：`bg_url` → 背景图，叠加在 `color_scheme.bg` 上，支持半透明遮罩

**阶段 3（内测后）**：扩展 `ui_config` 支持更多 CSS 变量覆盖：
```typescript
// 游戏包声明
ui_config: {
  color_scheme: { bg, text, accent, surface, border, muted },
  font_family: 'serif' | 'sans' | 'mono' | string,  // 字体风格
  bubble_style: 'default' | 'borderless' | 'outlined',  // 气泡样式
  message_width: 'narrow' | 'default' | 'wide',  // 消息流宽度
}
```

**阶段 4（light/rich 渲染器，Phase 4+）**：`game.type = 'light'` 时切换到 VNRenderer（视觉小说渲染器），完全不同的布局，不影响 Text 游戏。

**关键设计原则**：
- 所有风格声明都在游戏包的 `ui_config` 里，前端只负责解析执行
- 不引入插件系统，不允许游戏包执行任意 JS（安全边界）
- CSS 变量是扩展的核心机制，`document.documentElement.style.setProperty` 已经在用，继续沿用
- 扩展新字段时前端做好 fallback（字段不存在 → 使用默认值），保证旧游戏包不受影响

---

## 六、Phase 4 计划（内测后）

| 功能 | 后端状态 | 说明 |
|---|---|---|
| WorldbookDrawer 可编辑 | ✅ 已就绪（A-20）| 玩家私有副本编辑，PlayerWorldbookOverride 模式 |
| 多 Provider 配置 UI | ✅ 已就绪 | Cherry Studio 风格，LLMProfile CRUD |
| 登录弹窗 + 评论发布 | ✅ 已有后端 | 点击发评论触发登录 |
| ST 角色卡 PNG 导入游玩 | 🔜 需后端 | card_id 游玩支持 |
| slug 非唯一 + 路由改 UUID | 🔜 技术债（A-21）| 允许同名游戏，路由改 `/games/:id` |
| ui_config 风格字段扩展 | 🔜 前端主导 | font_family / bubble_style / message_width |
| light / rich 渲染器 | 🔜 中期 | VNRenderer + StatusBar |
| 首页论坛 | 🔜 后期 | — |

---

## 七、已知技术债

| 债务 | 影响 | 计划 |
|---|---|---|
| `slug` 强制唯一（DB uniqueIndex）| 不同作者不能用同名游戏 | Phase 4 去掉 uniqueIndex，路由改 UUID（A-21）|
| WorldbookDrawer 仍为只读 | 玩家无法在游玩页面编辑世界书 | 后端已就绪（A-20），前端 UI 待实现（F12）|
| `LibraryEntry` 后端写操作需 JWT | 匿名用户用 localStorage 模拟 | Phase 4 登录后接后端 |
| `author_name` 无 users 表 | 显示 UUID 前 8 位 | 永久缺口或 Phase 4+ |
| 停止生成清空 buffer | 用户点停止后内容消失 | F4，第一批修复 |

---

## 八、B 类标签渲染规则的可扩展性分析

### 现状与决策

B 类标签（内联样式标签，保留在叙事文本中渲染）已迁移进 `ALICE_CORE_RULES`（order 10-14），与清洗规则串联在同一管线中执行。`preprocessNarrative()` 函数已移除。

当前管线：
```
AI 原始输出 → runRegexPipeline('narrative') → splitSayBlocks() → ReactMarkdown
```

`runRegexPipeline` 内部规则分两组：

| order | 分组 | 职责 |
|---|---|---|
| 1–9 | 清洗组 | 移除/剥离 AI 输出噪声（`<thinking>`、`<content>` 等） |
| 10–19 | B 类渲染组 | 语义标签 → `gw-*` CSS 类名（`<em class="gold">`、`<aside>`、`<quote>`） |

当前 B 类规则（5 条）：

| 标签 | 渲染效果 | CSS 类 |
|---|---|---|
| `<em class="gold">` | 金色强调 | `gw-em-gold` |
| `<em class="danger">` | 红色警告 | `gw-em-danger` |
| `<em class="info">` | 蓝色提示 | `gw-em-info` |
| `<aside>` | 旁白/心声 | `gw-aside` |
| `<quote>` | 引用块 | `gw-quote` |

### 为什么合并而不是保持独立

- **可扩展性**：创作者现在可通过 `ui_config.regex_profiles` bundled 规则添加自定义内联标签，无需改动组件层
- **安全边界**：alice 命名空间官方规则豁免"纯文本限制"，可输出白名单 HTML（`span`/`div` + `gw-*` className），经 `rehypeSanitize` + `GW_SANITIZE_SCHEMA` 过滤后安全渲染；创作者 bundled 规则仍只允许纯文本 replacement
- **ST 对比**：ST 的正则脚本系统同样不区分"清洗"和"渲染转换"，所有文本变换走同一管线

### 之后可以怎么做

**近期（内测阶段）**：现状即可，创作者通过 bundled 规则扩展 B 类标签。

**中期：参数化标记语法**

当前 B 类标签语法（`<em class="gold">`）对 AI 来说 token 消耗偏高，且语义不够原子化。未来可设计更短的参数化语法，例如：

```
{g:金色文字}        → <span class="gw-em-gold">金色文字</span>
{d:危险提示}        → <span class="gw-em-danger">危险提示</span>
[[style|gold|文字]] → <span class="gw-em-gold">文字</span>
```

迁移路径：只需更新 `ALICE_CORE_RULES` 中对应规则的 `pattern`，组件层零改动。

**长期：专用解析器替代正则**

正则对嵌套标签（如 `{g:{d:嵌套}}` ）处理能力有限。如果 B 类标签语法复杂化，可在 `runRegexPipeline` 之后插入专用解析器步骤，正则管线仍处理简单替换，解析器处理结构化标记。

---

## 九、第三种元语言 vs 语义收敛：长对话格式稳定性方案评估

### 问题本质

AI 在长对话中会逐渐"遗忘"或"变异"输出格式规则。当宏语法（如 `[[say|角色名|台词]]`）以人类可读形式写在 system prompt 中时，模型可能：

- 漏写闭合标记
- 篡改分隔符（`|` → `:` 或 `,`）
- 混入自然语言破坏结构
- 长上下文后完全丢失格式

### 方案 A：第三种元语言（零宽度字符编码）

豆包文档提出的核心思路：将宏结构编码为 AI 不可感知的零宽度字符（U+200B / U+200C / U+200D），AI 只生成纯文本，宏由后端注入，前端解码渲染。

**优势**：
- 从根源杜绝 AI 破坏宏结构——AI 根本看不到宏
- 宏结构与 AI 生成层完全物理隔离

**GW 场景下的问题**：

1. **say 宏的内容由 AI 生成**。`[[say|角色名|台词]]` 中，角色名和台词都是 AI 输出的一部分，不是后端能预注入的元数据。后端不知道 AI 这一轮会让哪个角色说话、说什么。零宽度编码方案假设"宏结构由后端维护，AI 只填充纯文本"，但 GW 的 say 宏恰恰是 AI 自主决定的叙事行为。
2. **编码/解码复杂度高**。需要实现二进制编码器、CRC 校验、前端解码器，调试时不可见字符极难排查。
3. **剪贴板/日志污染**。零宽度字符会被复制、粘贴、写入日志，造成隐性 bug。
4. **部分平台不兼容**。某些编辑器、终端、数据库工具会过滤或显示零宽度字符。

**适用场景**：宏结构完全由后端控制、AI 不参与宏生成的场景（如 Notion 的不可编辑区域、飞书评论锚点）。GW 的 say 宏不属于此类。

### 方案 B：语义收敛到固定原子 ID

当前 GW 的实际做法：通过 system prompt 中的 `preset_entries` 严格约束 AI 输出格式，配合前端正则管线做容错清洗。

**为什么对 GW 有效**：

1. **原子格式足够简单**。`[[say|角色名|台词]]` 只有一层嵌套、两个分隔符，远低于模型的格式保持阈值。对比豆包描述的复杂嵌套宏（`<option>{talk|李|李斯特|今天你吃了多少}</option>`），GW 的格式对模型友好得多。
2. **角色名有锚定**。世界书中的角色名是高频重复 token，模型对其有强记忆。`preset_entries` 中给出的示例进一步强化格式锚定。
3. **正则管线兜底**。即使 AI 偶尔输出变体（如 `[[say|角色名：台词]]` 漏了分隔符），`splitSayBlocks()` 可以做宽松匹配降级处理，不至于渲染崩溃。
4. **优雅降级**。最坏情况下 say 宏未被识别，文本原样渲染为普通叙事段落——玩家看到的是纯文本对话而非报错，体验可接受。
5. **调试透明**。所有内容人类可读，日志可查，问题可复现。

**局限**：

- 超长对话（50+ 轮）后格式漂移仍可能发生
- 依赖模型能力——弱模型（如部分本地 7B）格式保持能力差

### 结论

**内测阶段及可预见的中期：语义收敛方案足够，不需要实现零宽度编码。**

理由：
- GW 的宏格式简单，现代模型（Claude / GPT-4 / DeepSeek）在 50 轮内保持 `[[say|name|text]]` 格式的成功率极高
- 正则管线 + 优雅降级已经覆盖了偶发的格式偏差
- 零宽度编码的前提（后端控制宏结构）与 GW 的 say 宏设计不匹配
- 实现成本高、调试成本高、收益有限

**如果未来出现以下情况，可重新评估**：
- 引入复杂嵌套宏（如多层条件分支、状态机指令）
- 需要支持格式保持能力弱的本地小模型
- say 宏之外出现大量后端可预注入的元数据标记

届时可考虑的折中方案：不走零宽度编码，而是**后端 post-processing 修复**——AI 生成后，后端用 LLM 或规则引擎校验/修复宏格式，再下发前端。成本远低于零宽度编码，且不改变前端架构。

---

## 附录：卡片改造思路

> 本节记录两张卡在 GW 渲染体系下的改造方向，目标是最大化利用 WE 引擎能力，让各自的叙事风格完整呈现。

---

### 维多利亚

#### 当前状态

已完成基础接入：`initial_variables`（18 个 KV）、`enabled_tools`、`<UpdateState>` 格式指令、`stats_bar` + `narrative_tags`（⏳存活天数 / ⌖当前位置）+ `floating_panels`（`character_sheet` 面板）。变量通过 SSE meta 事件实时推送，`CharacterSheet` 按前缀分组展示，管线已通。

#### 渲染风格目标

蒸汽朋克工业都会：**阶级感、金属质感、资产/声望的涨落戏剧性**。叙事文本应能直接传达"金币 +3""温莎声望 −5"这类事件的重量感，而不只是数字静默变化。

#### 需要补充的标签与改造点

**1. B 类内联标签 — 变量变化高亮**

在叙事文本中，AI 输出资产/声望变化时应使用内联标签标注，前端渲染为带色彩的徽章：

```
你从罗斯柴尔德的账房拿到了报酬。<em class="gold">金币 +12</em>
温莎家族的管家冷冷地看了你一眼。<em class="rep-down">温莎声望 −3</em>
```

- `gold` → 金色文字 + 淡金背景，用于货币收益
- `rep-up` / `rep-down` → 绿/红色，用于声望涨落
- `debt` → 橙色警示，用于债务增加

这类标签目前 RENDER-SPEC 已有 B 类内联标签框架，需要在 `MessageBubble` 的 prose 渲染层补充这几个 class 的样式映射。

**2. A 类块级标签 — 系统事件分离**

每轮结束时 AI 输出的"状态摘要"（如"第 3 天结束，你在东区度过了一个不安的夜晚"）应用 `<aside>` 或自定义 `<sys-event>` 标签包裹，前端渲染为与叙事文本视觉分离的系统提示条（灰色细线 + 小字），避免与叙事段落混排。

**3. `phone_status` 面板补充**

当前 `character_sheet` 面板已能展示所有变量，但声望/债务的对比关系（五大家族各自的声望 vs 债务）更适合用 `phone_status` 面板的分组列表呈现。建议在 `floating_panels` 中增加一个 `phone_status` 面板，`display_vars` 列出：

```json
["温莎声望","温莎债务","罗斯柴尔德声望","罗斯柴尔德债务",
 "克拉伦斯声望","克拉伦斯债务","莫里亚蒂声望","莫里亚蒂债务",
 "瓦特声望","瓦特债务","市政厅声望","市政厅债务"]
```

配合 `label` 用 `"声望.温莎"` / `"债务.温莎"` 格式，`CharacterSheet` 会自动按"声望"/"债务"分组，形成对比视图。

**4. `stats_bar` 精简**

当前 `stats_bar` 展示了 12 项，信息密度过高。建议只保留 `存活天数` + `当前位置` + `金币`（三项核心），其余移入浮窗面板，减少顶栏噪音。

**5. 待补充的后端能力**

- `<em class="gold">` 等 B 类内联标签的 CSS 变量映射（前端 prose 层）
- `<aside>` / `<sys-event>` 的块级渲染样式（前端）
- 无需后端改动，变量管线已通

---

### 绿茵好莱坞

#### 当前状态

已完成：`initial_variables`（31 个 KV，含 `竞技能力.核心能力.*` 嵌套路径）、`enabled_tools`、`<UpdateState>` 格式指令、`narrative_tags`（🕐当前时间 / 📍当前地点）、`floating_panels`（`phone_status` + `character_sheet` 双面板）。

**已知缺口**：原卡使用 `<UpdateVariable><JSONPatch>` RFC 6902 格式（支持 delta/insert/remove/move 操作），WE 引擎目前只支持 `<UpdateState>` 简单合并。已通过 `preset_entries` 格式指令绕过，但 AI 需要自行计算新值（如体能 100 → 85），无法用 `{"op":"add","path":"/竞技能力/当前体能","value":-15}` 这样的增量表达。这是中优先级后端任务。

#### 渲染风格目标

足球生涯模拟：**数据驱动、赛事节奏感、媒体/舆论氛围**。核心体验是"球员档案随剧情演进"，每场比赛后能力值变化、转会窗口的身价波动、媒体报道的舆论压力，都应在 UI 上有直接反馈。

#### 需要补充的标签与改造点

**1. A 类块级标签 — 赛事结果卡片**

比赛结束后 AI 输出比分/评分时，应用结构化标签包裹，前端渲染为独立的"赛事结果卡"：

```
<match-result>
主队 3 : 1 客队
你的评分：8.2 ⭐  进球：1  助攻：0
</match-result>
```

前端将此块渲染为带边框的卡片组件，与叙事文本视觉分离。目前 RENDER-SPEC 的 A 类块级标签框架可以承载，需要新增 `match-result` 的渲染 preset。

**2. B 类内联标签 — 能力值变化**

训练/比赛后能力值变化应内联标注：

```
这次高强度训练让你的速度有了明显提升。<em class="stat-up">速度 +2</em>
连续三场首发消耗了你的体力。<em class="stat-down">体能 −15</em>
```

与维多利亚的 `gold`/`rep` 标签共用同一套 B 类内联渲染机制，只需增加 `stat-up`/`stat-down` class 映射。

**3. A 类块级标签 — 媒体报道**

足球卡的核心叙事氛围之一是媒体舆论。建议 AI 在重要事件后输出"新闻简报"块：

```
<news-brief>
《体育画报》：「这位年轻球员的表现令人印象深刻，转会市场已有多家俱乐部关注。」
</news-brief>
```

前端渲染为报纸风格的引用块（斜体 + 灰色边框 + 小字），强化媒体氛围感。

**4. `phone_status` 面板优化**

当前 `display_vars` 已列出基本信息和竞技能力，但 `竞技能力.核心能力.*` 八项能力值更适合用进度条形式展示（类似 FIFA 球员卡）。`StatsPanel` 目前只对 `label.includes('生命')` 的项目渲染进度条，需要扩展为：当 `value` 是 0–100 的数字且 `group` 为 `核心能力` 时，自动渲染进度条。

**5. `narrative_tags` 扩展**

当前只有时间和地点两个标签。建议增加：
- `竞技能力.当前体能`（🔋，数值型，可配合进度条样式）
- `竞技能力.竞技状态`（💫，数值型）

这两项是比赛前玩家最关心的实时状态，放在顶栏 tags 里比进浮窗更直接。

**6. JSONPatch 后端支持（中优先级）**

补充 WE 引擎对 `<UpdateVariable><JSONPatch>` 的解析支持，允许 AI 用增量操作（`add`/`replace` with numeric delta）更新数值型变量，避免 AI 需要自行计算绝对值。这对体能、能力值这类频繁小幅变化的数值尤其重要，可以减少 AI 计算错误。

**7. 待补充的后端能力**

- JSONPatch 增量操作支持（后端 WE 引擎）
- `match-result` / `news-brief` 块级标签的前端渲染 preset
- `StatsPanel` 进度条扩展（前端，条件：`group === '核心能力'` 且值为 0–100）

---

### 两张卡的共同改造优先级

| 优先级 | 项目 | 影响范围 |
|--------|------|----------|
| P0 | 变量管线验证（实际游玩测试） | 两张卡 |
| P1 | B 类内联标签 CSS 映射（gold/rep/stat） | 两张卡 |
| P1 | `StatsPanel` 进度条扩展（核心能力组） | 绿茵好莱坞 |
| P2 | A 类块级标签 preset（match-result / news-brief / sys-event） | 两张卡 |
| P2 | `phone_status` 声望/债务对比视图 | 美高之路 |
| P3 | JSONPatch 增量操作后端支持 | 绿茵好莱坞 |

---

### 美高之路 — HTML 浮窗改造专项

#### 原卡浮窗的设计

原卡（SillyTavern 版）在每轮消息末尾输出一段完整的 HTML 文档（`美高之路浮窗部分.txt`），包含：
- 完整的 `<style>` 块（CSS 变量、动画、响应式布局）
- 多 Tab 面板（档案 / 学业 / 人际 / 物品）
- `<script>` 块（读取变量、渲染 DOM、`localStorage` 存储主题设置）
- FontAwesome / Google Fonts CDN 引用
- `<StatusPlaceHolderImpl/>` 占位符（SillyTavern 专属，由 ST 在渲染时替换为实际变量 JSON）

这套方案在 SillyTavern 里可行，因为 ST 直接把 AI 输出的 HTML 注入到聊天气泡的 `innerHTML` 中，并执行其中的 `<script>`。

#### GW 当前的差距

**backend-v2 引擎层面：**
- 引擎不处理 `<StatusPlaceHolderImpl/>`，它会被原样流出到前端
- 引擎不注入任何 HTML，也不做 HTML 清理/转义
- 叙事文本原样经 SSE token 流推送，前端收到的是包含完整 HTML 文档的字符串

**前端层面：**
- `MessageBubble` 当前用 `prose` 模式渲染叙事文本，底层是 Markdown → React 组件，**不执行 `<script>`**
- 即使用 `dangerouslySetInnerHTML` 注入 HTML，浏览器也不会执行动态插入的 `<script>` 标签（安全限制）
- CDN 字体/图标（FontAwesome、Google Fonts）在 GW 的 CSP 策略下可能被拦截
- `localStorage` 主题设置与 GW 自身的主题系统冲突

#### 推荐改造方向：`<iframe>` 沙箱渲染

将 AI 输出的 HTML 浮窗内容放入 `<iframe srcdoc="...">` 渲染，而不是直接注入 DOM：

```tsx
// 在 FloatingPanel 内部，检测到 html_panel preset 时：
<iframe
  srcdoc={htmlContent}
  sandbox="allow-scripts allow-same-origin"
  style={{ width: '100%', border: 'none', minHeight: 400 }}
  title="status-panel"
/>
```

优点：
- `<script>` 可以正常执行（`sandbox="allow-scripts"`）
- 与 GW 主 DOM 完全隔离，CSS 不污染，`localStorage` 不冲突
- CDN 资源在 iframe 内独立加载
- 无需修改引擎，前端单侧实现

缺点/注意事项：
- iframe 高度需要动态适配（`postMessage` 通知父窗口内容高度）
- `<StatusPlaceHolderImpl/>` 需要在前端注入变量 JSON 后替换，再传给 `srcdoc`
- SSE 流式输出期间 HTML 是不完整的，需要等 `done` 事件后再渲染 iframe（不能流式渲染 HTML）

#### `<StatusPlaceHolderImpl/>` 的替换方案

原卡的 `<script>` 里有 `const raw = null;` 这一行，ST 会把 `null` 替换为实际的变量 JSON 对象。GW 的替换逻辑：

```ts
// 在 handleTurnDone 之后，拿到 variables 快照：
const injected = htmlContent.replace(
  'const raw = null;',
  `const raw = ${JSON.stringify(variables)};`
)
// 然后把 injected 传给 iframe srcdoc
```

这样原卡的 `render()` 函数就能正常读取变量并渲染 DOM，无需修改原卡 HTML。

#### 触发机制：新增 `html_panel` preset

在 `FloatingPanelDecl` 中新增 preset 类型：

```json
{
  "id": "kora",
  "type": "preset",
  "preset": "html_panel",
  "default_pinned": false,
  "launcher": { "icon": "📱", "placement": "topbar" }
}
```

前端 `PanelsHost` 检测到 `preset === 'html_panel'` 时，从最新一条 assistant 消息中提取 HTML 块（通过正则匹配 `<!DOCTYPE html>` 到 `</html>`），注入变量后渲染 iframe。

#### HTML 提取方式

AI 每轮在叙事末尾输出完整 HTML 文档。前端需要：
1. 从消息内容中用正则提取 HTML 块：`/<!DOCTYPE html>[\s\S]*?<\/html>/i`
2. 叙事文本部分（HTML 之前的内容）正常渲染为 prose
3. HTML 块不在消息气泡内显示，只在浮窗 iframe 中渲染

这需要在 `MessageBubble` 的内容预处理阶段增加一个 `splitHtmlPanel()` 步骤，类似现有的 `splitSayBlocks()`。

#### SSE 流式输出的影响

**流式输出期间 HTML 不可渲染。** 原因：
- HTML 文档在流式输出中途是不完整的（`</html>` 还没到）
- 不完整的 HTML 传给 `srcdoc` 会导致 `<script>` 执行失败或 DOM 结构错误
- 正确做法：流式期间只渲染叙事文本部分，HTML 块用占位符（如加载动画）代替；收到 `done` 事件后，提取完整 HTML，注入变量，渲染 iframe

这与现有的 `StreamingBubble` → `MessageBubble` 切换时机一致，不需要额外的状态管理。

#### 需要补充的前端工作

| 工作项 | 说明 |
|--------|------|
| `splitHtmlPanel()` 工具函数 | 从消息内容中分离叙事文本和 HTML 块 |
| `HtmlPanelFrame` 组件 | iframe 渲染 + 变量注入 + 高度自适应 |
| `PanelsHost` 扩展 | 识别 `html_panel` preset，传入最新 HTML 内容 |
| `FloatingPanelDecl` 类型扩展 | 新增 `preset: 'html_panel'` |
| 流式期间占位符 | done 前显示加载状态，done 后渲染 iframe |

#### 后端是否需要改动

**不需要。** 引擎已经原样流出 HTML，变量通过 SSE meta 事件推送。整个改造是纯前端工作。唯一的潜在后端优化是：在 `regex_profiles` 中添加一条规则，把 `<StatusPlaceHolderImpl/>` 替换为一个固定占位符（如 `__STATUS_JSON__`），让前端替换更稳定——但直接替换 `const raw = null;` 也足够可靠。

---

## 十、GW Text 游玩体验建议

> 本节从整体视角梳理 WE 引擎已有能力与前端的结合方式，以及 Text 游玩页在内测后值得深入的方向。

### 充分利用 WE 引擎现有能力

**1. 变量门控世界书（已就绪，前端未可视化）**

WE 引擎已支持 `var:key=value` / `var:key!=value` 硬条件门控世界书词条。这意味着创作者可以声明"当 `温莎声望 >= 50` 时，注入温莎家族内部情报词条"，完全不需要 AI 自己判断。

前端建议：在 WorldbookDrawer 词条展开态显示触发条件标签（F27），让玩家理解哪些世界书内容是动态解锁的，增加探索感。

**2. 记忆分阶段注入（已就绪，前端未展示）**

Memory 的 `stage_tags` 字段允许记忆只在特定 `game_stage` 变量值时注入。创作者可以用这个机制实现"第一章的记忆不污染第二章的上下文"，或者"只有进入某个派系后，相关 NPC 的记忆才开始注入"。

前端建议：TechStatsModal Memory Tab 展示 `stage_tags`（F28），让创作者在调试时能看到记忆的注入条件。

**3. Director 槽做变量计算（已就绪，创作者配置）**

WE 的 Director 槽（廉价模型）可以在 Narrator 生成前做预分析。创作者可以在 `preset_entries` 中给 Director 一个专门的指令：分析本轮行动，计算变量变化量，输出 `<UpdateState>` 块。Narrator 槽只负责叙事，不做数值计算。

这样可以把"数值计算"和"叙事生成"分离到两个模型槽，减少 Narrator 的认知负担，提高叙事质量。对于维多利亚这类数值密集型游戏尤其有价值。

**4. ScheduledTurn 做 NPC 自主回合（已就绪，前端未接入）**

WE 支持变量阈值触发 NPC 自主回合（`ScheduledTurn`）。例如：当 `存活天数` 每增加 7 时，自动触发一次"周报"回合，NPC 主动发来消息。

前端目前没有处理 NPC 主动消息的 UI 路径。建议：NPC 主动消息以特殊样式渲染（如左侧带 NPC 头像 + 不同背景色），与玩家触发的 AI 回复视觉区分。

**5. Preflight 选项预测（P-4L，前端 F26）**

后端 P-4L 完成后，每轮 AI 回复结束后会异步预测 3 个可能的玩家行动，写入 `predicted_choices` 变量。前端在 ChatInput 上方渲染这些预测选项（淡入动画），玩家可以点选或忽略自由输入。

这是 GW 超越 ST 的核心体验差异之一：ST 的选项完全由 AI 在叙事中输出，GW 的选项由 Director 槽独立预测，质量更稳定，且不占用叙事 token。

**6. 边界归档做长期记忆压缩（已就绪，前端未接入）**

`POST /sessions/:id/archive` 可以触发边界归档，生成结构化摘要并写入 Memory。对于长期游玩（50+ 轮）的游戏，建议前端在 TechStatsModal 或存档管理抽屉中提供"归档当前进度"按钮，让玩家主动触发，防止上下文窗口溢出导致 AI 遗忘早期剧情。

---

### Text 游玩页的体验优先级建议

**近期（内测前）**：
- F9 背景图是氛围感的核心，优先级最高，等背景图素材就绪后立即实现
- F21 B 类内联标签 CSS 映射成本极低（纯 CSS），但对维多利亚/绿茵好莱坞的叙事质感提升明显，建议随 F9 一起做

**中期（内测后）**：
- F11 Swipe 多页是 ST 用户最熟悉的功能，缺失会被老玩家直接注意到，应在内测反馈收集后优先补齐
- F26 Preflight 选项预测是 GW 的差异化功能，等 P-4L 后端就绪后立即接入
- F23 html_panel iframe 沙箱是美高之路等原生 HTML 浮窗卡的关键，但实现复杂度中等，建议在 F9/F21 之后

**长期（创作者工具成熟后）**：
- 引导创作者从手写 HTML 浮窗迁移到声明式 `phone_status` / `character_sheet` preset，降低维护成本
- 完善 `ui_config` 的 `first_mes_style` 字段（cinematic / letter 等开场风格），让创作者控制游戏入口体验
- 考虑在 WorldbookDrawer 中增加"当前激活词条"视图（实时显示本轮哪些词条被触发），帮助玩家理解世界书的动态性
