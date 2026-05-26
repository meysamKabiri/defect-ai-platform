import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import type { SerializedError } from '@reduxjs/toolkit'

type ApiErrorPayload = {
  message?: string
  detail?: string
  error?: string
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong.') {
  if (!error || typeof error !== 'object') return fallback

  const maybeFetchError = error as FetchBaseQueryError

  if ('data' in maybeFetchError && maybeFetchError.data) {
    if (typeof maybeFetchError.data === 'string') return maybeFetchError.data

    const payload = maybeFetchError.data as ApiErrorPayload
    return payload.message ?? payload.detail ?? payload.error ?? fallback
  }

  const maybeSerializedError = error as SerializedError
  return maybeSerializedError.message ?? fallback
}
