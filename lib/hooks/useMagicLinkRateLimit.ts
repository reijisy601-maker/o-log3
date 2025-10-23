import { useCallback, useEffect, useState } from 'react'

const RATE_LIMIT_KEY = 'magic_link_last_sent'
const RATE_LIMIT_SECONDS = 60

export function useMagicLinkRateLimit() {
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [canSend, setCanSend] = useState(true)

  const calculateRemaining = useCallback(() => {
    const lastSentStr = typeof window !== 'undefined' ? localStorage.getItem(RATE_LIMIT_KEY) : null

    if (!lastSentStr) {
      setRemainingSeconds(0)
      setCanSend(true)
      return
    }

    const lastSent = parseInt(lastSentStr, 10)
    if (Number.isNaN(lastSent)) {
      localStorage.removeItem(RATE_LIMIT_KEY)
      setRemainingSeconds(0)
      setCanSend(true)
      return
    }

    const now = Date.now()
    const elapsed = Math.floor((now - lastSent) / 1000)
    const remaining = Math.max(0, RATE_LIMIT_SECONDS - elapsed)

    setRemainingSeconds(remaining)
    setCanSend(remaining === 0)
  }, [])

  useEffect(() => {
    calculateRemaining()
    const interval = setInterval(calculateRemaining, 1000)
    return () => clearInterval(interval)
  }, [calculateRemaining])

  const recordSent = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(RATE_LIMIT_KEY, Date.now().toString())
    }
    setRemainingSeconds(RATE_LIMIT_SECONDS)
    setCanSend(false)
  }, [])

  const reset = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(RATE_LIMIT_KEY)
    }
    setRemainingSeconds(0)
    setCanSend(true)
  }, [])

  return {
    canSend,
    remainingSeconds,
    recordSent,
    reset,
  }
}
