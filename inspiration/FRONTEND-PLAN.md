# GW 前端设计方案——从 text 游戏开始

> 状态：规划中（2026-04-08）
> 策略：从最简单的形式开始，让用户先理解游戏是什么，再逐步引入更丰富的体验。

---

## 一、为什么从 text 游戏开始

文字游戏是 AI 叙事游戏的最纯粹形态：没有立绘、没有 BGM、没有素材依赖。  
玩家和游戏之间只有**文字**。

这恰好是最好的入门路径：
- 理解"AI 游戏是什么"不需要视觉小说包装
- WE 引擎的核心能力（变量沙箱、世界书、记忆）在纯文字里都能体现
- 前端组件最简单，共享率最高，Rich/VN 模式只是在 text 基础上叠加

---

## 二、游戏类型渲染等级

```
text    → 消息流 + 输入框 + 状态栏（可选）
light   → text + 角色立绘区 + 状态栏（固定）+ 选项按钮（全宽）+ 多角色面板
rich-A  → light + 背景图层 + 立绘槽（左/中/右）+ 对话框覆盖层 + 音频
rich-B  → GW 仅提供 iframe 容器 + session 生命周期，创作者自定义整个前端
```

**组件复用关系**：

```
MessageList（text/light/rich-A 共用；rich-B 不用）
ChatInput（text/light/rich-A 共用；rich-B 不用）
ChoiceButtons（light/rich-A；rich-B 由创作者自己实现）
StatusBar（light/rich-A，text 类型可折叠显示）
CharacterPortrait（light/rich-A：角色立绘显示，支持单张/多张）
CharacterSelector（light 多角色：当前对话角色切换面板）
VNScene（仅 rich-A：背景图层 + 立绘槽 × 3，CSS 动画切换）
VNDialog（仅 rich-A：对话框覆盖）
IframeGame（仅 rich-B：iframe 容器 + postMessage 桥接）
```

这个分层保证 text 游戏 100% 可用后，light/rich-A 只是堆积新组件，不需要重写。rich-B 完全绕过 GW 的聊天 UI，直接用 iframe 加载创作者的自定义前端。

---

## 三、Text 游戏在目录中的位置（独立卡片区）

Text 游戏不和 light/rich 游戏平级展示。

| | text 游戏 | light/rich 游戏 |
|---|---|---|
| 玩家感受 | "我在跟这个角色对话" | "我在玩这款游戏" |
| 发现方式 | 像找角色，不像找游戏 | 像找电影，靠封面吸引 |
| 重复访问 | 高（持续对话关系） | 低（打完一遍再玩是重玩） |

**首页/目录分两个区块：**
```
── 「与角色对话」（text 游戏）──
  [角色卡 × N] 头像 + 角色名 + 一句话简介 + 标签 + 在线人数
  点击 → 轻量 Modal（角色简介 + [▶ 开始对话]） → 聊天界面
  有存档时 → 直接进聊天界面

── 「叙事游戏」（light/rich）──
  [封面卡 × N] 完整游戏详情页
```

详细设计见 [TEXT-GAME-CHAT-UI.md](../TEXT-GAME-CHAT-UI.md) 第三章。

---

## 四、Text 游戏 UI 详细设计（原第三章）

### 4.1 页面布局

```
┌─── /play/:sessionId ──────────────────────────────────────────┐
│                                                                  │
│  [TopBar]  ← 游戏名    [历史] [变量] [设置] [分享]               │
│  ────────────────────────────────────────────────────────────   │
│                                                                  │
│  [MessageList]                                    ↑ 虚拟滚动    │
│                                                                  │
│    user:  "我选择帮助她"                                          │
│                                                                  │
│    ai:    "夜歌犹豫了片刻，最终点头。"                            │
│           "「好，我信你。」"                                       │
│           [选项：继续 / 问她原因]                                 │
│                                                                  │
│    [--- 流式输出中：▌ ---]                                       │
│  ────────────────────────────────────────────────────────────   │
│  [ChatInput]  输入你想做的事...              [↻重生成] [发送]    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 消息气泡类型

| 类型 | 样式 | 内容 |
|------|------|------|
| `user` | 右对齐，品牌色背景 | 玩家输入，纯文本 |
| `assistant` | 左对齐，浅色背景 | AI 叙事，Markdown 渲染 |
| `system` | 居中，小字，灰色 | 系统提示（游戏开始、分支创建等） |
| `streaming` | 左对齐，带光标闪烁 | 流式输出中，逐字追加 |

### 4.3 选项按钮

```tsx
// AI 回复包含 options 时，消息气泡下方渲染选项按钮
// 点击任一选项 = 相当于用户发送该选项文字
<ChoiceButtons
  choices={message.options}
  disabled={isStreaming}
  onChoose={(choice) => sendMessage(choice)}
