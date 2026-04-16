# GW-text游戏 标签与宏系统规范

> 版本：2026-04-15  
> 范围：A/B/C/D/S 五类标签与宏的完整定义、正则管线、MetaLine AI 动作、待实现缺口与测试建议。

---

## 1. 标签分类总览

### 1.1 五类标签对比

| 类别 | 格式 | 处理层 | 输出 | 典型用途 |
|---|---|---|---|---|
| A 类 | `<tag>text</tag>` | `extractTokens()` | NarrativeTagsBar token | 时间/地点/章节 |
| B 类 | `<tag>text</tag>` | `ALICE_CORE_RULES` 正则 | HTML span/div | 金色强调/旁白/引用 |
| C 类 | `<tag>text</tag>` | `extractTokens()` | 面板数据 / 选项按钮 | choice/status/news |
| D 类 | `<Tag>...</Tag>` | 后端 WE 引擎 | 变量更新 / 选项解析 | UpdateState/Options |
| S 类 | `[[macro\|field1\|...]]` | 专用结构解析器 | React 组件树 | 对话气泡/信息卡片 |

### 1.2 安全边界

- 禁止直接渲染原始 HTML：所有 AI 产生的 `<` `>` 经过转义
- 白名单解析：只有官方声明的 `gw-*` 类名允许通过 sanitize 管线
- 不执行 JS：禁止通过 `onclick`、`<script>` 注入
- alice 命名空间官方规则可使用白名单 HTML（`span`/`div` + `gw-*` className）；创作者 bundled 规则只允许纯文本 replacement

### 1.3 渲染管线

```
AI 原始输出
    ↓ runRegexPipeline('narrative')   ← 清洗组（order 1-9）+ B 类渲染组（order 10-19）
    ↓ extractTokens()                 ← A/C 类标签提取，从叙事文本移除
    ↓ splitSayBlocks()                ← S 类 say 宏结构解析
    ↓ ReactMarkdown 渲染
```

---

## 2. A 类标签：提取型元信息（NarrativeTagsBar）

提取后从叙事正文中移除，渲染到顶部标签条或浮窗面板。

### 2.1 提取机制

由 `tokenExtract.ts` 的 `extractTokens()` 处理，依赖创作者的 `ui_config.token_extract_rules`：

```json
{
  "token_extract_rules": [
    { "tag": "time", "placement": ["narrative_tags"], "style": "gold" },
    { "tag": "location", "placement": ["narrative_tags"] }
  ]
}
```

### 2.2 官方推荐 A 类标签

| 标签 | 用途 | 典型示例 | 目标 placement |
|---|---|---|---|
| `<time>` | 游戏时间推进 | `<time>1888年 雾月</time>` | `narrative_tags` |
| `<location>` | 当前地点 | `<location>贝克街221B</location>` | `narrative_tags` |
| `<weather>` | 天气/环境 | `<weather>阴雨绵绵</weather>` | `narrative_tags` |
| `<chapter>` | 章节/幕 | `<chapter>第三幕·背叛</chapter>` | `narrative_tags` |
| `<status>` | 状态摘要 | `<status>体能:低 伤势:轻</status>` | `panel:phone` / `panel:status` |
| `<memo>` | 自动记录到备忘录 | `<memo>线索：带血的怀表</memo>` | `panel:memo` |

### 2.3 样式映射

提取后 `style` 字段映射到 CSS 变量：
- `gold` → `var(--color-em-gold)`
- `info` → `var(--color-em-info)`
- `muted` → `var(--color-text-muted)`

---

## 3. B 类标签：内联富文本修饰

提取后保留在叙事正文中，由 `ALICE_CORE_RULES`（order 10–14）转为带样式的 `span`/`div`。

### 3.1 官方内置 B 类标签表

