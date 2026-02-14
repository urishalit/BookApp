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

  describe('reset', () => {
    it('should clear photoUris to empty array', () => {
      useBatchAddStore.getState().setPhotoUris(['uri1', 'uri2']);
      useBatchAddStore.getState().reset();

      const { photoUris } = useBatchAddStore.getState();
      expect(photoUris).toEqual([]);
    });
  });
});
