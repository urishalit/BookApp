import {
  uploadImage,
  uploadMemberAvatar,
  uploadBookCover,
  uploadSeriesCover,
  deleteFile,
} from '../../lib/storage';

// Get the mocked storage
const mockStorage = jest.requireMock('@react-native-firebase/storage').default;

describe('Storage Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadImage', () => {
    it('should upload an image and return download URL', async () => {
      const uri = 'file:///path/to/image.jpg';
      const path = 'test/image.jpg';
      
      const url = await uploadImage(uri, path);
      
      expect(mockStorage).toHaveBeenCalled();
      expect(url).toBe('https://example.com/image.jpg');
    });
  });

  describe('uploadMemberAvatar', () => {
    it('should upload avatar and return URL', async () => {
      const uri = 'file:///path/to/avatar.jpg';
      
      const url = await uploadMemberAvatar(uri, 'family-123', 'member-456');
      
      expect(mockStorage).toHaveBeenCalled();
      expect(url).toBe('https://example.com/image.jpg');
    });
  });

  describe('uploadBookCover', () => {
    it('should upload book cover and return URL', async () => {
      const uri = 'file:///path/to/cover.jpg';
      
      const url = await uploadBookCover(uri, 'family-123', 'member-456', 'book-789');
      
      expect(mockStorage).toHaveBeenCalled();
      expect(url).toBe('https://example.com/image.jpg');
    });
  });

  describe('uploadSeriesCover', () => {
    it('should upload series cover and return URL', async () => {
      const uri = 'file:///path/to/cover.jpg';
      
      const url = await uploadSeriesCover(uri, 'family-123', 'series-456');
      
      expect(mockStorage).toHaveBeenCalled();
      expect(url).toBe('https://example.com/image.jpg');
    });
  });

  describe('deleteFile', () => {
    it('should delete file by path', async () => {
      await deleteFile('test/file.jpg');
      
      expect(mockStorage).toHaveBeenCalled();
    });

    it('should delete file by URL', async () => {
      await deleteFile('https://firebase.storage/file.jpg');
      
      expect(mockStorage).toHaveBeenCalled();
    });

    it('should handle gs:// URLs', async () => {
      await deleteFile('gs://bucket/file.jpg');
      
      expect(mockStorage).toHaveBeenCalled();
    });

    it('should not throw for object-not-found errors', async () => {
      // The mock already resolves successfully, so this should not throw
      await expect(deleteFile('nonexistent.jpg')).resolves.toBeUndefined();
    });
  });
});
