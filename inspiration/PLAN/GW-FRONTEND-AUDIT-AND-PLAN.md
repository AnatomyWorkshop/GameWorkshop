# GW 前端审计与修改计划

> 版本：2026-04-12 v15（Phase 3 全部完成，Phase 4 后端就绪，准备 ST 对比）
> 端到端验证：✅ 通过（2026-04-12）

---

## 一、已完成归档（Phase 1 + Phase 2 + Phase 3）

### Phase 1（基础结构）✅

| 任务 | 说明 |
|---|---|
| P1-1：重命名页面组件和 TopBar | `PlayPage` → `TextSessionPage`，`TopBar` → `TextSessionTopBar` |
| P1-2：`types.ts` 补全缺失字段 | `tags`、`comment_config`、`input_placeholder`、`LibraryEntry`、`RuntimeBinding` |
| P1-3：修复 `socialApi.getComments` Bug | 响应从 `{comments,next_cursor}` 改为 `{total,items}` |
| P1-4：`AppLayout` 顶部导航 | 公共游戏库 ↔ 我的游戏库 NavLink |
| P1-5：`PublicLibraryPage` 筛选 UI | 类型（T/L/R）+ 风格标签双行 pill 筛选 |
| P1-6：`ChatInput` 接入 `input_placeholder` | 从 `game.ui_config.input_placeholder` 读取 |
| P1-7：`TextSessionTopBar` vaul 抽屉 | 世界书/存档/统计三个右侧抽屉 |
| P1-8：`ChatInput` AI 帮答 | Sparkles 按钮调用 `/suggest`，填入输入框 |
| P1-9：`GameDetailPage` 修复 | tags 展示、like_count、myReactions 初始化 |

### Phase 2（个人库 + 运行配置）✅

| 任务 | 说明 |
|---|---|
| P2-1：`MyLibraryPage`（`/library`）| 已导入游戏列表 + 本地导入 + 运行配置 |
| P2-2：`stores/runtime.ts` | `getRuntimeConfig` / `setRuntimeConfig` localStorage 工具 |
| P2-3：SSE 接入 RuntimeBinding | `TextSessionPage` 读取 runtime config，传给 `ChatInput` → `streamTurn` |
| P2-4：TopBar `···` 菜单 | 显示当前 model_label，点击跳转 `/library` |
| P2-5：`ActionBar` 写入个人库 | 导入时调用 `addToLibrary` 写 `gw_library` localStorage |
| P2-6：PNG 导入（`gw_game` keyword）| multipart 上传 `POST /api/create/cards/import`，写入 DB + localStorage |

**端到端验证路径**：公共库 → 详情页 → 导入 → 游玩（SSE 流式）→ 个人库管理 → PNG 导入 ✅

### Phase 3（内测前完善）✅

| 任务 | 实现说明 |
|---|---|
| P3-1：LLM 错误信息显示 | `stores/stream.ts` 加 `streamError`/`setError`/`humanizeError()`；`TextSessionPage` 红色错误气泡 + 重试/关闭按钮 |
| P3-2：世界书 seed 修复 | 待补充 `allow_player_worldbook_view: true`（seed 数据操作）|
| P3-3：ActionBar 导入逻辑修正 | 删除 `slugPrefix`/版本 popover；三态按钮：无存档→"开始游玩"，有存档→"继续"+"新存档" |
| P3-4：ArchiveDrawer 增强 | inline 重命名（Enter/Escape）、confirm 删除（删当前存档跳回详情页）、"＋ 新存档" |
| P3-5：StatsDrawer 变量面板 | 接入 `GET /sessions/:id/variables`，5 秒轮询，过滤 `_` 前缀内部变量 |
| P3-6：游戏包导出 | `MyLibraryPage` 每项加"导出"按钮，触发 `GET /api/create/templates/:id/export` 下载 |
| P3-7：Markdown 渲染 | `MessageBubble` 已用 `react-markdown` + `remark-gfm`（Phase 2 已完成）|
| P3-8：页面美化 | 待 ST 对比后确定优先项 |

---

## 二、架构决策（2026-04-12）

