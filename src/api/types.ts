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
  type: 'preset' | 'interactive' | 'custom'
  preset?: 'narrative_tags' | 'phone_status' | 'character_sheet' | 'telemetry_debug'
  /** type: 'interactive' — Light 游玩页用，内容由前端 preset 决定 */
  interactive_preset?: 'inventory' | 'skill_tree' | 'map' | string
  default_pinned?: boolean
  position?: 'top_center_bar' | 'right_stack' | 'bottom_bar' | 'free'
  launcher: { icon: string; placement: 'topbar' | 'stage_hud' | 'none' }
  /** phone_status / character_sheet 面板展示的变量路径列表（支持 "group.key" 嵌套路径） */
  display_vars?: string[]
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

export interface UIConfig {
  theme_preset?: 'default-dark' | 'gothic' | 'soft-fantasy' | 'cyberpunk' | 'parchment' | 'minimal'
  layout_preset?: 'novel-column' | 'full-bleed' | 'chat-card'
  component_skin?: 'minimal-chrome' | 'glass-ornament'
  theme?: 'default-dark' | 'gothic' | 'soft-fantasy' | 'cyberpunk' | 'parchment' | 'minimal'
  message_style?: 'prose' | 'bubble'
  choice_columns?: number
  subtitle?: string
  first_options?: string[]
  stats_bar?: {
    items?: Array<{ key: string; icon?: string; label?: string }>
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
