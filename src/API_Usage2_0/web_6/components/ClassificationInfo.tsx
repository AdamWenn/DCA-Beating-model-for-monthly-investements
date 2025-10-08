import React from 'react'

export default function ClassificationInfo() {
  return (
    <section className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800/50 rounded-xl p-8 border border-gray-700">
          <h2 className="text-2xl font-bold mb-8 text-center">
            Klassificerare & etiketter
          </h2>
          
          <div className="space-y-6">
            {/* Labels */}
            <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-600">
              <h3 className="text-lg font-semibold text-blue-400 mb-3">Labels:</h3>
              <p className="text-gray-300 leading-relaxed">
                Label 1 när indexet når +10% minst en gång inom 70 handelsdagar utan att falla mer än 
                en tredjedel av målet i motsatt riktning; annars Label 0.
              </p>
            </div>
            
            {/* Estimator */}
            <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-600">
              <h3 className="text-lg font-semibold text-green-400 mb-3">Estimator:</h3>
              <p className="text-gray-300 leading-relaxed">
                <code className="bg-gray-800 px-2 py-1 rounded">imblearn.ensemble.BalancedBaggingClassifier</code> 
                {' '}(parallelliserad med n_jobs=-1).
              </p>
            </div>
            
            {/* Neural Network */}
            <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-600">
              <h3 className="text-lg font-semibold text-purple-400 mb-3">Neuralt nät (MLP):</h3>
              <p className="text-gray-300 leading-relaxed">
                MinMaxScaler → MLP (1 dolt lager = 4× features, ReLU, alpha=0.001, utgång: sigmoid) 
                ⇒ sannolikhet för klass "1".
              </p>
            </div>
            
            {/* Purpose */}
            <div className="bg-blue-900/20 rounded-lg p-6 border border-blue-600/30">
              <h3 className="text-lg font-semibold text-blue-300 mb-3">Syfte:</h3>
              <p className="text-gray-300 leading-relaxed">
                Skatta om förutsättningarna är gynnsamma för ett 70‑dagars mål ("applicability windows").
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}