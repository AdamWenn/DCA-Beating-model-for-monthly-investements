import React from 'react'

export default function HeroSection() {
  return (
    <section className="text-center py-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Status Indicator */}
        <div className="inline-flex items-center bg-green-600 text-white px-6 py-2 rounded-full font-bold text-lg mb-4">
          BUY
        </div>
        
        {/* Date */}
        <p className="text-gray-400 mb-6">2025-06-16</p>
        
        {/* Main Title */}
        <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
          Smarter monthly investing — powered by data
        </h1>
        
        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-gray-300 mb-12 leading-relaxed">
          Vår modell anpassar dina månatliga köp efter marknadsläget och förbättrar traditionell DCA. 
          Identifiera köpfönster och få bättre tajming varje månad.
        </p>
        
        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors">
            See Buy Windows
          </button>
          <button className="border border-gray-500 hover:border-gray-400 text-gray-300 hover:text-white px-8 py-3 rounded-lg font-semibold transition-colors">
            Join Monthly Reminder (Upcoming)
          </button>
        </div>
      </div>
    </section>
  )
}