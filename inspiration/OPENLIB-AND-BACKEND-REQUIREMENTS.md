# 开源库参考 + 后端功能缺口

> 状态：2026-04-08 整理
> 用途：开发前选型确认，以及下一批后端 API 开发任务清单

---

## 一、前端开源库选型

### 已确定（见 frontend-tech-plan.md）

| 库 | 用途 |
|----|------|
| React 19 + TypeScript | 框架 |
| Vite 6 | 构建 |
| React Router v7 | 路由 |
| Zustand | 客户端状态 |
| TanStack Query v5 | 服务端状态 / 缓存 |
| shadcn/ui + Tailwind CSS v4 | UI 组件 |
| Framer Motion | 动画 |
| `@microsoft/fetch-event-source` | SSE 流式 |
| Lucide React | 图标 |
| React Hook Form + Zod | 表单 |

---

### 待确定：对话流虚拟滚动

**需求**：长对话（200+ 楼层）时，DOM 节点数爆炸，滚动卡顿。

**候选库：**

| 库 | 特点 | 建议 |
|----|------|------|
| `react-virtuoso` | 支持可变高度，自动计算，API 最简洁 | **推荐** |
| `@tanstack/react-virtual` | 灵活，但需要自己写更多胶水代码 | 备选 |
| `react-window` | 旧库，只支持固定高度或需要手动测量 | 不推荐 |

**结论**：选 `react-virtuoso`。API 是：
```tsx
<Virtuoso data={messages} itemContent={(_, msg) => <MessageBubble msg={msg} />} />
```

---

### 待确定：Markdown 渲染

**需求**：
1. 游玩页消息气泡内渲染 Markdown（AI 输出）
2. 论坛帖子/回复渲染（已有后端 Goldmark 渲染，前端只需展示 HTML）
3. 创作者说明 Tab（Markdown 渲染）

**候选：**

| 库 | 用途 | 说明 |
|----|------|------|
| `react-markdown` + `remark-gfm` | 消息气泡 + 创作者说明 | 轻量，SSR 友好 |
| `dangerouslySetInnerHTML` | 论坛帖子（后端已净化 HTML） | 直接用，无需额外库 |
| `@uiw/react-md-editor` | 发帖编辑器 | 含预览，支持 CJK，无需 CodeMirror |

**结论**：消息气泡用 `react-markdown`，论坛内容直接 `dangerouslySetInnerHTML`（后端 Bluemonday 已净化），发帖编辑器用 `@uiw/react-md-editor`。

---

### 待确定：音频（VN BGM/音效）

**需求**：视觉小说 BGM 淡入淡出，音效点击播放。

| 库 | 特点 |
|----|------|
| `howler.js` | 游戏音频标准库，支持淡入淡出/空间音频/多格式 |
| Web Audio API 原生 | 无依赖，但 fade 需要手写 |

**结论**：VN 阶段再引入 `howler.js`，MVP 阶段不处理音频。

---

### 待确定：代码高亮（论坛帖子内代码块）

**需求**：论坛帖子可能包含代码块（攻略/开发讨论）。

| 库 | 特点 |
|----|------|
| `react-syntax-highlighter` | 老牌，bundle 大 |
| `prism-react-renderer` | 轻量，主题自定义 |
| `shiki` | 最精准高亮，但 SSR 配置复杂 |

**结论**：论坛 MVP 阶段暂不高亮，先只渲染 `<pre><code>` 块。后续用 `prism-react-renderer`。

---

### 待确定：时间格式化

**需求**：评论/帖子时间展示（"5分钟前"、"3天前"）。

**选型**：`date-fns` + `formatDistanceToNow` — 按需导入，不引入 moment.js 全量。

---

## 二、模仿对象（开源库设计参考）

| 参考项目 | 学习点 |
|---------|-------|
| **Artalk** | 评论树渲染（Rid + RootID 双索引），已用于后端设计，前端也参考其 CSS 变量主题化方案 |
| **Flarum** | 论坛帖子列表（标题 + 最后回复 + 楼层计数），帖子内"盖楼"序号展示 |
| **SillyTavern** 前端 | 对话气泡样式（user/assistant 区分），输入区工具栏（重试/生成中/停止按钮） |
| **NovelAI** | VN 场景切换动画（crossfade 背景、立绘滑入），对话框 typewriter 效果实现 |
| **itch.io 游戏详情页** | Hero 封面 + Tab 布局 + 社区评价展示方式 |

---

## 三、后端功能缺口清单

### 3.1 游戏公开 API（玩家侧）

目前只有 `/api/create/templates/:id`（创作者视角），缺少玩家侧只读视图。

