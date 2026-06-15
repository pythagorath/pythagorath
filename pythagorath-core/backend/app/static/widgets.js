// ============================================================================
// Shared widget layer — the SEVEN structurally-distinct interactive widgets.
// Extracted verbatim so BOTH the child app (index.html) and the admin preview
// (admin.html) render a question identically. A widget turns a VISUAL interaction
// into the answer string; the gate is blind to how it was produced.
// (Logic unchanged from the original inline version — relocation only.)
// ============================================================================
const FAM_AR = { aggregative:"تجميعية", magnitude:"مقدارية", decompositional:"تفكيكية", sequential:"تسلسلية" };
const toHindi = n => String(n).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);

function mountWidget(host, q, onAnswer){
  const v=q.visual;
  if(v.kind==='number-line') return widgetNumberLine(host, v, onAnswer);
  if(v.kind==='ten-frame')   return widgetTenFrame(host, v, onAnswer);
  if(v.kind==='decomposition') return widgetDecomp(host, v, onAnswer);
  if(v.kind==='base-ten-blocks') return widgetBaseTen(host, v, onAnswer);
  if(v.kind==='subtract-blocks') return widgetSubtractBlocks(host, v, onAnswer);
  if(v.kind==='sequence') return widgetSequence(host, v, onAnswer);
  if(v.kind==='regroup-blocks') return widgetRegroupBlocks(host, v, onAnswer);
  // ---- geometry widgets (batch 2; isolated like the seven — emit an answer string,
  // the gate is blind to the geometry) ----
  if(v.kind==='shape-pick') return widgetShapePick(host, v, onAnswer);
  if(v.kind==='element-count') return widgetElementCount(host, v, onAnswer);
  if(v.kind==='shape-compose') return widgetShapeCompose(host, v, onAnswer);
  // ---- multiplication / division widgets (batch 3) ----
  if(v.kind==='groups') return widgetGroups(host, v, onAnswer);
  if(v.kind==='array') return widgetArray(host, v, onAnswer);
  // ---- data & probability widgets (batch 4) ----
  if(v.kind==='chart') return widgetChart(host, v, onAnswer);
  if(v.kind==='likelihood') return widgetLikelihood(host, v, onAnswer);
  // ---- measurement widgets (batch 5) ----
  if(v.kind==='measure') return widgetMeasure(host, v, onAnswer);
  if(v.kind==='clock') return widgetClock(host, v, onAnswer);
  if(v.kind==='money') return widgetMoney(host, v, onAnswer);
  // ---- patterns widget (batch 6) ----
  if(v.kind==='pattern') return widgetPattern(host, v, onAnswer);
  // ---- G1 pre-number widgets (G1 batch 6) ----
  if(v.kind==='position-scene') return widgetPositionScene(host, v, onAnswer);
  if(v.kind==='sort-bins') return widgetSortBins(host, v, onAnswer);
  // ---- fractions widget (S2 batch-2) ----
  if(v.kind==='fraction') return widgetFraction(host, v, onAnswer);
  // ---- coordinate grid (G3 batch 9) — the ONLY new G3 widget ----
  if(v.kind==='coord-grid') return widgetCoordGrid(host, v, onAnswer);
}

// COORDINATE GRID — the ordered pair (Bahrain ch12-7), the one genuinely new G3
// behaviour with no fleet analog. PLOT: tap the intersection at the target pair →
// emits «(س، ص)». READ: a point is drawn; pick its coordinate string. Isolated
// like the rest — the gate grades the emitted STRING, blind to the grid.
function widgetCoordGrid(host, v, onAnswer){
  const N=v.max||6, NS='http://www.w3.org/2000/svg', pad=22, step=34;
  const W=pad*2+N*step;
  const pt=(s)=>`(${toHindi(s[0])}، ${toHindi(s[1])})`;   // «(٣، ٢)» — x then y
  const X=i=>pad+i*step, Y=j=>W-pad-j*step;               // y grows UPWARD
  const svg=document.createElementNS(NS,'svg'); svg.setAttribute('viewBox',`0 0 ${W} ${W}`);
  svg.setAttribute('width','280'); svg.style.cssText='max-width:92vw;display:block;margin:6px auto';
  for(let i=0;i<=N;i++){                                  // gridlines + axis labels
    const vline=document.createElementNS(NS,'line'); vline.setAttribute('x1',X(i)); vline.setAttribute('y1',Y(0));
    vline.setAttribute('x2',X(i)); vline.setAttribute('y2',Y(N)); vline.setAttribute('style','stroke:#cfe6f5;stroke-width:1'); svg.appendChild(vline);
    const hline=document.createElementNS(NS,'line'); hline.setAttribute('x1',X(0)); hline.setAttribute('y1',Y(i));
    hline.setAttribute('x2',X(N)); hline.setAttribute('y2',Y(i)); hline.setAttribute('style','stroke:#cfe6f5;stroke-width:1'); svg.appendChild(hline);
    const lx=document.createElementNS(NS,'text'); lx.setAttribute('x',X(i)); lx.setAttribute('y',Y(0)+15);
    lx.setAttribute('text-anchor','middle'); lx.setAttribute('style','font-size:11px;fill:#155E7D'); lx.textContent=toHindi(i); svg.appendChild(lx);
    if(i>0){ const ly=document.createElementNS(NS,'text'); ly.setAttribute('x',X(0)-12); ly.setAttribute('y',Y(i)+4);
      ly.setAttribute('text-anchor','middle'); ly.setAttribute('style','font-size:11px;fill:#155E7D'); ly.textContent=toHindi(i); svg.appendChild(ly); }
  }
  // bold axes
  [[X(0),Y(0),X(N),Y(0)],[X(0),Y(0),X(0),Y(N)]].forEach(c=>{ const a=document.createElementNS(NS,'line');
    a.setAttribute('x1',c[0]); a.setAttribute('y1',c[1]); a.setAttribute('x2',c[2]); a.setAttribute('y2',c[3]);
    a.setAttribute('style','stroke:#155E7D;stroke-width:2'); svg.appendChild(a); });
  host.appendChild(svg);
  const info=document.createElement('div'); info.className='muted'; info.style='text-align:center';
  if(v.mode==='read'){                                   // a point is shown → pick its pair
    const dot=document.createElementNS(NS,'circle'); dot.setAttribute('cx',X(v.point[0])); dot.setAttribute('cy',Y(v.point[1]));
    dot.setAttribute('r',6); dot.setAttribute('style','fill:#F39A1F;stroke:#9c5e07;stroke-width:1.5'); svg.appendChild(dot);
    info.textContent='ما إحداثيا النقطة المعلَّمة؟'; host.appendChild(info);
    const opts=document.createElement('div'); opts.style='display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:6px';
    v.options.forEach(o=>{ const b=document.createElement('button'); b.className='sec'; b.style='font-weight:800'; b.textContent=o;
      b.onclick=()=>{ info.textContent='اخترت: '+o; onAnswer(o); }; opts.appendChild(b); });
    host.appendChild(opts); return;
  }
  // PLOT: tap the intersection
  info.textContent='انقر التقاطع المطلوب على الشبكة.'; host.appendChild(info);
  let marker=null;
  for(let i=0;i<=N;i++) for(let j=0;j<=N;j++){
    const hit=document.createElementNS(NS,'circle'); hit.setAttribute('cx',X(i)); hit.setAttribute('cy',Y(j));
    hit.setAttribute('r',9); hit.setAttribute('style','fill:transparent;cursor:pointer');
    hit.onclick=()=>{ if(marker) svg.removeChild(marker);
      marker=document.createElementNS(NS,'circle'); marker.setAttribute('cx',X(i)); marker.setAttribute('cy',Y(j));
      marker.setAttribute('r',6); marker.setAttribute('style','fill:#29A9E0;stroke:#155E7D;stroke-width:1.5'); svg.appendChild(marker);
      info.textContent='النقطة: '+pt([i,j]); onAnswer(pt([i,j])); };
    svg.appendChild(hit);
  }
}

// FRACTIONS — a fraction of a REGION (a bar split into equal parts). Isolated like the
// rest: it emits the fraction STRING «م/ن» (or, in compare, the larger fraction); the gate
// grades that string, blind to the visual. Three modes — two GENUINELY distinct acts on the
// SAME representation (recognise vs produce), plus comparison:
//   * name    — read a pre-shaded bar → PICK its fraction (recognition; family «تسمية»)
//   * shade   — shade k of n parts to PRODUCE a target fraction (production; family «تجزئة»)
//   * compare — two bars → click the LARGER fraction (family «مقارنة», its own node)
function widgetFraction(host, v, onAnswer){
  const mk=(tag,cls)=>{ const e=document.createElement(tag); if(cls) e.className=cls; return e; };
  const bar=(parts, shadedCount, clickable, onToggle)=>{
    const b=mk('div','frac-bar'); const on=new Set();
    for(let i=0;i<shadedCount;i++) on.add(i);
    for(let i=0;i<parts;i++){
      const s=mk('div','frac-seg'); if(on.has(i)) s.classList.add('on');
      if(clickable){ s.dataset.i=i; s.onclick=()=>onToggle(i, s); }
      b.appendChild(s);
    }
    return b;
  };
  if(v.mode==='judge'){
    // G1 (g1HALF «الحكم بالتساوي») — the bar's segments take UNEQUAL widths from
    // v.widths (flex proportions), so the child SEES the inequality and judges it.
    // The stock bar always draws equal segments — useless for this act.
    const b=mk('div','frac-bar');
    v.widths.forEach(w=>{ const s=mk('div','frac-seg'); s.style.flexGrow=w; b.appendChild(s); });
    host.appendChild(b);
    const info=mk('div','muted'); info.textContent='انظر إلى الأجزاء ثم احكم.'; host.appendChild(info);
    const opts=mk('div','btb-controls');
    for(const o of ['متساوية','غير متساوية']){ const btn=mk('button','sec'); btn.textContent=o;
      btn.onclick=()=>onAnswer(o); opts.appendChild(btn); }
    host.appendChild(opts); return;
  }
  if(v.mode==='name'){
    host.appendChild(bar(v.parts, v.shaded, false));
    const info=mk('div','muted'); info.textContent='ما الكسر الملوّن؟ انقر الإجابة.'; host.appendChild(info);
    const opts=mk('div','btb-controls');
    for(const o of v.options){ const btn=mk('button','sec'); btn.textContent=o; btn.style.fontSize='20px';
      btn.onclick=()=>onAnswer(o); opts.appendChild(btn); }
    host.appendChild(opts); return;
  }
  if(v.mode==='shade'){
    const info=mk('div','muted'); info.textContent=`ظلِّل ${toHindi(v.target)} من ${toHindi(v.parts)} أجزاء متساوية (انقر الأجزاء).`;
    host.appendChild(info);
    let count=0; const cnt=mk('div'); cnt.style='font-weight:800;margin:6px';
    const upd=()=>cnt.textContent=`الملوّن: ${toHindi(count)} / ${toHindi(v.parts)}`;
    const b=bar(v.parts, 0, true, (i,s)=>{ if(s.classList.contains('on')){ s.classList.remove('on'); count--; }
      else { s.classList.add('on'); count++; } upd(); });
    host.appendChild(b); host.appendChild(cnt);
    const ok=mk('button'); ok.textContent='تأكيد'; ok.onclick=()=>onAnswer(toHindi(count)+'/'+toHindi(v.parts));
    host.appendChild(ok); upd(); return;
  }
  if(v.mode==='grid'){
    // g3DEC (batch 7 extension, owner-approved): the DECIMAL grid — 10 columns
    // (tenths) or 10×10 (hundredths) with the first `shaded` cells filled; the
    // child reads the shading and PICKS the matching form (options, like 'name').
    // Display-only drawing: the gate stays blind, grading the picked string.
    const rows=v.rows||1, cols=v.cols||10;
    const g=mk('div'); g.style=`display:grid;grid-template-columns:repeat(${cols},1fr);gap:1px;`+
      `width:min(92vw,300px);aspect-ratio:${cols}/${rows};border:2px solid #155E7D;border-radius:6px;overflow:hidden;direction:ltr`;
    for(let i=0;i<rows*cols;i++){
      const c=mk('div'); c.style='background:'+(i<v.shaded?'#29A9E0':'#F3FbFe');
      g.appendChild(c);
    }
    host.appendChild(g);
    const info=mk('div','muted');
    info.textContent=`الملوّن ${toHindi(v.shaded)} من ${toHindi(rows*cols)} — انقر الصورة المطابقة.`;
    host.appendChild(info);
    const opts=mk('div','btb-controls');
    for(const o of v.options){ const btn=mk('button','sec'); btn.textContent=o; btn.style.fontSize='20px';
      btn.onclick=()=>onAnswer(o); opts.appendChild(btn); }
    host.appendChild(opts); return;
  }
  if(v.mode==='compare'){
    const info=mk('div','muted'); info.textContent='انقر الكسر الأكبر.'; host.appendChild(info);
    const row=mk('div'); row.style='display:flex;gap:18px;flex-wrap:wrap;align-items:flex-start';
    for(const fr of [v.a, v.b]){
      const wrap=mk('div'); wrap.style='cursor:pointer;text-align:center;width:150px';
      const b=bar(fr.parts, fr.shaded, false); b.style.width='100%'; b.style.maxWidth='none';
      wrap.appendChild(b);
      const t=mk('div'); t.style='font-size:20px;font-weight:800;margin-top:4px';
      t.textContent=toHindi(fr.shaded)+'/'+toHindi(fr.parts); wrap.appendChild(t);
      wrap.onclick=()=>onAnswer(toHindi(fr.shaded)+'/'+toHindi(fr.parts));
      row.appendChild(wrap);
    }
    host.appendChild(row); return;
  }
}

