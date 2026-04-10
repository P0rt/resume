import { useRef, type ReactNode } from 'react'
import type { WindowState } from '../types'

const MIN_W = 220
const MIN_H = 150

type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

interface WindowProps {
  state: WindowState
  isActive: boolean
  onClose: () => void
  onMinimize: () => void
  onMaximize: () => void
  onFocus: () => void
  onMove: (x: number, y: number) => void
  onResize: (x: number, y: number, w: number, h: number) => void
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
  onResize,
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

  const handleResizePointerDown = (e: React.PointerEvent, dir: ResizeDir) => {
    if (state.isMaximized) return
    e.stopPropagation()
    e.preventDefault()
    onFocus()

    const startX = e.clientX
    const startY = e.clientY
    const startPos = { ...state.position }
    const startSize = { ...state.size }

    const onPointerMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY

      let nx = startPos.x
      let ny = startPos.y
      let nw = startSize.width
      let nh = startSize.height

      if (dir.includes('e')) nw = Math.max(MIN_W, startSize.width + dx)
      if (dir.includes('w')) {
        nw = Math.max(MIN_W, startSize.width - dx)
        nx = startPos.x + startSize.width - nw
      }
      if (dir.includes('s')) nh = Math.max(MIN_H, startSize.height + dy)
      if (dir.includes('n')) {
        nh = Math.max(MIN_H, startSize.height - dy)
        ny = startPos.y + startSize.height - nh
      }

      onResize(nx, ny, nw, nh)
    }

    const onPointerUp = () => {
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)
    }

    document.addEventListener('pointermove', onPointerMove)
    document.addEventListener('pointerup', onPointerUp)
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
      {!state.isMaximized && (
        <>
          <div className="win-resize win-resize--n" onPointerDown={(e) => handleResizePointerDown(e, 'n')} />
          <div className="win-resize win-resize--s" onPointerDown={(e) => handleResizePointerDown(e, 's')} />
          <div className="win-resize win-resize--e" onPointerDown={(e) => handleResizePointerDown(e, 'e')} />
          <div className="win-resize win-resize--w" onPointerDown={(e) => handleResizePointerDown(e, 'w')} />
          <div className="win-resize win-resize--ne" onPointerDown={(e) => handleResizePointerDown(e, 'ne')} />
          <div className="win-resize win-resize--nw" onPointerDown={(e) => handleResizePointerDown(e, 'nw')} />
          <div className="win-resize win-resize--se" onPointerDown={(e) => handleResizePointerDown(e, 'se')} />
          <div className="win-resize win-resize--sw" onPointerDown={(e) => handleResizePointerDown(e, 'sw')} />
        </>
      )}
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
