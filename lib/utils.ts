import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const LOCALHOST_FALLBACK = "http://localhost:3000"

export function getSiteUrl(): string {
  const { NEXT_PUBLIC_SITE_URL, VERCEL_ENV, VERCEL_URL } = process.env

  if (VERCEL_ENV === "preview" && VERCEL_URL) {
    return `https://${VERCEL_URL}`
  }

  if (NEXT_PUBLIC_SITE_URL) {
    return NEXT_PUBLIC_SITE_URL
  }

  if (VERCEL_URL) {
    return `https://${VERCEL_URL}`
  }

  return LOCALHOST_FALLBACK
}
