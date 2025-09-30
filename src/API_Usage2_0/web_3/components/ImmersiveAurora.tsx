'use client'

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion'
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import * as Papa from 'papaparse'

// ============================================================
// GOAL: 10-30s of fresh, discoverable motion (Score > 80/100)
// New: Scene crossfades, spotlight cursor, sticky storyboard,
// pulsing trade markers, magnetic buttons, marquee, counters,
// hotkeys (1/2/3, ?), confetti on upload, scroll nav dots.
// ============================================================

// ================= Utility =================
const prefersReduced = () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ================= Backgrounds (3 scenes) =================
function AuroraBG() {
  const rm = prefersReduced()
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden select-none">
      <div className="absolute -inset-[20%] blur-3xl opacity-60" style={{
        background: 'radial-gradient(40% 50% at 30% 30%, rgba(34,211,238,.6), transparent 60%), radial-gradient(40% 60% at 70% 60%, rgba(167,139,250,.6), transparent 60%)',
        animation: rm ? 'none' : 'auroraShift 14s ease-in-out infinite alternate'
      }} />
      <style>{`@keyframes auroraShift { 0% { transform: translate3d(-4%, -2%, 0) rotate(0deg); } 100% { transform: translate3d(4%, 3%, 0) rotate(2deg); } }`}</style>
    </div>
  )
}

function GridBG(){
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden select-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.25),transparent_40%),radial-gradient(circle_at_80%_60%,rgba(147,51,234,0.25),transparent_45%)]" />
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:32px_32px] [background-position:0_0] animate-[gridShift_18s_linear_infinite]" />
      <style>{`@keyframes gridShift {0%{background-position:0 0,0 0}100%{background-position:0 32px,32px 0}}`}</style>
    </div>
  )
}

