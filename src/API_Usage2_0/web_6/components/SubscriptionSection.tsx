import React from 'react'

export default function SubscriptionSection() {
  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-xl p-8 border border-blue-600/30">
          <h2 className="text-2xl font-bold mb-6 text-center">
            Prenumeration — steg för steg (kommer snart)
          </h2>
          
          <p className="text-gray-300 text-center mb-8 leading-relaxed">
            Gör det enkelt: ett steg i taget så det känns lätt att komma igång.
          </p>
          
          {/* Steps Preview */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-600 text-center">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold">
                1
              </div>
              <h3 className="font-semibold text-white mb-2">Registrera</h3>
              <p className="text-sm text-gray-400">Ange din e-post för månadsrapporter</p>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-600 text-center">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold">
                2
              </div>
              <h3 className="font-semibold text-white mb-2">Konfigurera</h3>
              <p className="text-sm text-gray-400">Välj dina investeringspreferenser</p>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-600 text-center">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold">
                3
              </div>
              <h3 className="font-semibold text-white mb-2">Få signaler</h3>
              <p className="text-sm text-gray-400">Månatliga köprekommendationer</p>
            </div>
          </div>
          
          {/* CTA */}
          <div className="text-center">
            <button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg">
              Jag vill ha en månads‑påminnelse
            </button>
            
            <p className="text-sm text-gray-400 mt-4">
              Ingen kostnad. Avsluta när som helst.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}