| AI 输出标签 | 渲染后 DOM | CSS 变量 | 用途说明 |
|---|---|---|---|
| `<em class="gold">...</em>` | `<span class="gw-em-gold">` | `--color-em-gold` | 重要物品、关键人名、稀有掉落 |
| `<em class="danger">...</em>` | `<span class="gw-em-danger">` | `--color-em-danger` | 危险提示、生命值降低、警告 |
| `<em class="info">...</em>` | `<span class="gw-em-info">` | `--color-em-info` | 普通强调、系统提示高亮 |
| `<aside>...</aside>` | `<div class="gw-aside">` | `--color-aside` | 旁白、系统音、次要描述 |
| `<quote>...</quote>` | `<div class="gw-quote">` | `--color-quote-border` | 回忆、闪回、信件摘录、引语 |

---

## 4. C 类标签：面板/交互数据

提取后从叙事正文中移除，数据路由到对应 UI 容器。

### 4.1 官方内置 C 类标签表

| 标签 | 用途 | 目标容器 | 说明 |
|---|---|---|---|
| `<choice>...</choice>` | 玩家选项列表 | 消息底部选项按钮组 | 每行一个选项，前端解析为可点击按钮 |
| `<news>...</news>` | 新闻/动态 | `panel:phone` | 足坛动态等滚动内容 |

### 4.2 `<choice>` 详解

**AI 输出格式**：

```
<choice>
1. 顺势推进 - 按当前剧情节奏自然推进
2. 主动出击 - 打破现状，采取直接行动
3. 迂回试探 - 保持距离，暗中观察
</choice>
```

**前端解析规则**：
- 提取 `<choice>` 块，从叙事文本移除
- 按行分割，过滤空行，去除前缀序号（`1.`、`2.` 等）
- 渲染为消息底部选项按钮组

实现状态（2026-04-15）：
- `<choice>` 不作为 token_extract_rules 的一部分，而是由前端“选项兜底解析器”处理：
  - 回合结束时若后端未返回 `<Options>` 解析结果（`turn.options` 为空），则从 `turn.narrative` 里提取 `<choice>` 行作为 options
  - 正文渲染阶段会从文本中移除 `<choice>...</choice>`，避免原样显示

**与后端 `<Options>` 的关系**：
- `<Options>` 是后端 WE 引擎解析的 D 类标签（`parser.go` 三层 fallback）
- `<choice>` 是前端 C 类标签，作为前端兜底方案
- 优先级：后端解析成功 → 用 `<Options>` 结果；后端未返回选项 → 前端提取 `<choice>`

---

## 5. D 类标签：后端系统控制（前端不可见）

| 标签 | 处理层 | 说明 |
|---|---|---|
| `<Narrative>` | 后端 parser | 叙事文本包裹 |
| `<Options>` | 后端 parser | 选项列表 |
| `<UpdateState>` | 后端 WE 引擎 | 简单 KV 变量更新 |
| `<UpdateVariable>` | 后端 WE 引擎 | JSONPatch 格式变量更新 |

D 类标签由后端消费，理论上不应出现在前端叙事文本中。若后端未剥离，前端 alice:core order 8 规则可作为兜底（见第 6 节）。

---

## 6. 正则替换管线（RegexPipeline）

### 6.1 alice:core 规则表

| order | 分组 | 规则说明 | 处理方式 |
|---|---|---|---|
| 1 | 清洗 | 移除 `<thinking>...</thinking>` | 整块移除 |
| 2 | 清洗 | 剥离 `<content>...</content>` 包裹 | 保留内容 |
| 10 | B 类渲染 | `<em class="gold">` | → `<span class="gw-em-gold">` |
| 11 | B 类渲染 | `<em class="danger">` | → `<span class="gw-em-danger">` |
| 12 | B 类渲染 | `<em class="info">` | → `<span class="gw-em-info">` |
| 13 | B 类渲染 | `<aside>` | → `<div class="gw-aside">` |
| 14 | B 类渲染 | `<quote>` | → `<div class="gw-quote">` |

### 6.2 待加入规则（测试后按需启用）

| 建议 order | 规则 | 触发场景 | 处理方式 |
|---|---|---|---|
| 3 | 移除 `<recap>` | 内部情节总结，不展示给玩家 | 整块移除 |
| 4 | 移除 `<theater>` | 明月秋青吐槽剧场格式 | 整块移除 |
| 5 | 移除 `<timeline>` | 平行世界时间轴 | 整块移除 |
| 6 | 移除 `<safe>` | 安全内容标记区域 | 整块移除 |
| 7 | 剥离 `<narrative>` | 少数模型包裹正文 | 保留内容 |
| 8 | 移除 `<UpdateState>` | D 类标签后端未剥离时的前端兜底 | 整块移除 |