### 2-A：个人库本地编辑——不违背"打包只读"哲学

**问题**：游戏导入个人库后，玩家想修改世界书词条（修正创作者的错误、调整细节），但当前设计是只读的。

**"打包只读"的正确理解**：
- 只读的是**公共游戏库的原始版本**（`status=published` 的 `GameTemplate`）
- 玩家导入到个人库后，得到的是**自己的副本**，这个副本应该可以自由修改
- 这与 SillyTavern 的设计完全一致：ST 的角色卡导入后存在本地，玩家可以随意编辑，不影响原始卡

**结论**：允许玩家编辑个人库中的游戏，不违背设计哲学。个人库的游戏是玩家的私有副本。

**实现方案**：

个人库的游戏数据存在两个地方：
1. **后端 DB**（通过 `POST /api/create/cards/import` 导入的 `GameTemplate`）
2. **前端 localStorage**（`gw_library` 中的 `Game` 对象，只有基础字段）

玩家编辑世界书需要读写后端 DB 的 `WorldbookEntry`。这需要一个"玩家可写的世界书接口"。

**后端需要新增**（`platform/play` 层，不是 `creation` 层）：

```
GET    /api/play/sessions/:id/worldbook        — 读取当前 session 关联游戏的世界书（玩家视角）
POST   /api/play/sessions/:id/worldbook        — 新增词条（玩家私有副本）
PATCH  /api/play/sessions/:id/worldbook/:eid   — 修改词条
DELETE /api/play/sessions/:id/worldbook/:eid   — 删除词条
```

**关键设计**：这些接口操作的是**玩家私有的世界书副本**，不是原始 `GameTemplate` 的词条。

实现方式：
- 方案 A（简单）：直接操作 `WorldbookEntry` 表，但加 `user_id` 字段区分玩家私有词条 vs 原始词条
- 方案 B（干净）：新建 `PlayerWorldbookOverride` 表，存储玩家对特定词条的覆盖（修改/禁用/新增）

**推荐方案 B**：原始词条不动，玩家的修改存在 override 表，引擎合并时优先使用 override。这样：
- 原始游戏包永远可以恢复
- 玩家的修改跟随 session（或 game_id + user_id）
- 不同玩家的修改互不影响

**前端放在哪里**：`WorldbookDrawer` 从只读变为可编辑（内测后实现，Phase 4）。

### 2-B：CW 功能是否抽到 platform 层

**当前分层**：
- `creation/` — 创作者工具（需要 master key 或登录）
- `platform/play/` — 玩家游玩（匿名可用）
- `platform/library/` — 个人游戏库（需要登录）

**玩家编辑世界书**属于"玩家对自己副本的管理"，应该放在 `platform/` 层，不是 `creation/` 层。

**不需要新建文件夹**，放在 `platform/play/` 或新建 `platform/library/` 的子路由即可。`creation/` 的世界书接口是创作者用的（操作原始模板），`platform/` 的是玩家用的（操作私有副本）。

**前端不需要新文件夹**：`WorldbookDrawer` 加编辑功能即可，不需要独立页面。

### 2-C：slug 唯一性

**当前状态**：`GameTemplate.Slug` 有 `uniqueIndex`，DB 层强制唯一。

**需求**：允许不同游戏用相同名称（如两个不同作者都叫"维多利亚"），但 ID（UUID）不能相同。

**结论**：
- `id`（UUID）永远唯一，这是主键，不可变
- `slug` 应该**允许不唯一**，因为 slug 是人类可读的标识符，不同作者可以用相同名字
- 路由 `/games/:slug` 如果 slug 不唯一，需要改为 `/games/:id`（UUID）或 `/games/:author/:slug`

**推荐方案**：
- 去掉 `slug` 的 `uniqueIndex`，改为普通 index
- 路由改为 `/games/:id`（用 UUID），slug 只用于显示
- 或者保留 slug 唯一但加 `author_id` 前缀（如 `anatomy1602/victoria`）

**内测阶段简化**：暂时保持 slug 唯一（只有一个作者），内测后再改。记录为技术债。

