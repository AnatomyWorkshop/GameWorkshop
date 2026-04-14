import { useState, useRef, useEffect, ReactNode } from 'react'

export interface PopoverProps {
  trigger: ReactNode
  children: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  align?: 'left' | 'right'
}

export function Popover({ trigger, children, open: controlledOpen, onOpenChange, align = 'right' }: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const ref = useRef<HTMLDivElement>(null)

  function setOpen(newOpen: boolean) {
    if (!isControlled) setUncontrolledOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <div className="relative inline-block" ref={ref}>
      <div
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setOpen(!open)
          }
        }}
        role="button"
        tabIndex={0}
        className="outline-none"
      >
        {trigger}
      </div>
      {open && (
        <div
          className={`absolute top-full mt-1 z-20 ${align === 'right' ? 'right-0' : 'left-0'}`}
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside popover
        >
          {children}
        </div>
      )}
    </div>
  )
}
