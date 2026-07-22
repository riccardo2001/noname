import type { Ending } from "./types";

export interface Zone {
  name: string;
  minDepth: number;
  rooms: RoomTemplate[];
  details: string[];
}

export interface RoomTemplate {
  title: string;
  text: string[];
}

/** Le tre zone del labirinto, per profondità crescente. */
export const ZONES: Zone[] = [
  {
    name: "Le Soglie",
    minDepth: 0,
    rooms: [
      {
        title: "Il corridoio storto",
        text: [
          "Il corridoio davanti a te non è dritto. Non è nemmeno curvo. È storto in un modo che gli occhi si rifiutano di misurare.",
          "Le pareti sono di intonaco freddo, umido come pelle. Da qualche parte, più avanti, qualcosa gocciola a intervalli troppo regolari.",
        ],
      },
      {
        title: "La sala degli appendiabiti",
        text: [
          "Una stanza piena di appendiabiti di ferro, tutti vuoti. Tutti tranne uno: un cappotto grigio, ancora umido di pioggia.",
          "Non piove, qui sotto. Non è mai piovuto.",
        ],
      },
      {
        title: "Le scale che scendono",
        text: [
          "Gradini di pietra consumati al centro, come se migliaia di piedi li avessero percorsi. La ringhiera è tiepida sotto la tua mano.",
          "Qualcuno l'ha stretta pochi istanti fa.",
        ],
      },
      {
        title: "L'archivio",
        text: [
          "Schedari fino al soffitto. I cassetti hanno etichette scritte a mano: nomi, date. Ce n'è uno con il tuo nome.",
          "La data accanto è di domani.",
        ],
      },
      {
        title: "La stanza dei cappelli",
        text: [
          "Decine di manichini senza volto, ognuno con un cappello diverso. Sono tutti rivolti verso la porta da cui sei entrato.",
          "Quando distogli lo sguardo, senti il fruscio sommesso di stoffa che si muove.",
        ],
      },
      {
        title: "Il refettorio",
        text: [
          "Tavoli apparecchiati per una cena mai servita. I piatti sono puliti, le posate lucide, le sedie leggermente scostate.",
          "Su ogni tovagliolo, ricamata in filo rosso, la stessa parola: RESTA.",
        ],
      },
    ],
    details: [
      "L'aria sa di polvere e di qualcos'altro, dolciastro, che preferisci non riconoscere.",
      "Una lampadina lontana sfarfalla, con il ritmo di un respiro.",
      "Il pavimento vibra appena, come se sotto passasse un treno. O qualcosa di molto grande.",
      "Per un attimo ti sembra di sentire il tuo nome, pronunciato da una voce educata.",
      "C'è una porta murata. La malta è fresca.",
      "Sul muro qualcuno ha scritto a matita: \"non contare le porte\".",
    ],
  },
  {
    name: "Le Vene",
    minDepth: 9,
    rooms: [
      {
        title: "Il condotto",
        text: [
          "Devi camminare piegato. Le pareti qui sono calde e cedevoli, e quando le tocchi qualcosa, dall'altra parte, si ritrae.",
          "Il labirinto non è stato costruito. È cresciuto.",
        ],
      },
      {
        title: "La biblioteca sommersa",
        text: [
          "Scaffali che affondano in dieci centimetri d'acqua nera e immobile. I libri sono gonfi, illeggibili.",
          "Tutti tranne uno, aperto su un leggio asciutto. La pagina descrive esattamente questa stanza. E te.",
        ],
      },
      {
        title: "Le celle",
        text: [
          "Una fila di celle con le porte spalancate. Dentro, brande rifatte con cura militare.",
          "L'ultima cella è chiusa. Da dentro, qualcuno rifà il letto. Puoi sentire le lenzuola tirarsi.",
        ],
      },
      {
        title: "La sala anatomica",
        text: [
          "Un anfiteatro di legno scuro attorno a un tavolo di marmo. Il tavolo è pulito, ma i canali di scolo sono scuri di qualcosa di vecchio.",
          "Sugli spalti, l'impronta di centinaia di persone sedute. Il legno è ancora piegato dal loro peso.",
        ],
      },
      {
        title: "Il giardino di sotto",
        text: [
          "Piante pallide crescono senza luce, rivolte tutte nella stessa direzione: verso il basso.",
          "Fiori bianchi si aprono al tuo passaggio. Non è un omaggio. È fame.",
        ],
      },
      {
        title: "La nursery",
        text: [
          "Culle di ferro, ordinate in file. Ogni culla contiene un carillon, e ogni carillon è carico.",
          "Basterebbe sfiorarne uno. Lo sai. E sai che tutti gli altri risponderebbero.",
        ],
      },
    ],
    details: [
      "Le pareti pulsano piano, una volta ogni sei secondi. Hai contato.",
      "Da una crepa filtra un canto sommesso, in una lingua fatta solo di consonanti.",
      "Le tue orme dietro di te sono sparite. Quelle davanti a te, no.",
      "Fa più caldo. Un caldo di corpo, non di fuoco.",
      "Qualcosa di piccolo corre lungo il battiscopa, sempre appena fuori dalla vista.",
      "Sul soffitto ci sono graffi. Profondi. A quattro a quattro.",
    ],
  },
  {
    name: "Il Ventre",
    minDepth: 19,
    rooms: [
      {
        title: "La cattedrale rovesciata",
        text: [
          "Il soffitto si apre in una navata capovolta: i banchi pendono verso di te come denti, l'altare è sopra la tua testa.",
          "In fondo, appesa nel buio, una lampada rossa arde. Nelle chiese significa presenza.",
        ],
      },
      {
        title: "Il campo di porte",
        text: [
          "Una caverna sterminata, e piantate nel terreno come lapidi: porte. Centinaia. Nessun muro attorno a loro.",
          "Da sotto una di esse filtra luce. Cambia porta ogni volta che sbatti le palpebre.",
        ],
      },
      {
        title: "La sala del respiro",
        text: [
          "Qui il buio ha una consistenza. Entra nei polmoni denso, e quando espiri senti che una parte resta dentro.",
          "Il suono del tuo respiro torna indietro con mezzo secondo di ritardo. E con una voce che non è la tua.",
        ],
      },
      {
        title: "L'ossario gentile",
        text: [
          "Nicchie scavate nella roccia, e in ogni nicchia ossa disposte con affetto: composte, ordinate, alcune con fiori secchi.",
          "Una nicchia è vuota, pulita di fresco. Ha la tua misura.",
        ],
      },
      {
        title: "Il teatro",
        text: [
          "Un sipario di velluto consumato, mezzo aperto su un palco buio. Le poltrone sono occupate da sagome immobili di polvere.",
          "Quando fai un passo, dal palco arriva un applauso. Uno solo. Lento.",
        ],
      },
      {
        title: "La riva",
        text: [
          "Il labirinto finisce in un lago nero senza sponda opposta. L'acqua è perfettamente ferma, e non riflette te: riflette qualcun altro.",
          "Chiunque sia, ti saluta con la mano. Ti sta aspettando lì sotto da molto tempo.",
        ],
      },
    ],
    details: [
      "Il silenzio qui è attivo. Preme sulle orecchie come una mano.",
      "Ti accorgi che da un po' non senti più il tuo cuore. Poi lo senti. In un'altra parte della stanza.",
      "Le pareti sono tiepide e, dove le tocchi, restano bianche le impronte. Come carne premuta.",
      "Una corrente d'aria ti passa accanto. Ha un odore di casa tua.",
      "In lontananza, qualcuno conta. È arrivato a un numero molto alto e non ha intenzione di fermarsi.",
      "La tua ombra è in ritardo di un passo. Sta imparando.",
    ],
  },
];

