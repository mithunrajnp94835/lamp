const $=s=>document.querySelector(s);

// ---------- starter sets ----------
const DEF=[
{id:1,name:'RGB loop',steps:[{t:'solid',c:'#ff0000',d:2},{t:'solid',c:'#00ff00',d:2},{t:'solid',c:'#0000ff',d:2}]},
{id:2,name:'Party blink',steps:[{t:'blink',c:'#ff2bd6',d:2},{t:'blink',c:'#00e5ff',d:2},{t:'blink',c:'#ffe600',d:2}]},
{id:3,name:'Soft breathing',steps:[{t:'breathe',c:'#ff5a1f',d:4},{t:'breathe',c:'#8a2be2',d:4},{t:'breathe',c:'#00c2ff',d:4}]},
{id:4,name:'Rainbow drift',steps:[{t:'rainbow',c:'#ff0000',d:8}]},
{id:5,name:'Warm fade',steps:[{t:'fade',c:'#ff8a00',d:3},{t:'fade',c:'#ff2d55',d:3},{t:'fade',c:'#ffd9a0',d:3}]}];

const TYPES={fade:'Smooth fade to colour',solid:'Instant change',breathe:'Breathe (brightness up and down)',softblink:'Soft blink',blink:'Hard blink',strobe:'Strobe',flicker:'Candle flicker',rainbow:'Rainbow sweep from colour'};

const NEW=[
{id:6,name:'Smooth RGB',steps:[{t:'fade',c:'#ff0000',d:2},{t:'fade',c:'#00ff00',d:2},{t:'fade',c:'#0000ff',d:2}]},
{id:7,name:'Candle',steps:[{t:'flicker',c:'#ff7a18',d:10}]},
{id:8,name:'Soft pulse',steps:[{t:'softblink',c:'#ff2bd6',d:4},{t:'softblink',c:'#00e5ff',d:4}]}];

// ---------- state + storage ----------
let sets,cur=0,playing=false,si=0,t0=0,sel=new Set(),selMode=false;
try{sets=JSON.parse(localStorage.getItem('ledsets'));if(localStorage.getItem('ledver')!=='2'){if(Array.isArray(sets)&&sets.length)sets=sets.concat(NEW);localStorage.setItem('ledver','2')}}catch(e){}
if(!Array.isArray(sets)||!sets.length)sets=DEF.concat(NEW);
const save=()=>{try{localStorage.setItem('ledsets',JSON.stringify(sets))}catch(e){}};
const esc=s=>String(s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));

// ---------- colour helpers ----------
const hex=h=>[1,3,5].map(i=>parseInt(h.substr(i,2),16));
function hsv(h){h=(h%360)/60;const f=h%1,q=1-f,i=Math.floor(h);return[[1,f,0],[q,1,0],[0,1,f],[0,q,1],[f,0,1],[1,0,q]][i].map(v=>v*255)}
const ease=p=>p*p*(3-2*p);
function hueOf([r,g,b]){const m=Math.max(r,g,b),n=Math.min(r,g,b),d=m-n;if(!d)return 0;const h=m===r?((g-b)/d)%6:m===g?(b-r)/d+2:(r-g)/d+4;return(h*60+360)%360}

// ---------- light engine ----------
function rend(st,p,el){
 const c=hex(st.c);let b=1,col=c;
 switch(st.t){
  case'blink':b=Math.floor(el/.5)%2?0:1;break;
  case'strobe':b=Math.floor(el/.08)%2?0:1;break;
  case'softblink':b=(1+Math.cos(2*Math.PI*el/1.2))/2;break;
  case'breathe':b=(1-Math.cos(2*Math.PI*p))/2;break;
  case'flicker':b=Math.min(1,Math.max(.3,.72+.18*Math.sin(el*9)+.1*Math.sin(el*23.7+1)*Math.sin(el*5.3)));break;
  case'rainbow':col=hsv(hueOf(c)+p*360);break}
 return col.map(v=>v*b)}

let shown=[30,30,40],from=null;
function paint(c,b=1){
 shown=c.map(v=>v*b);
 document.documentElement.style.setProperty('--c',`rgb(${shown.map(v=>Math.round(v)).join(',')})`)}
const endColor=st=>hex(st.c);
const HARD=['solid','blink','strobe'];

