import React, { useState } from 'react'

interface Indicator {
  id: string
  name: string
  category: 'Momentum' | 'Trend' | 'Relativ nivå'
  description: string
  formula: string
  color: string
}

const indicators: Indicator[] = [
  {
    id: 'ema',
    name: 'EMA',
    category: 'Trend',
    description: 'Exponential Moving Average - ger mer vikt åt senaste priserna',
    formula: 'EMA = α × Pris + (1-α) × EMA_förra',
    color: 'bg-blue-500'
  },
  {
    id: 'tema',
    name: 'TEMA',
    category: 'Trend',
    description: 'Triple Exponential Moving Average - minskar lag ytterligare',
    formula: 'TEMA = 3×EMA₁ - 3×EMA₂ + EMA₃',
    color: 'bg-blue-600'
  },
  {
    id: 'momema',
    name: 'MomEma',
    category: 'Momentum',
    description: 'Momentum baserat på EMA - mäter förändringshastighet',
    formula: 'MomEma = (EMA_nu - EMA_förra) / EMA_förra',
    color: 'bg-green-500'
  },
  {
    id: 'momtema',
    name: 'MomTema',
    category: 'Momentum',
    description: 'Momentum baserat på TEMA - snabbare momentum-indikator',
    formula: 'MomTema = (TEMA_nu - TEMA_förra) / TEMA_förra',
    color: 'bg-green-600'
  },
  {
    id: 'rctema',
    name: 'RCTema',
    category: 'Relativ nivå',
    description: 'Rate of Change baserat på TEMA',
    formula: 'RCTema = (TEMA_nu - TEMA_n) / TEMA_n × 100',
    color: 'bg-purple-500'
  },
  {
    id: 'rtf',
    name: 'RTF',
    category: 'Trend',
    description: 'Relative Trend Forecast - prognostiserar trendstyrka',
    formula: 'RTF = Σ(vikter × trend_komponenter)',
    color: 'bg-orange-500'
  },
  {
    id: 'ses_fwd',
    name: 'SES → FWD SMA',
    category: 'Trend',
    description: 'Simple Exponential Smoothing till Forward Simple Moving Average',
    formula: 'SES = α × X + (1-α) × SES_förra → SMA_framåt',
    color: 'bg-pink-500'
  }
]

export default function FeatureIndicators() {
  const [selectedIndicator, setSelectedIndicator] = useState<Indicator | null>(null)
  
  const categories = ['Momentum', 'Trend', 'Relativ nivå'] as const
  
  return (
    <section className="py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gray-800/50 rounded-xl p-8 border border-gray-700">
          <h2 className="text-2xl font-bold mb-4 text-center">
            Indikatorer — feature dots
          </h2>
          <p className="text-gray-300 text-center mb-8">
            Klicka för att se nuvärde och formel.
          </p>
          
          {/* Category Sections */}
          <div className="space-y-8">
            {categories.map(category => (
              <div key={category} className="bg-gray-900/50 rounded-lg p-6 border border-gray-600">
                <h3 className="text-lg font-semibold mb-4 text-center text-gray-200">
                  {category}
                </h3>
                
                <div className="flex flex-wrap justify-center gap-4">
                  {indicators
                    .filter(indicator => indicator.category === category)
                    .map(indicator => (
                      <button
                        key={indicator.id}
                        onClick={() => setSelectedIndicator(
                          selectedIndicator?.id === indicator.id ? null : indicator
                        )}
                        className={`
                          ${indicator.color} hover:scale-110 transition-all duration-200
                          w-16 h-16 rounded-full flex items-center justify-center
                          text-white font-bold text-sm shadow-lg
                          ${selectedIndicator?.id === indicator.id ? 'ring-4 ring-white/50' : ''}
                        `}
                      >
                        {indicator.name}
                      </button>
                    ))
                  }
                </div>
              </div>
            ))}
          </div>
          
          {/* All Indicators Placeholder */}
          <div className="mt-8 bg-gray-700/30 rounded-lg p-8 border-2 border-dashed border-gray-600 text-center">
            <p className="text-gray-500 text-lg mb-4">
              [ Alla indikatorer — dots placeholder ]
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-gray-400 text-sm">EMA / TEMA</div>
              <div className="text-gray-400 text-sm">MomEma / MomTema</div>
              <div className="text-gray-400 text-sm">RCTema</div>
              <div className="text-gray-400 text-sm">RTF (Relative Trend Forecast)</div>
              <div className="text-gray-400 text-sm col-span-2 md:col-span-4">SES → FWD SMA</div>
            </div>
          </div>
          
          {/* Selected Indicator Details */}
          {selectedIndicator && (
            <div className="mt-8 bg-gray-900/70 rounded-lg p-6 border border-gray-500 animate-in slide-in-from-bottom-4">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-6 h-6 rounded-full ${selectedIndicator.color}`}></div>
                <h3 className="text-xl font-bold text-white">{selectedIndicator.name}</h3>
                <span className="text-sm text-gray-400 bg-gray-700 px-2 py-1 rounded">
                  {selectedIndicator.category}
                </span>
              </div>
              
              <p className="text-gray-300 mb-4">{selectedIndicator.description}</p>
              
              <div className="bg-gray-800/50 rounded p-3 border border-gray-600">
                <h4 className="text-sm font-semibold text-gray-400 mb-2">Formel:</h4>
                <code className="text-green-400 text-sm">{selectedIndicator.formula}</code>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}