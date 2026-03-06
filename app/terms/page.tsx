import type { Metadata } from 'next'
import Link from 'next/link'
import LegalLayout from '@/components/legal-layout'

export const metadata: Metadata = {
  title: "Terms of Service — Conditions d'utilisation | Elementz",
  description: 'Terms and conditions governing the use of Elementz.',
}

const contact = 'contact@elementz.fun'
const appName = 'Elementz'
const domain = 'https://elementz.fun'

export default function TermsPage() {
  return (
    <LegalLayout
      defaultLang="fr"
      title={l => l === 'fr' ? "Conditions d'utilisation" : 'Terms of Service'}
      lastUpdated={l => l === 'fr' ? '6 mars 2025' : '6 March 2025'}
      footer={l => l === 'fr' ? (
        <>
          <Link href="/privacy" className="hover:text-foreground transition-colors">Politique de confidentialité</Link>
          <Link href="/legal" className="hover:text-foreground transition-colors">Mentions légales</Link>
        </>
      ) : (
        <>
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link href="/legal" className="hover:text-foreground transition-colors">Legal Notice</Link>
        </>
      )}
      sections={l => l === 'fr' ? [
        {
          title: '1. Acceptation',
          content: <p>En accédant ou en utilisant <strong className="text-foreground">{appName}</strong> sur <a href={domain} className="underline text-foreground">{domain}</a>, vous acceptez les présentes conditions. Si vous n&apos;acceptez pas, veuillez ne pas utiliser le service.</p>,
        },
        {
          title: '2. Description du service',
          content: <p>{appName} est un jeu d&apos;alchimie gratuit, disponible sur navigateur et mobile, dans lequel les joueurs combinent des éléments pour en découvrir de nouveaux. Le service est fourni « en l&apos;état », sans garantie d&apos;aucune sorte.</p>,
        },
        {
          title: '3. Comptes',
          content: <ul className="list-disc list-inside flex flex-col gap-1.5 text-foreground/70">
            <li>Vous devez fournir des informations exactes lors de la création d&apos;un compte.</li>
            <li>Vous êtes responsable de la sécurité de votre compte.</li>
            <li>Un compte par personne. Les comptes multiples visant à fausser le classement sont interdits.</li>
            <li>Vous pouvez supprimer votre compte à tout moment depuis l&apos;onglet Réglages.</li>
          </ul>,
        },
        {
          title: '4. Utilisation acceptable',
          content: <>
            <p>Vous vous engagez à ne pas :</p>
            <ul className="list-disc list-inside flex flex-col gap-1.5 text-foreground/70">
              <li>Utiliser des outils automatisés, bots, scripts ou triche pour obtenir un avantage déloyal.</li>
              <li>Tenter de décompiler, rétro-ingénierer ou extraire massivement les données du jeu.</li>
              <li>Utiliser un pseudo ou avatar offensant, haineux ou illégal.</li>
              <li>Exploiter des bugs ou failles — signalez-les plutôt à <a href={`mailto:${contact}`} className="underline text-foreground">{contact}</a>.</li>
              <li>Tenter d&apos;accéder sans autorisation à la base de données ou aux données d&apos;autres utilisateurs.</li>
            </ul>
          </>,
        },
        {
          title: '5. Propriété intellectuelle',
          content: <>
            <p>Tout le contenu, le design et le code du jeu sont la propriété exclusive d&apos;Eugène Garcia, basé à Paris, France. Vous bénéficiez d&apos;une licence personnelle, non transférable et non exclusive pour utiliser le service à des fins personnelles. Toute reproduction ou distribution est interdite sans autorisation écrite préalable.</p>
            <p>Certains pictogrammes utilisés dans l&apos;application proviennent du projet <strong className="text-foreground">Twemoji</strong> de Twitter, Inc. et sont utilisés sous licence <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="underline text-foreground">Creative Commons Attribution 4.0 International (CC BY 4.0)</a>. Ces éléments ne sont pas la propriété d&apos;{appName}.</p>
          </>,
        },
        {
          title: '6. Résiliation',
          content: <p>Nous nous réservons le droit de suspendre ou de résilier les comptes qui enfreignent ces conditions, sans préavis. Vous pouvez résilier votre compte à tout moment depuis l&apos;onglet Réglages.</p>,
        },
        {
          title: '7. Exclusion de garanties',
          content: <p>Le service est fourni « en l&apos;état » et « tel que disponible », sans garantie d&apos;aucune sorte, expresse ou implicite, notamment en ce qui concerne la disponibilité, l&apos;exactitude ou l&apos;adéquation à un usage particulier. Nous ne garantissons pas un fonctionnement continu ou sans erreur.</p>,
        },
        {
          title: '8. Limitation de responsabilité',
          content: <p>Dans toute la mesure permise par la loi, Eugène Garcia ne saurait être tenu responsable des dommages indirects, accessoires ou consécutifs résultant de l&apos;utilisation ou de l&apos;impossibilité d&apos;utiliser le service, y compris la perte de progression ou de données de jeu.</p>,
        },
        {
          title: '9. Modifications',
          content: <p>Nous pouvons mettre à jour ces conditions à tout moment. La poursuite de l&apos;utilisation du service après modification vaut acceptation. La date de dernière mise à jour est indiquée en haut de cette page.</p>,
        },
        {
          title: '10. Droit applicable',
          content: <p>Les présentes conditions sont régies par le droit français. Tout litige découlant de l&apos;utilisation du service sera soumis à la compétence exclusive des tribunaux français.</p>,
        },
        {
          title: '11. Contact',
          content: <p><a href={`mailto:${contact}`} className="underline text-foreground">{contact}</a></p>,
        },
      ] : [
        {
          title: '1. Acceptance',
          content: <p>By accessing or using <strong className="text-foreground">{appName}</strong> at <a href={domain} className="underline text-foreground">{domain}</a>, you agree to be bound by these Terms of Service. If you do not agree, do not use the service.</p>,
        },
        {
          title: '2. Description of the service',
          content: <p>{appName} is a free browser and mobile alchemy game in which players combine elements to discover new ones. The service is provided &ldquo;as is&rdquo; without warranty of any kind.</p>,
        },
        {
          title: '3. Accounts',
          content: <ul className="list-disc list-inside flex flex-col gap-1.5 text-foreground/70">
            <li>You must provide accurate information when creating an account.</li>
            <li>You are responsible for maintaining the security of your account.</li>
            <li>One account per person. Multiple accounts for the purpose of gaining unfair leaderboard advantage are prohibited.</li>
            <li>You can delete your account at any time from the Settings tab.</li>
          </ul>,
        },
        {
          title: '4. Acceptable use',
          content: <>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside flex flex-col gap-1.5 text-foreground/70">
              <li>Use automated tools, bots, scripts, or cheats to gain an unfair advantage.</li>
              <li>Attempt to reverse-engineer, decompile, or extract game data in bulk.</li>
              <li>Upload or use offensive, hateful, or illegal content as your username or avatar.</li>
              <li>Exploit bugs or vulnerabilities — please report them to <a href={`mailto:${contact}`} className="underline text-foreground">{contact}</a> instead.</li>
              <li>Attempt to gain unauthorised access to the database or other users&apos; data.</li>
            </ul>
          </>,
        },
        {
          title: '5. Intellectual property',
          content: <>
            <p>All game content, design, and code are the exclusive property of Eugène Garcia, based in Paris, France. You are granted a personal, non-transferable, non-exclusive licence to use the service for personal entertainment. You may not reproduce or distribute any part of the service without prior written permission.</p>
            <p>Some pictograms used in the application come from the <strong className="text-foreground">Twemoji</strong> project by Twitter, Inc. and are used under the <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="underline text-foreground">Creative Commons Attribution 4.0 International (CC BY 4.0)</a> licence. These assets are not the property of {appName}.</p>
          </>,
        },
        {
          title: '6. Termination',
          content: <p>We reserve the right to suspend or terminate accounts that violate these Terms, without prior notice. You may terminate your account at any time from the Settings tab.</p>,
        },
        {
          title: '7. Disclaimer of warranties',
          content: <p>The service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind, express or implied, including but not limited to availability, accuracy, or fitness for a particular purpose. We do not guarantee uninterrupted or error-free operation.</p>,
        },
        {
          title: '8. Limitation of liability',
          content: <p>To the fullest extent permitted by law, Eugène Garcia shall not be liable for any indirect, incidental, or consequential damages arising from the use of or inability to use the service, including loss of progress or game data.</p>,
        },
        {
          title: '9. Changes to these terms',
          content: <p>We may update these Terms at any time. Continued use of the service after changes constitutes acceptance. We will indicate the date of the last update at the top of this page.</p>,
        },
        {
          title: '10. Governing law',
          content: <p>These Terms are governed by French law. Any dispute arising from the use of the service shall be subject to the exclusive jurisdiction of the competent French courts.</p>,
        },
        {
          title: '11. Contact',
          content: <p><a href={`mailto:${contact}`} className="underline text-foreground">{contact}</a></p>,
        },
      ]}
    />
  )
}
