import { mulberry32, mixSeed, pick, chance, between, randomSeed, type Rng } from "./rng";
import {
  ZONES,
  SOTTOFONDO,
  WHISPERS,
  ADVANCE_LABELS,
  RARE_ROOMS,
  DIARY_COMMON,
  STALK_FAR,
  STALK_CLOSE,
  type RareRoom,
} from "./content";
import {
  FINAL_DEPTH,
  type Choice,
  type GameNode,
  type GameState,
  type ItemId,
} from "./types";

export interface NewGameOptions {
  /** Seme esplicito: discesa del giorno o discesa condivisa da un altro giocatore. */
  seed?: number;
  /** Data (YYYY-MM-DD) se questa è la discesa del giorno. */
  dailyDate?: string;
  /** L'ultima run è finita tra le sue mani: l'Entità ti riconosce. */
  hauntedByEntity?: boolean;
}

export function newGame(opts: NewGameOptions = {}): GameState {
  return {
    version: 1,
    seed: opts.seed ?? randomSeed(),
    nodeCount: 0,
    depth: 0,
    sanity: 100,
    aggression: 0,
    items: ["lanterna"],
    flags: opts.hauntedByEntity ? ["riconosciuto"] : [],
    status: "alive",
    log: [],
    entitySeen: 0,
    caccia: 0,
    dailyDate: opts.dailyDate,
  };
}

const has = (s: GameState, item: ItemId) => s.items.includes(item);
const flag = (s: GameState, f: string) => s.flags.includes(f);
const hunt = (s: GameState) => s.caccia ?? 0;

function zoneFor(depth: number) {
  return [...ZONES].reverse().find((z) => depth >= z.minDepth) ?? ZONES[0];
}

/** Il logorio dello scendere: cresce con la profondità. Scendere è il prezzo. */
function dreadCost(depth: number, rng: Rng): number {
  const base = 1 + Math.floor(depth / 10); // 1 nelle Soglie → 3-4 nel Ventre
  const spike = chance(rng, 0.35) ? between(rng, 1, 2) : 0;
  return base + spike;
}

/**
 * Il tetto di lucidità a cui il riposo può riportarti, per zona.
 * Più scendi, meno la mente si ricompone: quaggiù non si torna interi.
 */
function restCeiling(depth: number): number {
  if (depth >= 19) return 62; // Il Ventre
  if (depth >= 9) return 82; // Le Vene
  return 100; // Le Soglie
}

/**
 * Genera il nodo corrente in modo deterministico da (seed, nodeCount).
 * Lo stesso stato produce sempre lo stesso nodo: il salvataggio è solo lo stato.
 */
export function generateNode(state: GameState): GameNode {
  const rng = mulberry32(mixSeed(state.seed, state.nodeCount + 1, state.depth * 7));

  if (state.depth >= FINAL_DEPTH) return finalDoorNode(state, rng);

  const inSub = (state.subLeft ?? 0) > 0;

  // Le milestone sono sulla discesa principale: nel Sottofondo non appaiono.
  if (!inSub) {
    const milestone = milestoneNode(state, rng);
    if (milestone) return milestone;
  }

  // La lanterna tiene il buio — e ciò che lo abita — un mezzo passo più in là.
  // Se sei braccato, invece, l'Entità sa sempre dove sei: appare molto più spesso.
  // E ti segue ovunque, anche quaggiù nel Sottofondo.
  const entityChance =
    0.06 +
    state.aggression * 0.035 +
    (state.sanity < 40 ? 0.08 : 0) -
    (has(state, "lanterna") ? 0.02 : 0) +
    hunt(state) * 0.07;
  const entityCap = hunt(state) > 0 ? 0.62 : 0.5;
  if (state.depth > 4 && chance(rng, Math.min(entityChance, entityCap))) {
    return entityNode(state, rng);
  }

  // Nel Sottofondo: stanze allagate, finché non risali.
  if (inSub) return subZoneNode(state, rng);

  // La voragine: un buco nel pavimento che ti fa precipitare più in fondo,
  // in un luogo che non è sulla mappa di nessuno.
  if (state.depth > 6 && state.depth < FINAL_DEPTH - 4 && chance(rng, 0.05)) {
    return voragineNode(state, rng);
  }

  // Il corridoio che si ripiega: il labirinto non è dritto, e a volte ti riporta su.
  if (state.depth > 5 && chance(rng, 0.045 + hunt(state) * 0.02)) {
    return foldingNode(state, rng);
  }

  // Stanze rare: una ogni cinquanta, circa. Chi le trova ne parla.
  if (state.depth > 2 && chance(rng, 0.02)) {
    return rareRoomNode(state, rng);
  }

  return roomNode(state, rng);
}

/* ------------------------------------------------------------------ */
/* Stanze normali                                                      */
/* ------------------------------------------------------------------ */

