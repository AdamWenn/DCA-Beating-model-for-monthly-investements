import React, { useRef, useEffect, useMemo, useState } from 'react'

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
    <div
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
    </div>
  )
}

interface FeatureOrbitProps {
  className?: string
  size?: number
  csvData?: any[]
}

const FeatureOrbit: React.FC<FeatureOrbitProps> = ({ className = '', size = 520, csvData = [] }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [tooltip, setTooltip] = useState<TooltipProps>({
    feature: null,
    x: 0,
    y: 0,
    visible: false
  })

  // Calculate real feature values from CSV data
  const calculateFeatures = useMemo(() => {
    if (!csvData.length) {
      // Fallback to static values if no data
      return [
        { name: 'RSI', value: 65.2, prev: 62.1, eq: 'RSI(14)', description: 'Relative Strength Index - momentumindikator som mäter hastigheten och förändringen av prisrörelser', category: 'momentum' as const },
        { name: 'MACD', value: 0.032, prev: 0.028, eq: 'MACD(12,26,9)', description: 'Moving Average Convergence Divergence - trend-följande momentumindikator', category: 'momentum' as const },
        { name: 'EMA Ratio', value: 1.025, prev: 1.018, eq: 'EMA(20)/EMA(50)', description: 'Exponential Moving Average ratio - kortvariga till långvariga trendförhållande', category: 'momentum' as const },
        { name: 'PE Ratio', value: 18.5, prev: 19.2, eq: 'Price/Earnings', description: 'Pris-till-vinst-förhållande - värderingsmått för aktier', category: 'standard' as const },
        { name: 'PB Ratio', value: 2.1, prev: 2.3, eq: 'Price/Book', description: 'Pris-till-bokförda värde - värderingsindikator baserad på företagets nettotillgångar', category: 'standard' as const },
        { name: 'ROE', value: 0.142, prev: 0.138, eq: 'Return on Equity', description: 'Avkastning på eget kapital - mäter företagets lönsamhet relativt aktieägarnas kapital', category: 'standard' as const },
        { name: 'Debt/Equity', value: 0.65, prev: 0.68, eq: 'Total Debt/Equity', description: 'Skuldsättningsgrad - förhållandet mellan skulder och eget kapital', category: 'standard' as const },
        { name: 'Current Ratio', value: 1.8, prev: 1.7, eq: 'Current Assets/Liabilities', description: 'Likviditetsgrad - företagets förmåga att betala kortfristiga skulder', category: 'standard' as const },
        { name: 'Beta', value: 1.15, prev: 1.12, eq: 'Market Beta', description: 'Beta-koefficient - mäter volatilitet relativt marknaden', category: 'rtf' as const },
        { name: 'Volatility', value: 0.18, prev: 0.21, eq: 'Annualized Vol', description: 'Årlig volatilitet - mäter prissvängningarnas storlek över tid', category: 'rtf' as const },
        { name: 'Sharpe', value: 1.35, prev: 1.28, eq: 'Risk-adj Return', description: 'Sharpe-kvot - riskjusterad avkastning per volatilitetsenhet', category: 'rtf' as const },
        { name: 'VaR', value: -0.024, prev: -0.028, eq: 'Value at Risk', description: 'Value at Risk - uppskattad maximal förlust under normala marknadsförhållanden', category: 'rtf' as const }
      ]
    }

    // Use simple fallback for now
    return [
      { name: 'RSI', value: 65.2, prev: 62.1, eq: 'RSI(14)', description: 'Relative Strength Index - momentumindikator som mäter hastigheten och förändringen av prisrörelser', category: 'momentum' as const },
      { name: 'MACD', value: 0.032, prev: 0.028, eq: 'MACD(12,26,9)', description: 'Moving Average Convergence Divergence - trend-följande momentumindikator', category: 'momentum' as const },
      { name: 'EMA Ratio', value: 1.025, prev: 1.018, eq: 'EMA(20)/EMA(50)', description: 'Exponential Moving Average ratio - kortvariga till långvariga trendförhållande', category: 'momentum' as const },
      { name: 'PE Ratio', value: 18.5, prev: 19.2, eq: 'Price/Earnings', description: 'Pris-till-vinst-förhållande - värderingsmått för aktier', category: 'standard' as const },
      { name: 'PB Ratio', value: 2.1, prev: 2.3, eq: 'Price/Book', description: 'Pris-till-bokförda värde - värderingsindikator baserad på företagets nettotillgångar', category: 'standard' as const },
      { name: 'ROE', value: 0.142, prev: 0.138, eq: 'Return on Equity', description: 'Avkastning på eget kapital - mäter företagets lönsamhet relativt aktieägarnas kapital', category: 'standard' as const },
      { name: 'Debt/Equity', value: 0.65, prev: 0.68, eq: 'Total Debt/Equity', description: 'Skuldsättningsgrad - förhållandet mellan skulder och eget kapital', category: 'standard' as const },
      { name: 'Current Ratio', value: 1.8, prev: 1.7, eq: 'Current Assets/Liabilities', description: 'Likviditetsgrad - företagets förmåga att betala kortfristiga skulder', category: 'standard' as const },
      { name: 'Beta', value: 1.15, prev: 1.12, eq: 'Market Beta', description: 'Beta-koefficient - mäter volatilitet relativt marknaden', category: 'rtf' as const },
      { name: 'Volatility', value: 0.18, prev: 0.21, eq: 'Annualized Vol', description: 'Årlig volatilitet - mäter prissvängningarnas storlek över tid', category: 'rtf' as const },
      { name: 'Sharpe', value: 1.35, prev: 1.28, eq: 'Risk-adj Return', description: 'Sharpe-kvot - riskjusterad avkastning per volatilitetsenhet', category: 'rtf' as const },
      { name: 'VaR', value: -0.024, prev: -0.028, eq: 'Value at Risk', description: 'Value at Risk - uppskattad maximal förlust under normala marknadsförhållanden', category: 'rtf' as const }
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
        
        // Add tooltip on hover with mouse tracking
        const handleMouseEnter = (e: MouseEvent) => {
          circle.setAttribute('opacity', '1')
          circle.setAttribute('r', (dotSize * 1.2).toString())
          glowCircle.setAttribute('opacity', '0.7')
          
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
          circle.setAttribute('opacity', '0.8')
          circle.setAttribute('r', dotSize.toString())
          glowCircle.setAttribute('opacity', '0.4')
          
          setTooltip(prev => ({ ...prev, visible: false }))
        }
        
        circle.addEventListener('mouseenter', handleMouseEnter)
        circle.addEventListener('mousemove', handleMouseMove)
        circle.addEventListener('mouseleave', handleMouseLeave)
        
        svg.appendChild(circle)
      })
    })
  }, [features, size])

  return (
    <>
      <div 
        ref={containerRef}
        className={`relative ${className}`}
        style={{ height: size }}
        onMouseLeave={() => setTooltip(prev => ({ ...prev, visible: false }))}
      >
        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-xs text-zinc-400 font-medium">Feature Orbit</div>
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

export default FeatureOrbit