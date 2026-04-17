/**
 * PanelsHost — 悬浮面板宿主
 *
 * 渲染规则：
 * - 所有面板由 game.json floating_panels.panels 声明
 * - PanelSwitcherMenu 按钮切换 panelStates[id]
 * - panelStates[id] === true 时渲染对应面板
 * - 每个面板直接渲染，无外部框架，自带 position:fixed 定位
 * - 面板通过 onClose prop 关闭自身
 *
 * preset 路由（直接 import，不依赖注册表）：
 *   data_panel / phone_status → DataPanel_绿茵好莱坞
 *   character_sheet           → CharacterSheet
 *   stats                     → StatsPanel
 *   tags                      → TagsPanel（固定在 TopBar 下方）
 *   telemetry_debug           → TelemetryDebug（FloatingPanel tool 行为）
 *   html_panel                → HtmlPanel（iframe 沙箱，FloatingPanel pinned）
 */

import type { FloatingPanelDecl } from '@/api/types'
import type { NarrativeToken } from '@/utils/tokenExtract'
import CharacterSheet from './presets/CharacterSheet'
import TelemetryDebug from './presets/TelemetryDebug'
import HtmlPanel from './presets/HtmlPanel'
import { FloatingPanel } from './FloatingPanel'
import { PANEL_LARGE_WIDTH, PANEL_LARGE_MAX_HEIGHT, PANEL_TOP_OFFSET, PANEL_RIGHT_OFFSET, PANEL_WIDTH, PANEL_MAX_HEIGHT, getPanelStyle } from './panelLayout'
import StatsPanel from './presets/StatsPanel'
import TagsPanel from './presets/TagsPanel'
import DataPanel_绿茵好莱坞 from './gamePresets/DataPanel_绿茵好莱坞'
import { useDraggable } from './hooks/useDraggable'

/** 游戏专属面板的可拖动 wrapper（每个面板实例独立持久化位置） */
function DraggableGamePanel({ id, style, draggable, children }: {
  id: string
  style: React.CSSProperties
  draggable: boolean
  children: React.ReactNode
}) {
  const { ref, offset, dragHandleProps } = useDraggable({ id, enabled: draggable })
  return (
    <div
      ref={ref}
      {...dragHandleProps}
      style={{ ...style, ...dragHandleProps.style, transform: `translate3d(${offset.dx}px, ${offset.dy}px, 0)` }}
    >
      {children}
    </div>
  )
}

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
  streamDone?: boolean
}

/** 官方内置面板的 fixed 定位样式（右侧堆叠） */
function builtinStyle(index: number): React.CSSProperties {
  return {
    position: 'fixed',
    zIndex: 30,
    top: `${PANEL_TOP_OFFSET + index * (PANEL_MAX_HEIGHT + 12)}px`,
    right: `${PANEL_RIGHT_OFFSET}px`,
    width: `${PANEL_WIDTH}px`,
    maxHeight: `${PANEL_MAX_HEIGHT}px`,
  }
}

