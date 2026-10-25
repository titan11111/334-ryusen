// Game-specific controller adapter. Titan Controller API 1 remains unchanged.
var RRC = {keys:new Set(), pointers:new Map(), lastRepeat:-1, impulse:false,buttons:new Map(),shown:new Map()};
var RRBoostViews=[];
function RRDrawBoosts() {
  const playing=['playing','countdown'].includes(U.phase)&&!Mt&&U.race;
  while(RRBoostViews.length<RRBoostItems.length){
    const group=new Tt(),rotor=new Tt();
    const gold=new Lt({color:'#eea43b',metalness:.5,roughness:.35});
    const dark=new Lt({color:'#25383b',metalness:.6,roughness:.4});
    const glow=new Lt({color:'#a5f8ed',emissive:'#43c8b6',emissiveIntensity:1.4});
    group.add(new ut(new Mn(1.15,.72,1.45),gold));
    for(const x of [-.67,.67]){const can=new ut(new ln(.23,.23,1.5,8),dark);can.rotation.x=Math.PI/2;can.position.x=x;group.add(can);}
    const core=new ut(new Mn(.65,.36,.12),glow);core.position.set(0,.1,-.78);group.add(core);
    rotor.position.z=.9;
    rotor.add(new ut(new Mn(1.5,.14,.06),dark),new ut(new Mn(.14,1.5,.06),dark));group.add(rotor);
    const halo=new ut(new Ki(1.25,.045,6,24),glow);halo.rotation.x=Math.PI/2;halo.position.y=-.6;group.add(halo);
    Ft.add(group);RRBoostViews.push({group,rotor});
  }
  RRBoostViews.forEach((view,i)=>{
    const item=RRBoostItems[i];view.group.visible=!!(playing&&item?.active&&!item.taken&&Math.abs(item.s-U.s)<300);
    if(!view.group.visible)return;
    view.group.position.set(Fe(item.s)+item.offset,$e(item.s)+dn(item.s,item.offset,pt)+.95+Math.sin(pt*3+i)*.12,-item.s);
    view.group.rotation.set(Math.sin(pt*2+i)*.08,-Math.atan2(Fv(item.s),1)+Math.sin(pt+i)*.18,Math.cos(pt*2.4+i)*.1);
    view.rotor.rotation.z=pt*8;
  });
}
function RRClear() { RRC.keys.clear(); RRC.pointers.clear(); RRC.lastRepeat=-1;RRC.impulse=false; ds=[]; RRFeedback(); }
function RRButtons() {
  const names = {stroke:['A','漕ぐ','Z / F'],act:['B','減速','X / E'],jump:['R','踏ん張る','SPACE']};
  for (const [name, parts] of Object.entries(names)) {
    const button=document.querySelector('[data-titan-action="'+name+'"]');
    button.innerHTML='<b>'+parts[0]+'</b><span>'+parts[1]+'</span><small>'+parts[2]+'</small>';
    button.setAttribute('aria-label',parts[0]+' '+parts[1]);
    RRC.buttons.set(name,button);
  }
  const pad=document.querySelector('[data-titan-pad]');
  pad.insertAdjacentHTML('beforeend','<span class="rr-pad-label">操船</span>');
  document.body.insertAdjacentHTML('beforeend','<div id="rrDanger" role="status"><span id="rrKind"></span><b id="rrSeconds"></b><span id="rrAction"></span></div><div id="rrExpedition"></div><div id="rrBoostMeter"><b>ENGINE ×2</b><span></span><i></i></div><div id="rrSpeedLines" aria-hidden="true"></div>');
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
  RRC.buttons.forEach((b,name)=>{
    const pressed=actions.has(name);if(RRC.shown.get(name)===pressed)return;
    RRC.shown.set(name,pressed);b.classList.toggle('rr-pressed',pressed);
    b.setAttribute('aria-pressed',pressed?'true':'false');
  });
}
function RRPress(name) {
  const button=RRC.buttons.get(name);
  if(button?.animate&&!RRFx.reduced)button.animate([{filter:'brightness(1.9)',transform:'translateY(5px) scale(.91)'},{filter:'brightness(1.1)',transform:'translateY(3px) scale(.97)'}],{duration:85});
  if (name==='stroke' && U.phase==='playing' && !Mt) {ds.push({at:U.time});RRC.lastRepeat=U.time;}
  if (name==='act') RRC.impulse=true;
  RRPlayFeedback(name,.22);
  if(typeof navigator!=='undefined'&&navigator.vibrate)navigator.vibrate(name==='act'?12:8);
}
function RRGameTouchTarget(target) {
  return ['playing','countdown'].includes(U.phase)&&!Mt&&!!(target?.id==='scene'||target?.closest?.('[data-titan-controls]')||target===document.body);
}
function RRTouchGuard(ev) {
  if(RRGameTouchTarget(ev.target)&&ev.cancelable)ev.preventDefault();
}
function RRPointerDown(ev) {
  const button=ev.target.closest?.('[data-titan-action]');
  if(!button||(ev.pointerType==='mouse'&&ev.button!==0)||RRC.pointers.has(ev.pointerId))return;
  if(ev.cancelable)ev.preventDefault();
  const name=button.dataset.titanAction;RRC.pointers.set(ev.pointerId,name);RRPress(name);RRFeedback();
}
function RRInitControls() {
  // Capture only hull geometry: paddles, passengers and decorative arms never enlarge it.
  const deck=Jf.attributes.position;
  RRRegisterHull('wood-player',Array.from({length:deck.count},(_,i)=>[deck.getX(i)*1.2,deck.getZ(i)*1.2]));
  for(const [id,view] of iu){
    const geometry=view.group.children[0].geometry.attributes.position;
    RRRegisterHull(id,Array.from({length:geometry.count},(_,i)=>[geometry.getX(i)*1.2,geometry.getZ(i)*1.2]));
  }
  RRInitBoatDetails();RRDecorateCrew(nu,'wood');
  RRButtons();
  const map={KeyF:'stroke',KeyZ:'stroke',KeyJ:'stroke',KeyE:'act',KeyX:'act',KeyK:'act',Space:'jump',KeyC:'jump'};
  addEventListener('keydown',ev=>{
    if (!map[ev.code] || ev.metaKey || ev.ctrlKey || ev.altKey || /INPUT|TEXTAREA|SELECT/.test(ev.target.tagName)) return;
    if(!['playing','countdown'].includes(U.phase)||Mt)return;
    ev.preventDefault(); if (!RRC.keys.has(ev.code)) RRPress(map[ev.code]);
    RRC.keys.add(ev.code);RRFeedback();
  });
  addEventListener('keyup',ev=>{RRC.keys.delete(ev.code);RRFeedback();});
  const host=document.querySelector('[data-titan-controls]');
  host.addEventListener('pointerdown',RRPointerDown,{capture:true,passive:false});
  // Pointer Events own gameplay. Touch handlers only cancel native gestures; they never fire actions.
  for(const type of ['touchstart','touchmove','touchend','gesturestart','gesturechange','gestureend','dblclick','contextmenu'])
    document.addEventListener(type,RRTouchGuard,{capture:true,passive:false});
  host.addEventListener('click',ev=>{ev.preventDefault();ev.stopImmediatePropagation();},true);
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
  if (!ds.length || input.actions.act || input.actions.jump
      || now-(state.lastStroke??-10)<.10) return false;
  ds.shift();return true;
}
function RRUpdateHUD() {
  RRPrimeFeedbackAudio();
  RRDrawBoosts();
  const active=['playing','countdown'].includes(U.phase)&&!Mt;
  const boost=document.getElementById('rrBoostMeter');
  boost.style.display=active&&U.boostTime>0?'grid':'none';
  if(U.boostTime>0){boost.querySelector('span').textContent=U.boostTime.toFixed(1)+'s · Bで解除';boost.querySelector('i').style.width=U.boostTime/2*100+'%';}
  if(U.race&&active){
    const engine=RRBoostItems.find(i=>i.active&&i.s>U.s-8&&i.s<U.s+160);
    document.getElementById('hint').textContent=engine?'金色のエンジン：取ると2秒間×2 / Bで解除':Wn(U.s)?.hint||'';
    if(RROpening(U))document.getElementById('hint').textContent=(U.combo||0)<6?'Aを長押し：まず連続6漕ぎ！':!(U.surfCount>0)?'波の山で漕ぎを重ねて波乗り！':'いい流れ！ 中央の広い水路から岩をかわせ';
  }
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
  sogi:{title:'蒼霧の滝 · 千畳岩と白い水脈',text:'蒼霧（あおぎり）の滝は架空の場所。九州の瀑布から着想した広い岩床、細く分かれる水脈、山の緑が特徴。地名、レース航路と落差は創作。',culture:'衣装：船頭の作業着に救命胴衣。実在の観光川下りとは異なる架空競技。'},
  zambezi:{title:'BATOKA · 玄武岩の峡谷',text:'ザンビア／ジンバブエ。ヴィクトリアの滝の下流にあるバトカ峡谷。黒い断崖、強い反転流、大きな立ち波が主役。滝本体を下る再現ではない。',culture:'文化：ロジのMusisi／SizibaとKuombokaはザンビア西部の文化。バトカ峡谷の一律の衣装とは扱わない。乗員はヘルメットと救命胴衣。'},
  iguazu:{title:'IGUAZÚ · 大西洋林と水煙',text:'アルゼンチン／ブラジル国境。玄武岩に広がる多数の滝と亜熱帯雨林。重なる瀑布、水煙、幅のある水路を景観へ反映。悪魔の喉笛の実航路ではない。',culture:'文化：グアラニーの故地。Ao Po’i／Ñandutíはパラグアイの織物文化として区別し、未検証の民族衣装名や全員共通の羽飾りは使わない。'}
};
function RRDossier() {
  if(!RRREGIONS)return;
  const r=RRREGIONS[fr];
  const el=document.getElementById('rrDossier');
  if(el)el.innerHTML='<summary>現地を知る · 景観と装い</summary><b>'+r.title+'</b><p>'+r.text+'</p><p>'+r.culture+'</p><p>速度はゲーム内演出値。計測地形・流体解析に基づく再現ではありません。</p>';
}

