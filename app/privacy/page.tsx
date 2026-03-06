import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Elementz collects, uses, and protects your personal data.',
}

export default function PrivacyPage() {
  const lastUpdated = '6 March 2025'
  const contact = 'contact@elementz.fun'
  const appName = 'Elementz'
  const domain = 'https://elementz.fun'

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          {appName}
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: {lastUpdated}</p>

        <div className="flex flex-col gap-8 text-sm leading-relaxed text-foreground/80">

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">1. Who we are</h2>
            <p>{appName} is a browser and mobile game available at <a href={domain} className="underline text-foreground">{domain}</a>. The service is operated by Eugène Garcia (&ldquo;we&rdquo;, &ldquo;us&rdquo;), based in Paris, France.</p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">2. Data we collect</h2>
            <ul className="list-disc list-inside flex flex-col gap-1.5 text-foreground/70">
              <li><strong className="text-foreground">Email address</strong> — when you sign in via email OTP.</li>
              <li><strong className="text-foreground">Google account data</strong> (name, email, avatar) — when you sign in via Google OAuth.</li>
              <li><strong className="text-foreground">Discord account data</strong> (username, email, avatar) — when you sign in via Discord OAuth.</li>
              <li><strong className="text-foreground">Game progress</strong> — elements discovered, quests completed, username, avatar.</li>
              <li><strong className="text-foreground">Technical data</strong> — anonymous analytics (page views, device type) via Vercel Analytics. No cross-site tracking.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">3. Why we collect it</h2>
            <ul className="list-disc list-inside flex flex-col gap-1.5 text-foreground/70">
              <li>To authenticate you and maintain your session.</li>
              <li>To save and sync your game progress across devices.</li>
              <li>To display your username and avatar on the leaderboard (if you participate).</li>
              <li>To send you a one-time login code via email (Resend).</li>
              <li>To improve the game through anonymous usage analytics.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">4. Data storage & processors</h2>
            <p>Your data is stored in a PostgreSQL database hosted by <strong className="text-foreground">Neon</strong> (EU region). Email sending is handled by <strong className="text-foreground">Resend</strong>. The app is deployed on <strong className="text-foreground">Vercel</strong> (US/EU). All providers comply with GDPR.</p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">5. Data retention</h2>
            <p>Your data is kept as long as your account is active. You can delete your account at any time from the Settings tab — this permanently erases all your personal data and game progress. Email OTP codes are automatically invalidated after 10 minutes.</p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">6. Your rights (GDPR)</h2>
            <p>Under the GDPR and applicable French law, you have the right to:</p>
            <ul className="list-disc list-inside flex flex-col gap-1.5 text-foreground/70">
              <li><strong className="text-foreground">Access</strong> your personal data.</li>
              <li><strong className="text-foreground">Rectify</strong> inaccurate data.</li>
              <li><strong className="text-foreground">Erase</strong> your data (&ldquo;right to be forgotten&rdquo;).</li>
              <li><strong className="text-foreground">Portability</strong> of your data.</li>
              <li><strong className="text-foreground">Object</strong> to processing.</li>
            </ul>
            <p>To exercise these rights, contact us at <a href={`mailto:${contact}`} className="underline text-foreground">{contact}</a>.</p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">7. Cookies</h2>
            <p>We use a single session cookie (<code className="bg-muted px-1 py-0.5 rounded text-xs">next-auth.session-token</code>) strictly necessary for authentication. We do not use advertising or third-party tracking cookies.</p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">8. Children</h2>
            <p>The service is not directed to children under 13. We do not knowingly collect data from minors.</p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">9. Third-party assets</h2>
            <p>Some pictograms used in the application come from the <strong className="text-foreground">Twemoji</strong> project by Twitter, Inc. and are used under the <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="underline text-foreground">Creative Commons Attribution 4.0 International (CC BY 4.0)</a> licence. These assets are not the property of {appName}.</p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">10. Contact</h2>
            <p>Questions or requests: <a href={`mailto:${contact}`} className="underline text-foreground">{contact}</a></p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-border flex gap-4 text-xs text-muted-foreground">
          <Link href="/legal" className="hover:text-foreground transition-colors">Legal Notice</Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
        </div>
      </div>
    </main>
  )
}
