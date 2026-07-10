export type ItemId =
  | "lanterna"
  | "chiave_arrugginita"
  | "amuleto_osso"
  | "campanella"
  | "diario_strappato"
  | "scheggia_specchio"
  | "bende";

export const ITEM_LABELS: Record<ItemId, string> = {
  lanterna: "Lanterna a olio",
  chiave_arrugginita: "Chiave arrugginita",
  amuleto_osso: "Amuleto d'osso",
  campanella: "Campanella d'argento",
  diario_strappato: "Diario strappato",
  scheggia_specchio: "Scheggia di specchio",
  bende: "Bende sporche",
};

export interface GameState {
  version: number;
  seed: number;
  /** Quante scelte sono state fatte: entra nel seed di ogni nodo. */
  nodeCount: number;
  /** Avanzamento nel labirinto (0 → FINAL_DEPTH). */
  depth: number;
  /** 0–100. A zero, la mente cede. */
  sanity: number;
  /** Quanto l'Entità ti ha preso di mira. */
  aggression: number;
  items: ItemId[];
  flags: string[];
  status: "alive" | "dead" | "escaped";
  endingId?: string;
  lastOutcome?: string;
  log: string[];
  /** Quante volte l'Entità ti ha trovato, in questa run. */
  entitySeen?: number;
  /** Se valorizzata (YYYY-MM-DD), è la discesa del giorno: seme condiviso da tutti. */
  dailyDate?: string;
}

export interface ChoiceEffect {
  sanity?: number;
  depthDelta?: number;
  aggression?: number;
  addItems?: ItemId[];
  removeItems?: ItemId[];
  addFlags?: string[];
  /** Testo mostrato dopo la scelta. */
  outcome: string;
  /** Se valorizzati, la run termina. */
  death?: string;
  escape?: string;
}

export interface Choice {
  id: string;
  label: string;
  hint?: string;
  effect: ChoiceEffect;
}

export interface GameNode {
  zone: string;
  title: string;
  paragraphs: string[];
  choices: Choice[];
  kind: "room" | "entity" | "milestone" | "final";
}

export interface Ending {
  title: string;
  text: string;
  tone: "dark" | "grey" | "light";
}

export const FINAL_DEPTH = 30;