// REGROUP / UNITISE — the SAME quantity, grouped differently. Open a rod (ten →
// 10 ones) or bundle ten loose cubes (10 ones → a rod). The VALUE never changes —
// shown in a prominent banner — only the composition does. THE insight of B1
// (non-standard regroup) and C3 (unitising). Distinct from build (base-ten) and
// take-away (subtract-blocks): nothing is added or removed, only re-grouped.
function widgetRegroupBlocks(host, v, onAnswer){
  let rods=v.rods, cubes=v.cubes;
  const banner=document.createElement('div');
  banner.style='background:var(--cyan-l,#E4F3FB);color:var(--cyan-d,#1B7FB0);font-weight:800;padding:10px;border-radius:10px;text-align:center;margin:6px 0;font-size:18px;';
  const info=document.createElement('div'); info.className='muted';
  const area=document.createElement('div'); area.className='btb-area';
  const rodsBox=document.createElement('div'); rodsBox.className='btb-rods';
  const cubesBox=document.createElement('div'); cubesBox.className='btb-cubes';
  area.appendChild(rodsBox); area.appendChild(cubesBox);
  function draw(){
    rodsBox.innerHTML=''; for(let i=0;i<rods;i++){ const r=document.createElement('div'); r.className='rod'; rodsBox.appendChild(r); }
    cubesBox.innerHTML=''; for(let i=0;i<cubes;i++){ const c=document.createElement('div'); c.className='cube'; cubesBox.appendChild(c); }
    info.innerHTML=`قضبان: <b>${toHindi(rods)}</b> · آحاد مفردة: <b>${toHindi(cubes)}</b>`;
    banner.innerHTML=`القيمة: <b>${toHindi(rods*10+cubes)}</b> — لا تتغيّر مهما أعدتَ التجميع ✓`;
  }
  const ctrl=document.createElement('div'); ctrl.className='btb-controls';
  const open=document.createElement('button'); open.className='sec'; open.textContent='افتح قضيباً (→ ١٠ آحاد)';
  open.onclick=()=>{ if(rods>0){ rods--; cubes+=10; draw(); } };
  const bundle=document.createElement('button'); bundle.className='sec'; bundle.textContent='اربط ١٠ آحاد (→ قضيب)';
  bundle.onclick=()=>{ if(cubes>=10){ cubes-=10; rods++; draw(); } };
  ctrl.appendChild(open); ctrl.appendChild(bundle);
  const ok=document.createElement('button');
  ok.textContent = v.ask==='tens' ? 'تأكيد عدد القضبان' : 'تأكيد عدد الآحاد';
  ok.onclick=()=>onAnswer(v.ask==='tens' ? rods : cubes);
  ctrl.appendChild(ok);
  host.appendChild(banner); host.appendChild(ctrl); host.appendChild(area); host.appendChild(info); draw();
}

// SEQUENTIAL — CONTINUE a regular progression: read the constant step between the
// shown terms and produce the NEXT term. A relational/pattern act, distinct from
// number-line's locate-an-absolute-position. The child INFERS the step (no auto
// "+step" button) and applies it via the adjust buttons. (Per ق٤, the counting
// number line IS the sequence spatialised — so this track is that representation.)
function widgetSequence(host, v, onAnswer){
  const terms=v.terms.slice();
  let val=terms[terms.length-1];   // [?] starts at the last shown term
  const hint=document.createElement('div'); hint.className='muted';
  hint.textContent='اقرأ النمط بين البطاقات، واضبط الحدّ التالي.';
  const track=document.createElement('div'); track.className='seqtrack';
  function draw(){
    track.innerHTML='';
    terms.forEach(t=>{ const c=document.createElement('div'); c.className='seqcard'; c.textContent=toHindi(t); track.appendChild(c); });
    const q=document.createElement('div'); q.className='seqcard seqq'; q.textContent=toHindi(val); track.appendChild(q);
  }
  draw();
  const ctrl=document.createElement('div'); ctrl.className='btb-controls';
  const mk=(label,d)=>{ const b=document.createElement('button'); b.className='sec'; b.textContent=label; b.onclick=()=>{ val+=d; draw(); }; return b; };
  // ±١٠٠ controls appear only for hundreds-scale sequences (C4 count-by-100) — 2-digit unchanged.
  if(Math.max(...terms) >= 100){ ctrl.appendChild(mk('+١٠٠',100)); }
  ctrl.appendChild(mk('+١٠',10)); ctrl.appendChild(mk('+١',1)); ctrl.appendChild(mk('−١',-1)); ctrl.appendChild(mk('−١٠',-10));
  if(Math.max(...terms) >= 100){ ctrl.appendChild(mk('−١٠٠',-100)); }
  const ok=document.createElement('button'); ok.textContent='تأكيد التالي'; ok.onclick=()=>onAnswer(val); ctrl.appendChild(ok);
  host.appendChild(hint); host.appendChild(track); host.appendChild(ctrl);
}

// MAGNITUDE — locate a position on a magnitude scale (where does it sit).
// Supports `step` (decade ticks 0..100), an optional start marker, and a
// backward jump (`back`) for subtraction (move LEFT and locate the landing).
function widgetNumberLine(host, v, onAnswer){
  // g3FRLINE (batch 7 extension, owner-approved): FRACTION ticks. With v.den the
  // line runs 0 → maxWhole in steps of 1/den; each tick emits its fraction label
  // («٣/٤», «٥/٤» — improper above one, the enVision register). Placement is the
  // ACT (a fraction IS a number) — the gate grades the emitted string, blind.
  if(v.den){
    const den=v.den, maxW=v.maxWhole||1, dec=!!v.dec;
    // g4DECLINE (batch-5 extension, owner-approved + visually checked): DECIMAL labels
    // on the SAME tenths geometry (v.dec), plus a READ mode (v.mark highlights one tick
    // with ◆ and v.options are picked). When v.dec/v.mark are absent the fraction line
    // (g3FRLINE/g4FRAC) is byte-identical to before.
    const decLabel=(i)=>{ const w=Math.floor(i/den), f=i%den;     // den=10 → tenths
      return f===0 ? toHindi(w) : toHindi(w)+'٫'+toHindi(f); };
    const label=(i)=> i===0 ? '٠' : dec ? decLabel(i) : (toHindi(i)+'/'+toHindi(den));
    const read = (v.mark!=null && Array.isArray(v.options));
    const hint=document.createElement('div'); hint.className='muted';
    hint.textContent= read ? 'اقرأ موضع العلامة ◆ على الخطّ واختر العدد العشري.'
                     : (dec ? 'انقر موضع العدد العشري على الخطّ.' : 'انقر موضع الكسر على الخطّ.');
    const line=document.createElement('div'); line.className='nline';
    for(let i=0;i<=den*maxW;i++){
      const t=document.createElement('button'); t.className='tick'; t.style.fontSize='12px';
      if(read){
        // read mode: label only the endpoints; mark the queried tick with ◆; ticks inert
        t.textContent = (i===0 || i===den*maxW) ? label(i) : (i===v.mark ? '◆' : '');
        if(i===v.mark) t.classList.add('sel');
        t.disabled = true;
      } else {
        t.textContent = label(i);
        t.onclick=()=>{ line.querySelectorAll('.tick').forEach(x=>x.classList.remove('sel'));
          t.classList.add('sel'); onAnswer(t.textContent); };
      }
      line.appendChild(t);
    }
    host.appendChild(hint); host.appendChild(line);
    if(read){
      const opts=document.createElement('div'); opts.className='btb-controls';
      for(const o of v.options){ const b=document.createElement('button'); b.className='sec';
        b.textContent=o; b.style.fontSize='20px'; b.onclick=()=>onAnswer(o); opts.appendChild(b); }
      host.appendChild(opts);
    }
    return;
  }
  const step=v.step||1;
  // ---- phone-first WINDOWING (display only) ----
  // Draw a TIGHT window around the problem's own numbers (start, landing, target)
  // with a little context margin — never the full authored span. The correct answer
  // (the landing, or the located decade) always lies inside the window. This narrows
  // what is DRAWN, not what is graded: the emitted value is unchanged.
  const pts=[];
  if(v.start!=null) pts.push(v.start);
  if(v.start!=null && v.jump!=null) pts.push(v.back ? v.start - v.jump : v.start + v.jump);
  if(v.target!=null) pts.push(v.target);
  let lo, hi;
  if(pts.length){ lo=Math.min(...pts); hi=Math.max(...pts); } else { lo=v.min; hi=v.max; }
  const margin=2*step;
  lo -= margin; hi += margin;
  // snap to the step grid (aligned to authored min), clamp to authored bounds
  lo = v.min + Math.floor((lo - v.min)/step)*step;
  hi = v.min + Math.ceil((hi - v.min)/step)*step;
  lo = Math.max(lo, v.min); hi = Math.min(hi, v.max);

  // ---- WIDE JUMP → DECADE-SCALED line (display only) ----
  // A big jump (e.g. 56−24) on a UNIT line needs dozens of ticks → overflows a phone.
  // For these, mark the line by TENS (≤ ~9 ticks, fits) and let the child jump by tens
  // THEN ones to land EXACTLY on the answer (the magnitude-faithful way to traverse
  // large numbers). The question and the graded answer are unchanged.
  if(step===1 && v.jump!=null && ((hi-lo)/step + 1) > 18){
    const land = v.back ? v.start - v.jump : v.start + v.jump;
    const p0=Math.min(v.start,land), p1=Math.max(v.start,land);
    let dlo=Math.floor(p0/10)*10 - 10, dhi=Math.ceil(p1/10)*10 + 10;
    dlo=Math.max(dlo, v.min!=null?v.min:0, 0);
    if(v.max!=null) dhi=Math.min(dhi, v.max);
    return decadeJumpLine(host, v, onAnswer, dlo, dhi);
  }

  const dir = v.back ? 'للخلف' : 'للأمام';
  const hint=document.createElement('div'); hint.className='muted';
  hint.textContent=(v.start!=null && v.jump!=null)
    ? `🟢 ابدأ من ${toHindi(v.start)} — اقفز ${toHindi(v.jump)} ${dir}، وانقر موضع وصولك.`
    : `انقر الإجابة على الخطّ.`;
  const line=document.createElement('div'); line.className='nline';
  const ticks=[];
  for(let n=lo;n<=hi;n+=step){
    const t=document.createElement('button'); t.className='tick'; t.textContent=toHindi(n);
    if(n===v.start) t.classList.add('start');
    t.onclick=()=>{ line.querySelectorAll('.tick').forEach(x=>x.classList.remove('sel')); t.classList.add('sel'); onAnswer(n); };
    line.appendChild(t); ticks.push(t);
  }
  // LARGE-MAGNITUDE labels (G4 millions rounding: ٣٠٠٠٠٠٠/٤٠٠٠٠٠٠) clip at the 46px
  // tick cap. Rounding localises to ~2 ticks, so let the long ones grow and shrink the
  // font — 6–7 Arabic-Indic digits stay legible. ≤4-digit lines (G1/G2/G3) are untouched.
  const maxLen=Math.max(...ticks.map(t=>t.textContent.length));
  if(maxLen>=5){ ticks.forEach(t=>{ t.style.maxWidth='none'; t.style.fontSize='12px'; t.style.padding='8px 6px'; }); }
  host.appendChild(hint); host.appendChild(line);
}

