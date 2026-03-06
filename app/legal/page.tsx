import type { Metadata } from 'next'
import Link from 'next/link'
import LegalLayout from '@/components/legal-layout'

export const metadata: Metadata = {
  title: 'Mentions légales — Legal Notice | Elementz',
  description: 'Informations légales sur le service Elementz.',
}

const contact = 'contact@elementz.fun'
const domain = 'https://elementz.fun'
const host = 'Vercel Inc., 340 Pine Street, Suite 701, San Francisco, CA 94104, USA'
const db = 'Neon Inc. — PostgreSQL serverless, région EU'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  )
}

export default function LegalPage() {
  return (
    <LegalLayout
      defaultLang="fr"
      titleFr="Mentions légales"
      titleEn="Legal Notice"
      lastUpdatedFr="6 mars 2025"
      lastUpdatedEn="6 March 2025"
      footerFr={<>
        <Link href="/privacy" className="hover:text-foreground transition-colors">Politique de confidentialité</Link>
        <Link href="/terms" className="hover:text-foreground transition-colors">Conditions d&apos;utilisation</Link>
      </>}
      footerEn={<>
        <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
        <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
      </>}
      contentFr={<>
        <Section title="Éditeur du service">
          <p>
            <strong className="text-foreground">Elementz</strong> est un service édité par :<br />
            Eugène Garcia<br />
            Paris, France<br />
            Contact : <a href={`mailto:${contact}`} className="underline text-foreground">{contact}</a>
          </p>
        </Section>
        <Section title="Directeur de la publication">
          <p>Eugène Garcia</p>
        </Section>
        <Section title="Hébergement">
          <p>Le site <a href={domain} className="underline text-foreground">{domain}</a> est hébergé par :</p>
          <p className="text-foreground/70">{host}</p>
          <p>Base de données : <span className="text-foreground/70">{db}</span></p>
        </Section>
        <Section title="Propriété intellectuelle">
          <p>L&apos;ensemble du contenu du site (design, textes, code) est la propriété exclusive d&apos;Eugène Garcia, sauf mention contraire. Toute reproduction, même partielle, est interdite sans autorisation préalable.</p>
          <p>Certains pictogrammes utilisés dans l&apos;application proviennent du projet <strong className="text-foreground">Twemoji</strong> de Twitter, Inc. et sont utilisés sous licence <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="underline text-foreground">Creative Commons Attribution 4.0 International (CC BY 4.0)</a>. Ces éléments ne sont pas la propriété d&apos;Elementz.</p>
        </Section>
        <Section title="Données personnelles">
          <p>Le traitement des données est décrit dans la <Link href="/privacy" className="underline text-foreground">Politique de confidentialité</Link>. Contact DPO : <a href={`mailto:${contact}`} className="underline text-foreground">{contact}</a></p>
        </Section>
        <Section title="Cookies">
          <p>Ce site utilise uniquement un cookie de session strictement nécessaire à l&apos;authentification. Aucun cookie publicitaire ou de suivi tiers n&apos;est utilisé.</p>
        </Section>
        <Section title="Loi applicable">
          <p>Les présentes mentions légales sont soumises au droit français. Tout litige sera porté devant les tribunaux compétents français.</p>
        </Section>
      </>}
      contentEn={<>
        <Section title="Publisher">
          <p>
            <strong className="text-foreground">Elementz</strong> is a service published by:<br />
            Eugène Garcia<br />
            Paris, France<br />
            Contact: <a href={`mailto:${contact}`} className="underline text-foreground">{contact}</a>
          </p>
        </Section>
        <Section title="Publication director">
          <p>Eugène Garcia</p>
        </Section>
        <Section title="Hosting">
          <p>The website <a href={domain} className="underline text-foreground">{domain}</a> is hosted by:</p>
          <p className="text-foreground/70">{host}</p>
          <p>Database: <span className="text-foreground/70">Neon Inc. — PostgreSQL serverless, EU region</span></p>
        </Section>
        <Section title="Intellectual property">
          <p>All content on this site (design, text, code) is the exclusive property of Eugène Garcia. Any reproduction is prohibited without prior authorisation.</p>
          <p>Some pictograms come from the <strong className="text-foreground">Twemoji</strong> project by Twitter, Inc., used under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="underline text-foreground">CC BY 4.0</a>. These assets are not the property of Elementz.</p>
        </Section>
        <Section title="Personal data">
          <p>Data processing is described in the <Link href="/privacy" className="underline text-foreground">Privacy Policy</Link>. DPO contact: <a href={`mailto:${contact}`} className="underline text-foreground">{contact}</a></p>
        </Section>
        <Section title="Cookies">
          <p>This site uses only a single session cookie strictly necessary for authentication. No advertising or third-party tracking cookies are used.</p>
        </Section>
        <Section title="Governing law">
          <p>These legal notices are governed by French law. Any dispute shall be brought before the competent French courts.</p>
        </Section>
      </>}
    />
  )
}
