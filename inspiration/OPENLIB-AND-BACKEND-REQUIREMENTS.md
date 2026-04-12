# 开源库参考 + 当前后端需求

> 状态：按 2026-04-11 的代码与产品判断整理
> 用途：只保留当前 MVP 真的会用到的库，以及仍然存在的接口需求

---

## 一、开源库：当前 MVP 已确认

## 1.1 当前实际使用 / 继续保留

| 库 | 用途 |
|----|------|
| `react` + `typescript` | 页面与类型系统 |
| `react-router-dom` | 四页面路由 |
| `@tanstack/react-query` | 服务端状态 |
| `zustand` | 本地 UI / 流式状态 |
| `react-virtuoso` | Text 消息流虚拟滚动 |
| `@microsoft/fetch-event-source` | SSE 流式回合 |
| `react-markdown` + `remark-gfm` | Text 消息 Markdown 渲染 |
| `date-fns` | 时间展示 |
| `lucide-react` | 图标 |

## 1.2 当前先不进入 MVP

以下库先不纳入本轮 MVP 主线：

| 库 | 原因 |
|----|------|
| `shadcn/ui` | 当前四页面并不依赖它才能成立 |
| `React Hook Form` / `Zod` | 模型配置表单后续再引入 |
| `Framer Motion` | Text MVP 不需要它才能发行 |
| `@uiw/react-md-editor` | 当前四页面不含论坛编辑器 |
| `howler.js` | 当前不做 VN 音频 |
| 代码高亮库 | 当前不做论坛正文页 |

结论：**MVP 先只保留真正进入四页面的依赖。**

---

## 二、前端对后端的约束：不再写 One-shot

当前 GW 前端文档以后统一遵守：

- 不写 `One-shot`
- 不写“每回合只调用一次 LLM”
- 不根据 narrator / director / verifier 的内部编排设计页面

原因很简单：后端当前真实结构已经不是严格的单次调用策略。  
前端只消费：

- 会话接口
- 流式事件
- 世界书 / 评论 / 游戏详情等公开接口

---

## 三、当前 `backend-v2` 已有、可直接复用的能力

下面这些能力不再记为“后端缺口”：

### 3.1 已有公开游戏接口

- `GET /api/play/games`
- `GET /api/play/games/:slug`
- `GET /api/play/games/worldbook/:id`

### 3.2 已有游玩相关接口

- `POST /api/play/sessions`
- `GET /api/play/sessions/:id/stream`
- `POST /api/play/sessions/:id/regen`
- `GET /api/play/sessions/:id/floors`
- `POST /api/play/sessions/:id/suggest`

### 3.3 已有社交接口

- `GET /api/social/games/:id/stats`
- `GET /api/social/games/:id/comments`
- reaction 路由

### 3.4 已有模型配置能力（可复用，但还没形成玩家端体验）

后端已有：

- `llm profile` CRUD
- slot / scope 绑定

所以当前缺的不是“底层完全没有”，而是：

> 玩家端该如何把这套能力收敛成个人游戏库与单局切换体验。

---

## 四、当前仍然存在的接口与契约问题

## 4.1 Session 详情契约必须收口

`TextSessionPage` 需要稳定拿到：

- `session_id`
- `game_id`
- 会话归属信息

如果前端继续依赖：

- `GET /api/play/sessions/:id`

那就必须确保这个接口在源码和运行态都明确存在；  
否则前端必须改为不依赖它。

这是当前最优先的契约问题之一。

## 4.2 评论 API 返回结构必须统一

当前评论接口文档与前端调用之间仍有历史漂移风险。  
MVP 统一采用一种分页方式即可，推荐：

- **offset 分页**

返回结构建议统一为：

```json
{
  "items": [],
  "total": 0,
  "limit": 20,
  "offset": 0
}
```

不要同时保留：

- `cursor`
- `next_cursor`
- `items`
- `comments`

这类双轨结构。

## 4.3 `comment_config` 必须进入前端类型

后端已经在游戏详情返回里附带 `comment_config`。  
当前 MVP 前端必须真正接住它，用来决定：

- `Flow`
- `Thread`

否则这部分接口价值无法落地。

## 4.4 `input_placeholder` 需要进入公开游戏响应

Text 页底部输入框需要精确占位提示。  
因此公开游戏详情至少要能取到：

```json
ui_config: {
  input_placeholder: "..."
}
```

如果这个字段当前没有稳定透出，应补为公开字段。

---

## 五、围绕个人游戏库的新增需求

这些需求不一定都由 `backend-v2` 独立承担，但它们是 GW MVP 的真实需求。

## 5.1 个人游戏库需要独立于公共游戏库

个人游戏库不是公共库的一个筛选态，而是单独的产品对象。  
因此最少要有一层稳定的数据结构来表示：

- 我的已导入游戏
- 导入来源
- 当前运行模式
- 最近游玩状态

如果短期不做服务器侧 `LibraryEntry` 表，也至少要有清晰的前端本地持久化规则。

## 5.2 公共导入默认云端

产品策略建议固定为：

- 从公共 `CatalogEntry` 导入后，默认 `engine_mode = cloud_default`

这是产品规则，不再摇摆。

## 5.3 本地 WE 已配置时，需要“下载到本地”

这是一条新的 MVP 需求，不应再模糊表述。

它的产品含义是：

- 游戏包与素材尽量转到本地
- 非 LLM 内容尽量不联网
- LLM 调用是否联网，取决于当前 `model_profile`

因此前后端 / GW 本地层至少要支持：

- 检测本地 WE 是否可用
- 为 `LibraryEntry` 切换 `engine_mode`
- 执行本地下载 / 同步

## 5.4 同系列版本共享运行配置

当前需要引入 `SeriesKey` 与 `RuntimeBinding` 的明确规则：

- 同一详情页导入的不同版本共享同一组默认运行配置
- 同一游戏的不同存档共享同一组默认运行配置
- 单局可临时切换，但默认回写到该 `SeriesKey`

这是当前个人游戏库设计里的关键需求。

## 5.5 玩家侧模型配置需要收敛成清晰入口

后端已有 profile/binding 能力，但玩家端要形成两级入口：

### 全局维护位置

`MyLibraryPage`

可维护：

- `base_url`
- `api_key`
- `model_label`
- 默认 `model_profile`

### 单局切换位置

`TextSessionPage` 顶栏 `···`

只做：

- 当前会话 / 当前系列的 profile 切换
- 当前运行方式查看

不在游玩页直接编辑 URL / Key。

---

## 六、当前 MVP 不再列为后端缺口的内容

以下内容不再作为本轮“必须补”的后端项：

- `stats` 接口
- `suggest` 接口
- `slug 或 UUID 查询游戏详情`
- 世界书玩家只读接口

它们已经不应该继续出现在“缺口清单”里。

---

## 七、当前后端需求优先级

### P0

1. `session detail` 契约收口
2. 评论返回结构统一
3. `comment_config` 前端类型接线
4. `input_placeholder` 明确公开

### P1

1. 个人游戏库的数据归属规则
2. `RuntimeBinding` 的持久化规则
3. 公共导入默认云端
4. 本地 WE 可用时的本地下载策略

### P2

1. 剪辑分享
2. 更细的搜索 / 统计面板
3. 论坛与帖子页

---

## 八、这份文档的结论

当前文档不再把“旧缺口”一股脑重复记录。  
它只保留两类信息：

- 真正还缺的契约
- 因为个人游戏库进入 MVP 而新增的真实需求
