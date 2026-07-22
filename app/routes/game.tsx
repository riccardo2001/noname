import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import type { Route } from "./+types/game";
import { applyChoice, generateNode, newGame } from "../game/engine";
import { clearRun, loadRun, saveRun } from "../game/storage";
import { ENDINGS, LORE_FRAGMENTS } from "../game/content";
import { audioPref, getSoundtrack, setAudioPref } from "../game/audio";
import {
  loadMeta,
  loadPrefs,
  recordFragmentsFromFlags,
  recordRunEnd,
  savePrefs,
  type MetaState,
} from "../game/meta";
import { Vignette } from "../game/art";
import {
  FINAL_DEPTH,
  ITEM_LABELS,
  ITEM_INFO,
  type Choice,
  type GameNode,
  type GameState,
} from "../game/types";

export function meta({}: Route.MetaArgs) {
  return [{ title: "NONAME — la discesa" }];
}

export default function Game() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<GameState | null>(null);
  // Cambia a ogni scelta: forza il remount del nodo e riavvia le animazioni.
  const [nodeKey, setNodeKey] = useState(0);
  const [audioOn, setAudioOn] = useState(true);
  const [typewriter, setTypewriter] = useState(false);
  const [showJournal, setShowJournal] = useState(false);
  const [showBag, setShowBag] = useState(false);
  // Lampo rosso sul contraccolpo: cresce col colpo appena incassato.
  const [hit, setHit] = useState(0);
  // Titolo del frammento appena ricordato: mostrato come annuncio effimero.
  const [discovered, setDiscovered] = useState<string | null>(null);
  // Il record com'era prima che questa run finisse: per dire "nuovo record".
  const prevBestRef = useRef<number | null>(null);
  // L'header è fixed: misuriamo la sua altezza reale (cresce con gli oggetti a
  // capo) e la usiamo come spazio sopra il contenuto, così non lo copre mai.
  const hudRef = useRef<HTMLElement | null>(null);
  const [hudH, setHudH] = useState(96);

  useEffect(() => {
    const el = hudRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setHudH(el.offsetHeight));
    ro.observe(el);
    setHudH(el.offsetHeight);
    return () => ro.disconnect();
  }, [state?.status]);

  useEffect(() => {
    // ?seed=N: una discesa condivisa. Stesso seme, stesso labirinto.
    const sharedSeed = Number(searchParams.get("seed"));
    const run = loadRun();
    if (Number.isFinite(sharedSeed) && sharedSeed > 0 && run?.seed !== sharedSeed) {
      const fresh = newGame({ seed: sharedSeed >>> 0 });
      saveRun(fresh);
      setState(fresh);
    } else if (run) {
      setState(run);
    } else {
      const fresh = newGame({
        hauntedByEntity: loadMeta().lastEndingId === "assorbito",
      });
      saveRun(fresh);
      setState(fresh);
    }
    setAudioOn(audioPref());
    setTypewriter(loadPrefs().typewriter);
    getSoundtrack().resume();
    return () => getSoundtrack().suspend();
  }, []);

  const node = useMemo(
    () => (state && state.status === "alive" ? generateNode(state) : null),
    [state],
  );

  // L'atmosfera segue lo stato mentale — e la caccia ha il suo strato di pressione.
  useEffect(() => {
    if (state) {
      getSoundtrack().setMood(state.sanity, state.aggression);
      getSoundtrack().setHunt(state.caccia ?? 0);
    }
  }, [state?.sanity, state?.aggression, state?.caccia]);

  // L'Entità ha il suo suono.
  useEffect(() => {
    if (audioOn && node?.kind === "entity") getSoundtrack().sting();
  }, [nodeKey, audioOn, node?.kind]);

  // L'annuncio del frammento scoperto svanisce da solo.
  useEffect(() => {
    if (!discovered) return;
    const id = window.setTimeout(() => setDiscovered(null), 4200);
    return () => window.clearTimeout(id);
  }, [discovered]);

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
    const next = applyChoice(state, choice, node?.kind);
    // Contraccolpo: un lampo tanto più forte quanto più grande è stato il colpo.
    const lost = state.sanity - next.sanity;
    if (lost >= 8) setHit(Math.min(1, lost / 22));
    else setHit(0);
    // Frammenti della Ricorrenza: registra ciò che hai appena capito.
    const added = recordFragmentsFromFlags(next.flags);
    if (added.length) {
      const fr = LORE_FRAGMENTS.find((f) => f.id === added[0]);
      if (fr) setDiscovered(fr.title);
    }
    if (next.status !== "alive") {
      prevBestRef.current = loadMeta().bestDepth;
      recordRunEnd(next);
    }
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

  function toggleTypewriter() {
    const next = !typewriter;
    setTypewriter(next);
    savePrefs({ ...loadPrefs(), typewriter: next });
  }

  function restart() {
    const haunted = loadMeta().lastEndingId === "assorbito";
    clearRun();
    const fresh = newGame({ hauntedByEntity: haunted });
    saveRun(fresh);
    setState(fresh);
    setNodeKey((k) => k + 1);
  }

  if (state.status !== "alive") {
    return (
      <EndingScreen
        state={state}
        prevBest={prevBestRef.current}
        onRestart={restart}
        onMenu={() => navigate("/")}
      />
    );
  }

  const sanityClass =
    state.sanity < 25 ? "sanity-low" : state.sanity < 55 ? "sanity-mid" : "sanity-high";

  const caccia = state.caccia ?? 0;

  return (
    <main className="veil relative min-h-dvh overflow-x-hidden">
      <div className="scanlines" />

      {/* Sei braccato: un alone rosso pulsa ai bordi, più intenso più è vicina. */}
      {caccia > 0 && (
        <div
          aria-hidden
          className="stalk-veil pointer-events-none fixed inset-0 z-20"
          style={{
            opacity: Math.min(0.85, 0.28 + caccia * 0.16),
            animationDuration: `${Math.max(1.1, 2.6 - caccia * 0.35)}s`,
          }}
        />
      )}

      {/* Contraccolpo: un lampo secco quando incassi un colpo grosso. */}
      {hit > 0 && (
        <div
          key={`hit-${nodeKey}`}
          aria-hidden
          className="hit-flash pointer-events-none fixed inset-0 z-40"
          style={{ ["--hit" as string]: hit }}
        />
      )}

      {/* Hai ricordato qualcosa: un frammento della Ricorrenza si è sbloccato. */}
      {discovered && (
        <div
          key={discovered}
          className="rise pointer-events-none fixed inset-x-0 top-20 z-40 flex justify-center px-6"
        >
          <div className="border border-(--color-gold)/40 bg-(--color-abyss)/90 px-4 py-2 text-center backdrop-blur-sm">
            <p className="font-mono text-[10px] tracking-[0.4em] text-(--color-gold) uppercase">
              ⟡ hai ricordato qualcosa
            </p>
            <p className="mt-0.5 font-serif text-sm text-(--color-bone) italic">
              {discovered}
            </p>
          </div>
        </div>
      )}

      <Hud
        hudRef={hudRef}
        state={state}
        audioOn={audioOn}
        typewriter={typewriter}
        onToggleAudio={toggleAudio}
        onToggleTypewriter={toggleTypewriter}
        onToggleJournal={() => setShowJournal((v) => !v)}
        onOpenBag={() => setShowBag(true)}
        onMenu={() => navigate("/")}
      />

      {showJournal && (
        <Journal log={state.log} onClose={() => setShowJournal(false)} />
      )}

      {showBag && (
        <Bag items={state.items} onClose={() => setShowBag(false)} />
      )}

      <div
        className={`relative z-10 mx-auto max-w-3xl px-6 pb-10 ${sanityClass}`}
        style={{ paddingTop: hudH + 20 }}
      >
        {state.lastOutcome && (
          <p
            key={`outcome-${nodeKey}`}
            className="rise mb-6 border-l-2 border-(--color-ember-dim) pl-4 font-serif text-base leading-snug text-(--color-ash) italic"
          >
            {state.lastOutcome}
          </p>
        )}

        {node && (
          <NodeView
            key={`node-${nodeKey}`}
            node={node}
            state={state}
            typewriter={typewriter}
            onChoose={choose}
          />
        )}
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Il nodo corrente: testo (battuto a macchina, se richiesto) + scelte */
/* ------------------------------------------------------------------ */

function NodeView({
  node,
  state,
  typewriter,
  onChoose,
}: {
  node: GameNode;
  state: GameState;
  typewriter: boolean;
  onChoose: (c: Choice) => void;
}) {
  const total = useMemo(
    () => node.paragraphs.reduce((a, p) => a + p.length, 0),
    [node],
  );
  const [chars, setChars] = useState(typewriter ? 0 : total);

  useEffect(() => {
    if (!typewriter) {
      setChars(total);
      return;
    }
    setChars(0);
    const id = window.setInterval(() => {
      setChars((c) => {
        if (c >= total) {
          window.clearInterval(id);
          return c;
        }
        return c + 2;
      });
    }, 24);
    return () => window.clearInterval(id);
  }, [typewriter, total]);

  const done = chars >= total;

  // Quanto di ogni paragrafo è già emerso dal buio.
  let budget = chars;
  const revealed = node.paragraphs.map((p) => {
    const take = Math.max(0, Math.min(p.length, budget));
    budget -= p.length;
    return p.slice(0, take);
  });

  return (
    <article onClick={() => !done && setChars(total)}>
      <div
        className="rise relative opacity-90"
        style={{ animationDelay: "0.1s" }}
      >
        {node.rare && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flicker"
            style={{
              background:
                "radial-gradient(ellipse 55% 70% at 50% 50%, rgb(216 201 143 / 0.12), transparent 72%)",
            }}
          />
        )}
        <Vignette node={node} state={state} />
      </div>
      {node.rare ? (
        <p className="rise font-mono text-[10px] tracking-[0.45em] text-(--color-gold) uppercase">
          <span className="mr-1">⟡</span> una stanza rara · {node.zone} · profondità{" "}
          {state.depth}
        </p>
      ) : (
        <p className="rise font-mono text-[10px] tracking-[0.45em] text-(--color-ember)/80 uppercase">
          {node.zone} · profondità {state.depth}
        </p>
      )}
      <h1
        className={`rise mt-2 font-serif text-3xl font-medium tracking-wide sm:text-4xl ${
          node.rare ? "text-(--color-gold)" : "text-(--color-bone)"
        }`}
        style={{ animationDelay: "0.2s" }}
      >
        {node.title}
      </h1>

      <div className="mt-5 space-y-3">
        {node.paragraphs.map((p, i) => {
          const text = typewriter ? revealed[i] : p;
          if (typewriter && text.length === 0) return null;
          const isTyping = typewriter && text.length < p.length;
          return (
            <p
              key={i}
              className={`${typewriter ? "" : "rise"} ${isTyping ? "caret" : ""} font-serif text-lg leading-normal ${
                p.startsWith("«")
                  ? "text-(--color-ember)/80 italic"
                  : "text-(--color-bone)/90"
              }`}
              style={typewriter ? undefined : { animationDelay: `${0.3 + i * 0.35}s` }}
            >
              {text}
            </p>
          );
        })}
      </div>

      {done && (
        <div
          className="rise mt-6 flex flex-col gap-2"
          style={{
            animationDelay: typewriter
              ? "0.1s"
              : `${Math.min(0.45 + node.paragraphs.length * 0.35, 1.8)}s`,
          }}
        >
          <p className="mb-1 font-mono text-[10px] tracking-[0.4em] text-(--color-ash)/70 uppercase">
            cosa fai?
          </p>
          {node.choices.map((c) => (
            <button
              key={c.id}
              onClick={() => onChoose(c)}
              className="choice cursor-pointer border border-(--color-smoke) bg-(--color-coal) px-5 py-2.5 text-left"
            >
              <span className="flex items-baseline gap-3">
                <span className="choice-marker font-mono text-(--color-ash)">▸</span>
                <span className="font-serif text-lg text-(--color-bone)">
                  {c.label}
                </span>
              </span>
              {c.hint && (
                <span className="block pl-6 font-serif text-sm text-(--color-ash)/80 italic">
                  {c.hint}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Il diario: la discesa riletta a ritroso                             */
/* ------------------------------------------------------------------ */

function Journal({ log, onClose }: { log: string[]; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-40 overflow-y-auto bg-(--color-abyss)/92 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-auto max-w-2xl px-6 py-24"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-2xl text-(--color-bone)">
            Quel che ricordi della discesa
          </h2>
          <button
            onClick={onClose}
            className="cursor-pointer font-mono text-xs tracking-[0.3em] text-(--color-ash)/80 uppercase transition-colors hover:text-(--color-bone)"
          >
            chiudi ✕
          </button>
        </div>
        <p className="mt-1 font-mono text-[10px] tracking-[0.35em] text-(--color-ash)/60 uppercase">
          le pagine si riempiono da sole · le più recenti in alto
        </p>

        {log.length === 0 ? (
          <p className="mt-8 font-serif text-lg text-(--color-ash) italic">
            Le pagine sono ancora bianche. Il labirinto aspetta che tu faccia
            qualcosa che valga la pena ricordare.
          </p>
        ) : (
          <ol className="mt-8 space-y-5">
            {[...log].reverse().map((entry, i) => (
              <li
                key={log.length - i}
                className="border-l-2 border-(--color-smoke) pl-4 font-serif text-base leading-snug text-(--color-bone)/80 italic"
              >
                {entry}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function Hud({
  hudRef,
  state,
  audioOn,
  typewriter,
  onToggleAudio,
  onToggleTypewriter,
  onToggleJournal,
  onOpenBag,
  onMenu,
}: {
  hudRef: React.Ref<HTMLElement>;
  state: GameState;
  audioOn: boolean;
  typewriter: boolean;
  onToggleAudio: () => void;
  onToggleTypewriter: () => void;
  onToggleJournal: () => void;
  onOpenBag: () => void;
  onMenu: () => void;
}) {
  const sanityColor =
    state.sanity < 25
      ? "var(--color-ember)"
      : state.sanity < 55
        ? "#b08a4f"
        : "var(--color-sick)";

  return (
    <header
      ref={hudRef}
      className="fixed inset-x-0 top-0 z-30 border-b border-(--color-smoke) bg-(--color-abyss)/85 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-3xl items-center gap-4 px-6 py-2.5 sm:gap-6">
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
          onClick={onToggleJournal}
          title="Rileggi la discesa"
          className="cursor-pointer font-mono text-xs tracking-[0.3em] text-(--color-ash)/80 uppercase transition-colors hover:text-(--color-bone)"
        >
          ❧ diario
        </button>
        <button
          onClick={onToggleTypewriter}
          title={typewriter ? "Testo immediato" : "Testo battuto a macchina"}
          className="cursor-pointer font-mono text-xs tracking-[0.3em] text-(--color-ash)/80 uppercase transition-colors hover:text-(--color-bone)"
        >
          {typewriter ? "✎ lento" : "✎ rapido"}
        </button>
        <button
          onClick={onToggleAudio}
          title={audioOn ? "Silenzia il labirinto" : "Riattiva l'audio"}
          className="cursor-pointer font-mono text-xs tracking-[0.3em] text-(--color-ash)/80 uppercase transition-colors hover:text-(--color-bone)"
        >
          {audioOn ? "♪ on" : "♪ off"}
        </button>
      </div>

      {state.items.length > 0 && (
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 px-6 pb-2">
          {state.items.map((i) => (
            <button
              key={i}
              onClick={onOpenBag}
              title="A cosa serve? Tocca per saperlo."
              className="cursor-pointer border border-(--color-smoke) px-2 py-0.5 font-mono text-[10px] tracking-widest text-(--color-ash) uppercase transition-colors hover:border-(--color-ash) hover:text-(--color-bone)"
            >
              {ITEM_LABELS[i]}
            </button>
          ))}
          <span className="font-mono text-[9px] tracking-widest text-(--color-ash)/40 uppercase">
            tocca un oggetto
          </span>
        </div>
      )}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Lo zaino: a cosa serve ogni cosa che porti                          */
/* ------------------------------------------------------------------ */

function Bag({ items, onClose }: { items: GameState["items"]; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-40 overflow-y-auto bg-(--color-abyss)/92 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-auto max-w-2xl px-6 py-24"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-2xl text-(--color-bone)">Il tuo zaino</h2>
          <button
            onClick={onClose}
            className="cursor-pointer font-mono text-xs tracking-[0.3em] text-(--color-ash)/80 uppercase transition-colors hover:text-(--color-bone)"
          >
            chiudi ✕
          </button>
        </div>
        <p className="mt-1 font-mono text-[10px] tracking-[0.35em] text-(--color-ash)/60 uppercase">
          ciò che il labirinto ti ha prestato · e a cosa serve
        </p>

        <ul className="mt-8 space-y-5">
          {items.map((i) => (
            <li key={i} className="border-l-2 border-(--color-ember-dim) pl-4">
              <p className="font-mono text-xs tracking-[0.25em] text-(--color-bone) uppercase">
                {ITEM_LABELS[i]}
              </p>
              <p className="mt-1 font-serif text-base leading-snug text-(--color-ash)">
                {ITEM_INFO[i]}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Il finale: cosa resta della run, e cosa portarne fuori              */
/* ------------------------------------------------------------------ */

function shareText(state: GameState, ending: { title: string }): string {
  const blocks = Math.round((Math.min(state.depth, FINAL_DEPTH) / FINAL_DEPTH) * 10);
  const bar = "█".repeat(blocks) + "░".repeat(10 - blocks);
  const header = state.dailyDate
    ? `NONAME — discesa del giorno ${state.dailyDate}`
    : "NONAME — una discesa";
  const fate =
    state.status === "escaped" ? "Sono uscito" : "Il labirinto mi ha tenuto";
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/discesa?seed=${state.seed}`
      : `seme ${state.seed}`;
  return [
    header,
    `${fate}: «${ending.title}»`,
    `${bar} profondità ${state.depth}/${FINAL_DEPTH}`,
    `${state.nodeCount} scelte · lucidità ${state.sanity} · l'Entità mi ha trovato ${state.entitySeen ?? 0} volte`,
    `Scendi nello stesso labirinto: ${url}`,
  ].join("\n");
}

/**
 * Cosa è andato storto (o giusto): un indizio in tono, non una spiegazione,
 * che aiuti a capire come fare meglio la prossima volta.
 */
function lesson(state: GameState): string | null {
  switch (state.endingId) {
    case "vuoto":
      return "La mente ha ceduto. Più scendi, meno il riposo ti riporta su: nel Ventre non si torna interi. Conserva la lucidità per là sotto — o portati di che curarla.";
    case "assorbito":
      return "Guardarla è una via — ma sotto una certa lucidità è fatale. Guardala quando sei ancora abbastanza saldo da reggere ciò che vedi.";
    case "annegato":
      return "La crepa non perdona chi ci si spinge già a pezzi. Arriva alla porta con un po' di lucidità in tasca, o trova la chiave.";
    case "strisciato":
      return "Sei passato dalla crepa: la via stretta, quella che lascia indietro qualcosa. Con la chiave, o con un nome, si esce interi.";
    case "alba_grigia":
      return "Sei uscito con la chiave, ma logorato. Arriva alla porta più lucido e l'alba sarà di un altro colore.";
    case "rimasto":
      return "Non è stata la morte: è stata la resa. La porta era lì. La prossima volta, aprila.";
    case "ruota":
      return "Avevi capito tutto — ma il vero nome si pronuncia solo restando abbastanza lucidi da ricordarlo. Rifà' la stessa strada, ma arriva alla porta con più di te intatto.";
    case "primo_nome":
      return null; // chi arriva qui non ha bisogno di consigli.
    default:
      return null;
  }
}

function EndingScreen({
  state,
  prevBest,
  onRestart,
  onMenu,
}: {
  state: GameState;
  prevBest: number | null;
  onRestart: () => void;
  onMenu: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [meta, setMeta] = useState<MetaState | null>(null);
  useEffect(() => setMeta(loadMeta()), []);

  const ending = ENDINGS[state.endingId ?? "vuoto"] ?? ENDINGS.vuoto;
  const accent =
    ending.tone === "light"
      ? "#d8c98f"
      : ending.tone === "grey"
        ? "var(--color-ash)"
        : "var(--color-ember)";

  const newRecord = prevBest !== null && state.depth > prevBest;
  const record = meta?.bestDepth ?? state.depth;

  async function share() {
    try {
      await navigator.clipboard.writeText(shareText(state, ending));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard negata: pazienza */
    }
  }

  return (
    <main className="veil relative flex min-h-dvh items-center justify-center overflow-hidden px-6">
      <div className="scanlines" />
      <div className="relative z-10 mx-auto max-w-2xl py-16 text-center">
        <p className="rise font-mono text-xs tracking-[0.5em] text-(--color-ash) uppercase">
          {state.status === "escaped" ? "la discesa finisce" : "la discesa ti finisce"}
        </p>
        <h1
          data-text={ending.title}
          className="glitch rise mt-4 font-serif text-5xl font-semibold tracking-wide sm:text-6xl"
          style={{ color: accent, animationDelay: "0.2s" }}
        >
          {ending.title}
        </h1>
        <p
          className="rise mt-6 font-serif text-lg leading-relaxed text-(--color-bone)/90"
          style={{ animationDelay: "0.6s" }}
        >
          {ending.text}
        </p>

        {lesson(state) && (
          <p
            className="rise mx-auto mt-5 max-w-md border-t border-(--color-smoke) pt-4 font-serif text-sm leading-snug text-(--color-ash)/90 italic"
            style={{ animationDelay: "0.85s" }}
          >
            {lesson(state)}
          </p>
        )}

        <div
          className="rise mt-6 space-y-1 font-mono text-xs tracking-[0.3em] text-(--color-ash)/80 uppercase"
          style={{ animationDelay: "1s" }}
        >
          <p>
            {state.nodeCount} scelte · profondità {state.depth} · lucidità {state.sanity}
          </p>
          <p>
            l&apos;entità ti ha trovato {state.entitySeen ?? 0}{" "}
            {(state.entitySeen ?? 0) === 1 ? "volta" : "volte"}
          </p>
          {newRecord ? (
            <p style={{ color: accent }}>
              nuovo record di profondità — prima: {prevBest}
            </p>
          ) : (
            <p>il tuo record: profondità {record}</p>
          )}
          {meta && (
            <p>
              finali scoperti: {meta.endingsSeen.length}/{Object.keys(ENDINGS).length}
            </p>
          )}
          {state.dailyDate && <p>discesa del giorno {state.dailyDate}</p>}
        </div>

        <div
          className="rise mx-auto mt-8 flex max-w-sm flex-col gap-3"
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
            onClick={share}
            className="choice cursor-pointer border border-(--color-smoke) bg-(--color-coal) px-6 py-3 text-left font-mono text-sm tracking-widest text-(--color-bone) uppercase"
          >
            <span className="choice-marker mr-3">▸</span>
            {copied ? "copiato — portalo di sopra" : "Racconta la discesa"}
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
