export default function Home() {
  return (
    <main className="min-h-screen bg-[#FBF3E7] text-[#232B45] antialiased">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,600;1,9..144,500&family=Work+Sans:wght@400;500;600&display=swap');

        :root {
          --font-display: 'Fraunces', Georgia, serif;
          --font-body: 'Work Sans', system-ui, sans-serif;
        }

        @media (prefers-reduced-motion: no-preference) {
          .fade-up { animation: fadeUp 0.9s ease-out both; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <section className="relative overflow-hidden px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-2xl text-center fade-up">
          <p className="mb-6 inline-block rounded-full border border-[#E2963C]/30 bg-[#E2963C]/10 px-4 py-1.5 text-sm tracking-wide">
            Dimanche · 15h–17h
          </p>
          <h1 className="text-4xl leading-[1.1] sm:text-6xl" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
            Vous vous êtes promis
            <br />
            <em className="text-[#C97B84]">ce dimanche.</em>
          </h1>
          <p className="mx-auto mt-6 max-w-md text-lg text-[#232B45]/70">
            Puis le scroll a gagné, encore. Ittsui protège la seule chose qui compte : que le rendez-vous ait vraiment lieu.
          </p>
          <a href="/setup" className="mt-10 inline-flex items-center justify-center rounded-full bg-[#232B45] px-8 py-4 text-base text-[#FBF3E7] transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E2963C]">
            Protéger notre rendez-vous
          </a>
        </div>
        <div className="mx-auto mt-16 max-w-md overflow-hidden rounded-2xl fade-up">
        <img src="/hero.jpg" alt="Deux personnes qui se retrouvent" className="w-full h-auto" />
        </div>
        <div className="pointer-events-none mx-auto mt-16 max-w-sm fade-up" aria-hidden="true">
          <svg viewBox="0 0 400 220" className="h-auto w-full">
            <defs>
              <radialGradient id="glow" cx="50%" cy="45%" r="60%">
                <stop offset="0%" stopColor="#E2963C" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#E2963C" stopOpacity="0" />
              </radialGradient>
            </defs>
            <ellipse cx="200" cy="120" rx="140" ry="70" fill="url(#glow)" />
            <ellipse cx="200" cy="150" rx="55" ry="14" fill="none" stroke="#3A2E39" strokeWidth="2.5" />
            <line x1="200" y1="150" x2="200" y2="185" stroke="#3A2E39" strokeWidth="2.5" />
            <path d="M90 185 L90 130 Q90 115 105 115 L110 115 Q125 115 125 130 L125 185" fill="none" stroke="#3A2E39" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="90" y1="150" x2="125" y2="150" stroke="#3A2E39" strokeWidth="2.5" />
            <path d="M275 185 L275 130 Q275 115 290 115 L295 115 Q310 115 310 130 L310 185" fill="none" stroke="#3A2E39" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="275" y1="150" x2="310" y2="150" stroke="#3A2E39" strokeWidth="2.5" />
          </svg>
        </div>
      </section>

      <section className="border-t border-[#232B45]/10 px-6 py-20">
        <div className="mx-auto max-w-lg space-y-3 text-center">
          <p className="text-[#232B45]/50">Vendredi, on est fatigués.</p>
          <p className="text-[#232B45]/50">Samedi, il pleut.</p>
          <p className="text-[#232B45]/50">« On se voit un autre jour. »</p>
          <p className="pt-6 text-2xl" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
            Et puis un jour, ça fait un an.
          </p>
        </div>
      </section>

      <section className="border-t border-[#232B45]/10 px-6 py-20">
        <div className="mx-auto max-w-2xl">
          <ol className="space-y-10">
            <li className="flex gap-6">
              <span className="shrink-0 text-2xl text-[#E2963C]" style={{ fontFamily: "var(--font-display)" }}>01</span>
              <div>
                <h3 className="text-xl" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>Une seule fois</h3>
                <p className="mt-1 text-[#232B45]/70">Vous liez une personne — partenaire, ami, famille. Vous choisissez ensemble le dimanche, 15h–17h. Ça ne change plus.</p>
              </div>
            </li>
            <li className="flex gap-6">
              <span className="shrink-0 text-2xl text-[#E2963C]" style={{ fontFamily: "var(--font-display)" }}>02</span>
              <div>
                <h3 className="text-xl" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>Chaque semaine</h3>
                <p className="mt-1 text-[#232B45]/70">Un message, une fois, avant le créneau : un lieu et une heure précis, jamais "qu'est-ce qu'on fait ?"</p>
              </div>
            </li>
            <li className="flex gap-6">
              <span className="shrink-0 text-2xl text-[#E2963C]" style={{ fontFamily: "var(--font-display)" }}>03</span>
              <div>
                <h3 className="text-xl" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>Un tap chacun</h3>
                <p className="mt-1 text-[#232B45]/70">Les deux disent oui → c'est verrouillé. Sinon, ça s'annule en silence. Aucun fil de discussion.</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <section className="border-t border-[#232B45]/10 px-6 py-24 text-center">
        <div className="mx-auto max-w-md">
          <p className="text-2xl" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>2,99 €/mois.</p>
          <p className="mt-2 text-[#232B45]/60">Ou 29,99 €/an. Annulez en un tap, aucune négociation.</p>
          <a href="/setup" className="mt-8 inline-flex items-center justify-center rounded-full border border-[#232B45] px-8 py-4 text-base transition-colors hover:bg-[#232B45] hover:text-[#FBF3E7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E2963C]">
            Commencer
          </a>
        </div>
      </section>

      <footer className="px-6 pb-10 text-center text-sm text-[#232B45]/40">
        Ittsui France — un rendez-vous, protégé.
      </footer>
    </main>
  );
}