'use server'

import { signIn } from '@/auth'

export async function signInWithApple() {
  await signIn('apple', { redirectTo: '/' })
}

// Legacy — kept so existing form actions still work
export async function signInWithGoogle() {
  await signIn('apple', { redirectTo: '/' })
}

export async function signInWithDiscord() {
  await signIn('apple', { redirectTo: '/' })
}
