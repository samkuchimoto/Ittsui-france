// /app/conditions-utilisation/page.tsx
// Plain-language terms of use — like /confidentialite, this describes
// what using Ittsui actually involves today, not a law firm's final
// text. Written because Google's own Unwanted Software Policy requires
// a Terms of Service/EULA link (confirmed 2026-08-24 by reading that
// policy directly, not assumed), and because none existed anywhere in
// this app despite /confidentialite and /mentions-legales already
// covering the two other legally-relevant angles (data practices,
// publisher identity). This page is the third leg: the actual rules of
// using the product. Have this reviewed by a real lawyer before treating
// it as final/binding — same caveat this codebase already applies to
// every other legal-adjacent page, not a new exception for this one.

import { Fraunces, Work_Sans } from "next/font/google";
import Link from "next/link";
import { INK, MUTED, ACCENT, BORDER } from "@/lib/theme";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

function Item({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t py-6" style={{ borderColor: BORDER }}>
      <h2 className="text-lg" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
        {title}
      </h2>
      <div className="mt-2 text-[15px] leading-relaxed" style={{ color: MUTED }}>
        {children}
      </div>
    </div>
  );
}

export default function ConditionsUtilisationPage() {
  return (
    <main
      className={`${fraunces.variable} ${workSans.variable} min-h-screen bg-[#FFFDF9] antialiased`}
      style={{ color: INK }}
    >
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link href="/" className="text-sm" style={{ color: MUTED }}>
          ← Retour
        </Link>

        <h1 className="mt-6" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "2rem" }}>
          Conditions d&apos;utilisation
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed" style={{ color: MUTED }}>
          Les règles d&apos;utilisation d&apos;Ittsui, en clair. Ceci décrit ce que fait réellement
          l&apos;application aujourd&apos;hui — ce n&apos;est pas un document juridique définitif.
        </p>

        <div className="mt-8">
          <Item title="Ce qu'est Ittsui">
            <p>
              Ittsui est un outil pour maintenir un rendez-vous régulier avec une personne proche
              (partenaire, ami·e, membre de la famille), et pour proposer ponctuellement un rendez-vous à
              l&apos;un de vos contacts. Ce n&apos;est ni une messagerie, ni un réseau social, ni une
              application de rencontre.
            </p>
          </Item>
          <Item title="Qui peut utiliser Ittsui">
            <p>
              Ittsui est destiné à un usage adulte et n&apos;est pas conçu pour les enfants. À défaut d&apos;un
              seuil légal spécifique confirmé pour votre situation, nous retenons par défaut un âge minimum
              de 16 ans, cohérent avec le seuil du RGPD — à faire valider si besoin.
            </p>
          </Item>
          <Item title="Votre compte">
            <p>
              Vous vous connectez avec votre compte Google, ou avec une clé d&apos;accès (passkey) associée
              à un compte déjà créé via Google. Vous êtes responsable de la sécurité de ce compte. Si vous
              pensez qu&apos;il a été compromis, écrivez-nous immédiatement à{" "}
              <a href="mailto:hello@ittsui.fr" style={{ color: ACCENT }}>
                hello@ittsui.fr
              </a>
              .
            </p>
          </Item>
          <Item title="Inviter et proposer un rendez-vous à quelqu'un">
            <p>
              Ittsui vous permet d&apos;envoyer une invitation ou une demande de rendez-vous par e-mail à une
              personne de votre choix, même si elle n&apos;a pas encore de compte. Vous vous engagez à
              n&apos;utiliser cette fonctionnalité que pour des personnes réelles que vous connaissez et qui
              s&apos;attendent raisonnablement à recevoir ce message de votre part — jamais pour du démarchage,
              du harcèlement, ou l&apos;envoi de messages à des personnes qui ne le souhaitent pas. La personne
              invitée peut décliner sans créer de compte, et voir la donnée la concernant supprimée
              immédiatement.
            </p>
          </Item>
          <Item title="Ce que nous fournissons, et ce que nous ne garantissons pas">
            <p>
              Le rituel hebdomadaire de base est gratuit, pour toujours. Ittsui Plus (suggestions
              enrichies, options supplémentaires) arrivera plus tard à partir de 2,99&nbsp;€/mois — ces
              conditions-ci seront mises à jour avec les modalités précises avant que cette offre ne soit
              activée. Ittsui propose des lieux et des créneaux à titre indicatif ; nous ne garantissons pas
              la disponibilité, l&apos;exactitude ou la pertinence de chaque suggestion, et ne sommes pas
              responsables de ce qui se passe lors d&apos;un rendez-vous que vous organisez via
              l&apos;application.
            </p>
          </Item>
          <Item title="Vos données">
            <p>
              Le traitement de vos données personnelles est décrit en détail sur la page{" "}
              <Link href="/confidentialite" style={{ color: ACCENT }}>
                Confidentialité
              </Link>
              .
            </p>
          </Item>
          <Item title="Suspension et suppression de compte">
            <p>
              Vous pouvez supprimer votre compte à tout moment depuis le tableau de bord. Nous pouvons
              suspendre ou clôturer un compte utilisé pour harceler, démarcher, ou contacter des personnes
              sans leur consentement — voir la section ci-dessus.
            </p>
          </Item>
          <Item title="Modifications">
            <p>
              Ces conditions peuvent évoluer à mesure qu&apos;Ittsui évolue. La version en ligne sur cette
              page fait foi. Pour toute question, écrivez à{" "}
              <a href="mailto:hello@ittsui.fr" style={{ color: ACCENT }}>
                hello@ittsui.fr
              </a>
              .
            </p>
          </Item>
        </div>
      </div>
    </main>
  );
}
