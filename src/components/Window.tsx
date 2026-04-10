import { useRef, type ReactNode } from 'react'
import type { WindowState } from '../types'

interface WindowProps {
  state: WindowState
  isActive: boolean
  onClose: () => void
  onMinimize: () => void
  onMaximize: () => void
  onFocus: () => void
  onMove: (x: number, y: number) => void
  children: ReactNode
}

export function Window({
  state,
  isActive,
  onClose,
  onMinimize,
  onMaximize,
  onFocus,
  onMove,
  children,
}: WindowProps) {
  const dragRef = useRef<{
    startX: number
    startY: number
    posX: number
    posY: number
  } | null>(null)

  const handlePointerDown = (e: React.PointerEvent) => {
    if (state.isMaximized) return
    if ((e.target as HTMLElement).closest('button')) return
    e.preventDefault()
    onFocus()

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: state.position.x,
      posY: state.position.y,
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!dragRef.current) return
      onMove(
        dragRef.current.posX + e.clientX - dragRef.current.startX,
        dragRef.current.posY + e.clientY - dragRef.current.startY
      )
    }

    const handlePointerUp = () => {
      dragRef.current = null
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
    }

    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', handlePointerUp)
  }

  if (state.isMinimized) return null

  const style: React.CSSProperties = state.isMaximized
    ? { zIndex: state.zIndex }
    : {
        left: state.position.x,
        top: state.position.y,
        width: state.size.width,
        height: state.size.height,
        zIndex: state.zIndex,
      }

  return (
    <div
      className={`window win95-window ${state.isMaximized ? 'win95-window--maximized' : ''}`}
      style={style}
      onMouseDown={onFocus}
    >
      <div
        className={`title-bar ${!isActive ? 'inactive' : ''}`}
        onPointerDown={handlePointerDown}
      >
        <div className="title-bar-text">{state.title}</div>
        <div className="title-bar-controls">
          <button
            aria-label="Minimize"
            onClick={(e) => {
              e.stopPropagation()
              onMinimize()
            }}
          />
          <button
            aria-label="Maximize"
            onClick={(e) => {
              e.stopPropagation()
              onMaximize()
            }}
          />
          <button
            aria-label="Close"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
          />
        </div>
      </div>
      {children}
    </div>
  )
}
