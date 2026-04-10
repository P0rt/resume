import { useState, useEffect } from 'react'
import type { WindowId, WindowState } from '../types'
import {
  WindowsIcon,
  NotepadIcon,
  ComputerIcon,
  FolderIcon,
  GlobeIcon,
  MailIcon,
} from './Icons'

interface TaskbarProps {
  windows: WindowState[]
  startMenuOpen: boolean
  onStartClick: (e: React.MouseEvent) => void
  onWindowClick: (id: WindowId) => void
  onOpenWindow: (id: WindowId) => void
  onOpenLink: (url: string) => void
  onShutdown: () => void
}

function formatTime() {
  return new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function Taskbar({
  windows,
  startMenuOpen,
  onStartClick,
  onWindowClick,
  onOpenWindow,
  onOpenLink,
  onShutdown,
}: TaskbarProps) {
  const [time, setTime] = useState(formatTime)

  useEffect(() => {
    const id = setInterval(() => setTime(formatTime()), 1000)
    return () => clearInterval(id)
  }, [])

  const activeWindowId = windows
    .filter((w) => !w.isMinimized)
    .sort((a, b) => b.zIndex - a.zIndex)[0]?.id

  return (
    <>
      {startMenuOpen && (
        <div className="start-menu" onClick={(e) => e.stopPropagation()}>
          <div className="window" style={{ display: 'flex', padding: 3 }}>
            <div className="start-menu__sidebar">
              <span className="start-menu__sidebar-text">
                Windows<b>Me</b>
              </span>
            </div>
            <div className="start-menu__items">
              <button
                className="start-menu__item"
                onClick={() => onOpenWindow('notepad')}
              >
                <span className="start-menu__item-icon">
                  <NotepadIcon size={24} />
                </span>
                Resume.txt
              </button>
              <button
                className="start-menu__item"
                onClick={() => onOpenWindow('mycomputer')}
              >
                <span className="start-menu__item-icon">
                  <ComputerIcon size={24} />
                </span>
                My Computer
              </button>
              <button
                className="start-menu__item"
                onClick={() => onOpenWindow('experience')}
              >
                <span className="start-menu__item-icon">
                  <FolderIcon size={24} />
                </span>
                Experience
              </button>
              <button
                className="start-menu__item"
                onClick={() => onOpenLink('about:home')}
              >
                <span className="start-menu__item-icon">
                  <GlobeIcon size={24} />
                </span>
                Internet Explorer
              </button>
              <hr className="start-menu__divider" />
              <button
                className="start-menu__item"
                onClick={() => onOpenLink('https://www.linkedin.com/in/sergey-p-721b25171/')}
              >
                <span className="start-menu__item-icon">
                  <GlobeIcon size={24} />
                </span>
                LinkedIn
              </button>
              <button
                className="start-menu__item"
                onClick={() => onOpenLink('https://github.com/P0rt')}
              >
                <span className="start-menu__item-icon">
                  <GlobeIcon size={24} />
                </span>
                GitHub
              </button>
              <button
                className="start-menu__item"
                onClick={() => onOpenLink('mailto:sergey.paarfenov@gmail.com')}
              >
                <span className="start-menu__item-icon">
                  <MailIcon size={24} />
                </span>
                Email
              </button>
              <hr className="start-menu__divider" />
              <button className="start-menu__item" onClick={onShutdown}>
                <span className="start-menu__item-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" fill="#c0c0c0" stroke="#000" strokeWidth="1" />
                    <circle cx="12" cy="12" r="6" fill="#ff0000" />
                    <rect x="11" y="2" width="2" height="10" fill="#000" />
                  </svg>
                </span>
                Shut Down...
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="taskbar">
        <button
          className={`start-button ${startMenuOpen ? 'start-button--active' : ''}`}
          onClick={onStartClick}
        >
          <WindowsIcon size={16} />
          <span>Start</span>
        </button>
        <div className="taskbar__divider" />
        <div className="taskbar__windows">
          {windows.map((w) => (
            <button
              key={w.id}
              className={`taskbar__window-btn ${
                w.id === activeWindowId && !w.isMinimized
                  ? 'taskbar__window-btn--active'
                  : ''
              }`}
              onClick={() => onWindowClick(w.id)}
            >
              {w.title}
            </button>
          ))}
        </div>
        <div className="taskbar__tray">{time}</div>
      </div>
    </>
  )
}
