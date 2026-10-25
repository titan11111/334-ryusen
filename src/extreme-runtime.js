// Game-specific controller adapter. Titan Controller API 1 remains unchanged.
var RRC = {keys:new Set(), pointers:new Map(), lastRepeat:-1, impulse:false};
function RRClear() { RRC.keys.clear(); RRC.pointers.clear(); RRC.lastRepeat=-1;RRC.impulse=false; ds=[]; RRFeedback(); }
function RRButtons() {
  const names = {stroke:['A','漕ぐ','Z / F'],act:['B','減速','X / E'],jump:['R','踏ん張る','SPACE']};
  for (const [name, parts] of Object.entries(names)) {
    const button=document.querySelector('[data-titan-action="'+name+'"]');
    button.innerHTML='<b>'+parts[0]+'</b><span>'+parts[1]+'</span><small>'+parts[2]+'</small>';
    button.setAttribute('aria-label',parts[0]+' '+parts[1]);
  }
  const pad=document.querySelector('[data-titan-pad]');
  pad.insertAdjacentHTML('beforeend','<span class="rr-pad-label">操船</span>');
  document.body.insertAdjacentHTML('beforeend','<div id="rrDanger" role="status"><span id="rrKind"></span><b id="rrSeconds"></b><span id="rrAction"></span></div><div id="rrExpedition"></div>');
}
function RRAction() {
  const all=new Set(RRC.pointers.values());
  if (['KeyF','KeyZ','KeyJ'].some(k=>RRC.keys.has(k))) all.add('stroke');
  if (['KeyE','KeyX','KeyK'].some(k=>RRC.keys.has(k))) all.add('act');
  if (['Space','KeyC'].some(k=>RRC.keys.has(k))) all.add('jump');
  return all;
}
function RRFeedback() {
  const actions=RRAction();
  document.querySelectorAll('[data-titan-action]').forEach(b=>{
    b.classList.toggle('rr-pressed',actions.has(b.dataset.titanAction));
    b.setAttribute('aria-pressed',actions.has(b.dataset.titanAction)?'true':'false');
  });
}
function RRPress(name) {
  if (name==='stroke' && U.phase==='playing' && !Mt) {ds.push({at:U.time});RRC.lastRepeat=U.time;}
  if (name==='act') RRC.impulse=true;
  // Sound is scheduled in the DOM input handler, subject to browser audio policy.
  if (_n && Pt?.ctx?.state==='running') {
    const osc=Pt.ctx.createOscillator(), gain=Pt.ctx.createGain(), now=Pt.ctx.currentTime;
    osc.type='square'; osc.frequency.setValueAtTime(name==='act'?155:330,now);
    gain.gain.setValueAtTime(.018,now);gain.gain.exponentialRampToValueAtTime(.001,now+.028);
    osc.connect(gain);gain.connect(Pt.ctx.destination);osc.start(now);osc.stop(now+.03);
  }
}
function RRInitControls() {
  RRButtons();
  const map={KeyF:'stroke',KeyZ:'stroke',KeyJ:'stroke',KeyE:'act',KeyX:'act',KeyK:'act',Space:'jump',KeyC:'jump'};
  addEventListener('keydown',ev=>{
    if (!map[ev.code] || ev.metaKey || ev.ctrlKey || /INPUT|TEXTAREA|SELECT/.test(ev.target.tagName)) return;
    ev.preventDefault(); if (!RRC.keys.has(ev.code)) RRPress(map[ev.code]);
    RRC.keys.add(ev.code);RRFeedback();
  });
  addEventListener('keyup',ev=>{RRC.keys.delete(ev.code);RRFeedback();});
  const host=document.querySelector('[data-titan-controls]');
  host.addEventListener('pointerdown',ev=>{
    const button=ev.target.closest('[data-titan-action]');
    if (!button || ev.pointerType==='mouse'&&ev.button!==0) return;
    const name=button.dataset.titanAction;RRC.pointers.set(ev.pointerId,name);RRPress(name);RRFeedback();
  },true);
  // Pointer capture stays with the original button; hit-testing implements thumb sliding.
  addEventListener('pointermove',ev=>{
    if (!RRC.pointers.has(ev.pointerId)) return;
    const hit=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('[data-titan-action]');
    const next=hit?.dataset.titanAction||'', previous=RRC.pointers.get(ev.pointerId);
    if (next!==previous) {RRC.pointers.set(ev.pointerId,next);if(next)RRPress(next);RRFeedback();}
  },true);
  for (const name of ['pointerup','pointercancel','lostpointercapture']) addEventListener(name,ev=>{RRC.pointers.delete(ev.pointerId);RRFeedback();},true);
  addEventListener('blur',RRClear);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)RRClear();});
}
function RRInput(base) {
  const actions=RRAction();
  return {...base,actions:{stroke:actions.has('stroke'),act:actions.has('act'),jump:actions.has('jump')}};
}
function RRPulse(state,dt,input) {
  if (RRC.impulse) {state.brakeImpulse=true;RRC.impulse=false;}
  const now=state.time;
  if (input.actions.stroke && !input.actions.act && !input.actions.jump && now-RRC.lastRepeat>.48) {
    if (!ds.length)ds.push({at:now});RRC.lastRepeat=now;
  }
  ds=ds.filter(p=>now-p.at<=.05);
  if (!ds.length || input.actions.act || input.actions.jump || (state.recovery||0)>.05
      || now-(state.lastStroke??-10)<.24) return false;
  ds.shift();return true;
}
function RRUpdateHUD() {
  const active=['playing','countdown'].includes(U.phase)&&!Mt;
  const box=document.getElementById('rrDanger'), d=U.danger;
  box.style.display=active&&d?'flex':'none';
  if(active&&d){
    box.dataset.urgent=d.seconds<1?'true':'false';
    document.getElementById('rrKind').textContent=d.kind==='fall'?d.height+'m 落差':'岩';
    document.getElementById('rrSeconds').textContent=d.seconds.toFixed(1)+'秒';
    document.getElementById('rrAction').textContent=d.action;
  }
  const note=document.getElementById('rrExpedition');
  note.style.display=active?'block':'none';
  note.textContent=U.mode==='scenic'?'TOURING ×1':'EXTREME ×3.25';
  document.body.classList.toggle('rr-racing',active);
}

