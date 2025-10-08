import React from 'react'

export default function ModelDescription() {
  return (
    <section className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800/50 rounded-xl p-8 border border-gray-700">
          <h2 className="text-2xl font-bold mb-8 text-center">
            Modellen — dynamiska trendindikatorer
          </h2>
          
          <div className="space-y-6">
            {/* Research Reference */}
            <div className="bg-purple-900/20 rounded-lg p-6 border border-purple-600/30">
              <p className="text-gray-300 leading-relaxed">
                Baserad på <strong className="text-purple-300">Bareket & Pârv (2024)</strong>. 
                Adaptiva indikatorer (EMA, TEMA, MomEma, MomTema, RCTema, RTF och SES→FWD SMA) 
                för medellångsiktiga rörelser (~70 handelsdagar). 
                <strong className="text-purple-300"> Mål: identifiera optimala inträdespunkter.</strong>
              </p>
            </div>
            
            {/* Model Philosophy */}
            <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-600">
              <p className="text-gray-300 leading-relaxed mb-4">
                <strong className="text-green-400">DCA ger stabilitet</strong>; modellen försöker skapa 
                överavkastning i trendfaser. I andra perioder kan DCA vara bättre — i linje med EMH/Random Walk.
              </p>
              <p className="text-gray-300 leading-relaxed">
                Indikatorerna kombineras till signaler för köpfönster.
              </p>
            </div>
            
            {/* Technical Details */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-600/30">
                <h3 className="text-sm font-semibold text-blue-300 mb-2">Adaptiva indikatorer</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• EMA & TEMA</li>
                  <li>• MomEma & MomTema</li>
                  <li>• RCTema</li>
                  <li>• RTF</li>
                  <li>• SES→FWD SMA</li>
                </ul>
              </div>
              
              <div className="bg-green-900/20 rounded-lg p-4 border border-green-600/30">
                <h3 className="text-sm font-semibold text-green-300 mb-2">Tidsperspektiv</h3>
                <p className="text-sm text-gray-300">
                  Medellångsiktiga rörelser över ~70 handelsdagar för optimal inträdespunkt-identifiering.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}