不建议提前硬编码，应在真实游戏测试后确认触发频率再加入。

### 6.3 创作者自定义正则表

创作者可通过 `ui_config.regex_profiles` 声明 bundled 规则随游戏包分发：

```json
{
  "ui_config": {
    "regex_profiles": [
      { "ref": "alice:core" },
      { "ref": "creator:my-format", "bundled": true, "rules": [
        { "order": 20, "pattern": "...", "replacement": "...", "scope": "narrative" }
      ]}
    ]
  }
}
```

**安全边界**：创作者 bundled 规则 replacement 只允许纯文本，禁止 HTML；非官方 profile 导入时需用户确认。

---

## 7. S 类：结构宏（多字段 UI 组件）

S 类宏处理多字段、有语义结构的场景，输出 React 组件树，不走正则管线。

### 7.1 官方 S 类宏表

| 宏 | 格式 | 字段 | 解析器 | 渲染组件 | 状态 |
|---|---|---|---|---|---|
| say | `[[say\|名字\|台词]]` | 名字 / 台词 | `splitSayBlocks()` | `SayLine` | ✅ 已实现 |
| say（带副标题） | `[[say\|名字\|副标题\|台词]]` | 名字 / 副标题 / 台词 | `splitSayBlocks()` | `SayLine` | ✅ 已实现 |
| card | `[[card\|标题\|正文]]` | 标题 / 正文 | 待实现 | `InfoCard` | 🔜 规划中 |
| image | `[[image\|url\|说明]]` | URL / 说明文字 | 待实现 | `InlineImage` | 🔜 规划中 |

### 7.2 say 宏详解

```text
[[say|埃文斯|你的心跳比标准频率快了十二下。]]
[[say|维克托|侍从|夫人说，她今晚不见客。]]
```

渲染为：头像首字母圆圈（颜色来自 `ui_config.characters[角色名].color`）+ 主标题 + 副标题（可选）+ 对话气泡。

**与 ST 的对比**：ST 通过正则 → HTML 注入实现类似效果（字符串替换 + CSS）。GW 的 S 类宏用 React 组件实现，类型安全、主题联动、无 XSS 风险。

### 7.3 扩展原则

- S 类宏格式固定（`[[macro|...]]`），字段数由宏类型决定
- 新增宏需要：① 在此表登记 ② 实现专用解析器 ③ 创建对应 React 组件
- 不走 `ALICE_CORE_RULES`，不可通过 bundled 规则扩展（安全边界：S 类宏只有官方实现）

---

## 8. MetaLine AI 动作表

MetaLine 工具条上的 AI 动作遵循统一模式：触发 → 构造 prompt → LLM 调用 → 结果渲染（消息附近，本地 state，不持久化）。

### 8.1 官方 AI 动作表

| 动作 | 图标 | 触发条件 | Prompt 模板 | 输出 | 渲染方式 | 状态 |
|---|---|---|---|---|---|---|
| 翻译 (Translate) | `Languages` | assistant 消息 | `请将以下文本翻译为中文，只输出译文：\n{content}` | 译文字符串 | 消息下方折叠，走 ReactMarkdown | ✅ 前端已实现，后端端点待补 |
| 旁白 (Narrate) | `Volume2` | assistant 消息 | — | TTS 音频流 | 播放控件 | 🔜 规划中 |
| 书签 (Bookmark) | `Flag` | 任意消息 | — | 标记状态 | 消息高亮 + 书签列表 | 🔜 规划中 |
| 生图 (Image) | `Paintbrush` | assistant 消息 | — | 图片 URL | 消息下方图片 | 🔜 规划中 |

### 8.2 后端接口约定

```
POST /play/sessions/:id/translate
{ "content": "原文内容" }
→ { "translation": "译文" }
```

端点复用会话的 LLM 配置（provider / api_key / model），无需前端传参。

---

## 11. 存档 / 分支（后端需求草案）

