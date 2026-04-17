/**
 * 绿茵好莱坞 — 数据面板（原版风格）
 *
 * 复现 down.txt 的视觉效果：
 * - 深紫/拜仁红主色调（独立于游戏主题 CSS 变量）
 * - 顶部叙事摘要 Hero 区（可点击展开/收起）
 * - 手风琴式分区（基本信息 / 竞技能力 / 俱乐部现状 / 生涯记录 / 社交关系 / 足坛动态）
 * - Canvas 雷达图（8项核心能力）
 * - 动态颜色进度条（体能 / 竞技状态）
 * - 社交关系按亲密状态分组（妻子/情人/朋友/对手/泛泛之交）
 */

import { useState, useRef, useEffect } from 'react'
import type { PanelPresetProps } from '../panelRegistry'

// ── 原版配色（独立于游戏主题，不使用 CSS 变量）──────────────────────────
const C = {
  primary:   '#3b003a',
  secondary: '#dc052d',
  bg:        '#150515',
  surface:   '#241024',
  border:    '#4a204a',
  text:      '#e0e0e0',
  muted:     '#a0a0a0',
  gold:      '#ffca28',
  green:     '#00e676',
  red:       '#f44336',
}

// ── 工具函数 ────────────────────────────────────────────────────────────────
function getV(vars: Record<string, unknown>, key: string, def = '-'): string {
  const v = vars[key]
  if (v === undefined || v === null || v === '待定' || v === '') return def
  return String(v)
}

function getObj(vars: Record<string, unknown>, prefix: string): Record<string, unknown> {
  // 支持两种格式：扁平 KV "prefix.key" 和嵌套对象 vars[prefix]
  const nested = vars[prefix]
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return nested as Record<string, unknown>
  }
  const result: Record<string, unknown> = {}
  const p = prefix + '.'
  for (const [k, v] of Object.entries(vars)) {
    if (k.startsWith(p)) result[k.slice(p.length)] = v
  }
  return result
}

function barColor(val: number): string {
  return val >= 80 ? C.green : val >= 60 ? C.gold : C.red
}

// ── Canvas 雷达图 ────────────────────────────────────────────────────────────
function RadarChart({ stats }: { stats: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width, h = canvas.height
    const cx = w / 2, cy = h / 2
    const radius = Math.min(cx, cy) - 35
    const labels = ['速度', '射门', '盘带', '防守', '体格', '传球', '精神', '稳定']
    const sides = 8
    const step = (Math.PI * 2) / sides
    const offset = -Math.PI / 2

    ctx.clearRect(0, 0, w, h)

    // 网格
    ctx.lineWidth = 1
    ctx.strokeStyle = C.border
    for (let level = 1; level <= 4; level++) {
      const r = radius * (level / 4)
      ctx.beginPath()
      for (let i = 0; i < sides; i++) {
        const a = offset + i * step
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.stroke()
    }

    // 轴线 + 标签
    for (let i = 0; i < sides; i++) {
      const a = offset + i * step
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius)
      ctx.strokeStyle = C.border
      ctx.stroke()

      const lr = radius + 15
      const lx = cx + Math.cos(a) * lr, ly = cy + Math.sin(a) * lr
      const val = stats[i] || 0
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = val >= 80 ? C.green : val >= 60 ? C.gold : C.muted
      ctx.font = '12px sans-serif'
      ctx.fillText(labels[i], lx, ly - 8)
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 11px sans-serif'
      ctx.fillText(String(val), lx, ly + 6)
    }

    // 数据多边形
    ctx.beginPath()
    for (let i = 0; i < sides; i++) {
      const a = offset + i * step
      const r = radius * ((stats[i] || 0) / 100)
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.fillStyle = 'rgba(220,5,45,0.35)'
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = C.secondary
    ctx.stroke()

    // 顶点圆点
    for (let i = 0; i < sides; i++) {
      const a = offset + i * step
      const r = radius * ((stats[i] || 0) / 100)
      ctx.beginPath()
      ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 3, 0, Math.PI * 2)
      ctx.fillStyle = '#fff'
      ctx.fill()
    }
  }, [stats])

  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
      <canvas ref={canvasRef} width={240} height={240} style={{ maxWidth: '100%' }} />
    </div>
  )
}

