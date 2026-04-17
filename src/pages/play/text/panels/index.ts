/**
 * panels/ — Text 游玩页悬浮面板系统
 *
 * 目录结构：
 *   FloatingPanel.tsx      通用悬浮面板外壳（behavior: peek / tool / pinned）
 *   PanelsHost.tsx         面板宿主，读取 floating_panels 声明，路由到各 preset
 *   StatsPanel.tsx         状态条面板（frameless，pinned）
 *   TagsPanel.tsx          叙事标签条（frameless，peek）
 *   panelLayout.ts         定位常量与工具函数
 *   hooks/
 *     useDraggable.ts      拖动 hook（PointerEvent + localStorage 持久化）
 *   presets/               官方内置 preset（无游戏耦合）
 *     StatsPanel.tsx       声明式状态条，支持进度条
 *     TagsPanel.tsx        叙事标签横向滚动条
 *     CharacterSheet.tsx   角色属性 KV 展示
 *     TelemetryDebug.tsx   调试信息
 *     HtmlPanel.tsx        iframe 沙箱 HTML 模板
 *   gamePresets/           游戏专属 preset（有游戏名耦合，按需添加）
 *     DataPanel_绿茵好莱坞.tsx
 *     SetupFormModal.tsx
 *
 * 新增 preset 步骤：
 *   1. 在 presets/ 或 gamePresets/ 创建组件
 *   2. 在 PanelsHost.tsx 的 for 循环内添加路由分支
 *   3. 在 api/types.ts FloatingPanelDecl.preset 联合类型中添加新名称
 *   4. 在 TEXT-PLAY-SPEC.md 2.2 节补充说明
 */

export { FloatingPanel } from './FloatingPanel'
export type { FloatingPanelProps } from './FloatingPanel'
export { default as PanelsHost } from './PanelsHost'
export { default as StatsPanel } from './presets/StatsPanel'
export { default as TagsPanel } from './presets/TagsPanel'
export { useDraggable } from './hooks/useDraggable'
