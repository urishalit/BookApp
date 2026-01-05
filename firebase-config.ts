import firebaseApp from '@react-native-firebase/app';

// Firebase is automatically initialized using native configuration files:
// - iOS: GoogleService-Info.plist (place in ios/ directory)
// - Android: google-services.json (place in android/app/ directory)
// 
// To set up Firebase:
// 1. Create a Firebase project at https://console.firebase.google.com
// 2. Add iOS app and download GoogleService-Info.plist
// 3. Add Android app and download google-services.json
// 4. Place the files in the respective directories
// 5. Run pod install for iOS
// 6. Rebuild the app

// Firebase app instance is ready to use
// You can import specific Firebase services like:
// import auth from '@react-native-firebase/auth';
// import firestore from '@react-native-firebase/firestore';

export default firebaseApp;

