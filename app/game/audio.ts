/**
 * Colonna sonora procedurale via Web Audio API: nessun file audio.
 * - drone di fondo (oscillatori detunati + rumore marrone filtrato)
 * - battito cardiaco legato alla lucidità (più bassa → più veloce e forte)
 * - gocce casuali in lontananza
 * - sting dissonante per l'Entità, rintocco per i finali
 */

const PREF_KEY = "noname.audio";

export function audioPref(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(PREF_KEY) !== "off";
}

export function setAudioPref(on: boolean) {
  try {
    window.localStorage.setItem(PREF_KEY, on ? "on" : "off");
  } catch {
    /* ignore */
  }
}

class Soundtrack {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private droneGain: GainNode | null = null;
  private noiseGain: GainNode | null = null;
  private shimmerGain: GainNode | null = null;
  private stalkGain: GainNode | null = null;
  private stalkPulse: GainNode | null = null;
  private heartVolume = 0.2;
  private bpm = 46;
  private beatTimer: ReturnType<typeof setTimeout> | null = null;
  private dripTimer: ReturnType<typeof setTimeout> | null = null;
  /** Prima di questo istante l'hardware sta ancora scaldando: solo silenzio. */
  private readyAt = 0;
  private muted = false;

  /** Mai schedulare prima di readyAt: il warm-up del thread audio gracchia. */
  private tSafe(): number {
    return this.ctx ? Math.max(this.ctx.currentTime, this.readyAt) : 0;
  }

  /** Da chiamare dentro un gesto utente (click). Idempotente. */
  start() {
    if (this.ctx) {
      this.resume();
      return;
    }
    if (typeof window === "undefined" || !("AudioContext" in window)) return;

    // "playback": buffer hardware grandi. La latenza interattiva non ci
    // serve (audio ambientale) e i buffer piccoli vanno in underrun
    // all'avvio, quando il main thread è occupato dalla navigazione.
    const ctx = new AudioContext({ latencyHint: "playback" });
    this.ctx = ctx;

    // Tutto parte 220ms nel futuro: durante il warm-up dell'hardware (e il
    // tonfo fisico dell'accensione del DAC) il contesto renderizza silenzio.
    // Creando il contesto sul pointerdown del bottone, questa finestra cade
    // mentre il dito è ancora premuto, prima dell'inizio vero della discesa.
    const t0 = ctx.currentTime + 0.22;
    this.readyAt = t0;

    // Fade-in del master: partire a volume pieno produce una discontinuità
    // nel primo campione — il gracchio che si sente a volte all'avvio.
    this.master = ctx.createGain();
    this.master.gain.setValueAtTime(0, ctx.currentTime);
    this.master.gain.setValueAtTime(0, t0);
    this.master.gain.linearRampToValueAtTime(0.8, t0 + 0.7);
    this.master.connect(ctx.destination);

    /* ---- drone: due fondamentali che battono + una quinta lontana ---- */
    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0.05;
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = "lowpass";
    droneFilter.frequency.value = 160;
    this.droneGain.connect(droneFilter);
    droneFilter.connect(this.master);

    for (const [freq, type, vol] of [
      [55, "sine", 1],
      [55.7, "triangle", 0.7],
      [82.41, "sine", 0.25],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = vol;
      osc.connect(g);
      g.connect(this.droneGain);
      osc.start(t0);
    }

    // respiro lentissimo del drone
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain);
    lfoGain.connect(this.droneGain.gain);
    lfo.start(t0);

    /* ---- rumore marrone: il labirinto che respira ---- */
    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    noise.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.value = 400;
    this.noiseGain = ctx.createGain();
    this.noiseGain.gain.value = 0.015;
    noise.connect(noiseFilter);
    noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.master);
    noise.start(t0);

