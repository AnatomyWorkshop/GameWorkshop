# GameWorkshop 前端

GameWorkshop（GW）的玩家端前端，基于 React + Vite + TypeScript 构建。  
当前只对 **Text 游戏 MVP** 做正式承诺。

---

## 当前范围

这一轮只围绕四个页面推进：

- `/`：公共游戏库页
- `/games/:slug`：游戏详情页
- `/play/:sessionId`：Text 游玩页
- `/library`：个人游戏库页（待接入）

---

## 当前产品判断

### 1. 公开库与个人库分开

- **公共游戏库**：已审查、可公开发现、默认云端导入
- **个人游戏库**：管理已导入游戏、私人导入内容、运行配置

### 2. Text 游戏先走完整详情页

当前文档口径统一为：

`公共游戏库 → 游戏详情页 → 导入 / 继续 → Text 游玩页`

### 3. 前端不依赖后端 One-shot 叙事

前端不根据后端内部是单次调用还是 narrator/director/verifier 多槽来设计页面。  
前端只依赖稳定接口与流式事件。

---

## 当前页面状态

## 公共游戏库页

- 统一卡片网格
- 封面图 / 标题 / 创作者信息
- 渲染层级徽章 `T / L / R`

## 游戏详情页

- 标题区
- 媒体 / 简介区
- 主操作区：导入 / 继续
- 次操作区：点赞 / 投币 / 收藏
- 评论区：`Flow` 或 `Thread`

## Text 游玩页

- TopBar：出口 / 标题 / 世界书入口 / 统计搜索入口 / 存档入口 / `···`
- 中段：消息流
- 底端：汉堡菜单 / 输入框 / 发送按钮

## 个人游戏库页

当前文档已确认其为独立页面，不再藏在游玩页 `···` 中。  
它将负责：

- 公共游戏导入后的管理
- 本地游戏包导入
- 运行配置与模型配置
- 云端 / 本地运行切换

---

## 运行策略

### 公共导入

从公共游戏库导入后，默认：

- `engine_mode = cloud_default`

### 本地运行

如果用户已经配置本地 WE 引擎，个人游戏库允许：

- `下载到本地`

这样非 LLM 内容尽量本地化，是否联网主要由当前模型配置决定。

### 运行配置伴随同系列版本

同一个详情页下导入的不同版本、以及它们的存档，默认共享同一组运行配置。

---

## 技术栈

| 层 | 库 |
|---|---|
| UI | React + TypeScript |
| 路由 | React Router |
| 数据请求 | TanStack Query |
| 状态管理 | Zustand |
| 虚拟滚动 | react-virtuoso |
| SSE | @microsoft/fetch-event-source |
| Markdown | react-markdown + remark-gfm |
| 日期 | date-fns |

---

## 当前不纳入 MVP

- `light` 独立渲染器
- `rich-A` / `rich-B`
- Resident Character
- 首页论坛流
- Swipe 多页交互

---

## 本地开发

```bash
pnpm install
pnpm dev
```

后端地址默认代理到 `http://localhost:8080`，见 `vite.config.ts`。
