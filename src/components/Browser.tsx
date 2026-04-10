import { useState, useEffect, useCallback, useRef } from 'react'
import avatarWebp from '../assets/avatar.webp'

interface BrowserProps {
  url: string
  onTitleChange: (title: string) => void
}

const COMPANY_INFO: Record<string, { name: string; role: string; period: string; desc: string }> = {
  'tripleten.com': { name: 'TripleTen', role: 'Technical Product Manager', period: 'Jul 2023 — Present', desc: 'Optimizing educational outcomes using LLM, ML-based features, and automated code verification.' },
  'practicum.com': { name: 'Practicum USA', role: 'Product Manager', period: 'Dec 2020 — Jul 2023', desc: 'Launched QA-Engineering faculty with 70% product activation rate.' },
  'praktikum.yandex.ru': { name: 'Yandex Praktikum', role: 'Tech PM / Technical Writer', period: 'Mar 2018 — Dec 2020', desc: 'Launched Web Developer faculty. Created courses on regex, webpack, git, bash.' },
  'eurogym.ru': { name: 'European Gymnasium', role: 'Teacher', period: 'Dec 2018 — May 2019', desc: 'Instructed students in computer science and web development.' },
  'sravni.ru': { name: 'Sravni', role: 'Software Engineer', period: 'Nov 2017 — Oct 2018', desc: 'Rewrote OSAGO, CASCO, and Travel products using ReactJS.' },
  'moscoding.ru': { name: 'Moscow Coding School', role: 'Teaching Assistant', period: 'Oct 2016 — Aug 2017', desc: 'Arduino, Swift, frontend/backend workshops.' },
}

function isExternalUrl(url: string) {
  return url.startsWith('http://') || url.startsWith('https://')
}

function getPageTitle(url: string, viewMode: 'page' | 'iframe'): string {
  if (url === 'about:home') return 'Home - Microsoft Internet Explorer'
  if (url.startsWith('mailto:')) return 'New Message - Outlook Express'
  if (viewMode === 'iframe' && isExternalUrl(url)) {
    try {
      return new URL(url).hostname + ' - Microsoft Internet Explorer'
    } catch { /* ignore */ }
  }
  if (url.includes('linkedin.com')) return 'Sergei Parfenov — LinkedIn - Microsoft Internet Explorer'
  if (url.includes('github.com')) return 'P0rt (Sergei Parfenov) · GitHub - Microsoft Internet Explorer'
  if (url.includes('facebook.com')) return 'Sergei Parfenov - Facebook - Microsoft Internet Explorer'
  try {
    const host = new URL(url).hostname.replace('www.', '')
    const company = COMPANY_INFO[host]
    if (company) return `${company.name} - Microsoft Internet Explorer`
  } catch { /* ignore */ }
  return `${url} - Microsoft Internet Explorer`
}

