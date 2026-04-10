import { useState, useRef, useCallback } from 'react'
import type { WindowId } from '../types'
import type { MenuItem } from './ContextMenu'
import {
  NotepadIcon,
  ComputerIcon,
  FolderIcon,
  GlobeIcon,
  MailIcon,
  PdfIcon,
  ImageIcon,
  RecycleIcon,
} from './Icons'

interface DesktopProps {
  onOpenWindow: (id: WindowId) => void
  onOpenLink: (url: string) => void
  onContextMenu: (x: number, y: number, items: MenuItem[]) => void
}

interface IconConfig {
  id: string
  label: string
  icon: React.ReactNode
  windowId?: WindowId
  url?: string
  download?: string
}

const ICONS: IconConfig[] = [
  { id: 'notepad', label: 'resume.txt', icon: <NotepadIcon />, windowId: 'notepad' },
  { id: 'mycomputer', label: 'My Computer', icon: <ComputerIcon />, windowId: 'mycomputer' },
  { id: 'experience', label: 'Experience', icon: <FolderIcon />, windowId: 'experience' },
  { id: 'photo', label: 'photo.jpg', icon: <ImageIcon />, windowId: 'photo' },
  {
    id: 'linkedin',
    label: 'LinkedIn.url',
    icon: <GlobeIcon />,
    url: 'https://www.linkedin.com/in/sergey-p-721b25171/',
  },
  {
    id: 'github',
    label: 'GitHub.url',
    icon: <GlobeIcon />,
    url: 'https://github.com/P0rt',
  },
  {
    id: 'email',
    label: 'Email',
    icon: <MailIcon />,
    url: 'mailto:sergey.paarfenov@gmail.com',
  },
  {
    id: 'resume-pdf',
    label: 'resume.pdf',
    icon: <PdfIcon />,
    download: import.meta.env.BASE_URL + 'resume.pdf',
  },
  { id: 'recycle', label: 'Recycle Bin', icon: <RecycleIcon /> },
]

const COL_SIZE = 84
const ROW_SIZE = 84
const PADDING = 12
const DRAG_THRESHOLD = 4

