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

/** A cosa serve ogni oggetto: mostrato nel modale dello zaino. In tono, ma chiaro. */
export const ITEM_INFO: Record<ItemId, string> = {
  lanterna:
    "Tiene il buio a un mezzo passo. Finché ce l'hai, l'Entità ti trova un po' meno spesso e frugare nelle stanze è meno rischioso. La perdi solo se la offri a qualcuno.",
  chiave_arrugginita:
    "Ferro per una porta di ferro. È il modo più pulito di aprire l'uscita, laggiù in fondo. Si trova in profondità, o la dona il Custode a chi è gentile.",
  amuleto_osso:
    "Attutisce i colpi alla mente: finché lo porti, ogni perdita di lucidità pesa meno. Non si consuma — protegge in silenzio per tutta la discesa.",
  campanella:
    "Un solo rintocco, tenuto in serbo da tempo. Suonata davanti all'Entità la congeda per sempre e spezza del tutto la caccia. Si sbriciola dopo l'uso.",
  diario_strappato:
    "Si riempie da solo, una pagina alla volta. Consultarlo ridà un po' di lucidità e, più scendi, più dice cose vere — che non sempre vuoi sapere.",
  scheggia_specchio:
    "Mostrata all'Entità, la costringe a vedersi: si ritira, e per un po' ti perde di vista. È l'arma di riserva se non hai la campanella. Si spegne dopo l'uso.",
  bende:
    "Un solo utilizzo. Fasciarti le mani ridà lucidità quando sei ormai a pezzi: non è la stoffa a curare, è il gesto.",
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
  /** Livello di caccia: quanto l'Entità ti sta seguendo, adesso. 0 = ti ha perso. */
  caccia?: number;
  /** Se sei precipitato in un sotto-livello: il suo nome, e quante stanze restano. */
  subZone?: string;
  subLeft?: number;
  /** Se valorizzata (YYYY-MM-DD), è la discesa del giorno: seme condiviso da tutti. */
  dailyDate?: string;
}

export interface ChoiceEffect {
  sanity?: number;
  depthDelta?: number;
  aggression?: number;
  /** Variazione del livello di caccia. Negativo grande = la scrolli del tutto. */
  cacciaDelta?: number;
  /** Precipita in un sotto-livello: attraverserai `rooms` stanze prima di risalire. */
  enterSub?: { zone: string; rooms: number };
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
  /** Stanza rara: si incontra di rado, e l'interfaccia la distingue. */
  rare?: boolean;
}

export interface Ending {
  title: string;
  text: string;
  tone: "dark" | "grey" | "light";
}

export const FINAL_DEPTH = 30;
