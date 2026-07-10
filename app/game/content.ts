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
};