// Decade-scaled jump line: ticks every TEN (fits a phone), a green start marker and
// an orange movable marker. The child steps ±١٠ / ±١ to jump by tens then ones and
// land EXACTLY on the answer (tracked as a precise integer, so grading is exact —
// no between-tick guessing). Used only for wide jumps; emits the marker's value.
function decadeJumpLine(host, v, onAnswer, lo, hi){
  const span=Math.max(10, hi-lo);
  const dir=v.back ? 'للخلف' : 'للأمام';
  let value=v.start;
  const hint=document.createElement('div'); hint.className='muted';
  hint.textContent=`🟢 ابدأ من ${toHindi(v.start)} — اقفز ${toHindi(v.jump)} ${dir} (بالعشرات ثم الآحاد) وحدّد موضعك.`;
  const valueLbl=document.createElement('div');
  valueLbl.style='text-align:center;font-size:22px;font-weight:800;color:var(--orange-d,#D97E0A);margin:6px 0;';
  const track=document.createElement('div');
  track.style='position:relative;height:30px;margin:24px 14px 30px;border-bottom:3px solid var(--cyan-2,#CBE9F7);';
  for(let d=lo; d<=hi; d+=10){
    const x=((d-lo)/span)*100;
    const tk=document.createElement('div');
    tk.style=`position:absolute;left:${x}%;bottom:0;transform:translateX(-50%);text-align:center;`;
    tk.innerHTML=`<div style="width:2px;height:12px;background:var(--cyan-2,#CBE9F7);margin:0 auto"></div><div style="font-size:12px;color:#5A6772;font-weight:700">${toHindi(d)}</div>`;
    track.appendChild(tk);
  }
  const sx=((v.start-lo)/span)*100;
  const sm=document.createElement('div');
  sm.style=`position:absolute;left:${sx}%;bottom:2px;transform:translateX(-50%);color:var(--cyan,#29A9E0);font-size:16px;`;
  sm.textContent='▲'; sm.title='البداية';
  track.appendChild(sm);
  const mk=document.createElement('div');
  mk.style=`position:absolute;bottom:2px;transform:translateX(-50%);color:var(--orange,#F39A1F);font-size:22px;transition:left .15s;`;
  mk.textContent='●';
  track.appendChild(mk);
  function upd(){ mk.style.left=((value-lo)/span)*100+'%'; valueLbl.textContent='موضعك: '+toHindi(value); }
  const ctrl=document.createElement('div'); ctrl.className='btb-controls'; ctrl.style.justifyContent='center';
  const b=(label,d)=>{ const x=document.createElement('button'); x.className='sec'; x.textContent=label;
    x.onclick=()=>{ value=Math.max(lo,Math.min(hi,value+d)); upd(); }; return x; };
  ctrl.appendChild(b('+١٠',10)); ctrl.appendChild(b('+١',1)); ctrl.appendChild(b('−١',-1)); ctrl.appendChild(b('−١٠',-10));
  const ok=document.createElement('button'); ok.textContent='تأكيد الموضع'; ok.onclick=()=>onAnswer(value);
  host.appendChild(hint); host.appendChild(valueLbl); host.appendChild(track); host.appendChild(ctrl); host.appendChild(ok);
  upd();
}

// AGGREGATIVE (place value) — UNITISE: build the number from tens-rods + ones-cubes.
// The child BUILDS (adds blocks, value forms live); the answer is the total VALUE
// (rods*10 + cubes), never the rod count. A different mental act from the ten-frame
// (which completes a single ten) — here ten is a UNIT you bundle.
function widgetBaseTen(host, v, onAnswer){
  // optional `start` pre-fills a first addend; the child then ADDS the rest (B4 combine).
  // `carry:true` (A1) enables the CARRY: ones may pile past 9, and a BUNDLE action
  // exchanges ten loose ones for a rod — the carry made physical. Without `carry`
  // (C1/C4/B4) the behaviour is unchanged (ones cap at 9, no bundle button).
  // HUNDREDS (C5/A3): when any total reaches ≥١٠٠ a FLATS column appears (١٠ قضبان =
  // لوح مئة) and carry chains rods→flat too. Below ١٠٠ the flats UI never renders, so
  // every 2-digit item is byte-identical to before.
  const cap = (v.target!=null ? v.target : ((v.start||0)+(v.add||0)));
  const H = cap>=100 || (v.start||0)>=100;
  let flats=Math.floor((v.start||0)/100), rods=Math.floor(((v.start||0)%100)/10), cubes=(v.start||0)%10;
  const maxCubes = v.carry ? 18 : 9;
  const maxRods  = (v.carry && H) ? 18 : 9;
  const val=()=>flats*100+rods*10+cubes;
  const info=document.createElement('div'); info.className='muted';
  const area=document.createElement('div'); area.className='btb-area';
  const flatsBox=document.createElement('div'); flatsBox.className='btb-flats';
  const rodsBox=document.createElement('div'); rodsBox.className='btb-rods';
  const cubesBox=document.createElement('div'); cubesBox.className='btb-cubes';
  if(H) area.appendChild(flatsBox);
  area.appendChild(rodsBox); area.appendChild(cubesBox);
  function draw(){
    if(H){ flatsBox.innerHTML=''; for(let i=0;i<flats;i++){ const f=document.createElement('div'); f.className='flat'; flatsBox.appendChild(f); } }
    rodsBox.innerHTML=''; for(let i=0;i<rods;i++){ const r=document.createElement('div'); r.className='rod'; rodsBox.appendChild(r); }
    cubesBox.innerHTML=''; for(let i=0;i<cubes;i++){ const c=document.createElement('div'); c.className='cube'; cubesBox.appendChild(c); }
    let txt=(H?`ألواح: ${toHindi(flats)} (=${toHindi(flats*100)}) · `:'')
      +`قضبان: ${toHindi(rods)} (=${toHindi(rods*10)}) · مكعّبات: ${toHindi(cubes)} — القيمة الآن ${toHindi(val())}`;
    if(v.carry && cubes>=10) txt += ' — ⚠ اكتملت عشرة آحاد: اربطها في قضيب (هذا هو الحمل).';
    if(v.carry && H && rods>=10) txt += ' — ⚠ اكتملت عشرة قضبان: اربطها في لوح مئة.';
    info.textContent=txt;
  }
  const ctrl=document.createElement('div'); ctrl.className='btb-controls';
  const mk=(label,fn)=>{ const b=document.createElement('button'); b.className='sec'; b.textContent=label; b.onclick=()=>{fn();draw();}; return b; };
  if(H) ctrl.appendChild(mk('+ لوح مئة', ()=>{ if(flats<9) flats++; }));
  ctrl.appendChild(mk('+ قضيب عشرة', ()=>{ if(rods<maxRods) rods++; }));
  ctrl.appendChild(mk('+ مكعّب آحاد', ()=>{ if(cubes<maxCubes) cubes++; }));
  if(H) ctrl.appendChild(mk('− لوح', ()=>{ if(flats>0) flats--; }));
  ctrl.appendChild(mk('− قضيب', ()=>{ if(rods>0) rods--; }));
  ctrl.appendChild(mk('− مكعّب', ()=>{ if(cubes>0) cubes--; }));
  if(v.carry) ctrl.appendChild(mk('اربط ١٠ آحاد (→ قضيب)', ()=>{ if(cubes>=10){ cubes-=10; rods++; } }));
  if(v.carry && H) ctrl.appendChild(mk('اربط ١٠ قضبان (→ لوح)', ()=>{ if(rods>=10){ rods-=10; flats++; } }));
  const ok=document.createElement('button'); ok.textContent='تأكيد القيمة';
  ok.onclick=()=>onAnswer(val()); ctrl.appendChild(ok);
  host.appendChild(ctrl); host.appendChild(area); host.appendChild(info); draw();
}

// AGGREGATIVE (subtraction) — TAKE AWAY, with UNBUNDLE for borrow. A different act
// from BUILD: you cannot remove ones you don't have, so when ones run short you must
// "open a rod" (unbundle a ten → 10 ones) before taking. B5 needs no unbundle (direct
// take); A2/B3 force it. A wrong path (removing a rod instead of unbundling) overshoots
// → wrong remainder. The borrow is required and visible — preserving the diagnostic gradient.
function widgetSubtractBlocks(host, v, onAnswer){
  // HUNDREDS (A4): a FLATS column appears when the minuend ≥١٠٠, and the borrow chains
  // one place further — «افتح لوحاً» exchanges a flat for ١٠ rods, «افتح قضيباً» a rod
  // for ١٠ ones. Below ١٠٠ the flats UI never renders (byte-identical 2-digit behaviour).
  const H = v.minuend>=100;
  let flats=Math.floor(v.minuend/100), rods=Math.floor((v.minuend%100)/10), cubes=v.minuend%10, removed=0;
  const remaining=()=>flats*100+rods*10+cubes;
  const info=document.createElement('div'); info.className='muted';
  const area=document.createElement('div'); area.className='btb-area';
  const flatsBox=document.createElement('div'); flatsBox.className='btb-flats';
  const rodsBox=document.createElement('div'); rodsBox.className='btb-rods';
  const cubesBox=document.createElement('div'); cubesBox.className='btb-cubes';
  if(H) area.appendChild(flatsBox);
  area.appendChild(rodsBox); area.appendChild(cubesBox);
  function draw(){
    if(H){ flatsBox.innerHTML='';
      for(let i=0;i<flats;i++){ const f=document.createElement('div'); f.className='flat removable'; f.title='خذ لوحاً (−١٠٠)';
        f.onclick=()=>{ flats--; removed+=100; draw(); }; flatsBox.appendChild(f); } }
    rodsBox.innerHTML='';
    for(let i=0;i<rods;i++){ const r=document.createElement('div'); r.className='rod removable'; r.title='خذ القضيب (−١٠)';
      r.onclick=()=>{ rods--; removed+=10; draw(); }; rodsBox.appendChild(r); }
    cubesBox.innerHTML='';
    for(let i=0;i<cubes;i++){ const c=document.createElement('div'); c.className='cube removable'; c.title='خذ مكعّباً (−١)';
      c.onclick=()=>{ cubes--; removed+=1; draw(); }; cubesBox.appendChild(c); }
    const stuckOnes = removed<v.subtract && cubes===0;  // need more ones but none left → must unbundle
    info.innerHTML=`المطلوب أخذ <b>${toHindi(v.subtract)}</b> — أخذتَ <b>${toHindi(removed)}</b>. المتبقّي <b>${toHindi(remaining())}</b>.`
      + (stuckOnes ? ` <b style="color:#b45309">آحادك نفدت — افتح ${rods>0?'قضيباً':'لوحاً'} للاستلاف.</b>` : '');
  }
  const ctrl=document.createElement('div'); ctrl.className='btb-controls';
  if(H){ const openF=document.createElement('button'); openF.className='sec'; openF.textContent='افتح لوحاً (→ ١٠ قضبان)';
    openF.onclick=()=>{ if(flats>0){ flats--; rods+=10; draw(); } }; ctrl.appendChild(openF); }
  if(v.minuend>=10){   // G1 (≤٩ آحاد فقط): لا قضبان أصلاً — الزرّ ضجيج، لا يُعرض
    const open=document.createElement('button'); open.className='sec'; open.textContent='افتح قضيباً (→ ١٠ آحاد)';
    open.onclick=()=>{ if(rods>0){ rods--; cubes+=10; draw(); } };
    ctrl.appendChild(open);
  }
  const ok=document.createElement('button'); ok.textContent='تأكيد الباقي';
  ok.onclick=()=>onAnswer(remaining()); ctrl.appendChild(ok);
  host.appendChild(ctrl); host.appendChild(area); host.appendChild(info); draw();
}

