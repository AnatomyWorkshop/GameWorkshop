# GW 前端 MVP 实现计划

> 版本：v3（2026-04-10，代码已实现，文档同步更新）  
> 状态：**已实现** — 所有 Step 1-7 代码改动完成

---

## 一、技术栈

React 19 + Vite + TypeScript + Tailwind CSS 4  
TanStack Query v5 · Zustand · react-virtuoso · @microsoft/fetch-event-source · react-markdown + remark-gfm

---

## 二、文件改动汇总

| 文件 | 改动类型 | 核心内容 |
|------|---------|---------|
| `src/api/social.ts` | Bug 修复 | react/unreact 改为路径参数 |
| `src/pages/game-list/GameListPage.tsx` | Bug 修复 | 移除 text 游戏特判，统一走详情页 |
| `src/components/game/GameCard.tsx` | 功能补全 | T/L/R 类型徽章 + fallback 渐变色 |
| `src/components/game/ActionBar.tsx` | 重写 | 导入按钮 + 版本弹窗 + 点赞/收藏乐观更新 |
| `src/pages/play/PlayPage.tsx` | 功能补全 | useSession→useGame + CSS 主题注入 + 传 inputMode |
| `src/components/play/TopBar.tsx` | 功能补全 | 📚/🌍/📊 disabled 占位 + [···] 存档菜单 |
| `src/components/chat/ChatInput.tsx` | 重写 | [☰] / textarea / [→⏹] 三栏布局 |
| `src/components/chat/MessageBubble.tsx` | 功能补全 | first_mes 居中斜体细边框样式 |
| `src/components/chat/MessageList.tsx` | 功能补全 | 传 isFirstMes + 1/1 页码占位 |

---

## 三、已修复的阻断性 Bug

### Bug 1：`src/api/social.ts` reaction API 路径错误

后端路由是 `POST /social/reactions/:target_type/:target_id/:type`（路径参数），前端原来用 body 传参，导致所有点赞/收藏 404。

```typescript
// 修复后
react: (targetType, targetId, reactionType) =>
  apiFetch<void>(`/social/reactions/${targetType}/${targetId}/${reactionType}`, { method: 'POST' }),
unreact: (targetType, targetId, reactionType) =>
  apiFetch<void>(`/social/reactions/${targetType}/${targetId}/${reactionType}`, { method: 'DELETE' }),
```

### Bug 2：`src/pages/game-list/GameListPage.tsx` text 游戏绕过详情页

```typescript
// 修复后：所有游戏统一走详情页
function handleGameClick(game: Game) {
  nav(`/games/${game.slug}`)
}
```

---

## 四、GameDetailPage 设计规格

### 4.1 页面结构（从上到下）

```
┌─────────────────────────────────────────┐
│  游戏头：标题 + 作者信息                  │  ← HeroSection（已有）
├─────────────────────────────────────────┤
│  封面图 / fallback 渐变色                 │
├─────────────────────────────────────────┤
│  互动行                                  │  ← ActionBar（已重写）
│  LEFT: 👍数字  🪙(disabled)  ⭐数字      │
│  RIGHT: [↺ 继续]  [⬇ 导入] 或 [▶ 开始]  │
├─────────────────────────────────────────┤
│  评论区（只读）                           │
└─────────────────────────────────────────┘
```

### 4.2 ActionBar 实现要点

**按钮文字：**
- T 游戏：`⬇ 导入`
- L / R 游戏：`▶ 开始游玩`

**版本弹窗（T 游戏专用）：**
- 点击「导入」后弹出 popover（`absolute bottom-full right-0`）
- 数据：调用 `gamesApi.list({ limit: 50 })`，前端按 slug 前缀过滤
- 前缀提取：去掉末尾 `-v数字`、`-beta`、`-choice`、`-free`、`-command` 后缀
- 只有一个版本时直接创建，不弹窗（popover 打开后立即可点击）
- 点击外部关闭（`mousedown` 事件）

**乐观更新：**
- 点赞（👍）和收藏（⭐）均有本地 `useState` 维护状态和计数
- 点击先更新 UI，API 失败时回滚

### 4.3 评论区

- 默认 `linear` 模式（只读，MVP）
- `comment_style` 字段就绪后读取 `game.ui_config?.comment_style`

---

## 五、PlayPage 设计规格

### 5.1 页面结构

```
┌─────────────────────────────────────────┐
│  TopBar                                  │
│  [←] [📚] [游戏标题 flex-1] [🌍][📊][···]│
├─────────────────────────────────────────┤
│                                          │
│  MessageList（react-virtuoso）           │
│  first_mes：居中 · 斜体 · 细边框          │
│  AI 消息：左对齐气泡                      │
│  玩家消息：右对齐气泡                     │
│                                    [1/1] │  ← 页码占位
├─────────────────────────────────────────┤
│  ChatInput                               │
│  [☰]  [textarea，无 placeholder]  [→/⏹] │
└─────────────────────────────────────────┘
```

### 5.2 TopBar

| 按钮 | 状态 | tooltip |
|------|------|---------|
| ← | 可用 | 返回 |
| 📚 | disabled | 个人游戏库（即将上线） |
| 游戏标题 | flex-1 居中 | — |
| 🌍 | disabled | 世界书（即将上线） |
| 📊 | disabled | 游戏数据（即将上线） |
| ··· | 可用 | 点击显示"暂无存档"占位菜单 |

### 5.3 游戏数据加载（修复刷新丢失）

