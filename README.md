# GameWorkshop 前端

GameWorkshop（GW）的玩家端前端，基于 React 19 + Vite + TypeScript + Tailwind CSS 4 构建。

---

## 技术栈

| 层 | 库 |
|---|---|
| UI | React 19 + Tailwind CSS 4 |
| 路由 | React Router v7 |
| 数据请求 | TanStack Query v5 |
| 状态管理 | Zustand |
| 虚拟滚动 | react-virtuoso |
| SSE 流式 | @microsoft/fetch-event-source |
| Markdown | react-markdown + remark-gfm |
| 构建 | Vite 6 |

---

## 页面结构

```
/                    游戏库（GameListPage）
/games/:slug         游戏详情（GameDetailPage）
/play/:sessionId     游玩页（PlayPage）
```

---

## 游戏类型

GW 将游戏分为三类，决定详情页和游玩页的渲染方式：

### T — Text（文字游戏）

纯 AI 对话驱动，界面完全由 GW 提供。

- 无立绘、无背景图、无 BGM
- 游玩页：左右气泡对话布局，支持 Markdown 渲染
- 输入区：`[☰] / textarea / [→⏹]` 三栏，支持 `input_mode` 配置
- 详情页：「⬇ 导入」按钮，支持多版本选择弹窗
- 创作者可通过 `ui_config` 配置主题色、输入模式（`free` / `choice_primary` / `choice_only` / `command`）

**当前已实现。**

### L — Light（轻量游戏）

有视觉元素，但 UI 主体仍是 GW 提供的聊天框架。

- 角色立绘（半身像）
- 状态栏（HP、好感度、时间等变量可视化）
- 选项按钮（更突出，全宽）
- 可选：静态背景图

**详情页待规划，游玩页待实现。**

### R — Rich（富媒体游戏）

**Rich-A：视觉小说（VN）**

背景图层 + 立绘槽 × 3 + BGM/音效 + 场景切换动画 + VN 对话框。

**Rich-B：独立应用级游戏**

完全自定义前端（React SPA、PixiJS 等），通过 `GW_API_TOKEN` 接入后端 REST API。GW 提供 iframe 容器 + postMessage 协议 + session 生命周期管理。

**详情页待规划，游玩页待实现。**

---

## 当前实现状态

### 游戏库页（`/`）

- 响应式网格（2 / 3 / 4 列）
- 封面图 + fallback 渐变色（由 `game.id` 生成 hsl）
- 右上角类型徽章（T / L / R）
- 无限滚动加载
- 点击统一跳转详情页

### 游戏详情页（`/games/:slug`）

- HeroSection：封面图 / fallback 渐变 + 标题 + 类型徽章
- ActionBar：
  - T 游戏：「⬇ 导入」+ 版本选择弹窗（前端按 slug 前缀过滤）
  - L/R 游戏：「▶ 开始游玩」
  - 点赞 / 收藏乐观更新
- StatsBar：游玩数、评论数（后端 `/social/games/:id/stats` 就绪后接入）
- 评论区：只读，linear 模式

### 游玩页（`/play/:sessionId`）

- TopBar：← 返回 / 📚 游戏库（占位）/ 游戏标题 / 🌍 世界书（占位）/ 📊 数据（占位）/ ··· 存档菜单
- 消息区：react-virtuoso 虚拟滚动，first_mes 居中斜体样式，1/1 页码占位
- ChatInput：[☰] 上拉菜单（重生成可用，AI 帮答 / 创作者调试占位）/ textarea 自动扩展 / 发送+停止互斥
- 游戏数据从 API 加载（刷新不丢标题）
- `ui_config.color_scheme` 注入 CSS 变量，离开时清除

---

## 已知缺口（待后端补充）

| 缺口 | 影响 |
|------|------|
| `GET /social/games/:id/stats` 未注册 | StatsBar 评论数 404，占位显示 `—` |
| `POST /sessions/:id/suggest` 不存在 | AI 帮答 disabled 占位 |
| `session.game_id` 是 UUID，`GET /play/games/:slug` 接受 slug | PlayPage 游戏标题可能加载失败，需确认后端是否兼容 ID 查询 |

---

## 个人仓库说明

> **本仓库（GameWorkshop）是 GW 平台的玩家端前端，未来将进行较大重构。**

当前阶段为 MVP，组件结构和 API 调用方式会随后端接口稳定而调整。主要预期变更：

- **L/R 游戏详情页**：需要独立的游玩页设计，与 T 游戏完全不同
- **个人游戏库（TopBar 📚）**：需要用户认证体系就绪后实现
- **评论发送**：需要用户认证
- **Swipe / 多页分支**：需要后端多页 API
- **AI 帮答**：需要后端 `/suggest` 端点

---

## 本地开发

```bash
pnpm install
pnpm dev
```

后端地址默认代理到 `http://localhost:8080`，见 `vite.config.ts`。
