import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/game";
import { applyChoice, generateNode, newGame } from "../game/engine";
import { clearRun, loadRun, saveRun } from "../game/storage";
import { ENDINGS } from "../game/content";
import { audioPref, getSoundtrack, setAudioPref } from "../game/audio";
import {
  FINAL_DEPTH,
  ITEM_LABELS,
  type Choice,
  type GameState,
} from "../game/types";

export function meta({}: Route.MetaArgs) {
  return [{ title: "NONAME — la discesa" }];
}

export default function Game() {
  const navigate = useNavigate();
  const [state, setState] = useState<GameState | null>(null);
  // Cambia a ogni scelta: forza il remount del nodo e riavvia le animazioni.
  const [nodeKey, setNodeKey] = useState(0);
  const [audioOn, setAudioOn] = useState(true);

  useEffect(() => {
    const run = loadRun();
    if (run) {
      setState(run);
    } else {
      const fresh = newGame();
      saveRun(fresh);
      setState(fresh);
    }
    setAudioOn(audioPref());
    getSoundtrack().resume();
    return () => getSoundtrack().suspend();
  }, []);

  const node = useMemo(
    () => (state && state.status === "alive" ? generateNode(state) : null),
    [state],
  );

  // L'atmosfera segue lo stato mentale.
  useEffect(() => {
    if (state) getSoundtrack().setMood(state.sanity, state.aggression);
  }, [state?.sanity, state?.aggression]);

  // L'Entità ha il suo suono.
  useEffect(() => {
    if (audioOn && node?.kind === "entity") getSoundtrack().sting();
  }, [nodeKey, audioOn, node?.kind]);

  // Rintocco sui finali.
  useEffect(() => {
    if (audioOn && state && state.status !== "alive") {
      const tone = ENDINGS[state.endingId ?? "vuoto"]?.tone;
      getSoundtrack().toll(tone === "light");
    }
  }, [state?.status]);

  if (!state) {
    return (
      <main className="veil flex min-h-dvh items-center justify-center">
        <p className="caret font-mono text-sm tracking-[0.4em] text-(--color-ash) uppercase">
          il labirinto ti sta sognando
        </p>
      </main>
    );
  }

  function choose(choice: Choice) {
    if (!state) return;
    if (audioOn) {
      const st = getSoundtrack();
      st.start(); // il primo click è il gesto che sblocca l'audio
      st.click();
    }
    const next = applyChoice(state, choice);
    saveRun(next);
    setState(next);
    setNodeKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function toggleAudio() {
    const next = !audioOn;
    setAudioOn(next);
    setAudioPref(next);
    const st = getSoundtrack();
    if (next) {
      st.start();
      st.setMuted(false);
    } else {
      st.setMuted(true);
    }
  }

  function restart() {
    clearRun();
    const fresh = newGame();
    saveRun(fresh);
    setState(fresh);
    setNodeKey((k) => k + 1);
  }

  if (state.status !== "alive") {
    return (
      <EndingScreen
        state={state}
        onRestart={restart}
        onMenu={() => navigate("/")}
      />
    );
  }

  const sanityClass =
    state.sanity < 25 ? "sanity-low" : state.sanity < 55 ? "sanity-mid" : "sanity-high";

  return (
    <main className="veil relative min-h-dvh overflow-x-hidden">
      <div className="scanlines" />
      <Hud
        state={state}
        audioOn={audioOn}
        onToggleAudio={toggleAudio}
        onMenu={() => navigate("/")}
      />

      <div className={`relative z-10 mx-auto max-w-3xl px-6 pt-32 pb-24 ${sanityClass}`}>
        {state.lastOutcome && (
          <p
            key={`outcome-${nodeKey}`}
            className="rise mb-10 border-l-2 border-(--color-ember-dim) pl-5 font-serif text-lg leading-relaxed text-(--color-ash) italic sm:text-xl"
          >
            {state.lastOutcome}
          </p>
        )}

        {node && (
          <article key={`node-${nodeKey}`}>
            <p className="rise font-mono text-xs tracking-[0.45em] text-(--color-ember)/80 uppercase">
              {node.zone} · profondità {state.depth}
            </p>
            <h1
              className="rise mt-3 font-serif text-5xl font-medium tracking-wide text-(--color-bone) sm:text-6xl"
              style={{ animationDelay: "0.2s" }}
            >
              {node.title}
            </h1>

            <div className="mt-9 space-y-6">
              {node.paragraphs.map((p, i) => (
                <p
                  key={i}
                  className={`rise font-serif text-xl leading-relaxed sm:text-2xl ${
                    p.startsWith("«")
                      ? "text-(--color-ember)/80 italic"
                      : "text-(--color-bone)/90"
                  }`}
                  style={{ animationDelay: `${0.3 + i * 0.35}s` }}
                >
                  {p}
                </p>
              ))}
            </div>

            <div
              className="rise mt-12 flex flex-col gap-3"
              style={{
                animationDelay: `${Math.min(0.45 + node.paragraphs.length * 0.35, 1.8)}s`,
              }}
            >
              <p className="mb-1 font-mono text-xs tracking-[0.4em] text-(--color-ash)/70 uppercase">
                cosa fai?
              </p>
              {node.choices.map((c) => (
                <button
                  key={c.id}
                  onClick={() => choose(c)}
                  className="choice cursor-pointer border border-(--color-smoke) bg-(--color-coal) px-5 py-4 text-left"
                >
                  <span className="flex items-baseline gap-3">
                    <span className="choice-marker font-mono text-lg text-(--color-ash)">▸</span>
                    <span className="font-serif text-xl text-(--color-bone) sm:text-2xl">
                      {c.label}
                    </span>
                  </span>
                  {c.hint && (
                    <span className="mt-1 block pl-7 font-serif text-base text-(--color-ash)/80 italic sm:text-lg">
                      {c.hint}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </article>
        )}
      </div>
    </main>
  );
}

function Hud({
  state,
  audioOn,
  onToggleAudio,
  onMenu,
}: {
  state: GameState;
  audioOn: boolean;
  onToggleAudio: () => void;
  onMenu: () => void;
}) {
  const sanityColor =
    state.sanity < 25
      ? "var(--color-ember)"
      : state.sanity < 55
        ? "#b08a4f"
        : "var(--color-sick)";

  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-(--color-smoke) bg-(--color-abyss)/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center gap-5 px-6 py-3.5 sm:gap-8">
        <button
          onClick={onMenu}
          className="cursor-pointer font-mono text-xs tracking-[0.3em] text-(--color-ash)/80 uppercase transition-colors hover:text-(--color-bone)"
        >
          ✕ risali
        </button>

        <div className="flex-1">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[11px] tracking-[0.3em] text-(--color-ash) uppercase">
              lucidità
            </span>
            <span
              className={`font-mono text-xs ${state.sanity < 25 ? "meter-panic" : ""}`}
              style={{ color: sanityColor }}
            >
              {state.sanity}
            </span>
          </div>
          <div className="mt-1 h-[3px] w-full bg-(--color-smoke)">
            <div
              className={`h-[3px] transition-all duration-700 ${state.sanity < 25 ? "meter-panic" : ""}`}
              style={{ width: `${state.sanity}%`, background: sanityColor }}
            />
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[11px] tracking-[0.3em] text-(--color-ash) uppercase">
              discesa
            </span>
            <span className="font-mono text-xs text-(--color-ash)">
              {Math.min(state.depth, FINAL_DEPTH)}/{FINAL_DEPTH}
            </span>
          </div>
          <div className="mt-1 h-[3px] w-full bg-(--color-smoke)">
            <div
              className="h-[3px] bg-(--color-bone)/60 transition-all duration-700"
              style={{
                width: `${Math.min(100, (state.depth / FINAL_DEPTH) * 100)}%`,
              }}
            />
          </div>
        </div>

        <button
          onClick={onToggleAudio}
          title={audioOn ? "Silenzia il labirinto" : "Riattiva l'audio"}
          className="cursor-pointer font-mono text-xs tracking-[0.3em] text-(--color-ash)/80 uppercase transition-colors hover:text-(--color-bone)"
        >
          {audioOn ? "♪ on" : "♪ off"}
        </button>
      </div>

      {state.items.length > 0 && (
        <div className="mx-auto flex max-w-3xl flex-wrap gap-2 px-6 pb-3">
          {state.items.map((i) => (
            <span
              key={i}
              className="border border-(--color-smoke) px-2.5 py-1 font-mono text-[11px] tracking-widest text-(--color-ash) uppercase"
            >
              {ITEM_LABELS[i]}
            </span>
          ))}
        </div>
      )}
    </header>
  );
}

function EndingScreen({
  state,
  onRestart,
  onMenu,
}: {
  state: GameState;
  onRestart: () => void;
  onMenu: () => void;
}) {
  const ending = ENDINGS[state.endingId ?? "vuoto"] ?? ENDINGS.vuoto;
  const accent =
    ending.tone === "light"
      ? "#d8c98f"
      : ending.tone === "grey"
        ? "var(--color-ash)"
        : "var(--color-ember)";

  return (
    <main className="veil relative flex min-h-dvh items-center justify-center overflow-hidden px-6">
      <div className="scanlines" />
      <div className="relative z-10 mx-auto max-w-2xl text-center">
        <p className="rise font-mono text-xs tracking-[0.5em] text-(--color-ash) uppercase">
          {state.status === "escaped" ? "la discesa finisce" : "la discesa ti finisce"}
        </p>
        <h1
          data-text={ending.title}
          className="glitch rise mt-5 font-serif text-6xl font-semibold tracking-wide sm:text-7xl"
          style={{ color: accent, animationDelay: "0.2s" }}
        >
          {ending.title}
        </h1>
        <p
          className="rise mt-8 font-serif text-xl leading-relaxed text-(--color-bone)/90 sm:text-2xl"
          style={{ animationDelay: "0.6s" }}
        >
          {ending.text}
        </p>

        <p
          className="rise mt-10 font-mono text-xs tracking-[0.3em] text-(--color-ash)/80 uppercase"
          style={{ animationDelay: "1s" }}
        >
          {state.nodeCount} scelte · profondità {state.depth} · lucidità {state.sanity}
        </p>

        <div
          className="rise mx-auto mt-12 flex max-w-sm flex-col gap-3"
          style={{ animationDelay: "1.3s" }}
        >
          <button
            onClick={onRestart}
            className="choice cursor-pointer border border-(--color-smoke) bg-(--color-coal) px-6 py-4 text-left font-mono text-base tracking-widest text-(--color-bone) uppercase"
          >
            <span className="choice-marker mr-3">▸</span>
            Scendi di nuovo
          </button>
          <button
            onClick={onMenu}
            className="cursor-pointer px-6 py-2 font-mono text-xs tracking-[0.3em] text-(--color-ash)/80 uppercase transition-colors hover:text-(--color-bone)"
          >
            torna in superficie
          </button>
        </div>
      </div>
    </main>
  );
}
