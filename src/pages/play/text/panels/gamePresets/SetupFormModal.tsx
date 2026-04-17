/**
 * SetupFormModal — 开局配置弹窗（方案 A）
 *
 * 通用组件，由 ActionBar 在游戏详情页「开始游玩」时弹出。
 * 玩家填写完毕后，前端将表单数据格式化为结构化文本，
 * 作为 session 创建后的第一条消息发送。
 *
 * `_` 前缀字段（如 _故事年份）不写入变量沙箱，仅用于格式化消息文本。
 */

import { useState } from 'react'
import type { SetupField } from '@/api/types'

interface Props {
  gameTitle: string
  fields: SetupField[]
  /** 弹窗标题，默认 "开局配置" */
  formTitle?: string
  /** 消息头部标识，默认 "[开局配置]" */
  messageHeader?: string
  /** 确认按钮文字，默认 "开始游戏" */
  confirmLabel?: string
  onConfirm: (message: string) => void
  onCancel: () => void
  loading?: boolean
}

function formatSetupMessage(
  fields: SetupField[],
  values: Record<string, string>,
  header: string,
): string {
  const lines = [header]
  for (const f of fields) {
    const v = values[f.key]?.trim()
    if (!v) continue
    lines.push(`${f.label}：${v}`)
  }
  return lines.join('\n')
}

export default function SetupFormModal({
  gameTitle,
  fields,
  formTitle = '开局配置',
  messageHeader = '[开局配置]',
  confirmLabel = '开始游戏',
  onConfirm,
  onCancel,
  loading,
}: Props) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const f of fields) {
      if (f.type === 'select' && f.options?.length) init[f.key] = f.options[0]
      else init[f.key] = ''
    }
    return init
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(): boolean {
    const errs: Record<string, string> = {}
    for (const f of fields) {
      if (f.required && !values[f.key]?.trim()) {
        errs[f.key] = '必填'
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    onConfirm(formatSetupMessage(fields, values, messageHeader))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border flex flex-col"
        style={{
          backgroundColor: 'var(--color-bg)',
          borderColor: 'var(--color-border)',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
          <div className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
            {formTitle}
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {gameTitle}
          </div>
        </div>

        {/* Fields */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                {f.label}
                {f.required && <span className="ml-1" style={{ color: 'var(--color-accent)' }}>*</span>}
              </label>
              {f.type === 'select' ? (
                <select
                  className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: errors[f.key] ? 'rgba(239,68,68,0.6)' : 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                  value={values[f.key] ?? ''}
                  onChange={(e) => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                >
                  {f.options?.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: errors[f.key] ? 'rgba(239,68,68,0.6)' : 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                  placeholder={f.placeholder ?? ''}
                  value={values[f.key] ?? ''}
                  onChange={(e) => {
                    setValues(v => ({ ...v, [f.key]: e.target.value }))
                    if (errors[f.key]) setErrors(er => ({ ...er, [f.key]: '' }))
                  }}
                />
              )}
              {errors[f.key] && (
                <div className="text-[11px] mt-0.5" style={{ color: 'rgba(239,68,68,0.9)' }}>
                  {errors[f.key]}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 border-t shrink-0 flex gap-3" style={{ borderColor: 'var(--color-border)' }}>
          <button
            type="button"
            className="flex-1 py-2 rounded-lg border text-sm transition-colors"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
            onClick={onCancel}
            disabled={loading}
          >
            取消
          </button>
          <button
            type="button"
            className="flex-1 py-2 rounded-lg text-white text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-accent)' }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? '创建中…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