### 2-D：LLM 错误处理——参考 SillyTavern

**SillyTavern 的做法**：
- SSE 流式过程中如果 LLM 返回错误，ST 在消息气泡位置显示红色错误提示（不是弹框）
- 错误信息直接显示在对话流中，格式：`[API Error: 401 Unauthorized]` 或 `[Connection failed]`
- 同时在右上角 toast 通知
- 用户可以点击"重试"重新生成

**GW 的方案**：
- 不用弹框（弹框打断体验，且用户可能不知道如何关闭）
- 在消息流中显示错误气泡（红色/警告色），内容是具体错误信息
- `useStreamStore` 增加 `streamError: string | null` 状态
- `TextSessionPage` 在 `streaming === false && streamError !== null` 时在消息列表底部显示错误气泡
- 错误气泡有"重试"按钮（调用 regen）
- 下次发送时清除错误状态

**错误信息分类**：
- `stream closed unexpectedly` → "连接中断，请重试"
- `401` / `403` → "API Key 无效，请检查运行配置"
- `429` → "请求过于频繁，请稍后重试"
- `500` / 其他 → "服务器错误：{原始信息}"

---

## 三、Phase 3 详细任务（内测前）✅ 全部完成（2026-04-12）

### ✅ P3-1：LLM 错误信息显示

**文件**：`src/stores/stream.ts`、`src/pages/play/TextSessionPage.tsx`

**实现**：
- `useStreamStore` 增加 `streamError`/`setError(msg)`/`clearError()`，`humanizeError()` 翻译 401/403/429/500/连接中断
- `endStream()` 不清除 error；`startStream()` 清除 error
- `TextSessionPage` 在消息列表底部渲染红色错误气泡，含"重试"（调用 regen）和"✕"关闭按钮
- `ChatInput` 的 `onError` 回调改为调用 `setError(err.message)`

### 🔜 P3-2：修复世界书显示（待 seed 操作）

**文件**：`.data/games/victoria/game.json`、`.data/games/witcher-world/game.json`、`.data/games/longdu/game.json`

**修复**：在三张游戏的 `config` 里加 `"allow_player_worldbook_view": true`，重新 seed。

### ✅ P3-3：ActionBar 导入逻辑修正

**文件**：`src/components/game/ActionBar.tsx`

**实现**：删除 `slugPrefix`/版本 popover/`allGamesData`；三态按钮：无存档→"▶ 开始游玩"，有存档→"↺ 继续"+"＋ 新存档"；两者都走 `create.mutateAsync` → `addToLibrary` → `nav(/play/:id)`

### ✅ P3-4：存档管理（ArchiveDrawer 增强）

**文件**：`src/components/play/TextSessionTopBar.tsx`、`src/api/sessions.ts`

**实现**：
- `sessionsApi.delete(id)` / `sessionsApi.rename(id, title)` 新增到 sessions API
- ArchiveDrawer 每项右侧加 Pencil/Trash2 图标；inline 重命名（Enter 确认/Escape 取消）
- 删除当前存档时跳回 `/games/:gameId` 详情页；顶部"＋ 新存档"按钮

### ✅ P3-5：统计抽屉显示 session 变量

**文件**：`src/components/play/TextSessionTopBar.tsx`、`src/api/sessions.ts`

**实现**：`sessionsApi.variables(id)` 新增；`StatsDrawer` 接入 `GET /sessions/:id/variables`，5 秒轮询，过滤 `_` 前缀内部变量，monospace 展示 key/value

### ✅ P3-6：游戏包导出（个人库）

**文件**：`src/pages/my-library/MyLibraryPage.tsx`

**实现**：每个游戏卡片加"导出"按钮，触发 `GET /api/create/templates/:id/export` 浏览器下载完整游戏包 JSON（含世界书/Preset/Regex/Materials）

### ✅ P3-7：Markdown 渲染

`MessageBubble` 已用 `react-markdown` + `remark-gfm`（Phase 2 已完成）

### 🔜 P3-8：页面美化

待 ST 对比后确定优先项。

---

## 四、Phase 4 计划（内测后 / 部分后端已就绪）