function roomNode(state: GameState, rng: Rng): GameNode {
  const zone = zoneFor(state.depth);
  const room = pick(rng, zone.rooms);
  const paragraphs = [...room.text, pick(rng, zone.details)];

  // Se l'Entità ti sta seguendo, il labirinto te lo fa sapere.
  if (hunt(state) > 0) {
    paragraphs.push(pick(rng, hunt(state) >= 3 ? STALK_CLOSE : STALK_FAR));
  }

  if (state.sanity < 45) {
    const pool = flag(state, "specchio_visto")
      ? [...WHISPERS, "ha sorriso, ricordi? ha passato il turno. a te."]
      : WHISPERS;
    paragraphs.push(`« ${pick(rng, pool)} »`);
  }

  const choices: Choice[] = [];

  // Avanzare: sempre disponibile. Scendere costa, e costa di più man mano.
  const advanceCost = dreadCost(state.depth, rng);
  choices.push({
    id: "advance",
    label: pick(rng, ADVANCE_LABELS),
    effect: {
      depthDelta: 1,
      sanity: -advanceCost,
      outcome:
        advanceCost >= 4
          ? "Avanzi, e ogni passo pesa come dieci. Il buio qui è denso, entra nei polmoni, e lascia meno di te dall'altra parte."
          : "Avanzi. Il buio ti pesa addosso come un cappotto bagnato, ma i tuoi passi tengono il ritmo.",
    },
  });

  // Frugare: possibile oggetto, possibile prezzo. La lanterna aiuta a vedere cosa tocchi.
  if (chance(rng, 0.55)) {
    const loot = rollLoot(state, rng);
    const bad = chance(rng, has(state, "lanterna") ? 0.28 : 0.45);
    choices.push({
      id: "search",
      label: "Fruga nella stanza",
      hint: "Qualcosa luccica. Qualcosa osserva.",
      effect:
        loot && !bad
          ? {
              addItems: [loot.id],
              sanity: -2,
              outcome: loot.outcome,
            }
          : {
              sanity: -between(rng, 5, 11),
              aggression: 1,
              outcome:
                "Le tue dita trovano solo polvere — e, per un istante, altre dita. Ritiri la mano. Qualcosa, nel buio, ha annotato la tua posizione.",
            },
    });
  }

  // Riposare: recupero, ma solo fino al tetto della zona — e se sei braccato,
  // chiudere gli occhi è quasi sempre un errore.
  const ceiling = restCeiling(state.depth);
  if (state.sanity < ceiling - 4 && chance(rng, 0.7)) {
    const ambush = chance(rng, 0.22 + state.aggression * 0.03 + hunt(state) * 0.12);
    const rawHeal = between(rng, 9, 16);
    const heal = Math.min(rawHeal, ceiling - state.sanity);
    choices.push({
      id: "rest",
      label: "Fermati a riprendere fiato",
      hint:
        ceiling < 100
          ? "Qui sotto il riposo non ti ridà tutto. Ma qualcosa è meglio di niente."
          : "Chiudere gli occhi, qui, è una dichiarazione di fiducia.",
      effect: ambush
        ? {
            sanity: -between(rng, 9, 15),
            aggression: 2,
            cacciaDelta: hunt(state) > 0 ? 1 : 0,
            outcome:
              hunt(state) > 0
                ? "Chiudi gli occhi un istante — ed è lì che ti raggiunge. Quando li riapri, l'aria davanti a te ha la forma di qualcosa che si è appena chinato a guardarti dormire."
                : "Chiudi gli occhi. Quando li riapri, la stanza è la stessa ma le distanze no: tutto è un passo più vicino. Anche ciò che non vedi.",
          }
        : {
            sanity: heal,
            aggression: 1,
            outcome:
              "Ti fermi. Respiri. Il cuore rallenta e i pensieri tornano tuoi. Ma il riposo, qui sotto, ha un odore — e qualcosa lo sta seguendo.",
          },
    });
  }

  // Le bende: un uso solo, ma vero.
  if (has(state, "bende") && state.sanity < 55) {
    choices.push({
      id: "bandage",
      label: "Fascia le mani con le bende",
      hint: "Odorano di canfora. E di chi le ha piegate con cura.",
      effect: {
        removeItems: ["bende"],
        sanity: between(rng, 12, 18),
        outcome:
          "Ti fasci le mani, piano, come ti hanno insegnato in un ricordo che non trovi più. Non è la stoffa a curare: è il gesto. Per qualche minuto le tue mani sono di qualcuno che verrà salvato.",
      },
    });
  }

  // Scorciatoia rischiosa.
  if (chance(rng, 0.3)) {
    const brutal = chance(rng, 0.5);
    choices.push({
      id: "shortcut",
      label: "Infilati nel passaggio stretto",
      hint: "Scende in fretta. Troppo in fretta.",
      effect: {
        depthDelta: 2,
        sanity: -(brutal ? between(rng, 10, 16) : between(rng, 4, 8)),
        outcome: brutal
          ? "Il cunicolo si stringe finché non devi espirare per passare. Per tre metri interi sei certo che le pareti stiano deglutendo. Poi, di colpo, sei oltre — molto più in profondità."
          : "Ti cali nel passaggio. È stretto, caldo, e pulsa. Ma è rapido: quando riemergi, il labirinto sopra di te è già lontano.",
      },
    });
  }

  // Ascoltare: informazione al prezzo di lucidità.
  if (chance(rng, 0.35)) {
    choices.push({
      id: "listen",
      label: "Fermati ad ascoltare il buio",
      effect: {
        sanity: -between(rng, 3, 7),
        aggression: -1,
        addFlags: ["ha_ascoltato"],
        outcome:
          "Trattieni il fiato. Il buio parla piano, di porte e di chiavi, di un custode che aspetta e di un'acqua che ricorda. Quando smette, sai qualcosa in più. E qualcosa in più sa di te.",
      },
    });
  }

  // Il diario, se lo possiedi, ogni tanto si aggiorna. Ogni pagina è diversa,
  // e più scendi, più dice la verità — che non è una buona notizia.
  if (has(state, "diario_strappato") && chance(rng, 0.32)) {
    const entry = pick(rng, diaryPool(state));
    choices.push({
      id: "diary",
      label: "Consulta il diario strappato",
      hint: "Le pagine si riempiono da sole, una notte alla volta.",
      effect: { sanity: entry.sanity, outcome: entry.text },
    });
  }

  return {
    zone: zone.name,
    title: room.title,
    paragraphs,
    choices: choices.slice(0, 4),
    kind: "room",
  };
}

interface DiaryEntry {
  text: string;
  sanity: number;
}

/**
 * Le pagine del diario. Alcune sono comuni; altre affiorano solo in certi
 * stati (braccato, patto, in profondità) e prevalgono quando disponibili.
 * Curano poco — o niente — ma dicono cose vere.
 */
function diaryPool(state: GameState): DiaryEntry[] {
  const pool: DiaryEntry[] = [...DIARY_COMMON];

  if (hunt(state) >= 2) {
    return [
      {
        text: "Una sola riga, ripetuta fitta per tutta la pagina con calligrafie che diventano sempre meno tue: «non correre non correre non correre». L'ultima riga non la finisci di leggere: l'inchiostro è ancora umido.",
        sanity: -3,
      },
      {
        text: "Una pagina strappata a metà. Resta: «se lo senti dietro, non voltarti a contare quanto è vicino. Contare lo—» Il resto manca. Sai già come finiva.",
        sanity: -2,
      },
    ];
  }

  if (flag(state, "patto")) {
    pool.push({
      text: "Al centro della pagina, una sola parola: il nome che tieni sotto la lingua, scritto da una mano che trema. Attorno, decine di volte, la stessa domanda con inchiostri diversi: «era mio, questo nome? era mio?»",
      sanity: 0,
    });
  }
  if (state.depth >= 19) {
    pool.push({
      text: "Una mappa che non corrisponde a niente che tu ricordi di aver percorso. In fondo, la tua calligrafia, calma: «più scendi, più il diario dice la verità. Ti sto avvisando: smetti di leggerlo.»",
      sanity: -1,
    });
  }
  if (state.entitySeen && state.entitySeen >= 2) {
    pool.push({
      text: "Un ritratto, tracciato in fretta: una figura alta quanto la pagina, senza volto. Sotto, una didascalia: «non è un mostro. è un custode anche lui. aspetta solo che tu smetta di essere un ospite.»",
      sanity: 1,
    });
  }
  return pool;
}

