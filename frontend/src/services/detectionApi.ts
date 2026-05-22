import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  UploadDetectionResponse,
  DetectionJobResponse,
} from "@/features/detection/detectionTypes";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string) ??
  "http://127.0.0.1:8000/api/v1";

export const detectionApi = createApi({
  reducerPath: "detectionApi",
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE,
    // Attach auth header when present and include credentials for same-site cookies.
    prepareHeaders: (headers) => {
      try {
        const token = localStorage.getItem("auth_token");
        if (token) headers.set("Authorization", `Bearer ${token}`);
      } catch (e) {
        // ignore (SSR or restricted storage)
      }
      return headers;
    },
    credentials: "include",
  }),
  endpoints: (builder) => ({
    uploadDetection: builder.mutation<
      UploadDetectionResponse, // Response type
      { file: File }
    >({
      query: ({ file }) => {
        const formData = new FormData();
        formData.append("file", file);

        return {
          url: "/detect/upload",
          method: "POST",
          body: formData,
          // Important: Do NOT set Content-Type header manually
          // Fetch will automatically set multipart/form-data with boundary
        };
      },
    }),
    getDetectionJob: builder.query<DetectionJobResponse, string>({
      query: (jobId) => `/detect/jobs/${jobId}`,
    }),
  }),
});

// Export hooks
export const { useUploadDetectionMutation, useGetDetectionJobQuery } =
  detectionApi;
