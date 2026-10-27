'use strict';
const $ = id => document.getElementById(id);
const KEY = 'ai-society-picker-v1';
let state = { history: [], excluded: [] }, busy = false, storageOK = true;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
function readState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {history:[],excluded:[]};
    const s = JSON.parse(raw);
    if (!Array.isArray(s.history) || !Array.isArray(s.excluded)) throw Error();
    const seen = new Set();
    return { history: s.history.filter(h => h && NAMES.includes(h.name) && typeof h.at === 'string' && !seen.has(h.name) && seen.add(h.name)), excluded: [...new Set(s.excluded.filter(n => NAMES.includes(n)))] };
  } catch { storageOK=false; $('storageError').hidden=false; return state; }
}
function save() { try {localStorage.setItem(KEY,JSON.stringify(state));storageOK=true;$('storageError').hidden=true;} catch {storageOK=false;$('storageError').hidden=false;} }
function pool() {return NAMES.filter(n => !state.excluded.includes(n) && !state.history.some(h => h.name === n));}
function randomIndex(length) { const a = new Uint32Array(1), limit = Math.floor(4294967296 / length)*length; do {crypto.getRandomValues(a);} while(a[0]>=limit); return a[0]%length; }
function render() {
  const left=pool().length;
  $('counter').textContent=`${left}명 대기 중`;
  $('drawnCount').textContent=state.history.length;
  $('rosterCount').textContent=`${NAMES.length-state.excluded.length}명 선택`;
  $('draw').disabled=busy||!left;
  $('draw').querySelector('span').textContent=busy?'두근두근, 추첨 중…':left?(state.history.length?'다음 한 명 뽑기':'한 명 뽑기'):'모두 뽑았어요';
  $('reset').disabled=busy||!state.history.length;
  $('empty').hidden=!!state.history.length;
  $('history').replaceChildren(...state.history.map((h,i)=>{const li=document.createElement('li'),b=document.createElement('b');b.textContent=String(i+1).padStart(2,'0');li.append(b,document.createTextNode(h.name));return li;}));
  $('rosterList').replaceChildren(...NAMES.map(name=>{
    const label=document.createElement('label'),input=document.createElement('input');
    const picked=state.history.some(h=>h.name===name);input.type='checkbox';input.checked=!state.excluded.includes(name);input.disabled=busy||picked;
    if(picked)label.className='picked';
    input.addEventListener('change',()=>{if(input.checked)state.excluded=state.excluded.filter(n=>n!==name);else state.excluded.push(name);save();render();});
    label.append(input,document.createTextNode(name));return label;
  }));
}
function showLast(){
  const last=state.history.at(-1);
  $('window').parentElement.classList.toggle('winner',!!last);
  $('name').textContent=last?last.name:'누구의 차례일까요?';
  $('before').textContent=last?`${state.history.length}번째 주인공`:'두근두근';
  $('after').textContent=last?'마이크를 받아 주세요!':'준비됐나요?';
  $('status').textContent=last?'선정 완료! 다음 추첨에서는 자동으로 제외돼요.':'모두에게 같은 확률, 한 번에 한 명씩.';
}
async function draw(){
  if(busy||!pool().length)return;
  busy=true;render();
  let candidates,winner;
  const choose=()=>{if(storageOK)state=readState();candidates=pool();if(!candidates.length)return;winner=candidates[randomIndex(candidates.length)];state.history.push({name:winner,at:new Date().toISOString()});save();};
  try { if(navigator.locks)await navigator.locks.request(KEY,choose);else choose(); }
  catch { busy=false;render();$('announcement').textContent='추첨을 시작하지 못했습니다. 다시 눌러 주세요.';return; }
  if(!winner){busy=false;render();showLast();return;}
  const machine=$('window').parentElement;
  machine.classList.remove('winner');machine.classList.add('spinning');
  $('announcement').textContent='발표자를 뽑고 있습니다.';
  $('status').textContent='오늘의 주인공을 찾고 있어요…';
  if(!reduced.matches)await new Promise(resolve=>{
    const start=performance.now();let last=0;
    function tick(now){const elapsed=now-start;if(elapsed>=2900){resolve();return;}
      const interval=elapsed<1600?65:65+(elapsed-1600)*.23;
      if(now-last>=interval){const index=randomIndex(candidates.length);$('name').textContent=candidates[index];$('before').textContent=candidates[(index+candidates.length-1)%candidates.length];$('after').textContent=candidates[(index+1)%candidates.length];last=now;}
      requestAnimationFrame(tick);
    }requestAnimationFrame(tick);
  });
  machine.classList.remove('spinning');busy=false;render();showLast();
  $('announcement').textContent=`${winner} 님이 선정됐습니다. 남은 학생은 ${pool().length}명입니다.`;
  if(!reduced.matches)confetti();
}
let confettiFrame;
function confetti(){
  cancelAnimationFrame(confettiFrame);const canvas=$('confetti'),ctx=canvas.getContext('2d'),w=innerWidth,h=innerHeight,d=Math.min(devicePixelRatio||1,2);canvas.width=w*d;canvas.height=h*d;ctx.setTransform(d,0,0,d,0,0);
  const colors=['#bd392a','#f5dc6d','#549987','#5e79ad','#d782a2'];
  const pieces=Array.from({length:90},()=>({x:w/2,y:h*.38,vx:(Math.random()-.5)*20,vy:-8-Math.random()*11,size:4+Math.random()*6,color:colors[Math.floor(Math.random()*colors.length)],r:Math.random()*6}));
  const start=performance.now();let previous=start;
  function frame(now){const age=now-start,dt=Math.min((now-previous)/16.67,2);previous=now;ctx.clearRect(0,0,w,h);ctx.globalAlpha=Math.max(0,1-(age-1400)/900);pieces.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=.24*dt;p.r+=.05*dt;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.r);ctx.fillStyle=p.color;ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size*.55);ctx.restore();});if(age<2300)confettiFrame=requestAnimationFrame(frame);else ctx.clearRect(0,0,w,h);}
  confettiFrame=requestAnimationFrame(frame);
}
$('draw').addEventListener('click',draw);
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&!['BUTTON','INPUT','SUMMARY','TEXTAREA'].includes(document.activeElement.tagName)&&!$('resetDialog').open){e.preventDefault();draw();}});
$('reset').addEventListener('click',()=>$('resetDialog').showModal());
$('cancelReset').addEventListener('click',()=>$('resetDialog').close());
$('confirmReset').addEventListener('click',()=>{state.history=[];save();render();showLast();$('resetDialog').close();$('announcement').textContent='추첨 기록을 초기화했습니다.';$('draw').focus();});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('announcement').textContent='이 브라우저에서는 전체 화면을 지원하지 않습니다.';}});
document.addEventListener('fullscreenchange',()=>{$('fullscreen').textContent=document.fullscreenElement?'전체 화면 닫기':'전체 화면';});
window.addEventListener('storage',e=>{if(e.key===KEY&&!busy){state=readState();render();showLast();}});
state=readState();render();showLast();
