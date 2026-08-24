// /app/mentions-legales/page.tsx
// Required under French law (LCEN, art. 6-III) for any French-facing
// website: publisher identity, hosting provider, contact. This is
// legally distinct from /confidentialite (data practices) — this page
// is about who is legally responsible for the site's content.
//
// AUDIT NOTE: several fields below are marked [À COMPLÉTER] rather than
// filled in. Fabricating a business name, SIRET, or address here would
// be worse than leaving it blank — this notice exists precisely so the
// legally responsible party is real and traceable. Fill these in with
// your actual registered details (or your own name + address if
// operating as an individual) before this page satisfies the legal
// requirement, not just its appearance.

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

function ToComplete({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded px-1.5 py-0.5 text-sm" style={{ backgroundColor: `${ACCENT}1A`, color: ACCENT }}>
      {children}
    </span>
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
              <ToComplete>[À COMPLÉTER : nom ou raison sociale]</ToComplete>
              <br />
              <ToComplete>[À COMPLÉTER : statut juridique — entreprise individuelle, société, etc.]</ToComplete>
              <br />
              <ToComplete>[À COMPLÉTER : numéro SIRET, si applicable]</ToComplete>
              <br />
              <ToComplete>[À COMPLÉTER : adresse du siège ou domicile professionnel]</ToComplete>
            </p>
          </Item>
          <Item title="Directeur de la publication">
            <p>
              <ToComplete>[À COMPLÉTER : nom du responsable de la publication]</ToComplete>
            </p>
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
              Vercel Inc.
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
