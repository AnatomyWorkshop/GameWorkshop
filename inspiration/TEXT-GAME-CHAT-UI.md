# Text 游戏聊天界面设计——酒馆功能对齐

> 状态：设计草稿（2026-04-08）
> 策略：第一次设计 text 游戏 UI 时就把布局骨架做对，功能可以分批实现，但位置不能事后补

---

## 一、酒馆（SillyTavern）功能清单与 WE 对应

ST 的输入区左下角 `fa-bars` 三横线菜单（`#options`）完整功能：

| ST 功能 | ST 元素 ID | WE/GW 对应 | 实现阶段 |
|---------|-----------|-----------|---------|
| Author's Note | `option_toggle_AN` | 个人世界书批注（Session 级 WorldbookEntry） | 阶段 2 |
| Save checkpoint | `option_new_bookmark` | `POST /api/play/sessions/:id/fork`（从当前楼位置分叉） | 阶段 2 |
| Start new chat | `option_start_new_chat` | `POST /api/play/sessions { game_id }` | 阶段 1 |
| Manage chat files | `option_select_chat` | 存档列表 SessionPicker | 阶段 1 |
| Delete messages | `option_delete_mes` | WE 不支持删除单条消息（设计不同，不做） | - |
| Regenerate | `option_regenerate` | `POST /api/play/sessions/:id/regen` | **阶段 1** |
| Continue | `option_continue` | `POST /api/play/sessions/:id/turn { content: "" }` | 阶段 1 |
| Impersonate | `option_impersonate` | `POST /api/play/sessions/:id/turn { impersonate: true }` | 阶段 2 |
| CFG Scale / Token Prob | - | WE 不暴露采样参数（云端固定模型） | 不做 |
| Convert to group | - | Play2 / Companion Slot（长期） | 长期 |

ST 输入区右侧按钮（常驻显示）：

| ST 功能 | 对应 | 阶段 |
|---------|------|------|
| Abort（红色停止） | 取消 SSE 请求 `AbortController.abort()` | **阶段 1** |
| Continue（→ 箭头） | Continue 快捷按钮（同菜单里的 Continue） | 阶段 1 |
| Impersonate（侦探图标） | AI 代写你的消息 | 阶段 2 |

ST 每条消息上的操作按钮（hover/长按显示）：

| ST 功能 | 对应 | 阶段 |
|---------|------|------|
| Edit message | 玩家可以编辑自己的消息（重新发送） | 阶段 1 |
| Delete message | WE 设计上不删消息（Floor 是不可变历史） | 不做 |
| Create checkpoint（书签旗子）| Fork session from this floor | 阶段 2 |
| Swipe（左右箭头切换版本）| Page 切换，`PATCH .../pages/:pid/activate` | **阶段 1** |
| Copy message | 复制文本到剪贴板 | 阶段 1 |

---

## 二、布局骨架（第一次就做对）

**原则**：功能可以灰显/隐藏，但 DOM 结构和视觉位置在第一版就定下来。

```
┌── TextPlayPage ──────────────────────────────────────────────────────┐
│                                                                        │
│  [TopBar]                                                              │
│    ← 游戏名（点击返回详情页）                    [历史] [批注] [分享]  │
│  ─────────────────────────────────────────────────────────────────    │
│                                                                        │
│  [MessageList]   ← react-virtuoso，全高，占据剩余空间                  │
│    ...                                                                 │
│    [user bubble]     我选择帮助她                                      │
│    [ai bubble]       夜歌点了点头...                                   │
│                      [◁ 1/3 ▷]  ← Swipe 页码指示器（多版本时显示）   │
│                      [选项 A]  [选项 B]  [自由输入]  ← ChoiceButtons  │
│    [streaming]       ▌                                                 │
│  ─────────────────────────────────────────────────────────────────    │
│                                                                        │
│  [InputArea]                                                           │
│    [≡ 菜单]  [textarea]  [→ 继续] [○ 停止 / ✈ 发送]                  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

**重要设计决定**：`≡ 菜单` 放左下角（和 ST 一致），不是右上角。  
这是玩家操作最频繁的区域（重新生成、继续、存档）—— 靠近输入框而不是靠近标题栏。

### 菜单（三横线弹出面板）内容

```
────────── 游玩操作 ──────────
↻  重新生成              regenerate（阶段 1）
→  继续生成              continue（阶段 1）
🕵 AI 帮写               impersonate（阶段 2）
────────── 存档管理 ──────────
📂 存档列表              session picker（阶段 1）
🆕 开始新存档            new session（阶段 1）
🚩 保存检查点            fork（阶段 2）
🔙 回到主存档            back to parent（阶段 2）
────────── 个性化 ──────────
📝 个人批注              annotation（阶段 2）
🎨 主题设置              theme picker（阶段 3）
────────── 其他 ──────────
📤 分享/导出             export to post（阶段 2）
```

---

## 三、Text 游戏在游戏目录的位置——独立卡片区

用户提出：text 游戏不应该和 light/rich 游戏平级展示，应该有自己的入口区。

**我同意这个判断，理由：**

| 维度 | text 游戏 | light/rich 游戏 |
|------|-----------|----------------|
| 核心体验 | AI 对话，探索叙事空间 | 视觉叙事，定向推进 |
| 封面依赖 | 低（甚至可以无封面） | 高（立绘/背景是内容的一部分） |
| 重复访问 | 高（像在跟一个角色持续对话） | 低（打完一遍，再打是重玩） |
| 发现方式 | 像"找角色"，不像"找游戏" | 像"找电影"，通过视觉封面吸引 |

**方案：首页/目录分两个区**

```
────── 「与角色对话」（text 游戏区）──────
  [角色卡片 × N]  → 显示立绘/头像 + 角色名 + 简介 + 标签
  点击 → 跳转至 text 游戏聊天界面（不经过详情页，或展示轻量详情 Modal）

