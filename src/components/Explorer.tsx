import type { WindowId } from '../types'

interface ExplorerProps {
  type: 'mycomputer' | 'experience'
  onOpenWindow: (id: WindowId) => void
  onOpenLink: (url: string) => void
}

const JOBS = [
  {
    company: 'TripleTen',
    role: 'Technical Product Manager',
    period: 'Jul 2023 — Present',
    url: 'https://tripleten.com',
    description:
      'Implemented LLM, ML-based features, automated code verification. Boosted CR, Revenue, and student satisfaction.',
  },
  {
    company: 'Practicum USA',
    role: 'Product Manager',
    period: 'Dec 2020 — Jul 2023',
    url: 'https://practicum.com',
    description:
      'Launched QA-Engineering faculty in the USA with 70% product activation rate.',
  },
  {
    company: 'Yandex Praktikum',
    role: 'Tech PM / Technical Writer',
    period: 'Mar 2018 — Dec 2020',
    url: 'https://praktikum.yandex.ru',
    description:
      'Launched Web Developer faculty. Created courses: regex, webpack, git, bash.',
  },
  {
    company: 'Thingyfy',
    role: 'Full Stack Developer',
    period: 'Oct 2019 — Dec 2021',
    url: '',
    description: 'React, TypeScript, Node, Python, GitLab for a Canadian startup.',
  },
  {
    company: 'European Gymnasium',
    role: 'Teacher',
    period: 'Dec 2018 — May 2019',
    url: 'https://eurogym.ru',
    description: 'Instructed students in computer science and web development.',
  },
  {
    company: 'Sravni',
    role: 'Software Engineer',
    period: 'Nov 2017 — Oct 2018',
    url: 'https://sravni.ru',
    description: 'Rewrote OSAGO, CASCO, and Travel products using ReactJS.',
  },
  {
    company: 'Spaces',
    role: 'Software Engineer',
    period: 'Mar 2017 — Nov 2017',
    url: '',
    description:
      'Built commercial real estate startup from scratch. Django + ReactJS + Redux.',
  },
  {
    company: 'Moscow Coding School',
    role: 'Teaching Assistant',
    period: 'Oct 2016 — Aug 2017',
    url: 'https://moscoding.ru',
    description: 'Arduino, Swift, Minecraft Python, frontend/backend workshops.',
  },
]

export function Explorer({ type, onOpenWindow, onOpenLink }: ExplorerProps) {
  if (type === 'mycomputer')
    return <MyComputerView onOpenWindow={onOpenWindow} onOpenLink={onOpenLink} />
  return <ExperienceView onOpenLink={onOpenLink} />
}

function MyComputerView({
  onOpenWindow,
  onOpenLink,
}: {
  onOpenWindow: (id: WindowId) => void
  onOpenLink: (url: string) => void
}) {
  return (
    <>
      <div className="explorer-address">
        <span>Address:</span>
        <input readOnly value="My Computer" />
      </div>
      <div className="window-body" style={{ flex: 1, overflow: 'auto', padding: 0 }}>
        <ul className="tree-view" style={{ padding: 8, margin: 0 }}>
          <li>
            <details open>
              <summary>
                <span style={{ userSelect: 'none' }}>💾 (C:) Skills &amp; Technologies</span>
              </summary>
              <ul>
                <li>📄 React / TypeScript / JavaScript</li>
                <li>📄 Node.js / Python / Django</li>
                <li>📄 Product Management</li>
                <li>📄 LLM / ML Integration</li>
                <li>📄 Git / CI-CD / DevOps</li>
                <li>📄 Webpack / Vite</li>
                <li>📄 Technical Writing</li>
              </ul>
            </details>
          </li>
          <li>
            <details>
              <summary>
                <span style={{ userSelect: 'none' }}>💿 (D:) Quick Links</span>
              </summary>
              <ul>
                <li>
                  <a href="#" onClick={(e) => { e.preventDefault(); onOpenLink('https://www.linkedin.com/in/sergey-p-721b25171/') }}>
                    🔗 LinkedIn
                  </a>
                </li>
                <li>
                  <a href="#" onClick={(e) => { e.preventDefault(); onOpenLink('https://github.com/P0rt') }}>
                    🔗 GitHub
                  </a>
                </li>
                <li>
                  <a href="#" onClick={(e) => { e.preventDefault(); onOpenLink('mailto:sergey.paarfenov@gmail.com') }}>
                    📧 Email
                  </a>
                </li>
                <li>
                  <a href="#" onClick={(e) => { e.preventDefault(); onOpenLink('https://www.facebook.com/Duckambition') }}>
                    🔗 Facebook
                  </a>
                </li>
              </ul>
            </details>
          </li>
          <li
            style={{ paddingTop: 8, cursor: 'pointer' }}
            onDoubleClick={() => onOpenWindow('experience')}
          >
            📁 Experience (double-click to open)
          </li>
        </ul>
      </div>
      <div className="status-bar">
        <p className="status-bar-field">3 object(s)</p>
      </div>
    </>
  )
}

function ExperienceView({ onOpenLink }: { onOpenLink: (url: string) => void }) {
  return (
    <>
      <div className="explorer-address">
        <span>Address:</span>
        <input readOnly value="C:\Experience" />
      </div>
      <div className="window-body" style={{ flex: 1, overflow: 'auto', padding: 0 }}>
        <table className="explorer-list">
          <thead>
            <tr>
              <th style={{ width: '30%' }}>Name</th>
              <th style={{ width: '35%' }}>Role</th>
              <th style={{ width: '35%' }}>Period</th>
            </tr>
          </thead>
          <tbody>
            {JOBS.map((job) => (
              <tr
                key={job.company}
                onDoubleClick={() => {
                  if (job.url) onOpenLink(job.url)
                }}
                title={job.description}
              >
                <td>📄 {job.company}</td>
                <td>{job.role}</td>
                <td>{job.period}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="status-bar">
        <p className="status-bar-field">{JOBS.length} object(s)</p>
        <p className="status-bar-field">Double-click to visit</p>
      </div>
    </>
  )
}
