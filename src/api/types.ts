// API 响应类型（对应后端 publicGameView + GameSession + social 层）

export interface Game {
  id: string
  slug: string
  title: string
  type: 'text' | 'light' | 'rich'
  short_desc: string
  notes: string
  cover_url: string
  author_id: string
  play_count: number
  like_count: number
  favorite_count: number
  ui_config: UIConfig | null
  tags?: string[]
  comment_config?: { default_mode: 'linear' | 'threaded' }
  created_at: string
}

export type CatalogEntry = Game

export interface NarrativeTagItem {
  id: string
  source: 'token' | 'var'
  token_type?: string
  key?: string
  icon?: string
  style?: 'default' | 'gold' | 'muted' | 'info'
}

export interface FloatingPanelDecl {
  id: string
  type: 'preset' | 'html_panel' | 'interactive' | 'custom'
  /** type: 'preset' — 数据展示型，Text 游玩页用 */
  preset?: 'narrative_tags' | 'phone_status' | 'data_panel' | 'character_sheet' | 'stats' | 'tags' | 'telemetry_debug'
  /** type: 'html_panel' — iframe 渲染原始 HTML 模板，变量注入后沙箱执行 */
  config?: {
    /** 指向游戏资产的 URL，如 /assets/绿茵好莱坞/down.txt */
    template_url?: string
    /** 变量注入策略：getAllVariables=mock JS-Slash-Runner API；raw_replace=替换 const raw = null */
    inject_mode?: 'getAllVariables' | 'raw_replace'
  }
  /** type: 'interactive' — Light 游玩页用，内容由前端 preset 决定 */
  interactive_preset?: 'inventory' | 'skill_tree' | 'map' | string
  /**
   * 面板行为预设：
   * - peek（默认）：点面板内关闭，适合只读展示
   * - tool：点外关闭，有 header，适合工具/调试面板
   * - pinned：只能点显式关闭按钮，适合含交互内容的面板（如 html_panel）
   */
  behavior?: 'peek' | 'tool' | 'pinned'
  default_pinned?: boolean
  position?: 'top_center_bar' | 'right_stack' | 'bottom_bar' | 'free'
  launcher: { icon: string; label?: string; placement: 'topbar' | 'stage_hud' | 'none' }
  /** data_panel / phone_status / character_sheet 面板展示的变量路径列表（支持 "group.key" 嵌套路径） */
  display_vars?: string[]
  /** 是否允许拖动定位，默认 false；位置持久化到 localStorage */
  draggable?: boolean
}

export interface TokenExtractRule {
  tag: string
  style?: string
  placement?: string[]
}

/** 单条正则替换规则 */
export interface RegexRule {
  /** 执行顺序，数字越小越先执行 */
  order: number
  /** JS 正则字符串（不含 / 包裹），如 "<thinking>[\\s\\S]*?</thinking>" */
  pattern: string
  /** 替换字符串，只允许纯文本或官方白名单标记 */
  replacement: string
  /** 作用范围：narrative=叙事文本，extract=提取前预处理 */
  scope: 'narrative' | 'extract'
  flags?: string
}

/** 正则替换表（可打包分发） */
export interface RegexProfile {
  id: string
  version: string
  author?: string
  rules: RegexRule[]
}

/** 游戏包内声明的正则表引用 */
export interface RegexProfileRef {
  /** 格式：namespace:name，如 "alice:core" 或 "creator:my-format" */
  ref: string
  version?: string
  /** true = 随游戏包携带，导入时直接安装 */
  bundled?: boolean
  /** 内联规则（bundled 时使用） */
  rules?: RegexRule[]
}

export interface SetupField {
  key: string
  label: string
  type: 'text' | 'select'
  required?: boolean
  placeholder?: string
  options?: string[]
}

export interface StatItem {
  key: string
  icon?: string
  label?: string
  /** 渲染方式：bar=进度条, badge=徽章, text=纯文本（默认） */
  display?: 'bar' | 'badge' | 'text'
  /** bar 模式的满值，默认 100 */
  bar_max?: number
  /** bar 颜色，支持 CSS 变量或 hex；未指定时 bar 模式自动按值着色（绿/黄/红） */
  bar_color?: string
}

