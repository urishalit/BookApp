// Mock Expo globals before anything else
global.__ExpoImportMetaRegistry = {};
global.structuredClone = global.structuredClone || ((val) => JSON.parse(JSON.stringify(val)));

// Mock expo module
jest.mock('expo', () => ({}));

// Mock Firebase Auth
jest.mock('@react-native-firebase/auth', () => {
  const mockUser = {
    uid: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
  };

  const mockAuth = {
    onAuthStateChanged: jest.fn((callback) => {
      // Initially call with null (not signed in)
      callback(null);
      // Return unsubscribe function
      return jest.fn();
    }),
    signInWithCredential: jest.fn(() => Promise.resolve({ user: mockUser })),
    signOut: jest.fn(() => Promise.resolve()),
    currentUser: null,
  };

  const auth = jest.fn(() => mockAuth);
  auth.GoogleAuthProvider = {
    credential: jest.fn((idToken) => ({ idToken, providerId: 'google.com' })),
  };

  return {
    __esModule: true,
    default: auth,
  };
});

// Mock Google Sign-In
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(() =>
      Promise.resolve({
        data: {
          idToken: 'mock-id-token',
          user: {
            id: 'google-user-id',
            email: 'test@gmail.com',
            name: 'Test User',
          },
        },
      })
    ),
    signOut: jest.fn(() => Promise.resolve()),
    isSignedIn: jest.fn(() => Promise.resolve(false)),
    getCurrentUser: jest.fn(() => Promise.resolve(null)),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
  isErrorWithCode: jest.fn((error) => error && 'code' in error),
}));

// Mock Firebase Firestore
jest.mock('@react-native-firebase/firestore', () => {
  // Create a chainable query mock
  const createQueryMock = () => {
    const mock = {
      get: jest.fn(() => Promise.resolve({ docs: [], empty: true })),
      where: jest.fn(() => createQueryMock()),
      orderBy: jest.fn(() => createQueryMock()),
      limit: jest.fn(() => createQueryMock()),
      onSnapshot: jest.fn(() => jest.fn()),
    };
    return mock;
  };

  const mockCollection = jest.fn(() => ({
    add: jest.fn(() => Promise.resolve({ id: 'mock-doc-id' })),
    doc: jest.fn(() => ({
      get: jest.fn(() => Promise.resolve({ exists: true, id: 'mock-doc-id', data: () => ({}) })),
      set: jest.fn(() => Promise.resolve()),
      update: jest.fn(() => Promise.resolve()),
      delete: jest.fn(() => Promise.resolve()),
      collection: mockCollection,
    })),
    get: jest.fn(() => Promise.resolve({ docs: [], empty: true })),
    where: jest.fn(() => createQueryMock()),
    orderBy: jest.fn(() => createQueryMock()),
    onSnapshot: jest.fn(() => jest.fn()),
  }));

  const firestore = jest.fn(() => ({
    collection: mockCollection,
  }));

  firestore.FieldValue = {
    serverTimestamp: jest.fn(() => new Date()),
  };

  return {
    __esModule: true,
    default: firestore,
  };
});

// Mock Firebase Storage
jest.mock('@react-native-firebase/storage', () => {
  const mockRef = {
    putFile: jest.fn(() => Promise.resolve()),
    getDownloadURL: jest.fn(() => Promise.resolve('https://example.com/image.jpg')),
    delete: jest.fn(() => Promise.resolve()),
  };

  const storage = jest.fn(() => ({
    ref: jest.fn(() => mockRef),
    refFromURL: jest.fn(() => mockRef),
  }));

  return {
    __esModule: true,
    default: storage,
  };
});

// Mock react-native
jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
    select: jest.fn((obj) => obj.android),
  },
  StyleSheet: {
    create: jest.fn((styles) => styles),
  },
}));
