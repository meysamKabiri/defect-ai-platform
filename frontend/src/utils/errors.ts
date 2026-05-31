import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import type { SerializedError } from '@reduxjs/toolkit'

type ApiErrorPayload = {
  message?: string
  detail?: unknown
  error?: string
}

function stringifyDetail(detail: unknown): string | null {
  if (!detail) return null
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object' && 'msg' in item) {
          return String((item as { msg: unknown }).msg)
        }
        return null
      })
      .filter(Boolean)

    return messages.length ? messages.join(' ') : null
  }
  if (typeof detail === 'object' && 'msg' in detail) {
    return String((detail as { msg: unknown }).msg)
  }
  return null
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong.') {
  if (!error || typeof error !== 'object') return fallback

  const maybeFetchError = error as FetchBaseQueryError

  if ('data' in maybeFetchError && maybeFetchError.data) {
    if (typeof maybeFetchError.data === 'string') return maybeFetchError.data

    const payload = maybeFetchError.data as ApiErrorPayload
    return payload.message ?? stringifyDetail(payload.detail) ?? payload.error ?? fallback
  }

  const maybeSerializedError = error as SerializedError
  return maybeSerializedError.message ?? fallback
}
