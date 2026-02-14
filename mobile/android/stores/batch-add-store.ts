import { create } from 'zustand';

interface BatchAddState {
  photoUris: string[];

  setPhotoUris: (uris: string[]) => void;
  reset: () => void;
}

const initialState = {
  photoUris: [] as string[],
};

export const useBatchAddStore = create<BatchAddState>((set) => ({
  ...initialState,

  setPhotoUris: (uris) => set({ photoUris: uris }),
  reset: () => set({ photoUris: [] }),
}));
