import type { GameState } from "./types";

const KEY = "noname.run.v1";

export function loadRun(): GameState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (parsed?.version !== 1 || typeof parsed.seed !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveRun(state: GameState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // storage pieno o bloccato: il gioco continua in memoria
  }
}

export function clearRun() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
