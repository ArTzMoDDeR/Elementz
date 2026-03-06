import type { Metadata } from 'next'
import Link from 'next/link'
import LegalLayout from '@/components/legal-layout'

export const metadata: Metadata = {
  title: 'Privacy Policy — Politique de confidentialité | Elementz',
  description: 'How Elementz collects, uses, and protects your personal data.',
}

const contact = 'contact@elementz.fun'
const appName = 'Elementz'
const domain = 'https://elementz.fun'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <LegalLayout
      defaultLang="fr"
      titleFr="Politique de confidentialité"
      titleEn="Privacy Policy"
      lastUpdatedFr="6 mars 2025"
      lastUpdatedEn="6 March 2025"
      footerFr={<>
        <Link href="/legal" className="hover:text-foreground transition-colors">Mentions légales</Link>
        <Link href="/terms" className="hover:text-foreground transition-colors">Conditions d&apos;utilisation</Link>
      </>}
      footerEn={<>
        <Link href="/legal" className="hover:text-foreground transition-colors">Legal Notice</Link>
        <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
      </>}
      contentFr={<>
        <Section title="1. Qui sommes-nous">
          <p>{appName} est un jeu disponible sur navigateur et mobile à l&apos;adresse <a href={domain} className="underline text-foreground">{domain}</a>. Le service est opéré par Eugène Garcia, basé à Paris, France.</p>
        </Section>
        <Section title="2. Données collectées">
          <ul className="list-disc list-inside flex flex-col gap-1.5 text-foreground/70">
            <li><strong className="text-foreground">Adresse e-mail</strong> — lors d&apos;une connexion par code OTP.</li>
            <li><strong className="text-foreground">Données Google</strong> (nom, e-mail, avatar) — lors d&apos;une connexion via Google OAuth.</li>
            <li><strong className="text-foreground">Données Discord</strong> (pseudo, e-mail, avatar) — lors d&apos;une connexion via Discord OAuth.</li>
            <li><strong className="text-foreground">Progression de jeu</strong> — éléments découverts, quêtes complétées, pseudo, avatar.</li>
            <li><strong className="text-foreground">Données techniques</strong> — analytics anonymes via Vercel Analytics. Aucun suivi intersites.</li>
          </ul>
        </Section>
        <Section title="3. Finalités du traitement">
          <ul className="list-disc list-inside flex flex-col gap-1.5 text-foreground/70">
            <li>Vous authentifier et maintenir votre session.</li>
            <li>Sauvegarder et synchroniser votre progression sur tous vos appareils.</li>
            <li>Afficher votre pseudo et avatar dans le classement.</li>
            <li>Vous envoyer un code de connexion à usage unique par e-mail.</li>
            <li>Améliorer le jeu grâce à des analyses d&apos;utilisation anonymes.</li>
          </ul>
        </Section>
        <Section title="4. Hébergement & sous-traitants">
          <p>Vos données sont stockées dans une base de données PostgreSQL hébergée par <strong className="text-foreground">Neon</strong> (région EU). L&apos;envoi d&apos;e-mails est assuré par <strong className="text-foreground">Resend</strong>. L&apos;application est déployée sur <strong className="text-foreground">Vercel</strong>. Tous les prestataires sont conformes au RGPD.</p>
        </Section>
        <Section title="5. Durée de conservation">
          <p>Vos données sont conservées tant que votre compte est actif. Vous pouvez supprimer votre compte depuis l&apos;onglet Réglages — cela efface définitivement toutes vos données. Les codes OTP sont invalidés après 10 minutes.</p>
        </Section>
        <Section title="6. Vos droits (RGPD)">
          <p>Vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement, de portabilité et d&apos;opposition. Pour les exercer : <a href={`mailto:${contact}`} className="underline text-foreground">{contact}</a>.</p>
        </Section>
        <Section title="7. Cookies">
          <p>Nous utilisons un unique cookie de session (<code className="bg-muted px-1 py-0.5 rounded text-xs">next-auth.session-token</code>) strictement nécessaire à l&apos;authentification. Aucun cookie publicitaire ou de suivi tiers n&apos;est utilisé.</p>
        </Section>
        <Section title="8. Mineurs">
          <p>Le service n&apos;est pas destiné aux enfants de moins de 13 ans. Nous ne collectons pas sciemment de données relatives à des mineurs.</p>
        </Section>
        <Section title="9. Ressources tierces">
          <p>Certains pictogrammes proviennent du projet <strong className="text-foreground">Twemoji</strong> de Twitter, Inc. et sont utilisés sous licence <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="underline text-foreground">Creative Commons Attribution 4.0 International (CC BY 4.0)</a>. Ces éléments ne sont pas la propriété d&apos;{appName}.</p>
        </Section>
        <Section title="10. Contact">
          <p><a href={`mailto:${contact}`} className="underline text-foreground">{contact}</a></p>
        </Section>
      </>}
      contentEn={<>
        <Section title="1. Who we are">
          <p>{appName} is a browser and mobile game at <a href={domain} className="underline text-foreground">{domain}</a>. The service is operated by Eugène Garcia, based in Paris, France.</p>
        </Section>
        <Section title="2. Data we collect">
          <ul className="list-disc list-inside flex flex-col gap-1.5 text-foreground/70">
            <li><strong className="text-foreground">Email address</strong> — when you sign in via email OTP.</li>
            <li><strong className="text-foreground">Google account data</strong> (name, email, avatar) — via Google OAuth.</li>
            <li><strong className="text-foreground">Discord account data</strong> (username, email, avatar) — via Discord OAuth.</li>
            <li><strong className="text-foreground">Game progress</strong> — elements discovered, quests completed, username, avatar.</li>
            <li><strong className="text-foreground">Technical data</strong> — anonymous analytics via Vercel Analytics. No cross-site tracking.</li>
          </ul>
        </Section>
        <Section title="3. Why we collect it">
          <ul className="list-disc list-inside flex flex-col gap-1.5 text-foreground/70">
            <li>To authenticate you and maintain your session.</li>
            <li>To save and sync your game progress across devices.</li>
            <li>To display your username and avatar on the leaderboard.</li>
            <li>To send you a one-time login code via email.</li>
            <li>To improve the game through anonymous usage analytics.</li>
          </ul>
        </Section>
        <Section title="4. Data storage & processors">
          <p>Data is stored in a PostgreSQL database hosted by <strong className="text-foreground">Neon</strong> (EU region). Email is handled by <strong className="text-foreground">Resend</strong>. The app is deployed on <strong className="text-foreground">Vercel</strong>. All providers comply with GDPR.</p>
        </Section>
        <Section title="5. Data retention">
          <p>Your data is kept as long as your account is active. You can delete your account from the Settings tab — this permanently erases all your data. OTP codes are invalidated after 10 minutes.</p>
        </Section>
        <Section title="6. Your rights (GDPR)">
          <p>You have the right to access, rectify, erase, port, and object to processing of your data. Contact us at <a href={`mailto:${contact}`} className="underline text-foreground">{contact}</a>.</p>
        </Section>
        <Section title="7. Cookies">
          <p>We use a single session cookie (<code className="bg-muted px-1 py-0.5 rounded text-xs">next-auth.session-token</code>) strictly necessary for authentication. No advertising or third-party tracking cookies are used.</p>
        </Section>
        <Section title="8. Children">
          <p>The service is not directed to children under 13. We do not knowingly collect data from minors.</p>
        </Section>
        <Section title="9. Third-party assets">
          <p>Some pictograms come from the <strong className="text-foreground">Twemoji</strong> project by Twitter, Inc., used under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="underline text-foreground">CC BY 4.0</a>. These assets are not the property of {appName}.</p>
        </Section>
        <Section title="10. Contact">
          <p><a href={`mailto:${contact}`} className="underline text-foreground">{contact}</a></p>
        </Section>
      </>}
    />
  )
}
