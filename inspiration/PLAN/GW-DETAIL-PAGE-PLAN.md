# GW 游戏详情页 + 文本游戏全流程实现计划

> 状态：前端骨架已初始化，进入组件实现阶段（2026-04-09）
> 范围：游戏详情页 + 文本游戏游玩页完整实现
> 近期目标：将两张 ST 卡（Pathway to US High / 温知夏）改编为 WE 可运行的游戏包，在 GW 内测中验证完整流程

---

## 一、后端 API 状态（全部就绪）

| API | 状态 | 用途 |
|-----|------|------|
| `GET /api/play/games/:slug` | ✅ | 游戏详情 |
| `GET /api/play/games` | ✅ | 游戏列表 |
| `POST /api/play/sessions` | ✅ | 开始游玩 |
| `GET /api/play/sessions?game_id=` | ✅ | 存档列表（继续游玩）|
| `POST /api/play/sessions/:id/turn` | ✅ | 游玩回合 |
| `GET /api/play/sessions/:id/stream` | ✅ | SSE 流式输出 |
| `POST /api/play/sessions/:id/regen` | ✅ | 重新生成 |
| `GET /api/play/sessions/:id/floors` | ✅ | 楼层历史 |
| `GET /api/play/sessions/:id/floors?from=&to=` | ✅ | 楼层范围（游记剪辑）|
| `POST /api/play/sessions/:id/floors/:fid/branch` | ✅ | 分叉存档 |
| `PATCH /api/play/sessions/:id` `{is_public}` | ✅ | 公开存档（游记分享）|
| `GET /api/play/games/:id/worldbook-entries` | ✅ | 世界书面板（创作者开放时）|
| `POST /api/social/reactions/game/:id/favorite` | ✅ | 收藏游戏 |
| `GET /api/social/games/:id/stats` | ✅ | 评论数/帖子数统计 |
| `GET /api/social/games/:id/comments` | ✅ | 评论列表 |
| `POST /api/social/games/:id/comments` | ✅ | 发评论 |
| `GET /api/social/posts?game_tag=` | ✅ | 论坛帖子列表 |

---

## 二、页面结构

### 2.1 游戏详情页 `/games/:slug`

```
GameDetailPage
├── HeroSection              封面 + 标题 + 作者 + 标签 + 游戏类型徽章
├── ActionBar                [▶ 开始游玩] [继续存档 ▾] [❤ 收藏] [分享]
├── StatsBar                 玩家数 / 评论数 / 帖子数
└── TabNav                   概述 │ 评论 │ 攻略游记 │ 创作者说明
    ├── OverviewPanel        游戏类型 / 内容标签 / 存储策略提示
    ├── CommentCore          评论列表（线性/嵌套，由 comment_config 决定）
    ├── PostList             攻略/游记帖子列表
    └── CreatorNotes         Markdown 渲染（GameTemplate.notes）
```

text 游戏不走详情页，点击角色卡直接进聊天（或轻量 Modal 确认后进入）。

### 2.2 文本游戏游玩页 `/play/:sessionId`

```
PlayPage（text 游戏）
├── TopBar                   游戏名 + 工具按钮（世界书 / 变量 / 记忆 / 历史）
├── MessageList              react-virtuoso 虚拟滚动
│   ├── MessageBubble × N    user / assistant / system 三类样式
│   │   └── MarkdownRenderer react-markdown + remark-gfm
│   ├── ChoiceButtons        AI 回复含 options 时渲染
│   └── StreamingBubble      流式输出中（打字机效果）
├── ChatInput                多行输入 + 发送 + 重生成
└── HamburgerMenu（左下角 ≡）
    ├── 游玩操作：重新生成 / 继续生成 / AI 帮答
    ├── 存档管理：新建存档 / 从此分叉 / 公开存档
    ├── 个性化：作者注释 / 世界书批注
    └── 其他：管理聊天文件 / 删除消息
└── Drawer 面板（右侧抽屉）
    ├── WorldbookPanel       游戏世界书（只读）+ 我的批注（可写）
    ├── VariablePanel        变量快照只读
    ├── MemoryPanel          记忆列表只读
    └── HistoryPanel         楼层历史 + 分叉操作
```

---

## 三、组件清单

### 3.1 HeroSection

```tsx
Props: game: GameDetail
```

- 封面图（16:9，fallback 渐变色）+ 渐变遮罩叠加标题/作者/标签
- 游戏类型徽章：`text` / `light` / `rich-A` / `rich-B`
- 参考：`frontend/src/views/game/GameDetail.vue` 的 `.hero` + `.hero-overlay` CSS

### 3.2 ActionBar

```tsx
Props: game: GameDetail, sessions: Session[]
```

- `[▶ 开始游玩]`：`POST /api/play/sessions` → 跳转 `/play/:sessionId`
- `[继续存档 ▾]`：展开 SessionPicker 下拉（最近 5 个存档）
- `[❤ 收藏]`：`POST /api/social/reactions/game/:id/favorite`，乐观更新 `favorite_count`
- `[分享]`：复制 URL 到剪贴板，Toast 提示

