// /app/mentions-legales/page.tsx
// Required under French law (LCEN, art. 6-III) for any French-facing
// website: publisher identity, hosting provider, contact. This is
// legally distinct from /confidentialite (data practices) — this page
// is about who is legally responsible for the site's content.
//
// 2026-10-20: the publisher is Samuel Louissaint, as an individual, with
// the details he gave. No SIRET: the business will be KUCHIMOTO LLC
// (Wyoming), not a French company; its details go here once they exist.
// The same identity is stated on kuchimoto.com and in /confidentialite.

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

export default function MentionsLegalesPage() {
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
          Mentions légales
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed" style={{ color: MUTED }}>
          Éditeur, hébergement et responsabilité de publication du site ittsui.fr, conformément à
          l&apos;article 6-III de la loi n° 2004-575 du 21 juin 2004 (LCEN).
        </p>

        <div className="mt-8">
          <Item title="Éditeur du site">
            <p>
              Samuel Louissaint, personne physique
              <br />
              13 rue André Chénier, porte 506, 92260 Fontenay-aux-Roses, France
              <br />
              E-mail :{" "}
              <a href="mailto:samuel@kuchimoto.com" style={{ color: ACCENT }}>
                samuel@kuchimoto.com
              </a>
              <br />
              Téléphone :{" "}
              <a href="tel:+33743798860" style={{ color: ACCENT }}>
                07 43 79 88 60
              </a>
            </p>
          </Item>
          <Item title="Directeur de la publication">
            <p>Samuel Louissaint</p>
          </Item>
          <Item title="Contact">
            <p>
              <a href="mailto:hello@ittsui.fr" style={{ color: ACCENT }}>
                hello@ittsui.fr
              </a>
            </p>
          </Item>
          <Item title="Hébergement">
            <p>
              Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis
              <br />
              <a href="https://vercel.com" style={{ color: ACCENT }}>
                vercel.com
              </a>
            </p>
          </Item>
          <Item title="Propriété intellectuelle">
            <p>
              L&apos;ensemble des contenus de ce site (textes, structure, identité visuelle) est la
              propriété de l&apos;éditeur, sauf mention contraire.
            </p>
          </Item>
          <Item title="Données personnelles">
            <p>
              Le traitement des données personnelles est décrit sur la page{" "}
              <Link href="/confidentialite" style={{ color: ACCENT }}>
                Confidentialité
              </Link>
              . Les règles d&apos;utilisation du service sont décrites sur la page{" "}
              <Link href="/conditions-utilisation" style={{ color: ACCENT }}>
                Conditions d&apos;utilisation
              </Link>
              .
            </p>
          </Item>
        </div>
      </div>
    </main>
  );
}
