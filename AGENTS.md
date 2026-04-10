# Agent Instructions

Interactive resume website that simulates a Windows Millennium Edition desktop experience. Built with React 19, TypeScript, and Vite. Deployed to GitHub Pages at `p0rt.github.io/resume/`.

## Quick Reference

| What               | Where                            |
|---------------------|----------------------------------|
| Entry point         | `src/main.tsx` → `src/App.tsx`   |
| Types               | `src/types.ts`                   |
| Window manager hook | `src/hooks/useWindowManager.ts`  |
| All components      | `src/components/*.tsx`           |
| All styles          | `src/global.css`                 |
| SVG icons           | `src/components/Icons.tsx`       |
| Static assets       | `public/` (favicon, resume.pdf)  |
| Image assets        | `src/assets/` (avatar, photo)    |
| CI/CD               | `.github/workflows/main.yml`     |
| Base URL            | `/resume/` (set in `vite.config.ts`) |

## Architecture

The app simulates a Windows ME desktop with draggable icons, resizable windows, a taskbar with Start menu, and an in-app Internet Explorer browser.

**State flow:** `App.tsx` owns global state (window manager, browser URL, context menu, start menu, shutdown). Child components communicate upward via callbacks (`onOpenWindow`, `onOpenLink`, `onContextMenu`).

**Window system:** `useWindowManager` hook manages an array of `WindowState` objects. Each window has position, size, z-index, minimized/maximized state. New window types require changes to: `WindowId` in `types.ts`, `WINDOW_DEFAULTS` in `useWindowManager.ts`, render switch in `App.tsx`.

**Browser component:** Dual-mode — simulated pages (custom React components for LinkedIn, GitHub, etc.) and iframe mode for loading real websites. History managed internally.

## Conventions

- **Exports:** Named only (`export function X`), never default
- **Imports:** `import type { ... }` for types
- **Props:** Interface defined locally above the component, not exported
- **Handlers:** Wrapped in `useCallback`
- **Drag/drop:** Pointer events (unified mouse + touch)
- **Styles:** Single `global.css`, BEM-like naming on top of `98.css` library
- **Icons:** Inline SVG components in `Icons.tsx`, 16×16 viewBox
- **Data:** Hardcoded in components (no external data files)
- **Theme colors:** `#d4d0c8` (surface), `#0a246a` (blue accent), `Tahoma`/`MS Sans Serif` fonts

## Build & Deploy

```bash
npm run dev       # Vite dev server
npm run build     # tsc -b && vite build
npm run preview   # Preview production build
```

CI: GitHub Actions → Node 20, `npm ci`, `npm run build`, deploy `dist/` to `gh-pages` branch.

## Adding a New Window

1. Add id to `WindowId` union in `src/types.ts`
2. Add defaults to `WINDOW_DEFAULTS` in `src/hooks/useWindowManager.ts`
3. Create component in `src/components/`
4. Add render case in `App.tsx` inside the windows map
5. Add desktop icon in `Desktop.tsx` ICONS array (optional)
6. Add Start menu entry in `Taskbar.tsx` (optional)

## Adding a New Browser Page

1. Add route condition in `PageRouter` inside `Browser.tsx`
2. Create page component function in `Browser.tsx`
3. Add title mapping in `getPageTitle()`
4. Accept `onSwitchToIframe` prop if external URL should support live loading
