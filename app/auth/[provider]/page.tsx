import { signIn } from '@/auth'
import { redirect } from 'next/navigation'

// This is a pure server-side page that triggers the OAuth flow.
// By calling signIn() here (server component), Next.js performs a real
// HTTP redirect to the OAuth provider — no AJAX, no CSRF fetch, no POST needed.
// This works on mobile Safari, PWA standalone, and Capacitor Browser.open().
export default async function AuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ provider: string }>
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const { provider } = await params
  const { callbackUrl } = await searchParams

  const validProviders = ['apple', 'google', 'discord']
  if (!validProviders.includes(provider)) {
    redirect('/')
  }

  await signIn(provider, {
    redirectTo: callbackUrl ?? 'https://www.elementz.fun/',
  })
}
