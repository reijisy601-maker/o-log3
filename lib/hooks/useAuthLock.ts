'use client'

import { useEffect, useState } from 'react'

interface LockState {
  attempts: number
  lockedUntil: number | null
}

export function useAuthLock() {
  const [lockState, setLockState] = useState<LockState>({
    attempts: 0,
    lockedUntil: null,
  })
  const [currentTime, setCurrentTime] = useState(Date.now())

  useEffect(() => {
    const stored = localStorage.getItem('auth_lock')
    if (stored) {
      const state = JSON.parse(stored) as LockState
      if (state.lockedUntil && state.lockedUntil > Date.now()) {
        setLockState(state)
      } else {
        localStorage.removeItem('auth_lock')
      }
    }
  }, [])

  useEffect(() => {
    if (lockState.lockedUntil && lockState.lockedUntil > Date.now()) {
      const interval = setInterval(() => {
        setCurrentTime(Date.now())
        if (lockState.lockedUntil && lockState.lockedUntil <= Date.now()) {
          localStorage.removeItem('auth_lock')
          setLockState({ attempts: 0, lockedUntil: null })
        }
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [lockState.lockedUntil])

  const isLocked = !!(lockState.lockedUntil && lockState.lockedUntil > currentTime)

  const remainingTime = isLocked
    ? Math.ceil((lockState.lockedUntil! - currentTime) / 1000)
    : 0

  const recordFailure = () => {
    const newAttempts = lockState.attempts + 1
    if (newAttempts >= 3) {
      const lockedUntil = Date.now() + 5 * 60 * 1000
      const newState = { attempts: newAttempts, lockedUntil }
      localStorage.setItem('auth_lock', JSON.stringify(newState))
      setLockState(newState)
    } else {
      const newState = { attempts: newAttempts, lockedUntil: null }
      localStorage.setItem('auth_lock', JSON.stringify(newState))
      setLockState(newState)
    }
  }

  const reset = () => {
    localStorage.removeItem('auth_lock')
    setLockState({ attempts: 0, lockedUntil: null })
  }

  return {
    isLocked,
    remainingTime,
    attempts: lockState.attempts,
    recordFailure,
    reset,
  }
}