### 3.3 SessionPicker

```tsx
数据：GET /api/play/sessions?game_id=&user_id=&limit=5
展示：存档标题 / 最后游玩时间（date-fns formatDistanceToNow）/ 楼层数
操作：点击 → 跳转 /play/:sessionId
```

### 3.4 StatsBar

```tsx
数据：GET /api/social/games/:id/stats → { comment_count, post_count }
     + game.play_count（来自详情 API）
     + game.favorite_count（来自详情 API）
```

### 3.5 CommentCore

```tsx
数据：GET /api/social/games/:id/comments?sort=date_desc&limit=20
功能：
  - 无限滚动（TanStack Query useInfiniteQuery）
  - 发评论（需登录）
  - 评论点赞（乐观更新）
  - 路由到 LinearFeedComment 或 NestedThreadComment（由 game.comment_config.default_mode 决定）
```

### 3.6 PostList

```tsx
数据：GET /api/social/posts?game_tag=:slug&sort=new&limit=10
展示：标题 / 作者 / 类型徽章（攻略/游记）/ 点赞数 / 楼层数 / 时间
点击：跳转 /forum/:postId
```

### 3.7 MessageBubble + MarkdownRenderer

```tsx
// 消息气泡
<MessageBubble role="assistant" content={msg.content} streaming={false} />

// Markdown 渲染（AI 输出）
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
<ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
```

### 3.8 WorldbookPanel

```tsx
数据：GET /api/play/games/:id/worldbook-entries（403 时隐藏 Tab）
     GET /api/play/sessions/:id/worldbook-entries（玩家批注，待 A-6 后实现）
两个 Tab：
  - 游戏世界书（只读，创作者开放时显示）
  - 我的批注（可写，session 级）
```

### 3.9 HamburgerMenu（ST 兼容）

左下角 `≡` 触发，对应 ST `#options` 菜单：

| 功能 | ST 对应 | WE API | Phase |
|------|---------|--------|-------|
| 重新生成 | Regenerate | `POST /sessions/:id/regen` | 1 |
| 继续生成 | Continue | `POST /sessions/:id/turn { continue: true }` | 1 |
| AI 帮答 | Impersonate | `POST /sessions/:id/turn { impersonate: true }` | 2 |
| 从此分叉 | Create branch | `POST /sessions/:id/floors/:fid/branch` | 1 |
| 公开存档 | — | `PATCH /sessions/:id { is_public: true }` | 1 |
| 作者注释 | Author's Note | Preset Entry 注入（前端 UI 写入 session 变量）| 2 |
| 管理聊天文件 | Manage chat files | `GET /api/play/sessions?game_id=` | 1 |
| 删除消息 | Delete messages | `DELETE /sessions/:id/floors/:fid`（待实现）| 2 |

---

## 四、数据流与状态管理

```
服务端状态（TanStack Query）：
  useGame(slug)           → GET /api/play/games/:slug
  useSessions(gameId)     → GET /api/play/sessions?game_id=
  useComments(gameId)     → GET /api/social/games/:id/comments（无限滚动）
  usePosts(gameSlug)      → GET /api/social/posts?game_tag=
  useFloors(sessionId)    → GET /api/play/sessions/:id/floors
  useWorldbook(gameId)    → GET /api/play/games/:id/worldbook-entries

客户端状态（useState / Zustand）：
  activeTab               → 当前 Tab（overview/comments/posts/notes）
  sessionPickerOpen       → SessionPicker 开关
  drawerPanel             → 当前抽屉面板（worldbook/variable/memory/history）
  streamingContent        → 流式输出缓冲（不进 TQ，直接 useState）

乐观更新（TQ onMutate + onError）：
  收藏游戏                → 立即更新 favorite_count，失败回滚
  评论点赞                → 立即更新 vote_up，失败回滚
```

---

## 五、路由规划

```
/                        首页（游戏列表）
/games/:slug             游戏详情页（light/rich 游戏）
/play/:sessionId         游玩页（所有游戏类型）
/forum/:postId           帖子详情页
/profile/:userId         用户主页（后续）
```

text 游戏的入口：首页角色卡区 → 点击 → 轻量 Modal（角色简介 + 开始按钮）→ 直接跳转 `/play/:sessionId`，不经过详情页。

---

## 六、MVP 实现顺序

### Phase 1：游戏详情页（静态展示 + 只读）

1. `GameDetailPage` 骨架 + 路由
2. `HeroSection`（封面 + 标题 + 标签）
3. `ActionBar`（开始游玩按钮，继续/收藏先 disable）
4. `StatsBar`（play_count + comment_count）
5. `OverviewPanel`（游戏类型 + 内容标签）
6. `CommentCore` 只读列表（无限滚动）
7. `PostList` 只读列表

