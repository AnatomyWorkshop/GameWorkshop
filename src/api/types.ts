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
  created_at: string
}

export interface UIConfig {
  theme?: string
  color_scheme?: { bg?: string; text?: string; accent?: string }
  font?: string
  bubble_style?: string
  input_mode?: 'free' | 'choice_primary' | 'choice_only' | 'command'
  avatar_mode?: 'none' | 'script'
  characters?: Record<string, { avatar_url: string; color?: string }>
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
  state_patch: Record<string, unknown>
  vn: VNDirectives | null
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
}

export interface GameStats {
  comment_count: number
  post_count: number
}

export interface ApiResponse<T> {
  code: number
  data: T
}
