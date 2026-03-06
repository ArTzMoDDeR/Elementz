import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms and conditions governing the use of Elementz.',
}

export default function TermsPage() {
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

        <h1 className="text-3xl font-bold text-foreground mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: {lastUpdated}</p>

        <div className="flex flex-col gap-8 text-sm leading-relaxed text-foreground/80">

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">1. Acceptance</h2>
            <p>By accessing or using <strong className="text-foreground">{appName}</strong> at <a href={domain} className="underline text-foreground">{domain}</a>, you agree to be bound by these Terms of Service. If you do not agree, do not use the service.</p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">2. Description of the service</h2>
            <p>{appName} is a free browser and mobile alchemy game in which players combine elements to discover new ones. The service is provided &ldquo;as is&rdquo; without warranty of any kind.</p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">3. Accounts</h2>
            <ul className="list-disc list-inside flex flex-col gap-1.5 text-foreground/70">
              <li>You must provide accurate information when creating an account.</li>
              <li>You are responsible for maintaining the security of your account.</li>
              <li>One account per person. Multiple accounts for the purpose of gaining unfair leaderboard advantage are prohibited.</li>
              <li>You can delete your account at any time from the Settings tab.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">4. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside flex flex-col gap-1.5 text-foreground/70">
              <li>Use automated tools, bots, scripts, or cheats to gain an unfair advantage.</li>
              <li>Attempt to reverse-engineer, decompile, or extract game data in bulk.</li>
              <li>Upload or use offensive, hateful, or illegal content as your username or avatar.</li>
              <li>Exploit bugs or vulnerabilities — please report them to <a href={`mailto:${contact}`} className="underline text-foreground">{contact}</a> instead.</li>
              <li>Attempt to gain unauthorised access to the database or other users&apos; data.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">5. Intellectual property</h2>
            <p>All game content, design, and code are the exclusive property of Eugène Garcia. You are granted a personal, non-transferable, non-exclusive licence to use the service for personal entertainment. You may not reproduce or distribute any part of the service without prior written permission.</p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">6. Termination</h2>
            <p>We reserve the right to suspend or terminate accounts that violate these Terms, without prior notice. You may terminate your account at any time from the Settings tab.</p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">7. Disclaimer of warranties</h2>
            <p>The service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind, express or implied, including but not limited to availability, accuracy, or fitness for a particular purpose. We do not guarantee uninterrupted or error-free operation.</p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">8. Limitation of liability</h2>
            <p>To the fullest extent permitted by law, Eugène Garcia shall not be liable for any indirect, incidental, or consequential damages arising from the use of or inability to use the service, including loss of progress or game data.</p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">9. Changes to these terms</h2>
            <p>We may update these Terms at any time. Continued use of the service after changes constitutes acceptance. We will indicate the date of the last update at the top of this page.</p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">10. Governing law</h2>
            <p>These Terms are governed by French law. Any dispute arising from the use of the service shall be subject to the exclusive jurisdiction of the competent French courts.</p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">11. Contact</h2>
            <p><a href={`mailto:${contact}`} className="underline text-foreground">{contact}</a></p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-border flex gap-4 text-xs text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link href="/legal" className="hover:text-foreground transition-colors">Legal Notice</Link>
        </div>
      </div>
    </main>
  )
}
