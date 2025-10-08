import React from 'react'
import ImmersiveAurora from '../components/ImmersiveAurora'
import SwedishInvestmentLanding from '../components/SwedishInvestmentLanding'
import SwedishInvestmentImmersive from '../components/SwedishInvestmentImmersive'

export default function App(){
  const view = (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('view') : null) || 'swedish-immersive'
  const Page = view === 'immersive' ? ImmersiveAurora 
             : view === 'landing' ? SwedishInvestmentLanding
             : SwedishInvestmentImmersive
  
  if (typeof window !== 'undefined') {
    console.info('View:', view, '| Switch with ?view=swedish-immersive (default), ?view=landing, or ?view=immersive')
  }
  return (
    <div style={{ minHeight:'100vh', color:'#e5e7eb' }}>
      <Page />
    </div>
  )
}
