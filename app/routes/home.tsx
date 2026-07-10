import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/home";
import { newGame } from "../game/engine";
import { loadRun, saveRun, clearRun } from "../game/storage";
import { audioPref, getSoundtrack } from "../game/audio";
import { dailySeed, loadMeta, todayString, type MetaState } from "../game/meta";
import { ENDINGS } from "../game/content";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "NONAME — il labirinto che ricorda" },
    {
      name: "description",
      content: "Un labirinto che cambia a ogni passo. Ogni scelta scende. Nessuna risale uguale.",
    },
  ];
}

/** L'ordine in cui il codex elenca i finali: dai più bui alla luce. */
const ENDING_ORDER = Object.keys(ENDINGS);

export default function Home() {
  const navigate = useNavigate();
  const [hasRun, setHasRun] = useState(false);
  const [meta, setMeta] = useState<MetaState | null>(null);

  const today = todayString();

  useEffect(() => {
    const run = loadRun();
    setHasRun(!!run && run.status === "alive" && run.nodeCount > 0);
    setMeta(loadMeta());
  }, []);

  function clickSound() {
    if (audioPref()) {
      const st = getSoundtrack();
      st.start(); // il click è il gesto che sblocca l'audio
      st.click();
    }
  }

  function enterMaze(fresh: boolean) {
    clickSound();
    if (fresh) {
      clearRun();
      saveRun(
        newGame({ hauntedByEntity: loadMeta().lastEndingId === "assorbito" }),
      );
    }
    navigate("/discesa");
  }

  function enterDaily() {
    clickSound();
    clearRun();
    saveRun(newGame({ seed: dailySeed(today), dailyDate: today }));
    navigate("/discesa");
  }

  const dailyDone = meta?.dailiesDone.includes(today) ?? false;
  const hasHistory = (meta?.runs ?? 0) > 0;

  return (
    <main className="veil relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-16">
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
          className="glitch rise mt-5 font-serif text-6xl font-semibold tracking-[0.18em] text-(--color-bone) sm:text-7xl"
          style={{ animationDelay: "0.15s" }}
        >
          NONAME
        </h1>

        <p
          className="rise mt-6 max-w-lg font-serif text-lg leading-relaxed text-(--color-ash) italic"
          style={{ animationDelay: "0.5s" }}
        >
          Un labirinto che si ridisegna a ogni passo. Ogni scelta scende più in
          fondo. Nessuna risale uguale. Da qualche parte, in basso, c&apos;è una
          porta di ferro — e la porta ti sta già aspettando.
        </p>

        <div
          className="rise mt-10 flex w-full max-w-sm flex-col gap-3"
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
          <button
            onClick={enterDaily}
            className="choice cursor-pointer border border-(--color-smoke) bg-(--color-coal) px-6 py-3 text-left font-mono text-sm tracking-widest text-(--color-bone) uppercase"
          >
            <span className="choice-marker mr-3">▸</span>
            La discesa del giorno
            <span className="block pl-6 font-serif text-sm normal-case tracking-normal text-(--color-ash)/80 italic">
              {dailyDone
                ? "già scesa, oggi. il labirinto se lo ricorda."
                : "lo stesso labirinto per tutti, fino a mezzanotte."}
            </span>
          </button>
          {hasRun && (
            <p className="mt-1 font-mono text-xs tracking-widest text-(--color-ash)/70 uppercase">
              iniziare di nuovo abbandona chi sei adesso laggiù
            </p>
          )}
        </div>

        {hasHistory && meta && (
          <div className="rise mt-12 w-full" style={{ animationDelay: "1.1s" }}>
            <p className="font-mono text-[10px] tracking-[0.45em] text-(--color-ash)/70 uppercase">
              quel che il labirinto sa di te
            </p>
            <p className="mt-3 font-mono text-xs tracking-[0.25em] text-(--color-ash) uppercase">
              {meta.runs} discese · {meta.deaths}{" "}
              {meta.deaths === 1 ? "volta perduto" : "volte perduto"} ·{" "}
              {meta.escapes} {meta.escapes === 1 ? "fuga" : "fughe"} · record:
              profondità {meta.bestDepth}
            </p>

            <p className="mt-8 font-mono text-[10px] tracking-[0.45em] text-(--color-ash)/70 uppercase">
              i finali · {meta.endingsSeen.length}/{ENDING_ORDER.length}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ENDING_ORDER.map((id) => {
                const seen = meta.endingsSeen.includes(id);
                const e = ENDINGS[id];
                const dot =
                  e.tone === "light"
                    ? "#d8c98f"
                    : e.tone === "grey"
                      ? "var(--color-ash)"
                      : "var(--color-ember)";
                return (
                  <div
                    key={id}
                    className={`border px-3 py-2 text-left ${
                      seen
                        ? "border-(--color-smoke) bg-(--color-coal)"
                        : "border-(--color-smoke)/50"
                    }`}
                  >
                    {seen ? (
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: dot }}
                        />
                        <span className="truncate font-serif text-sm text-(--color-bone)">
                          {e.title}
                        </span>
                      </span>
                    ) : (
                      <span className="font-mono text-sm tracking-[0.3em] text-(--color-ash)/40">
                        ———
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p
          className="rise mt-10 font-mono text-xs tracking-[0.35em] text-(--color-ash)/60 uppercase"
          style={{ animationDelay: "1.3s" }}
        >
          il labirinto non toglie · presta
        </p>
      </div>
    </main>
  );
}