/**
 * Stanze rare: compaiono circa una volta ogni cinquanta stanze.
 * Sono ciò di cui i giocatori parlano quando risalgono.
 */
export interface RareRoom {
  id: "lucciole" | "telefono" | "dormiente";
  title: string;
  text: string[];
}

export const RARE_ROOMS: RareRoom[] = [
  {
    id: "lucciole",
    title: "La stanza delle lucciole",
    text: [
      "Apri una porta e il buio, per una volta, non è vuoto: centinaia di luci minuscole galleggiano a mezz'aria, lente, verdi-oro, come polvere che ha deciso di brillare.",
      "Non sono lucciole. Non sono niente che tu conosca. Ma non hanno fame, e qui sotto è la cosa più vicina alla gentilezza.",
    ],
  },
  {
    id: "telefono",
    title: "Il telefono",
    text: [
      "Al centro di una stanza spoglia, su un tavolino di formica, un telefono nero a disco. Il filo scende nel pavimento, dritto, verso il basso.",
      "Sta squillando. Ha smesso di squillare per gli altri molto tempo fa: adesso squilla per te.",
    ],
  },
  {
    id: "dormiente",
    title: "Il dormiente",
    text: [
      "In un angolo, su una branda militare, qualcuno dorme voltato verso il muro. Il respiro è lento, regolare, umano.",
      "Indossa il tuo cappotto. Ha il tuo taglio di capelli. Accanto alla branda, in fila ordinata, le cose che non hai ancora trovato.",
    ],
  },
];