// ── 进度条 ───────────────────────────────────────────────────────────────────
function Bar({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  const color = barColor(value)
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
        <span style={{ color: C.muted }}>{label}</span>
        <span style={{ color, fontWeight: 600 }}>{value}{suffix}</span>
      </div>
      <div style={{ height: 8, background: '#111', borderRadius: 4, overflow: 'hidden', border: '1px solid #333' }}>
        <div style={{ height: '100%', width: `${Math.min(100, value)}%`, background: color, transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

// ── KV 行 ────────────────────────────────────────────────────────────────────
function KV({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px dashed rgba(255,255,255,0.08)' }}>
      <span style={{ color: C.muted, fontSize: 12 }}>{label}</span>
      <span style={{ color: highlight ? C.gold : '#fff', fontWeight: 500, fontSize: 12, textAlign: 'right', wordBreak: 'break-word', maxWidth: '60%' }}>{value}</span>
    </div>
  )
}

// ── 小标题 ───────────────────────────────────────────────────────────────────
function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, color: C.secondary, fontWeight: 700, textTransform: 'uppercase', margin: '14px 0 8px', borderBottom: `1px solid rgba(220,5,45,0.3)`, paddingBottom: 4 }}>
      {children}
    </div>
  )
}

// ── 文本卡片 ─────────────────────────────────────────────────────────────────
function Box({ children, borderColor = 'rgba(255,255,255,0.05)' }: { children: React.ReactNode; borderColor?: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: 4, marginBottom: 6, fontSize: 12, border: `1px solid ${borderColor}` }}>
      {children}
    </div>
  )
}

