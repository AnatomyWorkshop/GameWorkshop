# GW 产品设计概念

> 版本：2026-04-10 v8（MVP 代码已实现，前端规格迁移至 PLAN 文档）

---

## 一、ST 设计分析

> 从多个视角分析 SillyTavern 的 UI 设计，提取对 GW 有价值的模式。

### 1.1 底部输入区布局（源码实测）

ST 的 `#send_form` 结构：

```
┌──────────────────────────────────────────────────────────────┐
│  [☰]  [  你的行动…（textarea）                    ]  [🕵][→][✈]  │
│  左侧   中间（flex-1）                              右侧        │
└──────────────────────────────────────────────────────────────┘

左侧 #leftSendForm：
  ☰  options_button → 弹出菜单（含 Regenerate / Impersonate / Continue / Delete）

右侧 #rightSendForm（从左到右）：
  ⏹  mes_stop       → 中止生成（生成中才显示）
  🕵  mes_impersonate → "让 AI 替你写这条消息"（Impersonate）
  →   mes_continue   → 续写最后一条 AI 消息
  ✈   send_but       → 发送
```

**关键设计决策：**
- Swipe（◀ ▶）不在输入栏，而是**直接附在最后一条 AI 消息上**
- Regenerate 在左侧 ☰ 菜单里，不是独立按钮
- Impersonate（AI 帮你写）在右侧，与发送并列

### 1.2 角色选择流程（"酒馆"隐喻）

```
角色库（左侧面板）
  ├── 角色卡片列表（头像 + 名字 + 简介）
  ├── 点击角色卡片 → 直接进入聊天
  └── 导入按钮 → 从文件/URL 导入角色卡 PNG
```

ST 的核心隐喻：**你在酒馆里，角色们坐在那里等你搭话**。点击角色 = 走过去开始聊天，不需要"开始游玩"这种游戏化措辞。这个隐喻对 GW 的 text 游戏同样适用：

- text 游戏本质上是"带游戏规则的角色卡"
- 玩家不是在"开始一局游戏"，而是在"进入这个角色/世界"
- 动作词应该是**"导入"**（把这个世界载入你的会话）

### 1.3 消息渲染模式

ST 的消息模板（`#message_template`）：

```
┌─────────────────────────────────────────────────────────────┐
│  [头像]  角色名  · 时间戳                    [编辑] [···]   │
│          ◀                                              ▶   │  ← Swipe 箭头（仅最后一条消息）
│          消息内容（支持 Markdown）                          │
└─────────────────────────────────────────────────────────────┘
```

- 每条消息有头像、名字、时间戳
- 最后一条 AI 消息有 Swipe 箭头（◀ ▶）
- 消息操作（编辑/删除/复制）hover 时显示

### 1.4 GW 的设计立场

以下是 GW 独立形成的设计判断，ST 只是参照系：

- **左下角放辅助操作**：重生成、AI帮答这类"不是发送消息"的操作，放左侧与发送按钮分区，避免误触
- **右下角只有发送**：发送是唯一主操作，生成中变为停止按钮
- **无头像**：GW 的 text 游戏叙述者是"游戏世界本身"，不是具体角色，去掉头像更沉浸
- **"导入"而非"开始游玩"**：text 游戏本质是带游戏规则的角色卡，玩家是在把这个世界载入自己的会话
- **Swipe 暂不实现**：MVP 简化，alternate_greetings 支持后再做

---

## 二、MVP 页面视觉形态

> 前端规格已全面迁移至 `PLAN/GW-MVP-FRONTEND-PLAN.md`，本节仅保留游戏库页线框图作为参照。

### 2.1 游戏库页（GameListPage）

**路由：** `/`  
**定位：** 所有类型游戏的发现入口，统一展示，点击进详情页。

```
┌─────────────────────────────────────────────────────────────┐
│  ◈ GameWorkshop                                             │  ← 顶部导航，56px
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │          │  │          │  │          │  │          │  │
│  │ [封面图] │  │ [封面图] │  │ [封面图] │  │ [封面图] │  │  ← 16:9，object-cover
│  │      [T] │  │      [T] │  │      [L] │  │      [R] │  │    无封面时用 id 生成渐变色
│  ├──────────┤  ├──────────┤  ├──────────┤  ├──────────┤  │    右上角类型徽章（T/L/R）
│  │ 猎魔人世界│  │ 让我听听 │  │ 游戏三   │  │ 游戏四   │  │  ← 标题
│  │ 在废墟中…│  │ 因果织网…│  │          │  │          │  │  ← short_desc，line-clamp-2
│  │ 1.2k 玩  │  │ 856 玩   │  │          │  │          │  │  ← play_count
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│                                                             │
│              [ 加载更多 ]                                   │
└─────────────────────────────────────────────────────────────┘
```

