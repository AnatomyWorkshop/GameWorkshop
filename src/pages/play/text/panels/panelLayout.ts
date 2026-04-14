export const PANEL_WIDTH = 280
export const PANEL_MAX_HEIGHT = 400
export const PANEL_TOP_OFFSET = 56 // TopBar height
export const PANEL_RIGHT_OFFSET = 16
export const PANEL_GAP = 12

export function getPanelStyle(index: number): React.CSSProperties {
  return {
    position: 'fixed',
    zIndex: 30,
    top: `${PANEL_TOP_OFFSET + index * (PANEL_MAX_HEIGHT + PANEL_GAP)}px`,
    right: `${PANEL_RIGHT_OFFSET}px`,
    width: `${PANEL_WIDTH}px`,
    maxHeight: `${PANEL_MAX_HEIGHT}px`,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--color-surface)',
    borderColor: 'var(--color-border)',
    color: 'var(--color-text)',
  }
}
