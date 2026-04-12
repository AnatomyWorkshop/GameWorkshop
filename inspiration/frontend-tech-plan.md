# GameWorkshop 前端技术计划

> 状态：当前有效版本（2026-04-11）
> 范围：只服务四页面 Text MVP

---

## 一、技术目标

这一版技术方案只服务四件事：

1. 公共游戏库的稳定浏览
2. 游戏详情页的稳定导入
3. Text 游戏页的稳定流式游玩
4. 个人游戏库的稳定运行配置管理

不为当前版本预埋：

- VN 播放器
- 论坛系统
- 富媒体游戏容器
- Resident Character

---

## 二、当前保留的技术栈

| 层 | 选型 |
|---|---|
| 框架 | React + TypeScript |
| 构建 | Vite |
| 路由 | React Router |
| 服务端状态 | TanStack Query |
| 本地状态 | Zustand |
| 流式 | `@microsoft/fetch-event-source` |
| 消息虚拟滚动 | `react-virtuoso` |
| Markdown | `react-markdown` + `remark-gfm` |
| 图标 | `lucide-react` |
| 时间 | `date-fns` |

---

## 三、目录目标

```text
src/
├── api/
├── components/
│   ├── chat/
│   ├── game/
│   ├── library/
│   ├── play/
│   └── social/
├── pages/
│   ├── game/
│   ├── game-list/
│   ├── library/
│   └── play/
├── queries/
├── router/
├── stores/
└── styles/
```

重点是：

- `game-list/` 对应公共游戏库
- `game/` 对应详情页
- `play/` 对应 Text 游戏页
- `library/` 对应个人游戏库

---

## 四、当前路由目标

```text
/                    公共游戏库页
/games/:slug         游戏详情页
/play/:sessionId     Text 游玩页
/library             个人游戏库页
```

不再在当前主方案里保留：

- `/forum`
- `/auth`
- `/create`

这些不是当前四页面 MVP 的必要组成。

---

## 五、状态管理原则

## 5.1 TanStack Query

用于：

- 游戏列表
- 游戏详情
- 会话详情 / 楼层
- 评论列表
- 个人库列表

## 5.2 Zustand

只用于：

- 当前流式输出缓冲
- 局部 UI 开关
- 临时交互状态

不再把整套游戏状态都堆进 Zustand。

---

## 六、流式策略

Text 游戏页继续使用：

- `@microsoft/fetch-event-source`

但当前文档不再把流式实现写成“依赖单次 LLM 调用”的方式。  
前端只处理：

- token 事件
- meta / done 事件
- 中止
- 错误回收

---

## 七、模型配置的技术位置

## 7.1 全局维护

全局模型配置维护在：

- `MyLibraryPage`

字段最少包括：

- `base_url`
- `api_key`
- `model_label`

## 7.2 单局切换

Text 页只做：

- 当前 `RuntimeBinding` 查看
- 当前 `model_profile` 切换

不在游玩页直接编辑 URL / Key。

---

## 八、本地运行策略

当用户配置了本地 WE 引擎时，个人游戏库应允许：

- `下载到本地`

对应技术上至少要能处理：

- 本地 WE 可用性探测
- `engine_mode` 切换
- 本地下载状态展示

---

## 九、当前不再推进的技术项

从这一版技术计划中删除：

- shadcn/ui 作为当前核心依赖
- Framer Motion 作为当前必要依赖
- 论坛与发帖编辑器
- 视觉小说渲染器
- 登录注册页
- 全量测试体系承诺

这些不是被永久否定，只是 **不进入当前版本主线**。