function rollLoot(
  state: GameState,
  rng: Rng,
): { id: ItemId; outcome: string } | null {
  const pool: { id: ItemId; outcome: string }[] = [];
  if (!has(state, "chiave_arrugginita") && state.depth >= 12)
    pool.push({
      id: "chiave_arrugginita",
      outcome:
        "Sotto un'asse smossa, avvolta in un fazzoletto, una chiave di ferro mangiata dalla ruggine. È pesante, fredda, e sembra contenta di essere stata trovata.",
    });
  if (!has(state, "campanella"))
    pool.push({
      id: "campanella",
      outcome:
        "Una campanella d'argento, minuscola, senza batacchio visibile. Eppure, quando la sollevi, qualcosa dentro di lei si prepara a suonare.",
    });
  if (!has(state, "amuleto_osso"))
    pool.push({
      id: "amuleto_osso",
      outcome:
        "Un amuleto intagliato in un osso liscio e giallo. Le incisioni ti sembrano familiari, come una parola sulla punta della lingua. Lo metti al collo. Il buio si fa un mezzo passo indietro.",
    });
  if (!has(state, "diario_strappato"))
    pool.push({
      id: "diario_strappato",
      outcome:
        "Un diario a cui mancano le prime cento pagine. Le ultime sono bianche. Mentre lo tieni in mano, sulla prima riga compare lentamente la data di oggi.",
    });
  if (!has(state, "bende"))
    pool.push({
      id: "bende",
      outcome:
        "Un rotolo di bende, usate ma piegate con cura. Odorano di canfora e di qualcosa di più vecchio della canfora.",
    });
  return pool.length ? pick(rng, pool) : null;
}

/* ------------------------------------------------------------------ */
/* Stanze rare                                                         */
/* ------------------------------------------------------------------ */

function rareRoomNode(state: GameState, rng: Rng): GameNode {
  const room: RareRoom = pick(rng, RARE_ROOMS);
  const choices: Choice[] = [];

  if (room.id === "lucciole") {
    choices.push(
      {
        id: "stay_light",
        label: "Resta un poco, in mezzo alle luci",
        hint: "Nessuno le ha mai viste due volte.",
        effect: {
          sanity: between(rng, 18, 26),
          aggression: -2,
          outcome:
            "Resti. Le luci ti si posano addosso senza peso, e per qualche minuto il labirinto smette di essere il labirinto: è solo una stanza buia piena di piccole stelle pazienti. Quando esci, respiri come chi ha dormito una notte intera.",
        },
      },
      {
        id: "advance",
        label: "Attraversa la stanza senza fermarti",
        effect: {
          depthDelta: 1,
          outcome:
            "Attraversi la stanza a testa bassa. Le luci ti si scostano davanti come acqua. Sulla porta, per un attimo, ti pare che una di loro ti segua. Poi ci ripensa.",
        },
      },
    );
  } else if (room.id === "telefono") {
    choices.push(
      {
        id: "answer",
        label: "Rispondi",
        hint: "Squilla per te. Da quanto?",
        effect: {
          sanity: -between(rng, 6, 10),
          aggression: -3,
          addFlags: ["telefono_risposto"],
          outcome:
            "Sollevi la cornetta. Dall'altra parte, un respiro — e poi la tua voce, più vecchia, che dice in fretta: «Il ferro si trova sotto le assi. Il nome si paga. E quando lei ti guarda, tu guardala prima.» Click. Il filo, ora, esce dal pavimento tagliato di netto.",
        },
      },
      {
        id: "unplug",
        label: "Strappa il filo",
        effect: {
          sanity: -4,
          aggression: 1,
          outcome:
            "Strappi il filo dal pavimento. Il telefono continua a squillare per tre secondi buoni — a filo staccato — poi smette, offeso. Da qualche parte, in basso, qualcuno riappende con calma.",
        },
      },
      {
        id: "advance",
        label: "Lascialo squillare e prosegui",
        effect: {
          depthDelta: 1,
          sanity: -2,
          outcome:
            "Esci dalla stanza con lo squillo alle spalle. Continua a lungo, sempre più fioco, e smette solo quando ormai non potresti più tornare indietro a rispondere. Esattamente in quel momento.",
        },
      },
    );
  } else {
    // Il dormiente: le cose che non hai ancora trovato, in fila ordinata.
    const missing = rollLoot(state, rng);
    choices.push(
      {
        id: "take",
        label: "Prendi qualcosa dalla fila, senza svegliarlo",
        hint: "In fondo, è roba tua. In un certo senso.",
        effect: missing
          ? {
              addItems: [missing.id],
              sanity: -8,
              aggression: 1,
              addFlags: ["dormiente_visto"],
              outcome:
                "Allunghi la mano, piano. Il respiro del dormiente non cambia — ma mentre ti allontani con l'oggetto, senza voltarsi, con la tua voce impastata di sonno, dice: «Ridallo indietro quando arrivi. Io l'ho fatto.»",
            }
          : {
              sanity: -10,
              aggression: 1,
              addFlags: ["dormiente_visto"],
              outcome:
                "Ti avvicini, ma la fila di oggetti è vuota: solo impronte nella polvere, della forma esatta delle cose che hai già in tasca. Il dormiente sospira nel sonno. Sembra deluso.",
            },
      },
      {
        id: "wake",
        label: "Sveglialo",
        hint: "No.",
        effect: {
          sanity: -between(rng, 16, 22),
          addFlags: ["dormiente_visto"],
          outcome:
            "Gli tocchi la spalla. Il dormiente si volta lentissimo — e non ha la tua faccia: ha la faccia che avrai quando sarà finita. Ti guarda con una pietà insopportabile, mormora «ancora?», e si rimette a dormire. Te ne vai in fretta.",
        },
      },
      {
        id: "advance",
        label: "Esci in punta di piedi",
        effect: {
          depthDelta: 1,
          sanity: 2,
          outcome:
            "Esci come si esce dalla stanza di un malato: senza far rumore, senza guardare troppo. Che dorma. Uno di voi due, almeno.",
        },
      },
    );
  }

  return {
    zone: zoneFor(state.depth).name,
    title: room.title,
    paragraphs: [...room.text],
    choices: choices.slice(0, 4),
    kind: "room",
    rare: true,
  };
}