/**
 * Il Sottofondo: il sotto-livello nascosto in cui si precipita dalla voragine.
 * Non è sulla discesa normale — è *sotto* il labirinto, dove tutto è allagato
 * e dove la Ricorrenza ristagna. Ci si attraversano poche stanze, poi si risale.
 */
export const SOTTOFONDO: Zone = {
  name: "Il Sottofondo",
  minDepth: 0,
  rooms: [
    {
      title: "L'acqua ferma",
      text: [
        "Atterri in piedi in un'acqua nera alta fino al ginocchio. Non fa un'onda, non fa un cerchio: si limita a lasciarti entrare, come se ti aspettasse.",
        "Sopra di te, il buco da cui sei caduto si è già richiuso. Qui sotto il labirinto non è cresciuto. È marcito.",
      ],
    },
    {
      title: "I dormienti sommersi",
      text: [
        "L'acqua qui è trasparente, e poco sotto la superficie galleggiano delle figure: dormono, gli occhi chiusi, ognuna con addosso un cappotto grigio, ognuna con la tua faccia a un'età diversa.",
        "Sono in fila, ordinate, in attesa. Una ha appena cominciato a schiudere gli occhi. Passi oltre in fretta, cercando di non contarle.",
      ],
    },
    {
      title: "La sala delle chiavi",
      text: [
        "Centinaia di chiavi arrugginite pendono da fili, a diverse altezze, girando piano nella corrente che non c'è. Una sola, lo sai, apre davvero qualcosa.",
        "Le altre, se le provi, aprono porte che è meglio restino chiuse.",
      ],
    },
    {
      title: "Il respiro del fondo",
      text: [
        "Le pareti, qui, si alzano e si abbassano lente, e l'acqua sale e scende con loro. Non è una stanza. È l'interno di qualcosa che respira, e tu sei ciò che ha appena inghiottito.",
        "In fondo, dove l'acqua è più scura, qualcosa di grande si gira nel sonno. Faresti bene a risalire prima che finisca di svegliarsi.",
      ],
    },
  ],
  details: [
    "L'acqua ti arriva ai fianchi, tiepida come un fiato. Preferiresti fosse fredda.",
    "Ogni tuo passo solleva dal fondo una nuvola di qualcosa che non guardi.",
    "Il soffitto è basso, gocciolante, e le gocce cadono verso l'alto.",
    "Da qualche parte, sotto di te, la voce del pozzo continua il suo discorso. Da qui si capiscono le parole.",
  ],
};

/** Sussurri mostrati quando la lucidità è bassa. */
export const WHISPERS = [
  "sei già passato di qui. sei sempre passato di qui.",
  "la porta non è un'uscita. è una bocca.",
  "girati. no. non girarti. no. girati.",
  "il tuo nome ci piace. lo stiamo consumando piano.",
  "quanti eri quando sei entrato?",
  "resta. c'è una nicchia della tua misura.",
  "la luce in fondo è accesa per te. da sempre.",
  "smetti di contare le porte.",
];

/** Pagine comuni del diario strappato: curano poco, ma non mentono. */
export const DIARY_COMMON = [
  {
    text: "Il diario ha una pagina nuova, con la tua calligrafia: una mappa parziale, tre svolte sicure, un avvertimento sottolineato due volte — «alla porta serve ferro, o un nome». Lo richiudi prima che scriva altro.",
    sanity: 4,
  },
  {
    text: "Una pagina di conti: tacche a gruppi di cinque, centinaia. In fondo, la tua grafia: «giorni? porte? persone? non lo so più. ma il numero non scende mai». Chiudi il diario piano.",
    sanity: 2,
  },
  {
    text: "Una ricetta della minestra di tua nonna, scritta con cura, fuori posto qui come un fiore su una lapide. Per un istante senti l'odore del brodo, della sua cucina, di casa. Poi passa. Ma ti resta addosso qualcosa di caldo.",
    sanity: 6,
  },
  {
    text: "Una pagina scritta in uno specchio: la leggi solo di riflesso, nella lama della lanterna. Dice: «la persona che tiene questo diario e la persona che lo ha iniziato non sono più la stessa. Fai attenzione a quale delle due decide.»",
    sanity: 1,
  },
  {
    text: "Solo un disegno: la pianta del labirinto vista dall'alto. Non è un labirinto. È la sezione di un orecchio. Richiudi il diario in fretta, ma la forma ti resta negli occhi.",
    sanity: 0,
  },
] as const;

