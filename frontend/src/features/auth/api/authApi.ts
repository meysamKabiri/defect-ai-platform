import { baseApi, normalizeAuthResponse } from "@/services/baseApi";
import { logout, setCredentials, setUser } from "@/features/auth/authSlice";
import type {
  ApiAuthResponse,
  AuthResponse,
  AuthUser,
  CreateUserRequest,
  LoginRequest,
} from "@/features/auth/types";

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
      transformResponse: (response: ApiAuthResponse) =>
        normalizeAuthResponse(response),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials(data));
        } catch {
          // The form renders the request error; no extra side effect needed here.
        }
      },
      invalidatesTags: ["Auth"],
    }),

    createUser: builder.mutation<AuthResponse, CreateUserRequest>({
      query: (payload) => ({
        url: "/auth/create-user",
        method: "POST",
        body: payload,
      }),
      transformResponse: (response: ApiAuthResponse) =>
        normalizeAuthResponse(response),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials(data));
        } catch {
          // The form renders the request error; no extra side effect needed here.
        }
      },
      invalidatesTags: ["Auth"],
    }),

    refreshSession: builder.mutation<AuthResponse, void>({
      query: () => ({
        url: "/auth/refresh",
        method: "POST",
      }),

      transformResponse: (response: ApiAuthResponse) =>
        normalizeAuthResponse(response),

      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials(data));
        } catch {
          // Bootstrap handles anonymous sessions when refresh fails.
        }
      },

      invalidatesTags: ["Auth"],
    }),

    getCurrentUser: builder.query<AuthUser, void>({
      query: () => "/auth/me",
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setUser(data));
        } catch {
          // Consumers receive the query error directly.
        }
      },
      providesTags: ["Auth"],
    }),

    logout: builder.mutation<{ success: boolean }, void>({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          dispatch(logout());
          dispatch(baseApi.util.resetApiState());
        }
      },
      invalidatesTags: ["Auth"],
    }),
  }),
});

export const {
  useCreateUserMutation,
  useLoginMutation,
  useRefreshSessionMutation,
  useGetCurrentUserQuery,
  useLogoutMutation,
} = authApi;
