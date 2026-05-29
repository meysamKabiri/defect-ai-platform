import { configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import { baseApi } from '@/services/baseApi'
import { authReducer } from '@/features/auth/authSlice'
import { uploadProgressReducer } from '@/features/detection/uploadProgressSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    uploadProgress: uploadProgressReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
})

setupListeners(store.dispatch)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