/>
```

选项按钮出现时，输入框变为次级状态（依然可用，但视觉降权，暗示"也可以自由输入"）。

### 4.4 流式输出

```typescript
// useSSE hook 核心逻辑
const turn = async (content: string) => {
  setStreaming(true)
  addStreamingMessage('')  // 添加空的 streaming 消息占位
  
  await fetchEventSource(`/api/play/sessions/${sessionId}/stream`, {
    method: 'POST',
    body: JSON.stringify({ content }),
    onmessage(event) {
      if (event.data === '[DONE]') {
        finalizeStreamingMessage()  // streaming → assistant 类型
        setStreaming(false)
      } else {
        appendToStreamingMessage(event.data)  // 逐 token 追加
      }
    },
    onerror() { setStreaming(false) }
  })
}
```

### 4.5 重新生成与三横菜单

**布局原则**：`≡ 菜单` 放在输入框左侧（和 ST 一致），不是右上角标题栏。
菜单完整功能设计见 [TEXT-GAME-CHAT-UI.md](../TEXT-GAME-CHAT-UI.md) 第一、二章。

第一批实现：重新生成、继续生成、中止、存档列表、新建存档。  
第二批实现：AI 帮写（Impersonate）、检查点/分叉、个人批注（Author's Note）。

---

## 五、世界书修改——边界讨论

这是一个"玩家权限"问题，需要明确三个层次：

### 5.1 创作者世界书（全局，只读）

游戏创作者定义的 WorldbookEntry，影响所有玩这个游戏的玩家。  
**玩家不能修改**，除非创作者显式开放。

**创作者开放时的玩家查看窗口**：

工具栏里"📖 世界书"图标 → 右侧抽屉展示 `WorldbookPanel`：

```
┌── 世界书 ──────────────────────────────────────┐
│  [Tab: 游戏世界书]      [Tab: 我的批注]            │
│  ─────────────────────────────────────────────  │
│  ● 爱丽丝              触发词: 爱丽丝, Alice       │
│    > 是一个对镜子有执念的少女，平日冷淡...          │
│                                                  │
│  ● 镜中世界            触发词: 镜, 魔镜             │
│    > 存在于现实背后的折叠空间...                   │
│                                                  │
│  (只有创作者开放了 allow_player_worldbook 时，     │
│   才显示此 Tab。否则整个图标灰显/不显示)            │
└──────────────────────────────────────────────────┘
```

API：`GET /api/play/games/:id/worldbook-entries`（新建，玩家只读）  
字段投影：不暴露 `position`、`order`（AI 权重）等技术字段，只显示 `keyword`、`content`。

### 5.2 玩家个人批注（Session 级，可写）

**我建议提供的功能**：玩家可以为自己这一局游戏添加个人世界书条目。  

场景：
- 玩家在游玩中建立了自己的理解："在我的故事里，夜歌其实是...（玩家自己的诠释）"
- 玩家想让 AI 记住某件事："在这个 session 里，我的角色名叫阿清"

实现：
```
POST /api/play/sessions/:id/worldbook-entries
{ keyword: "我的角色", content: "主角名叫阿清，是一个侦探学徒" }

