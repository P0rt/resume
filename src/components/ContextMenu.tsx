import { useState, useEffect, useRef } from 'react'

export interface MenuItem {
  label: string
  icon?: string
  action?: () => void
  divider?: boolean
  disabled?: boolean
  bold?: boolean
  submenu?: MenuItem[]
}

interface ContextMenuProps {
  x: number
  y: number
  items: MenuItem[]
  onClose: () => void
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x, y })

  useEffect(() => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const nx = x + rect.width > window.innerWidth ? window.innerWidth - rect.width - 4 : x
    const ny = y + rect.height > window.innerHeight ? window.innerHeight - rect.height - 4 : y
    setPos({ x: Math.max(0, nx), y: Math.max(0, ny) })
  }, [x, y])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="ctx-overlay" onMouseDown={onClose} onContextMenu={(e) => e.preventDefault()}>
      <div
        ref={ref}
        className="ctx-menu"
        style={{ left: pos.x, top: pos.y }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {items.map((item, i) =>
          item.divider ? (
            <hr key={i} className="ctx-menu__divider" />
          ) : item.submenu ? (
            <SubMenu key={i} item={item} onClose={onClose} />
          ) : (
            <button
              key={i}
              className={`ctx-menu__item ${item.bold ? 'ctx-menu__item--bold' : ''}`}
              disabled={item.disabled}
              onClick={() => {
                item.action?.()
                onClose()
              }}
            >
              <span className="ctx-menu__item-icon">{item.icon ?? ''}</span>
              <span className="ctx-menu__item-label">{item.label}</span>
            </button>
          )
        )}
      </div>
    </div>
  )
}

function SubMenu({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleEnter = () => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setOpen(true), 200)
  }
  const handleLeave = () => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setOpen(false), 300)
  }

  return (
    <div
      ref={ref}
      className="ctx-menu__sub-wrapper"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button className="ctx-menu__item ctx-menu__item--sub">
        <span className="ctx-menu__item-icon">{item.icon ?? ''}</span>
        <span className="ctx-menu__item-label">{item.label}</span>
        <span className="ctx-menu__arrow">▶</span>
      </button>
      {open && item.submenu && (
        <div className="ctx-menu ctx-menu--nested">
          {item.submenu.map((sub, i) =>
            sub.divider ? (
              <hr key={i} className="ctx-menu__divider" />
            ) : (
              <button
                key={i}
                className="ctx-menu__item"
                disabled={sub.disabled}
                onClick={() => {
                  sub.action?.()
                  onClose()
                }}
              >
                <span className="ctx-menu__item-icon">{sub.icon ?? ''}</span>
                <span className="ctx-menu__item-label">{sub.label}</span>
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}
