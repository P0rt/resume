# Copilot Instructions

This is a Windows ME desktop simulator used as an interactive resume. React 19 + TypeScript + Vite, styled with `98.css` + custom global CSS.

## Key Rules

- Named exports only, no default exports
- Use `import type` for type-only imports
- Props interfaces local to files, not exported (except shared types like `MenuItem`)
- Wrap callback props in `useCallback`
- Use pointer events for drag-and-drop
- All styles go in `src/global.css` using BEM-like naming
- SVG icons are React components in `src/components/Icons.tsx`
- No CSS modules, no Tailwind, no styled-components
- No external state library — hooks only

## Style Guide

- Windows ME palette: `#d4d0c8` surface, `#0a246a` accent blue, `#fff` window body
- Fonts: `Tahoma`, `MS Sans Serif`, `Times New Roman` (for browser pages)
- 3D effects: `border: 2px outset/inset #d4d0c8`
- Keep the retro Windows ME aesthetic consistent

## Architecture

- `App.tsx` — root, global state, renders Desktop + Windows + Taskbar + ContextMenu
- `useWindowManager` hook — all window CRUD operations
- `types.ts` — `WindowId` union type, `WindowState` interface
- Adding a window: update `WindowId`, add to `WINDOW_DEFAULTS`, add render case in `App.tsx`