export function Browser({ url, onTitleChange }: BrowserProps) {
  const [history, setHistory] = useState<string[]>([url])
  const [idx, setIdx] = useState(0)
  const [prevUrl, setPrevUrl] = useState(url)
  const [viewMode, setViewMode] = useState<'page' | 'iframe'>('page')
  const [iframeLoading, setIframeLoading] = useState(false)
  const [addressInput, setAddressInput] = useState(url)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const currentUrl = history[idx]

  if (url !== prevUrl) {
    setPrevUrl(url)
    if (url !== currentUrl) {
      const next = [...history.slice(0, idx + 1), url]
      setHistory(next)
      setIdx(next.length - 1)
      setViewMode('page')
    }
  }

  useEffect(() => {
    setAddressInput(currentUrl)
  }, [currentUrl])

  useEffect(() => {
    onTitleChange(getPageTitle(currentUrl, viewMode))
  }, [currentUrl, viewMode, onTitleChange])

  const navigate = useCallback((to: string) => {
    setHistory((prev) => [...prev.slice(0, idx + 1), to])
    setIdx((i) => i + 1)
    setPrevUrl(to)
    if (viewMode === 'iframe' && !isExternalUrl(to)) {
      setViewMode('page')
    }
  }, [idx, viewMode])

  const goBack = useCallback(() => {
    if (idx > 0) setIdx((i) => i - 1)
  }, [idx])

  const goForward = useCallback(() => {
    if (idx < history.length - 1) setIdx((i) => i + 1)
  }, [idx, history.length])

  const handleToggleView = useCallback(() => {
    if (viewMode === 'page' && isExternalUrl(currentUrl)) {
      setViewMode('iframe')
      setIframeLoading(true)
    } else {
      setViewMode('page')
    }
  }, [viewMode, currentUrl])

  const handleAddressSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    let dest = addressInput.trim()
    if (!dest) return
    if (!dest.startsWith('http') && !dest.startsWith('about:') && !dest.startsWith('mailto:')) {
      dest = 'https://' + dest
    }
    navigate(dest)
    if (isExternalUrl(dest)) {
      setViewMode('iframe')
      setIframeLoading(true)
    } else {
      setViewMode('page')
    }
  }, [addressInput, navigate])

  const canShowIframe = isExternalUrl(currentUrl) && !currentUrl.startsWith('mailto:')

  return (
    <>
      <div className="browser-toolbar">
        <button className="browser-nav-btn" onClick={goBack} disabled={idx <= 0} title="Back">
          ◀
        </button>
        <button className="browser-nav-btn" onClick={goForward} disabled={idx >= history.length - 1} title="Forward">
          ▶
        </button>
        <button className="browser-nav-btn" onClick={() => { setViewMode('page'); navigate('about:home') }} title="Home">
          🏠
        </button>
        {viewMode === 'iframe' && (
          <button
            className="browser-nav-btn"
            onClick={() => { setIframeLoading(true); iframeRef.current?.contentWindow?.location.reload() }}
            title="Refresh"
          >
            🔄
          </button>
        )}
        {canShowIframe && (
          <button
            className="browser-nav-btn browser-nav-btn--toggle"
            onClick={handleToggleView}
            title={viewMode === 'page' ? 'Load real website' : 'Show info page'}
          >
            {viewMode === 'page' ? '🌍' : '📄'}
          </button>
        )}
      </div>
      <form className="browser-addressbar" onSubmit={handleAddressSubmit}>
        <span>Address</span>
        <div className="browser-addressbar__field">
          <input
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddressSubmit(e) }}
          />
        </div>
        <button type="submit" className="browser-nav-btn" title="Go">
          ➡️
        </button>
      </form>

      {viewMode === 'iframe' && canShowIframe ? (
        <div className="browser-body browser-body--iframe">
          {iframeLoading && (
            <div className="browser-loading">
              <div className="browser-loading__bar" />
              <span>Opening page {currentUrl}...</span>
            </div>
          )}
          <iframe
            ref={iframeRef}
            src={currentUrl}
            className="browser-iframe"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            onLoad={() => setIframeLoading(false)}
            title="Browser content"
          />
        </div>
      ) : (
        <div className="window-body browser-body">
          <PageRouter url={currentUrl} onNavigate={navigate} onSwitchToIframe={canShowIframe ? () => { setViewMode('iframe'); setIframeLoading(true) } : undefined} />
        </div>
      )}

      <div className="status-bar">
        <p className="status-bar-field">
          {iframeLoading && viewMode === 'iframe' ? '⏳ Loading...' : '✓ Done'}
        </p>
        <p className="status-bar-field">
          {viewMode === 'iframe' ? '🌐 Internet (Live)' : '📄 Info Page'}
        </p>
      </div>
    </>
  )
}

function PageRouter({ url, onNavigate, onSwitchToIframe }: { url: string; onNavigate: (u: string) => void; onSwitchToIframe?: () => void }) {
  if (url === 'about:home') return <HomePage onNavigate={onNavigate} />
  if (url.includes('linkedin.com')) return <LinkedInPage onSwitchToIframe={onSwitchToIframe} />
  if (url.includes('github.com')) return <GitHubPage onSwitchToIframe={onSwitchToIframe} />
  if (url.includes('facebook.com')) return <FacebookPage onSwitchToIframe={onSwitchToIframe} />
  if (url.startsWith('mailto:')) return <EmailPage email={url.replace('mailto:', '')} />

  let host = ''
  try { host = new URL(url).hostname.replace('www.', '') } catch { /* ignore */ }
  const company = COMPANY_INFO[host]
  if (company) return <CompanyPage company={company} url={url} onSwitchToIframe={onSwitchToIframe} />

  return <GenericPage url={url} onSwitchToIframe={onSwitchToIframe} />
}

