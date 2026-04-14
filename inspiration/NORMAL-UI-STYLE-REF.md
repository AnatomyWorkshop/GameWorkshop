# Normal UI 风格与 API 配置设计参考

> 分析来源：`normal/frontend` (Vue) 的 `Profile.vue` 与 `global.css`

## 1. 核心配色与 UI 风格 (Theme)

Normal 版支持了多套主题，其默认的“纯黑紫 (purple)”风格非常适合作为我们 GameWorkshop 重制的基准。

### 颜色变量
- **背景层级**：
  - `bg` / `bg-primary`: `#0a0a0a` (最底层的纯黑)
  - `surface` / `bg-secondary`: `#141414` (卡片/面板底色)
  - `bg-tertiary`: `#1e1e1e` (输入框/二级按钮底色)
  - `bg-accent`: `#2a2a2a` (边框/悬浮/滚动条颜色)
- **文字层级**：
  - `text-primary`: `#f2f3f5` (高对比主文本)
  - `text-secondary`: `#a0a0a0` (次要说明)
  - `text-muted`: `#666666` (弱提示/占位符)
- **品牌与功能色**：
  - `brand-color` (Primary): `#6D5EF6` (主色调紫)
  - `accent` (Success): `#25C2A0` (成功绿)
  - `danger`: `#FF4D4F` (危险红)
  - `warning`: `#f0b232` (警告黄)

### 圆角与排版
- 圆角标准：`sm: 4px`, `md: 8px`, `lg: 12px`, `full: 9999px`。
- 字体族：`Inter`, `-apple-system`, `PingFang SC` 等现代无衬线字体。
- **Section 设计**：卡片式布局，外围有 `border: 1px solid var(--bg-accent)`，内部 `padding: 20px/24px`，圆角 `12px`。

## 2. 按钮与输入框风格 (Buttons & Inputs)

### 输入框 (Input)
- 高度 `38px`，背景 `#1e1e1e`，边框 `#2a2a2a`，聚焦时边框变为品牌紫 `#6D5EF6`。

### 按钮 (Button)
- **Primary**：背景纯紫 `#6D5EF6`，白色文字，无边框，悬浮变暗紫 `#5a4dd4`。
- **Secondary**：背景 `#1e1e1e`，边框 `#2a2a2a`，悬浮时背景变亮到 `#2a2a2a`。
- **Danger**：透明背景，红色文字与红色边框 `#FF4D4F`，悬浮时背景变为极淡的红（10% 透明度）。

## 3. 多模型配置与 API 接口实现方案 (Trae 模仿)

用户提到要模仿 Trae 的模型接入方式：配置多个模型，并在游戏内选择 WE 不同需求调用哪个。

### 前端 UI 设计 (个人主页 - API 接口管理)
我们需要把 normal 版的单 API 配置扩展为“多配置列表（Provider List）”。
1. **提供商列表 (Providers)**：用户可以添加多个配置项，每个包含：
   - 别名 (Alias)：如 "我的 DeepSeek"、"主力 OpenAI"
   - 提供商 (Provider Type)：OpenAI 兼容 / Anthropic 等
   - Base URL
   - API Key
2. **模型解析与缓存 (Models)**：
   - 像 SillyTavern 一样，保存提供商后，点击“测试/获取模型”，前端向 `/v1/models` 发请求，解析返回的 ID 列表，并在本地或数据库中保存该提供商支持的模型名单。
3. **WE 引擎默认路由分配 (Routing)**：
   - 在个人设置中，提供一个“引擎默认调用路由表”。
   - 例如：`Narrator (叙述者) -> 选择 "我的 DeepSeek" 的 deepseek-chat 模型`。
   - `Director (导演) -> 选择 "主力 OpenAI" 的 gpt-4o 模型`。

### 后端 API 设计 (GW Backend-v2 配合)
为支持上述配置，需要我们在后端的 User 实体或独立的 `UserConfig` 表中持久化这些配置，避免只存 `localStorage`。
- **配置结构 (JSONB 存储)**：
  ```json
  {
    "providers": [
      { "id": "p1", "name": "OpenAI", "base_url": "...", "api_key": "enc_...", "models": ["gpt-4o", "gpt-3.5"] }
    ],
    "engine_routing": {
      "narrator": { "provider_id": "p1", "model": "gpt-4o" },
      "memory": { "provider_id": "p1", "model": "gpt-3.5" }
    }
  }
  ```
- **执行时**：游玩页面启动 Session 时，后端会将用户的 `engine_routing` 注入 Game Engine 的运行上下文，引擎在不同 Pipeline 节点根据需要自动调度对应的 API 密钥和模型。
