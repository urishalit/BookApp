/**
 * Tests for batch-add-store.ts
 *
 * Verifies setPhotoUris and reset behavior.
 * Mutation: reset sets photoUris: ['leaked'] → test expecting empty should fail.
 */

import { useBatchAddStore } from '@/stores/batch-add-store';

describe('batch-add-store', () => {
  beforeEach(() => {
    useBatchAddStore.getState().reset();
  });

  describe('setPhotoUris', () => {
    it('should update photoUris state', () => {
      const uris = ['uri1', 'uri2', 'uri3'];
      useBatchAddStore.getState().setPhotoUris(uris);

      const { photoUris } = useBatchAddStore.getState();
      expect(photoUris).toEqual(uris);
    });

    it('should replace existing photoUris', () => {
      useBatchAddStore.getState().setPhotoUris(['old1']);
      useBatchAddStore.getState().setPhotoUris(['new1', 'new2']);

      const { photoUris } = useBatchAddStore.getState();
      expect(photoUris).toEqual(['new1', 'new2']);
    });
  });

  describe('setSuggestionForIndex', () => {
    it('should store suggestion by index', () => {
      const suggestion = {
        title: 'Test Book',
        author: 'Test Author',
        series_name: null,
        book_number_in_series: null,
      };
      useBatchAddStore.getState().setSuggestionForIndex(0, suggestion);

      const { suggestionsByIndex } = useBatchAddStore.getState();
      expect(suggestionsByIndex[0]).toEqual(suggestion);
    });
  });

  describe('reset', () => {
    it('should clear photoUris to empty array', () => {
      useBatchAddStore.getState().setPhotoUris(['uri1', 'uri2']);
      useBatchAddStore.getState().reset();

      const { photoUris } = useBatchAddStore.getState();
      expect(photoUris).toEqual([]);
    });

    it('should clear suggestionsByIndex when reset', () => {
      useBatchAddStore.getState().setPhotoUris(['uri1']);
      useBatchAddStore.getState().setSuggestionForIndex(0, {
        title: 'X',
        author: 'Y',
        series_name: null,
        book_number_in_series: null,
      });
      useBatchAddStore.getState().reset();

      const { suggestionsByIndex } = useBatchAddStore.getState();
      expect(suggestionsByIndex).toEqual({});
    });
  });
});
