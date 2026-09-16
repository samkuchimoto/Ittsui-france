// /app/supprimer-mon-compte/page.tsx
// The public account-deletion page, linked from the Google Play store
// listing (Data safety -> "Delete account URL").
//
// Google requires this page to do three specific things, and each section
// below exists to satisfy one of them:
//   1. refer to the app and developer name shown on the store listing
//   2. prominently feature the steps to request deletion
//   3. specify which data is deleted, which is kept, and any retention
//
// Everything here is written from what app/api/user/delete/route.ts
// actually does — not from what a deletion flow is usually assumed to do.
// If that route changes, this page has to change with it, because a store
// listing that describes deletion inaccurately is worse than none.
//
// Deliberately reachable without signing in: a Play Store visitor who has
// not installed the app still has to be able to read it.

import { Fraunces, Work_Sans } from "next/font/google";
import Link from "next/link";
import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Supprimer mon compte — Ittsui",
  description:
    "Comment supprimer définitivement votre compte Ittsui et quelles données sont effacées ou conservées.",
};

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

export default function SupprimerMonComptePage() {
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
          Supprimer mon compte
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed" style={{ color: MUTED }}>
          Cette page concerne l&apos;application <strong style={{ color: INK }}>Ittsui</strong>, éditée par{" "}
          <strong style={{ color: INK }}>Ittsui France</strong>. Elle explique comment supprimer
          définitivement votre compte et ce qu&apos;il advient de vos données.
        </p>

        <div className="mt-8">
          <Item title="Les étapes, depuis l'application">
            <ol className="ml-4 list-decimal space-y-1.5">
              <li>Ouvrez Ittsui et connectez-vous avec votre compte Google.</li>
              <li>
                Allez sur votre tableau de bord (<Link href="/dashboard" className="underline underline-offset-4">ittsui.fr/dashboard</Link>).
              </li>
              <li>
                Descendez en bas de la page et touchez <strong style={{ color: INK }}>« Supprimer mon compte »</strong>.
              </li>
              <li>Confirmez. La suppression est immédiate et irréversible.</li>
            </ol>
          </Item>

          <Item title="Si vous n'avez plus accès à l'application">
            Écrivez à{" "}
            <a href="mailto:hello@ittsui.fr?subject=Suppression%20de%20mon%20compte" className="underline underline-offset-4" style={{ color: ACCENT }}>
              hello@ittsui.fr
            </a>{" "}
            depuis l&apos;adresse e-mail associée à votre compte. Votre demande est traitée sous 30 jours.
          </Item>

          <Item title="Ce qui est supprimé définitivement">
            <ul className="ml-4 list-disc space-y-1.5">
              <li>Votre compte et votre identifiant de connexion Google associé à Ittsui.</li>
              <li>
                Votre profil : nom, adresse e-mail, photo de profil Google, code postal, préférences de
                lieux, jetons de notification.
              </li>
              <li>Votre liste de contacts enregistrés dans Ittsui.</li>
              <li>
                Les rituels où vous étiez seul(e) — par exemple une invitation que personne n&apos;a
                acceptée — sont effacés entièrement.
              </li>
            </ul>
          </Item>

          <Item title="Ce qui est conservé, et pourquoi">
            <p>
              Si vous partagiez un rituel avec quelqu&apos;un, ce rituel n&apos;est pas effacé : il passe en
              statut « annulé », ce qui arrête définitivement toute proposition future. L&apos;autre personne
              en est informée.
            </p>
            <p className="mt-3">
              La raison est simple : le droit à l&apos;effacement porte sur vos données personnelles, pas sur
              l&apos;historique de la relation de l&apos;autre personne, qui lui appartient aussi. Une fois
              votre profil supprimé, votre identifiant ne subsiste dans ce rituel que sous la forme d&apos;une
              référence technique inerte, sans nom, sans e-mail et sans photo — il ne permet plus de vous
              identifier.
            </p>
            <p className="mt-3">
              Les rendez-vous passés de ce rituel (lieu, date, réponse) sont conservés pour cette même
              personne. Ils ne contiennent aucune donnée permettant de vous identifier.
            </p>
          </Item>

          <Item title="Délai de conservation">
            La suppression est immédiate, sans période de rétention et sans possibilité de récupération. Des
            sauvegardes techniques chiffrées peuvent subsister au maximum 30 jours chez notre hébergeur avant
            rotation automatique ; elles ne sont jamais consultées ni réutilisées.
          </Item>

          <Item title="Et l'application mobile ?">
            Supprimer l&apos;application de votre téléphone ne supprime pas votre compte. Suivez les étapes
            ci-dessus avant de la désinstaller.
          </Item>
        </div>

        <p className="mt-10 text-sm" style={{ color: MUTED }}>
          Voir aussi notre{" "}
          <Link href="/confidentialite" className="underline underline-offset-4">
            politique de confidentialité
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