    /* ---- shimmer: fischio sottile che emerge a lucidità bassa ---- */
    const shimmer = ctx.createOscillator();
    shimmer.type = "sine";
    shimmer.frequency.value = 1244; // dissonante rispetto al drone
    const vib = ctx.createOscillator();
    vib.frequency.value = 5.5;
    const vibGain = ctx.createGain();
    vibGain.gain.value = 12;
    vib.connect(vibGain);
    vibGain.connect(shimmer.frequency);
    this.shimmerGain = ctx.createGain();
    this.shimmerGain.gain.value = 0;
    shimmer.connect(this.shimmerGain);
    this.shimmerGain.connect(this.master);
    shimmer.start(t0);
    vib.start(t0);

    /* ---- strato della caccia: una pulsazione bassa quando sei braccato ---- */
    const stalk = ctx.createOscillator();
    stalk.type = "sine";
    stalk.frequency.value = 43.65; // sotto il drone: si sente nel petto, non nelle orecchie
    this.stalkGain = ctx.createGain();
    this.stalkGain.gain.value = 0; // muto finché non sei seguito
    stalk.connect(this.stalkGain);
    this.stalkGain.connect(this.master);
    stalk.start(t0);

    // Il "respiro" della presenza: modula il volume dello strato, ma la sua
    // profondità è a zero quando la caccia è zero — così non suona mai a vuoto.
    const pulse = ctx.createOscillator();
    pulse.frequency.value = 0.9;
    this.stalkPulse = ctx.createGain();
    this.stalkPulse.gain.value = 0;
    pulse.connect(this.stalkPulse);
    this.stalkPulse.connect(this.stalkGain.gain);
    pulse.start(t0);