────── 「叙事游戏」（light/rich 游戏区）──────
  [游戏封面卡 × N]  → 显示封面图 + 标题 + 玩家数 + 简介
  点击 → 游戏详情页（有完整 Tab 结构）
```

**Text 游戏卡片样式（角色卡）**：

```
┌─────────────────────┐
│  [角色立绘/头像]     │
│  夜歌                │
│  冷漠侦探，温柔内心   │
│  #悬疑 #现代 #成人   │
│  ● 234 人正在对话    │
│  [▶ 开始对话]        │
└─────────────────────┘
```

这比"游戏封面 + 标题"更直观——玩家第一眼看到的是"角色"，而不是"游戏包"。

**跳转路径**：

```
text 游戏卡片点击
  └─ 有存档？→ 直接进入聊天界面（自动加载最近存档）
  └─ 无存档？→ 轻量 Modal（角色简介 + [▶ 开始] 按钮）→ 进入聊天界面
  （不经过完整的 Tab 式游戏详情页）
```

light/rich 游戏保持完整详情页（概述 Tab + 评论 Tab + 攻略 Tab）。  
text 游戏的"评论区"和"攻略"通过 Modal 内的 Tab 或游玩页内的侧边抽屉访问。

---

## 四、评论区风格随游戏类型变化

依据 `GW-COMMENT-INTERACTION-DESIGN.md`，创作者通过 `game_comment_config.default_mode` 配置：

| 游戏类型 | 推荐评论模式 | 可选模式 | 典型 UI |
|---------|------------|---------|---------|
| `text` | `linear`（线性消息流） | `nested` | 像聊天室的气泡留言板 |
| `light` | `nested`（盖楼式） | `linear` | 传统评论区（B 站/Bilibili 风格） |
| `rich` | `nested` | `nested` + `roundtable`（Phase 2）| 按话题分组 |

### 前端实现：评论组件工厂

```typescript
// 根据 comment_config.default_mode 选择渲染组件
function CommentSection({ gameId, config }: Props) {
  const mode = config?.default_mode ?? 'nested'
  
  if (mode === 'linear') return <LinearFeedComment gameId={gameId} />
  if (mode === 'nested') return <NestedThreadComment gameId={gameId} />
  // 未来：if (mode === 'roundtable') return <RoundtableComment gameId={gameId} />
}
```

### LinearFeedComment（线性消息流）

```
┌── 评论区 ─────────────────────────┐
│                                    │
│  [用户A头像] 这个结局让我哭了       │
│             12分钟前  ❤ 3           │
│                                    │
│  [用户B头像] 夜歌的声线描写太好了   │
│             1小时前  ❤ 8  [回复]   │
│                                    │
│  [用户C头像] → @用户B 同感！第七章  │
│             2小时前  ❤ 1           │
│                                    │
│  [输入框] 写一条评论...  [发布]     │
└────────────────────────────────────┘
```

- 纯时序排列，不树形嵌套
- `@用户名` 引用可见，但不缩进
- 适合 text 游戏的"共同讨论"氛围，像聊天室

### NestedThreadComment（嵌套盖楼）

```
┌── 评论区 ─────────────────────────┐
│  [主楼 1]  这游戏的分支好复杂       │
│     ↳ [回复] 是的，我找到了隐藏线   │
│     ↳ [回复] 求攻略！              │
│                                    │
│  [主楼 2]  结局 B 才是真结局？      │
│     ↳ [回复] 其实结局 C 更好       │
│     ↳ [查看全部 3 条回复]          │
└────────────────────────────────────┘
```

- 主楼 + 折叠子楼
- 适合 light/rich 游戏的攻略讨论

### text 游戏的"评论区"在哪里

text 游戏没有完整详情页，评论区通过以下��种方式访问：

1. **游玩页内侧边栏**：工具栏里一个"💬 评论"图标，点开右侧抽屉展示 LinearFeedComment
2. **轻量详情 Modal 内的第二个 Tab**：角色卡 Modal 里的"评论" Tab

两者共用同一个 `LinearFeedComment` 组件，只是展示容器不同。

---

## 五、存档转移到常驻角色（过渡期设计）

用户提出：玩完《镜中游戏》后，可以把爱丽丝（含世界书 + 存档）搬到常驻角色位置。

**这是可行的**，分析如下：

### 什么可以迁移

| 数据类型 | 迁移方式 | 可行性 |
|---------|---------|-------|
| CharacterCard | 爱丽丝的角色卡在 CW 里本身就有 | ✅ 直接引用 |
| 游戏世界书条目 | `GET /api/play/games/:id/worldbook-entries`，筛选爱丽丝相关条目 | ✅ 需要新 API |
| 游玩记忆（高重要性）| `GET /sessions/:id/memories?min_importance=7` | ✅ 已有 API |
| 完整对话历史（Floors）| 不迁移——游玩历史留在原 session，可以"关联"但不"搬移" | ⚠️ 不直接迁移 |
| 变量快照 | 选择性：将关键变量（affection/route/endings）提炼为 Memory 条目 | ✅ 结构化归档后可提取 |

### 迁移流程（前端操作）

```
游玩结束或玩家主动触发 →
  弹窗："是否将爱丽丝带到你的 GW 管家位置？"
  [确认] →
    1. 提取爱丽丝 CharacterCard ID
    2. GET /sessions/:id/memories?min_importance=7  → 提取重要记忆
    3. 前端调用 POST /sessions/:resident_id/memories（批量写入常驻 session）
       content: "（来自《镜中游戏》）爱丽丝在真结局选择了信任主角，好感度 92"
    4. PATCH /users/:id/resident_character { character_card_id: alice_card_id }
       （更换常驻角色的底层 CharacterCard）
    5. 提示："爱丽丝已经来到你的工坊，记得去找她聊聊。"