目标：允许玩家在任意回合“创建新分支（新存档槽）”，并在同一会话内切换分支继续游玩；原分支历史保留，可随时切回。

### 11.1 必需接口

1) 列出分支（用于下拉菜单）
```
GET /play/sessions/:id/branches
→ [{ branch_id, parent_branch, origin_seq, floor_count, created_at }]
```

2) 从指定楼层创建分支（用于“从该回合重开”）
```
POST /play/sessions/:id/floors/:fid/branch
→ { branch_id }
```

3) 拉取楼层（按分支过滤）
```
GET /play/sessions/:id/floors?branch_id=main
GET /play/sessions/:id/floors?branch_id={branch_id}
```

4) 生成回合（按分支生成）
- SSE 流式：
```
GET /play/sessions/:id/stream?input=...&branch_id=main
GET /play/sessions/:id/stream?input=...&branch_id={branch_id}
```
- 非流式（如 turn/regen）建议也支持 `branch_id`（保持一致性）。

### 11.2 行为约束

- 创建分支后：原分支楼层不变，新分支从 origin floor 之后开始产生新楼层。
- 切换分支后：前端只展示当前分支的 floors，选项区/streaming buffer 等临时 UI 状态需要清空，避免跨分支串线。

### 11.3 个人中心/运行配置（默认接口）

- 若玩家未在个人中心配置 provider/api_key/model，则前端不传这些参数，后端使用默认 provider（平台默认接口）。
- 若玩家配置了运行参数，则前端在请求（尤其是 stream/translate 等动作）中透传，后端按该参数选择 provider。

---

## 9. 给创作者的 Prompt 编写指南

在 `preset_entries` 或 `system_prompt` 中约束 AI 输出格式：

```
【格式要求】
每次回复开头输出时间和地点：
<time>当前时间</time><location>当前地点</location>

重要物品或人名用金色强调：<em class="gold">物品名</em>
系统旁白用：<aside>系统提示：...</aside>

每次回复末尾输出三个选项：
<choice>
1. 顺势推进 - 具体内容
2. 主动出击 - 具体内容
3. 迂回试探 - 具体内容
</choice>

角色对话用 say 宏：
[[say|角色名|台词内容]]
```

---

## 10. 待实现缺口与测试建议

### 10.1 后端待补

| 项 | 说明 |
|---|---|
| `POST /play/sessions/:id/translate` | 翻译端点，前端已接线，后端未实现 |
| `<UpdateState>` 前端剥离 | 若后端下发前未剥离，需加入 alice:core order 8 规则 |

### 10.2 前端待补

| 项 | 说明 |
|---|---|
| `character_sheet` 面板 `display_vars` 支持 | 目前只有 `phone_status` 支持 `display_vars` 过滤，`character_sheet` 仍展示全部变量 |
| Continue / Impersonate | 消息工具条，发送空输入继续生成 / 调用 suggest 作为用户消息 |
| alice:core 待加入规则 | 见第 6.2 节，测试后按需启用 |

### 10.3 测试建议（维多利亚 + 绿茵好莱坞）

**维多利亚**：
- 验证 `[[say|角色名|台词]]` 格式在长对话中的稳定性（目标：50 轮内不漂移）
- 验证三选一 `<choice>` 块每轮都出现且格式正确
- 验证 `<UpdateState>` 是否出现在前端叙事文本中（若出现，启用 order 8 规则）
- 验证 B 类标签（`<em class="gold">`、`<aside>`）是否被 AI 正确使用

**绿茵好莱坞**：
- 验证 `phone_status` 面板只展示 `display_vars` 声明的 7 个变量路径
- 验证嵌套路径（如 `竞技能力.核心能力.速度`）是否正确读取（当前 `display_vars` 只声明了一层嵌套，三层嵌套未测试）
- `narrative_tags` 与 `phone_status` 都展示时间/地点，确认是否存在重复显示问题
- `character_sheet` 面板目前展示全部变量，确认是否需要 `display_vars` 过滤

### 10.4 标签补充方向

