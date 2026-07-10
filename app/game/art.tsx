import type { ReactNode } from "react";
import { mulberry32, mixSeed, chance, between, type Rng } from "./rng";
import type { GameNode, GameState } from "./types";

/**
 * Vignette procedurali: nessun file immagine, solo SVG inline generato
 * dallo stesso seed del nodo. Niente contorni né figure disegnate —
 * solo masse d'ombra sfocate, nebbia e punti di luce: l'occhio completa
 * il resto, ed è lì che l'horror lavora. La distorsione (feTurbulence)
 * cresce col calare della lucidità.
 */

const BONE = "#d6d2c4";
const EMBER = "#c2453b";
const GOLD = "#d8c98f";

export function Vignette({ node, state }: { node: GameNode; state: GameState }) {
  const seed = mixSeed(state.seed, state.nodeCount + 1, 0xa27);
  const rng = mulberry32(seed);
  const dread = (100 - state.sanity) / 100;
  const fid = `v${seed.toString(36)}`;
  const id = (s: string) => `${fid}-${s}`;
  const u = (s: string) => `url(#${id(s)})`;

  return (
    <svg
      viewBox="0 0 320 120"
      className="mx-auto mt-6 block w-full max-w-md"
      aria-hidden
      focusable="false"
    >
      <defs>
        {(
          [
            ["bone", BONE],
            ["ember", EMBER],
            ["gold", GOLD],
          ] as const
        ).map(([name, color]) => (
          <radialGradient key={name} id={id(name)}>
            <stop offset="0%" stopColor={color} stopOpacity={0.9} />
            <stop offset="45%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </radialGradient>
        ))}
        <filter id={id("b2")} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation={2} />
        </filter>
        <filter id={id("b5")} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation={5} />
        </filter>
        <filter id={id("wobble")} x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.014 0.05"
            numOctaves={2}
            seed={seed % 997}
            result="w"
          />
          <feDisplacementMap in="SourceGraphic" in2="w" scale={3 + dread * 9} />
          <feGaussianBlur stdDeviation={0.6} />
        </filter>
      </defs>
      <g filter={u("wobble")}>{artFor(node, rng, dread, u)}</g>
    </svg>
  );
}

type UrlOf = (s: string) => string;

function artFor(node: GameNode, rng: Rng, dread: number, u: UrlOf) {
  if (node.kind === "final") return ironDoor(u);
  if (node.kind === "entity") return entity(rng, u);
  switch (node.title) {
    case "Il Custode":
      return custode(u);
    case "La stanza dello specchio":
      return mirror(rng, u);
    case "Il pozzo che parla":
      return well(u);
    case "La stanza delle lucciole":
      return fireflies(rng, u);
    case "Il telefono":
      return phone(u);
    case "Il dormiente":
      return sleeper(u);
    default:
      return corridor(rng, node.zone, dread, u);
  }
}

/* ------------------------------------------------------------------ */
/* Il corridoio: nebbia, una soglia di luce in fondo, pareti d'ombra   */
/* ------------------------------------------------------------------ */

function corridor(rng: Rng, zone: string, dread: number, u: UrlOf) {
  const vx = between(rng, 128, 192);
  const vy = between(rng, 52, 66);
  const ember = zone === "Il Ventre";
  const glow = ember ? u("ember") : u("bone");
  const core = ember ? EMBER : BONE;
  const els: ReactNode[] = [
    // l'unica luce: una soglia lontana. tutto il resto è labirinto.
    <ellipse key="fog" cx={vx} cy={vy} rx={54} ry={36} fill={glow} opacity={0.14} />,
    <rect key="door" x={vx - 8} y={vy - 18} width={16} height={34} fill={core} opacity={0.08} filter={u("b2")} />,
    <rect key="core" x={vx - 3.5} y={vy - 14} width={7} height={28} fill={core} opacity={0.17} filter={u("b2")} />,
    // il riflesso sul pavimento
    <ellipse key="floor" cx={vx} cy={vy + 27} rx={20} ry={4.5} fill={glow} opacity={0.12} />,
  ];

  if (zone === "Le Vene") {
    // il condotto è caldo: la luce ha una febbre attorno
    els.unshift(
      <ellipse key="vein" cx={vx} cy={vy + 4} rx={82} ry={46} fill={u("ember")} opacity={0.05} />,
    );
  }

  // a volte, contro la luce, una figura. più spesso quando sei stanco.
  if (chance(rng, 0.12 + dread * 0.3)) {
    els.push(
      <rect
        key="fig"
        x={vx - 2.6}
        y={vy - 8}
        width={5.2}
        height={22}
        rx={2.6}
        fill="#000"
        opacity={0.92}
        filter={u("b2")}
      />,
    );
  }
  return els;
}