/* ------------------------------------------------------------------ */
/* La voragine e il Sottofondo: precipitare fuori dalla mappa           */
/* ------------------------------------------------------------------ */

function voragineNode(state: GameState, rng: Rng): GameNode {
  const zone = zoneFor(state.depth);
  return {
    zone: zone.name,
    title: "La voragine",
    paragraphs: [
      "Il pavimento davanti a te non c'è più. Al suo posto un buco dai bordi frastagliati, largo quanto la stanza, e dentro il buio è di una qualità diversa: più vecchio, più bagnato. Da giù sale un odore di acqua ferma e un suono lentissimo, come di qualcosa di grande che dorme.",
      "Puoi aggirarlo rasente il muro. Oppure lasciarti andare: si scende in fretta, di sicuro. Molto più in fretta di così.",
    ],
    choices: [
      {
        id: "fall",
        label: "Lasciati cadere nella voragine",
        hint: "Precipita. Dove, non sta scritto da nessuna parte.",
        effect: {
          depthDelta: 3,
          sanity: -between(rng, 14, 20),
          enterSub: { zone: "Il Sottofondo", rooms: 4 },
          outcome:
            "Ti lasci andare nel buio. Cadi per un tempo che non ha diritto di essere così lungo, e atterri in piedi in acqua nera. Sei sotto il labirinto, ora — sotto tutto. Molto più in fondo di prima, e in un posto che nessuna mappa conosce.",
        },
      },
      {
        id: "skirt",
        label: "Aggira il buco rasente il muro",
        effect: {
          depthDelta: 1,
          sanity: -between(rng, 3, 7),
          outcome:
            "Ti muovi a ridosso della parete, le dita aggrappate alla pietra umida, senza guardare giù. Dal fondo, qualcosa sospira — deluso, ti sembra. Poi sei di là.",
        },
      },
      {
        id: "peer",
        label: "Sporgiti a guardare cosa c'è sotto",
        hint: "Alcune cose, viste, non si dimenticano.",
        effect: {
          sanity: -between(rng, 8, 13),
          aggression: 1,
          outcome:
            "Ti sporgi. In fondo, sotto un velo d'acqua nera, dormono delle figure in fila — e ognuna, ne sei certo, ha la tua faccia. Una apre gli occhi e ti guarda risalire lo sguardo. Ti ritrai, ma ormai lo sai: là sotto c'è posto anche per te.",
        },
      },
    ],
    kind: "room",
    rare: true,
  };
}

function subZoneNode(state: GameState, rng: Rng): GameNode {
  const room = pick(rng, SOTTOFONDO.rooms);
  const paragraphs = [...room.text, pick(rng, SOTTOFONDO.details)];
  if (state.sanity < 45) paragraphs.push(`« ${pick(rng, WHISPERS)} »`);

  const last = (state.subLeft ?? 0) <= 1;
  const choices: Choice[] = [];

  choices.push({
    id: "advance",
    label: last ? "Risali verso il labirinto" : "Avanza nell'acqua nera",
    hint: last ? "C'è un varco, sopra di te. La luce del labirinto, quasi un sollievo." : undefined,
    effect: {
      depthDelta: 1,
      sanity: -between(rng, 2, 6),
      outcome: last
        ? "Trovi un varco nella volta e ti issi fuori dall'acqua, nel labirinto vero. Non è mai stato accogliente — ma dopo il Sottofondo, quasi lo sembra. Sei sceso parecchio, nel frattempo."
        : "Avanzi nell'acqua, che non fa rumore e non lascia scia. Il Sottofondo continua, uguale a sé stesso in ogni direzione, come un pensiero che si ripete.",
    },
  });

  // Qui sotto si trova ciò che il labirinto sopra ti negava.
  if (chance(rng, 0.6)) {
    const loot = rollLoot(state, rng);
    if (loot) {
      choices.push({
        id: "search",
        label: "Fruga sul fondo con le mani",
        hint: "L'acqua nasconde. A volte, cose utili.",
        effect: {
          addItems: [loot.id],
          sanity: -between(rng, 3, 6),
          outcome: loot.outcome,
        },
      });
    }
  }

  choices.push({
    id: "listen",
    label: "Ascolta la voce che sale dal fondo",
    hint: "Da qui, le parole si capiscono.",
    effect: {
      sanity: -between(rng, 5, 9),
      addFlags: ["ha_ascoltato"],
      outcome:
        "Trattieni il fiato. La voce del pozzo, da quaggiù, non è più un'eco: è nitida, e dice il tuo nome — quello vero, quello che credevi di aver dimenticato — con una tenerezza terribile, come si chiama qualcuno a cena. Poi tace, soddisfatta di essere stata capita.",
    },
  });

  return {
    zone: SOTTOFONDO.name,
    title: room.title,
    paragraphs,
    choices: choices.slice(0, 4),
    kind: "room",
    rare: true,
  };
}