**网格：** 2列（移动）/ 3列（平板）/ 4列（桌面）  
**交互：** 点击任意卡片 → `/games/:slug`，所有类型统一走详情页

> 详情页、游玩页完整规格见 `PLAN/GW-MVP-FRONTEND-PLAN.md`。

---

## 三、组件解耦架构

```
src/components/
├── game/                    ← 游戏展示组件（与游玩无关）
│   ├── GameCard.tsx         ← 列表卡片
│   ├── HeroSection.tsx      ← 详情页封面
│   ├── ActionBar.tsx        ← 详情页操作栏
│   └── StatsBar.tsx         ← 详情页统计
│
├── play/                    ← 游玩页专属组件（未来可整体替换风格）
│   ├── TopBar.tsx           ← 游玩页顶栏
│   └── （chat/ 目录下的消息/输入组件）
│
└── social/
    └── CommentCore.tsx      ← 评论列表（linear/nested 由 props 控制）
```

**解耦原则：** `play/` 不引用 `game/`，反之亦然。替换游玩风格只需替换 `play/` 目录。

---

## 四、导航流程

```
GameListPage (/)
    └─ 点击任意游戏卡片
            ▼
    GameDetailPage (/games/:slug)
            ├─ 「⬇ 导入」→ POST /sessions → PlayPage (/play/:sessionId)
            └─ 「↺ 继续」→ PlayPage (/play/:sessionId)

PlayPage (/play/:sessionId)
    └─ 「← 返回」→ history.back() → GameDetailPage
```

---

## 五、角色体系

### 5.1 三个层次

**CharacterCard（角色卡）**  
对一个角色的静态描述。人格、背景、说话风格、外貌。  
归属 CW 层，由创作者制作，可复用跨游戏。

**常驻角色（Resident Character）**  
绑定到用户账号、拥有持久记忆的角色实例。  
不属于单一游戏，属于用户在 GW 平台的全局体验。  
近期形态：看板娘 / 个人管家（RESIDENT-CHARACTER.md）。

**游戏内角色（Game Character）**  
在一次游玩中出现的角色，由叙事者 LLM 统一扮演。  
存在于 WorldbookEntry 和 SystemPromptTemplate 中，不是独立 AI 实例。

### 5.2 常驻角色过渡期（游戏角色 → 常驻角色）

玩完一局游戏，玩家可以"把角色带出来"——将游戏中积累的世界书条目 + 高重要性记忆迁移到常驻角色位置。

**可迁移：** CharacterCard + 角色相关世界书条目 + 高重要性 Memory  
**不迁移：** 完整对话历史 + 其他 NPC 的世界书条目

---

## 六、三类游戏的精确定义

### Text 游戏（T）

**定义：** 纯 AI 对话驱动，界面完全由 GW 提供。

- 无立绘、无背景图、无 BGM
- 单角色或多角色纯文字对话
- 可以有 UI 主题（terminal/romance/dark 等）
- 交互：自由文本输入 + 可选的选项按钮

**评论区：** 作者选择 `linear`（线性留言板）或 `nested`（盖楼讨论）

### Light 游戏（L）

**定义：** 有视觉元素，但 UI 主体仍是 GW 提供的聊天框架。

- 角色立绘（半身像）
- 状态栏（HP、好感度、时间等变量可视化）
- 选项按钮（更突出，全宽）
- 可选：静态背景图

**评论区：** 默认 `nested`，可配 `linear`

### Rich 游戏（R）

**Rich-A：视觉小说（VN）**  
背景图层 + 立绘槽 × 3 + BGM/音效 + 场景切换动画 + VN 对话框

**Rich-B：独立应用级游戏**  
完全自定义前端（React SPA、PixiJS 等），通过 GW_API_TOKEN 接入 WE REST API。  
GW 提供 iframe 容器 + postMessage 协议 + session 生命周期管理。  
类比：Steam 与独立游戏的关系。