测试过程中如发现 AI 频繁输出某种格式但前端未处理，可按以下路径补充：
- 单值包裹 → 加入 B 类标签表 + ALICE_CORE_RULES（order 15+）
- 提取型元信息 → 加入 A 类推荐表 + 创作者在 `token_extract_rules` 声明
- 多字段结构 → 加入 S 类宏表 + 实现专用解析器

- **A类标签（Narrative Info Tags）**：
  - 提取后**从叙事正文中移除**。
  - 通常用于承载状态、时间、地点等元信息。
  - 提取后的信息被送入独立 UI 容器（如顶部叙事标签条、侧边栏、状态栏）。

- **B类标签（Inline Style Tags）**：
  - 提取后**保留在叙事正文中**。
  - 仅替换外层包裹，转化为前端安全的带预设 class 的 `span` 或 `div`。
  - 不包含任何跨节点数据流。

- **C类标签（Panel / Interactive Tags）**：
  - 提取后**从叙事正文中移除**。
  - 数据路由到对应的交互 UI 容器（如选项按钮组、手机面板、备忘录）。
  - 与 A 类的区别：C 类通常承载**可交互数据**（选项、状态更新），A 类承载**只读元信息**。

- **安全边界**：
  - **禁止直接渲染原始 HTML**：所有 AI 产生的 `<` `>` 都经过转义。
  - **白名单解析**：只有官方声明的 `gw-*` 类名允许通过 sanitize 管线。
  - **不执行 JS**：禁止通过 `onclick`、`<script>` 注入。

---

## 2. A类标签：提取型元信息（NarrativeTagsBar / 浮窗面板）

### 2.1 提取机制

前端 `tokenExtract.ts` 提供 `extractTokens` 函数，扫描文本。
依赖创作者的 `ui_config.token_extract_rules`：

```json
{
  “token_extract_rules”: [
    { “tag”: “time”, “placement”: [“narrative_tags”], “style”: “gold” },
    { “tag”: “location”, “placement”: [“narrative_tags”] }
  ]
}
```

### 2.2 官方推荐 A 类标签

| 标签 | 用途 | 典型示例 | 目标 placement |
|---|---|---|---|
| `<time>` | 游戏时间推进 | `<time>1888年 雾月</time>` | `narrative_tags` |
| `<location>` | 当前地点 | `<location>贝克街221B</location>` | `narrative_tags` |
| `<weather>` | 天气/环境 | `<weather>阴雨绵绵</weather>` | `narrative_tags` |
| `<chapter>` | 章节/幕 | `<chapter>第三幕·背叛</chapter>` | `narrative_tags` |
| `<status>` | MVU式小面板状态更新 | `<status>体能:低 伤势:轻</status>` | `panel:phone` / `panel:status` |
| `<memo>` | 自动记录到备忘录 | `<memo>线索：带血的怀表</memo>` | `panel:memo` |

### 2.3 渲染与映射

以 `TagsPanel` 为例，提取后：
- `gold` 映射到 `var(--color-em-gold)`
- `info` 映射到 `var(--color-em-info)`
- `muted` 映射到 `var(--color-text-muted)`

---

## 3. B类标签：内联富文本修饰

### 3.1 替换机制

B 类标签由 `regexPipeline.ts` 的 `ALICE_CORE_RULES`（order 10–14）处理，在 `runRegexPipeline('narrative')` 阶段完成替换，随后送入 `rehype-sanitize`。`preprocessNarrative()` 已移除，管线统一。

### 3.2 官方内置 B 类标签表

不需要创作者额外声明，平台原生支持：

| AI 输出标签 | 渲染后 DOM | 样式绑定 | 用途说明 |
|---|---|---|---|
| `<em class=”gold”>...</em>` | `<span class=”gw-em-gold”>` | `--color-em-gold` | 重要物品、关键人名、稀有掉落 |
| `<em class=”danger”>...</em>` | `<span class=”gw-em-danger”>` | `--color-em-danger` | 危险提示、生命值降低、警告 |
| `<em class=”info”>...</em>` | `<span class=”gw-em-info”>` | `--color-em-info` | 普通强调、系统提示高亮 |
| `<aside>...</aside>` | `<div class=”gw-aside”>` | `--color-aside` | 旁白、系统音、与主叙事隔离的次要描述 |
| `<quote>...</quote>` | `<div class=”gw-quote”>` | `--color-quote-border` | 回忆、闪回、信件摘录、引语 |

