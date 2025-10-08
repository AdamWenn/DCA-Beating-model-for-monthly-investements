// Simple prototype behaviors
(function(){
  const nav = document.querySelector('.nav');
  let lastY = window.scrollY;
  function onScroll(){
    const y = window.scrollY;
    if(y < 16){ nav.classList.remove('show'); return; }
    if(y < lastY - 4){ nav.classList.add('show'); } else if(y > lastY + 8){ nav.classList.remove('show'); }
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, {passive:true});

  // Tooltip
  const tip = document.createElement('div');
  tip.className = 'tooltip';
  tip.style.display = 'none';
  document.body.appendChild(tip);
  function showTip(html, x, y){
    tip.innerHTML = html;
    tip.style.display = 'block';
    tip.style.left = Math.min(x + 14, window.innerWidth - 220) + 'px';
    tip.style.top = (y + 12) + 'px';
  }
  function hideTip(){ tip.style.display = 'none'; }

  // Feature Orbit – lightweight SVG
  const orbitEl = document.getElementById('orbit');
  if(orbitEl){
    const w = orbitEl.clientWidth, h = orbitEl.clientHeight;
    const size = Math.min(w, h) - 40;
    const cx = w/2, cy = h/2;
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS,'svg');
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    orbitEl.appendChild(svg);
    // rings
    [0.25,0.5,0.75].forEach(r=>{
      const c = document.createElementNS(svgNS,'circle');
      c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', (size/2)*r);
      c.setAttribute('fill', 'none'); c.setAttribute('stroke','rgba(255,255,255,0.08)'); c.setAttribute('stroke-dasharray','2 6');
      svg.appendChild(c);
    });
    const label = document.createElement('div');
    label.style.position='absolute'; label.style.left='50%'; label.style.top='50%'; label.style.transform='translate(-50%,-50%)'; label.style.pointerEvents='none';
    label.style.color='var(--muted)'; label.style.fontSize='12px'; label.textContent='Feature Orbit';
    orbitEl.style.position='relative'; orbitEl.appendChild(label);

    const features = [
      {name:'RSI(14)', value: 0.62, prev:0.53, eq:'RSI = 100 - 100/(1+RS)'},
      {name:'EMA(20/50)', value: 0.48, prev:0.42, eq:'EMA(fast)-EMA(slow)'},
      {name:'MACD', value: -0.31, prev:-0.25, eq:'EMA12-EMA26'},
      {name:'ATR%', value: 0.12, prev:0.14, eq:'ATR / Close'},
      {name:'TrendProj', value: 0.71, prev:0.63, eq:'ExpSmooth(indicator,tau)'},
      {name:'ZScore', value: -0.18, prev:-0.05, eq:'(x-μ)/σ'},
      {name:'ROC(10)', value: 0.27, prev:0.21, eq:'(P/P10)-1'},
      {name:'VolRatio', value: -0.44, prev:-0.30, eq:'Vol/Vol(20)'}
    ];
    const maxR = size/2;
    features.forEach((f,i)=>{
      const theta = (i / features.length) * Math.PI*2 - Math.PI/2;
      const r = maxR * (0.4 + Math.min(0.6, Math.abs(f.value)));
      const x = cx + r * Math.cos(theta);
      const y = cy + r * Math.sin(theta);
      const dot = document.createElementNS(svgNS,'circle');
      const radius = 4 + 8 * Math.min(1, Math.abs(f.value));
      dot.setAttribute('cx', x); dot.setAttribute('cy', y); dot.setAttribute('r', radius);
      const delta = (f.value - f.prev);
      let color = 'var(--muted)';
      const th = 0.05; // minimal meaningful change
      if(delta > th) color = 'var(--accentModel)';
      else if(delta < -th) color = 'rgba(243,156,18,0.8)';
      dot.setAttribute('fill', color);
      dot.setAttribute('stroke','rgba(255,255,255,0.15)');
      dot.setAttribute('stroke-width','1');
      dot.style.cursor='pointer';
      dot.addEventListener('mousemove', (e)=>{
        const arrow = delta>0 ? '↑' : (delta<0 ? '↓' : '→');
        showTip(`<div><strong>${f.name}</strong></div><div>Value: ${f.value.toFixed(2)} <span style="color: ${color}; margin-left:6px">${arrow} Δ ${Math.abs(delta).toFixed(2)}</span></div>`, e.clientX, e.clientY);
      });
      dot.addEventListener('mouseleave', hideTip);
      // Override tooltip content with clear ASCII (avoids encoding issues)
      dot.addEventListener('mousemove', (e)=>{
        const arrow2 = delta > 0 ? '+' : (delta < 0 ? '-' : '→');
        const html2 = '<div><strong>'+f.name+'</strong></div>'+
                      '<div>Value: '+f.value.toFixed(2)+' '+
                      '<span style="color:'+color+';margin-left:6px">'+arrow2+' delta '+Math.abs(delta).toFixed(2)+'</span>'+
                      '</div>';
        showTip(html2, e.clientX, e.clientY);
      });
      try{ dot.addEventListener('mouseenter', ()=>{ KPI && KPI.push && KPI.push({type:'orbit_dot_hover', name:f.name}); }); }catch(_){}
      svg.appendChild(dot);
    });
  }

  // Help drawer
  const drawer = document.getElementById('helpDrawer');
  const openBtn = document.getElementById('helpOpen');
  const closeBtn = document.getElementById('helpClose');
  function openDrawer(){ drawer?.classList.add('show'); }
  function closeDrawer(){ drawer?.classList.remove('show'); }
  openBtn?.addEventListener('click', openDrawer);
  closeBtn?.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeDrawer(); });
  drawer?.addEventListener('click', (e)=>{ if(e.target === drawer) closeDrawer(); });
  // Mobile swipe-down to close
  (function(){
    let y0=null, y1=null;
    drawer?.addEventListener('touchstart', (e)=>{ y0 = e.touches[0].clientY; y1 = y0; }, {passive:true});
    drawer?.addEventListener('touchmove', (e)=>{ y1 = e.touches[0].clientY; }, {passive:true});
    drawer?.addEventListener('touchend', ()=>{
      if(y0!=null && y1!=null && (y1 - y0) > 60){ closeDrawer(); }
      y0 = y1 = null;
    });
  })();

  // First‑visit 10s tour tooltip (very light)
  try{
    if(!localStorage.getItem('tourSeen')){
      const n = document.querySelector('[data-tour]');
      if(n){
        const b = n.getBoundingClientRect();
        showTip('<div><strong>Try the Orbit</strong></div><div>Hover dots to see indicators.</div>', b.left+20, b.top+40);
        setTimeout(()=>{ hideTip(); localStorage.setItem('tourSeen','1'); }, 7000);
      }
    }
  }catch(e){}

  // Reveal-on-scroll for story sections
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        e.target.classList.add('visible');
        if(e.target.classList.contains('split')){
          // kick lines in sequence
          const lines = e.target.querySelectorAll('.line');
          lines.forEach((ln,idx)=>{
            ln.style.transitionDelay = (idx*60)+'ms';
          });
        }
      }
    });
  },{threshold:0.24});
  document.querySelectorAll('.reveal, .split').forEach(n=>io.observe(n));
  
  // Clip-reveal and parallax for Home sections
  const ioClip = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        e.target.classList.add('visible');
        e.target.querySelectorAll('.mask-title').forEach(m=>m.classList.add('visible'));
      }
    });
  }, {threshold:0.25});
  document.querySelectorAll('.clip-reveal').forEach(n=>ioClip.observe(n));

  const parallax = document.querySelectorAll('[data-parallax]');
  function onParallax(){
    const h = window.innerHeight;
    parallax.forEach(el=>{
      const r = el.getBoundingClientRect();
      const progress = (h - r.top) / (h + r.height);
      const strength = 24;
      el.style.transform = `translateY(${Math.round((progress-0.5)*strength)}px)`;
    });
  }
  onParallax();
  window.addEventListener('scroll', onParallax, {passive:true});

  // Progress dots highlight
  const dots = Array.from(document.querySelectorAll('.progress a'));
  const sections = ['#s1','#s2','#s3','#s4'].map(id=>document.querySelector(id)).filter(Boolean);
  const ioProg = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        const idx = sections.indexOf(e.target);
        dots.forEach((d,i)=>d.classList.toggle('active', i===idx));
      }
    });
  }, {threshold:0.6});
  sections.forEach(s=>ioProg.observe(s));

  // Compare page animations & KPI
  const cmp = document.getElementById('cmp');
  if(cmp){
    try{ KPI && KPI.startSession && KPI.startSession('compare'); }catch(_){ }
    // Draw lines if decorated
    cmp.querySelectorAll('.line-path').forEach(p=>{
      void p.getTotalLength?.();
      p.style.animationPlayState = 'running';
    });
    // Animate buy window bands
    const bands = document.querySelectorAll('.band');
    requestAnimationFrame(()=>bands.forEach(b=>b.classList.add('show')));
    // KPI: hover sampling
    let lastHover = 0;
    cmp.addEventListener('mousemove', ()=>{
      const t = Date.now();
      if(t - lastHover > 600){ lastHover = t; try{ KPI.push({type:'compare_hover'}); }catch(_){} }
    }, {passive:true});
    // KPI: toggle
    const wToggle = document.getElementById('toggleWindows');
    wToggle?.addEventListener('change', (e)=>{ try{ KPI.push({type:'compare_toggle_windows', value:e.target.checked}); }catch(_){} });
  }
})();