| 功能 | 说明 | 后端状态 |
|---|---|---|
| WorldbookDrawer 可编辑 | `WorldbookDrawer` 接入 A-20 API，支持词条编辑/新增/恢复 | ✅ 后端已就绪（A-20）|
| 游戏包完整导出（含世界书）| 个人库"导出完整包"按钮 | ✅ 已就绪（A-19）|
| slug 非唯一 + 路由改为 UUID | 允许同名游戏 | 🔜 技术债（A-21）|
| 登录弹窗 + 评论发布 | 点击发评论触发登录 | ✅ 已有后端 |
| ST 角色卡 PNG 导入游玩 | 个人库导入 ST 卡直接游玩 | 🔜 需后端支持 card_id |
| 多 Provider 配置 UI | Cherry Studio 风格，接入 `LLMProfile` CRUD | ✅ 已有后端 |
| `light` / `rich` 渲染器 | VNRenderer + StatusBar | 🔜 中期 |
| Prompt 调试面板 | 接入 `/sessions/:id/floors/:fid/snapshot` | ✅ 已有后端（A-24）|
| 记忆查看面板 | 接入 `/sessions/:id/memories` | ✅ 已有后端（A-23）|

| 首页论坛 | — | — |

---

## 五、后端 API 状态

| 接口 | 状态 | 前端使用 |
|---|---|---|
| `GET /api/play/games` | ✅ | 公共游戏库列表（`WHERE status='published'`）|
| `GET /api/play/games/:slug` | ✅ | 游戏详情 |
| `GET /api/play/games/worldbook/:id` | ✅ | 世界书只读（需 `allow_player_worldbook_view=true`）|
| `POST /api/play/sessions` | ✅ | 创建存档 |
| `GET /api/play/sessions?game_id=` | ✅ | 存档列表 |
| `GET /api/play/sessions/:id` | ✅ | 存档详情 |
| `PATCH /api/play/sessions/:id` | ✅ | 重命名存档 |
| `DELETE /api/play/sessions/:id` | ✅ | 删除存档 |
| `GET /api/play/sessions/:id/stream` | ✅ | SSE 流式游玩（需后端 LLM Key）|
| `GET /api/play/sessions/:id/variables` | ✅ | 变量快照 |
| `POST /api/play/sessions/:id/regen` | ✅ | 重新生成 |
| `POST /api/play/sessions/:id/suggest` | ✅ | AI 帮答 |
| `GET /api/play/sessions/:id/floors` | ✅ | 楼层历史 |
| `POST /api/create/cards/import` | ✅ | PNG 导入（gw_game + chara/ccv3）|
| `POST /api/social/reactions` | ✅ | 点赞/收藏 |
| `GET /api/social/reactions/mine/:type/:id` | ✅ | 我的反应 |
| `GET /api/social/games/:id/comments` | ✅ | 评论列表（只读）|
| `GET /api/social/games/:id/stats` | ✅ | 游戏统计 |
| `GET /api/play/sessions/:id/worldbook` | ✅ 已实现（A-20）| 玩家私有世界书（game+user 级别 override）|
| `PATCH /api/users/:uid/library/:game_id/worldbook/:eid` | ✅ 已实现（A-20）| 玩家编辑词条（upsert override）|
| `GET /api/create/templates/:id/export` | ✅ 已实现（A-19）| 游戏包完整导出（含世界书/Preset/Materials）|

---

## 六、已知技术债

| 债务 | 影响 | 计划 |
|---|---|---|
| `slug` 强制唯一（DB uniqueIndex）| 不同作者不能用同名游戏 | Phase 4 去掉 uniqueIndex，路由改 UUID（A-21）|
| WorldbookDrawer 仍为只读 | 玩家无法在游玩页面编辑世界书 | 后端已就绪（A-20），前端 UI 待实现 |
| `LibraryEntry` 后端写操作需 JWT | 匿名用户用 localStorage 模拟 | Phase 4 登录后接后端 |
| `author_name` 无 users 表 | 显示 UUID 前 8 位 | 永久缺口或 Phase 4+ |
