export async function googleLogin() {
  const { GoogleAuthProvider, signInWithCredential } = await import('@firebase/auth');
  const { GoogleSignin, isSuccessResponse } =
    await import('@react-native-google-signin/google-signin');
  const { googleClientId, grantumAuth } = await import('./firebaseSession');
  if (!googleClientId) throw new Error('Configure the native Google client before signing in.');
  GoogleSignin.configure({ webClientId: googleClientId });
  await GoogleSignin.hasPlayServices();
  const result = await GoogleSignin.signIn();
  if (isSuccessResponse(result)) {
    if (!result.data.idToken) throw new Error('Google did not return a sign-in credential.');
    await signInWithCredential(grantumAuth(), GoogleAuthProvider.credential(result.data.idToken));
  }
}
