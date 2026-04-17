/**
 * HtmlPanel — iframe 沙箱渲染原始 HTML 模板
 *
 * 用于渲染游戏携带的完整 HTML 面板文件（如 down.txt），支持两种变量注入策略：
 *
 * - getAllVariables（默认）：mock JS-Slash-Runner 的 getAllVariables() API，
 *   适用于使用该 API 读取变量的原版卡片（如绿茵好莱坞 down.txt）
 *
 * - raw_replace：将模板中的 `const raw = null;` 替换为实际变量 JSON，
 *   适用于使用 const raw 模式的卡片（如美高之路）
 *
 * 安全说明：
 * - sandbox="allow-scripts" 禁止跨域请求、表单提交、弹窗等
 * - 不传 allow-same-origin，iframe 内脚本无法访问父页面 DOM 或 cookie
 * - 变量数据通过字符串注入，不执行父页面上下文的任何代码
 *
 * 渲染时机：
 * - 等待 streamDone=true 后才渲染 iframe（流式输出期间 HTML 不完整）
 * - 每次 variables 变化时通过 key 强制重建 iframe，触发模板重新执行
 */

import { useState, useEffect, useMemo } from 'react'

interface Props {
  variables: Record<string, unknown>
  templateUrl: string
  injectMode?: 'getAllVariables' | 'raw_replace'
  streamDone: boolean
}

/** 将 WE 扁平 KV 转为 stat_data.* 路径格式（JS-Slash-Runner getAllVariables 期望的结构） */
function toStatData(variables: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(variables)) {
    result[`stat_data.${key}`] = value
  }
  return result
}

/** 简单哈希，用于 key 强制重建 iframe */
function hashVars(variables: Record<string, unknown>): string {
  return JSON.stringify(variables).length + '_' + Object.keys(variables).join(',').slice(0, 64)
}

function buildSrcdoc(template: string, variables: Record<string, unknown>, injectMode: Props['injectMode']): string {
  if (injectMode === 'raw_replace') {
    return template.replace('const raw = null;', `const raw = ${JSON.stringify(variables)};`)
  }

  // getAllVariables 模式：在 <head> 最顶部注入 mock 脚本
  const mockScript = `<script>
window.getAllVariables = function() { return ${JSON.stringify(toStatData(variables))}; };
window.eventOn = function() {};
window.eventOff = function() {};
window.waitGlobalInitialized = function(name, cb) { if (cb) cb(); };
window.Mvu = { events: { VARIABLE_UPDATE_ENDED: '__gw_mvu_update' } };
<\/script>`

  // 注入到 <head> 内最前面，确保在模板脚本执行前 mock 已就位
  if (template.includes('<head>')) {
    return template.replace('<head>', `<head>${mockScript}`)
  }
  // 没有 <head> 标签时前置注入
  return mockScript + template
}

export default function HtmlPanel({ variables, templateUrl, injectMode = 'getAllVariables', streamDone }: Props) {
  const [template, setTemplate] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    setLoadError(false)
    fetch(templateUrl)
      .then(r => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.text()
      })
      .then(setTemplate)
      .catch(() => setLoadError(true))
  }, [templateUrl])

  const srcdoc = useMemo(() => {
    if (!template || !streamDone) return null
    return buildSrcdoc(template, variables, injectMode)
  }, [template, variables, injectMode, streamDone])

  if (loadError) {
    return (
      <div className="p-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>
        模板加载失败：{templateUrl}
      </div>
    )
  }

  if (!srcdoc) {
    return (
      <div className="p-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>
        {!template ? '加载中…' : '等待本轮输出完成…'}
      </div>
    )
  }

  return (
    <iframe
      key={hashVars(variables)}
      sandbox="allow-scripts"
      srcDoc={srcdoc}
      style={{ width: '100%', height: '560px', border: 'none', borderRadius: '0 0 8px 8px', display: 'block' }}
      title="html-panel"
    />
  )
}
