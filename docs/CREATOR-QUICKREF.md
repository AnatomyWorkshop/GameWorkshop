# GW 创作者快速参考

> 版本：2026-04-17
> 面向：游戏创作者，快速查阅 `game.json` 的 `ui_config` 写法。
> 完整规范见 `RENDER-SPEC.md`（渲染管线、标签分类、主题系统）和 `TEXT-PLAY-SPEC.md`（悬浮窗声明、面板行为）。

---

## 一、最小配置（时间/地点标签条）

`system_prompt` 末尾追加：

```
每次回复开头必须输出：
<time>当前游戏内时间</time>
<location>当前地点</location>
```

`ui_config`：

```json
{
  "token_extract_rules": [
    { "tag": "time",     "placement": ["narrative_tags"] },
    { "tag": "location", "placement": ["narrative_tags"] }
  ],
  "narrative_tags": {
    "items": [
      { "id": "time",     "source": "token", "token_type": "time",     "icon": "🕐" },
      { "id": "location", "source": "token", "token_type": "location", "icon": "📍" }
    ]
  }
}
```

---

## 二、内联样式标签（B 类，无需 ui_config 声明）

直接在 prompt 里要求 AI 输出，前端自动渲染，不需要在 `token_extract_rules` 里声明。

```
重要物品或人名：<em class="gold">命运之轮</em>
危险状态：      <em class="danger">生命值危急</em>
系统提示：      <aside>【系统】存档已自动保存</aside>
引用/回忆：     <quote>她曾说过：...</quote>
```

扩展标签（需在 `regex_profiles` 里引用 `alice:extended`）：

```
数值提升：<em class="stat-up">+10 声望</em>
数值下降：<em class="stat-down">-5 体力</em>
结果卡片：<result-card>...</result-card>
媒体引用：<media-quote>...</media-quote>
```

引用方式：

```json
{
  "regex_profiles": [{ "ref": "alice:extended" }]
}
```

---

## 三、选项按钮（C 类标签）

`system_prompt` 末尾追加：

```
每次回复结尾输出选项块：
<choice>
- 选项一
- 选项二
- 选项三
</choice>
```

前端自动提取并渲染为纵向选项按钮，无需 `ui_config` 声明。

---

## 四、状态面板（stats preset）

`ui_config`：

```json
{
  "stats_bar": {
    "items": [
      { "key": "生命值",   "icon": "❤",  "display": "bar", "bar_max": 100, "bar_color": "#ef4444" },
      { "key": "金币",     "icon": "🪙" },
      { "key": "当前位置", "icon": "📍" }
    ]
  },
  "floating_panels": {
    "panels": [
      {
        "id": "stats",
        "type": "preset",
        "preset": "stats",
        "launcher": { "icon": "📊", "label": "状态", "placement": "topbar" }
      }
    ]
  }
}
```

`StatItem` 字段说明：

| 字段 | 类型 | 说明 |
|---|---|---|
| `key` | string | 变量名，支持点路径（如 `总资产.金币`） |
| `icon` | string | 显示在值前的 emoji |
| `label` | string | 覆盖显示名（默认用 key 最后一段） |
| `display` | `'bar'｜'badge'｜'text'` | 渲染方式，默认 `text` |
| `bar_max` | number | `display: 'bar'` 时的满值 |
| `bar_color` | string | 进度条颜色，不填则按值自动着色 |

---

## 五、叙事标签条（tags preset）

```json
{
  "narrative_tags": {
    "items": [
      { "id": "time", "source": "token", "token_type": "time", "style": "gold" },
      { "id": "loc",  "source": "var",   "key": "当前位置",    "style": "muted" }
    ]
  },
  "floating_panels": {
    "panels": [
      {
        "id": "tags",
        "type": "preset",
        "preset": "tags",
        "launcher": { "icon": "🏷", "label": "叙事标签", "placement": "topbar" }
      }
    ]
  }
}
```

`source` 说明：
- `token`：从 A 类标签提取（需配合 `token_extract_rules`）
- `var`：直接读 `variables[key]`

---

## 六、角色属性面板（character_sheet preset）

```json
{
  "floating_panels": {
    "panels": [
      {
        "id": "character",
        "type": "preset",
        "preset": "character_sheet",
        "launcher": { "icon": "👤", "label": "角色属性", "placement": "topbar" }
      }
    ]
  }
}
```

面板自动读取所有 `variables`，按点路径分组展示。

---

## 七、HTML 面板（html_panel，兼容 SillyTavern 卡片）

```json
{
  "floating_panels": {
    "panels": [
      {
        "id": "phone",
        "type": "html_panel",
        "config": {
          "template_url": "/assets/my-game/panel.html",
          "inject_mode": "getAllVariables"
        },
        "behavior": "pinned",
        "launcher": { "icon": "📱", "label": "手机", "placement": "topbar" }
      }
    ]
  }
}
```

`inject_mode` 说明：
- `getAllVariables`：注入 mock JS-Slash-Runner API，兼容 SillyTavern 卡片
- `raw_replace`：替换 HTML 里的 `const raw = null;` 为变量 JSON

---

## 八、面板行为预设（behavior）

| behavior | 关闭手势 | header | 适用场景 |
|---|---|---|---|
| `peek`（默认） | 点面板背景关闭 | 隐藏 | 只读展示型（stats、tags、character_sheet） |
| `tool` | 点面板外关闭 | 显示 | 工具/调试面板（telemetry_debug） |
| `pinned` | 只能点 × 关闭 | 显示 | 含交互内容（html_panel、多 Tab 面板） |

---

## 九、主题与颜色

```json
{
  "theme_preset": "gothic",
  "color_scheme": {
    "bg":        "#0a0a0a",
    "accent":    "#d97706",
    "text":      "rgba(255,255,255,0.9)",
    "text_muted":"rgba(255,255,255,0.5)"
  }
}
```

内置主题：`default-dark` / `gothic` / `soft-fantasy` / `cyberpunk` / `parchment` / `minimal`

`color_scheme` 只覆盖需要修改的字段，其余继承主题默认值。

---

## 十、完整 floating_panels 示例

```json
{
  "floating_panels": {
    "panels": [
      { "id": "tags",      "type": "preset", "preset": "tags",            "launcher": { "icon": "🏷",  "label": "叙事标签", "placement": "topbar" } },
      { "id": "stats",     "type": "preset", "preset": "stats",           "launcher": { "icon": "📊",  "label": "状态",     "placement": "topbar" } },
      { "id": "character", "type": "preset", "preset": "character_sheet", "launcher": { "icon": "👤",  "label": "角色属性", "placement": "topbar" } },
      { "id": "debug",     "type": "preset", "preset": "telemetry_debug", "launcher": { "icon": "🔧",  "label": "调试",     "placement": "none"   } }
    ]
  }
}
```

`placement: "none"` 的面板不出现在菜单中，只能通过代码触发（调试用）。
