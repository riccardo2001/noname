import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/home";
import { newGame } from "../game/engine";
import { loadRun, saveRun, clearRun } from "../game/storage";
import { audioPref, getSoundtrack } from "../game/audio";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "NONAME — il labirinto che ricorda" },
    {
      name: "description",
      content: "Un labirinto che cambia a ogni passo. Ogni scelta scende. Nessuna risale uguale.",
    },
  ];
}

export default function Home() {
  const navigate = useNavigate();
  const [hasRun, setHasRun] = useState(false);

  useEffect(() => {
    const run = loadRun();
    setHasRun(!!run && run.status === "alive" && run.nodeCount > 0);
  }, []);

  function enterMaze(fresh: boolean) {
    if (audioPref()) {
      const st = getSoundtrack();
      st.start(); // il click è il gesto che sblocca l'audio
      st.click();
    }
    if (fresh) {
      clearRun();
      saveRun(newGame());
    }
    navigate("/discesa");
  }

  return (
    <main className="veil relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6">
      <div className="scanlines" />

      {/* alone rosso in fondo alla pagina: la porta, laggiù */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-64 flicker"
        style={{
          background:
            "radial-gradient(ellipse 60% 100% at 50% 100%, rgb(194 69 59 / 0.13), transparent 70%)",
        }}
      />

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center text-center">
        <p className="rise font-mono text-xs tracking-[0.5em] text-(--color-ash) uppercase sm:text-sm">
          non è stato costruito · è cresciuto
        </p>

        <h1
          data-text="NONAME"
          className="glitch rise mt-6 font-serif text-7xl font-semibold tracking-[0.18em] text-(--color-bone) sm:text-8xl"
          style={{ animationDelay: "0.15s" }}
        >
          NONAME
        </h1>

        <p
          className="rise mt-8 max-w-xl font-serif text-xl leading-relaxed text-(--color-ash) italic sm:text-2xl"
          style={{ animationDelay: "0.5s" }}
        >
          Un labirinto che si ridisegna a ogni passo. Ogni scelta scende più in
          fondo. Nessuna risale uguale. Da qualche parte, in basso, c&apos;è una
          porta di ferro — e la porta ti sta già aspettando.
        </p>

        <div
          className="rise mt-14 flex w-full max-w-sm flex-col gap-3"
          style={{ animationDelay: "0.9s" }}
        >
          {hasRun && (
            <button
              onClick={() => enterMaze(false)}
              className="choice cursor-pointer border border-(--color-ember-dim) bg-(--color-coal) px-6 py-4 text-left font-mono text-base tracking-widest text-(--color-bone) uppercase"
            >
              <span className="choice-marker mr-3">▸</span>
              Riprendi la discesa
            </button>
          )}
          <button
            onClick={() => enterMaze(true)}
            className="choice cursor-pointer border border-(--color-smoke) bg-(--color-coal) px-6 py-4 text-left font-mono text-base tracking-widest text-(--color-bone) uppercase"
          >
            <span className="choice-marker mr-3">▸</span>
            {hasRun ? "Nuova discesa" : "Inizia la discesa"}
          </button>
          {hasRun && (
            <p className="mt-1 font-mono text-xs tracking-widest text-(--color-ash)/70 uppercase">
              iniziare di nuovo abbandona chi sei adesso laggiù
            </p>
          )}
        </div>

        <p
          className="rise mt-16 font-mono text-xs tracking-[0.35em] text-(--color-ash)/60 uppercase"
          style={{ animationDelay: "1.3s" }}
        >
          il labirinto non toglie · presta
        </p>
      </div>
    </main>
  );
}
