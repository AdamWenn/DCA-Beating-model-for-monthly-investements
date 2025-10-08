'use client'

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion'
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import FeatureOrbitClean from './FeatureOrbit_Clean'

// ============================================================
// Swedish Investment Landing with Full ImmersiveAurora UX + Data
// ============================================================

// ================= Types & Data Processing =================
interface Row { date: Date; close: number; signal: 'BUY'|'HOLD'; benchmark?: number; strategy?: number; outcome?: 'TP'|'TN'|'FP'|'FN'|'PENDING' }
interface Point { x?: number; t: string; strategyValue: number; benchmarkValue: number; closePrice: number; signal?: 'BUY'|'HOLD'; outcome?: 'TP'|'TN'|'FP'|'FN'|'PENDING' }

const byDateAsc = (a: Row, b: Row) => a.date.getTime() - b.date.getTime()
const mean = (xs: number[]) => (xs.length ? xs.reduce((a,b)=>a+b,0)/xs.length : 0)
const stdev = (xs: number[]) => { if (xs.length<2) return 0; const m=mean(xs); return Math.sqrt(mean(xs.map(x=> (x-m)**2))) }
const toISO = (d: Date) => d.toISOString().slice(0,10)
const pct = (n: number) => `${n>=0?'+':''}${(n*100).toFixed(2)}%`
const dailyReturns = (ws: number[]) => ws.slice(1).map((w,i)=> w/ws[i]-1)
const sharpe = (rs: number[]) => { const s = stdev(rs); return s ? (mean(rs)/s)*Math.sqrt(252) : 0 }
const maxDrawdown = (w: number[]) => { let peak=w[0], m=0; for (let i=0;i<w.length;i++){ peak=Math.max(peak,w[i]); m=Math.min(m,(w[i]-peak)/peak) } return -m }

// Simple CSV parser (replacing Papa Parse)
function parseCSV(text: string): Row[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const rows: Row[] = []
  
  const dateIdx = headers.findIndex(h => ['date','timestamp'].includes(h))
  const closeIdx = headers.findIndex(h => ['close','price','adjclose','adj_close','nav'].includes(h))
  const signalIdx = headers.findIndex(h => ['signal','recommendation','state'].includes(h))
  const benchmarkIdx = headers.findIndex(h => ['benchmark','qqq','nasdaq','ndx','dca value','dca_value'].includes(h))
  const strategyIdx = headers.findIndex(h => ['strategy','wealth','portfolio','equity value','equity_value'].includes(h))
  const outcomeIdx = headers.findIndex(h => ['tn_tp_fp_fn','outcome','result'].includes(h))
  
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    if (cols.length < Math.max(dateIdx, closeIdx) + 1) continue
    
    const date = new Date(cols[dateIdx]?.trim())
    if (isNaN(date.getTime())) continue
    
    const close = Number(cols[closeIdx]?.trim())
    if (!isFinite(close)) continue
    
    const signalRaw = (cols[signalIdx]?.trim() || 'HOLD').toUpperCase()
    const signal = signalRaw === 'BUY' ? 'BUY' : 'HOLD'
    
    const benchmark = benchmarkIdx >= 0 ? Number(cols[benchmarkIdx]?.trim()) : undefined
    const strategy = strategyIdx >= 0 ? Number(cols[strategyIdx]?.trim()) : undefined
    const outcomeRaw = (cols[outcomeIdx]?.trim() || '').toUpperCase()
    const outcome: Row['outcome'] = (['TP','TN','FP','FN','PENDING'] as const).includes(outcomeRaw as any) ? outcomeRaw as any : undefined
    
    rows.push({ date, close, signal, benchmark, strategy, outcome })
  }
  
  return rows.sort(byDateAsc)
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

// Compute Y domains per current data window
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
  // Give more room at top for equity curves and signals
  return [min - pad, max * 1.2]
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

// ================= Chart Tooltip =================
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const get = (k: string) => payload.find((p:any)=> p.dataKey===k)?.value ?? 0
  return (
    <div className="rounded-xl backdrop-blur-md bg-white/10 ring-1 ring-white/15 p-3 text-xs text-white/90 space-y-2">
      <div className="font-medium text-white">{label}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span className="text-emerald-300">Modell</span>
        <span className="tabular-nums text-right">{'$'}{get('strategyValue').toFixed(2)}</span>
        <span className="text-amber-300">DCA</span>
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

// ================= Custom Slider =================
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
        <div className="font-mono bg-black/30 rounded px-2 py-0.5">{data[rangeStart]?.t} → {data[rangeEnd]?.t}</div>
        <button className="bg-black/30 rounded px-2 py-0.5 hover:bg-black/40" onClick={()=>{ setRangeStart(0); setRangeEnd(data.length-1); onRangeChange(null, null) }}>Reset</button>
      </div>
    </div>
  )
}

// ================= Utility =================
const prefersReduced = () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ================= Background Effects =================
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

// ================= Visual Enhancements =================
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

// ================= Mouse Trail Effect =================
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

// ================= Magnetic Button =================
function Magnetic({children, onClick, className = ""}:{children:React.ReactNode; onClick?:()=>void; className?:string}){
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
  return (
    <button ref={ref} onClick={onClick} className={`relative overflow-hidden rounded-full px-6 py-3 text-sm ring-1 ring-white/15 bg-white/10 hover:bg-white/15 transition font-medium ${className}`}>
      <span className="relative z-10">{children}</span>
    </button>
  )
}

// ================= Counter Animation =================
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
  return <div className={big?"text-3xl md:text-4xl font-semibold":"text-xl font-semibold"}>{txt}</div>
}

// ================= Signup Component =================
const SignupModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !email.includes('@')) return

    setIsSubmitting(true)
    
    // Simulate API call - replace with actual signup logic later
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setIsSubmitting(false)
    setIsSuccess(true)
    
    // Trigger signup success event for the calculator
    const event = new CustomEvent('signupSuccess')
    window.dispatchEvent(event)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div 
        initial={{opacity:0}} 
        animate={{opacity:1}} 
        exit={{opacity:0}}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div 
          initial={{scale:0.9, opacity:0}} 
          animate={{scale:1, opacity:1}} 
          exit={{scale:0.9, opacity:0}}
          transition={{type:'spring', stiffness:200, damping:20}}
          className="bg-zinc-900/95 border border-white/20 rounded-2xl p-8 max-w-md w-full"
          onClick={e => e.stopPropagation()}
        >
          {isSuccess ? (
            <motion.div 
              initial={{scale:0.8, opacity:0}} 
              animate={{scale:1, opacity:1}}
              className="text-center space-y-4"
            >
              <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white">Månads-påminnelse aktiverad!</h3>
              <p className="text-gray-300">
                Du kommer att få månadsrapporter när tjänsten lanseras. 
                <br />
                <span className="text-sm text-gray-400">(E-postfunktionen är inte aktiverad än)</span>
              </p>
              <button
                onClick={onClose}
                className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Stäng
              </button>
            </motion.div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-white mb-2">Jag vill ha en månads-påminnelse</h3>
                <p className="text-gray-300 text-sm">
                  Få månadsrapporter och köpsignaler
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                    E-postadress
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-colors"
                    placeholder="din@email.se"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-3 text-gray-300 hover:text-white transition-colors"
                    disabled={isSubmitting}
                  >
                    Avbryt
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !email.trim()}
                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Anmäler...
                      </div>
                    ) : (
                      'Anmäl mig'
                    )}
                  </button>
                </div>
              </form>

              <p className="text-xs text-gray-500 mt-4 text-center">
                E-postfunktionen är ännu inte aktiverad. 
              </p>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ================= Interactive Indicator Showcase =================
interface IndicatorData {
  id: string
  name: string
  value: number
  prev: number
  color: string
  description: string
  formula: string
  category: 'rtf' | 'momentum' | 'standard'
}