export interface UIConfig {
  /** 开局配置表单字段（方案 A/B 共用） */
  setup_fields?: SetupField[]
  /** 开局配置弹窗标题，默认 "开局配置" */
  setup_form_title?: string
  /** 开局消息头部标识，默认 "[开局配置]" */
  setup_message_header?: string
  /** 开局确认按钮文字，默认 "开始游戏" */
  setup_confirm_label?: string
  theme_preset?: 'default-dark' | 'gothic' | 'soft-fantasy' | 'cyberpunk' | 'parchment' | 'minimal'
  layout_preset?: 'novel-column' | 'full-bleed' | 'chat-card'
  component_skin?: 'minimal-chrome' | 'glass-ornament'
  theme?: 'default-dark' | 'gothic' | 'soft-fantasy' | 'cyberpunk' | 'parchment' | 'minimal'
  message_style?: 'prose' | 'bubble'
  choice_columns?: number
  subtitle?: string
  first_options?: string[]
  stats_bar?: {
    items?: StatItem[]
  }
  color_scheme?: {
    bg?: string
    bg_image?: string
    surface?: string
    border?: string
    text?: string
    text_muted?: string
    accent?: string
    quote?: string
    user_text?: string
    user_border?: string
    topbar_bg?: string
  }
  font?: string
  bubble_style?: string
  input_mode?: 'free' | 'choice_primary' | 'choice_only' | 'command'
  input_placeholder?: string
  avatar_mode?: 'none' | 'script'
  characters?: Record<string, { avatar_url: string; color?: string }>
  bg_url?: string
  bg_overlay?: number
  bg_blur?: boolean
  display_vars?: string[]
  // 悬浮面板体系
  narrative_tags?: { items: NarrativeTagItem[] }
  floating_panels?: { panels: FloatingPanelDecl[] }
  token_extract_rules?: TokenExtractRule[]
  /** 正则替换表引用列表（按 order 合并执行） */
  regex_profiles?: RegexProfileRef[]
}

export interface GameListResponse {
  games: Game[]
  total: number
  limit: number
  offset: number
}

export interface Session {
  id: string
  game_id: string
  user_id: string
  title: string
  status: 'active' | 'archived'
  is_public: boolean
  floor_count: number
  created_at: string
  updated_at: string
}

export interface FloorMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface Floor {
  id: string
  session_id: string
  seq: number
  branch_id: string
  status: string
  active_page_id: string
  messages: FloorMessage[]
  page_vars: Record<string, unknown>
  token_used: number
  created_at: string
}

export interface TurnResponse {
  floor_id: string
  narrative: string
  options: string[]
  variables?: Record<string, unknown>
  state_patch: Record<string, unknown>
  vn: VNDirectives | null
}

export interface PromptPreviewMessage {
  role: 'system' | 'user' | 'assistant' | string
  content: string
}

export interface PromptPreview {
  messages: PromptPreviewMessage[]
  est_tokens: number
  block_count: number
  preset_hits: number
  worldbook_hits: number
  memory_used: boolean
}

export interface VNDirectives {
  bg?: string
  sprites?: Array<{ slot: 'left' | 'center' | 'right'; image: string }>
  bgm?: string
}

export interface Comment {
  id: string
  content: string
  author_id: string
  vote_up: number
  created_at: string
  rid: string | null
  root_id: string | null
}

export interface Post {
  id: string
  title: string
  author_id: string
  type: string
  vote_up: number
  reply_count: number
  created_at: string
}

export interface WorldbookEntry {
  id: string
  keys: string[]
  content: string
  comment: string
  constant?: boolean
  enabled?: boolean
  priority?: number
  player_visible?: boolean
  display_category?: string
}

export interface MergedWorldbookEntry extends WorldbookEntry {
  is_overridden?: boolean
  is_new?: boolean
}

export interface GameStats {
  comment_count: number
  post_count: number
}

export interface ApiResponse<T> {
  code: number
  data: T
}

export interface LibraryEntry {
  id: string
  user_id: string
  game_id: string
  series_key: string
  source: 'catalog' | 'local'
  last_played_at: string | null
  created_at: string
}

export interface RuntimeBinding {
  engine_mode: 'cloud_default' | 'local_engine'
  model_label: string
  base_url?: string
}
