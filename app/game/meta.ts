import type { GameState } from "./types";
import { mixSeed } from "./rng";
import { LORE_FRAGMENTS } from "./content";

/**
 * Memoria persistente tra le run: il labirinto ricorda chi sei stato.
 * Vive in localStorage, separata dal salvataggio della run corrente.
 */
export interface MetaState {
  version: number;
  /** Run concluse (morte o fuga). */
  runs: number;
  deaths: number;
  escapes: number;
  bestDepth: number;
  totalChoices: number;
  /** Volte in cui l'Entità ti ha trovato, in tutte le run. */
  entityMet: number;
  /** Id dei finali visti almeno una volta. */
  endingsSeen: string[];
  /** Finale dell'ultima run conclusa: certe cose, laggiù, se lo ricordano. */
  lastEndingId?: string;
  /** Date (YYYY-MM-DD) delle discese del giorno completate. */
  dailiesDone: string[];
  /** Id dei frammenti della Ricorrenza scoperti almeno una volta. */
  fragments: string[];
}

const KEY = "noname.meta.v1";
const PREFS_KEY = "noname.prefs.v1";

function emptyMeta(): MetaState {
  return {
    version: 1,
    runs: 0,
    deaths: 0,
    escapes: 0,
    bestDepth: 0,
    totalChoices: 0,
    entityMet: 0,
    endingsSeen: [],
    dailiesDone: [],
    fragments: [],
  };
}

export function loadMeta(): MetaState {
  if (typeof window === "undefined") return emptyMeta();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyMeta();
    const parsed = JSON.parse(raw) as MetaState;
    if (parsed?.version !== 1) return emptyMeta();
    return { ...emptyMeta(), ...parsed };
  } catch {
    return emptyMeta();
  }
}

function saveMeta(meta: MetaState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(meta));
  } catch {
    /* storage pieno o bloccato: la memoria resta in RAM */
  }
}

/** Da chiamare una sola volta, nel momento in cui la run si conclude. */
export function recordRunEnd(state: GameState): MetaState {
  const meta = loadMeta();
  meta.runs += 1;
  if (state.status === "dead") meta.deaths += 1;
  if (state.status === "escaped") meta.escapes += 1;
  meta.bestDepth = Math.max(meta.bestDepth, state.depth);
  meta.totalChoices += state.nodeCount;
  meta.entityMet += state.entitySeen ?? 0;
  if (state.endingId && !meta.endingsSeen.includes(state.endingId)) {
    meta.endingsSeen.push(state.endingId);
  }
  meta.lastEndingId = state.endingId;
  if (state.dailyDate && !meta.dailiesDone.includes(state.dailyDate)) {
    meta.dailiesDone.push(state.dailyDate);
  }
  // Sweep finale: assicura che ogni frammento sbloccato sia registrato.
  for (const fr of LORE_FRAGMENTS) {
    if (state.flags.includes(fr.flag) && !meta.fragments.includes(fr.id)) {
      meta.fragments.push(fr.id);
    }
  }
  saveMeta(meta);
  return meta;
}

/**
 * Registra i frammenti della Ricorrenza sbloccati dai flag correnti.
 * Chiamata dopo ogni scelta: la scoperta si conserva anche se abbandoni.
 * Ritorna gli id appena scoperti (per il messaggio di scoperta).
 */
export function recordFragmentsFromFlags(flags: string[]): string[] {
  const meta = loadMeta();
  const added: string[] = [];
  for (const fr of LORE_FRAGMENTS) {
    if (flags.includes(fr.flag) && !meta.fragments.includes(fr.id)) {
      meta.fragments.push(fr.id);
      added.push(fr.id);
    }
  }
  if (added.length) saveMeta(meta);
  return added;
}

/* ------------------------------------------------------------------ */
/* Discesa del giorno                                                  */
/* ------------------------------------------------------------------ */

/** Data locale in formato YYYY-MM-DD. */
export function todayString(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const g = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${g}`;
}

/** Seme deterministico dalla data: la stessa discesa per tutti, per un giorno. */
export function dailySeed(dateStr: string): number {
  const parts = dateStr.split("").map((c) => c.charCodeAt(0));
  return mixSeed(0x5eed, ...parts);
}

/* ------------------------------------------------------------------ */
/* Preferenze                                                          */
/* ------------------------------------------------------------------ */

export interface Prefs {
  /** Testo battuto a macchina invece che immediato. */
  typewriter: boolean;
}

export function loadPrefs(): Prefs {
  if (typeof window === "undefined") return { typewriter: false };
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    return { typewriter: false, ...(raw ? JSON.parse(raw) : null) };
  } catch {
    return { typewriter: false };
  }
}

export function savePrefs(prefs: Prefs) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}