function calcInitialPositions(): Record<string, { x: number; y: number }> {
  const maxRows = Math.max(
    1,
    Math.floor((window.innerHeight - 30 - PADDING * 2) / ROW_SIZE)
  )
  const result: Record<string, { x: number; y: number }> = {}
  ICONS.forEach((icon, i) => {
    const row = i % maxRows
    const col = Math.floor(i / maxRows)
    result[icon.id] = {
      x: PADDING + col * COL_SIZE,
      y: PADDING + row * ROW_SIZE,
    }
  })
  return result
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

function buildSendToEmailUrl() {
  const pdfUrl = window.location.origin + import.meta.env.BASE_URL + 'resume.pdf'
  const subject = encodeURIComponent('Resume — Sergei Parfenov')
  const body = encodeURIComponent(
    `Hi!\n\nPlease find my resume at:\n${pdfUrl}\n\nBest regards,\nSergei Parfenov`
  )
  return `mailto:?subject=${subject}&body=${body}`
}

export function Desktop({ onOpenWindow, onOpenLink, onContextMenu }: DesktopProps) {
  const [positions, setPositions] = useState(calcInitialPositions)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const dragRef = useRef<{
    iconId: string
    startX: number
    startY: number
    posX: number
    posY: number
    hasMoved: boolean
  } | null>(null)

  const lastDragEnd = useRef(0)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, iconId: string) => {
      e.stopPropagation()
      setSelectedId(iconId)

      const pos = positions[iconId]
      if (!pos) return

      dragRef.current = {
        iconId,
        startX: e.clientX,
        startY: e.clientY,
        posX: pos.x,
        posY: pos.y,
        hasMoved: false,
      }

      const onMove = (ev: PointerEvent) => {
        if (!dragRef.current) return
        const dx = ev.clientX - dragRef.current.startX
        const dy = ev.clientY - dragRef.current.startY

        if (!dragRef.current.hasMoved) {
          if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD)
            return
          dragRef.current.hasMoved = true
          setDraggingId(iconId)
        }

        setPositions((prev) => ({
          ...prev,
          [iconId]: {
            x: Math.max(0, dragRef.current!.posX + dx),
            y: Math.max(0, dragRef.current!.posY + dy),
          },
        }))
      }

      const onUp = () => {
        if (dragRef.current?.hasMoved) {
          lastDragEnd.current = Date.now()
          setPositions((prev) => {
            const p = prev[iconId]
            return {
              ...prev,
              [iconId]: {
                x: Math.max(
                  0,
                  Math.round((p.x - PADDING) / COL_SIZE) * COL_SIZE + PADDING
                ),
                y: Math.max(
                  0,
                  Math.round((p.y - PADDING) / ROW_SIZE) * ROW_SIZE + PADDING
                ),
              },
            }
          })
        }
        dragRef.current = null
        setDraggingId(null)
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', onUp)
      }

      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp)
    },
    [positions]
  )

  const handleDoubleClick = useCallback(
    (item: IconConfig) => {
      if (Date.now() - lastDragEnd.current < 300) return
      if (item.windowId) {
        onOpenWindow(item.windowId)
      } else if (item.url) {
        onOpenLink(item.url)
      } else if (item.download) {
        window.open(item.download, '_blank')
      }
    },
    [onOpenWindow, onOpenLink]
  )

  const buildIconMenu = useCallback(
    (item: IconConfig): MenuItem[] => {
      const items: MenuItem[] = []

      if (item.windowId) {
        items.push({
          label: 'Open',
          icon: '📂',
          bold: true,
          action: () => onOpenWindow(item.windowId!),
        })
      }

      if (item.url && !item.url.startsWith('mailto:')) {
        items.push({
          label: 'Open',
          icon: '🌐',
          bold: true,
          action: () => onOpenLink(item.url!),
        })
      }

      if (item.url?.startsWith('mailto:')) {
        items.push({
          label: 'Open',
          icon: '✉️',
          bold: true,
          action: () => onOpenLink(item.url!),
        })
      }

      if (item.download) {
        items.push({
          label: 'Open',
          icon: '📄',
          bold: true,
          action: () => window.open(item.download!, '_blank'),
        })
        items.push({
          label: 'Save As...',
          icon: '💾',
          action: () => triggerDownload(item.download!, 'resume.pdf'),
        })
      }

      if (item.windowId === 'mycomputer' || item.windowId === 'experience') {
        items.push({
          label: 'Explore',
          icon: '🔍',
          action: () => onOpenWindow(item.windowId!),
        })
      }

      if (
        item.download ||
        item.windowId === 'notepad' ||
        item.windowId === 'photo'
      ) {
        items.push({ divider: true, label: '' })
        items.push({
          label: 'Send To',
          icon: '📨',
          submenu: [
            {
              label: '📧 Email Recipient',
              action: () => onOpenLink(buildSendToEmailUrl()),
            },
          ],
        })
      }

      if (item.url && !item.url.startsWith('mailto:')) {
        items.push({ divider: true, label: '' })
        items.push({
          label: 'Copy Link',
          icon: '📋',
          action: () => navigator.clipboard.writeText(item.url!),
        })
      }

      if (item.url?.startsWith('mailto:')) {
        items.push({ divider: true, label: '' })
        items.push({
          label: 'Copy Address',
          icon: '📋',
          action: () =>
            navigator.clipboard.writeText(item.url!.replace('mailto:', '')),
        })
      }

      if (item.id === 'recycle') {
        items.push({
          label: 'Empty Recycle Bin',
          icon: '🗑️',
          disabled: true,
        })
      }

      items.push({ divider: true, label: '' })
      items.push({ label: 'Properties', icon: '⚙️', disabled: true })

      return items
    },
    [onOpenWindow, onOpenLink]
  )

  const handleIconContextMenu = useCallback(
    (e: React.MouseEvent, item: IconConfig) => {
      e.preventDefault()
      e.stopPropagation()
      setSelectedId(item.id)
      onContextMenu(e.clientX, e.clientY, buildIconMenu(item))
    },
    [buildIconMenu, onContextMenu]
  )

  const handleBgContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      const bgItems: MenuItem[] = [
        {
          label: 'Arrange Icons',
          icon: '📐',
          submenu: [
            {
              label: 'by Name',
              action: () => setPositions(calcInitialPositions()),
            },
            {
              label: 'Auto Arrange',
              action: () => setPositions(calcInitialPositions()),
            },
          ],
        },
        { divider: true, label: '' },
        {
          label: 'Refresh',
          icon: '🔄',
          action: () => window.location.reload(),
        },
        { divider: true, label: '' },
        {
          label: 'New',
          icon: '📄',
          submenu: [
            {
              label: '📁 Folder',
              disabled: true,
            },
            {
              label: '📝 Text Document',
              disabled: true,
            },
            {
              label: '🔗 Shortcut',
              disabled: true,
            },
          ],
        },
        { divider: true, label: '' },
        { label: 'Properties', icon: '⚙️', disabled: true },
      ]
      onContextMenu(e.clientX, e.clientY, bgItems)
    },
    [onContextMenu]
  )

  return (
    <div
      className="desktop-icons"
      onClick={() => setSelectedId(null)}
      onContextMenu={handleBgContextMenu}
    >
      {ICONS.map((item) => (
        <button
          key={item.id}
          className={`desktop-icon${
            selectedId === item.id ? ' desktop-icon--selected' : ''
          }${draggingId === item.id ? ' desktop-icon--dragging' : ''}`}
          style={{
            left: positions[item.id]?.x ?? 0,
            top: positions[item.id]?.y ?? 0,
            zIndex:
              draggingId === item.id ? 100 : selectedId === item.id ? 10 : 1,
          }}
          onPointerDown={(e) => handlePointerDown(e, item.id)}
          onDoubleClick={() => handleDoubleClick(item)}
          onContextMenu={(e) => handleIconContextMenu(e, item)}
        >
          <div className="desktop-icon__image">{item.icon}</div>
          <span className="desktop-icon__label">{item.label}</span>
        </button>
      ))}
    </div>
  )
}
