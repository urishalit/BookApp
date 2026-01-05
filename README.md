# BookApp

A React Native mobile app with Firebase integration.

## Prerequisites

- Node.js >= 18
- React Native development environment set up
- iOS: Xcode and CocoaPods
- Android: Android Studio and Android SDK

## Installation

1. Install dependencies:
```bash
npm install
```

2. For iOS, install CocoaPods:
```bash
cd ios && pod install && cd ..
```

## Running the App

### iOS
```bash
npm run ios
```

### Android

**Prerequisites:**
- Android Studio installed
- Android SDK and platform-tools in your PATH
- Android emulator created and running, or a physical device connected

**Setup Android SDK:**
1. Open Android Studio
2. Go to Settings/Preferences → Appearance & Behavior → System Settings → Android SDK
3. Note the "Android SDK Location" path (usually `~/Library/Android/sdk` on macOS)
4. Install Android SDK Platform-Tools
5. Set ANDROID_HOME and add platform-tools to your PATH:

   **For zsh (default on macOS):**
   ```bash
   echo 'export ANDROID_HOME=$HOME/Library/Android/sdk' >> ~/.zshrc
   echo 'export PATH=$PATH:$ANDROID_HOME/platform-tools' >> ~/.zshrc
   source ~/.zshrc
   ```

   **For bash:**
   ```bash
   echo 'export ANDROID_HOME=$HOME/Library/Android/sdk' >> ~/.bash_profile
   echo 'export PATH=$PATH:$ANDROID_HOME/platform-tools' >> ~/.bash_profile
   source ~/.bash_profile
   ```

   **If your Android SDK is in a different location**, replace `$HOME/Library/Android/sdk` with your actual SDK path.

   **Alternative (without setting ANDROID_HOME):**
   If you prefer not to set ANDROID_HOME, you can add the platform-tools directly:
   ```bash
   export PATH=$PATH:~/Library/Android/sdk/platform-tools
   ```
   (Add this to your shell profile to make it permanent)

**Create an Android Emulator:**
1. Open Android Studio
2. Go to Tools → Device Manager
3. Click "Create Device" and follow the wizard

**Download Gradle Wrapper JAR:**
The Gradle wrapper JAR file is required. Run this command to download it:
```bash
cd android && curl -L -o gradle/wrapper/gradle-wrapper.jar https://raw.githubusercontent.com/gradle/gradle/v8.11.1/gradle/wrapper/gradle-wrapper.jar && cd ..
```

Or manually download from: https://raw.githubusercontent.com/gradle/gradle/v8.11.1/gradle/wrapper/gradle-wrapper.jar
and save it to: `android/gradle/wrapper/gradle-wrapper.jar`

**Run the app:**
```bash
npm run android
```

**Note:** The first time you run `npm run android`, Gradle will download the required distribution files. This may take a few minutes.

## Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Add iOS app to your Firebase project and download `GoogleService-Info.plist`
3. Add Android app to your Firebase project and download `google-services.json`
4. Place `GoogleService-Info.plist` in the `ios/` directory
5. Place `google-services.json` in the `android/app/` directory
6. For iOS, run `cd ios && pod install && cd ..` to install Firebase native dependencies
7. Rebuild the app for Firebase to be initialized

Note: Firebase configuration is handled through the native files (GoogleService-Info.plist and google-services.json). The `firebase-config.ts` file exports the Firebase app instance for use in your components.

## Project Structure

- `App.tsx` - Main app component
- `index.js` - Entry point
- `firebase-config.ts` - Firebase initialization
- `ios/` - iOS native project
- `android/` - Android native project