```typescript
const { data: session } = useSession(sessionId!)
const { data: game } = useGame(session?.game_id ?? '', { enabled: !!session?.game_id })
const inputMode = game?.ui_config?.input_mode ?? 'free'
const title = game?.title ?? '加载中…'
```

> 注意：`session.game_id` 是 UUID，`useGame` 调用 `GET /play/games/:slug`。
> 若后端不支持 ID 查询，需补充 `GET /play/games/by-id/:id` 端点或在 session 中存储 slug。

### 5.4 CSS 主题注入

```typescript
useEffect(() => {
  const cs = game?.ui_config?.color_scheme
  if (!cs) return
  const el = document.documentElement
  if (cs.bg) el.style.setProperty('--theme-bg', cs.bg)
  if (cs.text) el.style.setProperty('--theme-text', cs.text)
  if (cs.accent) el.style.setProperty('--theme-accent', cs.accent)
  return () => {
    el.style.removeProperty('--theme-bg')
    el.style.removeProperty('--theme-text')
    el.style.removeProperty('--theme-accent')
  }
}, [game?.ui_config])
```

### 5.5 ChatInput 布局

```
[☰]  [textarea，无 placeholder，自动扩展 1-4 行]  [→ / ⏹]
```

**[☰] 上拉菜单（`absolute bottom-full left-0`）：**
- ↺ 重新生成：调用 `sessionsApi.regen(sessionId)`（REST，不走 SSE）
- ✨ AI 帮答：disabled，Phase 2
- 🔧 创作者调试：disabled，Phase 2

**textarea：**
- 无 placeholder
- `autoResize`：`el.style.height = Math.min(el.scrollHeight, 96) + 'px'`
- `choice_only` 时隐藏
- `command` 时 `font-mono`

**右侧按钮：**
- 空闲：`→` 发送
- streaming：`⏹` 停止，调用 `useStreamStore().abortCtrl?.abort()`

### 5.6 input_mode 支持

| input_mode | textarea | [☰] | 选项按钮 |
|-----------|---------|-----|---------|
| `free`（默认）| 显示 | 显示 | pill 横排，浮在消息区底部 |
| `choice_primary` | 显示（降权） | 显示 | 在输入区上方，突出显示（Phase 2） |
| `choice_only` | 隐藏 | 隐藏 | 全宽竖排（Phase 2） |
| `command` | 等宽字体 | 显示 | 正常 |

### 5.7 消息区

**first_mes（`globalIndex === 0 && role === 'assistant'`）：**
- 居中（`justify-center`）
- 斜体（`italic`）
- 细边框（`border border-white/20`）
- 背景透明，宽度 90%

**页码指示器：**
- 位置：最后一条 assistant 消息右下角
- MVP 显示 `1/1`，低透明度（`opacity-30`），不可点击
- Phase 2：接入多页 API，支持 swipe

---

## 六、GameCard 设计规格

```
┌──────────────────────────────┐
│  [封面图 / fallback 渐变色]   │  ← aspect-video，始终占位
│                          [T] │  ← 右上角类型徽章（T/L/R）
├──────────────────────────────┤
│  游戏标题                     │
│  简介（line-clamp-2）         │
│  N 次游玩                     │
└──────────────────────────────┘
```

- `fallbackGradient(id)`：`hsl(charCode*137%360, 60%, 40%)` → `hsl(+60, 60%, 30%)`
- 类型徽章：`T` / `L` / `R`（后续改为完整文字）
- 点击统一跳转 `/games/:slug`

---

## 七、设计决策记录

| 问题 | 决策 | 理由 |
|------|------|------|
| 类型标签 | 暂用 T/L/R | 后续统一修改为完整文字 |
| 版本弹窗数据来源 | 前端调 `gamesApi.list({ limit: 50 })` 按 slug 前缀过滤 | MVP 无需后端改动；游戏数量超 50 时可能漏版本，后续改为后端 `slug_prefix` 参数 |
| TopBar 工具按钮 | 显示 disabled 占位 | 让玩家知道功能存在但未开放 |
| 重生成实现 | REST `POST /sessions/:id/regen` | 简单可靠；SSE 重生成需额外状态管理，Phase 2 再做 |
| AI 帮答 | disabled 占位 | 后端 `/suggest` 端点尚未存在 |
| `session.game_id` 查询 | 用 `useGame(game_id)` 调 `/play/games/:slug` | 若后端不支持 ID 查询需补充端点 |

---

## 八、已知缺口（后续处理）

| 缺口 | 影响 | 处理方式 |
|------|------|---------|
| `GET /social/games/:id/stats` 未注册 | StatsBar 评论数 404 | 占位显示 `—` |
| `POST /sessions/:id/suggest` 不存在 | AI 帮答无法实现 | disabled 占位 |
| `session.game_id` 是 UUID，`useGame` 接受 slug | PlayPage 游戏数据可能加载失败 | 确认后端是否支持 ID 查询 |
| `comment_config` 字段未暴露 | 评论区模式无法读取 | 硬编码 linear |
| `sessionsApi.delete` 缺失 | 重新开始功能 | 暂不影响 MVP |

---

## 九、Phase 2+ 待实现

- AI 帮答（✨）：需后端 `/suggest` 端点
- Swipe 切换（◀ 1/3 ▶）：需多页 API
- `choice_primary` / `choice_only` 完整 UI
- TopBar 工具面板实际内容（世界书/变量抽屉）
- [···] 存档功能
- 评论发送（需用户认证）
- 消息编辑/删除
- 本地游戏下载（需 WE 引擎）