// Region-specific expedition dossier. Ceremonial dress is documented, never used as rafting PPE.
var RRREGIONS={
  sogi:{title:'JAPAN · 千畳岩と白い水脈',text:'鹿児島県伊佐市。実在の曽木の滝は幅210m・高さ12m。広い岩床、細く分かれる水脈、山の緑を景観へ反映。レース航路と追加の落差は創作。',culture:'衣装：船頭の作業着に救命胴衣。実在の観光川下りとは異なる架空競技。'},
  zambezi:{title:'BATOKA · 玄武岩の峡谷',text:'ザンビア／ジンバブエ。ヴィクトリアの滝の下流にあるバトカ峡谷。黒い断崖、強い反転流、大きな立ち波が主役。滝本体を下る再現ではない。',culture:'文化：ロジのMusisi／SizibaとKuombokaはザンビア西部の文化。バトカ峡谷の一律の衣装とは扱わない。乗員はヘルメットと救命胴衣。'},
  iguazu:{title:'IGUAZÚ · 大西洋林と水煙',text:'アルゼンチン／ブラジル国境。玄武岩に広がる多数の滝と亜熱帯雨林。重なる瀑布、水煙、幅のある水路を景観へ反映。悪魔の喉笛の実航路ではない。',culture:'文化：グアラニーの故地。Ao Po’i／Ñandutíはパラグアイの織物文化として区別し、未検証の民族衣装名や全員共通の羽飾りは使わない。'}
};
function RRDossier() {
  if(!RRREGIONS)return;
  const r=RRREGIONS[fr];
  const el=document.getElementById('rrDossier');
  if(el)el.innerHTML='<summary>現地を知る · 景観と装い</summary><b>'+r.title+'</b><p>'+r.text+'</p><p>'+r.culture+'</p><p>速度はゲーム内演出値。計測地形・流体解析に基づく再現ではありません。</p>';
}