**需新建：**
```
GET /api/play/games              公开游戏列表（分页 + 标签过滤 + 排序）
GET /api/play/games/:slug        游戏详情（slug 或 UUID 均可）
```

返回字段投影（从 GameTemplate 取子集，不暴露 system_prompt 等私有字段）：
```json
{
  "id": "...",
  "slug": "...",
  "title": "...",
  "cover_url": "...",
  "short_desc": "...",
  "tags": ["...", "..."],
  "game_type": "text|light|rich",
  "ui_config": { ... },
  "notes": "...",
  "author_id": "...",
  "play_count": 0,
  "created_at": "..."
}
```

### 3.2 用户存档列表

**需新建：**
```
GET /api/play/sessions?game_id=&user_id=&limit=5&order=last_played
```

返回：`[{ id, game_id, created_at, updated_at, floor_count, agent_id? }]`

### 3.3 Session 公开分享

**需新建/扩展：**
```
PATCH /api/play/sessions/:id     { "is_public": true }    公开存档
GET   /api/play/sessions/:id/floors?from=&to=             范围查询（供剪辑）
```

### 3.4 游戏收藏（Reaction target_type 扩展）

目前 `reaction/model.go` 的合法 target_type 只有：
- `comment`
- `forum_post`  
- `forum_reply`

需要加：
- `game` — 游戏收藏（favorite）
- `session` — 收藏别人的公开存档（可选，后续）

修改位置：`internal/social/reaction/model.go` 的 `IsValidTarget()` 函数，以及 `syncCount()` 中对应的计数更新逻辑（game 表 favorite_count 字段）。

### 3.5 Agent 标志（轻量）

在 `game_sessions` 表预留字段（不破坏现有逻辑）：
```sql
ALTER TABLE game_sessions ADD COLUMN agent_id TEXT;         -- 可选，关联 player_agents
ALTER TABLE game_sessions ADD COLUMN agent_type TEXT DEFAULT 'human'; -- 'human' | 'software'
```

`player_agents` 表（新建，可选 MVP）：
```
id, user_id, game_id, display_name, avatar_url, created_at
```

### 3.6 UI Config 字段（GameTemplate 扩展）

在 `GameTemplate.Config` JSONB 中增加 `ui_config` 子字段（无需 schema 变更，JSONB 天然扩展）：
```json
{
  "ui_config": {
    "theme": "terminal",
    "color_scheme": { "bg": "#0a0a0a", "text": "#00ff41", "accent": "#ff3366" },
    "font": "monospace",
    "bubble_style": "borderless"
  }
}
```

前端解析 `game.config.ui_config` 注入 CSS 变量即可。**无需后端改动。**

### 3.7 世界书玩家只读 API（新建）

**需新建：**
```
GET /api/play/games/:id/worldbook-entries
```

返回字段（投影，不暴露技术参数）：
```json
[
  {
    "id": "...",
    "keyword": "爱丽丝",
    "content": "是一个对镜子有执念的少女...",
    "category": "character"
  }
]
```

控制：只当 `game.config.allow_player_worldbook_view = true` 时返回数据，否则 403。  
`position`、`order`、`probability` 等 LLM 技术字段不返回给玩家。

### 3.8 常驻角色管理 API（新建）

**需新建：**
```
GET  /api/users/:id/resident_character
     → { character_card_id, session_id, display_name }

POST /api/users/:id/resident_character
     { character_card_id, import_session_id? }
     → 设置常驻角色；import_session_id 存在时同时导入高重要性记忆（min_importance=7）

DELETE /api/users/:id/resident_character
     → 重置为平台默认看板娘（不删 session，只解绑）
```

这些接口支持 DESIGN-CONCEPTS.md 描述的"游戏角色 → 常驻角色"迁移流程。

---

## 四、优先级排序

### 前端
1. 游戏详情页静态展示（HeroSection + 概述 Tab）
2. 评论区只读列表
3. 论坛帖子列表（Posts Tab）
4. 开始游玩按钮（接 POST /api/play/sessions）
5. 评论发布/点赞（需登录）

### 后端（配合前端开发顺序）
1. `GET /api/play/games/:slug` — 详情页需要
2. `GET /api/play/sessions?game_id=` — 继续游玩需要
3. reaction target_type 加 `game` — 收藏功能需要
4. session 公开分享 API — 游记功能需要
5. `GET /api/play/games/:id/worldbook-entries` — 世界书面板需要
6. `POST /api/users/:id/resident_character` — 常驻角色迁移需要
7. Agent 标志字段 — 可最后加