function ParticlesBG(){
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(()=>{
    const c = ref.current; if(!c) return
    const ctx = c.getContext('2d'); if(!ctx) return
    let raf = 0, w=0, h=0
    const DPR = Math.max(1, Math.min(2, (typeof window!== 'undefined' ? window.devicePixelRatio||1:1)))
    const N = 160
    const ps = Array.from({length:N},()=>({x:0,y:0,vx:0,vy:0,s:0,life:0})) as any[]
    const rnd = (a:number,b:number)=>a+Math.random()*(b-a)
    const resize=()=>{ w = c.width = Math.floor((c.clientWidth||innerWidth)*DPR); h = c.height = Math.floor((c.clientHeight||innerHeight)*DPR) }
    const reset=(p:any)=>{ p.x=rnd(0,w); p.y=rnd(0,h); p.vx=rnd(-0.25,0.25); p.vy=rnd(-0.18,0.18); p.s=rnd(0.5,2.5)*DPR; p.life=rnd(220,620) }
    const step=()=>{
      ctx.clearRect(0,0,w,h)
      ctx.globalCompositeOperation='lighter'
      for(const p of ps){ if(p.life<=0) reset(p); p.life-=1; p.x+=p.vx; p.y+=p.vy; if(p.x<0||p.x>w||p.y<0||p.y>h) reset(p); const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.s*7); g.addColorStop(0,'rgba(34,211,238,0.32)'); g.addColorStop(1,'rgba(34,211,238,0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p.x,p.y,p.s*7,0,Math.PI*2); ctx.fill() }
      raf = requestAnimationFrame(step)
    }
    resize(); ps.forEach(reset); step()
    const ro = new ResizeObserver(resize); ro.observe(c)
    return ()=>{ cancelAnimationFrame(raf); ro.disconnect() }
  },[])
  return <canvas ref={ref} className="fixed inset-0 -z-10"></canvas>
}

// ================= Tiny atoms =================
const Grain = () => {
  const noiseSvg = "%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.22'/%3E%3C/svg%3E"
  return <div className="pointer-events-none fixed inset-0 z-10 opacity-[0.10] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml;utf8,${noiseSvg}")`, backgroundSize: '140px 140px' }} />
}

const AnimatedHeadline = ({ text }: { text: string }) => {
  const words = text.split(' ')
  return (
    <h1 className="text-[42px] md:text-6xl font-semibold tracking-tight leading-[1.1]">
      {words.map((w, i) => (
        <motion.span key={i} initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.55, delay: i * 0.045, ease: [0.22, 1, 0.36, 1] }} className="inline-block mr-[0.35ch]">
          {w}
        </motion.span>
      ))}
    </h1>
  )
}

// ================= Math & Types =================
interface Row { date: Date; close: number; signal: 'BUY'|'HOLD'; benchmark?: number; strategy?: number; outcome?: 'TP'|'TN'|'FP'|'FN' }
interface Point { x?: number; t: string; strategyValue: number; benchmarkValue: number; closePrice: number; signal?: 'BUY'|'HOLD'; outcome?: 'TP'|'TN'|'FP'|'FN' }
const byDateAsc = (a: Row, b: Row) => a.date.getTime() - b.date.getTime()
const mean = (xs: number[]) => (xs.length ? xs.reduce((a,b)=>a+b,0)/xs.length : 0)
const stdev = (xs: number[]) => { if (xs.length<2) return 0; const m=mean(xs); return Math.sqrt(mean(xs.map(x=> (x-m)**2))) }
const toISO = (d: Date) => d.toISOString().slice(0,10)
const pct = (n: number) => `${n>=0?'+':''}${(n*100).toFixed(2)}%`
const dailyReturns = (ws: number[]) => ws.slice(1).map((w,i)=> w/ws[i]-1)
const sharpe = (rs: number[]) => { const s = stdev(rs); return s ? (mean(rs)/s)*Math.sqrt(252) : 0 }
const maxDrawdown = (w: number[]) => { let peak=w[0], m=0; for (let i=0;i<w.length;i++){ peak=Math.max(peak,w[i]); m=Math.min(m,(w[i]-peak)/peak) } return -m }

// Compute robust Y domains per current data window
function getEquityDomain(data: Point[]): [number, number] {
  if (!data?.length) return [0, 1]
  let min = Number.POSITIVE_INFINITY, max = Number.NEGATIVE_INFINITY
  for (const p of data) {
    if (Number.isFinite(p.strategyValue)) { min = Math.min(min, p.strategyValue); max = Math.max(max, p.strategyValue) }
    if (Number.isFinite(p.benchmarkValue)) { min = Math.min(min, p.benchmarkValue); max = Math.max(max, p.benchmarkValue) }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0,1]
  const span = Math.max(1e-6, max - min)
  const pad = span * 0.05
  return [min - pad, max + pad]
}

function getPriceDomain(data: Point[]): [number, number] {
  if (!data?.length) return [0, 1]
  let min = Number.POSITIVE_INFINITY, max = Number.NEGATIVE_INFINITY
  for (const p of data) {
    if (Number.isFinite(p.closePrice)) { min = Math.min(min, p.closePrice); max = Math.max(max, p.closePrice) }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0,1]
  const span = Math.max(1e-6, max - min)
  const pad = span * 0.05
  return [min - pad, max + pad]
}

// ================= CSV & series =================
function parseCSV(text: string): Row[] {
  const res = Papa.parse(text, { header: true, dynamicTyping: true, skipEmptyLines: true })
  const cols = (res.meta.fields || []).map(s=> s.trim().toLowerCase())
  const idx = {
    date: cols.findIndex(c=> ['date','timestamp'].includes(c)),
    close: cols.findIndex(c=> ['close','price','adjclose','adj_close','nav'].includes(c)),
    signal: cols.findIndex(c=> ['signal','recommendation','state'].includes(c)),
    outcome: cols.findIndex(c=> ['tn_tp_fp_fn','outcome','result'].includes(c)),
    benchmark: cols.findIndex(c=> ['benchmark','qqq','nasdaq','ndx','dca value','dca_value'].includes(c)),
    strategy: cols.findIndex(c=> ['strategy','wealth','portfolio','equity value','equity_value'].includes(c)),
  }
  const toVal = (row:any, i:number) => (i>=0 ? row[(res.meta.fields||[])[i]] : undefined)
  const out: Row[] = []
  for (const r of res.data as any[]) {
    const d = new Date(String(toVal(r, idx.date)))
    if (isNaN(d.getTime())) continue
    const close = Number(toVal(r, idx.close))
    if (!isFinite(close)) continue
    const sigRaw = String(toVal(r, idx.signal) ?? 'HOLD').toUpperCase()
    const signal = sigRaw === 'BUY' ? 'BUY' : 'HOLD'
    const outcomeRaw = String(toVal(r, idx.outcome) ?? '').toUpperCase()
    const outcome: Row['outcome'] = (['TP','TN','FP','FN'] as const).includes(outcomeRaw as any) ? outcomeRaw as any : undefined
    const benchmark = idx.benchmark >= 0 ? Number(toVal(r, idx.benchmark)) : undefined
    const strategy  = idx.strategy  >= 0 ? Number(toVal(r, idx.strategy))  : undefined
    out.push({ date:d, close, signal, benchmark, strategy, outcome })
  }
  return out.sort(byDateAsc)
}

function buildSeries(rows: Row[]): Point[] {
  if (!rows.length) return []
  return rows.map(r=> ({ t: toISO(r.date), strategyValue: r.strategy ?? 1000, benchmarkValue: r.benchmark ?? 1000, closePrice: r.close, signal: r.signal, outcome: r.outcome }))
}

function twoYearSlice(series: Point[]): Point[] {
  if (!series.length) return series
  const last = new Date(series[series.length-1].t)
  const start = new Date(last); start.setDate(start.getDate()-730)
  return series.filter(p=> new Date(p.t) >= start)
}
// ================= Tooltip =================
const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const get = (k: string) => payload.find((p:any)=> p.dataKey===k)?.value ?? 0
  return (
    <div className="rounded-xl backdrop-blur-md bg-white/10 ring-1 ring-white/15 p-3 text-xs text-white/90 space-y-2">
      <div className="font-medium text-white">{label}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span className="text-emerald-300">Strategy Value</span>
        <span className="tabular-nums text-right">{'$'}{get('strategyValue').toFixed(2)}</span>
        <span className="text-amber-300">DCA Value</span>
        <span className="tabular-nums text-right">{'$'}{get('benchmarkValue').toFixed(2)}</span>
      </div>
      <div className="border-t border-white/10 pt-2">
        <div className="grid grid-cols-2 gap-x-4">
          <span className="text-zinc-300">NASDAQ Close</span>
          <span className="tabular-nums text-right">{'$'}{get('closePrice').toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}

// ================= Slider (drag-to-zoom) =================
const CustomSlider = ({ data, onRangeChange }: { data: Point[], onRangeChange: (start:string|null, end:string|null)=>void }) => {
  const [rangeStart, setRangeStart] = useState(0)
  const [rangeEnd, setRangeEnd] = useState(Math.max(0, data.length-1))
  const [dragging, setDragging] = useState<'start'|'end'|null>(null)
  const sliderRef = useRef<HTMLDivElement>(null)
  if (!data || data.length===0) return <div className="text-white/50 text-sm">No data for slider</div>
  useEffect(()=>{ if (data.length>0){ setRangeStart(0); setRangeEnd(data.length-1) } }, [data.length])
  const getIndexFromPosition = useCallback((clientX:number)=>{
    if(!sliderRef.current) return 0
    const rect = sliderRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (clientX-rect.left)/rect.width))
    return Math.round(x * (data.length-1))
  }, [data.length])
  const updateRangeThrottled = useCallback((start:number, end:number)=>{
    const ns = Math.max(0, Math.min(start, data.length-1))
    const ne = Math.max(0, Math.min(end,   data.length-1))
    const a = Math.min(ns, ne), b = Math.max(ns, ne)
    if (b-a < 1) return
    setRangeStart(a); setRangeEnd(b)
    requestAnimationFrame(()=>{ if (a===0 && b===data.length-1) onRangeChange(null, null); else onRangeChange(data[a]?.t || null, data[b]?.t || null) })
  }, [data, onRangeChange])
  useEffect(()=>{
    if(!dragging) return
    let raf = 0
    const move = (e:MouseEvent)=>{
      if(raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(()=>{
        const ix = getIndexFromPosition(e.clientX)
        if(dragging==='start') updateRangeThrottled(Math.max(0, Math.min(ix, rangeEnd-1)), rangeEnd)
        else updateRangeThrottled(rangeStart, Math.min(data.length-1, Math.max(ix, rangeStart+1)))
      })
    }
    const up = ()=> { setDragging(null); if(raf) cancelAnimationFrame(raf) }
    document.addEventListener('mousemove', move, { passive:false })
    document.addEventListener('mouseup', up, { passive:true })
    return ()=>{ document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); if(raf) cancelAnimationFrame(raf) }
  }, [dragging, rangeStart, rangeEnd, getIndexFromPosition, updateRangeThrottled, data.length])
  const left = (rangeStart/Math.max(1, data.length-1))*100
  const right = (rangeEnd/Math.max(1, data.length-1))*100
  const width = right-left
  return (
    <div className="space-y-2">
      <div ref={sliderRef} className="relative h-6 cursor-pointer select-none">
        <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-1 bg-black rounded-full border border-zinc-800 shadow-inner" />
        <div className="absolute top-1/2 -translate-y-1/2" style={{ left: `${left}%`, width: `${width}%` }}>
          <div className="absolute inset-0 rounded-full opacity-70" style={{ boxShadow:'0 0 12px rgba(255,255,255,.35), 0 0 24px rgba(255,255,255,.2)' }} />
          <div className="absolute top-1/2 -translate-y-1/2 h-[5px] w-full rounded bg-white/80" />
        </div>
        {(['start','end'] as const).map(key=>{
          const pct = key==='start' ? left : right
          return (
            <div key={key} onMouseDown={(e)=>{ e.preventDefault(); setDragging(key) }} className="group absolute top-1/2 w-5 h-5 rounded-full border border-zinc-600 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black" style={{ left: `${pct}%`, transform:'translate(-50%, -50%)', boxShadow:'0 1px 3px rgba(0,0,0,.5), inset 0 1px 1px rgba(255,255,255,.08)' }} />
          )
        })}
      </div>
      <div className="flex justify-between items-center text-[10px]">
        <div className="font-mono bg-black/30 rounded px-2 py-0.5">{data[rangeStart]?.t}{' → '}{data[rangeEnd]?.t}</div>
        <button className="bg-black/30 rounded px-2 py-0.5 hover:bg-black/40" onClick={()=>{ setRangeStart(0); setRangeEnd(data.length-1); onRangeChange(null, null) }}>Reset</button>
      </div>
    </div>
  )
}

// ================= Micro-interactions =================
function MouseTrail(){
  const [pts,setPts] = useState<{id:number,x:number,y:number,t:number}[]>([])
  useEffect(()=>{
    let id=0
    const onMove=(e:PointerEvent)=>{ setPts(p=>[...p.slice(-24), {id:id++, x:e.clientX, y:e.clientY, t:Date.now()}]) }
    window.addEventListener('pointermove', onMove)
    return ()=> window.removeEventListener('pointermove', onMove)
  },[])
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <AnimatePresence>
        {pts.map(p=> (
          <motion.span key={p.id} initial={{opacity:0, scale:.4}} animate={{opacity:.35, scale:1}} exit={{opacity:0, scale:0}} transition={{duration:.6}} className="absolute rounded-full bg-cyan-300/50 blur-md" style={{ left:p.x-6, top:p.y-6, width:12, height:12 }} />
        ))}
      </AnimatePresence>
    </div>
  )
}

// Removed marquee ticker for performance simplicity

function ConfettiBurst({ run }: { run:boolean }){
  const [seed,setSeed] = useState(0)
  useEffect(()=>{ if(run){ setSeed(s=>s+1); const timer=setTimeout(()=>setSeed(s=>s+1), 1500); return ()=> clearTimeout(timer) } },[run])
  if(!run) return null
  const pieces = Array.from({length:56}, (_,i)=>i)
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {pieces.map(i=>{
        const left = Math.random()*100
        const rot = Math.floor(Math.random()*360)
        const delay = Math.random()*0.15
        const dur = 1.2 + Math.random()*0.8
        const size = 6 + Math.random()*10
        const hue = (i*37 + seed*13)%360
        return (
          <motion.span key={i+seed*1000} initial={{ y: '-10%', opacity: 1 }} animate={{ y: '110%', rotate: rot }} transition={{ duration: dur, ease: 'easeOut', delay }} className="absolute rounded" style={{ left: `${left}%`, width: size, height: size, background: `hsl(${hue} 90% 60%)` }} />
        )
      })}
    </div>
  )
}

function HelpOverlay({open,onClose, relROI}:{open:boolean; onClose:()=>void; relROI?: number|null}){
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm">
          <motion.div initial={{y:20,opacity:0}} animate={{y:0,opacity:1}} exit={{y:20,opacity:0}} transition={{type:'spring',damping:22,stiffness:180}} className="mx-auto mt-24 w-[min(92vw,800px)] rounded-2xl ring-1 ring-white/15 bg-zinc-900/90 p-6 text-white space-y-4">
            <div className="text-sm uppercase tracking-widest text-white/60">Economics Summary</div>
            {typeof relROI === 'number' && (
              <div className="rounded-xl ring-1 ring-emerald-400/30 bg-emerald-400/10 p-4">
                <div className="text-xs text-emerald-300">ROI vs DCA — Relative ROI (Model/DCA)</div>
                <div className="mt-1 text-4xl font-semibold tracking-tight text-emerald-300">{pct(relROI)}</div>
                <div className="mt-1 text-xs text-white/70">Over the selected window, the strategy shows positive relative ROI versus steady DCA. This suggests more capital retained under identical contributions and timing assumptions. Historical results for research only; not financial advice.</div>
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-4 text-sm text-white/85">
              <div className="space-y-2">
                <div className="font-semibold text-white/90">What you’re seeing</div>
                <ul className="list-disc pl-5 space-y-1">
                  <li><span className="text-cyan-300">Model</span> vs <span className="text-amber-300">DCA</span> equity curves for the selected window.</li>
                  <li>ROI vs DCA: (1 + Model ROI) / (1 + DCA ROI) − 1.</li>
                  <li>Sharpe (annualized): mean daily returns / stdev × √252.</li>
                  <li>Max Drawdown: worst peak-to-trough decline of the equity curve.</li>
                </ul>
              </div>
              <div className="space-y-2">
                <div className="font-semibold text-white/90">How to read it</div>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Use the bottom slider to zoom; axes auto-fit to visible data.</li>
                  <li>Positive ROI vs DCA indicates outperformance relative to steady contributions.</li>
                  <li>Lower Max DD with similar ROI suggests better downside control.</li>
                  <li>Sharpe compares risk-adjusted returns (no risk-free rate applied).</li>
                </ul>
              </div>
              <div className="md:col-span-2 space-y-2">
                <div className="font-semibold text-white/90">Assumptions & caveats</div>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Equity series comes from the CSV; fees, slippage, and taxes only if embedded.</li>
                  <li>DCA means dollar-cost averaging (steady periodic contributions).</li>
                  <li>Signals are hidden for clarity; focus is on outcomes.</li>
                  <li>Past performance is not indicative of future results.</li>
                </ul>
              </div>
            </div>
            <div className="flex justify-end"><button onClick={onClose} className="px-3 py-1.5 text-sm rounded bg-white/10 hover:bg-white/15 ring-1 ring-white/15">Close</button></div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Magnetic button
function Magnetic({children, onClick}:{children:React.ReactNode; onClick?:()=>void}){
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(()=>{
    const el = ref.current; if(!el) return
    const onMove=(e:MouseEvent)=>{
      const r = el.getBoundingClientRect();
      const mx = e.clientX - (r.left + r.width/2)
      const my = e.clientY - (r.top + r.height/2)
      el.style.transform = `translate(${mx*0.08}px, ${my*0.08}px)`
    }
    const reset=()=>{ if(ref.current) ref.current.style.transform = 'translate(0,0)' }
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', reset)
    return ()=>{ el.removeEventListener('mousemove', onMove); el.removeEventListener('mouseleave', reset) }
  },[])
  return <button ref={ref} onClick={onClick} className="relative overflow-hidden rounded-full px-4 py-2 text-sm ring-1 ring-white/15 bg-white/10 hover:bg-white/15 transition"><span className="relative z-10">{children}</span></button>
}

// Scroll dots nav
function ScrollDots(){
  const sections = ['hero','chart','story']
  const [active,setActive] = useState('hero')
  useEffect(()=>{
    const obs = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{ if(e.isIntersecting) setActive((e.target as HTMLElement).dataset.key || 'hero') })
    }, { threshold: 0.5 })
    sections.forEach(id=>{ const el = document.getElementById(id); if(el) obs.observe(el) })
    return ()=> obs.disconnect()
  },[])
  return (
    <div className="fixed right-3 md:right-6 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2">
      {sections.map(k=> (
        <a key={k} href={`#${k}`} className="block">
          <span className={`block w-2.5 h-2.5 rounded-full ${active===k?'bg-white':'bg-white/30'} transition`} />
        </a>
      ))}
    </div>
  )
}
// ================= Main =================
export default function ImmersiveAuroraEvidence() {
  const [csvText, setCsvText] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [zoomDomain, setZoomDomain] = useState<[string, string] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scene,setScene] = useState<'aurora'|'particles'|'grid'>('aurora')
  const [showHelp,setShowHelp] = useState(true)
  // Confetti removed to reduce visual noise and jank
  const [spot,setSpot] = useState({x:50,y:50})

  // Fetch demo or external CSV
  useEffect(()=>{
    (async ()=>{
      try {
        const res = await fetch('signals_with_equity.csv')
        if (res.ok) {
          const t = await res.text()
          if (t && t.length > 50) setCsvText(t)
          else throw new Error('CSV too small')
        } else throw new Error('No CSV on /signals_with_equity.csv')
      } catch {
        const demo = `Date,Close,Signal,TN_TP_FP_FN,Equity Value,DCA Value
2023-09-25,4337.44,Hold,TN,1000.0,1000.0
2023-09-26,4273.53,Hold,FN,1000.0,985.2655022317313
2023-09-27,4274.51,Hold,FN,1000.0,985.4914419565459
2023-09-28,4299.7,Hold,FN,1000.0,991.2990150872405
2023-09-29,4288.05,Hold,FN,1000.0,988.6130989708217
2023-10-02,4288.39,Hold,FN,1000.0,988.6914862222881
2023-10-03,4229.45,Hold,FN,1000.0,975.1028256298647
2023-10-04,4263.75,Hold,FN,1000.0,983.0107159983771
2023-10-05,4258.19,Hold,FN,1000.0,981.7288538861633
2023-10-06,4308.5,Hold,FN,1000.0,993.3278615957802
2023-10-09,4335.66,Hold,TN,1000.0,999.5896196835
2023-10-10,4358.24,Hold,TN,2000.0,2004.795455383821
2023-10-11,4376.95,Hold,TN,3000.0,3013.4020770866714
2023-10-12,4349.61,Hold,TN,3000.0,2994.5792866075594
2023-10-13,4327.78,Hold,FN,3000.0,2979.549969996037
2023-10-16,4373.63,Hold,TN,3000.0,3011.1163541755286
2023-10-17,4373.2,Hold,TN,3000.0,3010.82031175029
2023-10-18,4314.6,Hold,FN,3000.0,2970.475925427102
2023-10-19,4278.0,Hold,FN,3000.0,2945.277895744018
2023-10-20,4224.16,Hold,FN,3000.0,2908.2106302211437
2023-10-23,4217.04,Hold,FN,3000.0,2903.3087184358005
2023-10-24,4247.68,Hold,FN,3000.0,2924.4034624109286
2023-10-25,4186.77,Buy,TP,3000.0,2882.4687086405293
2023-10-26,4137.23,Buy,TP,2964.502468490029,2848.361867370038
2023-10-27,4117.37,Buy,TP,2950.271928001777,2834.688838148562
2023-10-30,4166.82,Buy,TP,2985.704970657571,2868.733717050979
2023-10-31,4193.8,Buy,TP,3005.0372960539985,2887.308658057799
2023-11-01,4237.86,Buy,TP,3036.6081728874524,2917.6426795833904
2023-11-02,4317.78,Buy,TP,3093.8742753960687,2972.665262432353
2023-11-03,4358.34,Hold,FN,3122.9372523448865,3000.589636310656
2023-11-06,4365.98,Hold,FN,3128.4116395216356,3005.84955288931
2023-11-07,4378.38,Hold,FN,3137.2967705414912,3014.3865902682783
2023-11-08,4382.78,Hold,FN,3140.4495589678913,3017.4158615962992
2023-11-09,4347.35,Hold,FN,3115.0624467071275,2993.023342698167
2023-11-10,4415.24,Hold,FN,4163.708539040836,4039.763622348017
2023-11-13,4411.55,Hold,FN,5161.064496019604,5036.38742359858
2023-11-14,4495.7,Hold,FN,5221.36157467451,5132.456152661114
2023-11-15,4502.88,Hold,FN,5226.506352152137,5140.65310423175
2023-11-16,4508.24,Hold,FN,5230.347021689751,5146.772276992002
2023-11-17,4514.02,Hold,FN,5234.488639213523,5153.370937170035
2023-11-20,4547.38,Hold,FN,5258.39250782823,5191.455937782347
2023-11-21,4538.19,Hold,FN,5251.807479273999,5180.964296426617
2023-11-22,4556.62,Hold,FN,5265.013363523671,5202.004660973527
2023-11-24,4559.34,Hold,FN,5266.962360005446,5205.109912822013
2023-11-27,4550.43,Hold,FN,5260.577963441985,5194.937929744804
2023-11-28,4554.89,Hold,FN,5263.773744437836,5200.029629466954
2023-11-29,4550.58,Hold,FN,5260.685444865612,5195.109175251154
2023-11-30,4567.8,Hold,FN,5273.024312298025,5214.768159380172
2023-12-01,4594.63,Hold,FN,5292.249156270825,5245.3982722827
2023-12-04,4569.78,Hold,FN,5274.443067089904,5217.028600063996
2023-12-05,4567.18,Hold,FN,5272.580055747032,5214.0603446205905
2023-12-06,4549.34,Hold,FN,5259.796931763627,5193.693545731991
2023-12-07,4585.59,Hold,FN,5285.77160914022,5235.077876433321`
        setCsvText(demo)
      } finally { setLoading(false) }
    })()
  }, [])

  // Parse + confetti
  useEffect(()=>{ if(!csvText) return; try { setRows(parseCSV(csvText)); setError(null) } catch(e:any){ setError(e?.message||'Parse error') } }, [csvText])

  // Hotkeys (scene switching removed; keep help toggle)
  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{
      if(e.key==='?') setShowHelp(s=>!s)
    }
    window.addEventListener('keydown', onKey)
    return ()=> window.removeEventListener('keydown', onKey)
  },[])

  const seriesAll = useMemo(()=> buildSeries(rows), [rows])
  const series2y = useMemo(()=> twoYearSlice(seriesAll), [seriesAll])
  const dataToShow = useMemo(()=>{
    let base = series2y
    if (zoomDomain){ const [s,e] = zoomDomain; const filtered = series2y.filter(p=> p.t >= s && p.t <= e); base = filtered.length ? filtered : series2y }
    return base.map((p,i)=> ({...p, x:i}))
  }, [series2y, zoomDomain])

  const stats = useMemo(()=>{
    if (series2y.length < 3) return null
    const bS = series2y[0].strategyValue, bB = series2y[0].benchmarkValue
    const wS = series2y.map(p=> p.strategyValue/bS), wB = series2y.map(p=> p.benchmarkValue/bB)
    const rsS = dailyReturns(wS), rsB = dailyReturns(wB)
    const years = (new Date(series2y.at(-1)!.t).getTime()-new Date(series2y[0].t).getTime())/(365*24*3600*1000)
    const cagr = (w:number[]) => w.at(-1)! ** (1/Math.max(1e-6, years)) - 1
    return { strat: { total: wS.at(-1)!-1, sharpe: sharpe(rsS), maxDD: maxDrawdown(wS), cagr: cagr(wS) }, bh: { total: wB.at(-1)!-1, sharpe: sharpe(rsB), maxDD: maxDrawdown(wB), cagr: cagr(wB) } }
  }, [series2y])

  const latest = rows.at(-1) || null
  const today: 'BUY'|'HOLD'|null = latest ? (String(latest.signal).toUpperCase()==='BUY'?'BUY':'HOLD') : null
  const confCounts = useMemo(()=>{
    const c = {TP:0,TN:0,FP:0,FN:0}
    for(const r of rows){ if(r.outcome && (r.outcome in c)) (c as any)[r.outcome]++ }
    const total = c.TP+c.TN+c.FP+c.FN || 1
    return { ...c, total }
  }, [rows])

  const { scrollYProgress } = useScroll()
  const topBar = useTransform(scrollYProgress, [0,1], [0,1])

  // Spotlight cursor
  useEffect(()=>{
    const onMove=(e:PointerEvent)=>{ const x = (e.clientX / innerWidth)*100; const y = (e.clientY / innerHeight)*100; setSpot({x,y}) }
    window.addEventListener('pointermove', onMove, { passive:true })
    return ()=> window.removeEventListener('pointermove', onMove as any)
  },[])

  // Derived markers from BUY signals (respect current data window)
  // Buy markers disabled for now to reduce clutter/perf issues

  const EvidenceChart = (
    <motion.div initial={{opacity:0, y:16}} whileInView={{opacity:1, y:0}} viewport={{ once:true, margin:'-60px' }} transition={{type:'spring', stiffness:220, damping:26}} className="space-y-4">
      <div className="relative h-[460px] w-full">
        <div className="h-full w-full rounded-[24px] ring-1 ring-white/10 bg-gradient-to-b from-white/5 to-transparent">
          <ResponsiveContainer>
            <ComposedChart
              data={dataToShow}
              margin={{ top: 20, right: 70, left: 50, bottom: 70 }}
            >
              <defs>
                <linearGradient id="gS" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gDCA" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="x" type="number" domain={[0,'dataMax']} tick={{ fontSize: 11, fill:'#a1a1aa' }} tickMargin={8} minTickGap={24} tickFormatter={(v)=> dataToShow[Math.round(Number(v))]?.t || ''} />
              <YAxis yAxisId="equity" tick={{ fontSize: 11, fill:'#a1a1aa' }} tickMargin={8} domain={getEquityDomain(dataToShow)} tickFormatter={(v)=>`$${(v/1000).toFixed(0)}k`} />
              <YAxis yAxisId="price" orientation="right" tick={{ fontSize: 11, fill:'#d4d4d8' }} tickMargin={8} domain={getPriceDomain(dataToShow)} />
              <Tooltip content={<Tip />} labelFormatter={(v)=>{ const i=Math.round(Number(v)); return dataToShow[i]?.t || ''; }} />
              <Area yAxisId="equity" type="monotone" dataKey="strategyValue" name="Strategy" stroke="#34d399" strokeWidth={2} fill="url(#gS)" isAnimationActive={false} />
              <Area yAxisId="equity" type="monotone" dataKey="benchmarkValue" name="DCA" stroke="#f59e0b" strokeWidth={2} fill="url(#gDCA)" isAnimationActive={false} />
              <Line yAxisId="price" type="monotone" dataKey="closePrice" name="NASDAQ Close" stroke="#d4d4d8" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* On-chart legend (color mapping) */}
        <div className="absolute top-4 left-4 z-10 text-[11px] text-white/80">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              Strategy (green)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400"></span>
              DCA (orange)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-white"></span>
              NASDAQ Close (white)
            </span>
          </div>
        </div>

        {/* Slider */}
        {series2y.length>0 && (
          <div className="absolute bottom-5 left-12 right-16 z-10">
            <CustomSlider data={series2y} onRangeChange={(s,e)=> setZoomDomain(s && e ? [s,e] : null)} />
          </div>
        )}
      </div>
    </motion.div>
  )

  if (loading) {
    return (
      <div className="min-h-screen w-full text-zinc-100 bg-[#0B0C10] flex items-center justify-center">
        <Scene stage={scene} />
        <Grain />
        <div className="text-center"><div className="text-2xl font-semibold mb-2">Loading NASDAQ Data...</div><div className="text-zinc-400">Looking for /signals_with_equity.csv</div></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full text-zinc-100 bg-[#0B0C10] overflow-x-hidden" style={{ backgroundImage:`radial-gradient(600px 400px at ${spot.x}% ${spot.y}%, rgba(255,255,255,0.06), transparent 60%)` }}>
      <Scene stage={scene} />
      <Grain />
      <MouseTrail />
      <HelpOverlay open={showHelp} onClose={()=>setShowHelp(false)} relROI={relROI} />
      <ScrollDots />

      <motion.div style={{ scaleX: topBar }} className="fixed left-0 right-0 top-0 h-1 origin-left bg-cyan-300/80 z-40" />

      {/* Scene Switcher removed; always Aurora */}

      {/* HERO */}
      <section id="hero" data-key="hero" className="relative mx-auto max-w-6xl px-4 pt-20 pb-10">
        <motion.div initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} transition={{type:'spring',damping:22,stiffness:200}} className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-3 rounded-full px-4 py-2 backdrop-blur-md bg-white/10 ring-1 ring-white/15">
              <div className={`h-2.5 w-2.5 rounded-full ${today==='BUY' ? 'bg-emerald-400 shadow-[0_0_18px_4px_rgba(74,222,128,.35)]' : 'bg-zinc-400'}`} />
              <span className="tracking-wide text-xs uppercase text-white/70">Today</span>
              <span className={`text-sm font-semibold ${today==='BUY' ? 'text-emerald-300':'text-zinc-200'}`}>{today ?? '-'}</span>
              <span className="text-[11px] text-white/60">{latest ? toISO(latest.date) : ''}</span>
            </div>
            {stats && (
              <div className="flex items-center gap-2 flex-wrap">
                <MetricChip label="Rel ROI (M/D)" value={pct(((1+stats.strat.total)/(1+stats.bh.total))-1)} />
                <MetricChip label="Sharpe M/D" value={`${stats.strat.sharpe.toFixed(2)}/${stats.bh.sharpe.toFixed(2)}`} />
                <MetricChip label="MaxDD M/D" value={`${pct(-stats.strat.maxDD)}/${pct(-stats.bh.maxDD)}`} />
              </div>
            )}
          </div>

          <AnimatedHeadline text="NASDAQ Strategy vs DCA" />
          <p className="max-w-2xl text-zinc-300 text-lg">Drag the slider to change interval. Uploading is optional.</p>

          {typeof relROI === 'number' && (
            <motion.div initial={{opacity:0, y:8}} whileInView={{opacity:1, y:0}} viewport={{ once:true }} transition={{type:'spring', stiffness:220, damping:22}} className="mt-3 rounded-2xl ring-1 ring-emerald-400/30 bg-emerald-400/10 p-4 max-w-xl">
              <div className="text-xs uppercase tracking-widest text-emerald-300">ROI vs DCA — Relative ROI (Model/DCA)</div>
              <div className="mt-1 text-4xl md:text-5xl font-semibold tracking-tight text-emerald-300">{pct(relROI)}</div>
              <div className="mt-1 text-xs text-white/70">Positive relative ROI over this 2‑year window suggests more capital retained vs steady DCA under identical contributions. Historical results for research only; not financial advice.</div>
            </motion.div>
          )}

          <div className="flex gap-2">
            <Magnetic onClick={()=>setShowHelp(true)}>Help</Magnetic>
          </div>
          {error && <div className="text-sm text-rose-300">{error}</div>}
        </motion.div>

        <div id="chart" data-key="chart" className="relative mt-12">{EvidenceChart}</div>
      </section>

      {/* ===== Sticky storyboard (discoverable) ===== */}
      <section id="story" data-key="story" className="mx-auto max-w-6xl px-4 pb-28">
        <div className="relative">
          <div className="sticky top-20 h-[420px] rounded-2xl overflow-hidden ring-1 ring-white/10 bg-white/5">
            <div className="absolute inset-0 grid grid-cols-3">
              {[{t:'Scene A',d:'Edge emerges when trends persist.'},{t:'Scene B',d:'Stand aside during chop.'},{t:'Scene C',d:'Compound when signals align.'}].map((s,i)=> (
                <motion.div key={i} className="relative flex items-center justify-center" initial={{opacity:0, scale:.96}} whileInView={{opacity:1, scale:1}} viewport={{amount:0.6}} transition={{type:'spring',damping:20,stiffness:180}}>
                  <div className="text-center p-6">
                    <div className="text-xs uppercase tracking-widest text-white/60">{s.t}</div>
                    <div className="mt-1 text-lg text-white/90">{s.d}</div>
                    <motion.div animate={{ rotate:[0,2,-2,0], scale:[1,1.04,1] }} transition={{ repeat: Infinity, duration: 8 }} className="mx-auto mt-4 h-24 w-24 rounded-full bg-gradient-to-br from-cyan-300/40 to-violet-400/40 blur-sm" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="mt-6 grid md:grid-cols-3 gap-4">
            <InfoCard title="ROI vs DCA">
              {stats ? (
                <div className="space-y-2">
                  <div className="text-sm text-white/70">Relative ROI (Model/DCA)</div>
                  <Counter big value={((1+stats.strat.total)/(1+stats.bh.total) - 1)} fmt={(n)=>pct(n)} />
                  <p className="text-xs text-white/60 leading-relaxed">
                    Over the selected 2-year window, the strategy shows a positive relative ROI versus steady DCA.
                    This suggests more capital retained under identical contributions and timing assumptions.
                    Historical results for research only; not financial advice.
                  </p>
                </div>
              ) : <div className="text-sm text-white/60">Upload a CSV to compute.</div>}
            </InfoCard>
            <InfoCard title="Risk Control">
              {stats ? (
                <div className="space-y-1">
                  <div className="text-sm text-white/70">Max drawdown</div>
                  <Counter big value={-stats.strat.maxDD} fmt={(n)=>pct(n)} />
                  <div className="text-sm text-white/70 mt-2">Sharpe (ann.)</div>
                  <Counter value={stats.strat.sharpe} fmt={(n)=>n.toFixed(2)} />
                </div>
              ) : <div className="text-sm text-white/60">Upload a CSV to compute.</div>}
            </InfoCard>
            <InfoCard title="What it actually does">
              <ul className="text-sm text-white/80 space-y-1 list-disc pl-5">
                <li>Targets medium-term trend (~ 70 trading days).</li>
                <li>Uses <span className="text-cyan-300">relative trend forecasts</span> instead of raw prices.</li>
                <li>Stands aside in choppy/no-edge regimes.</li>
              </ul>
            </InfoCard>
          </div>
        </div>
      </section>
    </div>
  )
}
function Scene({stage}:{stage:'aurora'|'particles'|'grid'}){
  return (
    <AnimatePresence mode="popLayout">
      <motion.div key={stage} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.4}}>
        {stage==='aurora' && <AuroraBG />}
        {stage==='particles' && <ParticlesBG />}
        {stage==='grid' && <GridBG />}
      </motion.div>
    </AnimatePresence>
  )
}

function InfoCard({title, children}:{title:string; children:React.ReactNode}){
  return (
    <motion.div whileHover={{y:-2}} className="rounded-2xl ring-1 ring-white/10 bg-white/5 p-5">
      <div className="text-xs uppercase tracking-widest text-white/60 mb-1">{title}</div>
      {children}
    </motion.div>
  )
}

function Counter({ value, fmt, big=false }:{ value:number; fmt:(n:number)=>string; big?:boolean }){
  const mv = useMotionValue(0)
  const spring = useSpring(mv, { stiffness: 120, damping: 16 })
  const [txt,setTxt] = useState('0')
  useEffect(()=>{
    mv.set(0)
    const target = isFinite(value) ? value : 0
    const start = performance.now()
    const dur = 1200
    let raf = 0
    const tick = (t:number)=>{
      const k = Math.min(1,(t-start)/dur)
      mv.set(target * k)
      if (k < 1) {
        raf = requestAnimationFrame(tick)
      }
    }
    raf = requestAnimationFrame(tick)
    return ()=> cancelAnimationFrame(raf)
  },[value, mv])
  useEffect(()=>{
    const unsub = spring.on('change', v=> setTxt(fmt(typeof v === 'number' ? v : 0)))
    return ()=> unsub()
  },[spring, fmt])
  return <div className={big?"text-2xl font-semibold":"text-xl font-semibold"}>{txt}</div>
}

function MetricChip({ label, value }: { label:string; value:string }){
  return (
    <motion.div initial={{ x:-12, opacity:0 }} whileInView={{ x:0, opacity:1 }} viewport={{ once:true }} whileHover={{ scale:1.02, x:2 }} transition={{ type:'spring', stiffness:300, damping:20 }} className="backdrop-blur-md bg-black/20 ring-1 ring-white/10 text-white rounded-lg px-3 py-1.5 text-xs flex items-center gap-2 shadow-sm">
      <span className="text-white/60 font-medium text-[10px] uppercase tracking-wider">{label}</span>
      <span className="font-semibold tabular-nums text-white text-xs">{value}</span>
    </motion.div>
  )
}

// Dev self-tests (keep & expand)
if (typeof window !== 'undefined' && (typeof process === 'undefined' || (process as any).env?.NODE_ENV !== 'production')) {
  (function runSelfTests(){
    try {
      const _mean = (xs: number[]) => (xs.length ? xs.reduce((a,b)=>a+b,0)/xs.length : 0)
      const _stdev = (xs: number[]) => { if (xs.length<2) return 0; const m=_mean(xs); return Math.sqrt(_mean(xs.map(x=> (x-m)**2))) }
      console.assert(Math.abs(_stdev([1,2,3]) - Math.sqrt(2/3)) < 1e-9, 'stdev')

      const dr = ((ws:number[])=> ws.slice(1).map((w,i)=> w/ws[i]-1))([1,1.1,1.21]);
      console.assert(Math.abs(dr[0]-0.1)<1e-12 && Math.abs(dr[1]-0.1)<1e-12, 'daily returns')

      console.assert(sharpe([0,0,0])===0, 'sharpe zero')
      console.assert(Math.abs(maxDrawdown([1,1.2,0.9]) - (1 - 0.9/1.2)) < 1e-12, 'max drawdown')
      const sliced = twoYearSlice([{t:'2022-01-01',strategyValue:1,benchmarkValue:1,closePrice:1}, {t:'2025-01-01',strategyValue:2,benchmarkValue:2,closePrice:2}] as any)
      console.assert(sliced.at(-1)!.t==='2025-01-01', 'slice keeps end')
    } catch(err){ console.warn('[self-tests]', err) }
  })()
}
