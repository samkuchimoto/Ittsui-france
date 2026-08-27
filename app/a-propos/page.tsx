// /app/a-propos/page.tsx
// Real early testers (both met in Paris) independently asked for
// this: "what's the background," "what's the context," "why does this
// exist." The founder's own account below is the honest answer — this
// page exists because that specific, repeated feedback asked for it, not
// as a persuasion device. No testimonials, quotes, or claims from anyone
// but the founder appear here — see AGENTS.md / CLAUDE.md's standing
// position against fabricated social proof.

import { Fraunces, Work_Sans } from "next/font/google";
import Link from "next/link";
import { INK, MUTED, ACCENT, BORDER } from "@/lib/theme";
import { PageMascotHeader } from "@/app/components/PageMascotHeader";

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

function Pullquote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote
      className="my-10 border-l-2 py-1 pl-6 text-xl leading-snug"
      style={{ borderColor: ACCENT, fontFamily: "var(--font-display)", fontWeight: 500, fontStyle: "italic" }}
    >
      {children}
    </blockquote>
  );
}

export default function AProposPage() {
  return (
    <main
      className={`${fraunces.variable} ${workSans.variable} min-h-screen bg-[#FFFDF9] antialiased`}
      style={{ color: INK }}
    >
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link href="/" className="text-sm" style={{ color: MUTED }}>
          ← Retour
        </Link>

        <PageMascotHeader />
        <h1 className="mt-6" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "clamp(2rem, 4vw, 2.5rem)" }}>
          Pourquoi Ittsui existe.
        </h1>
        <p className="mt-3 text-[15px]" style={{ color: MUTED }}>
          L&apos;histoire réelle derrière le projet — pas une plaquette, juste ce qui s&apos;est passé.
        </p>

        <div className="mt-10 space-y-5 text-[17px] leading-relaxed" style={{ color: INK }}>
          <p>
            Avant Ittsui, j&apos;ai passé six mois à faire du wwoofing — du volontariat dans des fermes
            biologiques — à Yugawara puis à Negoro, dans la préfecture de Wakayama, au Japon. De longues
            journées simples : la terre, les saisons, peu de bruit. C&apos;est là qu&apos;une question a
            commencé à me travailler, sans que je sache encore quoi en faire : dans une ville immense comme
            Tokyo, entouré de millions de gens, comment est-ce qu&apos;on finit quand même par se sentir
            seul ?
          </p>

          <p>
            Le voyage a continué sac au dos, de Berlin vers Prague. Un soir, arrivé tard, l&apos;auberge où
            j&apos;avais prévu de dormir était déjà fermée pour la nuit. J&apos;en ai trouvé une autre. C&apos;est
            là que j&apos;ai rencontré une voyageuse japonaise, seule elle aussi, et qu&apos;on a fini par
            parler de cette idée encore floue d&apos;application.
          </p>

          <p>
            Sa première réaction a été de clarifier ce que ce n&apos;était pas : pas un réseau social, pas
            un endroit pour parler à des inconnus — quelque chose dont elle m&apos;a dit se méfier
            naturellement, en particulier en tant que femme. Mais ce qu&apos;elle a dit ensuite a changé la
            direction du projet.
          </p>

          <Pullquote>
            « Le problème, ce n&apos;est pas qu&apos;on n&apos;a pas envie de voir les gens. C&apos;est
            qu&apos;on n&apos;a pas le temps. »
          </Pullquote>

          <p>
            Elle m&apos;a expliqué sa réalité à Tokyo : des journées de travail de huit à dix heures,
            parfois plus, des semaines pleines du lundi au vendredi, un dimanche qui sert surtout à
            récupérer. Concrètement, il ne reste que le vendredi ou le samedi soir pour organiser quoi que
            ce soit avec quelqu&apos;un — et encore faut-il avoir l&apos;énergie de s&apos;en occuper. Selon
            elle, ce n&apos;est pas près de changer, ni dans dix ans, ni dans vingt.
          </p>

          <p>
            Ce n&apos;est donc pas un problème d&apos;envie. C&apos;est un problème de charge : celle de
            devoir sans cesse proposer, relancer, caler un horaire, gérer le fil de discussion qui
            finit par s&apos;éteindre faute de temps pour y répondre. Ajouter une application de plus à
            consulter n&apos;aurait rien réglé — ça aurait juste ajouté une charge de plus.
          </p>

          <p>
            C&apos;est ce constat, pas une idée de départ, qui a donné à Ittsui sa forme actuelle : une
            seule proposition, une seule décision, puis plus rien à gérer jusqu&apos;à la prochaine fois.
            Le silence entre les deux n&apos;est pas un manque de fonctionnalités — c&apos;est le point.
          </p>

          <p>
            Le projet reste jeune, construit par une seule personne, et continue d&apos;évoluer au contact
            de vraies conversations avec de vrais premiers utilisateurs, rencontrés directement à Paris. Cette
            page existe parce que plusieurs d&apos;entre eux ont posé la même question, honnêtement : «
            c&apos;est quoi, le contexte ? » — la voici.
          </p>
        </div>

        <div className="mt-14 border-t pt-8" style={{ borderColor: BORDER }}>
          <Link
            href="/setup"
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm text-white transition-transform hover:scale-[1.02]"
            style={{ backgroundColor: ACCENT }}
          >
            Découvrir Ittsui
          </Link>
        </div>
      </div>
    </main>
  );
}