// AGGREGATIVE — build the quantity and SEE the ten complete and overflow.
function widgetTenFrame(host, v, onAnswer){
  let added=0; const cells=[];
  const info=document.createElement('div'); info.className='muted';
  const frames=document.createElement('div'); frames.className='frames';
  const mk=()=>{ const f=document.createElement('div'); f.className='frame';
    for(let i=0;i<10;i++){ const c=document.createElement('div'); c.className='cell'; f.appendChild(c); cells.push(c);} return f; };
  frames.appendChild(mk()); frames.appendChild(mk());
  for(let i=0;i<v.start;i++) cells[i].classList.add('filled-start');
  const upd=()=>info.textContent=`أضفتَ ${toHindi(added)} — اكتملت العشرة وفاض ${toHindi(Math.max(0,(v.start+added)-10))}. المجموع الآن ${toHindi(v.start+added)}.`;
  cells.forEach((c,idx)=>{ if(idx>=v.start) c.onclick=()=>{
    const next=v.start+added;
    if(idx===next){ c.classList.add('filled-add'); added++; }
    else if(idx===next-1){ c.classList.remove('filled-add'); added--; }  // unfill last
    upd();
  };});
  // G1 (g1BOND «التركيب الإنتاجي»): ask:"added" → emit what the child ADDED, not the
  // total — the prompt names part and target, so the total would be given away; the
  // added count must be acted out on the frame.
  const askAdded = v.ask==='added';
  const btn=document.createElement('button'); btn.textContent=askAdded?'تأكيد ما أضفت':'تأكيد المجموع';
  btn.onclick=()=>onAnswer(askAdded ? added : v.start+added);
  upd(); host.appendChild(info); host.appendChild(frames); host.appendChild(btn);
}

// DECOMPOSITIONAL — split symbolically and supply the missing part.
function widgetDecomp(host, v, onAnswer){
  if(v.mode==='place-add'){
    // add by PLACE VALUE: ones+ones, tens by their VALUE (٥٠ + ٣٠), and — for 3-digit
    // (A3) — HUNDREDS by their value (٣٠٠ + ٢٠٠). The child enters each place's VALUE;
    // the sum of the place-values is the total (carry handled by larger place-sums, e.g.
    // ones ٧+٨=١٥). Below ١٠٠ the hundreds row never renders (2-digit unchanged).
    const a=v.a, b=v.b;
    const aO=a%10, bO=b%10;
    const aT=Math.floor(a/10)%10*10, bT=Math.floor(b/10)%10*10;
    const aH=Math.floor(a/100)*100, bH=Math.floor(b/100)*100;
    const H = a>=100 || b>=100;
    let ones=null, tens=null, hund=H?null:0;
    const wrap=document.createElement('div'); wrap.className='decomp';
    let html=`<div class="eq" style="font-size:26px">${toHindi(a)} + ${toHindi(b)}</div>
      <div class="eq">الآحاد: ${toHindi(aO)} + ${toHindi(bO)} = <span class="blank" id="paO">؟</span></div>
      <div class="eq">العشرات: ${toHindi(aT)} + ${toHindi(bT)} = <span class="blank" id="paT">؟</span></div>`;
    if(H) html+=`<div class="eq">المئات: ${toHindi(aH)} + ${toHindi(bH)} = <span class="blank" id="paH">؟</span></div>`;
    wrap.innerHTML=html; host.appendChild(wrap);
    const padBy=(max,stepN,blankId,set)=>{ const p=document.createElement('div'); p.className='keypad';
      for(let n=0;n<=max;n+=stepN){ const x=document.createElement('button'); x.textContent=toHindi(n);
        x.onclick=()=>{ wrap.querySelector('#'+blankId).textContent=toHindi(n); set(n); }; p.appendChild(x);} return p; };
    const lO=document.createElement('div'); lO.className='muted'; lO.textContent='آحاد:'; host.appendChild(lO);
    host.appendChild(padBy(aO+bO,1,'paO',n=>{ones=n;}));
    const lT=document.createElement('div'); lT.className='muted'; lT.textContent='عشرات (أدخِل قيمتها):'; host.appendChild(lT);
    host.appendChild(padBy(aT+bT,10,'paT',n=>{tens=n;}));     // tens VALUES: ٠،١٠،…
    if(H){ const lH=document.createElement('div'); lH.className='muted'; lH.textContent='مئات (أدخِل قيمتها):'; host.appendChild(lH);
      host.appendChild(padBy(aH+bH,100,'paH',n=>{hund=n;})); } // hundreds VALUES: ٠،١٠٠،…
    const ok=document.createElement('button'); ok.textContent='تأكيد';
    ok.onclick=()=>{ if(ones!=null && tens!=null && hund!=null) onAnswer(hund+tens+ones); }; host.appendChild(ok);
    return;
  }
  if(v.mode==='part-whole'){
    // G1 (g1SUB family «الجزء والكل») — the Saudi part-whole table: the WHOLE and one
    // PART are known; the child supplies the missing part on a keypad. Decompositional
    // act (no removal narrative, no minuend/subtrahend framing).
    const w=v.whole, p=v.part;
    let val=null;
    const wrap=document.createElement('div'); wrap.className='decomp';
    wrap.innerHTML=`<div class="eq" style="font-size:26px">الكُلُّ: ${toHindi(w)}</div>
      <div class="eq">جُزْءٌ: ${toHindi(p)} &nbsp;|&nbsp; جُزْءٌ: <span class="blank" id="pwB">؟</span></div>`;
    host.appendChild(wrap);
    const pad=document.createElement('div'); pad.className='keypad';
    for(let i=0;i<=w;i++){ const b=document.createElement('button'); b.textContent=toHindi(i);
      b.onclick=()=>{ val=i; wrap.querySelector('#pwB').textContent=toHindi(i); }; pad.appendChild(b); }
    host.appendChild(pad);
    const ok=document.createElement('button'); ok.textContent='تأكيد';
    ok.onclick=()=>{ if(val!=null) onAnswer(val); }; host.appendChild(ok);
    return;
  }
  if(v.mode==='unit-convert'){
    // symbolic unitising: qty from-unit = ? to-unit — produce the value with a stepper.
    let val=0;
    const wrap=document.createElement('div'); wrap.className='decomp';
    wrap.innerHTML=`<div class="eq" style="font-size:26px">${toHindi(v.qty)} ${v.from} = <span class="blank" id="ucB">؟</span> ${v.to}</div>
      <div class="muted">اضبط القيمة الصحيحة.</div>`;
    host.appendChild(wrap);
    const ctrl=document.createElement('div'); ctrl.className='btb-controls';
    const upd=()=>wrap.querySelector('#ucB').textContent=toHindi(val);
    const mk=(label,d)=>{ const b=document.createElement('button'); b.className='sec'; b.textContent=label; b.onclick=()=>{ val=Math.max(0,val+d); upd(); }; return b; };
    ctrl.appendChild(mk('+١٠',10)); ctrl.appendChild(mk('+١',1)); ctrl.appendChild(mk('−١',-1)); ctrl.appendChild(mk('−١٠',-10));
    const ok=document.createElement('button'); ok.textContent='تأكيد'; ok.onclick=()=>onAnswer(val); ctrl.appendChild(ok);
    host.appendChild(ctrl); upd();
    return;
  }
  if(v.mode==='place-sub'){
    // subtract by PLACE VALUE; each place entered as a VALUE (٥٠ − ٢٠, not ٥ − ٢). The
    // borrow CHAINS for 3-digit (A4): ones←tens, then tens←hundreds, each shown. Below
    // ١٠٠ the hundreds row never renders (2-digit place-sub unchanged).
    const m=v.minuend, s=v.subtrahend;
    const mH=Math.floor(m/100), mT=Math.floor(m/10)%10, mO=m%10;
    const sH=Math.floor(s/100), sT=Math.floor(s/10)%10, sO=s%10;
    const oB = mO<sO, eO=mO+(oB?10:0);
    const mT2=mT-(oB?1:0), tB=mT2<sT, eT=mT2+(tB?10:0);
    const eH=mH-(tB?1:0);
    const H=(mH>0||sH>0);
    const twoPlace=(eT>0||sT>0||H);
    const eT10=eT*10, sT10=sT*10, eH100=eH*100, sH100=sH*100;
    let ones=null, tens=twoPlace?null:0, hund=H?null:0;
    const wrap=document.createElement('div'); wrap.className='decomp';
    let html=`<div class="eq" style="font-size:26px">${toHindi(m)} − ${toHindi(s)}</div>`;
    if(oB) html+=`<div class="muted">افتح عشرة للآحاد: الآحاد تصبح ${toHindi(eO)}، والعشرات ${toHindi(mT2)}.</div>`;
    if(tB) html+=`<div class="muted">افتح مئة للعشرات: العشرات تصبح ${toHindi(eT)}، والمئات ${toHindi(eH)}.</div>`;
    html+=`<div class="eq">الآحاد: ${toHindi(eO)} − ${toHindi(sO)} = <span class="blank" id="psO">؟</span></div>`;
    if(twoPlace) html+=`<div class="eq">العشرات: ${toHindi(eT10)} − ${toHindi(sT10)} = <span class="blank" id="psT">؟</span></div>`;
    if(H) html+=`<div class="eq">المئات: ${toHindi(eH100)} − ${toHindi(sH100)} = <span class="blank" id="psH">؟</span></div>`;
    wrap.innerHTML=html; host.appendChild(wrap);
    const padBy=(max,stepN,blankId,set)=>{ const p=document.createElement('div'); p.className='keypad';
      for(let n=0;n<=max;n+=stepN){ const b=document.createElement('button'); b.textContent=toHindi(n);
        b.onclick=()=>{ wrap.querySelector('#'+blankId).textContent=toHindi(n); set(n); }; p.appendChild(b);} return p; };
    const lO=document.createElement('div'); lO.className='muted'; lO.textContent='آحاد:'; host.appendChild(lO);
    host.appendChild(padBy(eO,1,'psO',n=>{ones=n;}));
    if(twoPlace){ const lT=document.createElement('div'); lT.className='muted'; lT.textContent='عشرات (أدخِل قيمتها):'; host.appendChild(lT);
      host.appendChild(padBy(eT10,10,'psT',n=>{tens=n;})); }
    if(H){ const lH=document.createElement('div'); lH.className='muted'; lH.textContent='مئات (أدخِل قيمتها):'; host.appendChild(lH);
      host.appendChild(padBy(eH100,100,'psH',n=>{hund=n;})); }
    const ok=document.createElement('button'); ok.textContent='تأكيد';
    ok.onclick=()=>{ if(ones!=null && tens!=null && hund!=null) onAnswer(hund+tens+ones); };
    host.appendChild(ok);
    return;
  }
  if(v.mode==='expand3'){
    // 3-digit place-value expansion (C5): show ٣ + ٤ + ٧ as VALUES (٣٠٠ + ٤٠ + ٧) with
    // ONE place blanked; the child supplies that place's VALUE. Varying which place is
    // blank tests the HUNDREDS-unit insight, not only the ones.
    const parts=v.parts;                  // [hundredsVal, tensVal, onesVal]
    const bi=v.blank;                     // 0|1|2
    const ans=parts[bi];
    const shown=parts.map((p,i)=> i===bi ? '<span class="blank" id="e3b">؟</span>' : toHindi(p));
    const whole=parts[0]+parts[1]+parts[2];
    const wrap=document.createElement('div'); wrap.className='decomp';
    wrap.innerHTML=`<div class="eq" style="font-size:26px">${toHindi(whole)} = ${shown[0]} + ${shown[1]} + ${shown[2]}</div>
      <div class="muted">أدخِل قيمة المنزلة الناقصة.</div>`;
    host.appendChild(wrap);
    const stepN = bi===0?100 : bi===1?10 : 1;
    const max   = bi===0?900 : bi===1?90 : 9;
    const pad=document.createElement('div'); pad.className='keypad';
    for(let n=0;n<=max;n+=stepN){ const b=document.createElement('button'); b.textContent=toHindi(n);
      b.onclick=()=>{ wrap.querySelector('#e3b').textContent=toHindi(n); onAnswer(n); }; pad.appendChild(b); }
    host.appendChild(pad);
    return;
  }
  if(v.mode==='expand'){
    // place-value expansion: whole = tens + ?  (the child supplies the ones)
    const diagram=document.createElement('div'); diagram.className='decomp';
    diagram.innerHTML=`
      <div class="eq" style="font-size:28px">${toHindi(v.whole)} = <span class="part comp">${toHindi(v.tens)}</span> + <span class="blank">؟</span></div>
      <div class="muted">العشرات ${toHindi(v.tens)} — فكم الآحاد المتبقّية؟</div>`;
    // remainder may be two-digit (non-standard, e.g. 47=30+17) → range to next decade
    const rem=v.whole - v.tens;
    const maxKey = rem<=9 ? 9 : 19;
    const pad=document.createElement('div'); pad.className='keypad';
    for(let n=0;n<=maxKey;n++){ const b=document.createElement('button'); b.textContent=toHindi(n);
      b.onclick=()=>{ diagram.querySelector('.blank').textContent=toHindi(n); onAnswer(n); };
      pad.appendChild(b); }
    host.appendChild(diagram); host.appendChild(pad);
    return;
  }
  // default (B2): make-ten bond — split b to complete the ten; identify the remainder.
  const complete=v.make - v.a;          // part of b that completes the ten
  const diagram=document.createElement('div'); diagram.className='decomp';
  diagram.innerHTML=`
    <div class="bond">
      <span class="num">${toHindi(v.a)}</span><span class="op">+</span>
      <span class="split">${toHindi(v.b)}
        <span class="parts"><span class="part comp">${toHindi(complete)}</span><span class="part q">؟</span></span>
      </span>
    </div>
    <div class="eq">= ${toHindi(v.make)} + <span class="blank">؟</span></div>
    <div class="muted">${toHindi(v.a)} يحتاج ${toHindi(complete)} لتُكمل ${toHindi(v.make)} — فكم يتبقّى من ${toHindi(v.b)}؟</div>`;
  const pad=document.createElement('div'); pad.className='keypad';
  for(let n=0;n<=9;n++){ const b=document.createElement('button'); b.textContent=toHindi(n);
    b.onclick=()=>{ diagram.querySelector('.blank').textContent=toHindi(n);
      diagram.querySelector('.part.q').textContent=toHindi(n); onAnswer(n); };
    pad.appendChild(b); }
  host.appendChild(diagram); host.appendChild(pad);
}