function frame(now){
 if(!playing)return;
 const s=sets[cur];
 if(!s||!s.steps.length){stop();return}
 let st=s.steps[si%s.steps.length],el=(now-t0)/1000;
 while(el>=st.d){from=rend(st,1,st.d);t0+=st.d*1000;si++;st=s.steps[si%s.steps.length];el=(now-t0)/1000}
 let out=rend(st,el/st.d,el);
 const bl=st.t==='fade'?st.d:Math.min(.6,st.d/3);
 if(from&&!HARD.includes(st.t)&&el<bl){const k=ease(el/bl);out=from.map((v,i)=>v+(out[i]-v)*k)}
 paint(out);
 requestAnimationFrame(frame)}
function start(){
 if(!sets[cur])return;playing=true;si=0;t0=performance.now();from=shown.slice();
 $('#play').innerHTML='&#9632;';requestAnimationFrame(frame)}
function stop(){playing=false;$('#play').innerHTML='&#9654;';idle()}
function idle(){const s=sets[cur];if(s&&s.steps[0])paint(endColor(s.steps[0]),.3);else paint([60,60,70],1)}
function go(i){
 cur=(i+sets.length)%sets.length;
 if(playing){si=0;t0=performance.now();from=null}else idle();
 draw()}
$('#play').onclick=()=>playing?stop():start();
$('#prev').onclick=()=>go(cur-1);
$('#next').onclick=()=>go(cur+1);

// ---------- list UI ----------
function draw(){
 $('#now').textContent=sets[cur]?sets[cur].name:'No sets yet';
 const bar=$('#bar');
 if(selMode){
  bar.innerHTML=`<h2>${sel.size} selected</h2><span class="row" style="margin:0"><button class="glass pill" id="cx">Cancel</button><button class="glass pill danger" id="del">Delete</button></span>`;
  $('#cx').onclick=()=>{selMode=false;sel.clear();draw()};
  $('#del').onclick=()=>{
   if(!sel.size)return;
   const curId=sets[cur]&&sets[cur].id;
   sets=sets.filter(s=>!sel.has(s.id));
   const k=sets.findIndex(s=>s.id===curId);cur=k<0?0:k;
   sel.clear();selMode=false;save();
   if(playing&&!sets.length)stop();else if(playing){si=0;t0=performance.now()}
   draw();if(!playing)idle()};
 }else{
  bar.innerHTML=`<h2>Sets</h2><button class="glass pill" id="add">+ New set</button>`;
  $('#add').onclick=()=>edit(null)}
 const ul=$('#list');
 ul.innerHTML=sets.map((s,i)=>{
  const g=s.steps.map(x=>x.t==='rainbow'?'#f0f':x.c);
  const bg=g.length>1?`linear-gradient(90deg,${g.join(',')})`:(g[0]||'#333');
  return`<li data-id="${s.id}" class="${i===cur?'active':''} ${sel.has(s.id)?'sel':''}"><span class="h" title="Drag to reorder">&#10303;</span><span class="sw" style="background:${bg}"></span><span class="nm"><b>${esc(s.name)}</b><small>${s.steps.length} step${s.steps.length===1?'':'s'}</small></span><button class="ed" aria-label="Edit set">&#9998;</button></li>`}).join('');
 if(!sets.length)ul.innerHTML='<li style="cursor:default;color:var(--mut)">No sets. Tap “New set” to make one.</li>';
 wire()}

