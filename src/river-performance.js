// No dynamic resolution, mesh simplification or per-frame resource construction.
var RRPerf={frames:new Float32Array(360),work:new Float32Array(360),index:0,count:0,last:0,
  started:0,simEnd:0,sceneEnd:0,renderEnd:0,stages:{simulation:0,scene:0,render:0},
  phases:{},longTasks:0,longestTask:0,preparation:0,chunkMax:0,ready:false,preparing:false};
function RRPerfBegin(now=performance.now()) {
  RRPerf.started=now;
  const active=U.phase==='playing'&&!Mt;
  if(active&&RRPerf.last){
    const dt=now-RRPerf.last;
    if(dt<1000){const key=U.capsized?'capsize':U.boostTime>0?'boost':U.time<6?'start':'cruise';
      const p=RRPerf.phases[key]||(RRPerf.phases[key]={count:0,total:0,max:0,over50:0});
      p.count++;p.total+=dt;p.max=Math.max(p.max,dt);if(dt>50)p.over50++;
      RRPerf.frames[RRPerf.index]=dt;
    }
  }
  RRPerf.last=active?now:0;
}
function RRPerfMark(stage){const now=performance.now();
  if(stage==='simulation'){RRPerf.stages.simulation=now-RRPerf.started;RRPerf.simEnd=now;}
  if(stage==='scene'){RRPerf.stages.scene=now-RRPerf.simEnd;RRPerf.sceneEnd=now;}
  if(stage==='render'){RRPerf.stages.render=now-RRPerf.sceneEnd;RRPerf.renderEnd=now;
    if(U.phase==='playing'&&!Mt){RRPerf.work[RRPerf.index]=now-RRPerf.started;RRPerf.index=(RRPerf.index+1)%360;RRPerf.count=Math.min(360,RRPerf.count+1);}}
}
function RRPerformanceReport(){
  const values=Array.from(RRPerf.frames.slice(0,RRPerf.count)).filter(x=>x>0).sort((a,b)=>a-b);
  const mean=values.reduce((a,b)=>a+b,0)/(values.length||1);
  const stages={};for(const [key,value]of Object.entries(RRPerf.stages))stages[key]=+value.toFixed(2);
  return {build:'6.8-clear-river',samples:values.length,fps:mean?+(1000/mean).toFixed(1):null,
    p95Ms:values.length?+values[Math.floor((values.length-1)*.95)].toFixed(2):null,
    worstMs:values.length?+values.at(-1).toFixed(2):null,stages,phases:RRPerf.phases,
    longTasks:RRPerf.longTasks,longestTaskMs:+RRPerf.longestTask.toFixed(2),
    preparationMs:+RRPerf.preparation.toFixed(1),largestChunkMs:+RRPerf.chunkMax.toFixed(1),
    drawCalls:Xt.info?.render?.calls,triangles:Xt.info?.render?.triangles,
    pixelRatio:Xt.getPixelRatio?.(),renderer:Xt.isCompatibilityRenderer?'compatibility':'webgl',
    note:'Frame intervals are observed; render time is CPU submission time, not GPU duration.'};
}
var RRPrepared=null,RRBaseTerrain=null,RRBaseData=null,RROriginalIC=null,RRPoolReady=false,RRRivalPool=new Map();
function RRGetRival(id){return RRRivalPool.get(id)||Wh(id);}
function RRDisposeTerrain(root){
  if(!root)return;root.parent?.remove(root);
  const geometry=new Set(),materials=new Set();root.traverse(n=>{if(n.geometry)geometry.add(n.geometry);
    if(n.material)(Array.isArray(n.material)?n.material:[n.material]).forEach(m=>materials.add(m));});
  geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
}
function RRPoolWarmup(){
  if(RRPoolReady)return;RRPoolReady=true;
  const old=RRBoostItems;RRBoostItems=Array.from({length:4},()=>({active:false}));RRDrawBoosts();RRBoostItems=old;
  RRInitImpactVisuals();Sw(U.s);RRInitCurrentLines();
}
function RRNextPaint(){return new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));}
async function RRPrepareRace(courseId,vesselId,practice){
  if(RRPerf.preparing)return;RRPerf.preparing=true;RRPerf.ready=false;
  const now=performance.now(),panel=document.getElementById('rrPreparing'),status=document.getElementById('rrPrepareStatus');
  panel.hidden=false;document.getElementById('raceStartBtn').disabled=true;
  try{
    // Audio is unlocked inside the original gesture, before any awaited work.
    tp();if(Pt?.ctx.state==='suspended')Pt.ctx.resume().catch(()=>{});
    RRPrimeFeedbackAudio();RRPoolWarmup();await RRNextPaint();
    if(Pt){for(const [kind,level]of [['perfect',1],['stroke',1],['miss',1],['splash',1.35],['boat',1.2],['rock',1],['creak',1]]){
      const key=kind+':'+Math.round(level*4);if(Pt.cache.has(key))continue;
      const data=av(kind,level,Pt.ctx.sampleRate,71),buffer=Pt.ctx.createBuffer(1,data.length,Pt.ctx.sampleRate);
      buffer.copyToChannel(data,0);Pt.cache.set(key,buffer);await RRNextPaint();
    }}
    for(const spec of vf(courseId,vesselId).slice(1)){
      if(!RRRivalPool.has(spec.vesselId)){
        const view=Wh(spec.vesselId);view.group.scale.setScalar(1.2);view.group.visible=false;
        view.group.traverse(n=>{if(n.isMesh)n.castShadow=false;});
        RRRivalPool.set(spec.vesselId,view);
        // Warm facial detail along with the rig instead of on the first moving frame.
        RRDecorateCrew(view.rig,spec.vesselId);
        status.textContent='乗組員と '+At(spec.vesselId).short+'を準備…';await RRNextPaint();
      }
    }
    if(RRPrepared?.courseId!==courseId){
      if(RRPrepared){RRDisposeTerrain(RRPrepared.root);RRPrepared=null;}
      const course=js(courseId),root=new Tt();root.fog=Ft.fog;
      const all=[],rocks=Ui.filter(r=>r.s>=course.start-100&&r.s<=course.finish+160);
      const prepared={courseId,root,parts:all,result:null};RRPrepared=prepared;
      for(let a=course.start-100;a<course.finish+160;a+=540){
        const b=Math.min(course.finish+160,a+540),tick=performance.now();
        const group=new Tt();group.fog=Ft.fog;group.userData.rrTerrainRange=[a,b];root.add(group);
        const build=Tf(group,{mobile:wa,noise:eu,naturalMaterial:Xf,nGLSL:Wf,mountainHeight:Gf});
        const part=build(a,b,rocks.filter(r=>r.s>=a&&r.s<b));all.push(part);
        const look=RW[courseId];
        RWG.rock.color.set(look.rock);RWG.bank.color.set(look.bank);RWG.soil.color.set(look.soil);
        // Bank meshes clone their material, so include those clones in the region palette.
        group.traverse(n=>{if(n.material?.vertexColors&&n.material?.customProgramCacheKey?.()==='ryusen-cliff-v2')n.material.color.set(look.bank);});
        RRPerf.chunkMax=Math.max(RRPerf.chunkMax,performance.now()-tick);
        status.textContent='川面・岩肌・水煙を準備 '+Math.round((b-course.start+100)/(course.length+260)*100)+'%';
        await RRNextPaint();
      }
      const first=all[0];
      root.traverse(n=>{const uniforms=n.material?.uniforms;
        if(uniforms?.uBend)for(const key of ['uTime','uTint','uSun','fogDensity','fogColor'])uniforms[key]=first.waterUniforms[key];});
      prepared.result={start:course.start-100,end:course.finish+160,waterUniforms:first.waterUniforms,
        banks:all.flatMap(p=>p.banks),treeData:all.flatMap(p=>p.treeData),mistMaterials:all.flatMap(p=>p.mistMaterials),
        sideFalls:all.flatMap(p=>p.sideFalls),regional:{region:courseId,falls:all.reduce((s,p)=>s+p.regional.falls,0),columns:all.reduce((s,p)=>s+p.regional.columns,0)}};
      status.textContent='水と光のシェーダーを準備…';
      if(Xt.compileAsync)await Xt.compileAsync(root,nn,Ft);
      else if(Xt.compile)Xt.compile(root,nn,Ft);
    }
    RRPerf.ready=true;RRPerf.preparation=performance.now()-now;
    RRStartRaceNow(courseId,vesselId,practice);
    // Upload and render the actual opening before the countdown can advance.
    const phase=U.phase;U.phase='preparing';RRUpdateTerrainVisibility(U.s);
    status.textContent='船と水面を最終準備…';await RRNextPaint();
    if(Xt.compileAsync)await Xt.compileAsync(Ft,nn);
    U.phase=phase;RRPerf.last=0;RRPerf.phases={};RRPerf.count=0;RRPerf.index=0;RRPerf.longTasks=0;RRPerf.longestTask=0;
  }catch(error){
    console.error('River preparation failed',error);RRPerf.ready=false;
    if(RRPrepared){RRDisposeTerrain(RRPrepared.root);RRPrepared=null;}
    status.textContent='準備に失敗しました。もう一度スタートしてください。';
    document.getElementById('overlay').style.display='grid';
  }finally{RRPerf.preparing=false;panel.hidden=true;document.getElementById('raceStartBtn').disabled=false;}
}
function RRUpdateTerrainVisibility(s){
  if(!RRPerf.preparing&&!['playing','countdown','preparing','won','lost'].includes(U.phase)){
    RRPrepared?.root.parent?.remove(RRPrepared.root);
    if(RRBaseTerrain&&!RRBaseTerrain.parent){Ft.add(RRBaseTerrain);Xn=RRBaseData;}
    return;
  }
  if(!RRPrepared?.root.parent)return;
  for(const group of RRPrepared.root.children){const [a,b]=group.userData.rrTerrainRange;group.visible=b>s-220&&a<s+1150;}
}
function RRInitPerformance(){
  // Identify only the generated terrain; boat, foam, lighting and control resources survive.
  for(const child of Ft.children){let match=false;child.traverse(n=>{if(n.material?.uniforms===Xn.waterUniforms)match=true;});if(match)RRBaseTerrain=child;}
  RRBaseData=Xn;
  RROriginalIC=ic;ic=function(start,end,rocks){
    if(RRPrepared?.result&&RRPrepared.result.start===start&&RRPrepared.result.end===end){
      if(RRBaseTerrain)RRBaseTerrain.parent?.remove(RRBaseTerrain);
      Ft.add(RRPrepared.root);return RRPrepared.result;
    }
    // The hidden legacy intro does not need rebuilding while preparing a regatta.
    if(RRPerf.preparing)return Xn;
    RRPrepared?.root.parent?.remove(RRPrepared.root);const terrain=RROriginalIC(start,end,rocks);
    if(terrain===RRBaseData&&RRBaseTerrain&&!RRBaseTerrain.parent)Ft.add(RRBaseTerrain);return terrain;
  };
  window.ryusenPerformance=RRPerformanceReport;
  if(typeof PerformanceObserver==='function')try{new PerformanceObserver(list=>{for(const entry of list.getEntries()){
    if(U.phase==='playing'&&!Mt){RRPerf.longTasks++;RRPerf.longestTask=Math.max(RRPerf.longestTask,entry.duration);}
  }}).observe({type:'longtask',buffered:false});}catch{}
}
