import { useEffect, useState } from 'react'
import { useAppSelector } from '@/app/hooks'
import { selectAccessToken } from '@/features/auth/authSlice'

type AuthenticatedImageState = {
  error: string | null
  imageUrl: string | null
  isLoading: boolean
}

function isBrowserManagedUrl(url: string) {
  return url.startsWith('blob:') || url.startsWith('data:')
}

function isProtectedDetectionImageUrl(url: string) {
  try {
    const parsedUrl = new URL(url, window.location.origin)
    return (
      parsedUrl.pathname.includes('/api/v1/detect/jobs/') &&
      parsedUrl.pathname.includes('/image/')
    )
  } catch {
    return false
  }
}

export function useAuthenticatedImageUrl(sourceUrl: string | null): AuthenticatedImageState {
  const accessToken = useAppSelector(selectAccessToken)
  const [state, setState] = useState<AuthenticatedImageState>({
    error: null,
    imageUrl: null,
    isLoading: false,
  })

  useEffect(() => {
    if (!sourceUrl) {
      setState({
        error: null,
        imageUrl: null,
        isLoading: false,
      })
      return undefined
    }

    if (isBrowserManagedUrl(sourceUrl) || !isProtectedDetectionImageUrl(sourceUrl)) {
      setState({
        error: null,
        imageUrl: sourceUrl,
        isLoading: false,
      })
      return undefined
    }

    const abortController = new AbortController()
    let objectUrl: string | null = null
    const requestUrl = sourceUrl

    setState({
      error: null,
      imageUrl: null,
      isLoading: true,
    })

    async function loadProtectedImage() {
      const response = await fetch(requestUrl, {
        credentials: 'include',
        headers: accessToken
          ? {
            Authorization: `Bearer ${accessToken}`,
          }
          : undefined,
        signal: abortController.signal,
      })

      if (!response.ok) {
        throw new Error(`Unable to load image (${response.status}).`)
      }

      const contentType = response.headers.get('content-type') ?? ''
      if (contentType && !contentType.startsWith('image/')) {
        throw new Error('Protected media endpoint did not return an image.')
      }

      const blob = await response.blob()
      objectUrl = URL.createObjectURL(blob)

      setState({
        error: null,
        imageUrl: objectUrl,
        isLoading: false,
      })
    }

    void loadProtectedImage().catch((error: unknown) => {
      if (abortController.signal.aborted) return

      setState({
        error: error instanceof Error ? error.message : 'Unable to load image.',
        imageUrl: null,
        isLoading: false,
      })
    })

    return () => {
      abortController.abort()
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [accessToken, sourceUrl])

  return state
}
