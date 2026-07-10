# NONAME

Un gioco horror testuale a scelte: un labirinto che si rigenera dinamicamente a ogni discesa. Nessun backend, nessun database — tutto gira nel browser.

## Come funziona

- **Generazione procedurale**: ogni run parte da un seed casuale. Ogni nodo (stanza, incontro, evento) è generato deterministicamente da `(seed, numero di scelte fatte, stato del giocatore)` — stessa run, stesso nodo dopo un reload; run nuova, labirinto nuovo.
- **Le scelte contano**: lucidità, oggetti, flag narrativi e l'aggressività dell'Entità condizionano quali nodi appaiono, quali scelte sono disponibili e quale degli **8 finali** raggiungi.
- **Struttura**: 3 zone (Le Soglie, Le Vene, Il Ventre), 3 incontri fissi (il Custode, lo Specchio, il Pozzo) e la Porta di ferro a profondità 30. Una run media dura ~40 scelte.
- **Persistenza**: lo stato è salvato in `localStorage` — chiudi il browser e riprendi la discesa dove l'avevi lasciata.
- **UI**: la grafica si degrada con la lucidità — a mente lucida il mondo respira appena, sotto il 25% trema e sfoca.

## Architettura

```
app/
├── game/
│   ├── rng.ts       # PRNG deterministico (mulberry32) + helper
│   ├── types.ts     # Stato, scelte, nodi, finali
│   ├── content.ts   # Zone, stanze, sussurri, finali (testi)
│   ├── engine.ts    # Generazione nodi + applicazione scelte
│   └── storage.ts   # Persistenza localStorage
└── routes/
    ├── home.tsx     # Menu (nuova discesa / riprendi)
    └── game.tsx     # Schermata di gioco + HUD + finali
```

## Avvio

Richiede **Node ≥ 22.22** (c'è un `.nvmrc`).

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # SPA statica in build/client/ — deployabile ovunque
```

La build è una SPA statica (`ssr: false`): il contenuto di `build/client/` si pubblica su qualsiasi hosting statico (GitHub Pages, Netlify, Vercel, un bucket S3).