这条 entry 只属于这个 session，不影响其他玩家，
注入优先级高于游戏的全局 entry（玩家的个性化高于默认）
```

**前端表现**（"我的批注" Tab）：

```
┌── 我的批注 ───────────────────────────────────────┐
│                                                    │
│  [+ 新增批注]                                      │
│                                                    │
│  📝 我的角色                                       │
│     "主角名叫阿清，是一个侦探学徒"        [编辑] [删]  │
│                                                    │
│  📝 秘密                                           │
│     "爱丽丝知道镜中世界的入口在书房"      [编辑] [删]  │
│                                                    │
└────────────────────────────────────────────────────┘
```

玩家可以新增/编辑/删除自己的批注列表。  
每条批注显示"关键词 → 内容"，和 CW 里的世界书概念一致。

### 5.3 创作者开放协作

创作者在 GameTemplate 里标记 `allow_player_worldbook: true`，  
允许玩家添加的批注在所有玩家间共享（类似维基百科共同编辑）。

**这是社区共创游戏的基础**，但 MVP 阶段不做，只预留接口设计。

---

## 六、WE 引擎能力暴露策略

| WE 引擎功能 | GW 前端暴露方式 | 开放对象 |
|------------|----------------|---------|
| 重新生成（regen） | 重生成按钮 + 气泡滑动 | **所有玩家** |
| Session Fork（从某楼分叉） | 历史面板里每条楼层的"从此分叉"按钮 | **所有玩家** |
| 变量沙箱查看 | 工具栏"变量"图标 → 展示当前变量快照（只读） | **所有玩家** |
| 记忆列表查看 | 工具栏"记忆"图标 → 展示 AI 记住了什么（只读） | **所有玩家** |
| 游戏世界书查看 | 工具栏"世界书"图标 → WorldbookPanel（创作者开放时可见） | **创作者开放后玩家可见** |
| 个人世界书批注 | WorldbookPanel 内"我的批注" Tab | **所有玩家**（会话级） |
| 游戏全局世界书编辑 | 创作者模式专属（不在玩家界面） | **仅创作者** |
| Prompt Preview | 创作者调试专属，玩家不暴露 | **仅创作者** |

**我的意见**：变量查看和记忆查看应该对玩家公开——玩家知道"AI 在跟踪什么"本身就是游戏乐趣的一部分（尤其是 RPG 类游戏里的数值系统）。世界书查看同理，创作者可以用这个作为"设定集"开放给玩家阅读。

---

## 七、Text → Light → Rich 组件演进

### 阶段 1：text 游戏（立即可做）

```
PlayPage
├── TopBar（游戏名 + 工具按钮）
├── MessageList（react-virtuoso，虚拟滚动）
│   ├── MessageBubble（user/assistant/system）
│   │   └── MarkdownRenderer（react-markdown + remark-gfm）
│   ├── ChoiceButtons（AI 回复里有 options 时渲染）
│   └── StreamingBubble（流式输出中）
├── ChatInput（多行输入 + 发送 + 重生成）
└── Drawer 面板（右侧抽屉，工具栏触发）
    ├── HistoryPanel（楼层历史 + 分叉操作）
    ├── VariablePanel（变量快照只读展示）
    ├── WorldbookPanel（游戏世界书 + 我的批注，两 Tab）
    └── MemoryPanel（记忆列表只读）
```

### 阶段 2：light 游戏（text 基础上加）

```
+ CharacterPortrait（立绘显示区，支持单张/多张半身像）
  CharacterSelector（多角色指示器：显示当前对话角色，切换按钮）
  StatusBar（固定在消息流顶部：场景名 / 变量数值可视化）
  ChoiceButtons 改为全宽按钮组（更突出，视觉权重高于输入框）
  ChatInput 在选项模式下视觉降权（暗示"也可以自由输入"）
```

**Light 游戏组件新增细节**：

```tsx
// CharacterPortrait — 立绘图，绝对定位在消息流侧边或顶部
<CharacterPortrait
  characters={activeCharacters}       // 当前场景内角色
  layout="side"                       // "side" | "bottom-left" | "top"
/>

// CharacterSelector — 群聊类游戏（如 Pathway to US High）
<CharacterSelector
  roster={roster}                     // 所有角色列表
  activeId={activeCharacterId}        // 当前对话角色
  onSwitch={(id) => setActive(id)}
/>

// StatusBar — 从 AI 回复的变量快照中解析
<StatusBar
  variables={session.variable_snapshot}  // { hp: 80, affection: 65, scene: "图书馆" }
  highlighted={["hp", "affection"]}      // 创作者在 ui_config 中指定显示哪些变量
/>
```

### 阶段 3a：rich-A 游戏（在 light 基础上加）

```
+ VNScene 层（背景图 + 立绘槽 × 3：left/center/right，Framer Motion crossfade）
  VNDialog 覆盖层（对话框 + 角色名 + 打字机效果 typewriter）
  AudioPlayer（howler.js，BGM 淡入淡出，音效触发）
  消息流折叠到背景层（VN 模式消息流不主导视觉，可选"日志"模式查看）
```

### 阶段 3b：rich-B 游戏（完全不同的渲染路径）

```
PlayPage（rich-B）
└── IframeGame
    ├── <iframe sandbox="allow-scripts allow-same-origin"
    │         src={game.rich_b_url}
    │         onLoad={initBridge} />
    └── postMessage 桥接层
        ├── GW → iframe: { type: "session_init", sessionId, apiToken }
        ├── iframe → GW: { type: "turn_request", content }
        └── GW → iframe: { type: "turn_response", stream: true }
```

GW 不渲染任何游戏内 UI。只负责：  
① 提供 iframe 容器和 session 生命周期管理  
② 通过 postMessage 传递 sessionId + API token  
③ 透传 SSE 流式响应到 iframe  
社交功能（评论/分享）在 GW 主页面层，iframe 外部展示。

---

## 八、UI 主题系统

见 DESIGN-CONCEPTS.md 第五章。补充前端实现细节：

```typescript
// 进入游戏页时
const applyTheme = (config?: UIConfig) => {
  const root = document.documentElement
  const theme = config?.theme ?? 'default'
  
  if (builtinThemes[theme]) {
    const vars = builtinThemes[theme]
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v))
  }
  
  // 覆盖自定义颜色（优先级高于预设）
  if (config?.color_scheme) {
    root.style.setProperty('--bg-main', config.color_scheme.bg)
    root.style.setProperty('--text-main', config.color_scheme.text)
    root.style.setProperty('--accent', config.color_scheme.accent)
  }
}

