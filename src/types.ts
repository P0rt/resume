export type WindowId = 'notepad' | 'mycomputer' | 'experience' | 'photo' | 'browser'

export interface WindowState {
  id: WindowId
  title: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  isMinimized: boolean
  isMaximized: boolean
  zIndex: number
}
