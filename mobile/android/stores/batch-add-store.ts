import { create } from 'zustand';
import type { BookMetadataSuggestions } from '@/lib/book-cover-service';

interface BatchAddState {
  photoUris: string[];
  suggestionsByIndex: Record<number, BookMetadataSuggestions>;

  setPhotoUris: (uris: string[]) => void;
  setSuggestionForIndex: (index: number, data: BookMetadataSuggestions) => void;
  reset: () => void;
}

const initialState = {
  photoUris: [] as string[],
  suggestionsByIndex: {} as Record<number, BookMetadataSuggestions>,
};

export const useBatchAddStore = create<BatchAddState>((set) => ({
  ...initialState,

  setPhotoUris: (uris) => set({ photoUris: uris }),
  setSuggestionForIndex: (index, data) =>
    set((state) => ({
      suggestionsByIndex: { ...state.suggestionsByIndex, [index]: data },
    })),
  reset: () => set({ photoUris: [], suggestionsByIndex: {} }),
}));
