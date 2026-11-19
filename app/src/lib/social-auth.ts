import * as AppleAuthentication from 'expo-apple-authentication';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

/** Google sign-in through Supabase OAuth in an in-app browser session. */
export async function signInWithGoogle() {
  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    if (error) throw new Error(error.message);
    return;
  }
  const redirectTo = makeRedirectUri({ scheme: 'sportzicon', path: 'auth-callback' });
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data.url) throw new Error(error?.message ?? 'Could not start Google sign-in');
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return;
  await completeFromUrl(result.url);
}

async function completeFromUrl(url: string) {
  const [, fragment = ''] = url.split('#');
  const [, query = ''] = url.split('?');
  const params = new URLSearchParams(fragment || query.split('#')[0]);
  const code = new URLSearchParams(query.split('#')[0]).get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw new Error(error.message);
    return;
  }
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) throw new Error(params.get('error_description') ?? 'Sign-in was not completed');
  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) throw new Error(error.message);
}

export const appleSignInAvailable = Platform.OS === 'ios';

/** Native Sign in with Apple (iOS), exchanged for a Supabase session. */
export async function signInWithApple() {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
  });
  if (!credential.identityToken) throw new Error('Apple did not return an identity token');
  const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken });
  if (error) throw new Error(error.message);
  const name = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ');
  if (name) await supabase.auth.updateUser({ data: { full_name: name } });
}

export function isCancel(e: unknown) {
  return typeof e === 'object' && e !== null && 'code' in e && (e as { code: string }).code === 'ERR_REQUEST_CANCELED';
}
