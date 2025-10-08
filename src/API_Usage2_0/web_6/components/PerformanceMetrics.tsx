import React from 'react'

export default function PerformanceMetrics() {
  return (
    <section className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800/50 rounded-xl p-8 border border-gray-700">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-green-400 mb-4">
              +1.53% mer avkastning
            </h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              Har sedan xxxx-xx-xx gett +1.53% mer avkastningen än att investera månatligen den 10:e varje månad.
            </p>
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-600">
              <p className="text-sm text-gray-400 font-mono">
                Rel ROI (M/D) = (Modell − DCA) / DCA = +1.53%
              </p>
            </div>
          </div>
          
          {/* Feature Orbit Graphic Placeholder */}
          <div className="mt-8 text-center">
            <div className="bg-gray-700/30 rounded-lg p-12 border-2 border-dashed border-gray-600">
              <p className="text-gray-500 text-lg">
                [ Feature Orbit Graphic Placeholder ]
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}