### Phase 2：游玩页（文本游戏完整流程）

1. `PlayPage` 骨架 + `MessageList`（react-virtuoso）
2. `MessageBubble` + `MarkdownRenderer`
3. `ChatInput` + `POST /sessions/:id/turn`
4. SSE 流式输出（`@microsoft/fetch-event-source`）+ `StreamingBubble`
5. `ChoiceButtons`（AI 回复含 options 时）
6. 重新生成（`POST /sessions/:id/regen`）
7. `HamburgerMenu` Phase 1 功能（分叉/公开存档/管理存档）

### Phase 3：工具面板 + 社交功能

1. `WorldbookPanel`（游戏世界书只读）
2. `VariablePanel` + `MemoryPanel`
3. `HistoryPanel`（楼层历史 + 分叉操作）
4. 发评论 + 评论点赞
5. `SessionPicker`（继续游玩存档选择）
6. 收藏游戏按钮

### Phase 4：游记分享

1. 楼层范围选择 UI（`GET /sessions/:id/floors?from=&to=`）
2. 公开存档（`PATCH /sessions/:id { is_public: true }`）
3. 发布游记帖子（`POST /api/social/posts { session_id, floor_range }`）

---

## 七、开源库确认

| 库 | 用途 | 状态 |
|----|------|------|
| `react-virtuoso` | MessageList 虚拟滚动 | 确认使用 |
| `react-markdown` + `remark-gfm` | 消息气泡 Markdown 渲染 | 确认使用 |
| `@microsoft/fetch-event-source` | SSE 流式（支持 POST + 自动重连）| 确认使用 |
| `date-fns` | 时间格式化（"5分钟前"）| 确认使用 |
| `dangerouslySetInnerHTML` | 论坛帖子 HTML 渲染（后端已净化）| 确认使用 |
| `@uiw/react-md-editor` | 发帖编辑器 | Phase 3 引入 |
| `howler.js` | VN BGM/音效 | rich-A 阶段引入 |

---

## 九、近期工作：两张 ST 卡改编为 WE 游戏包

> 参考分析：`test-plan/light-cards/card-analysis.md`

### 9.1 目标

将以下两张 ST 卡改编为 WE 可运行的 `GameTemplate`，打包到 `.data/games/` 作为内测数据：

| ST 卡 | 对应 GW 类型 | 改编策略 |
|-------|------------|---------|
| Pathway to US High（群聊卡） | **text**（MVP 阶段先做 text，light 组件就绪后升级） | 单 LLM 叙事者扮演 4 个角色，消息气泡显示角色名 |
| 温知夏 V4.5（JS 任务卡） | **text**（MVP 阶段先做 text，rich-B 就绪后升级） | 提取角色设定 + 初始化逻辑，转为 WE 世界书 + Preset Entry |

**为什么先做 text 版本**：
- 前端 text 游戏流程已就绪，可以立即验证端到端
- light/rich-B 组件尚未实现，改编后无法展示
- text 版本可以验证 WE 引擎的角色扮演能力，为后续升级提供基准

### 9.2 改编工作（返回 WE 时处理）

**Pathway to US High → text 版**：
- 创建 `GameTemplate`：`type: "text"`, `slug: "pathway-to-us-high"`
- System Prompt：叙事者扮演 4 个角色（金发/黑发/活泼/傲娇），玩家是转学生
- 世界书：4 个角色的性格/外貌/关系条目
- 消息格式约定：AI 回复以 `【角色名】` 开头区分发言者（text 阶段的多角色方案）
- 封面：使用 `1_1.png`

**温知夏 V4.5 → text 版**：
- 创建 `GameTemplate`：`type: "text"`, `slug: "wen-zhixia"`
- 提取初始化逻辑：玩家配置（外貌/关系偏好）→ 转为游戏开始时的 Companion Slot 参数
- 世界书：温知夏的性格底色/外貌/关系情况（静态版，不做动态创建）
- 去掉 JS 任务脚本（手机 UI / 事件循环），保留核心角色扮演部分
- 封面：使用温知夏立绘

### 9.3 打包位置

```
.data/
├── games/
│   ├── pathway-to-us-high/
│   │   ├── game.json          # GameTemplate 完整定义（含 config/worldbook）
│   │   └── cover.png          # 封面图（来自 1_1.png）
│   └── wen-zhixia/
│       ├── game.json
│       └── cover.png          # 温知夏立绘
└── assets/                    # 共用素材（立绘/背景图等）
```

`game.json` 格式对应 `GameTemplate` 结构，可通过 CW 导入 API 或直接 seed 到数据库。

---

`frontend/src/views/game/GameDetail.vue` 中有价值的设计：
- Hero 图渐变遮罩 CSS（直接参考写法）
- 标签 pill 样式
- 社区讨论版块展示结构（简化后用于 Posts Tab）

丢弃：模拟数据、Vue3 语法、直接用 gameId filter posts（改为 game_tag）
