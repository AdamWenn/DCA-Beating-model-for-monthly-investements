import React, { useMemo, useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceArea,
  Area,
  AreaChart,
} from "recharts";
import * as Papa from "papaparse";

/**
 * NASDAQ Buy‑and‑Hold – Immersive Editorial Build (2‑Year Look‑Back)
 * ------------------------------------------------------------------
 * A bold, text‑led scrollytelling design that *proves* the signal with
 * evidence. Fewer boxes. More atmosphere. Motion as meaning.
 *
 * What changed vs previous:
 *  - Aurora background + grain → cinematic depth without heavy assets
 *  - Ribbon headline (animated) + word‑by‑word intro
 *  - Full‑bleed evidence chart with **overlay chips** (not boxed panels)
 *  - Curved SVG section separators for flow (no hard edges)
 *  - Metric **pills** float above content and react to scroll
 *  - Editorial **thesis blocks** with pull‑quotes
 *  - Glass **signal puck** (BUY/HOLD) with tiny motion
 *  - Minimal comparison (focus on the story)
 *
 * Dependencies: Tailwind, framer‑motion, recharts, papaparse (already used)
 */

// -------------------- Tiny UI atoms --------------------
const AnimatedHeadline = ({ text }: { text: string }) => {
  const words = text.split(" ");
  return (
    <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.1]">
      {words.map((w, i) => (
        <motion.span
          key={i}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="inline-block mr-[0.35ch]"
        >
          {w}
        </motion.span>
      ))}
    </h1>
  );
};

const Grain = () => (
  <div
    className="pointer-events-none fixed inset-0 z-10 opacity-[0.10] mix-blend-overlay"
    style={{
      backgroundImage:
        'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'140\' height=\'140\' viewBox=\'0 0 140 140\'><filter id=\'n\'><feTurbulence type=\'fractalNoise\' baseFrequency=\'.8\' numOctaves=\'4\' stitchTiles=\'stitch\'/></filter><rect width=\'100%\' height=\'100%\' filter=\'url(%23n)\' opacity=\'0.25\'/></svg>")',
      backgroundSize: '140px 140px',
    }}
  />
);

const Aurora = () => (
  <div aria-hidden className="fixed inset-0 -z-10">
    <div
      className="absolute -top-24 -left-24 h-[60vh] w-[60vh] rounded-full blur-3xl opacity-40"
      style={{
        background:
          'radial-gradient(60% 60% at 50% 50%, #22d3ee55, transparent 70%)',
      }}
    />
    <div
      className="absolute top-1/3 -right-24 h-[60vh] w-[60vh] rounded-full blur-3xl opacity-30"
      style={{
        background:
          'radial-gradient(60% 60% at 50% 50%, #34d39955, transparent 70%)',
      }}
    />
    <div
      className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[50vh] w-[70vw] rounded-[40%] blur-3xl opacity-30"
      style={{
        background:
          'conic-gradient(from 90deg at 50% 50%, #22d3ee33, #a78bfa22, #22d3ee33)',
      }}
    />
  </div>
);

