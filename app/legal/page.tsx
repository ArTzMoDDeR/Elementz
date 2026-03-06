import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Mentions légales',
  description: 'Informations légales sur le service Elementz.',
}

export default function LegalPage() {
  const lastUpdated = '6 Mars 2025'
  const contact = 'contact@elementz.fun'
  const domain = 'https://elementz.fun'
  const host = 'Vercel Inc., 340 Pine Street, Suite 701, San Francisco, CA 94104, USA'
  const db = 'Neon Inc. (Neon Technologies) — PostgreSQL serverless, EU region'

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Elementz
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">Mentions légales</h1>
        <p className="text-sm text-muted-foreground mb-10">Dernière mise à jour : {lastUpdated}</p>

        <div className="flex flex-col gap-8 text-sm leading-relaxed text-foreground/80">

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">Éditeur du service</h2>
            <p>
              <strong className="text-foreground">Elementz</strong> est un service édité par :<br />
              Eugène Garcia<br />
              France<br />
              Contact : <a href={`mailto:${contact}`} className="underline text-foreground">{contact}</a>
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">Directeur de la publication</h2>
            <p>Eugène Garcia</p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">Hébergement</h2>
            <p>Le site <a href={domain} className="underline text-foreground">{domain}</a> est hébergé par :</p>
            <p className="text-foreground/70">{host}</p>
            <p className="mt-1">Base de données :</p>
            <p className="text-foreground/70">{db}</p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">Propriété intellectuelle</h2>
            <p>L&apos;ensemble du contenu du site (design, textes, images, code) est la propriété exclusive d&apos;Eugène Garcia, sauf mention contraire. Toute reproduction, même partielle, est interdite sans autorisation préalable.</p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">Données personnelles</h2>
            <p>Le traitement des données personnelles est décrit dans la <Link href="/privacy" className="underline text-foreground">Politique de confidentialité</Link>. Conformément à la loi Informatique et Libertés et au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification et de suppression de vos données.</p>
            <p>Contact DPO : <a href={`mailto:${contact}`} className="underline text-foreground">{contact}</a></p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">Cookies</h2>
            <p>Ce site utilise uniquement un cookie de session strictement nécessaire au fonctionnement du service d&apos;authentification. Aucun cookie publicitaire ou de suivi tiers n&apos;est utilisé.</p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">Loi applicable</h2>
            <p>Les présentes mentions légales sont soumises au droit français. Tout litige relatif à l&apos;utilisation du site sera porté devant les tribunaux compétents français.</p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-border flex gap-4 text-xs text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground transition-colors">Politique de confidentialité</Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">Conditions d&apos;utilisation</Link>
        </div>
      </div>
    </main>
  )
}
