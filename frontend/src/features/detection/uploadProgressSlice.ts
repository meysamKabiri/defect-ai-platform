import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type UploadProgressState = {
  progress: number;
  status: "idle" | "uploading" | "processing" | "complete" | "error";
};

const initialState: UploadProgressState = {
  progress: 0,
  status: "idle",
};

const uploadProgressSlice = createSlice({
  name: "uploadProgress",
  initialState,
  reducers: {
    resetUploadProgress: () => initialState,
    setUploadProgress: (state, action: PayloadAction<number>) => {
      state.progress = Math.min(100, Math.max(0, Math.round(action.payload)));
      state.status = state.progress >= 100 ? "processing" : "uploading";
    },
    setUploadStatus: (
      state,
      action: PayloadAction<UploadProgressState["status"]>,
    ) => {
      state.status = action.payload;
      if (action.payload === "complete") state.progress = 100;
      if (action.payload === "idle") state.progress = 0;
    },
  },
});

export const { resetUploadProgress, setUploadProgress, setUploadStatus } =
  uploadProgressSlice.actions;
export const uploadProgressReducer = uploadProgressSlice.reducer;