/** 游戏专属面板的 fixed 定位样式（大尺寸） */
function gameStyle(index: number): React.CSSProperties {
  return {
    position: 'fixed',
    zIndex: 30,
    top: `${PANEL_TOP_OFFSET + index * (PANEL_LARGE_MAX_HEIGHT + 12)}px`,
    right: `${PANEL_RIGHT_OFFSET}px`,
    width: `${PANEL_LARGE_WIDTH}px`,
    maxHeight: `${PANEL_LARGE_MAX_HEIGHT}px`,
    overflowY: 'auto',
    borderRadius: 8,
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  }
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
  onClosePanel,
  streamDone = true,
}: Props) {
  // 右侧堆叠队列（按声明顺序，open 的面板依次排列）
  const rightStack: { id: string; render: (index: number) => React.ReactNode }[] = []

  // TagsPanel 独立定位，不参与右侧堆叠
  let tagsPanel: React.ReactNode = null

  for (const p of panels) {
    if (!panelStates[p.id]) continue

    const preset = p.preset
    const close = () => onClosePanel(p.id)

    // ── tags：固定在 TopBar 下方，不参与右侧堆叠 ──────────────────────────
    if (preset === 'tags') {
      if (narrativeTagItems && narrativeTagItems.length > 0) {
        tagsPanel = (
          <TagsPanel
            key={p.id}
            items={narrativeTagItems}
            variables={variables}
            tokens={tokens}
            onClose={close}
            mode="topbar"
          />
        )
      }
      continue
    }

    // ── 右侧堆叠面板 ──────────────────────────────────────────────────────
    rightStack.push({
      id: p.id,
      render: (idx) => {
        // data_panel / phone_status → 绿茵好莱坞数据面板（双名称兼容）
        if (preset === 'data_panel' || preset === 'phone_status') {
          return (
            <DraggableGamePanel key={p.id} id={p.id} style={gameStyle(idx)} draggable={p.draggable ?? false}>
              <DataPanel_绿茵好莱坞
                variables={variables}
                tokens={tokens}
                displayVars={p.display_vars}
                onClose={close}
              />
            </DraggableGamePanel>
          )
        }

        // character_sheet
        if (preset === 'character_sheet') {
          return (
            <CharacterSheet
              key={p.id}
              variables={variables}
              tokens={tokens}
              onClose={close}
              style={builtinStyle(idx)}
            />
          )
        }

        // stats
        if (preset === 'stats') {
          return (
            <StatsPanel
              key={p.id}
              sessionId={sessionId}
              variables={variables}
              items={statsItems}
              onClose={close}
              style={builtinStyle(idx)}
            />
          )
        }

        // telemetry_debug
        if (preset === 'telemetry_debug') {
          return (
            <FloatingPanel
              key={p.id}
              id={p.id}
              title="调试"
              icon="🔧"
              onClose={close}
              style={getPanelStyle(idx)}
              behavior="tool"
              draggable={false}
            >
              <TelemetryDebug floorCount={floorCount} tokenUsed={tokenUsed} modelLabel={modelLabel} />
            </FloatingPanel>
          )
        }

        // html_panel
        if (p.type === 'html_panel' && p.config?.template_url) {
          return (
            <FloatingPanel
              key={p.id}
              id={p.id}
              title={p.launcher.label ?? p.id}
              icon={p.launcher.icon}
              onClose={close}
              style={getPanelStyle(idx)}
              behavior="pinned"
              draggable={false}
            >
              <HtmlPanel
                variables={variables}
                templateUrl={p.config.template_url}
                injectMode={p.config.inject_mode}
                streamDone={streamDone}
              />
            </FloatingPanel>
          )
        }

        return null
      },
    })
  }

  // 兼容旧路径：没有 floating_panels 声明时，仍支持 narrativeTagItems 直接显示
  if (!tagsPanel && panelStates['tags'] && narrativeTagItems && narrativeTagItems.length > 0) {
    tagsPanel = (
      <TagsPanel
        key="tags-legacy"
        items={narrativeTagItems}
        variables={variables}
        tokens={tokens}
        onClose={() => onClosePanel('tags')}
        mode="topbar"
      />
    )
  }

  // 兼容旧路径：stats 面板没有通过 floating_panels 声明时
  if (panelStates['stats'] && statsItems && statsItems.length > 0 && !panels.some(p => p.preset === 'stats')) {
    rightStack.unshift({
      id: 'stats-legacy',
      render: (idx) => (
        <StatsPanel
          key="stats-legacy"
          sessionId={sessionId}
          variables={variables}
          items={statsItems}
          onClose={() => onClosePanel('stats')}
          style={builtinStyle(idx)}
        />
      ),
    })
  }

  if (!tagsPanel && rightStack.length === 0) return null

  return (
    <>
      {tagsPanel}
      {rightStack.map((p, i) => p.render(i))}
    </>
  )
}
