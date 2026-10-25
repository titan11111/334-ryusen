// Readable race tactics. Uses the same foam, rock bed and light as the expedition.
var RRCurrentLines=[],RRSkillsClock=0,RRRightingRoll=new WeakMap();
function RRInitCurrentLines(){
  if(RRCurrentLines.length)return;
  for(let k=0;k<3;k++){
    const geometry=new ct();geometry.setAttribute('position',new vt(new Float32Array(72*3),3));
    const mesh=new Zi(geometry,new Mi({color:k===0?'#cadac4':k===1?'#f6fff0':'#c4e9e1',transparent:true,opacity:.5,depthWrite:false}));
    mesh.frustumCulled=false;mesh.visible=false;Ft.add(mesh);RRCurrentLines.push(mesh);
  }
}
function RRUpdateCurrentLines(){
  if(!RRCurrentLines.length)return;
  const route=RRRouteAt(U.s+Math.min(110,U.speed*1.5),U.courseId)||RRRouteAt(U.s,U.courseId);
  for(let lane=0;lane<3;lane++){
    const mesh=RRCurrentLines[lane];mesh.visible=!!(route&&U.race&&U.phase==='playing'&&!U.capsized);
    if(!mesh.visible)continue;
    const points=mesh.geometry.attributes.position,start=Math.max(route.start,U.s-8),end=Math.min(route.end,U.s+260);
    for(let k=0;k<36;k++)for(let j=0;j<2;j++){
      const s=start+(end-start)*(k*2+j)/(72-1),path=RRRouteAt(Math.min(route.end-.1,s),U.courseId);
      const offset=path.lanes[lane].offset+Math.sin(s*.21-pt*5)*.13;
      points.setXYZ(k*2+j,Fe(s)+offset,$e(s)+dn(s,offset,pt)+.13,-s);
    }
    points.needsUpdate=true;
    mesh.material.opacity=.22+(lane===1?.12:0)+Math.sin(pt*2+lane)*.035;
  }
}
function RRSkillEvent(event){
  if(event.type==='cutback'){mn('切り返し！ 勢いを残して出口へ',1.6);RRPlayFeedback('pass',.3);}
  if(event.type==='wave'&&event.chain>0)mn('波乗り '+event.chain+'連鎖 — 次の山を読め',1.2);
  if(event.type==='capsize'){mn('転覆！ Aを10回押して船を起こせ',2);RRPlayFeedback('impact',.55);}
  if(event.type==='righting')RRPlayFeedback('act',.14);
  if(event.type==='righted'){mn('復帰！ ライバルを追いかけろ',2);RRPlayFeedback('pass',.5);}
}
function RRApplyCapsizePose(group,state,dt){
  let roll=RRRightingRoll.get(group)||0;
  const target=state.capsized?Math.PI*(1-.72*(state.recoveryTaps||0)/(state.recoveryGoal||10)):0;
  roll+=(target-roll)*(1-Math.exp(-Math.max(0,dt)*9));
  if(Math.abs(roll)<.0001)roll=0;RRRightingRoll.set(group,roll);group.rotation.z+=roll;
}
function RRUpdateSkills(dt){
  RRSkillsClock+=Math.max(dt,1/60);RRUpdateTerrainVisibility(U.s);RRUpdateCurrentLines();
  document.body.classList.toggle('rr-capsized',!!U.capsized&&U.phase==='playing');
  RRApplyCapsizePose(pn,U,dt);gn.forEach((n,k)=>{if(Aa[k])RRApplyCapsizePose(Aa[k].group,n,dt);});
  const active=U.phase==='playing'&&!Mt,box=document.getElementById('rrFallWarning');
  const fall=active&&!U.capsized?RRDropAdvice(U):null;
  box.hidden=!fall;
  if(fall){
    box.dataset.stage=fall.stage;document.getElementById('rrFallName').textContent='⚠ '+fall.height+'m '+fall.name;
    document.getElementById('rrFallTime').textContent=fall.stage==='landing'?'着水まで '+fall.landingSeconds.toFixed(1)+'秒':Math.ceil(fall.distance)+'m先 · '+fall.seconds.toFixed(1)+'秒';
    document.getElementById('rrFallAction').textContent=fall.action;
    document.getElementById('rrFallReady').textContent=fall.stage==='landing'?(U.bracing?'踏ん張り OK — そのまま保持':U.braking?'Bを離す！ Rで船体を守れ':'Rを押して船体を守れ'):U.speed<40?'減速 OK · 落下したら R':U.stamina<25?'手を休めて体力を戻せ':'まずBで速度を落とそう';
  }
  const recovery=document.getElementById('rrRighting');recovery.hidden=!(active&&U.capsized);
  if(!recovery.hidden){
    document.getElementById('rrRightingCount').textContent=U.recoveryTaps+' / '+U.recoveryGoal;
    document.getElementById('rrRightingBar').style.width=U.recoveryTaps/U.recoveryGoal*100+'%';
    document.getElementById('rrRightingTime').textContent='転覆から '+U.capsizeAge.toFixed(1)+'秒 · ライバルは進行中';
  }
  if(RRSkillsClock<.12)return;RRSkillsClock=0;
  const hint=document.getElementById('rrRiverRead');hint.hidden=!active||U.capsized;
  if(!hint.hidden){
    const route=RRRouteAt(U.s+90,U.courseId)||RRRouteAt(U.s,U.courseId);
    let text=route?(U.routeId?'現在：'+U.routeName+' ｜ ':'この先、３本の流れ ｜ ')+'岸側：安全・遠回り / 中央：速流・岩 / 外周：横流れ'
      :U.turnArmed?'切り返し準備 OK → Bを離して同じ方向＋A'
      :U.surfWindow?'波の立ち上がり！ Aで波乗り → 山はRで保持'
      :U.courseId==='zambezi'?'ザンベジ：大波は A → R。谷で手を休める'
      :U.courseId==='iguazu'?'イグアス：合流する白い筋を読み、横流れに先手を打つ'
      :'蒼霧：岩の手前で B＋左右 → Bを離して Aで切り返す';
    if(wa||innerWidth<=700){text=route?'岸側：安全 ／ 中央：速流 ／ 外周：横流れ':U.turnArmed?'切り返し：Bを離して A':U.surfWindow?'波乗り：A → 山はR':'';hint.hidden=!text;}
    if(hint.textContent!==text)hint.textContent=text;
  }
  const fps=document.getElementById('rrFPS');
  if(fps&&!fps.hidden){const p=RRPerformanceReport();fps.textContent=p.samples?'FPS '+p.fps+' · p95 '+p.p95Ms+'ms · draw '+p.drawCalls:'FPS 計測待ち';}
  const summary=document.getElementById('rrPerfSummary');
  if(Mt&&summary){const p=RRPerformanceReport();summary.textContent=p.samples?'直近 '+p.fps+' FPS / p95 '+p.p95Ms+'ms / 最大 '+p.worstMs+'ms\n開始 '+(p.phases.start?.max?.toFixed(1)||'—')+'ms / ブースト '+(p.phases.boost?.max?.toFixed(1)||'—')+'ms\nCPU：物理 '+p.stages.simulation+' / 更新 '+p.stages.scene+' / 描画送信 '+p.stages.render+'ms':'プレイを開始すると計測します。';}
}
function RRInitSkills(){
  document.body.insertAdjacentHTML('beforeend',`<div id="rrFallWarning" role="status" hidden><div><b id="rrFallName"></b><span id="rrFallTime"></span></div><strong id="rrFallAction"></strong><small id="rrFallReady"></small></div>
    <div id="rrRighting" role="status" hidden><small>CREW TOGETHER / 仲間と起こせ</small><h2>転覆！</h2><p>Aを連打して船を元に戻そう</p><b id="rrRightingCount">0 / 10</b><div class="rr-righting-meter"><i id="rrRightingBar"></i></div><span id="rrRightingTime"></span><small>長押しは無効 · A / Z / F / J · 復帰時の船体55%</small></div>
    <div id="rrRiverRead" hidden></div><output id="rrFPS" hidden></output>
    <div id="rrPreparing" hidden><div><small>DAY 100 / RIVER EXPEDITION</small><h2>川の呼吸を、待つ。</h2><p id="rrPrepareStatus">船と流れを準備…</p><i></i></div></div>`);
  const pause=document.querySelector('#pausePanel .pausebuttons');
  pause.insertAdjacentHTML('beforeend','<details class="rr-performance"><summary>FPS・処理時間を見る</summary><pre id="rrPerfSummary"></pre><button id="rrToggleFPS" type="button">FPS表示 ON / OFF</button></details>');
  document.getElementById('rrToggleFPS').onclick=()=>{const fps=document.getElementById('rrFPS');fps.hidden=!fps.hidden;};
  document.getElementById('rrFPS').hidden=!new URLSearchParams(location.search).has('fps');
  document.querySelector('.controls-note').insertAdjacentHTML('beforeend','<br>転覆したら Aを10回連打して復帰。');
  RRInitPerformance();
}
var RRStartRaceNow=su;
su=function(course,vessel,practice=false){return RRPrepareRace(course,vessel,practice);};
