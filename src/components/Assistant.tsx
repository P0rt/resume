import { useState, useRef, useCallback, useEffect } from 'react'
import avatarWebp from '../assets/avatar.webp'

interface Message {
  text: string
  from: 'user' | 'assistant'
}

const RESPONSES: { pattern: RegExp; reply: string }[] = [
  {
    pattern: /hi|hello|привет|hey|yo|хай/i,
    reply:
      "Hey! I'm Sergei's digital twin. Ask me about his experience, skills, or how to reach him!",
  },
  {
    pattern: /experience|work|job|опыт|работа|career/i,
    reply:
      'Sergei has 8+ years in tech — currently a Technical PM at TripleTen, previously at Practicum USA, Yandex Praktikum, and Sravni. Double-click "Experience" on the desktop for the full list!',
  },
  {
    pattern: /skill|tech|stack|стек|технолог|умеешь/i,
    reply:
      'React, TypeScript, Node.js, Python, Product Management, LLM/ML integration, Git/CI-CD, Webpack/Vite, Technical Writing — and building pixel-art assistants apparently.',
  },
  {
    pattern: /contact|email|связь|контакт|reach|write/i,
    reply:
      'Email: sergey.paarfenov@gmail.com\nLinkedIn: /in/sergey-p-721b25171/\nGitHub: github.com/P0rt\n\nOr just right-click the Email icon on the desktop!',
  },
  {
    pattern: /resume|pdf|резюме|cv/i,
    reply:
      'The resume is in "resume.txt" (Notepad) on the desktop. You can also right-click "resume.pdf" → Save As to download the PDF version!',
  },
  {
    pattern: /who|кто|about|yourself|тебе/i,
    reply:
      "I'm a pixel-art version of Sergei Parfenov, stuck inside this Windows ME desktop. My head opens like a South Park character — pretty cool, right?",
  },
  {
    pattern: /south.?park|саус.?парк/i,
    reply:
      "Ah, I see you noticed the head animation! Yes, it's inspired by the Canadian characters from South Park. Blame it on the developer's sense of humor.",
  },
  {
    pattern: /help|помо[гщ]|what can/i,
    reply:
      "I can tell you about Sergei's experience, skills, contacts, or resume. Try asking: \"What are your skills?\" or \"How to contact Sergei?\"",
  },
]

const DEFAULT_REPLIES = [
  "Hmm, I'm not sure about that. Try asking about skills, experience, or contacts!",
  "That's beyond my pixel brain. Ask me about Sergei's career or how to reach him!",
  "I only know about Sergei's resume. Try: \"What's your experience?\" or \"Skills?\"",
]

function getReply(msg: string): string {
  for (const r of RESPONSES) {
    if (r.pattern.test(msg)) return r.reply
  }
  return DEFAULT_REPLIES[Math.floor(Math.random() * DEFAULT_REPLIES.length)]
}

export function Assistant() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      text: "Hi! I'm Sergei's assistant. Click me to chat! 👋",
      from: 'assistant',
    },
  ])
  const [input, setInput] = useState('')
  const [speaking, setSpeaking] = useState(false)
  const speakTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const speak = useCallback((duration = 2000) => {
    setSpeaking(true)
    clearTimeout(speakTimer.current)
    speakTimer.current = setTimeout(() => setSpeaking(false), duration)
  }, [])

  const handleSend = useCallback(() => {
    const text = input.trim()
    if (!text) return
    setInput('')
    setMessages((prev) => [...prev, { text, from: 'user' }])
    speak(2500)
    setTimeout(() => {
      setMessages((prev) => [...prev, { text: getReply(text), from: 'assistant' }])
    }, 600)
  }, [input, speak])

  const handleCharacterClick = useCallback(() => {
    if (!open) {
      speak(1500)
    }
    setOpen((o) => !o)
  }, [open, speak])

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
                className={`assistant__msg assistant__msg--${m.from}`}
              >
                {m.text}
              </div>
            ))}
          </div>
          <form
            className="assistant__input-row"
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
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

      <div className="assistant__character" onClick={handleCharacterClick}>
        <div className="assistant__bubble">
          {!open ? 'Click me!' : '💬'}
        </div>
        <div
          className={`assistant__head ${speaking ? 'assistant__head--speaking' : ''}`}
        >
          <div className="assistant__head-top">
            <img src={avatarWebp} alt="" draggable={false} />
          </div>
          <div className="assistant__head-bottom">
            <img src={avatarWebp} alt="" draggable={false} />
          </div>
        </div>
        <svg
          className="assistant__body"
          width="56"
          height="52"
          viewBox="0 0 56 52"
        >
          <rect x="10" y="0" width="36" height="26" rx="2" fill="#4A4540" />
          <rect x="22" y="0" width="12" height="6" rx="1" fill="#E8E0D0" />
          <polygon points="28,6 23,18 33,18" fill="#8B5A30" />
          <rect x="0" y="3" width="12" height="18" rx="2" fill="#4A4540" />
          <rect x="44" y="3" width="12" height="18" rx="2" fill="#4A4540" />
          <rect x="1" y="19" width="10" height="7" rx="2" fill="#DEB887" />
          <rect x="45" y="19" width="10" height="7" rx="2" fill="#DEB887" />
          <rect x="12" y="26" width="14" height="18" rx="1" fill="#2D2A28" />
          <rect x="30" y="26" width="14" height="18" rx="1" fill="#2D2A28" />
          <rect x="10" y="44" width="16" height="8" rx="2" fill="#1A1410" />
          <rect x="30" y="44" width="16" height="8" rx="2" fill="#1A1410" />
        </svg>
      </div>
    </div>
  )
}