function foldingNode(state: GameState, rng: Rng): GameNode {
  const zone = zoneFor(state.depth);
  const choices: Choice[] = [];

  // Il diario mostra la via: chi ce l'ha attraversa senza perdere terreno.
  if (has(state, "diario_strappato")) {
    choices.push({
      id: "diary",
      label: "Apri il diario e cercane la pianta",
      hint: "Tre svolte sicure, ricordi?",
      effect: {
        depthDelta: 1,
        sanity: -2,
        outcome:
          "Apri il diario alla pagina della mappa. Le svolte sono segnate, due volte sottolineate. Le segui a occhi quasi chiusi, e il corridoio — che voleva ripiegarti indietro — è costretto a lasciarti passare. Emergi più in basso, non più in alto.",
      },
    });
  }

  choices.push({
    id: "push",
    label: "Insisti: deve pur finire da qualche parte",
    hint: "I corridoi finiscono. Questo, forse, no.",
    effect: chance(rng, 0.55)
      ? {
          depthDelta: -2,
          sanity: -between(rng, 6, 11),
          outcome:
            "Vai avanti deciso — e ti ritrovi all'imbocco da cui eri partito, come se il corridoio si fosse annodato alle tue spalle. Sei più in alto di prima. Il labirinto non è dritto: non lo è mai stato. Da qualche parte, una voce educata ripete: «non contare le porte».",
        }
      : {
          depthDelta: 1,
          sanity: -between(rng, 3, 6),
          outcome:
            "Vai avanti deciso, e stavolta il corridoio cede: si srotola, si arrende, ti lascia scendere. Non sai se hai vinto tu o se ha solo cambiato idea.",
        },
  });

  choices.push({
    id: "back",
    label: "Torna indietro e cerca un'altra via",
    effect: {
      depthDelta: -1,
      sanity: -between(rng, 2, 5),
      outcome:
        "Torni sui tuoi passi con calma, senza dare al corridoio la soddisfazione della fretta. Perdi un po' di strada, ma la ritrovi tua. È già qualcosa, quaggiù.",
    },
  });

  return {
    zone: zone.name,
    title: "Il corridoio che si ripiega",
    paragraphs: [
      "Il corridoio davanti a te è identico a quello che hai appena percorso: stessa crepa sul muro, stessa lampada morta, stessa macchia sul pavimento. Identico. Compresa l'impronta del tuo piede, ancora fresca, che punta nella direzione in cui stai andando.",
      "Il labirinto, qui, ha smesso di fingere di essere dritto. Si ripiega su sé stesso come un pensiero ossessivo, e tu sei dentro la piega.",
    ],
    choices: choices.slice(0, 4),
    kind: "room",
  };
}

/* ------------------------------------------------------------------ */
/* L'Entità                                                            */
/* ------------------------------------------------------------------ */

function entityNode(state: GameState, rng: Rng): GameNode {
  const zone = zoneFor(state.depth);
  const intensity = Math.min(state.aggression, 6);
  const descriptions = [
    "In fondo al passaggio, il buio ha una postura. Non si muove: aspetta che ti abitui alla sua presenza, come si fa con un ospite.",
    "È qui. Non la vedi — la senti come si sente uno sguardo sulla nuca in una stanza vuota. L'aria le fa spazio.",
    "La lampada più vicina si spegne per cortesia. L'Entità è nella stanza, alta quanto la stanza, ferma con la pazienza di ciò che non ha fretta perché non ha altro.",
  ];
  const paragraphs = [
    descriptions[Math.min(Math.floor(intensity / 2), descriptions.length - 1)],
    intensity >= 4
      ? "Questa volta è più vicina. Conosce il tuo passo, ormai. Lo sta imparando a memoria."
      : "Non ti ha ancora scelto. Ma prende appunti.",
  ];
  if (flag(state, "riconosciuto")) {
    paragraphs.push(
      "E c'è qualcosa di peggio della paura, nel modo in cui si volta verso di te: il riconoscimento. Vi siete già incontrati. È finita male. Per te.",
    );
  } else if (flag(state, "ha_visto")) {
    paragraphs.push(
      "Ma stavolta esita. L'hai guardata, una volta — nessuno la guarda — e da allora ti porta qualcosa che, nel suo vocabolario, somiglia al rispetto.",
    );
  }
  if (hunt(state) >= 2) {
    paragraphs.push(
      "Non è un incontro. È il seguito di tutti gli altri. Ti insegue da corridoi, e adesso ti ha messo all'angolo: lo capisci da come non si affretta.",
    );
  }
  if (state.sanity < 45) paragraphs.push(`« ${pick(rng, WHISPERS)} »`);

  const choices: Choice[] = [];

  // Il consiglio del Custode aiuta; l'essere braccato rende tutto più difficile.
  const freezeSafe = !chance(
    rng,
    0.42 +
      state.aggression * 0.05 +
      hunt(state) * 0.08 -
      (flag(state, "custode_amico") ? 0.15 : 0),
  );
  choices.push({
    id: "freeze",
    label: "Resta immobile e trattieni il fiato",
    effect: freezeSafe
      ? {
          sanity: -4,
          // Restare immobile ti fa sopravvivere, ma non ti fa perdere: resta sulle tue tracce.
          cacciaDelta: 1,
          outcome:
            "Diventi una cosa tra le cose. L'Entità ti scorre accanto come acqua attorno a un sasso, e per un lungo minuto il tuo cuore batte altrove. Poi il corridoio è di nuovo vuoto. Ma non se n'è andata: si è solo spostata.",
        }
      : {
          sanity: -between(rng, 12, 18),
          aggression: 1,
          cacciaDelta: 1,
          outcome:
            "Trattieni il fiato, ma il tuo cuore no. L'Entità si china — lentamente, con interesse — e per un istante il suo buio ti passa attraverso, frugando. Quando se ne va, mancano dei ricordi. Non sai quali.",
        },
  });

  choices.push({
    id: "flee",
    label: "Corri. Torna indietro",
    effect: {
      depthDelta: -1,
      sanity: -between(rng, 6, 10),
      aggression: -1,
      // Correre ti allontana, ma lei ti segue: la caccia non si spezza fuggendo.
      cacciaDelta: 1,
      outcome:
        "Corri senza voltarti, e il labirinto — per una volta complice — ti apre corridoi alle spalle. Quando ti fermi, sei più lontano dall'uscita. Ma i suoi passi, dietro di te, non hanno mai rallentato.",
    },
  });

  choices.push({
    id: "stare",
    label: "Guardala",
    hint: "Una parte di te lo vuole. Non è la parte migliore.",
    effect:
      state.sanity <= 22
        ? { death: "assorbito", outcome: "" }
        : {
            sanity: -between(rng, 14, 20),
            aggression: -3,
            // Vedersi guardata la disorienta: per un po' ti perde di vista.
            cacciaDelta: -2,
            addFlags: ["ha_visto"],
            outcome:
              "La guardi. È un errore e una rivelazione: dentro il suo buio ci sono corridoi, e in fondo ai corridoi una porta di ferro. L'Entità arretra — nessuno la guarda mai — e per un lungo momento non sa più dove sei. Tu resti in piedi, più leggero di qualche certezza.",
          },
  });

  if (has(state, "campanella")) {
    choices.push({
      id: "bell",
      label: "Suona la campanella d'argento",
      hint: "Qualcosa, dentro di lei, si è preparato a lungo.",
      effect: {
        removeItems: ["campanella"],
        sanity: 6,
        aggression: -99,
        cacciaDelta: -99,
        outcome:
          "La campanella suona una nota sola, pulita, impossibile in un posto simile. L'Entità si disfa come fumo in controluce — non uccisa: congedata. La campanella, esaurito il suo unico compito, ti si sbriciola in mano. Il labirinto, per la prima volta da molto, non ti guarda.",
      },
    });
  } else if (has(state, "scheggia_specchio")) {
    choices.push({
      id: "shard",
      label: "Mostrale la scheggia di specchio",
      effect: {
        removeItems: ["scheggia_specchio"],
        sanity: -5,
        aggression: -4,
        cacciaDelta: -99,
        outcome:
          "Alzi la scheggia. L'Entità vi si riflette — e vedersi, per lei, è insopportabile quanto per te. Si ritira urlando senza suono, e con lei si ritira la sensazione di essere seguito. La scheggia diventa nera e ti si spegne tra le dita.",
      },
    });
  }

  return {
    zone: zone.name,
    title: "Qualcosa è qui",
    paragraphs,
    choices: choices.slice(0, 4),
    kind: "entity",
  };
}