// 离开时恢复
const resetTheme = () => applyTheme()  // 不传参数 = default
```

---

## 九、路由规划

```
/                         首页（游戏推荐 + 论坛热帖）
/games                    游戏目录（分类/搜索）
/games/:slug              游戏详情（介绍 + 评论 + 攻略）
/play/:sessionId          游玩页（text/light/rich 自动判断）
/forum                    论坛主页（帖子列表）
/forum/:postId            帖子详情
/auth                     登录/注册（MVP 可跳过，匿名游玩）
```

---

## 十、社区卡片分类 vs GW 游戏类型——分析与结论

> 分析日期：2026-04-09  
> 样本：`.data/public/Brain-like/text/`（3 张）+ `.data/public/Brain-like/light/`（1 张）

### 10.1 社区 text 卡（3 张）

| 文件 | 内容 | 渲染需求 |
|------|------|---------|
| `Victoria` | 蒸汽朋克都市 RPG，五大家族，纯文字叙事 | 无特殊需求 |
| `9af3e96e2e99b3d3.png` | 封面图（赛博朋克动漫风，加班/幻境） | 封面图已有 |
| `Image_1775674380514_530.png` | 封面图（凯尔莫罕城堡，奇幻风格） | 封面图已有 |
| `Victory.png` | 封面图 | 封面图已有 |

**结论**：社区 text 卡 = GW `text` 类型，完全对齐。当前 text 游戏前端（`MessageList` + `ChatInput` + `ChoiceButtons` + `StreamingBubble`）已经可以渲染这三张卡，**无需补充任何新组件**。

Victoria 这类重变量追踪的卡（五大家族资源、生存筹码）会用到 `VariablePanel`，这已在 text 游戏工具面板规划中（Phase 3）。

### 10.2 社区 light 卡（足球生涯模拟）

社区将足球生涯模拟卡标记为 `light`，含义是"轻前端美化"（社区语境：相对于纯文字卡，有一些前端增强）。

**GW 的 `light` 类型定义**（见第二章）：
- `CharacterPortrait`（角色立绘）
- `CharacterSelector`（多角色切换）
- `StatusBar`（场景/数值可视化）
- `ChoiceButtons` 全宽模式

**足球卡实际内容**：
- 八维能力数值（速度/射门/盘带/传球/防守/体格/精神/稳定性）+ 体能 + 状态 + 健康
- 转会市场、国家队、升降级、更衣室氛围
- 自动变量结算（比赛后自动更新所有数值）
- **没有角色立绘，没有场景图，没有多角色切换**

**结论：GW 不应沿用社区的 `light` 分类。**

足球卡是 `text` 类型 + 重变量追踪，不是 GW 的 `light` 渲染层。两者的区别：

| | 社区"light" | GW `light` |
|---|---|---|
| 含义 | 轻量前端增强（相对纯文字） | 立绘 + 状态栏 + 全宽选项 |
| 足球卡 | ✅ 符合（有变量追踪） | ❌ 不符合（无立绘/场景图） |
| 渲染路径 | 不定义渲染路径 | 明确的组件层级 |

足球卡在 GW 里应分类为 `text`，通过 `VariablePanel`（工具面板）展示八维数值，不需要 `CharacterPortrait` 或 `StatusBar`。

**对 GW 类型系统的影响**：GW 的游戏类型（`text` / `light` / `rich-A` / `rich-B`）是**渲染层级**，不是"复杂度等级"。创作者导入社区卡时，需要根据 GW 的渲染层级重新分类，而不是直接沿用社区标签。

---

## 十一、MVP 第一批实现目标

```
Week 1：
  ✅ 项目初始化（Vite + React + TS + Tailwind + shadcn/ui）
  ✅ 路由骨架（React Router）
  ✅ API client 封装（baseURL + error handling）

Week 2：
  ✅ 游戏详情页（见 PLAN/GW-DETAIL-PAGE-PLAN.md）
  ✅ 评论区只读

Week 3：
  ✅ Text 游戏游玩页（消息流 + SSE 流式 + 重生成）
  ✅ UI 主题系统（default + terminal 两套）

Week 4：
  ✅ 论坛帖子列表 + 详情页
  ✅ 常驻角色浮窗骨架（连接 resident session，但先做 UI）
```