// Count-up hook for numeric reveals
function useCountUp(value: number, duration = 900) {
  const [v, setV] = React.useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setV(value * p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return v;
}

const MetricChip = ({ label, value }: { label: string; value: string }) => (
  <motion.div
    initial={{ y: 8, opacity: 0 }}
    whileInView={{ y: 0, opacity: 1 }}
    viewport={{ once: true }}
    className="backdrop-blur-md bg-white/5 ring-1 ring-white/10 text-white rounded-full px-3 py-1 text-[11px] flex items-center gap-2"
  >
    <span className="text-white/60">{label}</span>
    <span className="font-semibold tabular-nums">{value}</span>
  </motion.div>
);

const PullQuote = ({ children }: { children: React.ReactNode }) => (
  <blockquote className="relative pl-6 text-lg leading-relaxed text-zinc-200">
    <span className="absolute left-0 top-0 text-cyan-300">"</span>
    {children}
    <span className="text-cyan-300">"</span>
  </blockquote>
);

const DividerCurve = () => (
  <svg
    className="block w-full h-16 text-white/5"
    viewBox="0 0 1200 120"
    preserveAspectRatio="none"
    aria-hidden
  >
    <path d="M0,0 C300,120 900,0 1200,120 L1200,0 L0,0 Z" fill="currentColor" />
  </svg>
);

const SignalPuck = ({
  state,
  date,
}: {
  state: 'BUY' | 'HOLD' | null;
  date?: string;
}) => (
  <motion.div
    initial={{ scale: 0.95, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    className="inline-flex items-center gap-3 rounded-full px-4 py-2 backdrop-blur-md bg-white/10 ring-1 ring-white/15"
  >
    <div
      className={`h-2.5 w-2.5 rounded-full ${
        state === 'BUY'
          ? 'bg-emerald-400 shadow-[0_0_20px_4px_rgba(74,222,128,0.35)]'
          : 'bg-zinc-400'
      }`}
    />
    <span className="tracking-wide text-xs uppercase text-white/70">Today</span>
    <span className={`text-sm font-semibold ${state === 'BUY' ? 'text-emerald-300' : 'text-zinc-200'}`}>{state ?? '—'}</span>
    <span className="text-[11px] text-white/60">{date || ''}</span>
  </motion.div>
);

// -------------------- Types & math --------------------
interface Row {
  date: Date;
  close: number;
  signal: 'BUY' | 'HOLD';
  benchmark?: number;
  strategy?: number;
}
interface Point {
  t: string;
  strategy: number;
  buyHold: number;
  benchmark: number;
  signal?: 'BUY' | 'HOLD';
}
const byDateAsc = (a: Row, b: Row) => a.date.getTime() - b.date.getTime();
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const stdev = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};
const toISO = (d: Date) => d.toISOString().slice(0, 10);
const pct = (n: number) => `${n >= 0 ? '+' : ''}${(n * 100).toFixed(2)}%`;
const dailyReturns = (ws: number[]) => ws.slice(1).map((w, i) => w / ws[i] - 1);
const sharpe = (rs: number[]) => {
  const s = stdev(rs);
  return s ? (mean(rs) / s) * Math.sqrt(252) : 0;
};
const maxDrawdown = (w: number[]) => {
  let peak = w[0],
    m = 0;
  for (let i = 0; i < w.length; i++) {
    peak = Math.max(peak, w[i]);
    m = Math.min(m, (w[i] - peak) / peak);
  }
  return -m;
};
const cvar95 = (rs: number[]) => {
  const losses = rs.filter((r) => r < 0).sort((a, b) => a - b);
  if (!losses.length) return 0;
  const cut = Math.floor(0.95 * losses.length);
  const tail = losses.slice(cut);
  return tail.length ? -mean(tail) : 0;
};

// -------------------- CSV --------------------
function parseCSV(text: string): Row[] {
  const res = Papa.parse(text, { header: true, dynamicTyping: true, skipEmptyLines: true });
  const cols = (res.meta.fields || []).map((s) => s.trim().toLowerCase());
  const idx = {
    date: cols.findIndex((c) => ['date', 'timestamp'].includes(c)),
    close: cols.findIndex((c) => ['close', 'price', 'adjclose', 'adj_close', 'nav'].includes(c)),
    signal: cols.findIndex((c) => ['signal', 'recommendation', 'state'].includes(c)),
    benchmark: cols.findIndex((c) => ['benchmark', 'qqq', 'nasdaq', 'ndx'].includes(c)),
    strategy: cols.findIndex((c) => ['strategy', 'wealth', 'portfolio'].includes(c)),
  };
  const toVal = (row: any, i: number) => (i >= 0 ? row[res.meta.fields![i]] : undefined);
  const rows: Row[] = [];
  for (const r of res.data as any[]) {
    const d = new Date(String(toVal(r, idx.date)));
    if (isNaN(d.getTime())) continue;
    const close = Number(toVal(r, idx.close));
    if (!isFinite(close)) continue;
    const sigRaw = String(toVal(r, idx.signal) ?? 'HOLD').toUpperCase();
    const signal = sigRaw === 'BUY' ? 'BUY' : 'HOLD';
    const benchmark = idx.benchmark >= 0 ? Number(toVal(r, idx.benchmark)) : undefined;
    const strategy = idx.strategy >= 0 ? Number(toVal(r, idx.strategy)) : undefined;
    rows.push({ date: d, close, signal, benchmark, strategy });
  }
  return rows.sort(byDateAsc);
}

function buildSeries(rows: Row[]): Point[] {
  if (!rows.length) return [];
  const wealthS = [1],
    wealthB = [1],
    wealthBM = [1];
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1],
      curr = rows[i];
    const assetRet = curr.close / prev.close - 1;
    // Strategy: invested the *day AFTER* a BUY state
    const dayRet = prev.signal === 'BUY' ? assetRet : 0;
    wealthS.push((rows[i].strategy ?? wealthS[i - 1] * (1 + dayRet)) || wealthS[i - 1] * (1 + dayRet));
    wealthB.push(wealthB[i - 1] * (1 + assetRet));
    const prevBM = isFinite(prev.benchmark!) ? prev.benchmark! : prev.close;
    const bmRet = isFinite(curr.benchmark!) ? curr.benchmark! / prevBM - 1 : assetRet;
    wealthBM.push(wealthBM[i - 1] * (1 + bmRet));
  }
  return rows.map((r, i) => ({
    t: toISO(r.date),
    strategy: wealthS[i] ?? wealthS[wealthS.length - 1],
    buyHold: wealthB[i] ?? wealthB[wealthB.length - 1],
    benchmark: wealthBM[i] ?? wealthBM[wealthBM.length - 1],
    signal: r.signal,
  }));
}

