import { GoogleSignin } from '@react-native-google-signin/google-signin';

/**
 * Configure Google Sign-In.
 * Must be called before any sign-in attempts.
 * 
 * The webClientId can be found in:
 * - Firebase Console: Authentication > Sign-in method > Google > Web SDK configuration
 * - google-services.json: client[].oauth_client[] where client_type = 3
 */
export function configureGoogleSignIn(webClientId: string) {
  GoogleSignin.configure({
    webClientId,
    offlineAccess: true,
  });
}