/* ------------------------------------------------------------------ */
/* Le presenze                                                         */
/* ------------------------------------------------------------------ */

function entity(rng: Rng, u: UrlOf) {
  const x = between(rng, 142, 178);
  const lean = between(rng, -5, 5);
  return (
    <>
      {/* la lampada dietro di lei si spegne per cortesia: resta un alone */}
      <ellipse cx={x} cy={62} rx={80} ry={54} fill={u("bone")} opacity={0.12} />
      <ellipse cx={x} cy={62} rx={40} ry={44} fill={u("bone")} opacity={0.14} />
      {/* fumo verticale, più nero del buio */}
      <ellipse cx={x} cy={104} rx={22} ry={9} fill="#000" opacity={0.7} filter={u("b5")} />
      <ellipse cx={x} cy={68} rx={13} ry={44} fill="#000" opacity={0.95} filter={u("b2")} />
      <ellipse cx={x + lean} cy={30} rx={7.5} ry={24} fill="#000" opacity={0.9} filter={u("b2")} />
      <ellipse cx={x + lean * 1.6} cy={12} rx={4} ry={12} fill="#000" opacity={0.75} filter={u("b5")} />
    </>
  );
}

function custode(u: UrlOf) {
  return (
    <>
      {/* una lampada bassa, da qualche parte. il resto è lui. */}
      <circle cx={128} cy={86} r={44} fill={u("ember")} opacity={0.12} />
      <circle cx={128} cy={86} r={11} fill={u("ember")} opacity={0.4} className="flicker" />
      {/* la forma lunga di un uomo, seduta, paziente */}
      <ellipse cx={176} cy={76} rx={15} ry={23} fill="#000" opacity={0.94} filter={u("b2")} />
      <circle cx={173} cy={48} r={8.5} fill="#000" opacity={0.94} filter={u("b2")} />
      <ellipse cx={180} cy={100} rx={24} ry={7} fill="#000" opacity={0.85} filter={u("b2")} />
      {/* l'ombra che getta è più lunga di quanto dovrebbe */}
      <ellipse cx={244} cy={103} rx={58} ry={5} fill="#000" opacity={0.55} filter={u("b5")} />
    </>
  );
}

function mirror(rng: Rng, u: UrlOf) {
  const sway = between(rng, -3, 3);
  return (
    <>
      <ellipse cx={160} cy={62} rx={80} ry={52} fill={u("bone")} opacity={0.07} />
      {/* una lastra pallida, in piedi nel buio */}
      <rect x={141} y={22} width={38} height={84} rx={4} fill={BONE} opacity={0.06} filter={u("b2")} />
      <rect x={148} y={28} width={24} height={72} rx={3} fill={BONE} opacity={0.05} filter={u("b2")} />
      {/* il lenzuolo: un'ombra che copre quasi tutto */}
      <ellipse cx={160 + sway} cy={42} rx={23} ry={26} fill="#000" opacity={0.85} filter={u("b2")} />
      {/* il riflesso arriva con mezzo secondo di ritardo */}
      <rect x={152 + sway * 2} y={26} width={38} height={84} rx={4} fill={BONE} opacity={0.03} filter={u("b5")} />
    </>
  );
}