// ── 手风琴区块 ───────────────────────────────────────────────────────────────
function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderBottom: `1px solid ${C.border}` }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '11px 14px',
          background: open ? '#2a002a' : C.surface,
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontWeight: 700,
          fontSize: 13,
          color: open ? C.secondary : '#ccc',
          userSelect: 'none',
          transition: 'all 0.15s',
          borderBottom: open ? `1px solid ${C.border}` : 'none',
        }}
      >
        <span>{title}</span>
        <span style={{ fontSize: 11, color: open ? C.secondary : '#888', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
      </div>
      {open && (
        <div style={{ padding: '12px 14px', background: C.bg }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ── 主组件 ───────────────────────────────────────────────────────────────────
export default function DataPanel_绿茵好莱坞({ variables, onClose }: PanelPresetProps) {
  const [heroOpen, setHeroOpen] = useState(false)

  // 叙事摘要
  const title  = getV(variables, '叙事.标题', getV(variables, 'stat_data.叙事.标题', '等待连接...'))
  const intro  = getV(variables, '叙事.引言', getV(variables, 'stat_data.叙事.引言', '--'))
  const time   = getV(variables, '当前时间',  getV(variables, 'stat_data.当前时间', '--'))
  const loc    = getV(variables, '当前地点',  getV(variables, 'stat_data.当前地点', '--'))

  // 基本信息
  const basic = getObj(variables, '基本信息')
  const health = String(basic['健康状况'] ?? '-')
  const isInjured = health !== '健康' && health !== '-' && health !== '待定'

  // 竞技能力
  const ath = getObj(variables, '竞技能力')
  const stamina = Number(ath['当前体能'] ?? 0)
  const condition = Number(ath['竞技状态'] ?? 0)
  const core = getObj(variables, '竞技能力.核心能力')
  const radarStats = [
    Number(core['速度'] ?? 0), Number(core['射门'] ?? 0), Number(core['盘带'] ?? 0),
    Number(core['防守'] ?? 0), Number(core['体格'] ?? 0), Number(core['传球'] ?? 0),
    Number(core['精神'] ?? 0), Number(core['稳定性'] ?? 0),
  ]
  const habits = Object.entries(getObj(variables, '竞技能力.个人习惯'))

  // 俱乐部现状
  const club = getObj(variables, '俱乐部现状')
  const ranks = Object.entries(getObj(variables, '俱乐部现状.各项赛事排名'))

  // 生涯记录
  const career = getObj(variables, '生涯记录')
  const seasons = Object.entries(getObj(variables, '生涯记录.赛季数据'))
  const total = getObj(variables, '生涯记录.生涯总计')
  const honorsP = Object.entries(getObj(variables, '生涯记录.个人荣誉'))
  const honorsT = Object.entries(getObj(variables, '生涯记录.团队荣誉'))
  const injuries = Object.entries(getObj(variables, '生涯记录.伤病史'))
  const nt = career['国家队'] as Record<string, any> | undefined

  // 社交关系
  const socials = Object.entries(getObj(variables, '社交关系'))
  const wArr: [string, any][] = [], lArr: [string, any][] = [], fArr: [string, any][] = [], rArr: [string, any][] = [], oArr: [string, any][] = []
  for (const [name, data] of socials) {
    const d = data as Record<string, any>
    const s = d['亲密状态'] ?? ''
    const fav = Number(d['好感度'] ?? 0)
    if (s === '妻子') wArr.push([name, d])
    else if (s === '情人') lArr.push([name, d])
    else if (fav > 30) fArr.push([name, d])
    else if (fav < -30) rArr.push([name, d])
    else oArr.push([name, d])
  }

  // 足坛动态
  const news = Object.entries(getObj(variables, '足坛动态')).reverse()

  const socGroup = (label: string, items: [string, any][], style: React.CSSProperties) => (
    <div style={{ marginBottom: 10, borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ fontWeight: 800, padding: '6px 12px', fontSize: 13, ...style }}>{label}</div>
      <div style={{ padding: '0 8px 4px' }}>
        {items.length === 0
          ? <div style={{ color: C.muted, fontSize: 12, padding: '4px 0' }}>暂无记录</div>
          : items.map(([name, d]) => (
            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed rgba(255,255,255,0.08)' }}>
              <span style={{ color: '#fff', fontSize: 12 }}>{name}</span>
              <span style={{ color: C.gold, fontSize: 12 }}>好感: {d['好感度'] ?? 0}</span>
            </div>
          ))
        }
      </div>
    </div>
  )

  return (
    <div style={{ width: '100%', background: C.bg, overflow: 'hidden', fontSize: 13, color: C.text }}>

      {/* Hero 区 */}
      <div
        style={{
          background: 'linear-gradient(135deg, #3b003a 0%, #110011 100%)',
          padding: '12px 14px',
          borderBottom: `2px solid ${C.secondary}`,
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div
            onClick={() => setHeroOpen(o => !o)}
            style={{ flex: 1, cursor: 'pointer' }}
          >
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{title}</div>
            <div style={{ fontStyle: 'italic', color: '#ffd700', fontSize: 12, marginTop: 4 }}>{intro}</div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 0 0 8px', flexShrink: 0 }}
              aria-label="关闭"
            >×</button>
          )}
        </div>
        <div
          onClick={() => setHeroOpen(o => !o)}
          style={{ fontSize: 11, color: C.muted, marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 4, display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}
        >
          <span style={{ color: '#888', fontSize: 10 }}>{heroOpen ? '▲ 收起' : '▼ 展开数据面板'}</span>
          <span>{time} | {loc}</span>
        </div>
      </div>

      {/* 主内容（手风琴） */}
      {heroOpen && (
        <div>
          {/* 1. 基本信息 */}
          <Section title="基本信息" defaultOpen>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              {(['姓名','年龄','国籍','身材','惯用脚','出生年月'] as const).map(f => (
                <KV key={f} label={f} value={String(basic[f] ?? '-')} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed rgba(255,255,255,0.08)' }}>
              <span style={{ color: C.muted, fontSize: 12 }}>健康状况</span>
              <span style={{ color: isInjured ? C.red : '#fff', fontWeight: 500, fontSize: 12 }}>{health}</span>
            </div>
          </Section>

          {/* 2. 竞技能力 */}
          <Section title="竞技能力">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              {(['所在球队','号码','擅长位置','总评价','身价','年薪','合同到期时间'] as const).map(f => (
                <KV key={f} label={f === '合同到期时间' ? '合同到期' : f} value={String(ath[f] ?? '-')} highlight={f === '号码'} />
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <Bar label="竞技状态" value={condition} />
              <Bar label="当前体能" value={stamina} />
            </div>
            {habits.length > 0 && (
              <>
                <SubTitle>个人习惯</SubTitle>
                {habits.map(([h, d]) => (
                  <Box key={h}>
                    <strong style={{ color: C.secondary }}>[{h}]</strong> {String(d)}
                  </Box>
                ))}
              </>
            )}
            <SubTitle>核心能力雷达图</SubTitle>
            <RadarChart stats={radarStats} />
          </Section>

          {/* 3. 俱乐部现状 */}
          <Section title="俱乐部现状">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              {(['当前球队','球队主教练','球队队长','球队地位','更衣室氛围'] as const).map(f => (
                <KV key={f} label={f.replace('球队', '')} value={String(club[f] ?? '-')} />
              ))}
              <KV label="近期战绩" value={String(club['近期战绩'] ?? '-')} highlight />
            </div>
            {ranks.length > 0 && (
              <>
                <SubTitle>各项赛事排名</SubTitle>
                {ranks.map(([r, v]) => <KV key={r} label={r} value={String(v)} highlight />)}
              </>
            )}
          </Section>

          {/* 4. 生涯记录 */}
          <Section title="生涯记录">
            <SubTitle>赛季数据</SubTitle>
            {seasons.length === 0
              ? <div style={{ color: C.muted, fontSize: 12 }}>暂无赛季数据</div>
              : seasons.map(([s, d]) => {
                const sd = d as Record<string, any>
                return (
                  <Box key={s} borderColor="#ffca2840">
                    <span style={{ color: '#fff', fontWeight: 700 }}>{s}</span>，出场 <span style={{ color: C.gold }}>{sd['出场数'] ?? 0}</span> 次，进球 <span style={{ color: C.gold }}>{sd['进球数'] ?? 0}</span>，助攻 <span style={{ color: C.gold }}>{sd['助攻数'] ?? 0}</span>，均分 <span style={{ color: C.gold }}>{sd['平均评分'] ?? 0}</span>
                  </Box>
                )
              })
            }
            <SubTitle>生涯总计</SubTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 8px' }}>
              <KV label="出场" value={String(total['总出场'] ?? 0)} />
              <KV label="进球" value={String(total['总进球'] ?? 0)} highlight />
              <KV label="助攻" value={String(total['总助攻'] ?? 0)} highlight />
            </div>
            {nt && (
              <>
                <SubTitle>国家队生涯</SubTitle>
                <KV label="国家队声望" value={String(nt['国家队声望'] ?? '-')} />
                {nt['成年队'] && typeof nt['成年队'] === 'object' && (
                  <Box>
                    <div style={{ color: '#aaa', marginBottom: 4 }}>成年队（首秀: {nt['成年队']['首秀日期'] ?? '-'}）</div>
                    <div style={{ color: '#ddd' }}>出场 {nt['成年队']['出场次数'] ?? 0} | 进球 {nt['成年队']['进球数'] ?? 0} | 助攻 {nt['成年队']['助攻数'] ?? 0}</div>
                  </Box>
                )}
              </>
            )}
            {honorsP.length > 0 && (
              <>
                <SubTitle>个人荣誉</SubTitle>
                {honorsP.map(([y, h]) => <KV key={y} label={y} value={String(h)} />)}
              </>
            )}
            {honorsT.length > 0 && (
              <>
                <SubTitle>团队荣誉</SubTitle>
                {honorsT.map(([y, h]) => <KV key={y} label={y} value={String(h)} highlight />)}
              </>
            )}
            <SubTitle>伤病史</SubTitle>
            {injuries.length === 0
              ? <div style={{ color: C.green, fontSize: 12 }}>保持健康！暂无伤病</div>
              : injuries.map(([t, i]) => (
                <Box key={t} borderColor={C.red}>
                  <div style={{ color: '#aaa', marginBottom: 4 }}>{t}</div>
                  <div style={{ color: C.red }}>{String(i)}</div>
                </Box>
              ))
            }
          </Section>

          {/* 5. 社交关系 */}
          <Section title="社交关系">
            {socGroup('💍 妻子',    wArr, { background: 'linear-gradient(90deg,#880e4f 0%,transparent 100%)', color: '#ff80ab', borderLeft: `4px solid #f50057` })}
            {socGroup('💕 情人',    lArr, { background: 'linear-gradient(90deg,#4a148c 0%,transparent 100%)', color: '#ea80fc', borderLeft: `4px solid #d500f9` })}
            {socGroup('🤝 朋友',    fArr, { background: 'linear-gradient(90deg,#1b5e20 0%,transparent 100%)', color: '#b9f6ca', borderLeft: `4px solid #00e676` })}
            {socGroup('⚔️ 对手',   rArr, { background: 'linear-gradient(90deg,#b71c1c 0%,transparent 100%)', color: '#ff8a80', borderLeft: `4px solid #ff1744` })}
            {socGroup('👥 泛泛之交', oArr, { background: 'linear-gradient(90deg,#263238 0%,transparent 100%)', color: '#cfd8dc', borderLeft: `4px solid #78909c` })}
          </Section>

          {/* 6. 足坛动态 */}
          <Section title="足坛动态">
            {news.length === 0
              ? <div style={{ color: C.muted, fontSize: 12 }}>暂无动态</div>
              : news.map(([id, n]) => {
                const nd = n as Record<string, any>
                return (
                  <div key={id} style={{ borderLeft: `2px solid ${C.secondary}`, background: C.surface, padding: 10, marginBottom: 8, borderRadius: '0 4px 4px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa', fontSize: 11, marginBottom: 4 }}>
                      <span>📰 {nd['发布者'] ?? '未知'}</span>
                      <span>{nd['发布时间'] ?? ''}</span>
                    </div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{id}</div>
                    <div style={{ color: '#bbb', fontSize: 12 }}>{nd['内容'] ?? ''}</div>
                    <div style={{ textAlign: 'right', color: '#888', fontSize: 11, marginTop: 4 }}>❤️ {nd['点赞数'] ?? 0}</div>
                  </div>
                )
              })
            }
          </Section>
        </div>
      )}
    </div>
  )
}