### 3.3 结构宏：say 块（多字段对话气泡）

say 宏是一种**多字段结构宏**，与 B 类内联样式标签有本质区别：

| 维度 | B 类内联标签 | say 结构宏 |
|---|---|---|
| 字段数 | 单值（包裹文本） | 多字段（名字 / 副标题 / 台词） |
| 处理方式 | `ALICE_CORE_RULES` 正则替换 | `splitSayBlocks()` 结构解析 |
| 输出 | HTML 字符串 | React 组件树（`SayLine`） |
| 可扩展 | 创作者可通过 bundled 规则添加 | 固定格式，不走正则管线 |

**AI 输出格式**：

```text
[[say|维克托|侍从|夫人说，她今晚不见客。]]
[[say|薇奥拉|中区的风太干净了，连呼吸都觉得无聊。]]
```

两种形式均支持：
- `[[say|角色名|台词]]` — 无副标题
- `[[say|角色名|副标题|台词]]` — 带副标题（如职位、关系）

渲染为：
- 头像首字母圆圈（颜色来自 `ui_config.characters[角色名].color`）
- 主标题（角色名），副标题（可选）
- 对话气泡，不含最外层引号

**为什么不并入 B 类标签表**：say 宏的输出是 React 组件树（头像 + 名字 + 气泡），无法用正则 → HTML 字符串表达。它在管线中位于 `runRegexPipeline` 之后、`ReactMarkdown` 之前，作为独立的结构解析步骤。

---

## 4. C类标签：面板/交互数据（→ 选项区 / 浮窗面板）

### 4.1 提取机制

与 A 类相同，由 `tokenExtract.ts` 的 `extractTokens()` 处理，placement 路由到对应 UI 容器。

### 4.2 官方内置 C 类标签表

| 标签 | 用途 | 目标容器 | 说明 |
|---|---|---|---|
| `<choice>...</choice>` | 玩家选项列表 | 消息底部选项按钮组 | 每行一个选项，前端解析为可点击按钮 |
| `<news>...</news>` | 新闻/动态 | `panel:phone` | 足坛动态等滚动内容 |

### 4.3 `<choice>` 标签详解

**AI 输出格式**：

```
<choice>
1. 正常推进 - 继续当前剧情
2. 无厘头 - 来点意外
3. 强硬路线 - 直接对抗
</choice>
```

**前端解析规则**：
- 提取 `<choice>` 块内容，从叙事文本中移除
- 按行分割，过滤空行
- 每行去除前缀序号（`1.`、`2.` 等），保留选项文本
- 渲染为消息底部的选项按钮组（与后端 `<Options>` 解析结果合并或 fallback）

**与后端 `<Options>` 的关系**：
- `<Options>` 是后端 WE 引擎解析的 D 类标签（`parser.go` 三层 fallback）
- `<choice>` 是前端 C 类标签，作为前端兜底方案
- 优先级：后端解析成功 → 用 `<Options>` 结果；后端未返回选项 → 前端提取 `<choice>`

**创作者配置**：无需在 `token_extract_rules` 声明，`<choice>` 是平台内置 C 类标签，自动处理。

---

## 5. 正则替换管线（RegexPipeline）

### 5.1 管线位置

在 `extractTokens()` 之前运行，对 AI 原始输出做文本预处理：

```
AI 原始输出
    ↓ runRegexPipeline('narrative')（清洗 + B 类标签转换，alice:core order 1-19）
    ↓ extractTokens()（A/C 类标签提取）
    ↓ splitSayBlocks()（say 宏结构解析）
    ↓ ReactMarkdown 渲染
```

### 5.2 官方正则表（alice 命名空间）

GW 内置正则规则挂在 `alice` 命名空间，默认对所有游戏启用，分两组：

**清洗组（order 1–9）**

| order | 规则说明 | 作用 |
|---|---|---|
| 1 | 移除 `<thinking>...</thinking>` | 清理 CoT 输出，不展示给玩家 |
| 2 | 剥离 `<content>...</content>` 包裹 | 部分模型用此标签包裹正文，保留内容 |

