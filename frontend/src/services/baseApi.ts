import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react'
import { API_V1_BASE_URL } from '@/lib/config'
import { logout, setCredentials } from '@/features/auth/authSlice'
import type { ApiAuthResponse, AuthResponse } from '@/features/auth/types'
import type { RootState } from '@/app/store'

function normalizeAuthResponse(response: ApiAuthResponse): AuthResponse {
  const accessToken = response.accessToken ?? response.access_token
  const refreshToken = response.refreshToken ?? response.refresh_token

  if (!accessToken) {
    throw new Error('Auth response did not include an access token.')
  }

  return {
    user: response.user,
    accessToken,
    refreshToken,
    workspaces: response.workspaces ?? [],
    currentWorkspace: response.current_workspace ?? response.workspace ?? response.workspaces?.[0] ?? null,
  }
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_V1_BASE_URL,
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken

    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    return headers
  },
})

function getRequestUrl(args: string | FetchArgs) {
  return typeof args === 'string' ? args : args.url
}

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await rawBaseQuery(args, api, extraOptions)
  const requestUrl = getRequestUrl(args)
  const canRefresh = !['/auth/login', '/auth/refresh'].includes(requestUrl)

  if (result.error?.status === 401 && canRefresh) {
    const refreshResult = await rawBaseQuery(
      {
        url: '/auth/refresh',
        method: 'POST',
      },
      api,
      extraOptions,
    )

    if (refreshResult.data) {
      try {
        const session = normalizeAuthResponse(refreshResult.data as ApiAuthResponse)
        api.dispatch(setCredentials(session))
        result = await rawBaseQuery(args, api, extraOptions)
      } catch {
        api.dispatch(logout())
      }
    } else {
      api.dispatch(logout())
    }
  }

  return result
}

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Auth', 'Detection', 'AdminUsers', 'AdminProjects', 'AdminRoles', 'WorkspaceMembers', 'WorkspaceInvitations'],
  endpoints: () => ({}),
})

export { normalizeAuthResponse }