/** Righe ambientali quando l'Entità ti segue, ma da lontano. */
export const STALK_FAR = [
  "Non c'è nessuno, nella stanza. Ma le tue orme sul pavimento polveroso, quelle di prima, sono state calpestate da altre orme. Più grandi. Fresche.",
  "Da qualche parte alle tue spalle, un rumore che si ferma un istante dopo che ti fermi tu. Provi di nuovo: fai due passi, ti blocchi. Il rumore fa due passi. Si blocca.",
  "L'aria in fondo alla stanza è più fredda, e ha la forma sbagliata, come una tenda dietro cui qualcuno trattiene il respiro aspettando che tu vada oltre.",
];

/** Righe ambientali quando la caccia è ormai serrata. */
export const STALK_CLOSE = [
  "È vicina. Non la vedi ancora, ma la senti nel modo in cui la stanza sembra trattenere il fiato per te, al posto tuo. Non ti ha trovato. Non ti ha mai perso.",
  "Il tuo cuore batte forte — e mezzo secondo dopo, dal buio dietro di te, qualcosa batte in risposta. Più lento. Più grande. Paziente.",
  "C'è un odore, ora, che ti segue di stanza in stanza: terra bagnata e ferro. È l'odore che avevi addosso l'ultima volta che ti ha toccato. Se lo ricorda. Lo sta rifacendo.",
];

export const ADVANCE_LABELS = [
  "Prosegui nel buio",
  "Avanza verso il passaggio successivo",
  "Segui il corridoio che scende",
  "Continua, un passo dopo l'altro",
  "Attraversa la stanza senza voltarti",
  "Vai avanti, dove il buio è più denso",
];

export const ENDINGS: Record<string, Ending> = {
  vuoto: {
    title: "Il Vuoto",
    text: "La mente cede senza rumore, come una candela che si spegne in una stanza vuota. Il labirinto ti accoglie. Non cammini più: vieni camminato. Da qualche parte, molto sopra, qualcuno appende un cappotto grigio, ancora umido di pioggia.",
    tone: "dark",
  },
  assorbito: {
    title: "Visto",
    text: "La guardi negli occhi, e capisci troppo tardi che gli occhi sono porte. L'Entità non ti uccide. Ti archivia. Nel cassetto con il tuo nome, la data di domani viene corretta a oggi.",
    tone: "dark",
  },
  annegato: {
    title: "L'Altra Riva",
    text: "L'acqua nera è più calda di quanto pensassi. Chi ti salutava dal riflesso ti prende per mano con una cortesia antica. Ora sei tu quello che saluta, e aspetti. Qualcuno, prima o poi, arriverà alla riva.",
    tone: "dark",
  },
  strisciato: {
    title: "La Crepa",
    text: "Ti spingi nella fessura della porta incrinata, e la porta si richiude piano — non abbastanza in fretta. Emergi dall'altra parte, alla luce, lasciando indietro qualcosa. Non sapresti dire cosa. Ma da quella notte, negli specchi, il tuo riflesso arriva con mezzo secondo di ritardo.",
    tone: "grey",
  },
  alba_grigia: {
    title: "Alba Grigia",
    text: "La chiave gira. La porta si apre su un'alba pallida e vera. Sei fuori. Sei salvo. Ma il labirinto non toglie: presta. E ogni notte, nel sonno, torni a restituire gli interessi — un corridoio alla volta.",
    tone: "grey",
  },
  alba: {
    title: "L'Alba",
    text: "La chiave gira con uno scatto pulito. Oltre la porta, aria fredda e un cielo che sta facendo l'alba. Esci intero: mente, nome e ombra al posto giusto. Dietro di te, il labirinto sospira e ricomincia a mescolarsi, paziente. Aspetterà il prossimo. Non sarai tu.",
    tone: "light",
  },
  custode_nuovo: {
    title: "Il Nuovo Custode",
    text: "Pronunci il nome che il patto ti ha lasciato sotto la lingua. La porta si apre — ma non verso l'esterno. Il labirinto ti attraversa come acqua in una serratura, e capisci: il Custode che hai incontrato era solo il turno precedente. Ora tocca a te. In fondo, non è una condanna. È un lavoro. E qualcuno, prima o poi, avrà bisogno di indicazioni.",
    tone: "grey",
  },
  rimasto: {
    title: "Rimasto",
    text: "Guardi la porta e non provi niente. Fuori c'è rumore, fretta, gente che non sa. Qui sotto c'è una nicchia della tua misura, un letto rifatto con cura, una parola ricamata in rosso. Ti volti e torni indietro. RESTA, diceva. Avevano ragione.",
    tone: "dark",
  },
  primo_nome: {
    title: "Il Primo Nome",
    text: "Non pronunci il nome del Custode, né la parola del patto. Pronunci il tuo — quello vero, quello che il labirinto ti stava consumando piano da quando sei entrato. Lo dici a voce alta, e per la prima volta la porta non si limita ad aprirsi: si arrende. Esci nell'alba, e dietro di te il labirinto non ricomincia a mescolarsi. Si ferma. Non ci sarà un prossimo. Hai spezzato la ruota.",
    tone: "light",
  },
  ruota: {
    title: "La Ruota Gira",
    text: "Hai capito tutto: chi dorme sotto il proprio cappotto, chi chiama al telefono, chi siede all'incrocio col registro. Sei tu — sei sempre stato tu, in ogni turno. Ma capirlo e reggerlo sono due cose diverse, e sei arrivato alla porta con troppo poco di te. Ti siedi. Apri il registro a una pagina bianca. Da qualche parte, molto sopra, qualcuno sta per appendere un cappotto grigio e cominciare a scendere. Lo aspetterai. Con pazienza. Come hanno aspettato te.",
    tone: "grey",
  },
};

