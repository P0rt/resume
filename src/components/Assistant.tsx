import { useState, useRef, useCallback, useEffect } from 'react'
import avatarWebp from '../assets/avatar.webp'

type Mood = 'idle' | 'speaking' | 'thinking' | 'waving' | 'greeting'

interface Message {
  text: string
  from: 'user' | 'assistant'
  typing?: boolean
}

const RESPONSES: { pattern: RegExp; reply: string; mood?: Mood }[] = [
  {
    pattern: /hi|hello|привет|hey|yo|хай|здравствуй/i,
    reply: "Hey! I'm Sergei's digital twin. Ask me about his experience, skills, or how to reach him!",
    mood: 'waving',
  },
  {
    pattern: /experience|work|job|опыт|работа|career|where.*work/i,
    reply: 'Sergei has 8+ years in tech — currently a Technical PM at TripleTen, previously at Practicum USA, Yandex Praktikum, and Sravni. Double-click "Experience" on the desktop for the full list!',
  },
  {
    pattern: /skill|tech|stack|стек|технолог|умеешь|know/i,
    reply: 'React, TypeScript, Node.js, Python, Product Management, LLM/ML integration, Git/CI-CD, Webpack/Vite, Technical Writing — and building pixel-art assistants apparently.',
  },
  {
    pattern: /contact|email|связь|контакт|reach|write|написать/i,
    reply: 'Email: sergey.paarfenov@gmail.com\nLinkedIn: /in/sergey-p-721b25171/\nGitHub: github.com/P0rt\n\nOr just right-click the Email icon on the desktop!',
  },
  {
    pattern: /resume|pdf|резюме|cv/i,
    reply: 'The resume is in "resume.txt" (Notepad) on the desktop. You can also right-click "resume.pdf" → Save As to download the PDF!',
  },
  {
    pattern: /who|кто|about|yourself|тебе|ты кто/i,
    reply: "I'm a pixel-art version of Sergei Parfenov, stuck inside this Windows ME desktop. My head opens like a South Park character when I talk — pretty cool, right?",
    mood: 'waving',
  },
  {
    pattern: /south.?park|саус.?парк|cartoon|мультик/i,
    reply: "Yes! My animation is inspired by the Canadian characters from South Park. The top of my head flips back when I talk. Blame the developer's sense of humor.",
  },
  {
    pattern: /help|помо[гщ]|what can|чем.*помо/i,
    reply: 'I can tell you about Sergei\'s experience, skills, contacts, or resume.\n\nTry: "What are your skills?" or "How to contact Sergei?"',
  },
  {
    pattern: /product.*manag|pm|продукт|менеджер/i,
    reply: 'Sergei has been a Product/Technical PM since 2018! He launched the QA-Engineering faculty at Practicum USA with 70% activation rate and now leads student learning experience at TripleTen using LLM and ML.',
  },
  {
    pattern: /llm|ai|ml|machine.*learn|нейро|искусств.*интеллект/i,
    reply: "At TripleTen, Sergei implemented LLM-based features, ML-powered analytics, and automated code verification systems that boosted conversion rates and student satisfaction.",
  },
  {
    pattern: /react|typescript|javascript|frontend|фронтенд/i,
    reply: 'Sergei worked as a Software Engineer at Sravni.ru, where he rewrote three products (OSAGO, CASCO, Travel) using ReactJS. He also built projects at Thingyfy with React, TypeScript, Node.js, and Python.',
  },
  {
    pattern: /thank|спасиб|cool|круто|nice|awesome/i,
    reply: "You're welcome! Feel free to explore the desktop — open My Computer for skills, or the Experience folder for work history. 😊",
    mood: 'waving',
  },
]

const DEFAULT_REPLIES = [
  "Hmm, I'm not sure about that one. Try asking about skills, experience, or contacts!",
  "That's beyond my pixel brain 🧠 Ask me about Sergei's career or how to reach him!",
  'I only know about Sergei\'s resume. Try: "What\'s your experience?" or "Skills?"',
]

const IDLE_PHRASES = [
  'Need help? Click me! 💬',
  "I know things... ask me! 🤔",
  'Try asking about skills!',
  "Hello there! 👋",
  'Psst... click me!',
]

function getReply(msg: string): { text: string; mood: Mood } {
  for (const r of RESPONSES) {
    if (r.pattern.test(msg))
      return { text: r.reply, mood: r.mood ?? 'speaking' }
  }
  return {
    text: DEFAULT_REPLIES[Math.floor(Math.random() * DEFAULT_REPLIES.length)],
    mood: 'speaking',
  }
}

