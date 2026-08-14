// /app/confidentialite/page.tsx
// A plain-language description of what Ittsui actually stores and why —
// not a legal certification of compliance (that's a determination for
// counsel, not something to assert from a webpage). Written to match what
// the code in this repo actually does today, not aspirational claims.

import { Fraunces, Work_Sans } from "next/font/google";
import Link from "next/link";

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

const INK = "#1C1917";
const MUTED = "#78716C";
const ACCENT = "#A84B38";
const BORDER = "#E8E2D9";

function Item({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t py-6" style={{ borderColor: BORDER }}>
      <h2 className="text-lg" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
        {title}
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed" style={{ color: MUTED }}>
        {children}
      </p>
    </div>
  );
}

export default function ConfidentialitePage() {
  return (
    <main
      className={`${fraunces.variable} ${workSans.variable} min-h-screen bg-[#FBF9F5] antialiased`}
      style={{ color: INK }}
    >
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link href="/" className="text-sm" style={{ color: MUTED }}>
          ← Retour
        </Link>

        <h1 className="mt-6" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "2rem" }}>
          Confidentialité
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed" style={{ color: MUTED }}>
          Ce qu&apos;Ittsui enregistre, en clair, et pourquoi. Ceci décrit ce que fait réellement
          l&apos;application aujourd&apos;hui — ce n&apos;est pas un document juridique.
        </p>

        <div className="mt-8">
          <Item title="Connexion">
            Vous vous connectez avec votre compte Google (via Firebase Authentication). Ittsui reçoit votre
            nom, votre e-mail et votre photo de profil Google — rien d&apos;autre n&apos;est demandé pour se
            connecter.
          </Item>
          <Item title="Votre rituel">
            Le prénom de votre proche, son e-mail, le jour et le créneau convenus, vos préférences de lieux
            et, si vous le renseignez, votre code postal sont stockés pour générer la proposition
            hebdomadaire. Rien de tout cela n&apos;est utilisé à d&apos;autres fins.
          </Item>
          <Item title="Localisation">
            Ittsui ne suit jamais votre position. Le seul indice géographique est le code postal que vous
            tapez vous-même, facultatif, utilisé uniquement pour proposer des lieux plus proches de chez
            vous.
          </Item>
          <Item title="Notifications">
            Si vous les activez, un jeton de notification push (via Firebase Cloud Messaging) ou votre
            e-mail (via Resend) est utilisé pour vous prévenir d&apos;une proposition ou d&apos;une
            confirmation. Rien d&apos;autre ne vous est envoyé.
          </Item>
          <Item title="Ce qu'Ittsui ne fait pas">
            Pas de revente de données, pas de publicité ciblée, pas de traqueurs tiers. Le code de cette
            application ne contient aucune intégration de ce type.
          </Item>
          <Item title="Suppression">
            Décliner ou annuler une invitation retire les informations associées. Pour toute autre demande de
            suppression, écrivez à{" "}
            <a href="mailto:hello@ittsui.fr" style={{ color: ACCENT }}>
              hello@ittsui.fr
            </a>
            .
          </Item>
        </div>
      </div>
    </main>
  );
}
