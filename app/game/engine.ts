import { mulberry32, mixSeed, pick, chance, between, randomSeed, type Rng } from "./rng";
import { ZONES, WHISPERS, ADVANCE_LABELS } from "./content";
import {
  FINAL_DEPTH,
  type Choice,
  type GameNode,
  type GameState,
  type ItemId,
} from "./types";

export function newGame(): GameState {
  return {
    version: 1,
    seed: randomSeed(),
    nodeCount: 0,
    depth: 0,
    sanity: 100,
    aggression: 0,
    items: ["lanterna"],
    flags: [],
    status: "alive",
    log: [],
  };
}

const has = (s: GameState, item: ItemId) => s.items.includes(item);
const flag = (s: GameState, f: string) => s.flags.includes(f);

function zoneFor(depth: number) {
  return [...ZONES].reverse().find((z) => depth >= z.minDepth) ?? ZONES[0];
}

/**
 * Genera il nodo corrente in modo deterministico da (seed, nodeCount).
 * Lo stesso stato produce sempre lo stesso nodo: il salvataggio è solo lo stato.
 */
export function generateNode(state: GameState): GameNode {
  const rng = mulberry32(mixSeed(state.seed, state.nodeCount + 1, state.depth * 7));

  if (state.depth >= FINAL_DEPTH) return finalDoorNode(state, rng);

  const milestone = milestoneNode(state, rng);
  if (milestone) return milestone;

  const entityChance =
    0.06 + state.aggression * 0.035 + (state.sanity < 40 ? 0.08 : 0);
  if (state.depth > 4 && chance(rng, Math.min(entityChance, 0.5))) {
    return entityNode(state, rng);
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

  if (state.sanity < 45) paragraphs.push(`« ${pick(rng, WHISPERS)} »`);

  const choices: Choice[] = [];

  // Avanzare: sempre disponibile, costo variabile pre-calcolato.
  const advanceCost = chance(rng, 0.35) ? -between(rng, 1, 4) : 0;
  choices.push({
    id: "advance",
    label: pick(rng, ADVANCE_LABELS),
    effect: {
      depthDelta: 1,
      sanity: advanceCost,
      outcome:
        advanceCost < 0
          ? "Avanzi. Il buio ti pesa addosso come un cappotto bagnato, ma i tuoi passi tengono il ritmo."
          : "Avanzi. Per un tratto, il labirinto sembra lasciarti passare senza discutere.",
    },
  });

  // Frugare: possibile oggetto, possibile prezzo.
  if (chance(rng, 0.55)) {
    const loot = rollLoot(state, rng);
    const bad = chance(rng, 0.4);
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

  // Riposare: recupero, ma il labirinto ti annusa.
  if (state.sanity < 60 && chance(rng, 0.7)) {
    const ambush = chance(rng, 0.25 + state.aggression * 0.03);
    choices.push({
      id: "rest",
      label: "Fermati a riprendere fiato",
      hint: "Chiudere gli occhi, qui, è una dichiarazione di fiducia.",
      effect: ambush
        ? {
            sanity: -between(rng, 8, 14),
            aggression: 2,
            outcome:
              "Chiudi gli occhi. Quando li riapri, la stanza è la stessa ma le distanze no: tutto è un passo più vicino. Anche ciò che non vedi.",
          }
        : {
            sanity: between(rng, 9, 16),
            aggression: 1,
            outcome:
              "Ti fermi. Respiri. Il cuore rallenta e i pensieri tornano tuoi. Ma il riposo, qui sotto, ha un odore — e qualcosa lo sta seguendo.",
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

  // Il diario, se lo possiedi, ogni tanto si aggiorna.
  if (has(state, "diario_strappato") && chance(rng, 0.25)) {
    choices.push({
      id: "diary",
      label: "Consulta il diario strappato",
      hint: "Le pagine si riempiono da sole, una notte alla volta.",
      effect: {
        sanity: 4,
        outcome:
          "Il diario ha una pagina nuova, con la tua calligrafia: una mappa parziale, tre svolte sicure, un avvertimento sottolineato due volte — \"alla porta serve ferro, o un nome\". Lo richiudi prima che scriva altro.",
      },
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
  if (state.sanity < 45) paragraphs.push(`« ${pick(rng, WHISPERS)} »`);

  const choices: Choice[] = [];

  const freezeSafe = !chance(rng, 0.45 + state.aggression * 0.05);
  choices.push({
    id: "freeze",
    label: "Resta immobile e trattieni il fiato",
    effect: freezeSafe
      ? {
          sanity: -4,
          outcome:
            "Diventi una cosa tra le cose. L'Entità ti scorre accanto come acqua attorno a un sasso, e per un lungo minuto il tuo cuore batte altrove. Poi il corridoio è di nuovo vuoto.",
        }
      : {
          sanity: -between(rng, 12, 18),
          aggression: 1,
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
      outcome:
        "Corri senza voltarti, e il labirinto — per una volta complice — ti apre corridoi alle spalle. Quando ti fermi, sei più lontano dall'uscita. Ma sei tu a esserlo.",
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
            addFlags: ["ha_visto"],
            outcome:
              "La guardi. È un errore e una rivelazione: dentro il suo buio ci sono corridoi, e in fondo ai corridoi una porta, e la porta ha una serratura di ferro. L'Entità arretra — nessuno la guarda mai — e tu resti in piedi, più leggero di qualche certezza.",
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
        outcome:
          "La campanella suona una nota sola, pulita, impossibile in un posto simile. L'Entità si disfa come fumo in controluce — non uccisa: congedata. La campanella, esaurito il suo unico compito, ti si sbriciola in mano.",
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
        outcome:
          "Alzi la scheggia. L'Entità vi si riflette — e vedersi, per lei, è insopportabile quanto per te. Si ritira urlando senza suono. La scheggia diventa nera e ti si spegne tra le dita.",
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

  return {
    zone: zoneFor(state.depth).name,
    title: "Il pozzo che parla",
    paragraphs: [
      "Al centro di una sala circolare c'è un pozzo di pietra, la vera più liscia di quanto la pietra dovrebbe permettersi. Dall'imboccatura sale un'eco costante, appena sotto la soglia dell'udito.",
      "Non è acqua che gocciola. È una voce. Sta parlando da prima che tu arrivassi, e continuerà dopo. Ma adesso — adesso sta parlando a te.",
    ],
    choices: choices.slice(0, 4),
    kind: "milestone",
  };
}

/* ------------------------------------------------------------------ */
/* La Porta                                                            */
/* ------------------------------------------------------------------ */

function finalDoorNode(state: GameState, rng: Rng): GameNode {
  const choices: Choice[] = [];

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

  return {
    zone: "La Porta",
    title: "La porta di ferro",
    paragraphs: [
      "Il labirinto finisce. Non si apre: finisce, come una frase. Davanti a te, incassata nella roccia viva, una porta di ferro nero alta tre volte te, senza maniglia, con una sola serratura all'altezza del cuore.",
      "Da sotto la soglia filtra aria fredda. Aria di fuori. Odora di pioggia recente e di rumore lontano — di tutte le cose che il labirinto non è.",
      "La porta ti stava aspettando. Le porte, qui sotto, sono le uniche a non mentire mai: o si aprono, o no.",
    ],
    choices: choices.slice(0, 4),
    kind: "final",
  };
}

/* ------------------------------------------------------------------ */
/* Applicazione delle scelte                                           */
/* ------------------------------------------------------------------ */

export function applyChoice(state: GameState, choice: Choice): GameState {
  const e = choice.effect;
  const next: GameState = {
    ...state,
    items: [...state.items],
    flags: [...state.flags],
    log: [...state.log],
    nodeCount: state.nodeCount + 1,
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