function well(u: UrlOf) {
  return (
    <>
      {/* la sala respira una nebbia bassa */}
      <ellipse cx={160} cy={92} rx={125} ry={24} fill={u("bone")} opacity={0.08} />
      {/* la bocca: un buco più nero del pavimento */}
      <ellipse cx={160} cy={90} rx={46} ry={14} fill="#000" opacity={0.75} filter={u("b5")} />
      <ellipse cx={160} cy={90} rx={28} ry={8.5} fill="#000" opacity={0.98} filter={u("b2")} />
      {/* la voce che sale: anelli d'aria appena visibili */}
      <ellipse cx={160} cy={72} rx={20} ry={5} fill="none" stroke={BONE} strokeOpacity={0.12} filter={u("b2")} />
      <ellipse cx={160} cy={56} rx={26} ry={6} fill="none" stroke={BONE} strokeOpacity={0.08} filter={u("b2")} />
      <ellipse cx={160} cy={38} rx={33} ry={7} fill="none" stroke={BONE} strokeOpacity={0.05} filter={u("b2")} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Le stanze rare                                                      */
/* ------------------------------------------------------------------ */

function fireflies(rng: Rng, u: UrlOf) {
  const els: ReactNode[] = [
    <ellipse key="fog" cx={160} cy={64} rx={130} ry={60} fill={u("gold")} opacity={0.05} />,
  ];
  for (let i = 0; i < 13; i++) {
    const x = between(rng, 36, 284);
    const y = between(rng, 26, 100);
    const r = 1 + rng() * 0.9;
    const gold = chance(rng, 0.7);
    const g = gold ? u("gold") : u("ember");
    els.push(
      <circle key={`h${i}`} cx={x} cy={y} r={r * 7} fill={g} opacity={0.2} />,
      <circle
        key={`c${i}`}
        cx={x}
        cy={y}
        r={r}
        fill={gold ? GOLD : EMBER}
        opacity={0.85}
        className={chance(rng, 0.35) ? "flicker" : undefined}
      />,
    );
  }
  return els;
}

function phone(u: UrlOf) {
  return (
    <>
      {/* qualcosa squilla, da solo, in una stanza spoglia */}
      <ellipse cx={160} cy={96} rx={62} ry={12} fill="#000" opacity={0.75} filter={u("b5")} />
      <ellipse cx={160} cy={82} rx={18} ry={9} fill="#000" opacity={0.9} filter={u("b2")} />
      <circle cx={160} cy={74} r={30} fill={u("ember")} opacity={0.13} />
      <circle cx={160} cy={74} r={7} fill={u("ember")} opacity={0.55} className="flicker" />
      {/* lo squillo si allarga nel buio */}
      <circle cx={160} cy={74} r={22} fill="none" stroke={BONE} strokeOpacity={0.1} filter={u("b2")} className="flicker" />
      <circle cx={160} cy={74} r={36} fill="none" stroke={BONE} strokeOpacity={0.06} filter={u("b2")} />
      <circle cx={160} cy={74} r={52} fill="none" stroke={BONE} strokeOpacity={0.03} filter={u("b2")} />
    </>
  );
}

function sleeper(u: UrlOf) {
  return (
    <>
      {/* una luce fioca da sopra, come in una corsia di notte */}
      <ellipse cx={168} cy={58} rx={70} ry={34} fill={u("bone")} opacity={0.09} />
      {/* la sagoma distesa, voltata verso il muro */}
      <ellipse cx={172} cy={86} rx={56} ry={10} fill="#000" opacity={0.94} filter={u("b2")} />
      <circle cx={124} cy={81} r={8} fill="#000" opacity={0.94} filter={u("b2")} />
      {/* in fila ordinata, le cose che non hai ancora trovato */}
      <circle cx={62} cy={103} r={1.6} fill={BONE} opacity={0.3} />
      <circle cx={46} cy={103} r={1.6} fill={BONE} opacity={0.24} />
      <circle cx={30} cy={103} r={1.6} fill={BONE} opacity={0.18} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* La Porta                                                            */
/* ------------------------------------------------------------------ */

function ironDoor(u: UrlOf) {
  return (
    <>
      {/* la roccia viva, appena rischiarata */}
      <ellipse cx={160} cy={60} rx={135} ry={78} fill={u("bone")} opacity={0.08} />
      {/* il ferro: una lastra più nera del buio */}
      <rect x={116} y={16} width={88} height={100} rx={8} fill="#000" opacity={0.94} filter={u("b2")} />
      {/* una sola serratura, all'altezza del cuore */}
      <circle cx={160} cy={66} r={16} fill={u("ember")} opacity={0.5} className="flicker" />
      <circle cx={160} cy={66} r={2.6} fill="#e8a087" opacity={0.9} />
      {/* da sotto la soglia filtra aria di fuori */}
      <ellipse cx={160} cy={114} rx={46} ry={3.5} fill={u("ember")} opacity={0.65} className="flicker" />
      <ellipse cx={160} cy={114} rx={22} ry={2} fill="#e8a087" opacity={0.4} className="flicker" />
    </>
  );
}