// ============================================================================
// GEOMETRY WIDGETS (batch 2). Each emits an answer STRING; the gate is blind to the
// geometry. Responsive: SVGs use a fixed viewBox + width:100%/max-width; option rows
// wrap on narrow screens. Pointer events → work on touch and mouse.
// ============================================================================

// Minimal SVG library for the Grade-2 shapes / solids / lines this strand needs.
function _shapeSVG(name, px){
  const s = px || 64;
  const wrap = inner => `<svg viewBox="0 0 64 64" width="${s}" height="${s}" style="max-width:100%;height:auto;display:block">${inner}</svg>`;
  const f='fill:#F39A1F;stroke:#9c5e07;stroke-width:2', ln='fill:none;stroke:#155E7D;stroke-width:3';
  const lib = {
    square:    `<rect x="13" y="13" width="38" height="38" style="${f}"/>`,
    rectangle: `<rect x="6" y="19" width="52" height="26" style="${f}"/>`,
    triangle:  `<polygon points="32,11 53,52 11,52" style="${f}"/>`,
    'triangle-iso': `<polygon points="32,9 52,54 12,54" style="${f}"/><line x1="32" y1="9" x2="32" y2="54" style="stroke:#29A9E0;stroke-width:2;stroke-dasharray:4 3"/>`,
    circle:    `<circle cx="32" cy="32" r="21" style="${f}"/>`,
    cube:      `<g style="${f}"><rect x="14" y="22" width="28" height="28"/><polygon points="14,22 24,12 52,12 42,22"/><polygon points="42,22 52,12 52,40 42,50"/></g>`,
    sphere:    `<circle cx="32" cy="32" r="21" style="${f}"/><ellipse cx="32" cy="32" rx="21" ry="7" style="fill:none;stroke:#9c5e07;stroke-width:1.4;opacity:.55"/>`,
    cylinder:  `<g style="${f}"><rect x="18" y="16" width="28" height="32"/><ellipse cx="32" cy="16" rx="14" ry="6"/><ellipse cx="32" cy="48" rx="14" ry="6"/></g>`,
    cone:      `<g style="${f}"><polygon points="32,9 50,47 14,47"/><ellipse cx="32" cy="47" rx="18" ry="6"/></g>`,
    pyramid:   `<g style="${f}"><polygon points="32,9 54,50 10,50"/><polygon points="32,9 54,50 36,45"/></g>`,
    'line-straight': `<line x1="8" y1="32" x2="56" y2="32" style="${ln}"/>`,
    'line-curved':   `<path d="M8,42 Q32,6 56,42" style="${ln}"/>`,
    // m1 live-variation glyphs: G7 needed shapes with NO symmetry line so «لا» has a
    // real existence (the single-answer disease); pentagon/hexagon widen G4's counting.
    'line-curved-s':    `<path d="M8,20 C24,44 40,8 56,40" style="${ln}"/>`,
    'l-shape':          `<polygon points="14,10 34,10 34,34 54,34 54,54 14,54" style="${f}"/>`,
    'triangle-scalene': `<polygon points="10,52 58,52 22,16" style="${f}"/>`,
    pentagon:  `<polygon points="32,8 55,25 46,53 18,53 9,25" style="${f}"/>`,
    hexagon:   `<polygon points="20,11 44,11 56,32 44,53 20,53 8,32" style="${f}"/>`,
  };
  return wrap(lib[name] || `<text x="32" y="36" text-anchor="middle">${name}</text>`);
}

function _optBtn(label, svg){
  const b=document.createElement('button'); b.className='sec';
  b.style='display:inline-flex;flex-direction:column;align-items:center;gap:4px;min-width:72px;margin:4px;padding:8px';
  b.innerHTML=(svg?`<span>${svg}</span>`:'')+`<span style="font-weight:800">${label}</span>`;
  return b;
}

// SHAPE-PICK — selection among visual choices: recognition (G1/G2), congruence
// judge/search (G5), symmetry selection (G7), line type (G8). Emits the chosen value.
function widgetShapePick(host, v, onAnswer){
  if(v.show){
    const st=document.createElement('div'); st.style='text-align:center;margin:6px 0';
    st.innerHTML=_shapeSVG(v.show, 92); host.appendChild(st);
  }
  if(v.pair){
    const row=document.createElement('div');
    row.style='display:flex;gap:16px;justify-content:center;align-items:center;margin:6px 0;flex-wrap:wrap';
    v.pair.forEach(sp=>{ const c=document.createElement('div'); c.innerHTML=_shapeSVG(sp,82); row.appendChild(c); });
    host.appendChild(row);
  }
  const opts=document.createElement('div');
  opts.style='display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin-top:8px';
  v.options.forEach(o=>{
    const btn=_optBtn(o.v, o.shape ? _shapeSVG(o.shape,50) : null);
    btn.onclick=()=>{
      opts.querySelectorAll('button').forEach(b=>{ b.classList.remove('chosen'); b.style.outline=''; });
      btn.classList.add('chosen'); btn.style.outline='3px solid #29A9E0';
      onAnswer(o.v);
    };
    opts.appendChild(btn);
  });
  host.appendChild(opts);
}

// ELEMENT-COUNT — enumerate a solid/shape's structural elements (faces/vertices or
// sides/corners). The shape is shown; N element-chips are tappable; emits the count.
function widgetElementCount(host, v, onAnswer){
  const n=v.n;
  // G1 extension: v.objects (an emoji) → the chips ARE the objects themselves; the child
  // taps each object to mark-and-count it. No shape SVG. Same act, same answer flow.
  if(!v.objects){
    const st=document.createElement('div'); st.style='text-align:center;margin:6px 0';
    st.innerHTML=_shapeSVG(v.shape||v.solid, 96); host.appendChild(st);
  }
  const W={faces:'وجه',vertices:'رأس',edges:'حرف',sides:'ضلع',corners:'زاوية'};
  const lab=v.objects ? (v.label||'شيء') : (W[v.element]||'عنصر');
  const info=document.createElement('div'); info.className='muted'; info.style='text-align:center';
  const tray=document.createElement('div');
  tray.style='display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin:8px 0';
  let count=0;
  for(let i=0;i<n;i++){
    const ch=document.createElement('button'); ch.className='sec';
    if(v.objects){
      ch.textContent=v.objects;
      ch.style='width:44px;height:44px;border-radius:12px;padding:0;font-size:24px;line-height:1';
    } else {
      ch.style='width:34px;height:34px;border-radius:50%;padding:0';   // blank chip, fills on tap
    }
    ch.setAttribute('aria-label', lab);
    if(v.notap){
      ch.disabled=true; ch.style.cursor='default';   // G1 EST: estimation, not counting
    } else {
      ch.onclick=()=>{
        if(ch.dataset.on){ ch.dataset.on=''; ch.style.background=''; count--; }
        else { ch.dataset.on='1'; ch.style.background='#F39A1F'; count++; }
        info.textContent=`عددتَ: ${toHindi(count)} ${lab}`;
      };
    }
    tray.appendChild(ch);
  }
  if(v.notap && v.options){
    // G1 (g1EST «الانتقاء الإدراكي»): the objects are shown but UNTAPPABLE — the child
    // estimates and picks one of the spread-out options instead of counting.
    info.textContent='قدِّر دون عدّ، ثم اختر:';
    const row=document.createElement('div');
    row.style='display:flex;justify-content:center;gap:10px;margin:8px 0';
    v.options.forEach(opt=>{
      const b=document.createElement('button'); b.textContent=opt;
      b.onclick=()=>onAnswer(opt); row.appendChild(b);
    });
    host.appendChild(info); host.appendChild(tray); host.appendChild(row);
    return;
  }
  info.textContent=`عددتَ: ٠ ${lab}`;
  const ok=document.createElement('button'); ok.textContent='تأكيد العدّ';
  ok.style='display:block;margin:8px auto'; ok.onclick=()=>onAnswer(count);
  host.appendChild(info); host.appendChild(tray); host.appendChild(ok);
}

// SHAPE-COMPOSE — the synthetic act: drag pieces into the target outline; confirm when
// all are placed. Emits «نعم». Pointer events → touch + mouse.
function widgetShapeCompose(host, v, onAnswer){
  const wrap=document.createElement('div');
  wrap.style='display:flex;flex-wrap:wrap;gap:14px;justify-content:center;align-items:center;margin:6px 0';
  const target=document.createElement('div');
  target.style='width:128px;height:128px;border:3px dashed #29A9E0;border-radius:10px;position:relative;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:2px;background:#F3FbFe';
  const ghost=document.createElement('span'); ghost.style='position:absolute;opacity:.3;pointer-events:none';
  ghost.innerHTML=_shapeSVG(v.target,96); target.appendChild(ghost);
  const tray=document.createElement('div'); tray.style='display:flex;flex-wrap:wrap;gap:10px';
  const info=document.createElement('div'); info.className='muted'; info.style='text-align:center;width:100%';
  const ok=document.createElement('button'); ok.textContent='تأكيد التركيب'; ok.disabled=true;
  ok.style='display:block;margin:8px auto';
  let placed=0; const total=v.pieces.length;
  const upd=()=>{ info.textContent=`وضعتَ ${toHindi(placed)} من ${toHindi(total)} قطعة`; ok.disabled=placed<total; };
  v.pieces.forEach(p=>{
    const piece=document.createElement('div');
    piece.style='cursor:grab;touch-action:none;display:inline-block'; piece.innerHTML=_shapeSVG(p,54);
    let drag=false;
    piece.onpointerdown=e=>{ drag=true; piece.setPointerCapture(e.pointerId);
      piece.style.position='fixed'; piece.style.zIndex=999; };
    piece.onpointermove=e=>{ if(drag){ piece.style.left=(e.clientX-27)+'px'; piece.style.top=(e.clientY-27)+'px'; } };
    piece.onpointerup=e=>{ if(!drag) return; drag=false;
      const r=target.getBoundingClientRect();
      if(e.clientX>=r.left && e.clientX<=r.right && e.clientY>=r.top && e.clientY<=r.bottom){
        piece.style.position='static'; piece.style.left=''; piece.style.top='';
        piece.style.opacity='.9'; piece.onpointerdown=null; piece.style.cursor='default';
        target.appendChild(piece); placed++; upd();
      } else { piece.style.position='static'; piece.style.left=''; piece.style.top=''; }
    };
    tray.appendChild(piece);
  });
  upd();
  ok.onclick=()=>onAnswer('نعم');
  wrap.appendChild(target); wrap.appendChild(tray);
  host.appendChild(wrap); host.appendChild(info); host.appendChild(ok);
}

// ============================================================================
// MULTIPLICATION / DIVISION WIDGETS (batch 3). Isolated — emit an answer STRING; the
// gate is blind to the multiplication/division. Responsive (wrap), touch + mouse.
// ============================================================================
function _dot(on){ const d=document.createElement('span');
  d.style=`display:inline-block;width:16px;height:16px;border-radius:50%;margin:2px;`+
          (on?'background:#F39A1F':'background:#cfe6f2'); return d; }