---

## 七、游玩过程作为媒体

存档 = 叙事档案（对话序列 + 状态变化轨迹），天然可读、可分享、可剪辑。

| 操作 | 描述 | 后端 |
|------|------|------|
| 分享全程 | 整个 session 作为游记 | `POST /api/social/posts { session_id, type: "journal" }` |
| 剪辑片段 | 选取楼层范围生成精彩片段 | `POST /api/social/posts { session_id, floor_from, floor_to }` |
| 边界归档 | 游玩结束时结构化归档 | `POST /sessions/:id/archive` |

---

## 八、Text 游戏 UI 主题系统

创作者在 CW 中配置 `GameTemplate.config.ui_config`：

| 预设主题 | 风格 | 适合游戏 |
|---------|------|---------|
| `default` | 深色 + 紫色 accent | 通用 |
| `terminal` | 纯黑 + 绿色等宽字体 | 黑客/赛博/命令行 |
| `ink` | 米色 + 衬线字体 | 文学/侦探/古风 |
| `romance` | 浅粉 + 大圆角 | 恋爱/轻小说 |
| `dark` | 深灰 + 冷色 | 克苏鲁/恐怖/暗黑 |

---

## 九、创作者控制 UI 模式（input_mode）

> 前端实现规格见 `PLAN/GW-MVP-FRONTEND-PLAN.md` 第五节。

### 核心设计理念

text 游玩页应该能渲染**所有** text 游戏——从纯自由输入的叙事游戏，到三选一的互动小说，到足球经理这类需要复杂指令的策略游戏。UI 模式由创作者在游戏包中声明，玩家无需配置。

**创作者可以发布同一游戏的多个 UI 版本**，玩家在详情页选择导入哪个版本。这是游戏包级别的版本，不是运行时切换。

### `input_mode` 字段

创作者在 `GameTemplate.Config.ui_config` 中声明：

```json
{
  "input_mode": "free",
  "fallback_options": ["继续", "查看周围", "等待"],
  "avatar_mode": "none"
}
```

| `input_mode` 值 | 含义 | 输入区形态 |
|----------------|------|-----------|
| `free`（默认）| 纯自由文本输入 | textarea + 发送按钮 |
| `choice_primary` | 选项优先，自由输入为辅 | 选项按钮突出，textarea 降权 |
| `choice_only` | 仅选项，无自由输入 | 隐藏 textarea，只显示选项按钮 |
| `command` | 命令行风格 | 等宽字体 textarea |

### 选项来源优先级

```
AI 回复解析出 options（TurnResponse.options 非空）
    ↓ 优先使用
fallback_options（GameTemplate.Config.fallback_options）
    ↓ AI 未返回选项时兜底
无选项（choice_only 模式下显示"等待 AI 回复…"占位）
```

后端已实现（`game_loop.go:471-472`），前端只需读取 `TurnResponse.options`。

---

## 十、伴随槽（Companion Slot）

**阶段 1（当前 MVP）：** 常驻角色独立于游戏，仅在平台 UI 层运行。

**阶段 2（中期）：** Companion Slot 上线。创作者声明伴随槽，玩家开始游戏前可选"带谁进去"。实现为动态 WorldbookEntry 注入，不需要改引擎。

**阶段 3（长期）：** 同伴有独立 LLM 调用和独立记忆，真实多人共演 session。需要引擎大改，暂不规划。

---

## 十一、开放问题

1. **Rich-B 游戏的 JS 沙箱方案？**  
   → iframe（`sandbox="allow-scripts"`）+ postMessage，不能访问 GW 主域名和 localStorage。

2. **多角色（群聊）映射到 WE 的单叙事者？**  
   → WE 叙事者统一扮演所有角色。失去多模型差异化，MVP 阶段可接受。

3. **动态世界书创建（温知夏的初始化流程）？**  
   → 需要前端表单 + 后端批量创建 session 级世界书条目的 API。

4. **Text 游戏评论区由谁决定风格？**  
   → 创作者在 `game_comment_config.default_mode` 里二选一（`linear`/`nested`）。

5. **Rich-B 游戏上架审核？**  
   → 需要创作者协议 + 内容分级（SFW/NSFW 标签）。JS 代码只在玩家浏览器的 iframe 沙箱里运行。