/* ------------------------------------------------------------------ */
/* Milestone: incontri fissi che ancorano la discesa                   */
/* ------------------------------------------------------------------ */

function milestoneNode(state: GameState, rng: Rng): GameNode | null {
  const d = state.depth;

  if (d >= 8 && d <= 10 && !flag(state, "m_custode")) return custodeNode(state, rng);
  if (d >= 16 && d <= 18 && !flag(state, "m_specchio")) return specchioNode(state, rng);
  if (d >= 23 && d <= 25 && !flag(state, "m_pozzo")) return pozzoNode(state, rng);
  return null;
}

function custodeNode(state: GameState, rng: Rng): GameNode {
  const choices: Choice[] = [
    {
      id: "ask",
      label: "Chiedigli la strada",
      effect: {
        addFlags: ["m_custode"],
        depthDelta: 1,
        sanity: 3,
        outcome:
          "Il Custode solleva un braccio lentissimo e indica un corridoio che, giureresti, un attimo fa non c'era. \"Sempre dritto\", dice, \"tranne quando senti l'acqua. Lì, mai dritto.\" Lo ringrazi. Annuisce come chi ha tutto il tempo del mondo, perché ce l'ha.",
      },
    },
    {
      id: "pact",
      label: "Chiedigli come si esce davvero",
      hint: "Le domande vere, qui sotto, hanno un prezzo vero.",
      effect: {
        addFlags: ["m_custode", "patto"],
        sanity: -22,
        outcome:
          "Il Custode ti guarda a lungo. \"La porta vuole ferro\", dice, \"o un nome. Il ferro si trova. Il nome si paga.\" Poi si china e te lo posa sotto la lingua: una parola fredda, che pesa. Da questo momento fa parte di te, e tu, un poco, di questo posto.",
      },
    },
    {
      id: "ignore",
      label: "Passa oltre senza parlargli",
      effect: {
        addFlags: ["m_custode"],
        depthDelta: 1,
        sanity: -6,
        aggression: 1,
        outcome:
          "Gli passi accanto a testa bassa. Non ti ferma. Ma mentre ti allontani lo senti annotare qualcosa su un registro, con calma, e la calma di chi scrive di te è un suono che non dimenticherai.",
      },
    },
  ];

  if (state.items.length > 0) {
    const gift = state.items.find((i) => i !== "lanterna") ?? state.items[0];
    const givesKey = !has(state, "chiave_arrugginita");
    choices.splice(1, 0, {
      id: "offer",
      label: "Offrigli qualcosa dal tuo zaino",
      hint: "I custodi ricordano le gentilezze. E tutto il resto.",
      effect: {
        removeItems: [gift],
        addItems: givesKey ? ["chiave_arrugginita"] : [],
        addFlags: ["m_custode", "custode_amico"],
        sanity: givesKey ? 5 : 15,
        outcome: givesKey
          ? "Il Custode accetta il dono con entrambe le mani, come si accoglie una cosa viva. Poi fruga in una tasca profonda quanto un pozzo e ti porge una chiave mangiata dalla ruggine. \"Al ferro piace il ferro\", dice. \"E alla porta piace il ferro. Vai.\""
          : "Il Custode accetta il dono e, in cambio, ti posa una mano sulla fronte. È fredda e leggera, e porta via un po' di rumore dalla tua testa. \"Riposa il nome\", dice. Non capisci. Ma stai meglio.",
      },
    });
  }

  return {
    zone: zoneFor(state.depth).name,
    title: "Il Custode",
    paragraphs: [
      "A un incrocio a sei vie, seduto su una sedia di legno da cucina, c'è un uomo. O la forma lunga di un uomo: il cappotto è grigio, umido di pioggia, e la faccia è un luogo in cui gli occhi non riescono a restare.",
      "\"In ritardo\", dice, senza rimprovero. \"Ma qui in fondo lo siete tutti.\"",
      "Accanto alla sedia, un registro aperto. Le pagine si voltano da sole, lentamente, come se cercassero una riga precisa.",
    ],
    choices: choices.slice(0, 4),
    kind: "milestone",
  };
}

