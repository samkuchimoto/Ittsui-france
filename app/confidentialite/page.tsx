// /app/confidentialite/page.tsx
// A plain-language description of what Ittsui actually stores and why —
// not a legal certification of compliance (that's a determination for
// counsel, not something to assert from a webpage). Written to match what
// the code in this repo actually does today, not aspirational claims.

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
      <p className="mt-2 text-[15px] leading-relaxed" style={{ color: MUTED }}>
        {children}
      </p>
    </div>
  );
}

export default function ConfidentialitePage() {
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
            Vous pouvez taper votre code postal vous-même, ou autoriser (facultatif — votre navigateur vous
            le demande explicitement, et rien ne se passe si vous refusez) Ittsui à le détecter
            automatiquement. Dans ce cas, votre position n&apos;est utilisée qu&apos;une fois, dans votre
            navigateur, pour obtenir votre code postal auprès du service officiel de l&apos;État français
            (api-adresse.data.gouv.fr) — vos coordonnées GPS elles-mêmes ne sont jamais envoyées à Ittsui ni
            stockées ; seul le code postal qui en résulte l&apos;est, exactement comme si vous l&apos;aviez
            tapé.
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
            Décliner une invitation retire votre e-mail — la seule donnée que cette invitation contenait
            vous concernant, puisque vous ne vous étiez jamais connecté(e). Supprimer votre compte (menu du
            tableau de bord) efface votre compte et vos données immédiatement ; si vous étiez lié(e) à
            quelqu&apos;un, le lien est annulé et cette personne est prévenue, mais ses propres données à
            elle ne sont pas effacées par votre demande — l&apos;effacement d&apos;un compte ne donne pas le
            droit de supprimer les données de quelqu&apos;un d&apos;autre. Pour toute autre demande, écrivez
            à{" "}
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