// ARRAY — the SPATIAL representation of the multiplicative total: an r×c grid of dots,
// tappable to count. Emits the count. (M1 «مصفوفة» family.)
function widgetArray(host, v, onAnswer){
  // `square:true` (Q4 AREA) renders ADJACENT unit SQUARES (a tiled rectangle) instead of
  // spaced dots — same count-the-cells act, faithful to "area = number of unit squares".
  const sq = !!v.square;
  const info=document.createElement('div'); info.className='muted'; info.style='text-align:center';
  const grid=document.createElement('div');
  grid.style=`display:grid;grid-template-columns:repeat(${v.cols},auto);gap:${sq?0:6}px;`
    +`justify-content:center;margin:8px auto;max-width:100%`+(sq?';border:2px solid #155E7D;width:max-content':'');
  let count=0;
  for(let i=0;i<v.rows*v.cols;i++){
    const cell=document.createElement('button'); cell.className='sec';
    cell.style = sq ? 'width:30px;height:30px;border-radius:0;padding:0;margin:0;border:1px solid #155E7D'
                    : 'width:30px;height:30px;border-radius:50%;padding:0';
    cell.onclick=()=>{ if(cell.dataset.on){ cell.dataset.on=''; cell.style.background=''; count--; }
      else { cell.dataset.on='1'; cell.style.background='#F39A1F'; count++; }
      info.textContent=`عددتَ: ${toHindi(count)}`; };
    grid.appendChild(cell);
  }
  info.textContent = sq ? 'انقر مربّعات الوحدة لتعدّ المساحة' : 'انقر النقاط لتعدّ الإجمالي';
  const ok=document.createElement('button'); ok.textContent = sq ? 'تأكيد المساحة' : 'تأكيد الإجمالي';
  ok.style='display:block;margin:8px auto'; ok.onclick=()=>onAnswer(count);
  const cap=document.createElement('div'); cap.className='muted'; cap.style='text-align:center';
  cap.textContent = sq ? `مستطيل ${toHindi(v.rows)} × ${toHindi(v.cols)} من مربّعات الوحدة`
                       : `${toHindi(v.rows)} صفوف × ${toHindi(v.cols)} أعمدة`;
  host.appendChild(cap); host.appendChild(grid); host.appendChild(info); host.appendChild(ok);
}

// GROUPS — three modes of equal-group reasoning:
//   form    (×): G groups of M dots → count the TOTAL (M1 «خطّي» family)
//   share   (÷ partitive): deal N dots equally into G bins → the SHARE per bin (V1)
//   measure (÷ quotative): make groups of M from N → the COUNT of groups (V3)
// Emits the total / share / count. The gate sees only that number.
function widgetGroups(host, v, onAnswer){
  const info=document.createElement('div'); info.className='muted'; info.style='text-align:center;margin-top:6px';
  const stage=document.createElement('div');
  stage.style='display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin:8px 0';

  if(v.mode==='form'){
    for(let g=0; g<v.groups; g++){
      const box=document.createElement('div');
      box.style='border:2px solid #bfe2f3;border-radius:10px;padding:8px;display:flex;flex-wrap:wrap;max-width:120px;justify-content:center';
      for(let i=0;i<v.per;i++) box.appendChild(_dot(true));
      stage.appendChild(box);
    }
    info.textContent=`${toHindi(v.groups)} مجموعات × ${toHindi(v.per)} — كم الإجمالي؟`;
    const pad=document.createElement('div'); pad.className='keypad';
    pad.style='display:flex;flex-wrap:wrap;gap:4px;justify-content:center';
    for(let n=0;n<=v.groups*v.per+4;n++){ const b=document.createElement('button'); b.textContent=toHindi(n);
      b.onclick=()=>onAnswer(n); pad.appendChild(b); }
    host.appendChild(stage); host.appendChild(info); host.appendChild(pad); return;
  }

  // share / measure share a movable pool of `total` dots
  let pool=v.total, groupsMade=0, perBin=0;
  const poolBox=document.createElement('div');
  poolBox.style='border:2px dashed #29A9E0;border-radius:10px;padding:8px;min-height:42px;display:flex;flex-wrap:wrap;justify-content:center;max-width:100%';
  const bins=document.createElement('div'); bins.style='display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:8px';
  const drawPool=()=>{ poolBox.innerHTML=''; for(let i=0;i<pool;i++) poolBox.appendChild(_dot(true)); };

  if(v.mode==='share'){
    const binEls=[];
    for(let g=0; g<v.groups; g++){ const b=document.createElement('div');
      b.style='border:2px solid #bfe2f3;border-radius:10px;padding:6px;min-width:46px;min-height:42px;display:flex;flex-wrap:wrap;justify-content:center';
      bins.appendChild(b); binEls.push(b); }
    const deal=document.createElement('button'); deal.className='sec'; deal.textContent='وزّع واحدة لكل مجموعة';
    deal.onclick=()=>{ if(pool>=v.groups){ for(const b of binEls){ b.appendChild(_dot(true)); } pool-=v.groups; perBin++; drawPool();
      info.textContent=`في كلّ مجموعة الآن: ${toHindi(perBin)}`; } };
    const ok=document.createElement('button'); ok.textContent='تأكيد الحصّة'; ok.style='margin-inline-start:6px';
    ok.onclick=()=>onAnswer(perBin);
    info.textContent=`وزّع ${toHindi(v.total)} على ${toHindi(v.groups)} بالتساوي`;
    drawPool();
    const ctrl=document.createElement('div'); ctrl.style='text-align:center;margin-top:6px';
    ctrl.appendChild(deal); ctrl.appendChild(ok);
    host.appendChild(poolBox); host.appendChild(bins); host.appendChild(info); host.appendChild(ctrl); return;
  }

  // measure (quotative): make groups of `per`, count how many — repeated subtraction
  const made=document.createElement('div'); made.style='display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:8px';
  const makeBtn=document.createElement('button'); makeBtn.className='sec'; makeBtn.textContent=`اصنع مجموعة من ${toHindi(v.per)}`;
  makeBtn.onclick=()=>{ if(pool>=v.per){ pool-=v.per; groupsMade++;
    const b=document.createElement('div'); b.style='border:2px solid #bfe2f3;border-radius:10px;padding:6px;display:flex;flex-wrap:wrap;justify-content:center;max-width:120px';
    for(let i=0;i<v.per;i++) b.appendChild(_dot(true)); made.appendChild(b);
    drawPool(); info.textContent=`عدد المجموعات: ${toHindi(groupsMade)} (تبقّى ${toHindi(pool)})`; } };
  const ok=document.createElement('button'); ok.textContent='تأكيد عدد المجموعات'; ok.style='margin-inline-start:6px';
  ok.onclick=()=>onAnswer(groupsMade);
  info.textContent=`كم مجموعةً من ${toHindi(v.per)} في ${toHindi(v.total)}؟`;
  drawPool();
  const ctrl=document.createElement('div'); ctrl.style='text-align:center;margin-top:6px';
  ctrl.appendChild(makeBtn); ctrl.appendChild(ok);
  host.appendChild(poolBox); host.appendChild(made); host.appendChild(info); host.appendChild(ctrl);
}

// ============================================================================
// DATA & PROBABILITY WIDGETS (batch 4). Isolated — emit an answer STRING; the gate is
// blind to the chart / scenario. Responsive (flex/wrap), touch + mouse.
// ============================================================================
const _COLOR = { red:'#e8443b', blue:'#2f7fd1', green:'#37a05a', yellow:'#f0c020' };
const _COLOR_AR = { red:'أحمر', blue:'أزرق', green:'أخضر', yellow:'أصفر' };

// CHART — read OR build a pictograph / bar / tally. The gate sees only the emitted value.
function widgetChart(host, v, onAnswer){
  if(v.mode==='read') return _chartRead(host, v, onAnswer);
  return _chartBuild(host, v, onAnswer);
}
function _pictoRow(label, value, onPick, scale){
  // G3 batch-10 extension: with a SCALE/key, each symbol stands for `scale` units —
  // so we draw value/scale symbols (the child multiplies by the key to read the
  // count). 1:1 (G2) when scale is absent. The graded answer is the FULL count.
  const s = scale || 1, syms = value / s;
  const row=document.createElement('div'); row.style='display:flex;align-items:center;gap:8px;margin:4px 0;flex-wrap:wrap';
  const tag=document.createElement('button'); tag.className='sec'; tag.textContent=label; tag.style='min-width:40px;font-weight:800';
  if(onPick) tag.onclick=()=>onPick(label); else tag.disabled=true;
  const icons=document.createElement('span');
  for(let i=0;i<Math.floor(syms);i++){ const d=document.createElement('span');
    d.style='display:inline-block;width:18px;height:18px;border-radius:50%;background:#F39A1F;margin:1px'; icons.appendChild(d); }
  if(syms%1>0){ const half=document.createElement('span');   // a half symbol for the remainder
    half.style='display:inline-block;width:9px;height:18px;border-radius:9px 0 0 9px;background:#F39A1F;margin:1px'; icons.appendChild(half); }
  row.appendChild(tag); row.appendChild(icons); return row;
}
function _barCol(label, value, onPick){
  const col=document.createElement('div'); col.style='display:flex;flex-direction:column;align-items:center;gap:4px';
  const bar=document.createElement('button'); bar.className='sec';
  bar.style=`width:34px;height:${14+value*16}px;background:#29A9E0;border:0;border-radius:6px 6px 0 0;align-self:flex-end`;
  if(onPick) bar.onclick=()=>onPick(label); else bar.disabled=true;
  const tag=document.createElement('div'); tag.style='font-weight:800'; tag.textContent=label;
  col.appendChild(bar); col.appendChild(tag); return col;
}
function _tallyMarks(n){
  const wrap=document.createElement('span');
  for(let i=0;i<n;i++){ const fifth=(i%5===4); const m=document.createElement('span');
    m.style=`display:inline-block;width:4px;height:24px;border-left:3px solid #155E7D;margin:0 ${fifth?'7':'2'}px;`+
            (fifth?'transform:rotate(-60deg);border-color:#e8443b':''); wrap.appendChild(m); }
  return wrap;
}
function _chartRead(host, v, onAnswer){
  const max=Math.max(...v.data.map(d=>d[1]));
  const info=document.createElement('div'); info.className='muted'; info.style='text-align:center';
  function pick(label){ info.textContent='اخترت: '+label; onAnswer(label); }
  const onPick = v.ask==='most' ? pick : null;
  const board=document.createElement('div'); board.style='margin:8px 0';
  if(v.type==='bar'){
    const row=document.createElement('div'); row.style='display:flex;gap:14px;justify-content:center;align-items:flex-end;min-height:60px';
    v.data.forEach(([l,val])=>row.appendChild(_barCol(l,val,onPick))); board.appendChild(row);
  } else if(v.type==='lineplot'){
    // LINE PLOT (DA4) — stacked × marks above each value on a number line. Read like a
    // bar/pictograph but the display is a dot/line plot (a NEW representation).
    const row=document.createElement('div'); row.style='display:flex;gap:0;justify-content:center;align-items:flex-end;border-bottom:3px solid #155E7D;padding:0 4px;min-height:70px';
    v.data.forEach(([l,val])=>{
      const col=document.createElement('div'); col.style='display:flex;flex-direction:column;align-items:center;min-width:40px';
      const marks=document.createElement('div'); marks.style='display:flex;flex-direction:column-reverse;gap:1px;min-height:54px;justify-content:flex-start';
      for(let i=0;i<val;i++){ const x=document.createElement('div'); x.textContent='✕'; x.style='color:#F39A1F;font-weight:800;line-height:1'; marks.appendChild(x); }
      const tag=document.createElement('button'); tag.className='sec'; tag.style='font-weight:800;margin-top:3px';
      tag.textContent=l; if(onPick) tag.onclick=()=>onPick(l); else tag.disabled=true;
      col.appendChild(marks); col.appendChild(tag); row.appendChild(col);
    });
    board.appendChild(row);
  } else {
    v.data.forEach(([l,val])=>board.appendChild(_pictoRow(l,val,onPick,v.scale)));
  }
  if(v.scale){ const key=document.createElement('div'); key.className='muted'; key.style='text-align:center;font-weight:800;color:#155E7D';
    key.textContent=`🔑 كلُّ رمزٍ يمثِّل ${toHindi(v.scale)}`; board.appendChild(key); }
  host.appendChild(board); host.appendChild(info);
  if(v.ask==='most'){ info.textContent='انقر الفئة الأكثر.'; return; }
  const pad=document.createElement('div'); pad.className='keypad'; pad.style='display:flex;flex-wrap:wrap;gap:4px;justify-content:center';
  for(let n=0;n<=max+3;n++){ const b=document.createElement('button'); b.textContent=toHindi(n);
    b.onclick=()=>{ info.textContent='أجبت: '+toHindi(n); onAnswer(n); }; pad.appendChild(b); }
  host.appendChild(pad);
}
function _chartBuild(host, v, onAnswer){
  const info=document.createElement('div'); info.className='muted'; info.style='text-align:center;margin-top:6px';
  let value=0;
  if(v.type==='tally'){
    const area=document.createElement('div'); area.style='min-height:34px;border:2px dashed #29A9E0;border-radius:10px;padding:8px;text-align:center';
    const draw=()=>{ area.innerHTML=''; area.appendChild(_tallyMarks(value)); info.textContent=`الإشارات: ${toHindi(value)}`; };
    draw();
    const add=document.createElement('button'); add.className='sec'; add.textContent='أضف إشارة'; add.onclick=()=>{ value++; draw(); };
    const del=document.createElement('button'); del.className='sec'; del.textContent='احذف'; del.onclick=()=>{ if(value>0){ value--; draw(); } };
    const ok=document.createElement('button'); ok.textContent='تأكيد'; ok.onclick=()=>onAnswer(value);
    const ctrl=document.createElement('div'); ctrl.style='text-align:center;margin-top:6px';
    ctrl.appendChild(add); ctrl.appendChild(del); ctrl.appendChild(ok);
    host.appendChild(area); host.appendChild(info); host.appendChild(ctrl); return;
  }
  const stage=document.createElement('div'); stage.style='display:flex;justify-content:center;align-items:flex-end;min-height:130px';
  const bar=document.createElement('div'); bar.style='width:46px;background:#29A9E0;border-radius:6px 6px 0 0';
  stage.appendChild(bar);
  const draw=()=>{ bar.style.height=(8+value*16)+'px'; info.textContent=`ارتفاع العمود: ${toHindi(value)}`; };
  draw();
  const up=document.createElement('button'); up.className='sec'; up.textContent='▲ أعلى'; up.onclick=()=>{ value++; draw(); };
  const dn=document.createElement('button'); dn.className='sec'; dn.textContent='▼ أدنى'; dn.onclick=()=>{ if(value>0){ value--; draw(); } };
  const ok=document.createElement('button'); ok.textContent='تأكيد'; ok.onclick=()=>onAnswer(value);
  const ctrl=document.createElement('div'); ctrl.style='text-align:center;margin-top:6px';
  ctrl.appendChild(up); ctrl.appendChild(dn); ctrl.appendChild(ok);
  host.appendChild(stage); host.appendChild(info); host.appendChild(ctrl);
}

