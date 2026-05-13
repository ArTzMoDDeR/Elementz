import type { Metadata } from 'next'
import Link from 'next/link'
import LegalLayout from '@/components/legal-layout'

export const metadata: Metadata = {
  title: 'À propos — About | Elementz',
  description: 'Elementz est un jeu d\'alchimie gratuit sur navigateur. Combine des éléments pour en découvrir de nouveaux.',
}

const contact = 'contact@elementz.fun'
const domain = 'https://elementz.fun'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  )
}

export default function AboutPage() {
  return (
    <LegalLayout
      defaultLang="fr"
      titleFr="À propos d'Elementz"
      titleEn="About Elementz"
      lastUpdatedFr="13 mai 2026"
      lastUpdatedEn="13 May 2026"
      footerFr={<>
        <Link href="/privacy" className="hover:text-foreground transition-colors">Politique de confidentialité</Link>
        <Link href="/terms" className="hover:text-foreground transition-colors">Conditions d&apos;utilisation</Link>
        <Link href="/legal" className="hover:text-foreground transition-colors">Mentions légales</Link>
      </>}
      footerEn={<>
        <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
        <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
        <Link href="/legal" className="hover:text-foreground transition-colors">Legal Notice</Link>
      </>}
      contentFr={<>
        <Section title="Qu'est-ce qu'Elementz ?">
          <p>
            <strong className="text-foreground">Elementz</strong> est un jeu d&apos;alchimie gratuit jouable directement dans le navigateur, sur mobile et desktop. Le principe est simple : combine deux éléments pour en créer un nouveau, et explore le plus grand nombre de découvertes possible.
          </p>
          <p>
            Tout commence avec quatre éléments fondamentaux — feu, eau, air, terre — et à partir de là, les combinaisons s&apos;enchaînent jusqu&apos;à des centaines d&apos;éléments secrets à débloquer.
          </p>
        </Section>

        <Section title="Fonctionnalités">
          <ul className="list-disc list-inside flex flex-col gap-1.5 text-foreground/70">
            <li><strong className="text-foreground">Recettes infinies</strong> — des centaines d&apos;éléments à découvrir, du plus simple au plus inattendu.</li>
            <li><strong className="text-foreground">Classement mondial</strong> — compare ta progression avec celle des autres joueurs.</li>
            <li><strong className="text-foreground">Synchronisation multi-appareils</strong> — connecte-toi et retrouve ta progression partout.</li>
            <li><strong className="text-foreground">Mode sombre</strong> — jouez confortablement, de jour comme de nuit.</li>
            <li><strong className="text-foreground">Codex</strong> — retrouve tous les éléments découverts et leurs recettes.</li>
            <li><strong className="text-foreground">Indices</strong> — débloquez des hints pour avancer quand vous êtes bloqué.</li>
          </ul>
        </Section>

        <Section title="Qui a créé Elementz ?">
          <p>
            Elementz a été créé par <strong className="text-foreground">Eugène Garcia</strong>, développeur indépendant basé à Paris, France. Le projet est né de la passion pour les jeux de puzzle et l&apos;exploration.
          </p>
          <p>
            Contact : <a href={`mailto:${contact}`} className="underline text-foreground">{contact}</a>
          </p>
        </Section>

        <Section title="Technologies utilisées">
          <ul className="list-disc list-inside flex flex-col gap-1.5 text-foreground/70">
            <li><strong className="text-foreground">Next.js</strong> — framework React pour le rendu serveur et client.</li>
            <li><strong className="text-foreground">Neon</strong> — base de données PostgreSQL serverless (région EU).</li>
            <li><strong className="text-foreground">Vercel</strong> — hébergement et déploiement continu.</li>
            <li><strong className="text-foreground">Auth.js</strong> — authentification sécurisée (Google, Discord, email OTP).</li>
          </ul>
        </Section>

        <Section title="Contact & retours">
          <p>
            Une suggestion, un bug, une combinaison manquante ? Écris-nous à <a href={`mailto:${contact}`} className="underline text-foreground">{contact}</a> — les retours des joueurs sont précieux.
          </p>
        </Section>
      </>}
      contentEn={<>
        <Section title="What is Elementz?">
          <p>
            <strong className="text-foreground">Elementz</strong> is a free alchemy game playable directly in the browser, on mobile and desktop. The concept is simple: combine two elements to create a new one, and discover as many combinations as possible.
          </p>
          <p>
            Everything starts with four fundamental elements — fire, water, air, earth — and from there, combinations multiply into hundreds of secret elements to unlock.
          </p>
        </Section>

        <Section title="Features">
          <ul className="list-disc list-inside flex flex-col gap-1.5 text-foreground/70">
            <li><strong className="text-foreground">Endless recipes</strong> — hundreds of elements to discover, from the simplest to the most unexpected.</li>
            <li><strong className="text-foreground">Global leaderboard</strong> — compare your progress with other players worldwide.</li>
            <li><strong className="text-foreground">Multi-device sync</strong> — sign in and find your progress on any device.</li>
            <li><strong className="text-foreground">Dark mode</strong> — play comfortably day or night.</li>
            <li><strong className="text-foreground">Codex</strong> — browse all discovered elements and their recipes.</li>
            <li><strong className="text-foreground">Hints</strong> — unlock hints to move forward when you&apos;re stuck.</li>
          </ul>
        </Section>

        <Section title="Who made Elementz?">
          <p>
            Elementz was created by <strong className="text-foreground">Eugène Garcia</strong>, an independent developer based in Paris, France. The project was born from a passion for puzzle games and exploration.
          </p>
          <p>
            Contact: <a href={`mailto:${contact}`} className="underline text-foreground">{contact}</a>
          </p>
        </Section>

        <Section title="Technologies">
          <ul className="list-disc list-inside flex flex-col gap-1.5 text-foreground/70">
            <li><strong className="text-foreground">Next.js</strong> — React framework for server and client rendering.</li>
            <li><strong className="text-foreground">Neon</strong> — serverless PostgreSQL database (EU region).</li>
            <li><strong className="text-foreground">Vercel</strong> — hosting and continuous deployment.</li>
            <li><strong className="text-foreground">Auth.js</strong> — secure authentication (Google, Discord, email OTP).</li>
          </ul>
        </Section>

        <Section title="Contact & feedback">
          <p>
            A suggestion, a bug, a missing combination? Write to us at <a href={`mailto:${contact}`} className="underline text-foreground">{contact}</a> — player feedback is invaluable.
          </p>
        </Section>
      </>}
    />
  )
}