    this.scheduleBeat();
    this.scheduleDrip();
  }

  suspend() {
    // NON sospendere l'hardware: spegnere e riaccendere lo stream di output
    // produce un tonfo fisico a ogni rientro. Silenziamo con una rampa e
    // teniamo il contesto vivo.
    if (!this.ctx || !this.master) return;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25);
  }

  resume() {
    if (!this.ctx || !this.master) return;
    // Il browser può aver sospeso da solo il contesto (tab in background):
    // qui resume() è un no-op se è già attivo, quindi non riaccende l'hardware.
    if (this.ctx.state === "suspended") void this.ctx.resume();
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(this.muted ? 0 : 0.8, this.ctx.currentTime, 0.3);
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (!this.ctx || !this.master) return;
    this.master.gain.setTargetAtTime(muted ? 0 : 0.8, this.ctx.currentTime, 0.3);
  }

  /** Adatta l'atmosfera allo stato del giocatore. */
  setMood(sanity: number, aggression: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const dread = (100 - sanity) / 100; // 0 = lucido, 1 = al limite

    this.bpm = 44 + dread * 58 + aggression * 2;
    this.heartVolume = 0.12 + dread * 0.5;

    this.noiseGain?.gain.setTargetAtTime(0.015 + dread * 0.04, t, 1.5);
    this.shimmerGain?.gain.setTargetAtTime(
      sanity < 40 ? (0.4 - sanity / 100) * 0.035 : 0,
      t,
      2.5,
    );
    this.droneGain?.gain.setTargetAtTime(0.05 + aggression * 0.006, t, 1.5);
  }

  /** La pressione della caccia: 0 = ti ha perso, sale mentre ti segue. */
  setHunt(level: number) {
    if (!this.ctx || !this.stalkGain || !this.stalkPulse) return;
    const t = this.ctx.currentTime;
    const base = level <= 0 ? 0 : 0.03 + Math.min(level, 5) * 0.018;
    // La profondità del respiro sta sotto il livello base: il volume oscilla
    // ma non torna mai a zero né si inverte. A caccia zero, tutto è muto.
    this.stalkGain.gain.setTargetAtTime(base, t, 1.2);
    this.stalkPulse.gain.setTargetAtTime(base * 0.6, t, 1.2);
  }

  /* ---- battito cardiaco: lub-dub ---- */

  private scheduleBeat() {
    if (!this.ctx) return;
    this.thump(this.tSafe() + 0.08, this.heartVolume);
    this.thump(this.tSafe() + 0.36, this.heartVolume * 0.6);
    this.beatTimer = setTimeout(() => this.scheduleBeat(), (60 / this.bpm) * 1000);
  }

  private thump(when: number, vol: number) {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(58, when);
    osc.frequency.exponentialRampToValueAtTime(28, when + 0.14);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.22);
    osc.connect(g);
    g.connect(this.master);
    osc.start(when);
    osc.stop(when + 0.3);
  }

  /* ---- gocce in lontananza ---- */

  private scheduleDrip() {
    this.dripTimer = setTimeout(
      () => {
        this.drip();
        this.scheduleDrip();
      },
      4000 + Math.random() * 11000,
    );
  }

  private drip() {
    if (!this.ctx || !this.master) return;
    const t = this.tSafe();
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    const base = 1400 + Math.random() * 900;
    osc.frequency.setValueAtTime(base, t);
    osc.frequency.exponentialRampToValueAtTime(base * 0.4, t + 0.09);
    const g = this.ctx.createGain();
    const vol = 0.008 + Math.random() * 0.02;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.35);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  /* ---- eventi ---- */

  /** "Tock" secco a ogni scelta: colpo basso + tick alto. */
  click() {
    if (!this.ctx || !this.master) return;
    // 30ms nel futuro: impercettibile, ma tiene il primo click (quello che
    // crea il contesto) fuori dalla finestra di avvio del thread audio.
    const t = this.tSafe() + 0.03;

    const thud = this.ctx.createOscillator();
    thud.type = "triangle";
    thud.frequency.setValueAtTime(190, t);
    thud.frequency.exponentialRampToValueAtTime(65, t + 0.08);
    const thudGain = this.ctx.createGain();
    thudGain.gain.setValueAtTime(0, t);
    thudGain.gain.linearRampToValueAtTime(0.22, t + 0.003);
    thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    thud.connect(thudGain);
    thudGain.connect(this.master);
    thud.start(t);
    thud.stop(t + 0.18);

    const tick = this.ctx.createOscillator();
    tick.type = "square";
    tick.frequency.setValueAtTime(1900, t);
    const tickFilter = this.ctx.createBiquadFilter();
    tickFilter.type = "bandpass";
    tickFilter.frequency.value = 1900;
    tickFilter.Q.value = 4;
    const tickGain = this.ctx.createGain();
    tickGain.gain.setValueAtTime(0, t);
    tickGain.gain.linearRampToValueAtTime(0.08, t + 0.002);
    tickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    tick.connect(tickFilter);
    tickFilter.connect(tickGain);
    tickGain.connect(this.master);
    tick.start(t);
    tick.stop(t + 0.05);
  }

  /** Cluster dissonante: l'Entità è nella stanza. */
  sting() {
    if (!this.ctx || !this.master) return;
    const t = this.tSafe();
    for (const freq of [196, 207.65, 277.18]) {
      const osc = this.ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = freq;
      const f = this.ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 900;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.022, t + 1.4);
      g.gain.exponentialRampToValueAtTime(0.001, t + 4.5);
      osc.connect(f);
      f.connect(g);
      g.connect(this.master);
      osc.start(t);
      osc.stop(t + 5);
    }
  }

  /** Rintocco funebre per i finali. */
  toll(bright: boolean) {
    if (!this.ctx || !this.master) return;
    const t = this.tSafe();
    const freqs = bright ? [196, 392, 587.33] : [98, 116.54, 196];
    freqs.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const g = this.ctx!.createGain();
      const start = t + i * 0.04;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.12 / (i + 1), start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, start + 6);
      osc.connect(g);
      g.connect(this.master!);
      osc.start(start);
      osc.stop(start + 6.5);
    });
  }

  dispose() {
    if (this.beatTimer) clearTimeout(this.beatTimer);
    if (this.dripTimer) clearTimeout(this.dripTimer);
    void this.ctx?.close();
    this.ctx = null;
  }
}

let instance: Soundtrack | null = null;

export function getSoundtrack(): Soundtrack {
  if (!instance) instance = new Soundtrack();
  return instance;
}