// LIKELIHOOD — judge an event's likelihood from a bag of coloured balls. certainty:
// أكيد/ممكن/مستحيل; more: which colour is more likely. Emits the chosen label. A different
// act from reading data (judging chance, not counting a display).
function widgetLikelihood(host, v, onAnswer){
  const bag=document.createElement('div');
  bag.style='border:3px solid #9c5e07;border-top:0;border-radius:0 0 40px 40px;padding:14px;display:flex;flex-wrap:wrap;gap:6px;justify-content:center;max-width:240px;margin:6px auto;background:#fff7ec';
  v.balls.forEach(([c,n])=>{ for(let i=0;i<n;i++){ const b=document.createElement('span');
    b.style=`display:inline-block;width:20px;height:20px;border-radius:50%;background:${_COLOR[c]||'#999'}`; bag.appendChild(b); } });
  host.appendChild(bag);
  const info=document.createElement('div'); info.className='muted'; info.style='text-align:center'; host.appendChild(info);
  const opts=document.createElement('div'); opts.style='display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:6px';
  const pick=val=>{ info.textContent='اخترت: '+val; onAnswer(val); };
  const choices = v.ask==='certainty'
    ? [['أكيد',null],['ممكن',null],['مستحيل',null]]
    : v.balls.map(([c])=>[_COLOR_AR[c]||c, _COLOR[c]]);
  choices.forEach(([label,color])=>{ const b=document.createElement('button'); b.className='sec';
    b.style='font-weight:800;padding:8px 12px'+(color?`;border:2px solid ${color}`:''); b.textContent=label;
    b.onclick=()=>pick(label); opts.appendChild(b); });
  host.appendChild(opts);
}

// ============================================================================
// MEASUREMENT WIDGETS (batch 5). Isolated — emit an answer STRING; the gate is blind to
// the measurement. Three genuinely-different visual domains: a unit measurer (ruler /
// balance / container), a clock dial, and money. Responsive, touch + mouse.
// ============================================================================

// MEASURE — quantify a continuous attribute by a UNIT. ruler: tap the tick at the object's
// end. balance: add gram-weights until level. container: pour cups until full. Emits the count.
function widgetMeasure(host, v, onAnswer){
  const info=document.createElement('div'); info.className='muted'; info.style='text-align:center;margin-top:6px';
  if(v.mode==='compare'){
    // G1 (LEN/CAP/AREA «المقارنة المباشرة») — sized blocks side by side; the child SEES
    // the difference and taps the asked one. ISOLATED: emits the tapped label.
    const row=document.createElement('div');
    row.style='display:flex;align-items:flex-end;justify-content:center;gap:18px;margin:8px 0;flex-wrap:wrap';
    v.items.forEach(it=>{
      const wrap=document.createElement('button'); wrap.className='sec';
      wrap.style='display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px;border-radius:12px';
      const block=document.createElement('div');
      block.style=`width:${it.w}px;height:${it.h}px;background:#F39A1F;border-radius:6px`;
      const lab=document.createElement('b'); lab.textContent=it.v;
      wrap.appendChild(block); wrap.appendChild(lab);
      wrap.onclick=()=>{ info.textContent='اخترتَ: '+it.v; onAnswer(it.v); };
      row.appendChild(wrap);
    });
    host.appendChild(row); host.appendChild(info); return;
  }
  if(v.mode==='heavier'){
    // G1 (MASS «المقارنة») — a beam TILTED toward the heavier pan (Oman's two-pan
    // balance, read visually); tap the asked object. Emits its label.
    const beam=document.createElement('div');
    beam.style='display:flex;justify-content:space-between;align-items:flex-end;max-width:280px;margin:10px auto;transition:transform .2s';
    beam.style.transform=`rotate(${v.heavier==='right'?6:-6}deg)`;
    const pan=(o)=>{ const p=document.createElement('button'); p.className='sec';
      p.style='width:104px;min-height:56px;border:2px solid #9c5e07;border-radius:0 0 44px 44px;font-size:30px;line-height:1';
      p.textContent=o.e; p.setAttribute('aria-label', o.v);
      p.onclick=()=>{ info.textContent='اخترتَ: '+o.v; onAnswer(o.v); }; return p; };
    beam.appendChild(pan(v.right)); beam.appendChild(pan(v.left));   // RTL: right first
    host.appendChild(beam); host.appendChild(info); return;
  }
  if(v.mode==='ruler'){
    const wrap=document.createElement('div'); wrap.style='overflow-x:auto;padding:6px';
    const obj=document.createElement('div');
    obj.style=`height:18px;width:${v.length*28}px;background:#F39A1F;border-radius:4px;margin:0 0 4px 0`;
    const rule=document.createElement('div'); rule.style='display:flex;align-items:flex-start';
    for(let n=0;n<=v.max;n++){ const t=document.createElement('button'); t.className='sec';
      t.style='width:28px;min-width:28px;padding:2px 0;border-radius:0;border-right:0;display:flex;flex-direction:column;align-items:center;font-size:11px';
      t.innerHTML=`<span style="height:12px;border-left:2px solid #155E7D"></span>${toHindi(n)}`;
      // G1 extension: v.unit relabels the unit (non-standard units: مشبك/قدم) — the
      // measuring act is identical, only the unit word changes (default سم unchanged).
      t.onclick=()=>{ info.textContent='قرأتَ: '+toHindi(n)+' '+(v.unit||'سم'); onAnswer(n); };
      rule.appendChild(t); }
    wrap.appendChild(obj); wrap.appendChild(rule);
    info.textContent='انقر الشريحة عند نهاية الجسم.';
    host.appendChild(wrap); host.appendChild(info); return;
  }
  if(v.mode==='balance'){
    let w=0;
    const beam=document.createElement('div'); beam.style='display:flex;justify-content:space-between;align-items:flex-end;max-width:260px;margin:6px auto;transition:transform .2s';
    const pan=(txt)=>{ const p=document.createElement('div'); p.style='width:96px;min-height:46px;border:2px solid #9c5e07;border-radius:0 0 40px 40px;display:flex;flex-wrap:wrap;gap:3px;justify-content:center;align-items:center;padding:4px'; p.innerHTML=txt; return p; };
    const left=pan('<b>الجسم</b>'); const right=document.createElement('div');
    right.style='width:96px;min-height:46px;border:2px solid #9c5e07;border-radius:0 0 40px 40px;display:flex;flex-wrap:wrap;gap:3px;justify-content:center;align-items:center;padding:4px';
    const draw=()=>{ right.innerHTML=''; for(let i=0;i<w;i++){ const g=document.createElement('span'); g.style='display:inline-block;width:14px;height:14px;background:#29A9E0;border-radius:3px'; right.appendChild(g); }
      const tilt = w<v.mass ? 6 : (w>v.mass ? -6 : 0);
      beam.style.transform=`rotate(${tilt}deg)`;
      // G1 extension: v.unit/v.unitOne relabel the weights (non-standard: مكعب/مكعباً)
      const u=v.unit||'غرام';
      info.textContent = w===v.mass ? `متّزن ✓ — الكتلة ${toHindi(w)} ${u}` : `الأثقال: ${toHindi(w)} ${u}`; };
    beam.appendChild(left); beam.appendChild(right);
    const add=document.createElement('button'); add.className='sec'; add.textContent='أضف '+(v.unitOne||'غراماً'); add.onclick=()=>{ w++; draw(); };
    const del=document.createElement('button'); del.className='sec'; del.textContent='أزل'; del.onclick=()=>{ if(w>0){ w--; draw(); } };
    const ok=document.createElement('button'); ok.textContent='تأكيد الكتلة'; ok.onclick=()=>onAnswer(w);
    const ctrl=document.createElement('div'); ctrl.style='text-align:center;margin-top:6px'; ctrl.append(add,del,ok);
    draw(); host.appendChild(beam); host.appendChild(info); host.appendChild(ctrl); return;
  }
  // container — pour cups until full
  let c=0;
  const jar=document.createElement('div'); jar.style='width:90px;height:120px;border:3px solid #155E7D;border-top:0;border-radius:0 0 14px 14px;margin:6px auto;position:relative;overflow:hidden';
  const fill=document.createElement('div'); fill.style='position:absolute;bottom:0;left:0;right:0;background:#29A9E0;transition:height .2s'; jar.appendChild(fill);
  const draw=()=>{ fill.style.height=(c/v.cups*100)+'%'; info.textContent = c===v.cups ? `ممتلئ ✓ — ${toHindi(c)} أكواب` : `سكبتَ: ${toHindi(c)} كوب`; };
  const pour=document.createElement('button'); pour.className='sec'; pour.textContent='اسكب كوباً'; pour.onclick=()=>{ if(c<v.cups+2){ c++; draw(); } };
  const del=document.createElement('button'); del.className='sec'; del.textContent='أفرغ كوباً'; del.onclick=()=>{ if(c>0){ c--; draw(); } };
  const ok=document.createElement('button'); ok.textContent='تأكيد السعة'; ok.onclick=()=>onAnswer(c);
  const ctrl=document.createElement('div'); ctrl.style='text-align:center;margin-top:6px'; ctrl.append(pour,del,ok);
  draw(); host.appendChild(jar); host.appendChild(info); host.appendChild(ctrl);
}

