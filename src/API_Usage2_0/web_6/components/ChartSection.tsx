import React from 'react'

export default function ChartSection() {
  return (
    <section className="py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gray-800/50 rounded-xl p-8 border border-gray-700">
          <h2 className="text-2xl font-bold mb-6 text-center">
            Kapitalutveckling
          </h2>
          <p className="text-gray-300 text-center mb-8">
            Nasdaq Close, Vår modell och DCA över tid.
          </p>
          
          {/* Legend */}
          <div className="flex justify-center gap-8 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-gray-300">Nasdaq Close</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-gray-300">Modell</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded"></div>
              <span className="text-gray-300">DCA</span>
            </div>
          </div>
          
          {/* Chart Placeholder */}
          <div className="bg-gray-900/50 rounded-lg p-16 border-2 border-dashed border-gray-600">
            <p className="text-gray-500 text-xl text-center">
              [ Graf placeholder ]
            </p>
            <div className="mt-8 flex justify-center">
              <div className="w-full max-w-2xl h-64 bg-gray-700/30 rounded flex items-center justify-center">
                <span className="text-gray-600">Chart visualization area</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}