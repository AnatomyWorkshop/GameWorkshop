import type { FloatingPanelDecl } from '@/api/types'
import type { NarrativeToken } from '@/utils/tokenExtract'
import CharacterSheet from './presets/CharacterSheet'
import PhoneStatus from './presets/PhoneStatus'
import TelemetryDebug from './presets/TelemetryDebug'
import { FloatingPanel } from '@/components/overlay/FloatingPanel'
import { getPanelStyle } from './panelLayout'
import StatsPanel from './StatsPanel'
import TagsPanel from './TagsPanel'

interface Props {
  panels: FloatingPanelDecl[]
  narrativeTagItems?: any[]
  statsItems?: any[]
  variables: Record<string, unknown>
  tokens: NarrativeToken[]
  floorCount: number
  tokenUsed?: number
  modelLabel?: string
  sessionId: string
  panelStates: Record<string, boolean>
  onClosePanel: (id: string) => void
}

export default function PanelsHost({
  panels,
  narrativeTagItems,
  statsItems,
  variables,
  tokens,
  floorCount,
  tokenUsed,
  modelLabel,
  sessionId,
  panelStates,
  onClosePanel
}: Props) {
  const rightStack: { id: string, render: (index: number) => React.ReactNode }[] = []

  if (panelStates['stats'] && statsItems && statsItems.length > 0) {
    rightStack.push({
      id: 'stats',
      render: (idx) => (
        <StatsPanel
          key="stats"
          sessionId={sessionId}
          variables={variables}
          items={statsItems}
          onClose={() => onClosePanel('stats')}
          style={getPanelStyle(idx)}
        />
      )
    })
  }

  // 创作者自定义面板
  for (const p of panels) {
    if (panelStates[p.id]) {
      rightStack.push({
        id: p.id,
        render: (idx) => (
          <FloatingPanel
            key={p.id}
            id={p.id}
            title={p.id}
            icon={p.launcher.icon}
            onClose={() => onClosePanel(p.id)}
            style={getPanelStyle(idx)}
            headerHidden={p.preset === 'telemetry_debug'}
            closeOnOutsideClick={p.preset !== 'telemetry_debug'}
            closeOnPanelClick={p.preset === 'telemetry_debug'}
          >
            {p.preset === 'character_sheet' && <CharacterSheet variables={variables} tokens={tokens} />}
            {p.preset === 'phone_status' && <PhoneStatus variables={variables} tokens={tokens} />}
            {p.preset === 'telemetry_debug' && <TelemetryDebug floorCount={floorCount} tokenUsed={tokenUsed} modelLabel={modelLabel} />}
          </FloatingPanel>
        )
      })
    }
  }

  const showTagsBar = !!(panelStates['tags'] && narrativeTagItems && narrativeTagItems.length > 0)
  if (!showTagsBar && rightStack.length === 0) return null

  return (
    <>
      {showTagsBar && (
        <TagsPanel
          items={narrativeTagItems as any[]}
          variables={variables}
          tokens={tokens}
          onClose={() => onClosePanel('tags')}
          mode="topbar"
        />
      )}
      {rightStack.map((p, i) => p.render(i))}
    </>
  )
}