function specchioNode(state: GameState, rng: Rng): GameNode {
  return {
    zone: zoneFor(state.depth).name,
    title: "La stanza dello specchio",
    paragraphs: [
      "Una stanza esagonale, vuota tranne che per uno specchio alto fino al soffitto, dentro una cornice di ferro nero. È coperto da un lenzuolo. Il lenzuolo respira.",
      "Sai — con la certezza inspiegabile che qui sotto sostituisce la conoscenza — che lo specchio mostra le cose com'erano un minuto fa. E che un minuto fa, in questa stanza, non eri solo.",
    ],
    choices: [
      {
        id: "look",
        label: "Scopri lo specchio e guarda",
        hint: "Un minuto fa. Solo un minuto.",
        effect: {
          addFlags: ["m_specchio", "specchio_visto"],
          sanity: -between(rng, 14, 20),
          outcome:
            "Tiri il lenzuolo. Lo specchio mostra la stanza di un minuto fa: vuota, tranne che per una figura in piedi esattamente dove sei tu adesso, che copre lo specchio con un lenzuolo. La figura si ferma. Si volta. Ti vede — nel suo futuro, nel tuo presente — e sorride con sollievo, come chi finalmente passa il turno.",
        },
      },
      {
        id: "break",
        label: "Rompilo attraverso il lenzuolo",
        effect: {
          addFlags: ["m_specchio", "specchio_rotto"],
          addItems: ["scheggia_specchio"],
          sanity: -8,
          aggression: 2,
          outcome:
            "Colpisci. Il vetro cede con un suono di stagno, e sotto il lenzuolo qualcosa smette a metà un gesto. Raccogli una scheggia lunga, avvolgendola in un lembo di stoffa. Nel labirinto, in lontananza, molte cose si sono voltate verso questo rumore.",
        },
      },
      {
        id: "pass",
        label: "Non toccarlo. Passa oltre",
        effect: {
          addFlags: ["m_specchio"],
          depthDelta: 1,
          sanity: 2,
          outcome:
            "Attraversi la stanza rasente il muro, gli occhi bassi. Mentre esci, sotto il lenzuolo, qualcosa bussa piano sul vetro — dall'interno — con la punta di un dito. Educatamente. Non ti fermi.",
        },
      },
    ],
    kind: "milestone",
  };
}

function pozzoNode(state: GameState, rng: Rng): GameNode {
  const drinkGood = chance(rng, 0.5);
  const choices: Choice[] = [
    {
      id: "listen",
      label: "Sporgiti e ascolta",
      effect: {
        addFlags: ["m_pozzo", "voce_del_pozzo"],
        sanity: -12,
        outcome:
          "Ti sporgi. La voce sale piano, paziente, come da un piano molto più basso di qualunque pavimento: \"La porta teme due cose: la sua chiave, e il suo nome. Tutto il resto lo mangia.\" Poi la voce ridacchia, e la risata sa di acqua ferma. Ti ritrai in fretta.",
      },
    },
    {
      id: "drink",
      label: "Bevi l'acqua nera",
      hint: "È ferma da secoli. O ti aspetta da secoli.",
      effect: drinkGood
        ? {
            addFlags: ["m_pozzo"],
            sanity: 25,
            outcome:
              "Bevi. L'acqua è gelida e sa di pietra e di sonno. Scende, e con lei scende il rumore che avevi in testa da giorni. Per la prima volta da quando sei entrato, i tuoi pensieri sono in fila. Tuoi. In fila.",
          }
        : {
            addFlags: ["m_pozzo"],
            sanity: -25,
            outcome:
              "Bevi. L'acqua è tiepida, e questo è il primo errore che il tuo corpo ti segnala. Il secondo è il ricordo che porta con sé: un ricordo non tuo, di molto tempo passato ad aspettare sul fondo, guardando in su, verso un cerchio di luce con dentro una faccia. La tua.",
          },
    },
  ];
  if (state.items.length > 1) {
    const tribute = state.items.find((i) => i !== "lanterna" && i !== "chiave_arrugginita");
    if (tribute) {
      choices.push({
        id: "offer",
        label: "Getta un oggetto nel pozzo",
        hint: "I pozzi sono bocche. Le bocche gradiscono.",
        effect: {
          addFlags: ["m_pozzo"],
          removeItems: [tribute],
          sanity: 14,
          aggression: -2,
          outcome:
            "Lasci cadere l'offerta. Non senti mai il tonfo — solo, dopo un poco, un sospiro soddisfatto che sale lungo le pareti di pietra. Il labirinto, per un tratto, ti guarderà con meno fame.",
        },
      });
    }
  }
  choices.push({
    id: "pass",
    label: "Gira al largo dal pozzo",
    effect: {
      addFlags: ["m_pozzo"],
      depthDelta: 1,
      outcome:
        "Costeggi la parete più lontana, senza guardare dentro. Mentre esci, dal pozzo sale un colpo di tosse discreto, come di chi voleva solo attaccare discorso.",
    },
  });

  const paragraphs = [
    "Al centro di una sala circolare c'è un pozzo di pietra, la vera più liscia di quanto la pietra dovrebbe permettersi. Dall'imboccatura sale un'eco costante, appena sotto la soglia dell'udito.",
    "Non è acqua che gocciola. È una voce. Sta parlando da prima che tu arrivassi, e continuerà dopo. Ma adesso — adesso sta parlando a te.",
  ];
  if (flag(state, "ha_ascoltato")) {
    paragraphs.push(
      "La voce si interrompe un istante quando entri. Poi, più piano, quasi con piacere: «Tu. Quello che ascolta. Il buio ci ha parlato di te.»",
    );
  }

  return {
    zone: zoneFor(state.depth).name,
    title: "Il pozzo che parla",
    paragraphs,
    choices: choices.slice(0, 4),
    kind: "milestone",
  };
}

/* ------------------------------------------------------------------ */
/* La Porta                                                            */
/* ------------------------------------------------------------------ */

/** Quanto della Ricorrenza il giocatore ha davvero capito, in questa discesa. */
function understanding(state: GameState): number {
  return [
    "ha_ascoltato",
    "specchio_visto",
    "voce_del_pozzo",
    "ha_visto",
    "telefono_risposto",
    "dormiente_visto",
  ].filter((f) => flag(state, f)).length;
}