// CLOCK — decode a two-hand dial (a different act from unit measurement). Render the dial
// at hour:minute, child reads and picks the time. Emits the chosen label.
function widgetClock(host, v, onAnswer){
  const cx=60, cy=60, NS='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(NS,'svg'); svg.setAttribute('viewBox','0 0 120 120');
  svg.setAttribute('width','140'); svg.style.cssText='max-width:100%;display:block;margin:6px auto';
  const circ=document.createElementNS(NS,'circle'); circ.setAttribute('cx',cx); circ.setAttribute('cy',cy); circ.setAttribute('r',54);
  circ.setAttribute('style','fill:#fff;stroke:#155E7D;stroke-width:3'); svg.appendChild(circ);
  for(let h=1;h<=12;h++){ const a=h*30*Math.PI/180; const t=document.createElementNS(NS,'text');
    t.setAttribute('x', cx+42*Math.sin(a)); t.setAttribute('y', cy-42*Math.cos(a)+5);
    t.setAttribute('text-anchor','middle'); t.setAttribute('style','font-size:11px;font-weight:800;fill:#155E7D');
    t.textContent=toHindi(h); svg.appendChild(t); }
  const hand=(len,ang,w,col)=>{ const a=ang*Math.PI/180; const l=document.createElementNS(NS,'line');
    l.setAttribute('x1',cx); l.setAttribute('y1',cy); l.setAttribute('x2',cx+len*Math.sin(a)); l.setAttribute('y2',cy-len*Math.cos(a));
    l.setAttribute('style',`stroke:${col};stroke-width:${w};stroke-linecap:round`); svg.appendChild(l); };
  hand(28, (v.hour%12)*30 + v.minute*0.5, 5, '#155E7D');   // hour
  hand(42, v.minute*6, 3, '#F39A1F');                       // minute
  host.appendChild(svg);
  const info=document.createElement('div'); info.className='muted'; info.style='text-align:center'; host.appendChild(info);
  const opts=document.createElement('div'); opts.style='display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:6px';
  v.options.forEach(o=>{ const b=document.createElement('button'); b.className='sec'; b.style='font-weight:800'; b.textContent=o;
    b.onclick=()=>{ info.textContent='اخترت: '+o; onAnswer(o); }; opts.appendChild(b); });
  host.appendChild(opts);
}

// POSITION-SCENE (G1 batch-6, g1POS) — a SPATIAL arrangement: an anchor object with
// other objects placed above/below/left/right/inside/outside, or BETWEEN two anchors.
// The child taps the object satisfying the named relation. ISOLATED like the rest:
// emits the tapped object's LABEL string; the gate grades that string, blind to layout.
function widgetPositionScene(host, v, onAnswer){
  const info=document.createElement('div'); info.className='muted'; info.style='text-align:center';
  const obj=(o)=>{ const b=document.createElement('button'); b.className='sec';
    b.style='width:56px;height:56px;border-radius:14px;padding:0;font-size:30px;line-height:1';
    b.textContent=o.e; b.setAttribute('aria-label', o.v);
    b.onclick=()=>{ info.textContent='اخترتَ: '+o.v; onAnswer(o.v); }; return b; };
  if(v.mode==='between'){
    // [anchor]  [object]  [anchor]  + a distractor clearly outside the pair
    const row=document.createElement('div');
    row.style='display:flex;align-items:center;justify-content:center;gap:14px;margin:10px 0';
    const a=document.createElement('span'); a.style='font-size:34px'; a.textContent=v.anchor;
    const b=document.createElement('span'); b.style='font-size:34px'; b.textContent=v.anchor2||v.anchor;
    row.appendChild(a);
    row.appendChild(obj(v.objects.find(o=>o.pos==='between')));
    row.appendChild(b);
    const out=v.objects.find(o=>o.pos==='outside');
    if(out){ const sep=document.createElement('span'); sep.style='width:34px'; row.appendChild(sep);
      row.appendChild(obj(out)); }
    host.appendChild(row); host.appendChild(info); return;
  }
  // grid mode — 3×3, anchor at the centre; inside overlaps the anchor cell
  const POSMAP={above:[0,1], below:[2,1], left:[1,2], right:[1,0], outside:[0,0]}; // RTL: right=col0
  const grid=document.createElement('div');
  grid.style='display:grid;grid-template-columns:repeat(3,76px);grid-template-rows:repeat(3,76px);justify-content:center;align-items:center;justify-items:center;margin:8px 0';
  const cells=[]; for(let r=0;r<3;r++){ cells.push([]); for(let c=0;c<3;c++){
    const d=document.createElement('div'); d.style='position:relative;width:76px;height:76px;display:flex;align-items:center;justify-content:center';
    grid.appendChild(d); cells[r].push(d); } }
  const anch=document.createElement('span'); anch.style='font-size:44px'; anch.textContent=v.anchor;
  cells[1][1].appendChild(anch);
  (v.objects||[]).forEach(o=>{
    if(o.pos==='inside'){ const b=obj(o);
      b.style.position='absolute'; b.style.width='34px'; b.style.height='34px';
      b.style.fontSize='18px'; b.style.opacity='0.95'; cells[1][1].appendChild(b); return; }
    const [r,c]=POSMAP[o.pos]||[2,2]; cells[r][c].appendChild(obj(o));
  });
  host.appendChild(grid); host.appendChild(info);
}

// SORT-BINS (G1 batch-6, g1CLS; reusable for the G1 data batch) — EXECUTE a sort:
// tap an item in the tray, then tap a bin; when every item is placed, confirm.
// ISOLATED: emits «نعم» if the full assignment matches, otherwise «لا» — the gate
// grades that string (the shape-compose precedent), blind to the drag mechanics.
function widgetSortBins(host, v, onAnswer){
  let picked=null; const placed=new Map();   // item idx -> bin idx
  const info=document.createElement('div'); info.className='muted'; info.style='text-align:center';
  const tray=document.createElement('div');
  tray.style='display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin:8px 0';
  const binsRow=document.createElement('div');
  binsRow.style='display:flex;justify-content:center;gap:14px;margin:8px 0;flex-wrap:wrap';
  const binBoxes=[];
  const upd=()=>info.textContent = picked!=null ? 'اخترتَ عنصراً — انقر السلّة المناسبة.'
    : (placed.size===v.items.length ? 'اكتمل الفرز — أكِّد.' : 'انقر عنصراً ثم سلّته.');
  v.items.forEach((it,idx)=>{
    const b=document.createElement('button'); b.className='sec';
    b.style='width:48px;height:48px;border-radius:12px;padding:0;font-size:26px;line-height:1';
    b.textContent=it.e; b.setAttribute('aria-label','عنصر');
    b.onclick=()=>{ if(placed.has(idx)) return; picked=idx;
      tray.querySelectorAll('button').forEach(x=>x.style.outline='');
      b.style.outline='3px solid #F39A1F'; upd(); };
    tray.appendChild(b);
  });
  v.bins.forEach((name,bi)=>{
    const box=document.createElement('div');
    box.style='min-width:120px;min-height:88px;border:3px dashed #155E7D;border-radius:14px;padding:6px;text-align:center;cursor:pointer';
    box.innerHTML=`<div style="font-weight:800;color:#155E7D">${name}</div>`;
    const inner=document.createElement('div'); inner.style='display:flex;flex-wrap:wrap;gap:4px;justify-content:center';
    box.appendChild(inner);
    box.onclick=()=>{ if(picked==null) return;
      const it=v.items[picked]; placed.set(picked, bi);
      const chip=document.createElement('span'); chip.style='font-size:24px'; chip.textContent=it.e;
      inner.appendChild(chip);
      const btn=tray.querySelectorAll('button')[picked];
      btn.style.visibility='hidden'; btn.style.outline='';
      picked=null; upd(); };
    binsRow.appendChild(box); binBoxes.push(box);
  });
  const ok=document.createElement('button'); ok.textContent='تأكيد الفرز';
  ok.onclick=()=>{ if(placed.size!==v.items.length) return;
    const right=v.items.every((it,idx)=>placed.get(idx)===it.bin);
    onAnswer(right?'نعم':'لا'); };
  upd();
  host.appendChild(tray); host.appendChild(binsRow); host.appendChild(info); host.appendChild(ok);
}

// MONEY — an arithmetic act (not measurement). identify: pick a coin's value. total: sum a
// set of coins. Emits the value/total. (Omani بيسة.)
function _coin(val){ const c=document.createElement('span');
  c.style='display:inline-flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:50%;background:#f3d98a;border:2px solid #b8911f;font-weight:800;color:#7a5b08;margin:3px';
  c.textContent=toHindi(val); return c; }
// banknote (paper money) — a rectangular bill, for the «أوراق نقدية» family (Q3 S2).
function _note(val){ const n=document.createElement('span');
  n.style='display:inline-flex;align-items:center;justify-content:center;width:74px;height:40px;border-radius:6px;background:#cdebd4;border:2px solid #2f8f57;font-weight:800;color:#1e6b3e;margin:3px';
  n.textContent=toHindi(val); return n; }
function widgetMoney(host, v, onAnswer){
  // `unit` (default «بيسة») parameterises the currency word; `paper:true` renders banknotes.
  const unit = v.unit || 'بيسة';
  const piece = v.paper ? _note : _coin;
  const info=document.createElement('div'); info.className='muted'; info.style='text-align:center;margin-top:6px';
  if(v.mode==='identify'){
    const stage=document.createElement('div'); stage.style='text-align:center;margin:6px 0'; stage.appendChild(piece(v.coin));
    const opts=document.createElement('div'); opts.style='display:flex;flex-wrap:wrap;gap:6px;justify-content:center';
    v.options.forEach(o=>{ const b=document.createElement('button'); b.className='sec'; b.style='font-weight:800'; b.textContent=toHindi(o)+' '+unit;
      b.onclick=()=>{ info.textContent='اخترت: '+toHindi(o); onAnswer(o); }; opts.appendChild(b); });
    host.appendChild(stage); host.appendChild(info); host.appendChild(opts); return;
  }
  // total — sum a set of coins/notes
  const stage=document.createElement('div'); stage.style='display:flex;flex-wrap:wrap;justify-content:center;margin:6px 0';
  v.coins.forEach(c=>stage.appendChild(piece(c)));
  const sum=v.coins.reduce((a,b)=>a+b,0);
  const pad=document.createElement('div'); pad.className='keypad'; pad.style='display:flex;flex-wrap:wrap;gap:4px;justify-content:center';
  const vals=[...new Set([sum, sum-5, sum+5, sum-10, sum+10, Math.max(0,sum-15)])].filter(x=>x>=0).sort((a,b)=>a-b);
  vals.forEach(n=>{ const b=document.createElement('button'); b.textContent=toHindi(n)+' '+unit;
    b.onclick=()=>{ info.textContent='أجبت: '+toHindi(n); onAnswer(n); }; pad.appendChild(b); });
  info.textContent='اجمع القيم واختر المجموع.';
  host.appendChild(stage); host.appendChild(info); host.appendChild(pad);
}

// ============================================================================
// PATTERN WIDGET (batch 6). Extend a repeating/growing pattern (numbers OR shapes). A
// distinct act from constant-step counting (`sequence`) and single-stimulus pick
// (`shape-pick`). Isolated — emits the chosen next item's value.
// ============================================================================
function widgetPattern(host, v, onAnswer){
  const track=document.createElement('div');
  track.style='display:flex;flex-wrap:wrap;gap:6px;justify-content:center;align-items:center;margin:6px 0';
  const card=inner=>{ const c=document.createElement('div');
    c.style='min-width:44px;height:50px;border:2px solid #bfe2f3;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px';
    c.innerHTML=inner; return c; };
  v.seq.forEach(it=>track.appendChild(card(v.itemType==='shape' ? _shapeSVG(it,34) : toHindi(it))));
  const q=card('؟'); q.style.borderColor='#F39A1F'; q.style.borderStyle='dashed'; q.style.color='#F39A1F';
  track.appendChild(q);
  host.appendChild(track);
  const info=document.createElement('div'); info.className='muted'; info.style='text-align:center';
  info.textContent='اختر ما يُكمل النمط.';
  const opts=document.createElement('div'); opts.style='display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:6px';
  v.options.forEach(o=>{
    let btn;
    if(v.itemType==='shape'){ btn=_optBtn(o.v, _shapeSVG(o.shape,40)); btn.onclick=()=>{ info.textContent='اخترت: '+o.v; onAnswer(o.v); }; }
    else { btn=document.createElement('button'); btn.className='sec'; btn.style='font-weight:800;min-width:46px'; btn.textContent=toHindi(o);
      btn.onclick=()=>{ info.textContent='اخترت: '+toHindi(o); onAnswer(o); }; }
    opts.appendChild(btn);
  });
  host.appendChild(info); host.appendChild(opts);
}
