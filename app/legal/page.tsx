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
const db = 'Neon Inc. (Neon Technologies) — PostgreSQL serverless, EU region'

export default function LegalPage() {
  return (
    <LegalLayout
      defaultLang="fr"
      title={l => l === 'fr' ? 'Mentions légales' : 'Legal Notice'}
      lastUpdated={l => l === 'fr' ? '6 mars 2025' : '6 March 2025'}
      footer={l => l === 'fr' ? (
        <>
          <Link href="/privacy" className="hover:text-foreground transition-colors">Politique de confidentialité</Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">Conditions d&apos;utilisation</Link>
        </>
      ) : (
        <>
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
        </>
      )}
      sections={l => l === 'fr' ? [
        {
          title: 'Éditeur du service',
          content: <p>
            <strong className="text-foreground">Elementz</strong> est un service édité par :<br />
            Eugène Garcia<br />
            Paris, France<br />
            Contact : <a href={`mailto:${contact}`} className="underline text-foreground">{contact}</a>
          </p>,
        },
        {
          title: 'Directeur de la publication',
          content: <p>Eugène Garcia</p>,
        },
        {
          title: 'Hébergement',
          content: <>
            <p>Le site <a href={domain} className="underline text-foreground">{domain}</a> est hébergé par :</p>
            <p className="text-foreground/70">{host}</p>
            <p className="mt-1">Base de données :</p>
            <p className="text-foreground/70">{db}</p>
          </>,
        },
        {
          title: 'Propriété intellectuelle',
          content: <>
            <p>L&apos;ensemble du contenu du site (design, textes, code) est la propriété exclusive d&apos;Eugène Garcia, sauf mention contraire. Toute reproduction, même partielle, est interdite sans autorisation préalable.</p>
            <p>Certains pictogrammes utilisés dans l&apos;application proviennent du projet <strong className="text-foreground">Twemoji</strong> de Twitter, Inc. et sont utilisés sous licence <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="underline text-foreground">Creative Commons Attribution 4.0 International (CC BY 4.0)</a>. Ces éléments ne sont pas la propriété d&apos;Elementz.</p>
          </>,
        },
        {
          title: 'Données personnelles',
          content: <>
            <p>Le traitement des données personnelles est décrit dans la <Link href="/privacy" className="underline text-foreground">Politique de confidentialité</Link>. Conformément à la loi Informatique et Libertés et au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification et de suppression de vos données.</p>
            <p>Contact DPO : <a href={`mailto:${contact}`} className="underline text-foreground">{contact}</a></p>
          </>,
        },
        {
          title: 'Cookies',
          content: <p>Ce site utilise uniquement un cookie de session strictement nécessaire au fonctionnement du service d&apos;authentification. Aucun cookie publicitaire ou de suivi tiers n&apos;est utilisé.</p>,
        },
        {
          title: 'Loi applicable',
          content: <p>Les présentes mentions légales sont soumises au droit français. Tout litige relatif à l&apos;utilisation du site sera porté devant les tribunaux compétents français.</p>,
        },
      ] : [
        {
          title: 'Publisher',
          content: <p>
            <strong className="text-foreground">Elementz</strong> is a service published by:<br />
            Eugène Garcia<br />
            Paris, France<br />
            Contact: <a href={`mailto:${contact}`} className="underline text-foreground">{contact}</a>
          </p>,
        },
        {
          title: 'Publication director',
          content: <p>Eugène Garcia</p>,
        },
        {
          title: 'Hosting',
          content: <>
            <p>The website <a href={domain} className="underline text-foreground">{domain}</a> is hosted by:</p>
            <p className="text-foreground/70">{host}</p>
            <p className="mt-1">Database:</p>
            <p className="text-foreground/70">{db}</p>
          </>,
        },
        {
          title: 'Intellectual property',
          content: <>
            <p>All content on this site (design, text, code) is the exclusive property of Eugène Garcia, unless otherwise stated. Any reproduction, even partial, is prohibited without prior authorisation.</p>
            <p>Some pictograms used in the application come from the <strong className="text-foreground">Twemoji</strong> project by Twitter, Inc. and are used under the <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="underline text-foreground">Creative Commons Attribution 4.0 International (CC BY 4.0)</a> licence. These assets are not the property of Elementz.</p>
          </>,
        },
        {
          title: 'Personal data',
          content: <>
            <p>The processing of personal data is described in the <Link href="/privacy" className="underline text-foreground">Privacy Policy</Link>. In accordance with French data protection law and the GDPR, you have the right to access, rectify, and delete your data.</p>
            <p>DPO contact: <a href={`mailto:${contact}`} className="underline text-foreground">{contact}</a></p>
          </>,
        },
        {
          title: 'Cookies',
          content: <p>This site uses only a single session cookie strictly necessary for the authentication service. No advertising or third-party tracking cookies are used.</p>,
        },
        {
          title: 'Governing law',
          content: <p>These legal notices are governed by French law. Any dispute relating to the use of the site shall be brought before the competent French courts.</p>,
        },
      ]}
    />
  )
}
