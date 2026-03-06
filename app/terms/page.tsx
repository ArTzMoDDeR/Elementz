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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  )
}

export default function TermsPage() {
  return (
    <LegalLayout
      defaultLang="fr"
      titleFr="Conditions d'utilisation"
      titleEn="Terms of Service"
      lastUpdatedFr="6 mars 2025"
      lastUpdatedEn="6 March 2025"
      footerFr={<>
        <Link href="/privacy" className="hover:text-foreground transition-colors">Politique de confidentialité</Link>
        <Link href="/legal" className="hover:text-foreground transition-colors">Mentions légales</Link>
      </>}
      footerEn={<>
        <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
        <Link href="/legal" className="hover:text-foreground transition-colors">Legal Notice</Link>
      </>}
      contentFr={<>
        <Section title="1. Acceptation">
          <p>En accédant à <strong className="text-foreground">{appName}</strong> sur <a href={domain} className="underline text-foreground">{domain}</a>, vous acceptez les présentes conditions. Si vous n&apos;acceptez pas, veuillez ne pas utiliser le service.</p>
        </Section>
        <Section title="2. Description du service">
          <p>{appName} est un jeu d&apos;alchimie gratuit dans lequel les joueurs combinent des éléments pour en découvrir de nouveaux. Le service est fourni « en l&apos;état », sans garantie d&apos;aucune sorte.</p>
        </Section>
        <Section title="3. Comptes">
          <ul className="list-disc list-inside flex flex-col gap-1.5 text-foreground/70">
            <li>Vous devez fournir des informations exactes lors de la création d&apos;un compte.</li>
            <li>Vous êtes responsable de la sécurité de votre compte.</li>
            <li>Un compte par personne. Les comptes multiples visant à fausser le classement sont interdits.</li>
            <li>Vous pouvez supprimer votre compte à tout moment depuis l&apos;onglet Réglages.</li>
          </ul>
        </Section>
        <Section title="4. Utilisation acceptable">
          <p>Vous vous engagez à ne pas :</p>
          <ul className="list-disc list-inside flex flex-col gap-1.5 text-foreground/70">
            <li>Utiliser des bots, scripts ou triche pour obtenir un avantage déloyal.</li>
            <li>Tenter de décompiler ou extraire massivement les données du jeu.</li>
            <li>Utiliser un pseudo ou avatar offensant, haineux ou illégal.</li>
            <li>Exploiter des failles — signalez-les à <a href={`mailto:${contact}`} className="underline text-foreground">{contact}</a>.</li>
            <li>Tenter d&apos;accéder sans autorisation à la base de données ou aux données d&apos;autres utilisateurs.</li>
          </ul>
        </Section>
        <Section title="5. Propriété intellectuelle">
          <p>Tout le contenu, le design et le code sont la propriété exclusive d&apos;Eugène Garcia, basé à Paris, France. Vous bénéficiez d&apos;une licence personnelle et non transférable pour utiliser le service à des fins personnelles.</p>
          <p>Certains pictogrammes proviennent du projet <strong className="text-foreground">Twemoji</strong> de Twitter, Inc. et sont utilisés sous licence <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="underline text-foreground">Creative Commons Attribution 4.0 International (CC BY 4.0)</a>. Ces éléments ne sont pas la propriété d&apos;{appName}.</p>
        </Section>
        <Section title="6. Résiliation">
          <p>Nous nous réservons le droit de suspendre ou résilier les comptes qui enfreignent ces conditions. Vous pouvez résilier votre compte à tout moment depuis l&apos;onglet Réglages.</p>
        </Section>
        <Section title="7. Exclusion de garanties">
          <p>Le service est fourni « en l&apos;état » sans garantie, notamment en ce qui concerne la disponibilité ou l&apos;exactitude. Nous ne garantissons pas un fonctionnement continu ou sans erreur.</p>
        </Section>
        <Section title="8. Limitation de responsabilité">
          <p>Dans toute la mesure permise par la loi, Eugène Garcia ne saurait être tenu responsable des dommages indirects ou consécutifs, y compris la perte de progression de jeu.</p>
        </Section>
        <Section title="9. Modifications">
          <p>Nous pouvons mettre à jour ces conditions à tout moment. La poursuite de l&apos;utilisation vaut acceptation. La date de mise à jour est indiquée en haut de cette page.</p>
        </Section>
        <Section title="10. Droit applicable">
          <p>Ces conditions sont régies par le droit français. Tout litige sera soumis aux tribunaux compétents français.</p>
        </Section>
        <Section title="11. Contact">
          <p><a href={`mailto:${contact}`} className="underline text-foreground">{contact}</a></p>
        </Section>
      </>}
      contentEn={<>
        <Section title="1. Acceptance">
          <p>By accessing <strong className="text-foreground">{appName}</strong> at <a href={domain} className="underline text-foreground">{domain}</a>, you agree to these Terms. If you do not agree, do not use the service.</p>
        </Section>
        <Section title="2. Description of the service">
          <p>{appName} is a free alchemy game in which players combine elements to discover new ones. The service is provided &ldquo;as is&rdquo; without warranty of any kind.</p>
        </Section>
        <Section title="3. Accounts">
          <ul className="list-disc list-inside flex flex-col gap-1.5 text-foreground/70">
            <li>You must provide accurate information when creating an account.</li>
            <li>You are responsible for maintaining the security of your account.</li>
            <li>One account per person. Multiple accounts to gain leaderboard advantage are prohibited.</li>
            <li>You can delete your account at any time from the Settings tab.</li>
          </ul>
        </Section>
        <Section title="4. Acceptable use">
          <p>You agree not to:</p>
          <ul className="list-disc list-inside flex flex-col gap-1.5 text-foreground/70">
            <li>Use bots, scripts, or cheats to gain an unfair advantage.</li>
            <li>Attempt to reverse-engineer or extract game data in bulk.</li>
            <li>Use offensive, hateful, or illegal content as your username or avatar.</li>
            <li>Exploit bugs — please report them to <a href={`mailto:${contact}`} className="underline text-foreground">{contact}</a> instead.</li>
            <li>Attempt unauthorised access to the database or other users&apos; data.</li>
          </ul>
        </Section>
        <Section title="5. Intellectual property">
          <p>All game content, design, and code are the exclusive property of Eugène Garcia, based in Paris, France. You are granted a personal, non-transferable licence to use the service for personal entertainment.</p>
          <p>Some pictograms come from the <strong className="text-foreground">Twemoji</strong> project by Twitter, Inc., used under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="underline text-foreground">CC BY 4.0</a>. These assets are not the property of {appName}.</p>
        </Section>
        <Section title="6. Termination">
          <p>We reserve the right to suspend or terminate accounts that violate these Terms. You may terminate your account at any time from the Settings tab.</p>
        </Section>
        <Section title="7. Disclaimer of warranties">
          <p>The service is provided &ldquo;as is&rdquo; without warranties of any kind. We do not guarantee uninterrupted or error-free operation.</p>
        </Section>
        <Section title="8. Limitation of liability">
          <p>To the fullest extent permitted by law, Eugène Garcia shall not be liable for indirect or consequential damages, including loss of game progress.</p>
        </Section>
        <Section title="9. Changes to these terms">
          <p>We may update these Terms at any time. Continued use constitutes acceptance. The date of last update is shown at the top of this page.</p>
        </Section>
        <Section title="10. Governing law">
          <p>These Terms are governed by French law. Any dispute shall be subject to the exclusive jurisdiction of the competent French courts.</p>
        </Section>
        <Section title="11. Contact">
          <p><a href={`mailto:${contact}`} className="underline text-foreground">{contact}</a></p>
        </Section>
      </>}
    />
  )
}