// ---------- tap, long-press, drag to reorder ----------
function wire(){
 document.querySelectorAll('#list li[data-id]').forEach(li=>{
  const id=+li.dataset.id;let timer,sx,sy,fired=false;
  li.querySelector('.ed').onclick=e=>{e.stopPropagation();edit(id)};
  li.addEventListener('pointerdown',e=>{
   if(e.target.closest('.h,.ed'))return;
   sx=e.clientX;sy=e.clientY;fired=false;
   timer=setTimeout(()=>{fired=true;selMode=true;sel.add(id);if(navigator.vibrate)try{navigator.vibrate(30)}catch(_){}draw()},550)});
  const cancel=()=>clearTimeout(timer);
  li.addEventListener('pointermove',e=>{if(Math.abs(e.clientX-sx)>8||Math.abs(e.clientY-sy)>8)cancel()});
  li.addEventListener('pointerup',cancel);li.addEventListener('pointercancel',cancel);
  li.addEventListener('contextmenu',e=>e.preventDefault());
  li.onclick=e=>{
   if(e.target.closest('.h,.ed')||fired)return;
   if(selMode){sel.has(id)?sel.delete(id):sel.add(id);if(!sel.size)selMode=false;draw()}
   else go(sets.findIndex(s=>s.id===id))};
  const h=li.querySelector('.h');
  h.addEventListener('pointerdown',e=>{
   e.preventDefault();h.setPointerCapture(e.pointerId);li.classList.add('dragging');
   const ul=li.parentNode;
   const mv=ev=>{
    const o=document.elementFromPoint(ev.clientX,ev.clientY),t=o&&o.closest('#list li[data-id]');
    if(t&&t!==li){const r=t.getBoundingClientRect(),after=ev.clientY>r.top+r.height/2;
     if(after&&t.nextSibling!==li)ul.insertBefore(li,t.nextSibling);
     else if(!after&&t.previousSibling!==li)ul.insertBefore(li,t)}
    if(ev.clientY>innerHeight-60)scrollBy(0,10);else if(ev.clientY<60)scrollBy(0,-10)};
   const up=()=>{
    h.removeEventListener('pointermove',mv);h.removeEventListener('pointerup',up);h.removeEventListener('pointercancel',up);
    const curId=sets[cur]&&sets[cur].id;
    const order=[...ul.querySelectorAll('li[data-id]')].map(x=>+x.dataset.id);
    sets=order.map(i=>sets.find(s=>s.id===i));
    cur=Math.max(0,sets.findIndex(s=>s.id===curId));save();draw()};
   h.addEventListener('pointermove',mv);h.addEventListener('pointerup',up);h.addEventListener('pointercancel',up)})})}

// ---------- set editor ----------
let ed=null;
function edit(id){
 const s=id==null?{id:Date.now(),name:'New set',steps:[{t:'fade',c:'#ff0000',d:2}],isNew:true}:JSON.parse(JSON.stringify(sets.find(x=>x.id===id)));
 ed=s;sheet();$('#ov').classList.add('on')}
function sheet(){
 $('#sheet').innerHTML=`<input class="nameIn" id="nm" value="${esc(ed.name)}" maxlength="40" aria-label="Set name">`+
 ed.steps.map((x,i)=>`<div class="stp" data-i="${i}"><div class="row"><select data-k="t" aria-label="Transition">${Object.entries(TYPES).map(([k,v])=>`<option value="${k}"${x.t===k?' selected':''}>${v}</option>`).join('')}</select><button class="ed" data-rm="${i}" aria-label="Remove step">&#10005;</button></div><div class="row"><label>Colour</label><input type="color" data-k="c" value="${x.c}"><label>Time</label><input type="number" data-k="d" min="0.5" max="60" step="0.5" value="${x.d}" aria-label="Seconds"><label>s</label></div></div>`).join('')+
 `<div class="acts"><button class="glass pill" id="addst">+ Add step</button><span class="row" style="margin:0"><button class="glass pill" id="ccl">Cancel</button><button class="glass pill" id="sv">Save set</button></span></div>`;
 $('#nm').oninput=e=>ed.name=e.target.value;
 document.querySelectorAll('#sheet .stp').forEach(r=>{
  const i=+r.dataset.i;
  r.querySelectorAll('[data-k]').forEach(f=>f.onchange=()=>{
   const k=f.dataset.k;ed.steps[i][k]=k==='d'?Math.max(.5,parseFloat(f.value)||2):f.value;if(k==='t')sheet()});
  r.querySelector('[data-rm]').onclick=()=>{ed.steps.splice(i,1);sheet()}});
 $('#addst').onclick=()=>{const p=ed.steps[ed.steps.length-1];ed.steps.push({t:p?p.t:'fade',c:'#ffffff',d:p?p.d:2});sheet()};
 $('#ccl').onclick=()=>{$('#ov').classList.remove('on')};
 $('#sv').onclick=()=>{
  if(!ed.steps.length)return;
  ed.name=ed.name.trim()||'Untitled';
  const isNew=ed.isNew;delete ed.isNew;
  if(isNew)sets.push(ed);else sets=sets.map(x=>x.id===ed.id?ed:x);
  if(isNew)cur=sets.length-1;
  save();$('#ov').classList.remove('on');
  if(playing){si=0;t0=performance.now()}
  draw();if(!playing)idle()}}
$('#ov').onclick=e=>{if(e.target.id==='ov')$('#ov').classList.remove('on')};

draw();idle();