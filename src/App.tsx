import { useState, useCallback } from 'react'
import { useWindowManager } from './hooks/useWindowManager'
import { Desktop } from './components/Desktop'
import { Window } from './components/Window'
import { Taskbar } from './components/Taskbar'
import { Notepad } from './components/Notepad'
import { Explorer } from './components/Explorer'
import { PhotoViewer } from './components/PhotoViewer'
import { Browser } from './components/Browser'
import { ContextMenu, type MenuItem } from './components/ContextMenu'
import { Assistant } from './components/Assistant'
import type { WindowId } from './types'

interface CtxState {
  x: number
  y: number
  items: MenuItem[]
}

export function App() {
  const {
    windows,
    openWindow,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    focusWindow,
    moveWindow,
    toggleMinimize,
    updateTitle,
    resizeWindow,
  } = useWindowManager()
  const [startMenuOpen, setStartMenuOpen] = useState(false)
  const [isShutdown, setIsShutdown] = useState(false)
  const [browserUrl, setBrowserUrl] = useState('about:home')
  const [ctxMenu, setCtxMenu] = useState<CtxState | null>(null)

  const handleDesktopClick = useCallback(() => {
    setStartMenuOpen(false)
    setCtxMenu(null)
  }, [])

  const handleStartClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setStartMenuOpen((prev) => !prev)
    setCtxMenu(null)
  }, [])

  const handleOpenWindow = useCallback(
    (id: WindowId) => {
      openWindow(id)
      setStartMenuOpen(false)
      setCtxMenu(null)
    },
    [openWindow]
  )

  const handleOpenLink = useCallback(
    (url: string) => {
      setBrowserUrl(url)
      openWindow('browser')
      setStartMenuOpen(false)
      setCtxMenu(null)
    },
    [openWindow]
  )

  const handleBrowserTitleChange = useCallback(
    (title: string) => {
      updateTitle('browser', title)
    },
    [updateTitle]
  )

  const handleContextMenu = useCallback(
    (x: number, y: number, items: MenuItem[]) => {
      setStartMenuOpen(false)
      setCtxMenu({ x, y, items })
    },
    []
  )

  if (isShutdown) {
    return (
      <div className="shutdown-screen">
        <div className="shutdown-message">
          <div className="shutdown-message__logo">
            <svg width="64" height="64" viewBox="0 0 16 16">
              <polygon points="1,3 7,1.8 7,7.2 1,7.8" fill="#FF0000" />
              <polygon points="8.5,1.5 15,0.5 15,7 8.5,7" fill="#00B800" />
              <polygon points="1,8.8 7,8.2 7,13.8 1,13" fill="#0050FF" />
              <polygon points="8.5,8 15,8.5 15,15 8.5,14" fill="#FFB900" />
            </svg>
          </div>
          <p className="shutdown-message__brand">
            Windows Me
            <span>Millennium Edition</span>
          </p>
          <p>Windows is shutting down...</p>
          <button
            onClick={() => setIsShutdown(false)}
            style={{ marginTop: 24, padding: '4px 24px' }}
          >
            Restart
          </button>
        </div>
      </div>
    )
  }

  const activeWindowId = windows
    .filter((w) => !w.isMinimized)
    .sort((a, b) => b.zIndex - a.zIndex)[0]?.id

  return (
    <div className="desktop" onClick={handleDesktopClick} onContextMenu={(e) => e.preventDefault()}>
      <div className="desktop__area">
        <Desktop
          onOpenWindow={handleOpenWindow}
          onOpenLink={handleOpenLink}
          onContextMenu={handleContextMenu}
        />
        {windows.map((w) => (
          <Window
            key={w.id}
            state={w}
            isActive={w.id === activeWindowId}
            onClose={() => closeWindow(w.id)}
            onMinimize={() => minimizeWindow(w.id)}
            onMaximize={() => maximizeWindow(w.id)}
            onFocus={() => focusWindow(w.id)}
            onMove={(x, y) => moveWindow(w.id, x, y)}
            onResize={(x, y, width, height) => resizeWindow(w.id, x, y, width, height)}
          >
            {w.id === 'notepad' && <Notepad />}
            {w.id === 'mycomputer' && (
              <Explorer type="mycomputer" onOpenWindow={handleOpenWindow} onOpenLink={handleOpenLink} />
            )}
            {w.id === 'experience' && (
              <Explorer type="experience" onOpenWindow={handleOpenWindow} onOpenLink={handleOpenLink} />
            )}
            {w.id === 'photo' && <PhotoViewer />}
            {w.id === 'browser' && (
              <Browser url={browserUrl} onTitleChange={handleBrowserTitleChange} />
            )}
          </Window>
        ))}
      </div>
      <Taskbar
        windows={windows}
        startMenuOpen={startMenuOpen}
        onStartClick={handleStartClick}
        onWindowClick={toggleMinimize}
        onOpenWindow={handleOpenWindow}
        onOpenLink={handleOpenLink}
        onShutdown={() => setIsShutdown(true)}
      />
      <Assistant />
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={ctxMenu.items}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  )
}