游玩历史（session）留在原地，通过"游记"形式在玩家主页可见
```

### 技术关键点

- **常驻角色 session 保持连续性**：换角色卡后，旧记忆依然存在，只是由新角色来"解释"这些记忆（如果新角色是爱丽丝，记忆对她来说是自然的）
- **不破坏原游戏 session**：迁移只是"复制高价值记忆"，原 session 完整保留可回查
- **多角色问题**：用户现在的常驻角色可能不是默认管家，而是从另一个游戏带来的角色——这是意图，允许随时切换

### 需要的新后端 API

```
GET  /api/play/games/:id/worldbook-entries          游戏世界书条目（玩家只读）
POST /api/users/:id/resident_character              设置/更换常驻角色
     { character_card_id, import_session_id? }       可选：同时导入该 session 的记忆
```

---

## 六、实现次序与可行性总结

### 第一批（text 游戏可玩的最小集合）

```
✅ 布局骨架（TopBar + MessageList + InputArea + 三横菜单位置）
✅ SSE 流式消息（发送 + 实时追加）
✅ Swipe（多版本切换，已有 WE Page 机制）
✅ 重新生成
✅ 继续生成
✅ 中止（AbortController）
✅ 存档列表 / 新建存档
✅ ChoiceButtons（AI 回复里的选项）
✅ 消息编辑（重新发送）
```

### 第二批（酒馆对齐 + 角色体验）

```
⬜ Impersonate（AI 帮写玩家消息）
⬜ Fork（保存检查点 / 从某楼分叉）
⬜ 个人批注（Author's Note 对应物）
⬜ 游戏内变量面板（只读展示）
⬜ 游记分享（剪辑楼层 → 发布论坛帖）
⬜ 存档转移到常驻角色（迁移流程）
```

### 第三批（完善体验）

```
⬜ 主题切换（CSS 变量，进入游戏时自动应用）
⬜ 常驻角色浮窗集成到游玩页
⬜ Companion Slot（带自己的角色进游戏，创作者开放时）
```

### 可行性评估

| 功能 | 后端支持 | 前端工作量 | 阻塞条件 |
|------|---------|----------|---------|
| SSE 流式 | ✅ 已有 | 中 | 无 |
| Swipe | ✅ 已有 | 小 | 无 |
| 重新生成/继续 | ✅ 已有 | 小 | 无 |
| Fork/检查点 | ✅ 已有 | 中 | 无 |
| Impersonate | ⚠️ 需确认 WE turn 接口是否支持特殊 flag | 小 | 待验证 |
| Author's Note | ✅ 已有（Session 级 WorldbookEntry） | 中 | 无 |
| 存档迁移到 Agent | ⚠️ 需新 API（见第五章）| 中 | 常驻角色后端先做 |
| Text 卡片式目录 | ✅ 前端纯展示逻辑 | 小 | 游戏 API 先有 |
| 评论区模式切换 | ✅ 后端 comment_config 已有 | 中 | 无 |