export function Assistant() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { text: "Hey! I'm Sergei's assistant. Click me to chat! 👋", from: 'assistant' },
  ])
  const [input, setInput] = useState('')
  const [mood, setMood] = useState<Mood>('idle')
  const [bubbleText, setBubbleText] = useState('Click me!')
  const moodTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const idleTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const setMoodFor = useCallback((m: Mood, duration: number) => {
    setMood(m)
    clearTimeout(moodTimer.current)
    moodTimer.current = setTimeout(() => setMood('idle'), duration)
  }, [])

  useEffect(() => {
    if (open) return
    const schedule = () => {
      const delay = 6000 + Math.random() * 10000
      idleTimer.current = setTimeout(() => {
        const phrase = IDLE_PHRASES[Math.floor(Math.random() * IDLE_PHRASES.length)]
        setBubbleText(phrase)
        if (Math.random() > 0.5) {
          setMoodFor('waving', 2000)
        }
        schedule()
      }, delay)
    }
    schedule()
    return () => clearTimeout(idleTimer.current)
  }, [open, setMoodFor])

  const handleSend = useCallback(() => {
    const text = input.trim()
    if (!text) return
    setInput('')
    setMessages((prev) => [...prev, { text, from: 'user' }])
    setMoodFor('thinking', 800)

    setTimeout(() => {
      setMessages((prev) => [...prev, { text: '...', from: 'assistant', typing: true }])
    }, 200)

    setTimeout(() => {
      const { text: reply, mood: replyMood } = getReply(text)
      setMessages((prev) => {
        const filtered = prev.filter((m) => !m.typing)
        return [...filtered, { text: reply, from: 'assistant' }]
      })
      setMoodFor(replyMood, 2500)
    }, 1000 + Math.random() * 500)
  }, [input, setMoodFor])

  const handleCharacterClick = useCallback(() => {
    if (!open) {
      setMoodFor('greeting', 2000)
      setBubbleText('💬')
    }
    setOpen((o) => !o)
  }, [open, setMoodFor])

  return (
    <div className="assistant">
      {open && (
        <div className="assistant__chat window">
          <div className="title-bar">
            <div className="title-bar-text">Sergei's Assistant</div>
            <div className="title-bar-controls">
              <button aria-label="Close" onClick={() => setOpen(false)} />
            </div>
          </div>
          <div className="assistant__messages" ref={scrollRef}>
            {messages.map((m, i) => (
              <div
                key={i}
                className={`assistant__msg assistant__msg--${m.from} ${m.typing ? 'assistant__msg--typing' : ''}`}
              >
                {m.typing ? (
                  <span className="assistant__dots">
                    <span />
                    <span />
                    <span />
                  </span>
                ) : (
                  m.text
                )}
              </div>
            ))}
          </div>
          <form
            className="assistant__input-row"
            onSubmit={(e) => { e.preventDefault(); handleSend() }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
            />
            <button type="submit">Send</button>
          </form>
        </div>
      )}

      <div
        className={`assistant__character assistant__character--${mood}`}
        onClick={handleCharacterClick}
      >
        <div className="assistant__bubble">{bubbleText}</div>

        <div className={`assistant__head assistant__head--${mood}`}>
          <div className="assistant__head-top">
            <img src={avatarWebp} alt="" draggable={false} />
          </div>
          <div className="assistant__head-bottom">
            <img src={avatarWebp} alt="" draggable={false} />
          </div>
        </div>

        <svg
          className="assistant__body"
          width="140"
          height="120"
          viewBox="0 0 140 120"
        >
          {/* Left arm */}
          <g className="assistant__arm-left">
            <rect x="0" y="0" width="22" height="44" rx="4" fill="#3D3832" />
            <ellipse cx="11" cy="48" rx="9" ry="7" fill="#DEB887" />
          </g>
          {/* Right arm */}
          <g className="assistant__arm-right">
            <rect x="118" y="0" width="22" height="44" rx="4" fill="#3D3832" />
            <ellipse cx="129" cy="48" rx="9" ry="7" fill="#DEB887" />
          </g>
          {/* Torso */}
          <rect x="24" y="0" width="92" height="62" rx="4" fill="#3D3832" />
          {/* Shirt collar */}
          <path d="M54,0 L70,0 L70,14 L62,8 L54,14 Z" fill="#E8E0D0" />
          <path d="M70,0 L86,0 L86,14 L78,8 L70,14 Z" fill="#E8E0D0" />
          {/* Tie */}
          <polygon points="70,8 63,24 70,48 77,24" fill="#8B5A30" />
          <polygon points="66,24 74,24 70,30" fill="#6B3A1F" />
          {/* Pocket square */}
          <rect x="80" y="18" width="12" height="10" rx="1" fill="#E8E0D0" opacity="0.6" />
          {/* Belt */}
          <rect x="24" y="56" width="92" height="6" fill="#1A1410" />
          <rect x="64" y="56" width="12" height="6" rx="1" fill="#C48840" />
          {/* Legs */}
          <rect x="30" y="62" width="34" height="42" rx="3" fill="#2A2520" />
          <rect x="76" y="62" width="34" height="42" rx="3" fill="#2A2520" />
          {/* Shoes */}
          <rect x="26" y="102" width="40" height="18" rx="4" fill="#1A1410" />
          <rect x="74" y="102" width="40" height="18" rx="4" fill="#1A1410" />
          <rect x="26" y="102" width="40" height="6" rx="3" fill="#2A2018" />
          <rect x="74" y="102" width="40" height="6" rx="3" fill="#2A2018" />
        </svg>
      </div>
    </div>
  )
}
