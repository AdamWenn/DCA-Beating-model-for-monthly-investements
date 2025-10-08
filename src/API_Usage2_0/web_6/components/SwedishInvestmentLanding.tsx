import React from 'react'
import HeroSection from './HeroSection'
import PerformanceMetrics from './PerformanceMetrics'
import ChartSection from './ChartSection'
import ClassificationInfo from './ClassificationInfo'
import ModelDescription from './ModelDescription'
import FeatureIndicators from './FeatureIndicators'
import SubscriptionSection from './SubscriptionSection'

export default function SwedishInvestmentLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-gray-100">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-pink-900/20 pointer-events-none"></div>
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent pointer-events-none"></div>
      
      {/* Content */}
      <div className="relative z-10">
        <HeroSection />
        <PerformanceMetrics />
        <ChartSection />
        <ClassificationInfo />
        <ModelDescription />
        <FeatureIndicators />
        <SubscriptionSection />
        
        {/* Footer */}
        <footer className="py-8 px-4 text-center border-t border-gray-700">
          <div className="max-w-4xl mx-auto">
            <p className="text-gray-500 text-sm">
              © 2025. Wireframe (startup‑stil).
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}