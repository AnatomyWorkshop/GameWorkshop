// GW 内置主题预设
// 主题变量通过 JS 注入到 document.documentElement，优先级高于 CSS [data-gw-theme] 选择器
// 创作者在 ui_config.color_scheme 里声明的值会在主题基础上进一步覆盖

export type ThemeName = 'default-dark' | 'gothic' | 'soft-fantasy'

export interface ThemeVars {
  '--color-bg': string
  '--color-surface': string
  '--color-border': string
  '--color-text': string
  '--color-text-muted': string
  '--color-accent': string
  '--color-accent-hover': string
  '--color-user-bubble': string
  '--color-ai-bubble': string
  '--color-user-text': string
  '--color-user-border': string
  '--color-topbar-bg': string
  '--color-input-bg': string
  '--font-prose': string
  '--bubble-radius': string
  '--prose-line-height': string
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
    label: '经典深色',
    description: '简洁中性的蓝色调深色主题',
    vars: {
      '--color-bg':           '#0f172a',
      '--color-surface':      '#1e293b',
      '--color-border':       '#334155',
      '--color-text':         '#f1f5f9',
      '--color-text-muted':   '#94a3b8',
      '--color-accent':       '#3b82f6',
      '--color-accent-hover': '#60a5fa',
      '--color-user-bubble':  '#1d4ed8',
      '--color-ai-bubble':    '#1e293b',
      '--color-user-text':    '#3b82f6',
      '--color-user-border':  '#3b82f6',
      '--color-topbar-bg':    'rgba(15, 23, 42, 0.88)',
      '--color-input-bg':     '#1e293b',
      '--font-prose':         "'Inter', system-ui, sans-serif",
      '--bubble-radius':      '0.75rem',
      '--prose-line-height':  '1.8',
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
      '--color-user-bubble':  '#78350f',
      '--color-ai-bubble':    '#1c1917',
      '--color-user-text':    '#d97706',
      '--color-user-border':  '#d97706',
      '--color-topbar-bg':    'rgba(10, 10, 10, 0.92)',
      '--color-input-bg':     '#171717',
      '--font-prose':         "'Crimson Text', 'Georgia', serif",
      '--bubble-radius':      '4px',
      '--prose-line-height':  '1.9',
    },
  },

  'soft-fantasy': {
    name: 'soft-fantasy',
    label: '柔幻奇境',
    description: '梦幻紫调配粉紫高光，圆润气泡，轻盈奇幻感',
    vars: {
      '--color-bg':           '#1e1b4b',
      '--color-surface':      '#312e81',
      '--color-border':       '#4338ca',
      '--color-text':         '#f5f3ff',
      '--color-text-muted':   '#a5b4fc',
      '--color-accent':       '#e879f9',
      '--color-accent-hover': '#f0abfc',
      '--color-user-bubble':  '#7c3aed',
      '--color-ai-bubble':    '#3730a3',
      '--color-user-text':    '#e879f9',
      '--color-user-border':  '#e879f9',
      '--color-topbar-bg':    'rgba(30, 27, 75, 0.88)',
      '--color-input-bg':     '#312e81',
      '--font-prose':         "'Quicksand', 'Nunito', system-ui, sans-serif",
      '--bubble-radius':      '1.25rem',
      '--prose-line-height':  '1.85',
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
