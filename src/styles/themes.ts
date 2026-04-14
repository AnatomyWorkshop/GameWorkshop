// GW 内置主题预设
// 主题变量通过 JS 注入到 document.documentElement，优先级高于 CSS [data-gw-theme] 选择器
// 创作者在 ui_config.color_scheme 里声明的值会在主题基础上进一步覆盖

export type ThemeName = 'default-dark' | 'gothic' | 'soft-fantasy' | 'cyberpunk' | 'parchment' | 'minimal'

export interface ThemeVars {
  '--color-bg': string
  '--color-surface': string
  '--color-border': string
  '--color-text': string
  '--color-text-muted': string
  '--color-accent': string
  '--color-accent-hover': string
  '--color-quote': string
  '--color-user-bubble': string
  '--color-ai-bubble': string
  '--color-user-text': string
  '--color-user-border': string
  '--color-topbar-bg': string
  '--color-input-bg': string
  '--font-prose': string
  '--bubble-radius': string
  '--prose-line-height': string
  '--color-em-gold': string
  '--color-em-danger': string
  '--color-em-info': string
  '--color-aside': string
  '--color-quote-border': string
}

export interface Theme {
  name: ThemeName
  label: string
  description: string
  vars: ThemeVars
}

export const THEMES: Record<ThemeName, Theme> = {
  'default-dark': {
    name: 'default-dark',
    label: '深蓝默认',
    description: 'GitHub 风格深蓝黑，现代简洁，紫色强调',
    vars: {
      '--color-bg':           '#0d1117',
      '--color-surface':      '#161b22',
      '--color-border':       '#21262d',
      '--color-text':         '#e6edf3',
      '--color-text-muted':   '#7d8590',
      '--color-accent':       '#7c6af7',
      '--color-accent-hover': '#9585ff',
      '--color-quote':        '#7c6af7',
      '--color-user-bubble':  '#3d2fa8',
      '--color-ai-bubble':    '#161b22',
      '--color-user-text':    '#7c6af7',
      '--color-user-border':  '#7c6af7',
      '--color-topbar-bg':    'rgba(13, 17, 23, 0.88)',
      '--color-input-bg':     '#161b22',
      '--font-prose':         "'Inter', system-ui, sans-serif",
      '--bubble-radius':      '0.75rem',
      '--prose-line-height':  '1.8',
      '--color-em-gold':      '#d97706',
      '--color-em-danger':    '#ef4444',
      '--color-em-info':      '#7c6af7',
      '--color-aside':        '#7d8590',
      '--color-quote-border': '#7c6af7',
    },
  },

  'gothic': {
    name: 'gothic',
    label: '哥特暗黑',
    description: '深邃黑底配琥珀金色，衬线字体，中世纪叙事感',
    vars: {
      '--color-bg':           '#0a0a0a',
      '--color-surface':      '#171717',
      '--color-border':       '#2a2a2a',
      '--color-text':         '#e5e5e5',
      '--color-text-muted':   '#737373',
      '--color-accent':       '#d97706',
      '--color-accent-hover': '#f59e0b',
      '--color-quote':        '#d97706',
      '--color-user-bubble':  '#78350f',
      '--color-ai-bubble':    '#1c1917',
      '--color-user-text':    '#d97706',
      '--color-user-border':  '#d97706',
      '--color-topbar-bg':    'rgba(10, 10, 10, 0.92)',
      '--color-input-bg':     '#171717',
      '--font-prose':         "'Crimson Text', 'Georgia', serif",
      '--bubble-radius':      '4px',
      '--prose-line-height':  '1.9',
      '--color-em-gold':      '#f59e0b',
      '--color-em-danger':    '#f87171',
      '--color-em-info':      '#d97706',
      '--color-aside':        '#a3a3a3',
      '--color-quote-border': '#d97706',
    },
  },

  'soft-fantasy': {
    name: 'soft-fantasy',
    label: '柔幻奇境',
    description: '深紫底配粉紫高光，圆润气泡，轻盈奇幻感',
    vars: {
      '--color-bg':           '#0f102a',
      '--color-surface':      '#1a1b3d',
      '--color-border':       '#2d2f66',
      '--color-text':         '#f7f3ff',
      '--color-text-muted':   '#b6b8f3',
      '--color-accent':       '#e879f9',
      '--color-accent-hover': '#f0abfc',
      '--color-quote':        '#e879f9',
      '--color-user-bubble':  '#5b21b6',
      '--color-ai-bubble':    '#1a1b3d',
      '--color-user-text':    '#e879f9',
      '--color-user-border':  '#e879f9',
      '--color-topbar-bg':    'rgba(15, 16, 42, 0.88)',
      '--color-input-bg':     '#1a1b3d',
      '--font-prose':         "'Quicksand', 'Nunito', system-ui, sans-serif",
      '--bubble-radius':      '1.25rem',
      '--prose-line-height':  '1.85',
      '--color-em-gold':      '#fbbf24',
      '--color-em-danger':    '#fb7185',
      '--color-em-info':      '#e879f9',
      '--color-aside':        '#c4b5fd',
      '--color-quote-border': '#e879f9',
    },
  },

  'cyberpunk': {
    name: 'cyberpunk',
    label: '赛博朋克',
    description: '极暗底配霓虹青/红双色，等宽字体，科幻都市感',
    vars: {
      '--color-bg':           '#050510',
      '--color-surface':      '#0a0b1a',
      '--color-border':       '#1a1a3a',
      '--color-text':         '#e0e8ff',
      '--color-text-muted':   '#5a7aaa',
      '--color-accent':       '#00fff0',
      '--color-accent-hover': '#66fff8',
      '--color-quote':        '#00fff0',
      '--color-user-bubble':  '#1a0010',
      '--color-ai-bubble':    '#0a0b1a',
      '--color-user-text':    '#ff2d6b',
      '--color-user-border':  '#ff2d6b',
      '--color-topbar-bg':    'rgba(5, 5, 16, 0.92)',
      '--color-input-bg':     '#0a0b1a',
      '--font-prose':         "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
      '--bubble-radius':      '2px',
      '--prose-line-height':  '1.65',
      '--color-em-gold':      '#fde047',
      '--color-em-danger':    '#ff2d6b',
      '--color-em-info':      '#00fff0',
      '--color-aside':        '#5a7aaa',
      '--color-quote-border': '#00fff0',
    },
  },

  'parchment': {
    name: 'parchment',
    label: '羊皮纸卷',
    description: '泛黄米色底，衬线字体，古风/历史/奇幻手稿感',
    vars: {
      '--color-bg':           '#f4ecd8',
      '--color-surface':      '#ede0c4',
      '--color-border':       '#c8a97a',
      '--color-text':         '#2c1a0e',
      '--color-text-muted':   '#7a5c3a',
      '--color-accent':       '#92400e',
      '--color-accent-hover': '#b45309',
      '--color-quote':        '#92400e',
      '--color-user-bubble':  '#d4b896',
      '--color-ai-bubble':    '#ede0c4',
      '--color-user-text':    '#92400e',
      '--color-user-border':  '#92400e',
      '--color-topbar-bg':    'rgba(244, 236, 216, 0.92)',
      '--color-input-bg':     '#ede0c4',
      '--font-prose':         "'Crimson Text', 'Georgia', 'Times New Roman', serif",
      '--bubble-radius':      '2px',
      '--prose-line-height':  '1.95',
      '--color-em-gold':      '#b45309',
      '--color-em-danger':    '#991b1b',
      '--color-em-info':      '#1e40af',
      '--color-aside':        '#7a5c3a',
      '--color-quote-border': '#92400e',
    },
  },

  'minimal': {
    name: 'minimal',
    label: '极简纯白',
    description: '纯白底黑字，无装饰，现代都市/现实题材',
    vars: {
      '--color-bg':           '#ffffff',
      '--color-surface':      '#f5f5f5',
      '--color-border':       '#e0e0e0',
      '--color-text':         '#111111',
      '--color-text-muted':   '#666666',
      '--color-accent':       '#374151',
      '--color-accent-hover': '#1f2937',
      '--color-quote':        '#374151',
      '--color-user-bubble':  '#e5e7eb',
      '--color-ai-bubble':    '#f5f5f5',
      '--color-user-text':    '#111111',
      '--color-user-border':  '#374151',
      '--color-topbar-bg':    'rgba(255, 255, 255, 0.92)',
      '--color-input-bg':     '#f5f5f5',
      '--font-prose':         "'Inter', system-ui, -apple-system, sans-serif",
      '--bubble-radius':      '0.5rem',
      '--prose-line-height':  '1.75',
      '--color-em-gold':      '#92400e',
      '--color-em-danger':    '#dc2626',
      '--color-em-info':      '#1d4ed8',
      '--color-aside':        '#6b7280',
      '--color-quote-border': '#374151',
    },
  },
}

export const DEFAULT_THEME: ThemeName = 'default-dark'

/** 将主题变量注入到指定元素（默认 documentElement） */
export function applyTheme(
  theme: ThemeName | Theme,
  el: HTMLElement = document.documentElement,
) {
  const t = typeof theme === 'string' ? THEMES[theme] ?? THEMES[DEFAULT_THEME] : theme
  for (const [key, val] of Object.entries(t.vars)) {
    el.style.setProperty(key, val)
  }
  el.setAttribute('data-gw-theme', t.name)
}

/** 清除注入的主题变量（离开游玩页时调用） */
export function clearTheme(el: HTMLElement = document.documentElement) {
  const t = THEMES[DEFAULT_THEME]
  for (const key of Object.keys(t.vars)) {
    el.style.removeProperty(key)
  }
  el.removeAttribute('data-gw-theme')
}