function HomePage({ onNavigate }: { onNavigate: (u: string) => void }) {
  const Link = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href="#" onClick={(e) => { e.preventDefault(); onNavigate(href) }}>{children}</a>
  )
  return (
    <div className="bp">
      <div className="bp__hero">
        <h2>🌐 Welcome to the Internet</h2>
        <p>Microsoft Internet Explorer 5.5</p>
      </div>
      <div className="bp__body">
        <div className="bp__card">
          <h3>📌 Sergei's Quick Links</h3>
          <ul>
            <li><Link href="https://www.linkedin.com/in/sergey-p-721b25171/">👤 LinkedIn Profile</Link></li>
            <li><Link href="https://github.com/P0rt">💻 GitHub — P0rt</Link></li>
            <li><Link href="https://www.facebook.com/Duckambition">📘 Facebook</Link></li>
            <li><Link href="mailto:sergey.paarfenov@gmail.com">✉️ Send Email</Link></li>
          </ul>
        </div>
        <div className="bp__card">
          <h3>🏢 Work History</h3>
          <ul>
            <li><Link href="https://tripleten.com">TripleTen — Technical PM</Link></li>
            <li><Link href="https://practicum.com">Practicum USA — Product Manager</Link></li>
            <li><Link href="https://praktikum.yandex.ru">Yandex Praktikum — Tech PM</Link></li>
            <li><Link href="https://sravni.ru">Sravni — Software Engineer</Link></li>
          </ul>
        </div>
      </div>
      <div className="bp__footer">
        <hr />
        <p>Best viewed with Internet Explorer 5.5 at 800×600</p>
        <p>© 2000 Sergei Parfenov. All rights reserved.</p>
      </div>
    </div>
  )
}

function LinkedInPage({ onSwitchToIframe }: { onSwitchToIframe?: () => void }) {
  return (
    <div className="bp">
      <div className="bp__hero bp__hero--linkedin">
        <h2>Linked<b>in</b></h2>
      </div>
      <div className="bp__profile">
        <img src={avatarWebp} alt="Sergei" className="bp__avatar" />
        <div>
          <h3 style={{ margin: '0 0 4px' }}>Sergei Parfenov</h3>
          <p>Technical Product Manager at TripleTen</p>
          <p className="bp__muted">Moscow, Russia · 500+ connections</p>
        </div>
      </div>
      <div className="bp__body">
        <div className="bp__card">
          <h3>Experience</h3>
          <div className="bp__entry">
            <strong>Technical Product Manager</strong>
            <p>TripleTen · Jul 2023 — Present</p>
          </div>
          <div className="bp__entry">
            <strong>Product Manager</strong>
            <p>Practicum USA · Dec 2020 — Jul 2023</p>
          </div>
          <div className="bp__entry">
            <strong>Tech PM / Technical Writer</strong>
            <p>Yandex Praktikum · Mar 2018 — Dec 2020</p>
          </div>
        </div>
        <div className="bp__card">
          <h3>Skills</h3>
          <p>React · TypeScript · Product Management · LLM · Node.js · Python</p>
        </div>
      </div>
      <div className="bp__cta">
        {onSwitchToIframe && (
          <button onClick={onSwitchToIframe} className="bp__btn bp__btn--live">
            🌍 Load Real Website
          </button>
        )}
        <a href="https://www.linkedin.com/in/sergey-p-721b25171/" target="_blank" rel="noopener noreferrer" className="bp__btn">
          View Full Profile on LinkedIn →
        </a>
      </div>
    </div>
  )
}

