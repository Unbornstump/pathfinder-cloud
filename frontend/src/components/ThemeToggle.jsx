import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

/**
 * Theme toggle — dark / light. Works in shell chrome and marketing pages.
 */
export default function ThemeToggle({ className = '', size = 18, style }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={
        className ||
        'inline-flex h-9 w-9 items-center justify-center rounded-full border border-border-strong text-ink hover:bg-page'
      }
      style={style}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {isDark ? <Sun size={size} /> : <Moon size={size} />}
    </button>
  )
}
