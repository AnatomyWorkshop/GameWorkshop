/**
 * GW 正则替换管线（RegexPipeline）
 *
 * 管线位置：AI 原始输出 → RegexPipeline → extractTokens() → splitSayBlocks() → ReactMarkdown
 *
 * 爱丽丝规则集（alice 命名空间）是 GW 官方内置规则，内测期间对所有游戏默认启用。
 * 创作者可通过 ui_config.regex_profiles 声明额外规则（bundled 随游戏包携带）。
 *
 * 安全边界：
 * - alice 命名空间官方规则可使用白名单 HTML 标签（gw-* className，经 rehypeSanitize 过滤）
 * - 创作者 bundled 规则：replacement 只允许纯文本，不允许 HTML 标签
 * - 不执行 JS，不允许 eval/Function
 */

import type { RegexRule, RegexProfileRef } from '@/api/types'

// ── 爱丽丝规则集（alice 命名空间）────────────────────────────────────────────

/**
 * alice:core — 爱丽丝规则集核心包
 *
 * 所有 GW Text 游戏渲染前都会经过此规则集。
 * 规则按 order 升序执行，order 越小越先处理。
 *
 * 规则分两组：
 *   order 1-9   — AI 输出噪声清洗（移除/剥离模型输出的包裹标签）
 *   order 10-19 — B 类标签渲染转换（语义标签 → gw-* CSS 类名）
 *
 * 扩充规则时：
 * - 在此数组追加新规则，分配唯一 order 值
 * - scope: 'narrative' = 渲染前处理（MessageBubble）
 * - scope: 'extract'   = token 提取前处理（handleTurnDone）
 */
export const ALICE_CORE_RULES: RegexRule[] = [
  // ── 清洗组（order 1-9）────────────────────────────────────────────────────
  {
    // 移除 <thinking>...</thinking> CoT 块（不展示给玩家）
    order: 1,
    pattern: '<thinking>[\\s\\S]*?</thinking>',
    replacement: '',
    scope: 'narrative',
    flags: 'gi',
  },
  {
    // 剥离 <content> 包裹（部分模型会用 <content> 包裹正文，保留内容）
    order: 2,
    pattern: '<content>([\\s\\S]*?)</content>',
    replacement: '$1',
    scope: 'narrative',
    flags: 'gi',
  },
  {
    // 移除 <choice>...</choice> 前端兜底选项块（不展示在正文）
    order: 3,
    pattern: '<choice>[\\s\\S]*?</choice>',
    replacement: '',
    scope: 'narrative',
    flags: 'gi',
  },
  // ── B 类标签渲染转换（order 10-19）───────────────────────────────────────
  {
    // <em class="gold">text</em> → 金色强调
    order: 10,
    pattern: '<em\\s+class=["\']gold["\']>([\\s\\S]*?)<\\/em>',
    replacement: '<span class="gw-em-gold">$1</span>',
    scope: 'narrative',
    flags: 'gi',
  },
  {
    // <em class="danger">text</em> → 红色警告
    order: 11,
    pattern: '<em\\s+class=["\']danger["\']>([\\s\\S]*?)<\\/em>',
    replacement: '<span class="gw-em-danger">$1</span>',
    scope: 'narrative',
    flags: 'gi',
  },
  {
    // <em class="info">text</em> → 蓝色提示
    order: 12,
    pattern: '<em\\s+class=["\']info["\']>([\\s\\S]*?)<\\/em>',
    replacement: '<span class="gw-em-info">$1</span>',
    scope: 'narrative',
    flags: 'gi',
  },
  {
    // <aside>text</aside> → 旁白/心声块
    order: 13,
    pattern: '<aside>([\\s\\S]*?)<\\/aside>',
    replacement: '<div class="gw-aside">$1</div>',
    scope: 'narrative',
    flags: 'gi',
  },
  {
    // <quote>text</quote> → 引用块
    order: 14,
    pattern: '<quote>([\\s\\S]*?)<\\/quote>',
    replacement: '<div class="gw-quote">$1</div>',
    scope: 'narrative',
    flags: 'gi',
  },
]

/** 官方 profile 注册表（namespace:name → rules） */
const OFFICIAL_PROFILES: Record<string, RegexRule[]> = {
  'alice:core': ALICE_CORE_RULES,
}

// ── 管线执行 ──────────────────────────────────────────────────────────────────

/**
 * 将多个 profile 的规则合并为有序列表（按 order 升序）
 * 爱丽丝规则集（alice:core）始终最先加载
 */
function mergeRules(profiles: RegexProfileRef[]): RegexRule[] {
  const all: RegexRule[] = []

  // 爱丽丝规则集始终最先加载
  all.push(...ALICE_CORE_RULES)

  for (const ref of profiles) {
    if (ref.ref === 'alice:core') continue // 已加载，跳过重复

    const official = OFFICIAL_PROFILES[ref.ref]
    if (official) {
      all.push(...official)
    } else if (ref.bundled && ref.rules) {
      // bundled 规则随游戏包携带
      all.push(...ref.rules)
    }
    // 未知 ref 且非 bundled：静默跳过（不联网拉取，内测阶段）
  }

  return all.sort((a, b) => a.order - b.order)
}

/**
 * 对文本执行正则替换管线
 *
 * @param text     AI 原始叙事文本
 * @param profiles 游戏包声明的 regex_profiles（可选，默认只跑爱丽丝规则集）
 * @param scope    作用范围过滤（默认 'narrative'）
 */
export function runRegexPipeline(
  text: string,
  profiles: RegexProfileRef[] = [],
  scope: 'narrative' | 'extract' = 'narrative',
): string {
  const rules = mergeRules(profiles).filter(r => r.scope === scope)
  let result = text
  for (const rule of rules) {
    try {
      const re = new RegExp(rule.pattern, rule.flags ?? 'g')
      result = result.replace(re, rule.replacement)
    } catch {
      // 无效正则：静默跳过，不破坏渲染
    }
  }
  return result
}