**B 类渲染组（order 10–19）**

| order | AI 输出标签 | 渲染结果 |
|---|---|---|
| 10 | `<em class="gold">` | `<span class="gw-em-gold">` |
| 11 | `<em class="danger">` | `<span class="gw-em-danger">` |
| 12 | `<em class="info">` | `<span class="gw-em-info">` |
| 13 | `<aside>` | `<div class="gw-aside">` |
| 14 | `<quote>` | `<div class="gw-quote">` |

---

### 5.3 值得做的规则（待实现）

以下规则在实际游戏测试中有明确需求，建议在真实游戏导入测试后按需加入 `ALICE_CORE_RULES`：

| 规则 | 触发场景 | 建议 order | 处理方式 |
|---|---|---|---|
| 移除 `<recap>...</recap>` | 部分游戏用于内部情节总结，不应展示给玩家 | 3 | 整块移除 |
| 移除 `<theater>...</theater>` | 明月秋青格式的吐槽剧场，GW 不渲染此格式 | 4 | 整块移除 |
| 移除 `<timeline>...</timeline>` | 平行世界时间轴，GW 无对应面板 | 5 | 整块移除 |
| 移除 `<safe>...</safe>` | 部分预设用于标记安全内容区域，前端无需感知 | 6 | 整块移除 |
| 剥离 `<narrative>...</narrative>` | 少数模型会用此标签包裹正文 | 7 | 保留内容，移除标签 |
| 移除 `<UpdateState>...</UpdateState>` | D 类标签，后端已消费，前端不应展示原始 JSON | 8 | 整块移除（scope: narrative） |

**注意**：`<UpdateState>` 已由后端解析，但如果后端未在下发前剥离，前端会原样渲染出 JSON 块。加入 order 8 规则可作为前端兜底。

**不建议提前硬编码**：上述规则应在真实游戏测试中确认触发频率后再加入，避免误伤创作者有意输出的同名标签。

---

### 5.4 创作者自定义正则表（可导入依赖）

创作者可以打包自己的 `RegexProfile` 随游戏分发，玩家导入游戏时一并安装：

```json
{
  “id”: “creator:my-format”,
  “version”: “1.0.0”,
  “rules”: [
    { “order”: 10, “pattern”: “<thinking>[\\s\\S]*?</thinking>”, “replacement”: “”, “scope”: “narrative” }
  ]
}
```

游戏包声明：

```json
{
  “ui_config”: {
    “regex_profiles”: [
      { “ref”: “alice:core” },
      { “ref”: “creator:my-format”, “bundled”: true }
    ]
  }
}
```

**安全边界**：
- `replacement` 只允许纯文本，禁止 HTML 标签（官方白名单标记除外）
- `scope` 限制作用范围：`narrative`（叙事文本）、`extract`（提取前预处理）
- 非官方 profile 导入时需用户确认

---

## 6. 给创作者的 Prompt 编写指南

在 `system_prompt` 或 `post_history_instructions` 中，你可以这样指挥大模型：

> 【格式要求】
> 每次回复时，你必须在开头输出当前时间和地点，格式为：
> `<time>当前时间</time><location>当前地点</location>`
>
> 叙述时，如果遇到重要的线索或人名，使用 `<em class=”gold”>线索</em>` 包裹。
> 如果是系统性的警告或旁白，使用 `<aside>系统提示：...</aside>`。
>
> 每次回复末尾，输出三个选项供玩家选择：
> ```
> <choice>
> 1. 选项一描述
> 2. 选项二描述
> 3. 选项三描述
> </choice>
> ```

通过这种”约定俗成”的标签格式，创作者无需编写任何前端代码，就能让 Text 游玩页呈现出极具层次感、色彩主题随动、甚至具备弹窗联动的高级 UI 表现。

---

## 7. S 类：结构宏（多字段 UI 组件）

### 7.1 与 A/B/C/D 的区别

S 类结构宏是平行于 A/B/C/D 标签的第五类，专门处理**多字段、有语义结构、输出 React 组件树**的场景：

