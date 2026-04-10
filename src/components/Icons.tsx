interface IconProps {
  size?: number
}

export function NotepadIcon({ size = 32 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <defs>
        <linearGradient id="notepad-page" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFF0" />
          <stop offset="100%" stopColor="#E8E8D0" />
        </linearGradient>
        <linearGradient id="notepad-bar" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6B3A1F" />
          <stop offset="100%" stopColor="#C48840" />
        </linearGradient>
      </defs>
      <path d="M8 2 L24 2 L26 4 L26 30 L6 30 L6 4 Z" fill="url(#notepad-page)" stroke="#555" strokeWidth="0.75" />
      <path d="M24 2 L24 4 L26 4 Z" fill="#ccc" />
      <rect x="6" y="2" width="18" height="5" fill="url(#notepad-bar)" rx="0.5" />
      <line x1="10" y1="11" x2="22" y2="11" stroke="#8888aa" strokeWidth="0.75" />
      <line x1="10" y1="14.5" x2="22" y2="14.5" stroke="#8888aa" strokeWidth="0.75" />
      <line x1="10" y1="18" x2="22" y2="18" stroke="#8888aa" strokeWidth="0.75" />
      <line x1="10" y1="21.5" x2="19" y2="21.5" stroke="#8888aa" strokeWidth="0.75" />
      <line x1="10" y1="25" x2="16" y2="25" stroke="#8888aa" strokeWidth="0.75" />
    </svg>
  )
}

export function ComputerIcon({ size = 32 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <defs>
        <linearGradient id="monitor-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E8E8E0" />
          <stop offset="100%" stopColor="#B0B0A0" />
        </linearGradient>
        <linearGradient id="screen-bg" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#3D5040" />
          <stop offset="100%" stopColor="#1A1610" />
        </linearGradient>
      </defs>
      <rect x="2" y="1" width="28" height="20" rx="2" fill="url(#monitor-body)" stroke="#666" strokeWidth="0.75" />
      <rect x="4" y="3" width="24" height="16" rx="1" fill="url(#screen-bg)" />
      <rect x="6" y="5" width="8" height="6" rx="0.5" fill="#fff" fillOpacity="0.9" stroke="#6B3A1F" strokeWidth="0.5" />
      <rect x="6" y="5" width="8" height="2" rx="0.5" fill="#6B3A1F" />
      <rect x="13" y="21" width="6" height="3" fill="#A0A090" stroke="#666" strokeWidth="0.5" />
      <rect x="8" y="24" width="16" height="3" rx="1" fill="url(#monitor-body)" stroke="#666" strokeWidth="0.5" />
      <circle cx="26" cy="18" r="0.8" fill="#00cc00" />
    </svg>
  )
}

export function FolderIcon({ size = 32 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <defs>
        <linearGradient id="folder-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE070" />
          <stop offset="100%" stopColor="#E8A820" />
        </linearGradient>
        <linearGradient id="folder-tab" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFD040" />
          <stop offset="100%" stopColor="#D4A010" />
        </linearGradient>
      </defs>
      <path d="M2 9 L2 6.5 Q2 6 2.5 6 L10 6 L12.5 9 Z" fill="url(#folder-tab)" stroke="#9F7D00" strokeWidth="0.5" />
      <rect x="2" y="9" width="28" height="20" rx="1.5" fill="url(#folder-front)" stroke="#9F7D00" strokeWidth="0.5" />
      <rect x="2" y="9" width="28" height="4" rx="1" fill="#FFE880" fillOpacity="0.6" />
      <line x1="4" y1="15" x2="28" y2="15" stroke="#D4A010" strokeWidth="0.3" />
    </svg>
  )
}

export function GlobeIcon({ size = 32 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <defs>
        <linearGradient id="globe-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#80C8FF" />
          <stop offset="100%" stopColor="#2060B0" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="13" fill="url(#globe-bg)" stroke="#1A4070" strokeWidth="1" />
      <ellipse cx="16" cy="16" rx="6" ry="13" fill="none" stroke="#1A4070" strokeWidth="0.75" />
      <line x1="3" y1="16" x2="29" y2="16" stroke="#1A4070" strokeWidth="0.75" />
      <line x1="16" y1="3" x2="16" y2="29" stroke="#1A4070" strokeWidth="0.75" />
      <line x1="5" y1="10" x2="27" y2="10" stroke="#1A4070" strokeWidth="0.5" />
      <line x1="5" y1="22" x2="27" y2="22" stroke="#1A4070" strokeWidth="0.5" />
      <path d="M8 6 Q12 8 10 12 Q8 16 12 18 Q10 22 6 24" fill="#2E8B57" fillOpacity="0.5" stroke="none" />
      <path d="M18 5 Q22 8 20 13 Q22 16 18 18" fill="#2E8B57" fillOpacity="0.5" stroke="none" />
    </svg>
  )
}