function GitHubPage({ onSwitchToIframe }: { onSwitchToIframe?: () => void }) {
  return (
    <div className="bp">
      <div className="bp__hero bp__hero--github">
        <h2>GitHub</h2>
      </div>
      <div className="bp__profile">
        <img src={avatarWebp} alt="P0rt" className="bp__avatar" />
        <div>
          <h3 style={{ margin: '0 0 4px' }}>P0rt</h3>
          <p>Sergei Parfenov</p>
          <p className="bp__muted">Software Engineer & Product Manager</p>
        </div>
      </div>
      <div className="bp__body">
        <div className="bp__card">
          <h3>📁 Repositories</h3>
          <div className="bp__entry">
            <strong>resume</strong>
            <p>Interactive Windows ME–style resume built with React + TypeScript</p>
          </div>
        </div>
        <div className="bp__card">
          <h3>Languages</h3>
          <p>TypeScript · JavaScript · Python · HTML · CSS</p>
        </div>
      </div>
      <div className="bp__cta">
        {onSwitchToIframe && (
          <button onClick={onSwitchToIframe} className="bp__btn bp__btn--live">
            🌍 Load Real Website
          </button>
        )}
        <a href="https://github.com/P0rt" target="_blank" rel="noopener noreferrer" className="bp__btn">
          View Full Profile on GitHub →
        </a>
      </div>
    </div>
  )
}

function FacebookPage({ onSwitchToIframe }: { onSwitchToIframe?: () => void }) {
  return (
    <div className="bp">
      <div className="bp__hero bp__hero--facebook">
        <h2>facebook</h2>
      </div>
      <div className="bp__profile">
        <img src={avatarWebp} alt="Sergei" className="bp__avatar" />
        <div>
          <h3 style={{ margin: '0 0 4px' }}>Sergei Parfenov</h3>
          <p className="bp__muted">@Duckambition</p>
        </div>
      </div>
      <div className="bp__cta">
        {onSwitchToIframe && (
          <button onClick={onSwitchToIframe} className="bp__btn bp__btn--live">
            🌍 Load Real Website
          </button>
        )}
        <a href="https://www.facebook.com/Duckambition" target="_blank" rel="noopener noreferrer" className="bp__btn">
          View Profile on Facebook →
        </a>
      </div>
    </div>
  )
}

function EmailPage({ email }: { email: string }) {
  return (
    <div className="bp">
      <div className="bp__hero">
        <h2>✉️ Outlook Express — New Message</h2>
      </div>
      <div className="bp__body">
        <div className="bp__card bp__email-form">
          <div className="bp__email-row">
            <label>To:</label>
            <input value={email} readOnly />
          </div>
          <div className="bp__email-row">
            <label>Subject:</label>
            <input defaultValue="" placeholder="Hello!" />
          </div>
          <textarea
            className="bp__email-body"
            placeholder="Type your message here..."
          />
          <div style={{ marginTop: 8 }}>
            <a href={`mailto:${email}`} className="bp__btn">
              📧 Open in Email Client
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

function CompanyPage({ company, url, onSwitchToIframe }: { company: typeof COMPANY_INFO[string]; url: string; onSwitchToIframe?: () => void }) {
  return (
    <div className="bp">
      <div className="bp__hero">
        <h2>🏢 {company.name}</h2>
      </div>
      <div className="bp__body">
        <div className="bp__card">
          <h3>{company.role}</h3>
          <p className="bp__muted">{company.period}</p>
          <p style={{ marginTop: 8 }}>{company.desc}</p>
        </div>
      </div>
      <div className="bp__cta">
        {onSwitchToIframe && (
          <button onClick={onSwitchToIframe} className="bp__btn bp__btn--live">
            🌍 Load Real Website
          </button>
        )}
        <a href={url} target="_blank" rel="noopener noreferrer" className="bp__btn">
          🌐 Open in New Tab →
        </a>
      </div>
    </div>
  )
}

function GenericPage({ url, onSwitchToIframe }: { url: string; onSwitchToIframe?: () => void }) {
  let hostname = url
  try { hostname = new URL(url).hostname } catch { /* ignore */ }
  return (
    <div className="bp">
      <div className="bp__hero">
        <h2>🌐 {hostname}</h2>
      </div>
      <div className="bp__body" style={{ textAlign: 'center', padding: 40 }}>
        <p>This page cannot be displayed in the built-in browser.</p>
        <div className="bp__cta">
          {onSwitchToIframe && (
            <button onClick={onSwitchToIframe} className="bp__btn bp__btn--live">
              🌍 Try Loading Real Website
            </button>
          )}
          <a href={url} target="_blank" rel="noopener noreferrer" className="bp__btn">
            Open in New Tab →
          </a>
        </div>
      </div>
    </div>
  )
}
