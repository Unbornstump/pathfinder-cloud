import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import DustPanel from '../components/DustPanel'

const DustContext = createContext(null)

/** Dust lives on the shell rail — no floating pill when the joined shell is in use. */
export function DustProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [open, setOpen] = useState(false)

  const openDust = useCallback(() => setOpen(true), [])
  const closeDust = useCallback(() => setOpen(false), [])

  const value = useMemo(
    () => ({ open, openDust, closeDust }),
    [open, openDust, closeDust],
  )

  return (
    <DustContext.Provider value={value}>
      {children}
      {isAuthenticated && <DustPanel open={open} onClose={closeDust} />}
    </DustContext.Provider>
  )
}

export function useDust() {
  const ctx = useContext(DustContext)
  if (!ctx) throw new Error('useDust must be used within DustProvider')
  return ctx
}