function twoYearSlice(series: Point[]): Point[] {
  if (!series.length) return series;
  const last = new Date(series[series.length - 1].t);
  const start = new Date(last);
  start.setDate(start.getDate() - 730);
  return series.filter((p) => new Date(p.t) >= start);
}

// -------------------- Tooltip --------------------
const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const get = (k: string) => payload.find((p: any) => p.dataKey === k)?.value ?? 0;
  return (
    <div className="rounded-xl backdrop-blur-md bg-white/10 ring-1 ring-white/15 p-3 text-xs text-white/90 space-y-1">
      <div className="font-medium text-white">{label}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span>Strategy</span>
        <span className="tabular-nums text-right">{get('strategy').toFixed(3)}</span>
        <span>Benchmark</span>
        <span className="tabular-nums text-right">{get('benchmark').toFixed(3)}</span>
        <span>Buy & Hold</span>
        <span className="tabular-nums text-right">{get('buyHold').toFixed(3)}</span>
      </div>
    </div>
  );
};

// -------------------- Component --------------------
export default function BuyHoldImmersive() {
  const [csvText, setCsvText] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'story' | 'plan' | 'flow'>('story');

  // Demo inline so it renders out of the box
  useEffect(() => {
    const demo = `date,close,signal
2023-01-03,260,HOLD
2023-01-04,262,HOLD
2023-01-05,255,BUY
2023-01-06,261,BUY
2023-01-09,265,BUY
2023-03-01,295,BUY
2023-06-01,350,BUY
2023-09-01,370,HOLD
2023-12-01,390,BUY
2024-03-01,410,BUY
2024-06-03,440,BUY
2024-09-02,430,HOLD
2024-12-02,455,BUY
2025-03-03,468,BUY
2025-06-02,480,BUY
2025-09-01,490,BUY`;
    setCsvText(demo);
  }, []);

  useEffect(() => {
    if (!csvText) return;
    try {
      setRows(parseCSV(csvText));
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Parse error');
    }
  }, [csvText]);

  const seriesAll = useMemo(() => buildSeries(rows), [rows]);
  const series2y = useMemo(() => twoYearSlice(seriesAll), [seriesAll]);

  // Stats
  const stats = useMemo(() => {
    if (series2y.length < 3) return null;
    const wS = series2y.map((p) => p.strategy),
      wB = series2y.map((p) => p.buyHold);
    const rsS = dailyReturns(wS),
      rsB = dailyReturns(wB);
    const years =
      (new Date(series2y[series2y.length - 1].t).getTime() -
        new Date(series2y[0].t).getTime()) /
      (365 * 24 * 3600 * 1000);
    const cagr = (w: number[]) => w[w.length - 1] ** (1 / Math.max(1e-6, years)) - 1;
    return {
      strat: {
        total: wS[wS.length - 1] - 1,
        cagr: cagr(wS),
        vol: stdev(rsS) * Math.sqrt(252),
        sharpe: sharpe(rsS),
        maxDD: maxDrawdown(wS),
        cvar: cvar95(rsS),
        hit: rsS.filter((r) => r > 0).length / Math.max(1, rsS.length),
      },
      bh: {
        total: wB[wB.length - 1] - 1,
        cagr: cagr(wB),
        vol: stdev(rsB) * Math.sqrt(252),
        sharpe: sharpe(rsB),
        maxDD: maxDrawdown(wB),
      },
    };
  }, [series2y]);

  const latest = rows[rows.length - 1];
  const today: 'BUY' | 'HOLD' | null = latest ? latest.signal : null;

  // Scroll effects
  const { scrollYProgress } = useScroll();
  const topBar = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const heroShift = useTransform(scrollYProgress, (v) => v * -40);

  // Build audit trail (changes only)
  const audit = useMemo(() => {
    const a: { date: string; signal: 'BUY' | 'HOLD' }[] = [];
    let prev: 'BUY' | 'HOLD' | null = null;
    for (const r of rows) {
      if (r.signal !== prev) {
        a.push({ date: toISO(r.date), signal: r.signal });
        prev = r.signal;
      }
    }
    return a.slice(-12).reverse();
  }, [rows]);

  // Helper to render the full-bleed chart (shared)
  const EvidenceChart = (
    <motion.div
      initial={{ clipPath: 'inset(10% 10% 10% 10% round 24px)', opacity: 0.6 }}
      whileInView={{ clipPath: 'inset(0% 0% 0% 0% round 24px)', opacity: 1 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      className="relative h-[420px] w-full group [perspective:1200px]"
    >
      <motion.div
        whileHover={{ rotateX: -2.5, rotateY: 2.5, scale: 1.01 }}
        transition={{ type: 'spring', stiffness: 120, damping: 14 }}
        className="h-full w-full rounded-[24px] ring-1 ring-white/10 bg-gradient-to-b from-white/5 to-transparent"
      >
        <ResponsiveContainer>
          <AreaChart data={series2y} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gS" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gB" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#94a3b8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="t" tick={{ fontSize: 11, fill: "#a1a1aa" }} tickMargin={8} minTickGap={24} />
            <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} tickMargin={8} domain={["auto", "auto"]} />
            <Tooltip content={<Tip />} />
            <Area
              type="monotone"
              dataKey="buyHold"
              name="Buy & Hold"
              stroke="#94a3b8"
              strokeWidth={1.25}
              fill="url(#gB)"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="strategy"
              name="Strategy"
              stroke="#34d399"
              strokeWidth={2}
              fill="url(#gS)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Overlay chips anchored to top-right */}
      {stats && (
        <div className="pointer-events-none absolute top-3 right-3 flex flex-wrap gap-2 justify-end">
          <MetricChip label="Vol (ann.)" value={pct(stats.strat.vol)} />
          <MetricChip label="CVaR 95%" value={pct(-stats.strat.cvar)} />
          <MetricChip label="Hit‑Rate" value={pct(stats.strat.hit)} />
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="min-h-screen w-full text-zinc-100 bg-[#0B0C10] overflow-x-hidden">
      <Aurora />
      <Grain />
      <motion.div
        style={{ scaleX: topBar }}
        className="fixed left-0 right-0 top-0 h-1 origin-left bg-cyan-300/80 z-40"
      />

      {/* MODE TOGGLE to satisfy original plan + immersive story */}
      <div className="sticky top-2 z-30 mx-auto max-w-6xl px-4 mt-2 flex justify-end">
        <div className="inline-flex overflow-hidden rounded-full ring-1 ring-white/15 backdrop-blur-md bg-white/10">
          <button
            onClick={() => setMode('story')}
            className={`px-3 py-1.5 text-xs ${mode === 'story' ? 'bg-white/15 text-white' : 'text-white/70'}`}
          >
            Story
          </button>
          <button
            onClick={() => setMode('plan')}
            className={`px-3 py-1.5 text-xs ${mode === 'plan' ? 'bg-white/15 text-white' : 'text-white/70'}`}
          >
            Plan
          </button>
          <button
            onClick={() => setMode('flow')}
            className={`px-3 py-1.5 text-xs ${mode==='flow' ? 'bg-white/15 text-white' : 'text-white/70'}`}
          >
            Flow
          </button>
        </div>
      </div>

      {mode === 'story' ? (
        <>
          {/* HERO */}
          <section className="relative mx-auto max-w-6xl px-4 pt-16 pb-10">
            <motion.div style={{ y: heroShift }} className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <SignalPuck state={today} date={latest ? toISO(latest.date) : ''} />
                {stats && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <MetricChip label="2Y Total" value={pct(stats.strat.total)} />
                    <MetricChip label="Sharpe" value={stats.strat.sharpe.toFixed(2)} />
                    <MetricChip label="Max DD" value={pct(-stats.strat.maxDD)} />
                  </div>
                )}
              </div>

              <AnimatedHeadline text="Buy-and-Hold, Explained Like a Story" />
              <p className="max-w-2xl text-zinc-300 text-lg">
                A text‑forward, confidence‑scored stance for NASDAQ. We pair a 2‑year historical lens with clear, auditable signals—no hype, just evidence.
              </p>

              {/* Upload */}
              <label className="inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/15 transition ring-1 ring-white/15 px-4 py-2 cursor-pointer">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const r = new FileReader();
                    r.onload = () => setCsvText(String(r.result));
                    r.readAsText(f);
                  }}
                />
                <span className="text-sm">Upload CSV</span>
              </label>
            </motion.div>

            {/* Chart */}
            <div className="relative mt-12">{EvidenceChart}</div>
          </section>

          <DividerCurve />

          {/* Editorial narrative */}
          <section className="mx-auto max-w-4xl px-4 py-12 space-y-10">
            <div className="grid md:grid-cols-5 gap-10 items-start">
              <div className="md:col-span-3 space-y-4">
                <h2 className="text-2xl font-semibold">Why this stance</h2>
                <p className="text-zinc-300 leading-relaxed">
                  Summarize the data‑backed thesis: persistence of trend, volatility context, and the balance between drawdown risk and upside capture. Keep the copy calm and precise.
                </p>
                <PullQuote>We act only when evidence stacks, not on single‑day noise.</PullQuote>
                <p className="text-zinc-300 leading-relaxed">
                  Explain how the signal confirms across indicators, and when it historically under‑performs. Add one line on transaction costs and slippage assumptions baked into the numbers above.
                </p>
              </div>
              <aside className="md:col-span-2 space-y-3">
                {stats && (
                  <>
                    <MetricChip label="Strategy CAGR" value={pct(stats.strat.cagr)} />
                    <MetricChip label="Buy&Hold CAGR" value={pct(stats.bh.cagr)} />
                    <MetricChip label="DD Gap" value={pct(stats.bh.maxDD - stats.strat.maxDD)} />
                  </>
                )}
                <div className="text-[12px] text-white/60">
                  Figures reflect the last 730 days in your file. Past performance ≠ future returns.
                </div>
              </aside>
            </div>

            {/* Audit trail as a thin timeline */}
            <div className="mt-4">
              <h3 className="text-sm uppercase tracking-widest text-white/60 mb-3">Signal timeline</h3>
              <div className="relative pl-4">
                <div className="absolute left-1 top-0 bottom-0 w-px bg-white/10" />
                <div className="space-y-2">
                  {audit.length ? (
                    audit.map((a, i) => (
                      <div key={i} className="relative pl-4">
                        <div
                          className={`absolute left-0 top-1 h-2 w-2 rounded-full ${
                            a.signal === 'BUY' ? 'bg-emerald-400' : 'bg-zinc-400'
                          }`}
                        />
                        <div className="text-sm flex items-center justify-between">
                          <span className="text-white/80">{a.date}</span>
                          <span className={a.signal === 'BUY' ? 'text-emerald-300' : 'text-white/70'}>
                            {a.signal}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-white/60">No changes in the provided window.</div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <DividerCurve />

          {/* Minimal comparison / glossary */}
          <section className="mx-auto max-w-6xl px-4 pb-16">
            <div className="grid lg:grid-cols-3 gap-8 items-start">
              <div className="lg:col-span-2 rounded-[2rem] ring-1 ring-white/10 p-6 backdrop-blur-md bg-white/5">
                <h3 className="text-lg font-semibold mb-2">Compare at a glance</h3>
                {stats ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <MetricChip label="Strategy · Total" value={pct(stats.strat.total)} />
                    <MetricChip label="Strategy · Sharpe" value={stats.strat.sharpe.toFixed(2)} />
                    <MetricChip label="Strategy · MaxDD" value={pct(-stats.strat.maxDD)} />
                    <MetricChip label="Buy&Hold · Total" value={pct(stats.bh.total)} />
                    <MetricChip label="Buy&Hold · Sharpe" value={stats.bh.sharpe.toFixed(2)} />
                    <MetricChip label="Buy&Hold · MaxDD" value={pct(-stats.bh.maxDD)} />
                  </div>
                ) : (
                  <div className="text-sm text-white/60">Upload a CSV to compute performance.</div>
                )}
              </div>
              <div className="rounded-[2rem] ring-1 ring-white/10 p-6 backdrop-blur-md bg-white/5">
                <h3 className="text-lg font-semibold mb-2">Glossary</h3>
                <ul className="text-sm text-white/80 space-y-1 list-disc pl-5">
                  <li>
                    <span className="text-white/60">Sharpe</span> – Annualized risk‑adjusted return.
                  </li>
                  <li>
                    <span className="text-white/60">CVaR 95%</span> – Average of worst 5% days.
                  </li>
                  <li>
                    <span className="text-white/60">Max Drawdown</span> – Worst peak‑to‑trough loss.
                  </li>
                </ul>
              </div>
            </div>
            <p className="mt-8 text-[11px] text-white/50">
              Not financial advice. Educational visuals based on the provided CSV.
            </p>
          </section>
        </>
      ) : mode === 'plan' ? (
        /* === PLAN MODE: mirrors original IA (Today, Equity Performance, Comparison, Audit, Methodology) === */
        <main className="mx-auto max-w-7xl px-4 pt-16 pb-16 space-y-12">
          {/* Today */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="col-span-2 rounded-2xl bg-gradient-to-br from-zinc-900/70 to-zinc-900/30 ring-1 ring-zinc-800 p-6 flex items-center justify-between"
            >
              <div className="space-y-2">
                <div className="text-xs text-zinc-400">As of {latest ? toISO(latest.date) : '—'}</div>
                <div className="text-3xl font-semibold tracking-tight">
                  <span className={today === 'BUY' ? 'text-emerald-400' : 'text-zinc-200'}>{today ?? '—'}</span>
                </div>
                <p className="text-sm text-zinc-400 max-w-prose">
                  Historical, rules‑based signal derived from your CSV. Upload to update the call.
                </p>
              </div>
              {stats && (
                <div className="grid grid-cols-2 gap-3">
                  <MetricChip label="2Y Strategy" value={pct(stats.strat.total)} />
                  <MetricChip label="2Y Buy & Hold" value={pct(stats.bh.total)} />
                </div>
              )}
            </motion.div>
            <div className="rounded-2xl bg-zinc-900/60 ring-1 ring-zinc-800 p-6">
              <div className="text-xs text-zinc-400 mb-2">Recent Decisions</div>
              <div className="space-y-2 max-h-44 overflow-auto pr-1">
                {audit.length ? (
                  audit.map((a, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-zinc-300">{a.date}</span>
                      <span className={a.signal === 'BUY' ? 'text-emerald-400' : 'text-zinc-400'}>
                        {a.signal}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-zinc-500">No signal changes yet.</div>
                )}
              </div>
            </div>
          </section>

          {/* Equity Performance */}
          <section className="grid lg:grid-cols-[2fr,1fr] gap-6">
            <div className="rounded-2xl bg-zinc-900/60 ring-1 ring-zinc-800 p-4 lg:p-6">{EvidenceChart}</div>
            <aside className="lg:sticky lg:top-6 self-start">
              {stats ? (
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                  <MetricChip label="CAGR (Strategy)" value={pct(stats.strat.cagr)} />
                  <MetricChip label="Sharpe (ann.)" value={stats.strat.sharpe.toFixed(2)} />
                  <MetricChip label="Volatility (ann.)" value={pct(stats.strat.vol)} />
                  <MetricChip label="Max Drawdown" value={pct(-stats.strat.maxDD)} />
                  <MetricChip label="CVaR 95%" value={pct(-stats.strat.cvar)} />
                  <MetricChip label="Hit‑Rate" value={pct(stats.strat.hit)} />
                </div>
              ) : (
                <div className="text-sm text-zinc-500">Upload a CSV to compute stats.</div>
              )}
            </aside>
          </section>

          {/* Comparison */}
          <section>
            <h3 className="text-sm uppercase tracking-widest text-white/60 mb-3">Compare vs. Buy & Hold</h3>
            {stats ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <MetricChip label="Strategy · Total" value={pct(stats.strat.total)} />
                <MetricChip label="Strategy · Sharpe" value={stats.strat.sharpe.toFixed(2)} />
                <MetricChip label="Strategy · MaxDD" value={pct(-stats.strat.maxDD)} />
                <MetricChip label="Buy&Hold · Total" value={pct(stats.bh.total)} />
                <MetricChip label="Buy&Hold · Sharpe" value={stats.bh.sharpe.toFixed(2)} />
                <MetricChip label="Buy&Hold · MaxDD" value={pct(-stats.bh.maxDD)} />
              </div>
            ) : (
              <div className="text-sm text-zinc-500">Upload a CSV to compute performance.</div>
            )}
          </section>

          {/* Methodology */}
          <section>
            <h3 className="text-sm uppercase tracking-widest text-white/60 mb-3">Methodology</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-300">
              <li>2‑year look‑back: last 730 calendar days relative to latest CSV date.</li>
              <li>Strategy synthesis: invested on days after a BUY state; flat on HOLD.</li>
              <li>Risk metrics: daily returns from wealth; 252d annualization; Sharpe risk‑free = 0%.</li>
              <li>Drawdown: peak‑to‑trough; CVaR95 is magnitude of avg tail loss.</li>
            </ul>
          </section>
        </main>
      ) : null}

      {/* === FLOW MODE: new dedicated animation page/flow (no changes to existing elements) === */}
      {mode === 'flow' && (
        <section className="relative mx-auto max-w-6xl px-4 pt-16 pb-24 space-y-12">
          <AnimatedHeadline text="Designing & Evaluating a Buy-and-Hold Signal" />
          <p className="max-w-2xl text-zinc-300 text-lg">
            Scrollytelling walkthrough of the methodology, metrics and evidence — purpose-built animations here, leaving the main dashboard pristine.
          </p>

          {/* Step 1: Method intro card enters */}
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-3xl p-6 ring-1 ring-white/10 backdrop-blur-md bg-white/5"
          >
            <h3 className="text-xl font-semibold mb-1">Methodology</h3>
            <ul className="list-disc pl-5 text-sm text-white/80 space-y-1">
              <li>2-year look-back anchored to latest CSV date.</li>
              <li>Invested on days after a <span className="text-emerald-300">BUY</span> state; flat on HOLD.</li>
              <li>Risk: 252-day annualization; Sharpe, CVaR, MaxDD computed from wealth curve.</li>
            </ul>
          </motion.div>

          {/* Step 2: Evidence chart fades in (chart itself is static) */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            {EvidenceChart}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="absolute right-3 bottom-3 text-[11px] text-white/70"
            >
              Strategy vs. Buy & Hold (2-year)
            </motion.div>
          </motion.div>

          {/* Step 3: Metric counters */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <motion.div initial={{ scale: 0.96, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} className="rounded-2xl ring-1 ring-white/10 bg-white/5 p-4">
                <div className="text-xs text-white/60">Sharpe (ann.)</div>
                <div className="text-3xl font-semibold">{stats.strat.sharpe.toFixed(2)}</div>
              </motion.div>
              <motion.div initial={{ scale: 0.96, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} className="rounded-2xl ring-1 ring-white/10 bg-white/5 p-4">
                <div className="text-xs text-white/60">Max Drawdown</div>
                <div className="text-3xl font-semibold">{pct(-stats.strat.maxDD)}</div>
              </motion.div>
              <motion.div initial={{ scale: 0.96, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} className="rounded-2xl ring-1 ring-white/10 bg-white/5 p-4">
                <div className="text-xs text-white/60">CVaR 95%</div>
                <div className="text-3xl font-semibold">{pct(-stats.strat.cvar)}</div>
              </motion.div>
            </div>
          )}

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-sm text-white/60"
          >
            This flow is a separate, animated walkthrough. Your <strong>Story</strong> and <strong>Plan</strong> modes remain clean and static.
          </motion.p>
        </section>
      )}
    </div>
  );
}

// -------------------- Lightweight self-tests (dev only) --------------------
// These run in dev and help catch regressions in math helpers.
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  (function runSelfTests() {
    try {
      // mean / stdev
      console.assert(mean([1, 2, 3]) === 2, 'mean failed');
      const sd = stdev([1, 2, 3]);
      console.assert(Math.abs(sd - Math.sqrt(2 / 3)) < 1e-9, 'stdev failed');

      // dailyReturns
      const dr = dailyReturns([1, 1.1, 1.21]);
      console.assert(Math.abs(dr[0] - 0.1) < 1e-12 && Math.abs(dr[1] - 0.1) < 1e-12, 'dailyReturns failed');

      // sharpe (with zero stdev = 0)
      console.assert(sharpe([0, 0, 0]) === 0, 'sharpe zero-stdev failed');

      // maxDrawdown
      console.assert(Math.abs(maxDrawdown([1, 1.2, 0.9]) - (1 - 0.9 / 1.2)) < 1e-12, 'maxDrawdown failed');

      // cvar95 (all gains → 0)
      console.assert(cvar95([0.01, 0.02]) === 0, 'cvar95 positive-only failed');

      // buildSeries BUY semantics test: invested day AFTER BUY state
      const rows: Row[] = [
        { date: new Date('2024-01-01'), close: 100, signal: 'HOLD' },
        { date: new Date('2024-01-02'), close: 110, signal: 'BUY' }, // switch to BUY
        { date: new Date('2024-01-03'), close: 121, signal: 'BUY' }, // day after → earn 10%
      ];
      const ser = buildSeries(rows);
      const stratGrowth = ser[2].strategy; // should be 1.1 when earning 10% on Jan 3
      console.assert(Math.abs(stratGrowth - 1.1) < 1e-9, 'buildSeries BUY-next-day failed');

      // twoYearSlice: ensures slicing keeps last point
      const sliced = twoYearSlice([
        { t: '2022-01-01', strategy: 1, buyHold: 1, benchmark: 1 },
        { t: '2025-01-01', strategy: 2, buyHold: 2, benchmark: 2 },
      ] as Point[]);
      console.assert(sliced[sliced.length - 1].t === '2025-01-01', 'twoYearSlice failed');
    } catch (err) {
      console.warn('[self-tests]', err);
    }
  })();
}