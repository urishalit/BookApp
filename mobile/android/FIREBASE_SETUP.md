# Firebase Setup Guide

This guide will help you configure Firebase with Google Sign-In for the Family Book Keeper app.

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name: `family-book-keeper` (or your preferred name)
4. Enable/disable Google Analytics as preferred
5. Click "Create project"

## 2. Enable Google Authentication

1. In your Firebase project, go to **Build > Authentication**
2. Click "Get started"
3. Go to **Sign-in method** tab
4. Click on **Google** provider
5. Toggle **Enable**
6. Enter a public-facing name for your app
7. Select a support email address
8. Click **Save**

## 3. Create Firestore Database

1. Go to **Build > Firestore Database**
2. Click "Create database"
3. Choose location (select one closest to your users)
4. Start in **test mode** for development (you'll add security rules later)
5. Click "Enable"

### Firestore Security Rules (Development)

For development, you can use these permissive rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Firestore Security Rules (Production)

For production, use more restrictive rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Families collection
    match /families/{familyId} {
      allow read: if request.auth != null && resource.data.ownerId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.ownerId == request.auth.uid;
      allow update, delete: if request.auth != null && resource.data.ownerId == request.auth.uid;
      
      // Members subcollection
      match /members/{memberId} {
        allow read, write: if request.auth != null && 
          get(/databases/$(database)/documents/families/$(familyId)).data.ownerId == request.auth.uid;
        
        // Books subcollection
        match /books/{bookId} {
          allow read, write: if request.auth != null && 
            get(/databases/$(database)/documents/families/$(familyId)).data.ownerId == request.auth.uid;
        }
        
        // Series subcollection
        match /series/{seriesId} {
          allow read, write: if request.auth != null && 
            get(/databases/$(database)/documents/families/$(familyId)).data.ownerId == request.auth.uid;
        }
      }
    }
  }
}
```

## 4. Enable Firebase Storage

1. Go to **Build > Storage**
2. Click "Get started"
3. Start in **test mode** for development
4. Click "Next" and select storage location
5. Click "Done"

### Storage Security Rules (Development)

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 5. Add Android App

1. In Firebase Console, click the **Android** icon to add an Android app
2. Enter package name: `com.familybookkeeper.app`
3. Enter app nickname: `Family Book Keeper`
4. **SHA-1 Certificate** (Required for Google Sign-In):
   - For debug builds, run:
     ```bash
     cd android && ./gradlew signingReport
     ```
   - Copy the SHA-1 from the debug variant
   - Paste it in the SHA certificate fingerprints field
5. Click "Register app"
6. Download `google-services.json`
7. **Place the file in the project root**: `/Users/uri/dev/BookApp/mobile/android/google-services.json`
8. Click "Continue" through the remaining steps

## 6. Add iOS App

1. In Firebase Console, click the **iOS** icon to add an iOS app
2. Enter bundle ID: `com.familybookkeeper.app`
3. Enter app nickname: `Family Book Keeper`
4. Click "Register app"
5. Download `GoogleService-Info.plist`
6. **Place the file in the project root**: `/Users/uri/dev/BookApp/mobile/android/GoogleService-Info.plist`
7. Click "Continue" through the remaining steps

## 7. Get Web Client ID for Google Sign-In

The Web Client ID is created automatically when you enable Google Sign-In. Find it using one of these methods:

### Option A: From Firebase Console (Easiest)
1. Go to **Authentication > Sign-in method > Google**
2. Expand the **Web SDK configuration** section
3. Copy the **Web client ID**

### Option B: From your google-services.json
1. Open `google-services.json` in the project root
2. Find the `client` array → look for `oauth_client` with `client_type: 3`
3. Copy the `client_id` value

### Option C: From Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project from the dropdown at the top
3. Click the hamburger menu (☰) → **APIs & Services** → **Credentials**
4. Under **OAuth 2.0 Client IDs**, find the **Web client** entry
5. Copy the Client ID

### Set the Environment Variable
Create a `.env` file in the project root:

```bash
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id-here.apps.googleusercontent.com
```

## 8. Configure iOS URL Scheme

For iOS Google Sign-In to work, you need to add a URL scheme:

1. Open `GoogleService-Info.plist` and find `REVERSED_CLIENT_ID`
2. Add it to `app.json` (this is done automatically by the plugin, but verify after prebuild)

## 9. Build Development Client

Since we're using native Firebase modules, you need to build a development client:

```bash
# Install expo-dev-client (already installed)
npm install expo-dev-client

# Build for iOS simulator
npx expo run:ios

# Build for Android emulator
npx expo run:android

# Or build using EAS
npx eas build --profile development --platform ios
npx eas build --profile development --platform android
```

## 10. Running the App

After building the development client:

```bash
# Start the development server
npm start

# Or with specific platform
npm run ios
npm run android
```

## Project Structure

```
lib/
├── firebase.ts      # Firebase app initialization
├── firestore.ts     # Firestore database helpers
├── storage.ts       # Firebase Storage helpers
└── google-signin.ts # Google Sign-In configuration

stores/
└── auth-store.ts    # Zustand store for auth state (Google Sign-In)

hooks/
└── use-auth.ts      # Auth state hooks

types/
└── models.ts        # TypeScript interfaces for data models

app/
├── _layout.tsx      # Root layout with auth navigation
├── (auth)/          # Auth screens
│   ├── _layout.tsx
│   └── login.tsx    # Google Sign-In screen
└── (tabs)/          # Main app tabs (authenticated)
```

## Troubleshooting

### "No Firebase App" Error
Make sure `google-services.json` (Android) or `GoogleService-Info.plist` (iOS) is in the project root.

### Google Sign-In Error: DEVELOPER_ERROR (Android)
- Ensure SHA-1 is correctly added to Firebase Console
- Make sure you're using the correct Web Client ID (not Android Client ID)
- Run `cd android && ./gradlew signingReport` to get the correct SHA-1

### Google Sign-In Error on iOS
- Verify `REVERSED_CLIENT_ID` URL scheme is configured
- Ensure `GoogleService-Info.plist` is properly placed

### Build Errors
Run `npx expo prebuild --clean` to regenerate native projects.

### Auth Not Working
1. Verify Google auth is enabled in Firebase Console
2. Check that the Firebase config files are correctly placed
3. Ensure you're running a development build, not Expo Go
4. Verify the Web Client ID is correct in your `.env` file

## Environment Variables

Create a `.env` file in the project root:

```bash
# Required for Google Sign-In
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

## Next Steps

After completing Firebase setup:
1. Build and run the app
2. Sign in with your Google account
3. Check Firebase Console > Authentication to see the user
4. You're ready to implement family member management (Phase 2)