function finalDoorNode(state: GameState, rng: Rng): GameNode {
  const choices: Choice[] = [];

  // Il finale segreto: chi ha ricomposto abbastanza della Ricorrenza ricorda
  // il proprio nome. Ma dirlo bene richiede di arrivare ancora lucidi — e ci
  // si arriva lucidi solo evitando proprio le cose che quel nome te l'hanno svelato.
  if (understanding(state) >= 4) {
    choices.push({
      id: "true_name",
      label: "Ricorda il tuo vero nome, e dillo alla porta",
      hint: "Non quello del Custode, non la parola del patto. Quello che eri prima di entrare.",
      effect:
        state.sanity >= 50
          ? { escape: "primo_nome", outcome: "" }
          : { escape: "ruota", outcome: "" },
    });
  }

  if (has(state, "chiave_arrugginita")) {
    choices.push({
      id: "key",
      label: "Infila la chiave arrugginita nella serratura",
      hint: "Al ferro piace il ferro.",
      effect: { escape: state.sanity >= 40 ? "alba" : "alba_grigia", outcome: "" },
    });
  }
  if (flag(state, "patto")) {
    choices.push({
      id: "name",
      label: "Pronuncia il nome che tieni sotto la lingua",
      hint: "Fa parte di te, ormai. E tu di questo posto.",
      effect: { escape: "custode_nuovo", outcome: "" },
    });
  }
  if (flag(state, "porta_incrinata")) {
    choices.push({
      id: "crack",
      label: "Infilati nella crepa",
      hint: "È stretta. Sei quasi abbastanza poco, ormai.",
      effect:
        state.sanity <= 20
          ? { death: "annegato", outcome: "" }
          : { escape: "strisciato", sanity: -15, outcome: "" },
    });
  } else {
    choices.push({
      id: "knock",
      label: "Bussa alla porta",
      effect: {
        addFlags: ["porta_incrinata"],
        sanity: -between(rng, 8, 13),
        outcome:
          "Bussi tre volte. Il ferro rimbomba come una campana annegata, e nel legno attorno alla serratura si apre una crepa sottile, da cui filtra una luce pallida e vera. Dall'altra parte, qualcosa che stava appoggiato alla porta si sposta.",
      },
    });
  }
  choices.push({
    id: "stay",
    label: "Voltale le spalle e torna nel labirinto",
    hint: "C'è una nicchia della tua misura. Un letto rifatto. Una parola in rosso.",
    effect:
      state.sanity <= 30
        ? { escape: "rimasto", outcome: "" }
        : {
            depthDelta: -3,
            sanity: -10,
            outcome:
              "Ti allontani dalla porta. Non sai spiegare perché — forse manca qualcosa, forse manchi tu. Il labirinto ti riaccoglie senza commenti, come chi sapeva che saresti tornato.",
          },
  });

  const paragraphs = [
    "Il labirinto finisce. Non si apre: finisce, come una frase. Davanti a te, incassata nella roccia viva, una porta di ferro nero alta tre volte te, senza maniglia, con una sola serratura all'altezza del cuore.",
    "Da sotto la soglia filtra aria fredda. Aria di fuori. Odora di pioggia recente e di rumore lontano — di tutte le cose che il labirinto non è.",
    "La porta ti stava aspettando. Le porte, qui sotto, sono le uniche a non mentire mai: o si aprono, o no.",
  ];
  if (flag(state, "custode_amico")) {
    paragraphs.push(
      "Sulla soglia, tracciata col gesso, una piccola freccia indica la serratura. La calligrafia è lenta, paziente. I custodi ricordano le gentilezze.",
    );
  }
  if (flag(state, "voce_del_pozzo") || flag(state, "ha_ascoltato")) {
    paragraphs.push(
      "«La porta teme due cose», diceva la voce. «La sua chiave, e il suo nome. Tutto il resto lo mangia.» Ora capisci perché te l'hanno detto.",
    );
  }
  if (understanding(state) >= 4) {
    paragraphs.push(
      "E poi, sulla soglia dell'uscita, ti torna in mente ciò che il labirinto ti stava mangiando piano da quando sei sceso: come ti chiamavi, prima. Il nome è lì, sulla punta della lingua. Vero. Tuo.",
    );
  }

  return {
    zone: "La Porta",
    title: "La porta di ferro",
    paragraphs,
    // La porta concede una scelta in più: è il momento culminante.
    choices: choices.slice(0, 5),
    kind: "final",
  };
}

/* ------------------------------------------------------------------ */
/* Applicazione delle scelte                                           */
/* ------------------------------------------------------------------ */

export function applyChoice(
  state: GameState,
  choice: Choice,
  nodeKind?: GameNode["kind"],
): GameState {
  const e = choice.effect;
  const next: GameState = {
    ...state,
    items: [...state.items],
    flags: [...state.flags],
    log: [...state.log],
    nodeCount: state.nodeCount + 1,
    entitySeen: (state.entitySeen ?? 0) + (nodeKind === "entity" ? 1 : 0),
  };

  if (e.removeItems) next.items = next.items.filter((i) => !e.removeItems!.includes(i));
  if (e.addItems) for (const i of e.addItems) if (!next.items.includes(i)) next.items.push(i);
  if (e.addFlags) for (const f of e.addFlags) if (!next.flags.includes(f)) next.flags.push(f);

  // L'amuleto d'osso attutisce i colpi alla mente.
  let sanityDelta = e.sanity ?? 0;
  if (sanityDelta < 0 && next.items.includes("amuleto_osso")) {
    sanityDelta = Math.ceil(sanityDelta * 0.7);
  }
  next.sanity = Math.max(0, Math.min(100, next.sanity + sanityDelta));
  next.depth = Math.max(0, next.depth + (e.depthDelta ?? 0));
  next.aggression = Math.max(0, Math.min(10, next.aggression + (e.aggression ?? 0)));

  // Livello di caccia: sale quando l'Entità ti tiene d'occhio, si azzera
  // quando la scacci. Le milestone sono terra sicura: ti fanno perdere le tracce.
  let caccia = Math.max(0, Math.min(5, (state.caccia ?? 0) + (e.cacciaDelta ?? 0)));
  if (nodeKind === "milestone") caccia = Math.floor(caccia / 2);
  next.caccia = caccia;

  // Sotto-livello: precipitando ci entri; poi ogni azione ne consuma una stanza,
  // finché non risali sulla discesa principale.
  if (e.enterSub) {
    next.subZone = e.enterSub.zone;
    next.subLeft = e.enterSub.rooms;
  } else if ((state.subLeft ?? 0) > 0) {
    const left = (state.subLeft ?? 0) - 1;
    next.subLeft = left > 0 ? left : undefined;
    next.subZone = left > 0 ? state.subZone : undefined;
  }

  next.lastOutcome = e.outcome || undefined;
  if (e.outcome) {
    next.log = [...next.log.slice(-40), e.outcome];
  }

  if (e.death) {
    next.status = "dead";
    next.endingId = e.death;
  } else if (e.escape) {
    next.status = "escaped";
    next.endingId = e.escape;
  } else if (next.sanity <= 0) {
    next.status = "dead";
    next.endingId = "vuoto";
  }

  return next;
}