| 类别 | 格式 | 处理层 | 输出 | 典型用途 |
|---|---|---|---|---|
| A 类 | `<tag>text</tag>` | `extractTokens()` | NarrativeTagsBar token | 时间/地点/章节 |
| B 类 | `<tag>text</tag>` | `ALICE_CORE_RULES` 正则 | HTML span/div | 金色强调/旁白/引用 |
| C 类 | `<tag>text</tag>` | `extractTokens()` | 面板数据 / 选项按钮 | choice/status/news |
| D 类 | `<Tag>...</Tag>` | 后端 WE 引擎 | 变量更新 / 选项解析 | UpdateState/Options |
| **S 类** | `[[macro\|field1\|field2\|...]]` | `splitSayBlocks()` 等结构解析器 | React 组件树 | 对话气泡/信息卡片 |

**为什么需要 S 类**：B 类正则替换只能处理单值包裹（`<tag>text</tag>` → HTML），无法表达多字段结构（名字 + 副标题 + 台词 + 头像颜色）。S 类宏用 `[[macro|...]]` 语法承载多字段，由专用解析器输出 React 组件，不走正则管线。

**与 ST 的对比**：ST 通过正则 → HTML 注入实现类似效果（choice 块变成 styled div），本质是字符串替换 + CSS。GW 的 S 类宏用 React 组件实现，类型安全、主题联动、无 XSS 风险。

### 7.2 官方 S 类宏表

| 宏 | 格式 | 字段 | 解析器 | 渲染组件 | 状态 |
|---|---|---|---|---|---|
| say | `[[say\|名字\|台词]]` | 名字 / 台词 | `splitSayBlocks()` | `SayLine` | ✅ 已实现 |
| say（带副标题） | `[[say\|名字\|副标题\|台词]]` | 名字 / 副标题 / 台词 | `splitSayBlocks()` | `SayLine` | ✅ 已实现 |
| card | `[[card\|标题\|正文]]` | 标题 / 正文 | 待实现 | `InfoCard` | 🔜 规划中 |
| image | `[[image\|url\|说明]]` | URL / 说明文字 | 待实现 | `InlineImage` | 🔜 规划中 |

### 7.3 扩展原则

- S 类宏格式固定（`[[macro|...]]`），字段数由宏类型决定
- 新增宏需要：① 在此表登记 ② 在 `splitSayBlocks()` 或新解析器中实现 ③ 创建对应 React 组件
- 不走 `ALICE_CORE_RULES`，不可通过 bundled 规则扩展（安全边界：S 类宏只有官方实现）

---

## 8. MetaLine AI 动作表

### 8.1 设计模式

MetaLine 工具条上的 AI 动作遵循统一模式：

```
触发（用户点击）→ 构造 prompt（模板 + 消息内容）→ LLM 调用 → 结果渲染（消息附近）
```

所有 AI 动作共享同一套状态模型：`loading → result | error`，结果不持久化到后端（本地 state）。

### 8.2 官方 AI 动作表

| 动作 | 图标 | 触发条件 | Prompt 模板 | 输入 | 输出 | 渲染方式 | 状态 |
|---|---|---|---|---|---|---|---|
| 翻译 (Translate) | `Languages` | assistant 消息 | `请将以下文本翻译为中文，只输出译文，不加任何解释：\n{content}` | 消息原文 | 译文字符串 | 消息下方折叠展示，走 ReactMarkdown | ✅ 已实现 |
| 旁白 (Narrate) | `Volume2` | assistant 消息 | — | 消息原文 | TTS 音频流 | 播放控件 | 🔜 规划中 |
| 书签 (Bookmark) | `Flag` | 任意消息 | — | floor_id | 标记状态 | 消息高亮 + 书签列表 | 🔜 规划中 |
| 生图 (Image) | `Paintbrush` | assistant 消息 | — | 消息原文摘要 | 图片 URL | 消息下方图片 | 🔜 规划中 |

### 8.3 后端接口约定

AI 动作统一走 `/play/sessions/:id/{action}` POST 端点，请求体携带 `content`：

```json
POST /play/sessions/:id/translate
{ “content”: “原文内容” }
→ { “translation”: “译文” }
```

端点复用会话的 LLM 配置（provider / api_key / model），无需前端传参。
