"use client";
// /app/page.tsx

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Fraunces, Work_Sans } from "next/font/google";

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

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`${visible ? "reveal-in" : "reveal-init"} ${className}`}>
      {children}
    </div>
  );
}

const MOSAIC_IMAGES = [
  { src: "/friends-cafe-terrace.jpg", alt: "Deux amis discutent en terrasse, sur une rue pavée.", anchor: true },
  { src: "/couple-parisian-cafe.jpg", alt: "Un couple partage un moment à une table de café parisien, à contre-jour." },
  { src: "/mother-daughter-cafe.jpg", alt: "Une mère et sa fille partagent un café devant une fenêtre de brasserie parisienne." },
  { src: "/mother-daughter-kitchen.jpg", alt: "Une mère et sa fille rient ensemble autour d'un thé, dans une cuisine familiale." },
  { src: "/couple-living-room.jpg", alt: "Un couple discute, installé sur un canapé, dans la lumière chaude du soir." },
];

export default function Home() {
  return (
    <main className={`${fraunces.variable} ${workSans.variable} min-h-screen bg-[#FBF3E7] text-[#232B45] antialiased`}>
      <style jsx global>{`
        @media (prefers-reduced-motion: no-preference) {
          .reveal-in { animation: fadeUp 0.9s ease-out both; }
        }
        @media (prefers-reduced-motion: reduce) {
          .reveal-init, .reveal-in { opacity: 1; transform: none; }
        }
        .reveal-init { opacity: 0; transform: translateY(16px); }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="relative h-[70vh] w-full overflow-hidden sm:h-[80vh] md:h-[88vh]">
        <Image
          src="/hero-father-son-vineyard.jpg"
          alt="Un fils et son père marchent côte à côte sur un chemin de vigne, à la tombée du jour."
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/40 to-transparent" />
        <p className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-sm tracking-wide text-white backdrop-blur-sm">
          Dimanche · 15h–17h
        </p>
      </div>

      <section className="px-6 py-24 sm:py-32">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h1
            className="leading-[1.05]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "clamp(2.75rem, 6vw, 4.5rem)" }}
          >
            Vous vous êtes promis
            <br />
            <em className="text-[#9C4A56]">ce dimanche.</em>
          </h1>
          <p className="mx-auto mt-6 max-w-md text-[17px] text-[#232B45]/70">
            Puis le scroll a gagné, encore. Ittsui protège la seule chose qui compte : que le rendez-vous ait vraiment lieu.
          </p>
          
            href="/setup"
            className="mt-10 inline-flex items-center justify-center rounded-full bg-[#232B45] px-8 py-4 text-base text-[#FBF3E7] transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E2963C]"
          >
            Protéger notre rendez-vous
          </a>
        </Reveal>
      </section>

      <section className="border-t border-[#232B45]/10 px-6 py-20 sm:py-24">
        <Reveal className="mx-auto max-w-lg space-y-3 text-center">
          <p className="text-[#232B45]/70">Vendredi, on est fatigués.</p>
          <p className="text-[#232B45]/70">Samedi, il pleut.</p>
          <p className="text-[#232B45]/70">« On se voit un autre jour. »</p>
          <p className="pt-6" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "clamp(1.75rem, 3.5vw, 2rem)" }}>
            Et puis un jour, ça fait un an.
          </p>

          <div className="relative mx-auto mt-8 h-44 w-36 -rotate-3 overflow-hidden rounded-md shadow-lg sm:h-52 sm:w-40">
            <Image
              src="/grandmother-granddaughter-park.jpg"
              alt="Une grand-mère et sa petite-fille assises sur un banc, dans un parc, un après-midi d'automne."
              fill
              sizes="200px"
              className="object-cover"
            />
          </div>

          <p className="pt-6 text-[#232B45]" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "clamp(1.75rem, 3.5vw, 2rem)" }}>
            Ittsui ne change rien à ça — sauf que ça arrive.
          </p>
        </Reveal>
      </section>

      <section className="border-t border-[#232B45]/10 px-6 py-20 sm:py-24">
        <Reveal className="mx-auto max-w-2xl">
          <ol className="space-y-10">
            <li className="flex gap-6">
              <span className="shrink-0 text-[#E2963C]" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.5rem, 3vw, 2rem)" }}>01</span>
              <div>
                <h3 className="text-xl" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>Une seule fois</h3>
                <p className="mt-1 text-[17px] text-[#232B45]/70">
                  Vous liez une personne — partenaire, ami, famille. Vous choisissez ensemble le dimanche, 15h–17h. Ça ne change plus.
                </p>
              </div>
            </li>
            <li className="flex gap-6">
              <span className="shrink-0 text-[#E2963C]" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.5rem, 3vw, 2rem)" }}>02</span>
              <div>
                <h3 className="text-xl" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>Chaque semaine</h3>
                <p className="mt-1 text-[17px] text-[#232B45]/70">
                  Un message, une fois, avant le créneau : un lieu et une heure précis, jamais "qu'est-ce qu'on fait ?"
                </p>
              </div>
            </li>
            <li className="flex gap-6">
              <span className="shrink-0 text-[#E2963C]" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.5rem, 3vw, 2rem)" }}>03</span>
              <div>
                <h3 className="text-xl" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>Un tap chacun</h3>
                <p className="mt-1 text-[17px] text-[#232B45]/70">
                  Les deux disent oui → c'est verrouillé. Sinon, ça s'annule en silence. Aucun fil de discussion.
                </p>
              </div>
            </li>
          </ol>
        </Reveal>
      </section>

      <section className="border-t border-[#232B45]/10 py-12 sm:py-16">
        <Reveal>
          <p className="px-6 text-center text-[17px] text-[#232B45]/70">
            Un partenaire. Un ami. Un parent.
          </p>

          <div className="mx-auto mt-6 hidden max-w-6xl grid-cols-4 grid-rows-2 gap-3 px-6 md:grid md:h-[560px]">
            {MOSAIC_IMAGES.map((img) => (
              <div
                key={img.src}
                className={`relative overflow-hidden rounded-2xl ${img.anchor ? "col-span-2 row-span-2" : "col-span-1 row-span-1"}`}
              >
                <Image src={img.src} alt={img.alt} fill sizes={img.anchor ? "50vw" : "20vw"} className="object-cover transition-transform duration-300 hover:scale-[1.02]" />
              </div>
            ))}
          </div>

          <div className="mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-2 md:hidden">
            {MOSAIC_IMAGES.map((img) => (
              <div key={img.src} className="relative h-64 w-[75vw] flex-shrink-0 snap-start overflow-hidden rounded-2xl">
                <Image src={img.src} alt={img.alt} fill sizes="75vw" className="object-cover" />
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="border-t border-[#232B45]/10 px-6 py-24 text-center sm:py-32">
        <Reveal className="mx-auto max-w-md">
          <p style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "clamp(1.75rem, 3.5vw, 2rem)" }}>
            2,99 €/mois.
          </p>
          <p className="mt-2 text-[#232B45]/70">Ou 29,99 €/an. Annulez en un tap, aucune négociation.</p>
          
            href="/setup"
            className="mt-8 inline-flex items-center justify-center rounded-full border border-[#232B45] px-8 py-4 text-base transition-colors hover:bg-[#232B45] hover:text-[#FBF3E7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E2963C]"
          >
            Commencer
          </a>
        </Reveal>
      </section>

      <footer className="px-6 pb-10 text-center text-sm text-[#232B45]/40">
        Ittsui France — un rendez-vous, protégé.
      </footer>
    </main>
  );
}