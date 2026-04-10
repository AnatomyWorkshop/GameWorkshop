# 常驻角色（Resident Character）设计文档

> 状态：概念阶段（2026-04-08）
> 优先级：近期做 GW 看板娘/管家（阶段 1），Companion Slot 在文字游戏完成后推进

---

## 一、是什么

常驻角色是一个绑定到用户账号的持久角色实例。  
它不属于任何单一游戏，而是属于这个用户在 GW 平台上的全局体验。

**近期形态（阶段 1）**：
- GW 界面里的"看板娘"或"个人管家"
- 可以和用户闲聊、推荐游戏、解释功能
- 记住用户的游玩历史和偏好
- 一个有名字、有性格的角色，不是冷冰冰的 AI 助手

**中期形态（阶段 2）**：
- 玩家可以把这个角色"带进"文字游戏（Companion Slot）
- 角色以同伴身份参与叙事

---

## 二、技术实现（阶段 1）

用现有 WE 引擎，几乎零额外开发：

```
用户激活常驻角色时：
  POST /api/play/sessions
    { game_id: "resident-character-template", user_id: "..." }
  → 返回一个持久 session_id，存在 localStorage / 账号系统里
  → 这个 session 的 is_public = false，不会出现在 session 列表

用户和角色对话时：
  POST /api/play/sessions/:resident_session_id/turn
    { content: "你觉得我应该玩哪个游戏？" }
  → WE 引擎正常处理，角色回应

游玩历史注入：
  每次用户完成一局游戏时，调用 POST /sessions/:resident_session_id/memories
    { content: "用户完成了《异世界和平》的真结局，好感度 92" }
  → 这条 Memory 写入常驻 session 的记忆库
  → 下次用户问"我玩过什么游戏"，角色可以从记忆里回答
```

### 所需的 GameTemplate（"resident-character-template"）

由 GW 内置，不对玩家展示，不出现在游戏目录里：

```
SystemPromptTemplate: "你是 {{char_name}}，是 {{user_name}} 在游戏工坊的专属管家。
  你了解 {{user_name}} 的游玩历史：{{memory_summary}}
  你的性格：{{char_description}}
  说话风格：亲切但不过分热情，偶尔调侃。"

Config: {
  game_type: "resident",          // 特殊类型，不出现在游戏目录
  is_hidden: true,                // 不展示在 /api/play/games 列表里
  storage_policy: "cloud_required",
  enabled_tools: ["search_memory"],
  fallback_options: []            // 常驻角色不给选项，纯对话
}
```

### 用户可定制什么

| 设置项 | 默认值 | 说明 |
|--------|--------|------|
| 角色来源 | GW 内置默认卡 | 可替换为用户在 CW 里拥有的 CharacterCard |
| 显示名称 | 角色原名 | 用户可改别名（"小助手"、"夜歌"...） |
| 激活方式 | 点击 GW 界面右下角浮窗 | 始终可访问 |
| 记忆可见性 | 用户可以查看/删除记忆条目 | |

---

## 三、前端表现

### 浮窗入口

```
GW 页面右下角固定浮窗按钮（类似客服气泡）：
  - 角色头像
  - 有未读消息时显示红点
  - 点击展开对话抽屉（drawer，从右侧滑入）
```

### 对话抽屉

```
┌────────────────────────────────┐
│ [← 收起]  夜歌               [⚙] │
│ ──────────────────────────────  │
│                                  │
│  [对话消息流]                     │
│  （和 text 游戏用同一套组件）      │
│                                  │
│  ──────────────────────────────  │
│  [输入框]                [发送]   │
│                                  │
│  💡 推荐今日游戏                  │
│  🎮 继续上次存档                  │
└────────────────────────────────┘
```

底部"快捷操作"卡片：从 `/api/play/games?recommended=true` 和用户存档列表拉取，直接跳转。

---

## 四、与 Companion Slot 的关系（阶段 2 预告）

阶段 1 的常驻角色和游戏是**完全分离**的——管家在游戏外，不干预游戏叙事。

阶段 2，如果游戏创作者在 GameTemplate 里开放了 Companion Slot，玩家在进入该游戏时可以选择：
- "不带同伴"（独立游玩）
- "带 [常驻角色名字]"（角色卡注入游戏叙事）

这时常驻角色的 CharacterCard 数据（名字、性格、说话风格）被提取出来，作为动态 WorldbookEntry 注入目标游戏 session。

**技术层面**：这是在 `POST /api/play/sessions` 时带上一个可选参数 `companion_card_id`，服务器把对应 CharacterCard 的内容预先注入到 WorldbookEntry 里，优先级由创作者在 `companion_slot.persona_injection_position` 里配置。

常驻角色和游戏内同伴**共享同一张 CharacterCard**，但记忆是独立的（游戏内记忆 ≠ 平台级别记忆）。

---

## 五、尚未解决的问题

1. **默认内置角色是谁？**  
   需要设计一个足够有趣、有辨识度的默认管家角色（名字、设定、头像）。  
   选项：专门设计一个 GW 原创角色 / 使用某个合作创作者的角色卡 / 让用户第一次使用时自己选。

2. **常驻角色多账号问题**：用户在不同设备登录时，常驻 session 是同一个（云端），记忆共享？  
   → 是的，`cloud_required` 策略，记忆统一在服务器。

3. **常驻角色能主动找玩家吗？**（推送通知场景）  
   → 阶段 1 不做。浮窗只在用户主动打开时运行。

4. **管家和普通游戏体验的边界**  
   管家不应该比游戏本身更"好玩"，否则用户全去用管家了。  
   定位应该是**辅助发现和导航**，而不是替代游玩。