/**
 * I frammenti della Ricorrenza: la storia sotto la storia. Ognuno si sblocca
 * la prima volta che compare il flag corrispondente, e resta nel codex del
 * menu tra una discesa e l'altra. Insieme dicono chi sei davvero, quaggiù.
 */
export interface LoreFragment {
  id: string;
  flag: string;
  title: string;
  text: string;
}

export const LORE_FRAGMENTS: LoreFragment[] = [
  {
    id: "il-buio-parla",
    flag: "ha_ascoltato",
    title: "Ciò che dice il buio",
    text: "Il buio parla di porte e di chiavi, di un custode che aspetta e di un'acqua che ricorda. Racconta sempre la stessa storia, a chiunque scenda. È la tua storia. L'hai già ascoltata. La ascolterai ancora.",
  },
  {
    id: "il-turno",
    flag: "specchio_visto",
    title: "Chi passa il turno",
    text: "Nello specchio, un minuto fa, c'eri già tu: coprivi il vetro con il lenzuolo e ti voltavi a sorridere, con il sollievo di chi finalmente passa il turno a qualcun altro. Quel qualcuno sei sempre tu, un giro più avanti.",
  },
  {
    id: "due-cose",
    flag: "voce_del_pozzo",
    title: "Le due cose che teme la porta",
    text: "La porta teme la sua chiave e il suo nome. La chiave si trova, in fondo, con fatica. Il nome invece lo avevi già prima di entrare — era il tuo. Il labirinto te lo mangia piano, un corridoio alla volta, perché senza nome non si esce.",
  },
  {
    id: "dentro-lei",
    flag: "ha_visto",
    title: "Cosa c'è dentro l'Entità",
    text: "Dentro di lei ci sono corridoi, e in fondo ai corridoi una porta di ferro. Non ti dà la caccia per ucciderti: ti insegue per riportarti a casa. La sua casa. Che a furia di scendere è diventata anche la tua.",
  },
  {
    id: "la-chiamata",
    flag: "telefono_risposto",
    title: "La voce al telefono",
    text: "La voce era la tua, più vecchia di una vita intera, e chiamava dal fondo per avvertirti. Ma tu sei già la voce, e sei già quello che risponde: le due estremità dello stesso filo, che scende dritto nel pavimento, verso il basso, per sempre.",
  },
  {
    id: "chi-dorme",
    flag: "dormiente_visto",
    title: "Chi dorme sulla branda",
    text: "Il dormiente aveva la faccia che avrai tu alla fine. Ogni discesa ne lascia uno addormentato, sotto il proprio cappotto grigio, con accanto le cose che il prossimo dovrà trovare. Aspetta solo che qualcuno arrivi a dargli il cambio.",
  },
  {
    id: "il-custode-eri-tu",
    flag: "m_custode",
    title: "Chi è il Custode",
    text: "Il Custode è il turno precedente. Ha camminato dove cammini tu, ha chiesto quello che chiedi tu, ha pagato quello che pagherai. Ora siede all'incrocio, indica la strada e aspetta chi prenderà il suo posto. Sa già che arriverai.",
  },
  {
    id: "il-prezzo",
    flag: "patto",
    title: "Il prezzo del patto",
    text: "Il nome che il Custode ti posa sotto la lingua non è un dono: è un anticipo. Chi lo pronuncia alla porta non esce — resta, come nuovo custode, finché non troverà qualcuno a cui darlo. Così gira la ruota. Così è sempre girata.",
  },
];
