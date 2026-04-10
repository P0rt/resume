import { useState, useCallback, useRef } from 'react'
import type { WindowId, WindowState } from '../types'

const WINDOW_DEFAULTS: Record<WindowId, Omit<WindowState, 'isMinimized' | 'isMaximized' | 'zIndex'>> = {
  notepad: {
    id: 'notepad',
    title: 'resume.txt - Notepad',
    position: { x: 100, y: 24 },
    size: { width: 560, height: 460 },
  },
  mycomputer: {
    id: 'mycomputer',
    title: 'My Computer',
    position: { x: 80, y: 50 },
    size: { width: 420, height: 380 },
  },
  experience: {
    id: 'experience',
    title: 'C:\\Experience',
    position: { x: 160, y: 20 },
    size: { width: 520, height: 400 },
  },
  photo: {
    id: 'photo',
    title: 'photo.jpg - Image Viewer',
    position: { x: 200, y: 40 },
    size: { width: 380, height: 440 },
  },
  browser: {
    id: 'browser',
    title: 'Internet Explorer',
    position: { x: 60, y: 16 },
    size: { width: 620, height: 500 },
  },
}

export function useWindowManager() {
  const [windows, setWindows] = useState<WindowState[]>([])
  const nextZ = useRef(1)

  const openWindow = useCallback((id: WindowId) => {
    setWindows(prev => {
      const existing = prev.find(w => w.id === id)
      if (existing) {
        return prev.map(w =>
          w.id === id
            ? { ...w, isMinimized: false, zIndex: ++nextZ.current }
            : w
        )
      }
      return [
        ...prev,
        {
          ...WINDOW_DEFAULTS[id],
          isMinimized: false,
          isMaximized: false,
          zIndex: ++nextZ.current,
        },
      ]
    })
  }, [])

  const closeWindow = useCallback((id: WindowId) => {
    setWindows(prev => prev.filter(w => w.id !== id))
  }, [])

  const minimizeWindow = useCallback((id: WindowId) => {
    setWindows(prev =>
      prev.map(w => (w.id === id ? { ...w, isMinimized: true } : w))
    )
  }, [])

  const maximizeWindow = useCallback((id: WindowId) => {
    setWindows(prev =>
      prev.map(w =>
        w.id === id
          ? { ...w, isMaximized: !w.isMaximized, zIndex: ++nextZ.current }
          : w
      )
    )
  }, [])

  const focusWindow = useCallback((id: WindowId) => {
    setWindows(prev =>
      prev.map(w =>
        w.id === id ? { ...w, zIndex: ++nextZ.current } : w
      )
    )
  }, [])

  const moveWindow = useCallback((id: WindowId, x: number, y: number) => {
    setWindows(prev =>
      prev.map(w => (w.id === id ? { ...w, position: { x, y } } : w))
    )
  }, [])

  const toggleMinimize = useCallback((id: WindowId) => {
    setWindows(prev => {
      const win = prev.find(w => w.id === id)
      if (!win) return prev
      if (win.isMinimized) {
        return prev.map(w =>
          w.id === id
            ? { ...w, isMinimized: false, zIndex: ++nextZ.current }
            : w
        )
      }
      const maxZ = Math.max(...prev.map(w => w.zIndex))
      if (win.zIndex === maxZ) {
        return prev.map(w =>
          w.id === id ? { ...w, isMinimized: true } : w
        )
      }
      return prev.map(w =>
        w.id === id ? { ...w, zIndex: ++nextZ.current } : w
      )
    })
  }, [])

  const updateTitle = useCallback((id: WindowId, title: string) => {
    setWindows(prev =>
      prev.map(w => (w.id === id ? { ...w, title } : w))
    )
  }, [])

  return {
    windows,
    openWindow,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    focusWindow,
    moveWindow,
    toggleMinimize,
    updateTitle,
  }
}
