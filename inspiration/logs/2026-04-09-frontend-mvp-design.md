# 前端 MVP 设计完成记录

> 日期：2026-04-09  
> 范围：GW 最小可展示子集 — 游戏详情页 + 评论区 + 文本游戏公共界面

---

## 完成的工作

### 1. 设计文档体系建立

| 文件 | 内容 |
|------|------|
| `FRONTEND-PLAN.md` | 前端整体策略，从 text 游戏出发的渲染层级，组件复用关系 |
| `frontend-tech-plan.md` | React 技术栈选型（React 19 + Vite 6 + Zustand + TanStack Query + shadcn/ui）|
| `TEXT-GAME-CHAT-UI.md` | 文本游戏聊天界面详细设计，ST 功能映射表 |
| `OPENLIB-AND-BACKEND-REQUIREMENTS.md` | 开源库选型确认 + 后端 API 缺口清单 |
| `DESIGN-CONCEPTS.md` | 核心产品概念（角色三层级、游戏四类型、游玩即媒体）|
| `RESIDENT-CHARACTER.md` | 常驻角色设计（Stage 1 管家 + Stage 2 Companion Slot）|
| `PLAN/GW-DETAIL-PAGE-PLAN.md` | 详情页 + 游玩页完整实现计划，含组件清单、数据流、MVP 四阶段 |

### 2. 后端 API 对齐

确认 29 个 API 全部就绪，覆盖：
- 游戏详情 / 列表
- 会话管理（开始/继续/分叉/公开）
- 游玩回合 + SSE 流式输出
- 社交（评论/帖子/收藏/统计）
- 世界书面板

### 3. 组件清单确定

核心组件：`HeroSection` / `ActionBar` / `SessionPicker` / `StatsBar` / `CommentCore` / `PostList` / `MessageBubble` / `MarkdownRenderer` / `WorldbookPanel` / `HamburgerMenu`

### 4. MVP 四阶段排期

- Phase 1：详情页静态展示 + 只读评论
- Phase 2：文本游戏完整游玩流程（SSE + 流式输出 + 选项按钮）
- Phase 3：工具面板（世界书/变量/记忆/历史）+ 社交互动
- Phase 4：游记分享（楼层剪辑 + 公开存档 + 发帖）

---

## 解耦评估结论

**当前 MVP 范围之外尚未开始的功能：**
- light 游戏独立界面（立绘 + 状态栏 + 选项按钮样式）
- rich-A 视觉小说引擎（背景 + 三槽立绘 + BGM + 动画）
- rich-B iframe 沙箱
- 游戏论坛（帖子详情页 `/forum/:postId`）
- 常驻角色浮窗
- 首页分享 / 用户主页

**解耦原则遵从情况：**
- ✅ `CommentCore` 通过 `comment_config` 路由评论样式，不硬编码
- ✅ `/play/:sessionId` 路由对所有游戏类型通用
- ✅ 开源库按阶段引入，不提前绑定
- ⚠️ `PlayPage` 需补充渲染引擎切换策略（见下方待办）
- ⚠️ `MessageBubble` Props 需预留 light 游戏立绘扩展点

---

## 待补充（下次开始前）

1. 在 `GW-DETAIL-PAGE-PLAN.md` 补充 `PlayPage` 渲染引擎分发策略：
   > `game.type` → `ChatEngine`（text）/ `LightEngine`（light）/ `VNEngine`（rich-A）/ `IframeEngine`（rich-B）
   > 各 Engine 共享 `MessageList` / `ChatInput` / `HamburgerMenu` 基础层

2. `MessageBubble` Props 预留 `portrait?: string` 字段（light 阶段启用）

3. `ActionBar` 的"分享"明确为"复制链接"，与论坛发帖分享解耦
