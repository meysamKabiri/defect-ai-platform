import { configureStore } from '@reduxjs/toolkit'
import { detectionApi } from '@/services/detectionApi'
import { uploadProgressReducer } from '@/features/detection/uploadProgressSlice'

export const store = configureStore({
  reducer: {
    [detectionApi.reducerPath]: detectionApi.reducer,
    uploadProgress: uploadProgressReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(detectionApi.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
