import { browserPopupRedirectResolver, GoogleAuthProvider, signInWithPopup } from '@firebase/auth';
import { grantumAuth } from './firebaseSession';

export async function googleLogin() {
  await signInWithPopup(grantumAuth(), new GoogleAuthProvider(), browserPopupRedirectResolver);
}