export function MailIcon({ size = 32 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <defs>
        <linearGradient id="envelope" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF8E0" />
          <stop offset="100%" stopColor="#E0D8B0" />
        </linearGradient>
      </defs>
      <rect x="2" y="6" width="28" height="20" rx="1" fill="url(#envelope)" stroke="#888" strokeWidth="0.75" />
      <path d="M2 6 L16 17 L30 6" fill="none" stroke="#888" strokeWidth="1" />
      <path d="M2 26 L12 17" fill="none" stroke="#bbb" strokeWidth="0.5" />
      <path d="M30 26 L20 17" fill="none" stroke="#bbb" strokeWidth="0.5" />
      <rect x="18" y="21" width="8" height="3" rx="0.5" fill="#cc0000" fillOpacity="0.8" />
    </svg>
  )
}

export function PdfIcon({ size = 32 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <defs>
        <linearGradient id="pdf-page" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="100%" stopColor="#e8e8e8" />
        </linearGradient>
        <linearGradient id="pdf-bar" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#CC0000" />
          <stop offset="100%" stopColor="#FF3030" />
        </linearGradient>
      </defs>
      <path d="M8 2 L24 2 L26 4 L26 30 L6 30 L6 4 Z" fill="url(#pdf-page)" stroke="#555" strokeWidth="0.75" />
      <path d="M24 2 L24 4 L26 4 Z" fill="#ccc" />
      <rect x="6" y="2" width="18" height="5" fill="url(#pdf-bar)" rx="0.5" />
      <text x="16" y="20" textAnchor="middle" fill="#cc0000" fontSize="8" fontWeight="bold" fontFamily="Arial">
        PDF
      </text>
      <line x1="10" y1="24" x2="22" y2="24" stroke="#ccc" strokeWidth="0.75" />
      <line x1="10" y1="26.5" x2="18" y2="26.5" stroke="#ccc" strokeWidth="0.75" />
    </svg>
  )
}

export function ImageIcon({ size = 32 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#60B0FF" />
          <stop offset="100%" stopColor="#C0E0FF" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="26" height="26" rx="1" fill="#d0d0d0" stroke="#666" strokeWidth="0.75" />
      <rect x="5" y="5" width="22" height="22" rx="0.5" fill="url(#sky)" />
      <circle cx="12" cy="11" r="3" fill="#FFD700" />
      <circle cx="12" cy="11" r="2" fill="#FFEE44" />
      <polygon points="5,27 13,17 18,22 21,18 27,27" fill="#228B22" />
      <polygon points="5,27 13,17 18,22 21,18 27,27" fill="#33AA33" fillOpacity="0.4" />
      <polygon points="16,27 20,20 27,27" fill="#1A6B1A" fillOpacity="0.5" />
    </svg>
  )
}

export function RecycleIcon({ size = 32 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <defs>
        <linearGradient id="bin-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#D8D8D0" />
          <stop offset="100%" stopColor="#A0A098" />
        </linearGradient>
      </defs>
      <path d="M9 8 L10 28 L22 28 L23 8 Z" fill="url(#bin-body)" stroke="#666" strokeWidth="0.75" />
      <rect x="7" y="5" width="18" height="3" rx="1" fill="#B0B0A8" stroke="#666" strokeWidth="0.75" />
      <rect x="12" y="3" width="8" height="3" rx="0.5" fill="#C0C0B8" stroke="#666" strokeWidth="0.75" />
      <line x1="13" y1="11" x2="13.3" y2="25" stroke="#888" strokeWidth="0.75" />
      <line x1="16" y1="11" x2="16" y2="25" stroke="#888" strokeWidth="0.75" />
      <line x1="19" y1="11" x2="18.7" y2="25" stroke="#888" strokeWidth="0.75" />
      <path d="M14 14 L16 12 L18 14 L16.5 14 L16.5 18 L15.5 18 L15.5 14 Z" fill="#8B5A30" fillOpacity="0.5" />
    </svg>
  )
}

export function WindowsIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16">
      <polygon points="1,3 7,1.8 7,7.2 1,7.8" fill="#FF0000" />
      <polygon points="8.5,1.5 15,0.5 15,7 8.5,7" fill="#00B800" />
      <polygon points="1,8.8 7,8.2 7,13.8 1,13" fill="#0050FF" />
      <polygon points="8.5,8 15,8.5 15,15 8.5,14" fill="#FFB900" />
    </svg>
  )
}