const InteractiveIndicatorShowcase: React.FC = () => {
  const [selectedIndicator, setSelectedIndicator] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
  const hoverTimeoutRef = useRef<number | null>(null)

  const handleCategoryHover = (category: string | null) => {
    // Clear any pending timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    
    setHoveredCategory(category)
    if (category && !showDetails) {
      setSelectedIndicator(category)
    }
  }

  const handleCategoryLeave = () => {
    setHoveredCategory(null)
    if (!showDetails) {
      // Add a small delay to avoid flickering when moving between categories
      hoverTimeoutRef.current = setTimeout(() => {
        setSelectedIndicator(null)
      }, 150)
    }
  }

  const indicators: IndicatorData[] = [
    // Relative Trend Forecast (RTF) - SMA indicators
    {
      id: 'sma_30_min',
      name: 'SMA 30 min',
      value: 0.12,
      prev: 0.08,
      color: 'blue',
      description: 'Simple Moving Average minimum värde över 30 dagar — mäter prisposition relativt kortsiktig botten.',
      formula: 'SMA_min = (Close / min(Close_30)) - 1',
      category: 'rtf'
    },
    {
      id: 'sma_30_avg',
      name: 'SMA 30 avg',
      value: 0.05,
      prev: 0.03,
      color: 'blue',
      description: 'Simple Moving Average genomsnitt över 30 dagar — mäter prisposition relativt kortsiktig trend.',
      formula: 'SMA_avg = (Close / avg(Close_30)) - 1',
      category: 'rtf'
    },
    {
      id: 'sma_100_min',
      name: 'SMA 100 min',
      value: 0.18,
      prev: 0.14,
      color: 'cyan',
      description: 'Simple Moving Average minimum värde över 100 dagar — mäter prisposition relativt medellång botten.',
      formula: 'SMA_min = (Close / min(Close_100)) - 1',
      category: 'rtf'
    },
    {
      id: 'sma_100_avg',
      name: 'SMA 100 avg',
      value: 0.08,
      prev: 0.06,
      color: 'cyan',
      description: 'Simple Moving Average genomsnitt över 100 dagar — mäter prisposition relativt medellång trend.',
      formula: 'SMA_avg = (Close / avg(Close_100)) - 1',
      category: 'rtf'
    },
    {
      id: 'sma_150_min',
      name: 'SMA 150 min',
      value: 0.22,
      prev: 0.19,
      color: 'indigo',
      description: 'Simple Moving Average minimum värde över 150 dagar — mäter prisposition relativt långsiktig botten.',
      formula: 'SMA_min = (Close / min(Close_150)) - 1',
      category: 'rtf'
    },
    {
      id: 'sma_150_avg',
      name: 'SMA 150 avg',
      value: 0.11,
      prev: 0.09,
      color: 'indigo',
      description: 'Simple Moving Average genomsnitt över 150 dagar — mäter prisposition relativt långsiktig trend.',
      formula: 'SMA_avg = (Close / avg(Close_150)) - 1',
      category: 'rtf'
    },
    
    // Relative indicators - MomEma
    {
      id: 'momema_150_15',
      name: 'MomEma 150,15',
      value: -0.31,
      prev: -0.25,
      color: 'green',
      description: 'EMA Momentum (150,15) — mäter förändringshastighet i 150-dagars EMA över 15 dagar.',
      formula: 'MomEma = (EMA_150_nu / EMA_150_{t-15}) - 1',
      category: 'momentum'
    },
    {
      id: 'momema_70_15',
      name: 'MomEma 70,15',
      value: -0.18,
      prev: -0.22,
      color: 'green',
      description: 'EMA Momentum (70,15) — mäter förändringshastighet i 70-dagars EMA över 15 dagar.',
      formula: 'MomEma = (EMA_70_nu / EMA_70_{t-15}) - 1',
      category: 'momentum'
    },
    {
      id: 'momema_100_15',
      name: 'MomEma 100,15',
      value: -0.24,
      prev: -0.19,
      color: 'green',
      description: 'EMA Momentum (100,15) — mäter förändringshastighet i 100-dagars EMA över 15 dagar.',
      formula: 'MomEma = (EMA_100_nu / EMA_100_{t-15}) - 1',
      category: 'momentum'
    },
    
    // MomTema
    {
      id: 'momtema_300_15',
      name: 'MomTema 300,15',
      value: 0.12,
      prev: 0.14,
      color: 'purple',
      description: 'TEMA Momentum (300,15) — mäter förändringshastighet i 300-dagars TEMA över 15 dagar.',
      formula: 'MomTema = (TEMA_300_nu / TEMA_300_{t-15}) - 1',
      category: 'momentum'
    },
    
    // RCTema
    {
      id: 'rctema_200',
      name: 'RCTema 200',
      value: 0.18,
      prev: 0.22,
      color: 'orange',
      description: 'Rate of Change TEMA (200) — mäter aktuellt pris relativt 200-dagars TEMA.',
      formula: 'RCTema = (Close / TEMA_200) - 1',
      category: 'momentum'
    },
    {
      id: 'rctema_100',
      name: 'RCTema 100',
      value: 0.15,
      prev: 0.19,
      color: 'orange',
      description: 'Rate of Change TEMA (100) — mäter aktuellt pris relativt 100-dagars TEMA.',
      formula: 'RCTema = (Close / TEMA_100) - 1',
      category: 'momentum'
    },
    
    // Standard indicator - LogReturn
    {
      id: 'logreturn_30',
      name: 'LogReturn 30',
      value: 0.085,
      prev: 0.092,
      color: 'red',
      description: 'Logaritmisk avkastning 30 dagar — mäter procentuell förändring över 30 dagar på logaritmisk skala.',
      formula: 'LogReturn = ln(Close_t / Close_{t-30})',
      category: 'standard'
    }
  ]

  const getColorClasses = (color: string) => ({
    blue: { bg: 'bg-blue-900/20', border: 'border-blue-600/30', text: 'text-blue-300', accent: 'text-blue-200', tag: 'bg-blue-800/30' },
    purple: { bg: 'bg-purple-900/20', border: 'border-purple-600/30', text: 'text-purple-300', accent: 'text-purple-200', tag: 'bg-purple-800/30' },
    green: { bg: 'bg-green-900/20', border: 'border-green-600/30', text: 'text-green-300', accent: 'text-green-200', tag: 'bg-green-800/30' },
    cyan: { bg: 'bg-cyan-900/20', border: 'border-cyan-600/30', text: 'text-cyan-300', accent: 'text-cyan-200', tag: 'bg-cyan-800/30' },
    orange: { bg: 'bg-orange-900/20', border: 'border-orange-600/30', text: 'text-orange-300', accent: 'text-orange-200', tag: 'bg-orange-800/30' },
    pink: { bg: 'bg-pink-900/20', border: 'border-pink-600/30', text: 'text-pink-300', accent: 'text-pink-200', tag: 'bg-pink-800/30' },
    indigo: { bg: 'bg-indigo-900/20', border: 'border-indigo-600/30', text: 'text-indigo-300', accent: 'text-indigo-200', tag: 'bg-indigo-800/30' }
  }[color])

  const categoryLabels = {
    rtf: 'RTF Indikatorer',
    momentum: 'Momentum',
    standard: 'Standard'
  }

  // Group indicators by category for the "peek" view
  const groupedIndicators = indicators.reduce((acc, indicator) => {
    if (!acc[indicator.category]) acc[indicator.category] = []
    acc[indicator.category].push(indicator)
    return acc
  }, {} as Record<string, IndicatorData[]>)

  const selectedIndicatorData = indicators.find(i => i.id === selectedIndicator)

  if (showDetails && selectedIndicatorData) {
    return (
      <AnimatePresence>
        <motion.div 
          initial={{opacity:0, scale:0.95}} 
          animate={{opacity:1, scale:1}} 
          exit={{opacity:0, scale:0.95}}
          transition={{type:'spring', stiffness:200, damping:20}}
          className="space-y-6"
        >
          {/* Back button */}
          <button 
            onClick={() => {setShowDetails(false); setSelectedIndicator(null)}}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Tillbaka till översikt
          </button>

          {/* Detailed indicator view */}
          <div className={`${getColorClasses(selectedIndicatorData.color)?.bg} rounded-xl p-8 border ${getColorClasses(selectedIndicatorData.color)?.border}`}>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className={`text-2xl font-bold ${getColorClasses(selectedIndicatorData.color)?.text}`}>
                    {selectedIndicatorData.name}
                  </h2>
                  <span className={`text-lg ${getColorClasses(selectedIndicatorData.color)?.accent} ${getColorClasses(selectedIndicatorData.color)?.tag} px-3 py-1 rounded-lg`}>
                    {selectedIndicatorData.value.toFixed(2)}
                  </span>
                </div>
                
                <div className={`text-xs uppercase tracking-wider ${getColorClasses(selectedIndicatorData.color)?.accent}`}>
                  {categoryLabels[selectedIndicatorData.category]}
                </div>
                
                <p className="text-gray-300 leading-relaxed">
                  {selectedIndicatorData.description}
                </p>

                {/* Value change indicator */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Förändring:</span>
                  <span className={`text-sm ${selectedIndicatorData.value > selectedIndicatorData.prev ? 'text-green-400' : 'text-red-400'}`}>
                    {selectedIndicatorData.value > selectedIndicatorData.prev ? '↗' : '↘'} 
                    {Math.abs(selectedIndicatorData.value - selectedIndicatorData.prev).toFixed(3)}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className={`text-lg font-semibold ${getColorClasses(selectedIndicatorData.color)?.text}`}>
                  Formel
                </h3>
                <div className={`${getColorClasses(selectedIndicatorData.color)?.accent} font-mono bg-black/30 p-4 rounded-lg text-sm`}>
                  {selectedIndicatorData.formula}
                </div>

                {/* Additional context based on category */}
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2">Användning i modellen</h4>
                  <p className="text-gray-400 text-sm">
                    {selectedIndicatorData.category === 'rtf' && 'Använder Simple Moving Average-indikatorer för att mäta prisposition relativt historiska trender och bottnar.'}
                    {selectedIndicatorData.category === 'momentum' && 'Mäter hastigheten av prisförändringar för att upptäcka accelerationer eller bromsar i trenden.'}
                    {selectedIndicatorData.category === 'standard' && 'Standard teknisk indikator som mäter logaritmisk avkastning över specifika tidsperioder.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    )
  }

  // "Peek" view - showing grouped indicators like the original three scenes
  return (
    <div className="space-y-8">
      {/* Category overview with animated discovery */}
      <div className="grid md:grid-cols-3 gap-6">
        {Object.entries(groupedIndicators).map(([category, categoryIndicators]) => (
          <motion.div 
            key={category}
            className="relative bg-gradient-to-br from-white/5 to-transparent rounded-xl p-6 border border-white/10 hover:border-white/20 transition-colors cursor-pointer"
            whileHover={{y:-2, scale:1.02}}
            transition={{type:'spring', stiffness:200, damping:20}}
            onHoverStart={() => handleCategoryHover(category)}
            onHoverEnd={handleCategoryLeave}
          >
            <div className="text-center space-y-4">
              <div className="text-xs uppercase tracking-widest text-white/60">
                {categoryLabels[category as keyof typeof categoryLabels]}
              </div>
              <div className="text-lg text-white/90 font-medium">
                {category === 'rtf' && 'Relativa trendprognoser'}
                {category === 'momentum' && 'Hastighet och acceleration'}
                {category === 'standard' && 'Klassiska indikatorer'}
              </div>
              
              {/* Animated discovery circle */}
              <div className="relative h-32 w-32 mx-auto">
                {/* Main clickable circle */}
                <motion.button
                  onClick={() => {
                    if (selectedIndicator === category) {
                      // If already showing indicators, go to first indicator detail
                      const firstIndicator = categoryIndicators[0]
                      setSelectedIndicator(firstIndicator.id)
                      setShowDetails(true)
                    }
                  }}
                  animate={{ 
                    rotate: selectedIndicator === category ? [0, 360] : [0, 2, -2, 0], 
                    scale: selectedIndicator === category ? [1, 1.15, 1] : [1, 1.04, 1] 
                  }} 
                  transition={{ 
                    rotate: { duration: selectedIndicator === category ? 3 : 8, repeat: Infinity, ease: "linear" },
                    scale: { duration: selectedIndicator === category ? 1.2 : 8, repeat: Infinity }
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className={`absolute inset-0 rounded-full blur-sm transition-all duration-500 ease-out ${
                    category === 'rtf' ? 'bg-gradient-to-br from-blue-300/40 to-cyan-400/40' :
                    category === 'momentum' ? 'bg-gradient-to-br from-green-300/40 to-orange-400/40' :
                    'bg-gradient-to-br from-red-300/40 to-pink-400/40'
                  } ${selectedIndicator === category ? 'brightness-125' : 'brightness-100'}`} 
                />
              </div>

              <p className="text-xs text-white/70 text-center mb-4">
                {selectedIndicator === category ? 'Klicka på en indikator för detaljer' : 'Hovra för att se indikatorer'}
              </p>

              {/* Indicator cards below text */}
              <motion.div
                layout
                animate={{ 
                  height: selectedIndicator === category ? 'auto' : 0,
                  opacity: selectedIndicator === category ? 1 : 0
                }}
                transition={{ 
                  duration: 0.3,
                  ease: 'easeInOut'  // Simpler easing to reduce conflicts
                }}
                className="overflow-hidden"
              >
                <AnimatePresence mode="wait">
                  {selectedIndicator === category && (
                    <motion.div 
                      key={`cards-${category}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className="grid grid-cols-1 gap-3 max-w-sm mx-auto"
                    >
                      {categoryIndicators.map((indicator, index) => {
                        const colors = getColorClasses(indicator.color)
                        return (
                          <motion.button
                            key={indicator.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ 
                              delay: index * 0.05,
                              duration: 0.2,
                              ease: 'easeOut'
                            }}
                            onClick={() => {setSelectedIndicator(indicator.id); setShowDetails(true)}}
                            className={`${colors?.bg} ${colors?.border} border rounded-lg p-3 transition-all duration-300 ease-out shadow-sm backdrop-blur-sm text-left hover:shadow-md`}
                            whileHover={{ 
                              scale: 1.02, 
                              y: -2,
                              transition: { duration: 0.2, ease: 'easeOut' }
                            }}
                            whileTap={{ 
                              scale: 0.98,
                              transition: { duration: 0.1 }
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className={`text-sm font-medium ${colors?.text}`}>
                                {indicator.name}
                              </div>
                              <div className={`text-sm font-mono ${colors?.accent} ${colors?.tag} px-2 py-1 rounded text-xs`}>
                                {indicator.value.toFixed(2)}
                              </div>
                            </div>
                          </motion.button>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ================= FeatureOrbit Component =================

// Helper functions for feature calculations
const calculateEMA = (prices: number[], span: number): number[] => {
  const alpha = 2 / (span + 1)
  const ema: number[] = []
  
  for (let i = 0; i < prices.length; i++) {
    if (i === 0) {
      ema[i] = prices[i]
    } else {
      ema[i] = alpha * prices[i] + (1 - alpha) * ema[i - 1]
    }
  }
  return ema
}

const calculateSMA = (prices: number[], window: number): number[] => {
  const sma: number[] = []
  for (let i = 0; i < prices.length; i++) {
    if (i < window - 1) {
      sma[i] = NaN
    } else {
      const sum = prices.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0)
      sma[i] = sum / window
    }
  }
  return sma
}

const calculateTEMA = (prices: number[], span: number): number[] => {
  const ema1 = calculateEMA(prices, span)
  const ema2 = calculateEMA(ema1, span)
  const ema3 = calculateEMA(ema2, span)
  
  return ema1.map((e1, i) => 3 * e1 - 3 * ema2[i] + ema3[i])
}

const calculateMomEMA = (prices: number[], n: number, ofs: number): number => {
  const ema = calculateEMA(prices, n)
  const current = ema[ema.length - 1]
  const previous = ema[ema.length - 1 - ofs]
  return previous ? (current / previous) - 1 : 0
}

const calculateMomTEMA = (prices: number[], n: number, ofs: number): number => {
  const tema = calculateTEMA(prices, n)
  const current = tema[tema.length - 1]
  const previous = tema[tema.length - 1 - ofs]
  return previous ? (current / previous) - 1 : 0
}

const calculateRCTEMA = (prices: number[], n: number): number => {
  const tema = calculateTEMA(prices, n)
  const currentPrice = prices[prices.length - 1]
  const currentTema = tema[tema.length - 1]
  return currentTema ? (currentPrice / currentTema) - 1 : 0
}

const calculateLogReturn = (prices: number[], n: number): number => {
  const current = prices[prices.length - 1]
  const previous = prices[prices.length - 1 - n]
  return previous ? Math.log(current / previous) : 0
}

const calculateSMAMetrics = (prices: number[], window: number): { min: number, avg: number } => {
  if (prices.length < window) return { min: 0, avg: 0 }
  
  const recentPrices = prices.slice(-window)
  const min = Math.min(...recentPrices)
  const avg = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length
  const currentPrice = prices[prices.length - 1]
  
  return {
    min: (currentPrice / min) - 1,
    avg: (currentPrice / avg) - 1
  }
}

interface FeatureData {
  name: string
  value: number
  prev: number
  eq: string
  description?: string
  category: 'rtf' | 'momentum' | 'standard'
}

interface TooltipProps {
  feature: FeatureData | null
  x: number
  y: number
  visible: boolean
}

const FeatureTooltip: React.FC<TooltipProps> = ({ feature, x, y, visible }) => {
  if (!visible || !feature) return null
  
  const delta = feature.value - feature.prev
  const threshold = 0.05
  let color = 'rgb(156, 163, 175)'
  if (delta > threshold) color = 'rgb(34, 211, 238)'
  else if (delta < -threshold) color = 'rgba(243,156,18,0.8)'
  
  const arrow = delta > 0 ? '+' : (delta < 0 ? '-' : '→')
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.15 }}
        className="fixed pointer-events-none z-50 max-w-xs"
        style={{
          left: Math.min(x + 14, (typeof window !== 'undefined' ? window.innerWidth : 800) - 220),
          top: y + 12,
        }}
      >
        <div className="bg-zinc-900/95 border border-white/20 rounded-lg p-3 text-white shadow-xl backdrop-blur-sm">
          <div className="font-semibold text-sm">{feature.name}</div>
          <div className="text-xs mt-1">
            Värde: {feature.value.toFixed(2)}{' '}
            <span style={{ color, marginLeft: '6px' }}>
              {arrow} Δ {Math.abs(delta).toFixed(2)}
            </span>
          </div>
          {feature.eq && (
            <div className="text-xs text-cyan-300 font-mono mt-1 opacity-90">
              {feature.eq}
            </div>
          )}
          {feature.description && (
            <div className="text-xs text-white/70 mt-1">
              {feature.description}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

interface FeatureOrbitProps {
  className?: string
  size?: number
  csvData?: Row[]
}

const FeatureOrbit: React.FC<FeatureOrbitProps> = ({ className = '', size = 520, csvData = [] }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // Calculate real feature values from CSV data
  const calculateFeatures = useMemo(() => {
    if (!csvData.length) {
      // Fallback to static values if no data
      return [
        { name: 'RSI', value: 65.2, prev: 62.1, eq: 'RSI(14)', category: 'momentum' as const },
        { name: 'MACD', value: 0.032, prev: 0.028, eq: 'MACD(12,26,9)', category: 'momentum' as const },
        { name: 'EMA Ratio', value: 1.025, prev: 1.018, eq: 'EMA(20)/EMA(50)', category: 'momentum' as const },
        { name: 'PE Ratio', value: 18.5, prev: 19.2, eq: 'Price/Earnings', category: 'standard' as const },
        { name: 'PB Ratio', value: 2.1, prev: 2.3, eq: 'Price/Book', category: 'standard' as const },
        { name: 'ROE', value: 0.142, prev: 0.138, eq: 'Return on Equity', category: 'standard' as const },
        { name: 'Debt/Equity', value: 0.65, prev: 0.68, eq: 'Total Debt/Equity', category: 'standard' as const },
        { name: 'Current Ratio', value: 1.8, prev: 1.7, eq: 'Current Assets/Liabilities', category: 'standard' as const },
        { name: 'Beta', value: 1.15, prev: 1.12, eq: 'Market Beta', category: 'rtf' as const },
        { name: 'Volatility', value: 0.18, prev: 0.21, eq: 'Annualized Vol', category: 'rtf' as const },
        { name: 'Sharpe', value: 1.35, prev: 1.28, eq: 'Risk-adj Return', category: 'rtf' as const },
        { name: 'VaR', value: -0.024, prev: -0.028, eq: 'Value at Risk', category: 'rtf' as const }
      ]
    }

    // Process real CSV data and calculate indicators
    const latest = csvData[csvData.length - 1]
    const previous = csvData[csvData.length - 2] || latest
    
    return [
      { name: 'RSI', value: latest?.rsi || 50, prev: previous?.rsi || 50, eq: 'RSI(14)', category: 'momentum' as const },
      { name: 'MACD', value: latest?.macd || 0, prev: previous?.macd || 0, eq: 'MACD(12,26,9)', category: 'momentum' as const },
      { name: 'BB Width', value: latest?.bb_width || 0.1, prev: previous?.bb_width || 0.1, eq: 'Bollinger Width', category: 'momentum' as const },
      { name: 'Volume MA', value: latest?.volume_ma || 1000000, prev: previous?.volume_ma || 1000000, eq: 'Volume MA(20)', category: 'momentum' as const },
      { name: 'PE Ratio', value: latest?.pe_ratio || 15, prev: previous?.pe_ratio || 15, eq: 'Price/Earnings', category: 'standard' as const },
      { name: 'Dividend Yield', value: latest?.dividend_yield || 0.02, prev: previous?.dividend_yield || 0.02, eq: 'Dividend/Price', category: 'standard' as const },
      { name: 'EPS Growth', value: latest?.eps_growth || 0.05, prev: previous?.eps_growth || 0.05, eq: 'EPS Growth Rate', category: 'standard' as const },
      { name: 'Price Momentum', value: latest?.price_momentum || 0, prev: previous?.price_momentum || 0, eq: 'Price Change %', category: 'standard' as const },
      { name: 'Beta', value: latest?.beta || 1, prev: previous?.beta || 1, eq: 'Market Beta', category: 'rtf' as const },
      { name: 'Volatility', value: latest?.volatility || 0.15, prev: previous?.volatility || 0.15, eq: 'Annualized Vol', category: 'rtf' as const },
      { name: 'Sharpe', value: latest?.sharpe_ratio || 1, prev: previous?.sharpe_ratio || 1, eq: 'Risk-adj Return', category: 'rtf' as const },
      { name: 'Max Drawdown', value: latest?.max_drawdown || -0.1, prev: previous?.max_drawdown || -0.1, eq: 'Max Drawdown', category: 'rtf' as const }
    ]
  }, [csvData])

  const features = calculateFeatures

  useEffect(() => {
    const container = containerRef.current
    const svg = svgRef.current
    if (!container || !svg) return

    const w = container.clientWidth
    const h = container.clientHeight
    const orbitSize = Math.min(w, h) - 40
    const cx = w / 2
    const cy = h / 2

    // Clear previous content
    svg.innerHTML = ''
    svg.setAttribute('width', w.toString())
    svg.setAttribute('height', h.toString())

    // Define category-specific color schemes
    const categoryColors = {
      rtf: {
        base: 'rgb(59, 130, 246)',     // Blue theme for RTF
        glow: 'rgba(59, 130, 246, 0.4)',
        variants: ['rgb(37, 99, 235)', 'rgb(79, 70, 229)', 'rgb(99, 102, 241)']
      },
      momentum: {
        base: 'rgb(34, 197, 94)',      // Green theme for Momentum
        glow: 'rgba(34, 197, 94, 0.4)',
        variants: ['rgb(16, 185, 129)', 'rgb(5, 150, 105)', 'rgb(6, 182, 212)']
      },
      standard: {
        base: 'rgb(251, 146, 60)',     // Orange theme for Standard
        glow: 'rgba(251, 146, 60, 0.4)',
        variants: ['rgb(245, 101, 101)', 'rgb(248, 113, 113)', 'rgb(252, 165, 165)']
      }
    }

    // Create category-based concentric rings
    const orbitRadii = {
      rtf: 0.5,        // Inner orbit for RTF features
      momentum: 0.7,   // Middle orbit for momentum features
      standard: 0.9    // Outer orbit for standard features
    }
    
    // Draw the orbital rings
    Object.entries(orbitRadii).forEach(([category, r]) => {
      const categoryColorScheme = categoryColors[category as keyof typeof categoryColors]
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      circle.setAttribute('cx', cx.toString())
      circle.setAttribute('cy', cy.toString())
      circle.setAttribute('r', ((orbitSize / 2) * r).toString())
      circle.setAttribute('fill', 'none')
      circle.setAttribute('stroke', categoryColorScheme.base.replace('rgb', 'rgba').replace(')', ', 0.15)'))
      circle.setAttribute('stroke-dasharray', '3 8')
      circle.setAttribute('stroke-width', '1.5')
      svg.appendChild(circle)
    })

    // Group features by category for smart positioning
    const featuresByCategory: { [key: string]: typeof features } = {
      rtf: [],
      momentum: [],
      standard: []
    }
    
    features.forEach(feature => {
      featuresByCategory[feature.category].push(feature)
    })
    
    // Position features within each category orbit to avoid overlaps
    Object.entries(featuresByCategory).forEach(([category, categoryFeatures]) => {
      if (categoryFeatures.length === 0) return
      
      const radius = orbitRadii[category as keyof typeof orbitRadii]
      const categoryColorScheme = categoryColors[category as keyof typeof categoryColors]
      const orbitRadius = (orbitSize / 2) * radius
      
      // Calculate optimal angular spacing for this category
      const minAngularSpacing = Math.max(0.5, (2 * Math.PI) / Math.max(categoryFeatures.length, 4))
      const startAngle = Math.random() * 2 * Math.PI // Random start position
      
      categoryFeatures.forEach((feature, index) => {
        // Calculate angle with proper spacing
        const angle = startAngle + (index * minAngularSpacing)
        
        // Add slight radius variation within category (±8% of orbit radius)
        const radiusVariation = 1 + (Math.sin(index * 2.7) * 0.08)
        const finalRadius = orbitRadius * radiusVariation
        
        const x = cx + finalRadius * Math.cos(angle)
        const y = cy + finalRadius * Math.sin(angle)
        
        // Calculate size based on percentage change magnitude
        const percentChange = feature.prev !== 0 ? ((feature.value - feature.prev) / feature.prev) * 100 : 0
        const baseSize = 6
        const sizeMultiplier = Math.min(2.5, 1 + Math.abs(percentChange) / 20)
        const dotSize = baseSize * sizeMultiplier
        
        // Select color variant based on index for variety
        const colorVariant = categoryColorScheme.variants[index % categoryColorScheme.variants.length]
        
        // Create glow effect first (behind main circle)
        const glowCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
        glowCircle.setAttribute('cx', x.toString())
        glowCircle.setAttribute('cy', y.toString())
        glowCircle.setAttribute('r', (dotSize + 3).toString())
        glowCircle.setAttribute('fill', 'none')
        glowCircle.setAttribute('stroke', categoryColorScheme.glow)
        glowCircle.setAttribute('stroke-width', '2')
        glowCircle.setAttribute('opacity', '0.4')
        svg.appendChild(glowCircle)
        
        // Create the main circle
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
        circle.setAttribute('cx', x.toString())
        circle.setAttribute('cy', y.toString())
        circle.setAttribute('r', dotSize.toString())
        circle.setAttribute('fill', colorVariant)
        circle.setAttribute('opacity', '0.8')
        circle.setAttribute('stroke', categoryColorScheme.base)
        circle.setAttribute('stroke-width', '2')
        circle.style.cursor = 'pointer'
        svg.appendChild(circle)
      })
    })
  }, [features, size])

  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
      style={{ height: size }}
    >
      {/* Center label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <div className="text-xs text-zinc-400 font-medium">Feature Orbit</div>
          <div className="text-xs text-zinc-500 mt-1">Prick-storlek = procentuell förändring</div>
        </div>
      </div>
      
      {/* SVG container */}
      <svg 
        ref={svgRef}
        className="absolute inset-0 w-full h-full"
        style={{ overflow: 'visible' }}
      />
      
      {/* Enhanced background gradient with category color hints */}
      <div className="absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-blue-900/20 via-green-900/10 via-orange-900/10 to-zinc-900/40" />
      <div className="absolute inset-0 -z-10 rounded-full bg-gradient-to-tr from-transparent via-blue-500/5 via-green-500/5 to-orange-500/5" />
    </div>
  )
}

// ================= Scroll Navigation Dots =================
const ScrollDots = ({ currentView, onViewChange }: { currentView: number; onViewChange: (view: number) => void }) => {
  const views = [
    { key: 0, label: 'Översikt', color: 'blue' },
    { key: 1, label: 'Modell', color: 'purple' },
    { key: 2, label: 'Prestanda', color: 'green' },
    { key: 3, label: 'Prenumeration', color: 'orange' }
  ]

  return (
    <div className="fixed right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3">
      {views.map((view) => (
        <motion.button
          key={view.key}
          onClick={() => onViewChange(view.key)}
          className={`group relative w-3 h-3 rounded-full transition-all duration-300 ${
            currentView === view.key
              ? `bg-${view.color}-400 shadow-lg shadow-${view.color}-400/50`
              : 'bg-white/30 hover:bg-white/50'
          }`}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
        >
          <motion.div
            className={`absolute -left-12 top-1/2 -translate-y-1/2 px-2 py-1 rounded text-xs font-medium whitespace-nowrap transition-all duration-200 ${
              currentView === view.key
                ? `bg-${view.color}-500/90 text-white opacity-100`
                : 'bg-black/60 text-white/80 opacity-0 group-hover:opacity-100'
            }`}
          >
            {view.label}
          </motion.div>
        </motion.button>
      ))}
    </div>
  )
}

// ================= Main Component =================
export default function SwedishInvestmentImmersive() {
    svg.setAttribute('width', w.toString())
    svg.setAttribute('height', h.toString())

    // Store cleanup functions
    const cleanupFunctions: (() => void)[] = []

    // Define category-specific color schemes
    const categoryColors = {
      rtf: {
        base: 'rgb(59, 130, 246)',     // Blue theme for RTF
        glow: 'rgba(59, 130, 246, 0.4)',
        variants: ['rgb(37, 99, 235)', 'rgb(79, 70, 229)', 'rgb(99, 102, 241)']
      },
      momentum: {
        base: 'rgb(34, 197, 94)',      // Green theme for Momentum
        glow: 'rgba(34, 197, 94, 0.4)',
        variants: ['rgb(16, 185, 129)', 'rgb(5, 150, 105)', 'rgb(6, 182, 212)']
      },
      standard: {
        base: 'rgb(251, 146, 60)',     // Orange theme for Standard
        glow: 'rgba(251, 146, 60, 0.4)',
        variants: ['rgb(245, 101, 101)', 'rgb(248, 113, 113)', 'rgb(252, 165, 165)']
      }
    }

    // Create category-based concentric rings
    const orbitRadii = {
      rtf: 0.5,        // Inner orbit for RTF features
      momentum: 0.7,   // Middle orbit for momentum features
      standard: 0.9    // Outer orbit for standard features
    }
    
    // Draw the orbital rings with category-specific colors
    Object.entries(orbitRadii).forEach(([category, r]) => {
      const categoryColorScheme = categoryColors[category as keyof typeof categoryColors]
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      circle.setAttribute('cx', cx.toString())
      circle.setAttribute('cy', cy.toString())
      circle.setAttribute('r', ((orbitSize / 2) * r).toString())
      circle.setAttribute('fill', 'none')
      circle.setAttribute('stroke', categoryColorScheme.base.replace('rgb', 'rgba').replace(')', ', 0.15)'))
      circle.setAttribute('stroke-dasharray', '3 8')
      circle.setAttribute('stroke-width', '1.5')
      svg.appendChild(circle)
    })

    // Create feature dots with category-based orbital positioning
    const maxR = orbitSize / 2
    
    // Group features by category for smart positioning
    const featuresByCategory: { [key: string]: FeatureData[] } = {
      rtf: [],
      momentum: [],
      standard: []
    }
    
    features.forEach(feature => {
      featuresByCategory[feature.category].push(feature)
    })
    
    // Position features within each category orbit to avoid overlaps
    Object.entries(featuresByCategory).forEach(([category, categoryFeatures]) => {
      if (categoryFeatures.length === 0) return
      
      const radius = orbitRadii[category as keyof typeof orbitRadii]
      const categoryColorScheme = categoryColors[category as keyof typeof categoryColors]
      const orbitRadius = maxR * radius
      
      // Calculate optimal angular spacing for this category
      const minAngularSpacing = Math.max(0.5, 6 / categoryFeatures.length) // Minimum 0.5 radians between points
      const totalAngleNeeded = minAngularSpacing * categoryFeatures.length
      const startAngle = (2 * Math.PI - totalAngleNeeded) / 2 // Center the distribution
      
      categoryFeatures.forEach((feature, index) => {
        // Calculate angle with proper spacing
        const baseAngle = startAngle + (index * minAngularSpacing)
        
        // Add small random jitter for organic feel (±0.1 radians)
        const jitter = (Math.random() - 0.5) * 0.2
        const angle = baseAngle + jitter
        
        // Add slight radius variation within category (±5% of orbit radius)
        const radiusVariation = 1 + (Math.random() - 0.5) * 0.1
        const finalRadius = orbitRadius * radiusVariation
        
        const x = cx + finalRadius * Math.cos(angle)
        const y = cy + finalRadius * Math.sin(angle)
        
        // Calculate size based on percentage change magnitude
        const percentChange = feature.prev !== 0 ? ((feature.value - feature.prev) / feature.prev) * 100 : 0
        const baseSize = 6
        const maxSize = 16
        const sizeMultiplier = Math.min(2.5, 1 + Math.abs(percentChange) / 20) // Cap at 2.5x size
        const dotSize = baseSize * sizeMultiplier
        
        // Select color variant based on index for variety
        const colorVariant = categoryColorScheme.variants[index % categoryColorScheme.variants.length]
        
        // Create the main circle
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
        circle.setAttribute('cx', x.toString())
        circle.setAttribute('cy', y.toString())
        circle.setAttribute('r', dotSize.toString())
        circle.setAttribute('fill', colorVariant)
        circle.setAttribute('opacity', '0.8')
        circle.setAttribute('stroke', categoryColorScheme.base)
        circle.setAttribute('stroke-width', '2')
        
        // Add glow effect
        const glowCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
        glowCircle.setAttribute('cx', x.toString())
        glowCircle.setAttribute('cy', y.toString())
        glowCircle.setAttribute('r', (dotSize + 3).toString())
        glowCircle.setAttribute('fill', 'none')
        glowCircle.setAttribute('stroke', categoryColorScheme.glow)
        glowCircle.setAttribute('stroke-width', '2')
        glowCircle.setAttribute('opacity', '0.4')
        
        svg.appendChild(glowCircle)
        svg.appendChild(circle)
        
        // Add interactivity
        const handleMouseOver = () => {
          circle.setAttribute('opacity', '1')
          circle.setAttribute('r', (dotSize * 1.2).toString())
          glowCircle.setAttribute('opacity', '0.7')
          
          // Show tooltip
          const tooltip = document.getElementById('feature-tooltip')
          if (tooltip) {
            tooltip.innerHTML = `
              <div class="font-bold text-white">${feature.name}</div>
              <div class="text-sm text-gray-300">
                Value: ${feature.value?.toFixed(4) || 'N/A'}<br/>
                Change: ${percentChange.toFixed(2)}%<br/>
                Category: ${feature.category.toUpperCase()}
              </div>
            `
            tooltip.style.left = (x + 20) + 'px'
            tooltip.style.top = (y - 10) + 'px'
            tooltip.style.display = 'block'
          }
        }
        
        const handleMouseOut = () => {
          circle.setAttribute('opacity', '0.8')
          circle.setAttribute('r', dotSize.toString())
          glowCircle.setAttribute('opacity', '0.4')
          
          const tooltip = document.getElementById('feature-tooltip')
          if (tooltip) {
            tooltip.style.display = 'none'
          }
        }
        
        circle.addEventListener('mouseover', handleMouseOver)
        circle.addEventListener('mouseout', handleMouseOut)
        
        cleanupFunctions.push(() => {
          circle.removeEventListener('mouseover', handleMouseOver)
          circle.removeEventListener('mouseout', handleMouseOut)
        })
      })
    })
    
    // Return cleanup function
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup())
    }
  }, [features])

  const [spot, setSpot] = useState({x:50,y:50})
  const [csvText, setCsvText] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [zoomDomain, setZoomDomain] = useState<[string, string] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showSignup, setShowSignup] = useState(false)
  const chartRef = useRef<HTMLElement>(null)

  const scrollToChart = () => {
      
      // Category-specific color system with trend variations
      const delta = feature.value - feature.prev
      const threshold = 0.03
      const categoryColorScheme = categoryColors[feature.category]
      
      let color = categoryColorScheme.base
      let glowColor = categoryColorScheme.glow
      
      // Use deterministic index for color variant selection
      const variantIndex = Math.abs(Math.floor(Math.sin(i * 2.7) * 3)) % categoryColorScheme.variants.length
      
      // Modify color based on trend and value
      if (feature.value > 0.1) {
        if (delta > threshold) {
          // Strong positive trend - use brighter variant
          color = categoryColorScheme.variants[0]
          glowColor = categoryColorScheme.glow
        } else if (delta > 0) {
          // Positive trend - use second variant
          color = categoryColorScheme.variants[1] || categoryColorScheme.base
        } else {
          // Stable positive - use base color
          color = categoryColorScheme.base
        }
      } else if (feature.value < -0.1) {
        if (delta < -threshold) {
          // Strong negative trend - use darker variant
          color = categoryColorScheme.variants[2] || categoryColorScheme.base
          const rgb = color.match(/\d+/g)
          if (rgb) {
            color = `rgb(${Math.max(0, parseInt(rgb[0]) - 30)}, ${Math.max(0, parseInt(rgb[1]) - 30)}, ${Math.max(0, parseInt(rgb[2]) - 30)})`
          }
        } else {
          // Moderate negative - use variant
          color = categoryColorScheme.variants[variantIndex]
        }
      } else {
        // Near-zero values - use subtle variant with transparency
        color = categoryColorScheme.variants[variantIndex]
        const rgb = color.match(/\d+/g)
        if (rgb) {
          glowColor = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.2)`
        }
      }
      
      dot.setAttribute('fill', color)
      dot.setAttribute('stroke', 'rgba(255,255,255,0.2)')
      dot.setAttribute('stroke-width', '1.5')
      
      // Add subtle glow effect
      dot.setAttribute('filter', 'drop-shadow(0 0 8px ' + glowColor + ')')
      
      dot.style.cursor = 'pointer'
      // NO animations, NO transitions, NO hover effects - completely static
      dot.style.opacity = '1'
      
      // Simple hover handlers ONLY for tooltip - no visual changes to the dot
      const handleMouseEnter = (e: MouseEvent) => {
        setTooltip({
          feature,
          x: e.clientX,
          y: e.clientY,
          visible: true
        })
      }
      
      const handleMouseMove = (e: MouseEvent) => {
        setTooltip(prev => ({
          ...prev,
          x: e.clientX,
          y: e.clientY
        }))
      }
      
      const handleMouseLeave = () => {
        setTooltip(prev => ({ ...prev, visible: false }))
      }
      
      dot.addEventListener('mouseenter', handleMouseEnter)
      dot.addEventListener('mousemove', handleMouseMove)
      dot.addEventListener('mouseleave', handleMouseLeave)
      
      // Store cleanup functions for event listeners only
      cleanupFunctions.push(() => {
        dot.removeEventListener('mouseenter', handleMouseEnter)
        dot.removeEventListener('mousemove', handleMouseMove)
        dot.removeEventListener('mouseleave', handleMouseLeave)
      })
      
      svg.appendChild(dot)
    })

    // Return cleanup function
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup())
    }
  }, [features])

  const hideTooltip = () => {
    setTooltip(prev => ({ ...prev, visible: false }))
  }

  return (
    <>
      <div 
        ref={containerRef}
        className={`relative ${className}`}
        style={{ height: size }}
        onMouseLeave={hideTooltip}
      >
        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-xs text-zinc-400 font-medium">Feature Orbit</div>
            <div className="text-xs text-zinc-500 mt-1">Prick-storlek = procentuell förändring</div>
          </div>
        </div>
        
        {/* SVG container */}
        <svg 
          ref={svgRef}
          className="absolute inset-0 w-full h-full"
          style={{ overflow: 'visible' }}
        />
        
        {/* Enhanced background gradient with category color hints */}
        <div className="absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-blue-900/20 via-green-900/10 via-orange-900/10 to-zinc-900/40" />
        <div className="absolute inset-0 -z-10 rounded-full bg-gradient-to-tr from-transparent via-blue-500/5 via-green-500/5 to-orange-500/5" />
      </div>
      
      <FeatureTooltip {...tooltip} />
    </>
  )
}

// ================= Scroll Navigation Dots =================
function ScrollDots(){
  const sections = ['hero','performance','klassificering','modell','indikatorer','prenumeration']
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

// ================= Info Card Component =================
function InfoCard({title, children, className = ""}:{title:string; children:React.ReactNode; className?:string}){
  return (
    <motion.div 
      initial={{opacity:0, y:20}} 
      whileInView={{opacity:1, y:0}} 
      viewport={{ once:true, margin:'-60px' }} 
      whileHover={{y:-4, scale:1.02}} 
      transition={{type:'spring', damping:20, stiffness:180}}
      className={`rounded-2xl ring-1 ring-white/10 bg-white/5 backdrop-blur-md p-6 ${className}`}
    >
      <div className="text-xs uppercase tracking-widest text-white/60 mb-3">{title}</div>
      {children}
    </motion.div>
  )
}

// ================= Advanced DCA vs Model Calculator =================
interface CalculatorResult {
  period: string
  monthlyAmount: number
  totalInvested: number
  dcaValue: number
  modelValue: number
  advantage: number
  advantagePercent: number
}

const AdvancedCalculator: React.FC<{ onSignupOpen?: () => void; onSignupSuccess?: () => void }> = ({ onSignupOpen, onSignupSuccess }) => {
  const [monthlyAmount, setMonthlyAmount] = useState(1000)
  const [selectedPeriod, setSelectedPeriod] = useState('12') // months back
  const [results, setResults] = useState<CalculatorResult | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [showSignupPrompt, setShowSignupPrompt] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)

  // Listen for signup success
  useEffect(() => {
    const handleSignupSuccess = () => {
      setSignupSuccess(true)
      setShowSignupPrompt(false)
    }
    
    if (onSignupSuccess) {
      // This would be called when signup is successful
      window.addEventListener('signupSuccess', handleSignupSuccess)
      return () => window.removeEventListener('signupSuccess', handleSignupSuccess)
    }
  }, [onSignupSuccess])

  // Load and parse CSV data
  const [csvData, setCsvData] = useState<Array<{
    date: Date
    close: number
    signal: string
    equity: number
    dca: number
  }>>([])

  useEffect(() => {
    // Load CSV data
    fetch('/signals_with_equity.csv')
      .then(response => response.text())
      .then(text => {
        const lines = text.trim().split('\n')
        const data = lines.slice(1).map(line => {
          const [dateStr, close, signal, , equity, dca] = line.split(',')
          return {
            date: new Date(dateStr),
            close: parseFloat(close),
            signal,
            equity: parseFloat(equity),
            dca: parseFloat(dca)
          }
        }).filter(row => !isNaN(row.equity) && !isNaN(row.dca))
        
        setCsvData(data.sort((a, b) => a.date.getTime() - b.date.getTime()))
      })
      .catch(error => {
        console.error('Error loading CSV:', error)
        // Fallback to generated data if CSV fails
        setCsvData(generateFallbackData())
      })
  }, [])

  const generateFallbackData = () => {
    // Generate fallback data for demonstration
    const data = []
    const startDate = new Date('2023-01-01')
    let dcaValue = 1000
    let modelValue = 1000
    
    for (let i = 0; i < 400; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      
      // Simulate market movement
      const marketChange = (Math.random() - 0.48) * 0.02 // Slight upward bias
      dcaValue *= (1 + marketChange)
      
      // Model performs better on average
      const modelMultiplier = Math.random() > 0.6 ? 1.002 : 0.999
      modelValue *= (1 + marketChange) * modelMultiplier
      
      data.push({
        date,
        close: 4000 + i * 2 + Math.random() * 100,
        signal: Math.random() > 0.7 ? 'Buy' : 'Hold',
        equity: modelValue,
        dca: dcaValue
      })
    }
    return data
  }

  const calculateROI = async () => {
    if (csvData.length === 0) return
    
    setIsCalculating(true)
    
    // Simulate calculation time
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const monthsBack = parseInt(selectedPeriod)
    const today = new Date()
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - monthsBack)
    
    // Filter data for the selected period, sorted by date
    const periodData = csvData.filter(row => 
      row.date >= startDate && row.date <= today
    ).sort((a, b) => a.date.getTime() - b.date.getTime())
    
    if (periodData.length < 2) {
      setIsCalculating(false)
      return
    }
    
    // Simulate the actual investment process like in step2.py
    let hasGottenCapitalThisMonth = false
    let modelEquity = 0.0  // Cash in model strategy
    let modelShares = 0.0  // Shares owned in model strategy
    let dcaShares = 0.0    // Shares accumulated through DCA
    let totalInvested = 0.0
    let currentMonth = startDate.getMonth()
    let currentYear = startDate.getFullYear()
    
    for (const row of periodData) {
      const rowMonth = row.date.getMonth()
      const rowYear = row.date.getFullYear()
      
      // Check if we're in a new month
      if (rowMonth !== currentMonth || rowYear !== currentYear) {
        hasGottenCapitalThisMonth = false
        currentMonth = rowMonth
        currentYear = rowYear
      }
      
      // Invest monthly amount on 10th of each month (or later if 10th is not trading day)
      if (row.date.getDate() >= 10 && !hasGottenCapitalThisMonth) {
        // Add monthly investment
        modelEquity += monthlyAmount
        totalInvested += monthlyAmount
        hasGottenCapitalThisMonth = true
        
        // DCA: immediately buy shares
        dcaShares += monthlyAmount / row.close
      }
      
      // Model strategy: buy shares only on Buy signals
      if (row.signal === 'Buy' && modelEquity > 0) {
        const newShares = modelEquity / row.close
        modelShares += newShares
        modelEquity = 0  // All cash invested
      }
    }
    
    // Calculate final values at the end of period
    const lastRow = periodData[periodData.length - 1]
    const finalModelValue = modelEquity + (modelShares * lastRow.close)
    const finalDcaValue = dcaShares * lastRow.close
    
    // Calculate advantage
    const advantage = finalModelValue - finalDcaValue
    const advantagePercent = totalInvested > 0 ? ((finalModelValue / finalDcaValue) - 1) * 100 : 0
    
    const result: CalculatorResult = {
      period: `${monthsBack} månader`,
      monthlyAmount,
      totalInvested,
      dcaValue: finalDcaValue,
      modelValue: finalModelValue,
      advantage,
      advantagePercent
    }
    
    setResults(result)
    setIsCalculating(false)
    
    // Show signup prompt after successful calculation
    setTimeout(() => {
      setShowSignupPrompt(true)
    }, 1500)
  }

  return (
    <div className="bg-gradient-to-br from-zinc-900/50 to-black/30 rounded-xl p-8 border border-white/10">
      <h3 className="text-2xl font-bold text-white mb-6">Avancerad Investeringskalkylator</h3>
      <p className="text-gray-300 mb-8">
        Beräkna skillnaden mellan DCA och vår modell baserat på verklig historisk data
      </p>
      
      <div className="grid md:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-6">
          <div>
            <label className="block text-white font-medium mb-3">Månatlig investering (SEK)</label>
            <input
              type="number"
              value={monthlyAmount}
              onChange={(e) => setMonthlyAmount(parseInt(e.target.value) || 0)}
              className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-3 text-white focus:border-blue-400 focus:outline-none"
              placeholder="Ange belopp"
            />
          </div>
          
          <div>
            <label className="block text-white font-medium mb-3">Tidsperiod tillbaka</label>
            <div className="grid grid-cols-1 gap-3">
              {[
                { value: '6', label: '6 månader' },
                { value: '12', label: '1 år' },
                { value: '24', label: '2 år' }
              ].map(period => (
                <button
                  key={period.value}
                  onClick={() => setSelectedPeriod(period.value)}
                  className={`p-3 rounded-lg border transition-all ${
                    selectedPeriod === period.value
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-black/30 border-white/20 text-gray-300 hover:border-white/40'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>
          
          <button
            onClick={calculateROI}
            disabled={isCalculating || monthlyAmount <= 0}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-all"
          >
            {isCalculating ? 'Beräknar...' : 'Beräkna Skillnad'}
          </button>
        </div>
        
        {/* Results Section */}
        <div className="space-y-4">
          {results && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="bg-black/30 rounded-lg p-4 border border-white/10">
                <h4 className="text-white font-semibold mb-3">Resultat för {results.period}</h4>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Totalt investerat:</span>
                    <span className="text-white font-mono">{results.totalInvested.toLocaleString('sv-SE')} SEK</span>
                  </div>
                  
                  <hr className="border-white/10" />
                  
                  <div className="flex justify-between">
                    <span className="text-gray-300">DCA Slutvärde:</span>
                    <span className="text-blue-400 font-mono">{results.dcaValue.toLocaleString('sv-SE', {maximumFractionDigits: 0})} SEK</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-300">Modell Slutvärde:</span>
                    <span className="text-purple-400 font-mono">{results.modelValue.toLocaleString('sv-SE', {maximumFractionDigits: 0})} SEK</span>
                  </div>
                  
                  <hr className="border-white/10" />
                  
                  <div className={`${results.advantage >= 0 ? 'bg-gradient-to-r from-green-500/20 to-blue-500/20 border-green-500/30' : 'bg-gradient-to-r from-red-500/20 to-orange-500/20 border-red-500/30'} rounded p-3 border`}>
                    <div className="flex justify-between items-center">
                      <span className="text-white font-semibold">
                        {results.advantage >= 0 ? 'Fördel med modellen:' : 'DCA presterade bättre:'}
                      </span>
                      <div className="text-right">
                        <div className={`font-mono font-bold ${results.advantage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {results.advantage >= 0 ? '+' : ''}{results.advantage.toLocaleString('sv-SE', {maximumFractionDigits: 0})} SEK
                        </div>
                        <div className={`text-xs ${results.advantage >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                          ({results.advantagePercent >= 0 ? '+' : ''}{results.advantagePercent.toFixed(1)}% skillnad)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Signup Success Message */}
          {signupSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="bg-gradient-to-br from-green-600/20 to-blue-600/20 rounded-lg p-6 border border-green-400/30 relative overflow-hidden mt-4"
            >
              <div className="relative space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <span className="text-green-400 text-lg">✅</span>
                  </div>
                  <h4 className="text-white font-semibold">Tack för din anmälan!</h4>
                </div>
                
                <p className="text-gray-300 text-sm leading-relaxed">
                  Du kommer nu att få våra köpsignaler och månadsrapporter direkt i din inkorg. 
                  Håll utkik efter nästa köpfönster!
                </p>
              </div>
            </motion.div>
          )}
          
          {/* Signup Prompt after calculation */}
          {results && showSignupPrompt && !signupSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-lg p-6 border border-blue-400/30 relative overflow-hidden mt-4"
            >
              <div className="relative space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <span className="text-blue-400 text-lg">📈</span>
                  </div>
                  <h4 className="text-white font-semibold">Imponerat av resultatet?</h4>
                </div>
                
                <p className="text-gray-300 text-sm leading-relaxed">
                  Få de senaste köpsignalerna och månatliga analysrapporter direkt i din inkorg. 
                  Håll koll på när modellen identifierar nästa köpfönster.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      if (onSignupOpen) {
                        onSignupOpen()
                        // Don't close the prompt - let it stay until signup success
                      }
                    }}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105"
                  >
                    Få köpsignaler via mejl
                  </button>
                  
                  <button
                    onClick={() => setShowSignupPrompt(false)}
                    className="text-gray-400 hover:text-white text-sm px-4 py-2 transition-colors"
                  >
                    Kanske senare
                  </button>
                </div>
              </div>
            </motion.div>
          )}
          
          {!results && (
            <div className="bg-black/20 rounded-lg p-8 border border-white/5 text-center">
              <div className="text-gray-400 text-sm">
                Välj parametrar och klicka "Beräkna Skillnad" för att se resultatet
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Discrete disclaimer */}
      <p className="text-gray-500 text-xs leading-relaxed mt-6 opacity-70">
        Inte finansiell rådgivning. Historisk avkastning garanterar inte framtida resultat. Konsultera finansiell rådgivare.
      </p>
    </div>
  )
}

// ================= Main Component =================
export default function SwedishInvestmentImmersive() {
  const [spot, setSpot] = useState({x:50,y:50})
  const [csvText, setCsvText] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [zoomDomain, setZoomDomain] = useState<[string, string] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showSignup, setShowSignup] = useState(false)
  const chartRef = useRef<HTMLElement>(null)

  const scrollToChart = () => {
    chartRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    })
  }

  const { scrollYProgress } = useScroll()
  const topBar = useTransform(scrollYProgress, [0,1], [0,1])

  // Fetch demo CSV data
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
2023-10-02,4288.39,Hold,FN,1000.0,988.6914862222881
2023-10-03,4229.45,Hold,FN,1000.0,975.1028256298647
2023-10-25,4186.77,Buy,TP,3000.0,2882.4687086405293
2023-10-26,4137.23,Buy,TP,2964.502468490029,2848.361867370038
2023-11-10,4415.24,Hold,FN,4163.708539040836,4039.763622348017
2023-11-13,4411.55,Hold,FN,5161.064496019604,5036.38742359858
2023-12-01,4594.63,Hold,FN,5292.249156270825,5245.3982722827`
        setCsvText(demo)
      } finally { setLoading(false) }
    })()
  }, [])

  // Parse CSV data
  useEffect(()=>{ if(!csvText) return; try { setRows(parseCSV(csvText)); setError(null) } catch(e:any){ setError(e?.message||'Parse error') } }, [csvText])

  // Process data for charts
  const seriesAll = useMemo(()=> buildSeries(rows), [rows])
  const series2y = useMemo(()=> twoYearSlice(seriesAll), [seriesAll])
  const dataToShow = useMemo(()=>{
    let base = series2y
    if (zoomDomain){ const [s,e] = zoomDomain; const filtered = series2y.filter(p=> p.t >= s && p.t <= e); base = filtered.length ? filtered : series2y }
    return base.map((p,i)=> ({...p, x:i}))
  }, [series2y, zoomDomain])

  // Calculate statistics
  const stats = useMemo(()=>{
    if (series2y.length < 3) return null
    
    // Filter out initial rows with zero values
    const validSeries = series2y.filter(p => p.strategyValue > 0 && p.benchmarkValue > 0)
    if (validSeries.length < 3) return null
    
    const bS = validSeries[0].strategyValue, bB = validSeries[0].benchmarkValue
    
    // Safety check for valid starting values
    if (!isFinite(bS) || !isFinite(bB) || bS <= 0 || bB <= 0) {
      console.warn('Invalid starting values for calculations:', { bS, bB })
      return null
    }
    
    const wS = validSeries.map(p=> p.strategyValue/bS), wB = validSeries.map(p=> p.benchmarkValue/bB)
    
    // Check for any NaN values in the series
    if (wS.some(w => !isFinite(w)) || wB.some(w => !isFinite(w))) {
      console.warn('NaN values detected in wealth series')
      return null
    }
    
    const rsS = dailyReturns(wS), rsB = dailyReturns(wB)
    const years = (new Date(validSeries[validSeries.length-1].t).getTime()-new Date(validSeries[0].t).getTime())/(365*24*3600*1000)
    const cagr = (w:number[]) => w[w.length-1] ** (1/Math.max(1e-6, years)) - 1
    return { strat: { total: wS[wS.length-1]-1, sharpe: sharpe(rsS), maxDD: maxDrawdown(wS), cagr: cagr(wS) }, bh: { total: wB[wB.length-1]-1, sharpe: sharpe(rsB), maxDD: maxDrawdown(wB), cagr: cagr(wB) } }
  }, [series2y])

  const latest = rows[rows.length-1] || null
  const today: 'BUY'|'HOLD'|null = latest ? (String(latest.signal).toUpperCase()==='BUY'?'BUY':'HOLD') : null
  const relROI = stats ? ((1 + stats.strat.total) / (1 + stats.bh.total) - 1) : null

  // Spotlight cursor
  useEffect(()=>{
    const onMove=(e:PointerEvent)=>{ 
      const x = (e.clientX / innerWidth)*100
      const y = (e.clientY / innerHeight)*100
      setSpot({x,y}) 
    }
    window.addEventListener('pointermove', onMove, { passive:true })
    return ()=> window.removeEventListener('pointermove', onMove as any)
  },[])

  // Evidence Chart Component
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
              <Tooltip content={<ChartTooltip />} labelFormatter={(v)=>{ const i=Math.round(Number(v)); return dataToShow[i]?.t || ''; }} />
              <Area yAxisId="equity" type="monotone" dataKey="strategyValue" name="Modell" stroke="#34d399" strokeWidth={2} fill="url(#gS)" isAnimationActive={false} />
              <Area yAxisId="equity" type="monotone" dataKey="benchmarkValue" name="DCA" stroke="#f59e0b" strokeWidth={2} fill="url(#gDCA)" isAnimationActive={false} />
              <Line yAxisId="price" type="monotone" dataKey="closePrice" name="NASDAQ Close" stroke="#d4d4d8" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              <Line 
                yAxisId="price" 
                type="monotone" 
                dataKey="closePrice" 
                stroke="transparent" 
                strokeWidth={0}
                dot={(props) => {
                  const { cx, cy, payload, index } = props
                  if (!payload?.signal || !cx || !cy) return <g />
                  
                  const isBuy = payload.signal === 'BUY'
                  
                  if (isBuy) {
                    // BUY signals - more subtle to not compete with model line
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={1.5}
                        fill="#0ea5e9"
                        stroke="#38bdf8"
                        strokeWidth={0.3}
                        opacity={0.5}
                      />
                    )
                  } else {
                    // HOLD signals - very subtle, every 3rd point
                    if (index % 3 !== 0) return <g />
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={1}
                        fill="#8b5cf6"
                        stroke="#a78bfa"
                        strokeWidth={0.2}
                        opacity={0.3}
                      />
                    )
                  }
                }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* On-chart legend */}
        <div className="pointer-events-none absolute top-3 left-1/2 transform -translate-x-1/2 z-10">
          <div className="flex items-center gap-3 rounded-md bg-black/30 backdrop-blur px-2 py-1 ring-1 ring-white/10 text-[10px] text-white/80">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              Modell
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400"></span>
              DCA
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-white"></span>
              NASDAQ
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-500"></span>
              BUY
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-violet-200"></span>
              HOLD
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
        <Scene stage="aurora" />
        <Grain />
        <div className="text-center"><div className="text-2xl font-semibold mb-2">Laddar NASDAQ data...</div><div className="text-zinc-400">Letar efter CSV data</div></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full text-zinc-100 bg-[#0B0C10] overflow-x-hidden" style={{ backgroundImage:`radial-gradient(600px 400px at ${spot.x}% ${spot.y}%, rgba(255,255,255,0.06), transparent 60%)` }}>
      {/* Background Effects */}
      <Scene stage="aurora" />
      <Grain />
      <MouseTrail />
      <ScrollDots />

      {/* Progress Bar */}
      <motion.div style={{ scaleX: topBar }} className="fixed left-0 right-0 top-0 h-1 origin-left bg-cyan-300/80 z-40" />

      {/* HERO SECTION */}
      <section id="hero" data-key="hero" className="relative mx-auto max-w-7xl px-4 pt-20 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left Side - Main Content */}
          <motion.div initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} transition={{type:'spring',damping:22,stiffness:200}} className="space-y-8">
            {/* Status and Date */}
            <div className="flex flex-wrap items-center gap-4">
              <div className={`inline-flex items-center gap-3 rounded-full px-6 py-3 backdrop-blur-md ring-1 ${
                latest?.signal === 'BUY' 
                  ? 'bg-green-600/20 ring-green-400/30'
                  : 'bg-yellow-600/20 ring-yellow-400/30'
              }`}>
                <div className={`h-3 w-3 rounded-full shadow-[0_0_18px_4px] ${
                  latest?.signal === 'BUY'
                    ? 'bg-green-400 shadow-green-400/35'
                    : 'bg-yellow-400 shadow-yellow-400/35'
                }`} />
                <span className={`text-lg font-bold ${
                  latest?.signal === 'BUY' ? 'text-green-300' : 'text-yellow-300'
                }`}>
                  {latest?.signal || 'HOLD'}
                </span>
              </div>
              {/* <div className="text-gray-400 text-lg">
                {latest ? toISO(latest.date) : 'Loading...'}
              </div> */}
              {stats && (
                <div className="flex items-center gap-2 flex-wrap">
                  <MetricChip label="Rel ROI (M/D)" value={
                    isFinite(stats.strat.total) && isFinite(stats.bh.total) && stats.bh.total !== -1 
                      ? pct(((1+stats.strat.total)/(1+stats.bh.total))-1)
                      : "N/A"
                  } />
                  <MetricChip label="Sharpe M/D" value={`${isFinite(stats.strat.sharpe) ? stats.strat.sharpe.toFixed(2) : 'N/A'}/${isFinite(stats.bh.sharpe) ? stats.bh.sharpe.toFixed(2) : 'N/A'}`} />
                </div>
              )}
            </div>

            {/* Main Headline */}
            <div className="space-y-6">
              <AnimatedHeadline text="Smarter monthly investing — powered by data" />
              <motion.p 
                initial={{opacity:0, y:12}} 
                animate={{opacity:1, y:0}} 
                transition={{delay:0.6, duration:0.8}}
                className="max-w-2xl text-xl md:text-2xl text-zinc-300 leading-relaxed"
              >
                Vår modell anpassar dina månatliga köp efter marknadsläget och förbättrar traditionell DCA. 
                Identifiera köpfönster och få bättre tajming varje månad.
              </motion.p>
            </div>

            {/* Performance Metric */}
            {typeof relROI === 'number' && (
              <motion.div 
                initial={{opacity:0, y:8}} 
                animate={{opacity:1, y:0}} 
                transition={{delay:0.8, duration:0.8}}
                className="rounded-2xl ring-1 ring-emerald-400/30 bg-emerald-400/10 p-6 max-w-xl"
              >
                <div className="text-xs uppercase tracking-widest text-emerald-300 mb-2">Mer avkastning</div>
                <Counter big value={relROI * 100} fmt={(n)=>`+${n.toFixed(2)}%`} />
                <div className="mt-2 text-xs text-white/70">
                  Rel ROI (M/D) = (Modell − DCA) / DCA = {pct(relROI)}
                </div>
              </motion.div>
            )}

            {/* CTA Buttons */}
            <motion.div 
              initial={{opacity:0, y:12}} 
              animate={{opacity:1, y:0}} 
              transition={{delay:1.0, duration:0.8}}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Magnetic className="bg-blue-600 hover:bg-blue-700 text-white border-blue-500" onClick={scrollToChart}>
                Se köpfönster
              </Magnetic>
              <Magnetic className="text-white border-gray-500" onClick={() => setShowSignup(true)}>
                Subscribe
              </Magnetic>
            </motion.div>
          </motion.div>

          {/* Right Side - Feature Orbit */}
          <motion.div 
            initial={{opacity:0, x:20}} 
            animate={{opacity:1, x:0}} 
            transition={{type:'spring', stiffness:220, damping:22, delay:0.4}}
            className="lg:sticky lg:top-24"
          >
            <div className="rounded-2xl ring-1 ring-white/10 bg-gradient-to-b from-white/5 to-transparent p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Live Feature Orbit</h3>
              <p className="text-gray-300 text-sm mb-6">
                Visualisering av modellindikatorer som bestämmer köpsignaler.
              </p>
              <FeatureOrbitClean className="w-full" size={420} csvData={rows} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* CHART SECTION */}
      <section ref={chartRef} id="performance" data-key="performance" className="relative mx-auto max-w-6xl px-4 py-16">
        <motion.div initial={{opacity:0, y:20}} whileInView={{opacity:1, y:0}} viewport={{ once:true, margin:'-60px' }} transition={{type:'spring', stiffness:220, damping:22}}>
          <InfoCard title="Kapitalutveckling" className="max-w-full">
            <p className="text-gray-300 mb-6">Nasdaq Close, Vår modell och DCA över tid.</p>
            {EvidenceChart}
          </InfoCard>
        </motion.div>

        {/* Interactive Technical Indicators */}
        <motion.div 
          initial={{opacity:0, y:20}} 
          whileInView={{opacity:1, y:0}} 
          viewport={{ once:true, margin:'-60px' }} 
          transition={{type:'spring', stiffness:220, damping:22, delay:0.2}}
          className="mt-12"
        >
          <InfoCard title="Tekniska indikatorer — interaktiv översikt">
            <InteractiveIndicatorShowcase />
          </InfoCard>
        </motion.div>

        {/* Advanced Calculator */}
        <motion.div 
          initial={{opacity:0, y:20}} 
          whileInView={{opacity:1, y:0}} 
          viewport={{ once:true, margin:'-60px' }} 
          transition={{type:'spring', stiffness:220, damping:22, delay:0.3}}
          className="mt-12"
        >
          <AdvancedCalculator 
            onSignupOpen={() => setShowSignup(true)}
            onSignupSuccess={() => setShowSignup(false)}
          />
        </motion.div>
      </section>

      {/* KLASSIFICERING SECTION */}
      <section id="klassificering" data-key="klassificering" className="relative mx-auto max-w-6xl px-4 py-16">
        <motion.div initial={{opacity:0, y:20}} whileInView={{opacity:1, y:0}} viewport={{ once:true, margin:'-60px' }} transition={{type:'spring', stiffness:220, damping:22}}>
          <InfoCard title="Klassificerare & etiketter">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-600/30">
                  <h3 className="text-blue-300 font-semibold mb-2">Labels</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Label 1 när indexet når +10% minst en gång inom 70 handelsdagar utan att falla mer än 
                    en tredjedel av målet i motsatt riktning; annars Label 0.
                  </p>
                </div>
                
                <div className="bg-green-900/20 rounded-lg p-4 border border-green-600/30">
                  <h3 className="text-green-300 font-semibold mb-2">Estimator</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    <code className="bg-gray-800 px-2 py-1 rounded text-xs">imblearn.ensemble.BalancedBaggingClassifier</code> 
                    {' '}(parallelliserad med n_jobs=-1).
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-600/30">
                  <h3 className="text-purple-300 font-semibold mb-2">Neuralt nät (MLP)</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    MinMaxScaler → MLP (1 dolt lager = 4× features, ReLU, alpha=0.001, utgång: sigmoid) 
                    ⇒ sannolikhet för klass "1".
                  </p>
                </div>
                
                <div className="bg-cyan-900/20 rounded-lg p-4 border border-cyan-600/30">
                  <h3 className="text-cyan-300 font-semibold mb-2">Syfte</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Skatta om förutsättningarna är gynnsamma för ett 70‑dagars mål ("applicability windows").
                  </p>
                </div>
              </div>
            </div>
          </InfoCard>
        </motion.div>
      </section>

      {/* MODELL SECTION */}
      <section id="modell" data-key="modell" className="relative mx-auto max-w-6xl px-4 py-16">
        <motion.div initial={{opacity:0, y:20}} whileInView={{opacity:1, y:0}} viewport={{ once:true, margin:'-60px' }} transition={{type:'spring', stiffness:220, damping:22}}>
          <InfoCard title="Modellen — dynamiska trendindikatorer">
            <div className="space-y-6">
              <div className="bg-purple-900/20 rounded-lg p-6 border border-purple-600/30">
                <p className="text-gray-300 leading-relaxed">
                  Baserad på <strong className="text-purple-300">Bareket & Pârv (2024)</strong>. 
                  Adaptiva indikatorer (EMA, TEMA, MomEma, MomTema, RCTema, RTF och SES→FWD SMA) 
                  för medellångsiktiga rörelser (~70 handelsdagar). 
                  <strong className="text-purple-300"> Mål: identifiera optimala inträdespunkter.</strong>
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-600">
                  <p className="text-gray-300 leading-relaxed mb-4">
                    <strong className="text-green-400">DCA ger stabilitet</strong>; modellen försöker skapa 
                    överavkastning i trendfaser. I andra perioder kan DCA vara bättre — i linje med EMH/Random Walk.
                  </p>
                  <p className="text-gray-300 leading-relaxed">
                    Indikatorerna kombineras till signaler för köpfönster.
                  </p>
                </div>
                
                <div className="bg-blue-900/20 rounded-lg p-6 border border-blue-600/30">
                  <h3 className="text-blue-300 font-semibold mb-3">Tidsperspektiv</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Medellångsiktiga rörelser över ~70 handelsdagar för optimal inträdespunkt-identifiering.
                  </p>
                </div>
              </div>
            </div>
          </InfoCard>
        </motion.div>
      </section>

      {/* PRENUMERATION SECTION */}
      <section id="prenumeration" data-key="prenumeration" className="relative mx-auto max-w-6xl px-4 py-16 pb-32">
        <motion.div initial={{opacity:0, y:20}} whileInView={{opacity:1, y:0}} viewport={{ once:true, margin:'-60px' }} transition={{type:'spring', stiffness:220, damping:22}}>
          <InfoCard title="Prenumeration — steg för steg (kommer snart)" className="text-center">
            <p className="text-gray-300 mb-8 leading-relaxed max-w-2xl mx-auto">
              Gör det enkelt: ett steg i taget så det känns lätt att komma igång.
            </p>
            
            {/* Steps */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {[
                { step: "1", title: "Registrera", desc: "Ange din e-post för månadsrapporter", color: "bg-blue-500" },
                { step: "2", title: "Konfigurera", desc: "Välj dina investeringspreferenser", color: "bg-purple-500" },
                { step: "3", title: "Få signaler", desc: "Månatliga köprekommendationer", color: "bg-green-500" }
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{opacity:0, y:20}} 
                  whileInView={{opacity:1, y:0}} 
                  viewport={{ once:true }}
                  transition={{delay: i * 0.1, type:'spring', stiffness:220, damping:22}}
                  whileHover={{y:-4, scale:1.05}}
                  className="bg-gray-800/50 rounded-lg p-6 border border-gray-600"
                >
                  <div className={`w-12 h-12 ${item.color} rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold`}>
                    {item.step}
                  </div>
                  <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-400">{item.desc}</p>
                </motion.div>
              ))}
            </div>
            
            {/* Main CTA */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Magnetic className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-none text-lg px-8 py-4">
                Jag vill ha en månads‑påminnelse
              </Magnetic>
            </motion.div>
            
          </InfoCard>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="relative mx-auto max-w-6xl px-4 py-8 border-t border-gray-800/30">
        <div className="grid md:grid-cols-2 gap-6 text-left">
          {/* Legal Disclaimer */}
          <div className="space-y-3">
            <h3 className="text-gray-400 font-medium text-sm">
              Juridisk information
            </h3>
            <div className="text-gray-500 text-xs leading-relaxed space-y-2">
              <p>
                <span className="text-gray-400">Inte finansiell rådgivning:</span> Informationen på denna webbplats utgör inte finansiell, investerings- eller juridisk rådgivning. 
                All information tillhandahålls endast i utbildningssyfte och för allmän information.
              </p>
              <p>
                <span className="text-gray-400">Historisk prestanda:</span> Tidigare resultat är ingen indikation på framtida prestanda. 
                Alla investeringar innebär risk för förlust av kapital, inklusive möjligheten att förlora mer än det ursprungliga investerade beloppet.
              </p>
              <p>
                <span className="text-gray-400">Egen forskning:</span> Genomför alltid egen analys och konsultera en kvalificerad finansiell rådgivare 
                innan du fattar investeringsbeslut. Vi ansvarar inte för förluster som kan uppstå från användning av denna information.
              </p>
              <p>
                <span className="text-gray-400">Backtesting och estimerade avkastningar:</span> Alla procentsatser, avkastningssiffror och prestationsmått 
                som presenteras på denna webbplats är beräknade genom backtesting av historiska data och motsvarar inte faktisk avkastning. 
                Backtesting kan inte garantera framtida resultat och faktisk handel kan skilja sig väsentligt från backtestad prestanda. 
                Vi tar inget ansvar för eventuella fel, brister eller felaktigheter i informationen på denna webbplats.
              </p>
            </div>
          </div>
          
          {/* About Model & Navigation */}
          <div className="space-y-3">
            <h3 className="text-gray-400 font-medium text-sm">
              Om modellen & Navigation
            </h3>
            <div className="text-gray-500 text-xs leading-relaxed space-y-2">
              <p>
                Vår kvantitativa modell använder maskininlärning för att analysera marknadsdata och generera köpsignaler. 
                Modellen är baserad på historisk data från amerikanska aktiemarknaden.
              </p>
              <p>
                Resultaten som presenteras är backtestad prestanda och reflekterar inte verkliga handelskostnader, 
                skatter eller andra faktorer som kan påverka faktisk avkastning.
              </p>
              {/* <div className="pt-1 text-gray-600 text-xs opacity-75">
                <p>Scroll för navigation • Dra slidern för att zooma data</p>
              </div> */}
            </div>
          </div>
        </div>
        
        <div className="text-center mt-6 pt-4 border-t border-gray-800/20">
          <p className="text-gray-600 text-xs">© 2025</p>
        </div>
      </footer>

      {/* Signup Modal */}
      <SignupModal isOpen={showSignup} onClose={() => setShowSignup(false)} />
    </div>
  )
}

// ================= Scene Component =================
function Scene({stage}:{stage:'aurora'|'particles'}){
  return (
    <AnimatePresence mode="popLayout">
      <motion.div key={stage} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.4}}>
        {stage==='aurora' && <AuroraBG />}
        {stage==='particles' && <ParticlesBG />}
      </motion.div>
    </AnimatePresence>
  )
}

function MetricChip({ label, value }: { label:string; value:string }){
  return (
    <motion.div initial={{ x:-12, opacity:0 }} whileInView={{ x:0, opacity:1 }} viewport={{ once:true }} whileHover={{ scale:1.02, x:2 }} transition={{ type:'spring', stiffness:300, damping:20 }} className="backdrop-blur-md bg-black/20 ring-1 ring-white/10 text-white rounded-lg px-3 py-1.5 text-xs flex items-center gap-2 shadow-sm">
      <span className="text-white/60 font-medium text-[10px] uppercase tracking-wider">{label}</span>
      <span className="font-semibold tabular-nums text-white text-xs">{value}</span>
    </motion.div>
  )
}