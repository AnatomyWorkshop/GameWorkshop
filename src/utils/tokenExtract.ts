import type { TokenExtractRule } from '@/api/types'

export interface NarrativeToken {
  type: string
  text: string
  style?: string
  placement?: string[]
}

/**
 * 从叙事文本中提取 <tag>...</tag> 结构化 token，并返回清理后的文本。
 * 零后端改动，纯前端 regex 提取（v0 方案）。
 */
export function extractTokens(
  narrative: string,
  rules: TokenExtractRule[],
): { tokens: NarrativeToken[]; cleanText: string } {
  let clean = narrative
  const tokens: NarrativeToken[] = []

  for (const rule of rules) {
    const re = new RegExp(`<${rule.tag}>([\\s\\S]*?)</${rule.tag}>`, 'g')
    let m: RegExpExecArray | null
    // eslint-disable-next-line no-cond-assign
    while ((m = re.exec(clean)) !== null) {
      tokens.push({ type: rule.tag, text: m[1].trim(), style: rule.style, placement: rule.placement })
    }
    clean = clean.replace(new RegExp(`<${rule.tag}>[\\s\\S]*?</${rule.tag}>`, 'g'), '')
  }

  return { tokens, cleanText: clean.trim() }
}

export function extractChoiceOptions(narrative: string): { choices: string[]; cleanText: string } {
  let clean = narrative
  const choices: string[] = []
  const re = /<choice>([\s\S]*?)<\/choice>/gi

  let m: RegExpExecArray | null
  // eslint-disable-next-line no-cond-assign
  while ((m = re.exec(narrative)) !== null) {
    const block = m[1]
    const lines = block
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.replace(/^\s*(?:[-*]|(?:\d+)[\.\)\、])\s*/, '').trim())
      .filter(Boolean)

    for (const line of lines) {
      choices.push(line)
    }
  }

  clean = clean.replace(re, '')
  return { choices: choices.slice(0, 12), cleanText: clean.trim() }
}
