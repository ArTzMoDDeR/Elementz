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

export default function PrivacyPage() {
  return (
    <LegalLayout
      defaultLang="fr"
      title={l => l === 'fr' ? 'Politique de confidentialité' : 'Privacy Policy'}
      lastUpdated={l => l === 'fr' ? '6 mars 2025' : '6 March 2025'}
      footer={l => l === 'fr' ? (
        <>
          <Link href="/legal" className="hover:text-foreground transition-colors">Mentions légales</Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">Conditions d&apos;utilisation</Link>
        </>
      ) : (
        <>
          <Link href="/legal" className="hover:text-foreground transition-colors">Legal Notice</Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
        </>
      )}
      sections={l => l === 'fr' ? [
        {
          title: '1. Qui sommes-nous',
          content: <p>{appName} est un jeu disponible sur navigateur et mobile à l&apos;adresse <a href={domain} className="underline text-foreground">{domain}</a>. Le service est opéré par Eugène Garcia, basé à Paris, France.</p>,
        },
        {
          title: '2. Données collectées',
          content: <ul className="list-disc list-inside flex flex-col gap-1.5 text-foreground/70">
            <li><strong className="text-foreground">Adresse e-mail</strong> — lors d&apos;une connexion par code OTP.</li>
            <li><strong className="text-foreground">Données Google</strong> (nom, e-mail, avatar) — lors d&apos;une connexion via Google OAuth.</li>
            <li><strong className="text-foreground">Données Discord</strong> (pseudo, e-mail, avatar) — lors d&apos;une connexion via Discord OAuth.</li>
            <li><strong className="text-foreground">Progression de jeu</strong> — éléments découverts, quêtes complétées, pseudo, avatar.</li>
            <li><strong className="text-foreground">Données techniques</strong> — analytics anonymes (pages vues, type d&apos;appareil) via Vercel Analytics. Aucun suivi intersites.</li>
          </ul>,
        },
        {
          title: '3. Finalités du traitement',
          content: <ul className="list-disc list-inside flex flex-col gap-1.5 text-foreground/70">
            <li>Vous authentifier et maintenir votre session.</li>
            <li>Sauvegarder et synchroniser votre progression sur tous vos appareils.</li>
            <li>Afficher votre pseudo et avatar dans le classement (si vous y participez).</li>
            <li>Vous envoyer un code de connexion à usage unique par e-mail (Resend).</li>
            <li>Améliorer le jeu grâce à des analyses d&apos;utilisation anonymes.</li>
          </ul>,
        },
        {
          title: '4. Hébergement & sous-traitants',
          content: <p>Vos données sont stockées dans une base de données PostgreSQL hébergée par <strong className="text-foreground">Neon</strong> (région EU). L&apos;envoi d&apos;e-mails est assuré par <strong className="text-foreground">Resend</strong>. L&apos;application est déployée sur <strong className="text-foreground">Vercel</strong> (US/EU). Tous les prestataires sont conformes au RGPD.</p>,
        },
        {
          title: '5. Durée de conservation',
          content: <p>Vos données sont conservées tant que votre compte est actif. Vous pouvez supprimer votre compte à tout moment depuis l&apos;onglet Réglages — cela efface définitivement toutes vos données personnelles et votre progression. Les codes OTP sont invalidés automatiquement après 10 minutes.</p>,
        },
        {
          title: '6. Vos droits (RGPD)',
          content: <>
            <p>Conformément au RGPD et à la loi Informatique et Libertés, vous disposez des droits suivants :</p>
            <ul className="list-disc list-inside flex flex-col gap-1.5 text-foreground/70">
              <li><strong className="text-foreground">Accès</strong> à vos données personnelles.</li>
              <li><strong className="text-foreground">Rectification</strong> des données inexactes.</li>
              <li><strong className="text-foreground">Effacement</strong> de vos données (« droit à l&apos;oubli »).</li>
              <li><strong className="text-foreground">Portabilité</strong> de vos données.</li>
              <li><strong className="text-foreground">Opposition</strong> au traitement.</li>
            </ul>
            <p>Pour exercer ces droits, contactez-nous à <a href={`mailto:${contact}`} className="underline text-foreground">{contact}</a>.</p>
          </>,
        },
        {
          title: '7. Cookies',
          content: <p>Nous utilisons un unique cookie de session (<code className="bg-muted px-1 py-0.5 rounded text-xs">next-auth.session-token</code>) strictement nécessaire au fonctionnement de l&apos;authentification. Aucun cookie publicitaire ou de suivi tiers n&apos;est utilisé.</p>,
        },
        {
          title: '8. Mineurs',
          content: <p>Le service n&apos;est pas destiné aux enfants de moins de 13 ans. Nous ne collectons pas sciemment de données relatives à des mineurs.</p>,
        },
        {
          title: '9. Ressources tierces',
          content: <p>Certains pictogrammes utilisés dans l&apos;application proviennent du projet <strong className="text-foreground">Twemoji</strong> de Twitter, Inc. et sont utilisés sous licence <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="underline text-foreground">Creative Commons Attribution 4.0 International (CC BY 4.0)</a>. Ces éléments ne sont pas la propriété d&apos;{appName}.</p>,
        },
        {
          title: '10. Contact',
          content: <p>Toute question ou demande : <a href={`mailto:${contact}`} className="underline text-foreground">{contact}</a></p>,
        },
      ] : [
        {
          title: '1. Who we are',
          content: <p>{appName} is a browser and mobile game available at <a href={domain} className="underline text-foreground">{domain}</a>. The service is operated by Eugène Garcia (&ldquo;we&rdquo;, &ldquo;us&rdquo;), based in Paris, France.</p>,
        },
        {
          title: '2. Data we collect',
          content: <ul className="list-disc list-inside flex flex-col gap-1.5 text-foreground/70">
            <li><strong className="text-foreground">Email address</strong> — when you sign in via email OTP.</li>
            <li><strong className="text-foreground">Google account data</strong> (name, email, avatar) — when you sign in via Google OAuth.</li>
            <li><strong className="text-foreground">Discord account data</strong> (username, email, avatar) — when you sign in via Discord OAuth.</li>
            <li><strong className="text-foreground">Game progress</strong> — elements discovered, quests completed, username, avatar.</li>
            <li><strong className="text-foreground">Technical data</strong> — anonymous analytics (page views, device type) via Vercel Analytics. No cross-site tracking.</li>
          </ul>,
        },
        {
          title: '3. Why we collect it',
          content: <ul className="list-disc list-inside flex flex-col gap-1.5 text-foreground/70">
            <li>To authenticate you and maintain your session.</li>
            <li>To save and sync your game progress across devices.</li>
            <li>To display your username and avatar on the leaderboard (if you participate).</li>
            <li>To send you a one-time login code via email (Resend).</li>
            <li>To improve the game through anonymous usage analytics.</li>
          </ul>,
        },
        {
          title: '4. Data storage & processors',
          content: <p>Your data is stored in a PostgreSQL database hosted by <strong className="text-foreground">Neon</strong> (EU region). Email sending is handled by <strong className="text-foreground">Resend</strong>. The app is deployed on <strong className="text-foreground">Vercel</strong> (US/EU). All providers comply with GDPR.</p>,
        },
        {
          title: '5. Data retention',
          content: <p>Your data is kept as long as your account is active. You can delete your account at any time from the Settings tab — this permanently erases all your personal data and game progress. Email OTP codes are automatically invalidated after 10 minutes.</p>,
        },
        {
          title: '6. Your rights (GDPR)',
          content: <>
            <p>Under the GDPR and applicable French law, you have the right to:</p>
            <ul className="list-disc list-inside flex flex-col gap-1.5 text-foreground/70">
              <li><strong className="text-foreground">Access</strong> your personal data.</li>
              <li><strong className="text-foreground">Rectify</strong> inaccurate data.</li>
              <li><strong className="text-foreground">Erase</strong> your data (&ldquo;right to be forgotten&rdquo;).</li>
              <li><strong className="text-foreground">Portability</strong> of your data.</li>
              <li><strong className="text-foreground">Object</strong> to processing.</li>
            </ul>
            <p>To exercise these rights, contact us at <a href={`mailto:${contact}`} className="underline text-foreground">{contact}</a>.</p>
          </>,
        },
        {
          title: '7. Cookies',
          content: <p>We use a single session cookie (<code className="bg-muted px-1 py-0.5 rounded text-xs">next-auth.session-token</code>) strictly necessary for authentication. We do not use advertising or third-party tracking cookies.</p>,
        },
        {
          title: '8. Children',
          content: <p>The service is not directed to children under 13. We do not knowingly collect data from minors.</p>,
        },
        {
          title: '9. Third-party assets',
          content: <p>Some pictograms used in the application come from the <strong className="text-foreground">Twemoji</strong> project by Twitter, Inc. and are used under the <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="underline text-foreground">Creative Commons Attribution 4.0 International (CC BY 4.0)</a> licence. These assets are not the property of {appName}.</p>,
        },
        {
          title: '10. Contact',
          content: <p>Questions or requests: <a href={`mailto:${contact}`} className="underline text-foreground">{contact}</a></p>,
        },
      ]}
    />
  )
}
