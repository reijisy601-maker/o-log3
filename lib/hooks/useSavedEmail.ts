'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'orderlog_saved_email'

export function useSavedEmail() {
  const [savedEmail, setSavedEmail] = useState('')
  const [shouldSave, setShouldSave] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) {
      setSavedEmail(stored)
      setShouldSave(true)
    }
  }, [])

  const saveEmail = (email: string) => {
    if (typeof window === 'undefined') return
    if (shouldSave && email) {
      window.localStorage.setItem(STORAGE_KEY, email)
    } else {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }

  const clearSavedEmail = () => {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(STORAGE_KEY)
    setSavedEmail('')
    setShouldSave(false)
  }

  return {
    savedEmail,
    shouldSave,
    setShouldSave,
    saveEmail,
    clearSavedEmail,
  }
}
