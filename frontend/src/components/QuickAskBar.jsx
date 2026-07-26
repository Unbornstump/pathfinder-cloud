import { useState } from 'react'
import { Send } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useDust } from '../context/DustContext'

/**
 * Lightweight scoped ask — stays on-page until you send,
 * then opens Dust’s dedicated room with the message.
 */
export default function QuickAskBar({
  placeholder = 'Ask Dust to search…',
  className = '',
}) {
  const [text, setText] = useState('')
  const { askDust } = useDust()
  const navigate = useNavigate()

  function submit(e) {
    e?.preventDefault()
    const q = text.trim()
    if (!q) {
      navigate('/dust')
      return
    }
    askDust(q)
    setText('')
  }

  return (
    <form
      onSubmit={submit}
      className={`mt-8 flex gap-2 rounded-[12px] border border-border bg-card p-2 ${className}`}
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-[8px] bg-transparent px-3 py-2 text-sm text-ink outline-none placeholder:text-label"
        aria-label="Ask Dust"
      />
      <button
        type="submit"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-trail-gold text-dust-panel hover:brightness-105"
        aria-label="Send to Dust"
      >
        <Send size={15} />
      </button>
    </form>
  )
}
