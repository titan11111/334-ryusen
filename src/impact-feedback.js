// Input feedback is dispatched by pointerdown; collision feedback uses the simulation contact point.
var RRFx={ctx:null,buffers:new Map(),debris:null,rings:[],clock:0,flash:0,reduced:typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches,stats:{presses:0,impacts:0}};
function RRSynthFeedback(kind,rate) {
  const pass=kind==='pass'||kind==='passback';
  const duration=kind==='impact'?.78:pass?.28:.045,values=new Float32Array(Math.ceil(duration*rate));
  let seed=72931,low=0,peak=0;
  for(let i=0;i<values.length;i++){
    const t=i/rate;seed=(seed*1664525+1013904223)>>>0;
    const noise=seed/2147483648-1;low=low*.91+noise*.09;
    let v;
    if(kind==='impact')v=(noise-low)*Math.exp(-t*65)*.8
      +Math.sin(Math.PI*2*(100*t-42*t*t))*Math.exp(-t*12)*.65
      +(Math.sin(t*1005)+Math.sin(t*1747)*.45)*Math.exp(-t*20)*.2
      +low*Math.exp(-t*4.8)*.9+(noise-low)*Math.exp(-t*6)*(1-Math.exp(-t*70))*.18;
    else if(pass){const frequency=kind==='pass'?580:390,slope=kind==='pass'?1800:-650;v=Math.sin(Math.PI*2*(frequency*t+slope*t*t*.5))*.55*Math.exp(-t*9);}
    else {const frequency=kind==='act'?190:kind==='jump'?250:410;v=(Math.sin(t*frequency*Math.PI*2)*.65+noise*.24)*Math.exp(-t*115);}
    values[i]=v;peak=Math.max(peak,Math.abs(v));
  }
  const gain=.94/Math.max(.94,peak);for(let i=0;i<values.length;i++)values[i]*=gain;
  return values;
}
function RRPrimeFeedbackAudio() {
  if(typeof Pt==='undefined'||!Pt||RRFx.ctx===Pt.ctx)return;
  RRFx.ctx=Pt.ctx;RRFx.buffers.clear();
  for(const kind of ['stroke','act','jump','impact','pass','passback']){
    const samples=RRSynthFeedback(kind,Pt.ctx.sampleRate),buffer=Pt.ctx.createBuffer(1,samples.length,Pt.ctx.sampleRate);
    buffer.copyToChannel(samples,0);RRFx.buffers.set(kind,buffer);
  }
  RRInitWind();
}
function RRPlayFeedback(kind,volume=1,pan=0) {
  if(typeof _n==='undefined'||!_n||typeof Pt==='undefined'||!Pt)return;
  RRPrimeFeedbackAudio();const ctx=Pt.ctx;
  if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=RRFx.buffers.get(kind);gain.gain.value=volume;
  source.connect(gain);let panner=null;
  if(ctx.createStereoPanner){panner=ctx.createStereoPanner();panner.pan.value=_f(pan,-1,1);gain.connect(panner);panner.connect(Pt.master);}
  else gain.connect(Pt.master);
  source.onended=()=>{source.disconnect();gain.disconnect();panner?.disconnect();};source.start(ctx.currentTime);
  if(kind==='impact')RRFx.stats.impacts++;else RRFx.stats.presses++;
}
function RRInitImpactVisuals() {
  if(RRFx.debris)return;
  const count=72,pos=new Float32Array(count*3),velocity=new Float32Array(count*3),life=new Float32Array(count),colors=new Float32Array(count*3);
  for(let i=0;i<count;i++){pos[i*3+1]=-500;const wood=i%3!==0;colors.set(wood?[.65,.40,.19]:[.47,.51,.48],i*3);}
  const geometry=new ct();geometry.setAttribute('position',new qe(pos,3));geometry.setAttribute('color',new qe(colors,3));
  const points=new bi(geometry,new Si({size:.11,vertexColors:true,transparent:true,opacity:.95,depthWrite:false}));points.frustumCulled=false;Ft.add(points);
  RRFx.debris={pos,velocity,life,geometry,points,cursor:0};
  const ringGeometry=new Ki(1,.035,6,32);
  for(let i=0;i<4;i++){
    const mesh=new ut(ringGeometry,new si({color:'#e9ffef',transparent:true,opacity:0,depthWrite:false}));
    mesh.rotation.x=-Math.PI/2;mesh.visible=false;Ft.add(mesh);RRFx.rings.push({mesh,life:0});
  }
  document.body.insertAdjacentHTML('beforeend','<div id="rrHitEdge" aria-hidden="true"></div>');
}
function RRImpactFeedback(event) {
  if(!['rock','bank'].includes(event.source))return false;
  RRInitImpactVisuals();const power=_f(event.force||1,.5,1.7),point=event.point||{x:pn.position.x,y:pn.position.y+.3,z:pn.position.z};
  const normal=event.normal||{x:event.side||1,z:.4};
  RRPlayFeedback('impact',(event.source==='rock'?.95:.6)*Math.min(1.2,power),(event.side||0)*.65);
  const count=Math.round(95+power*45);
  for(let k=0;k<count;k++){
    const i=Mv++%Ra;Sa[i]=.35+Un()*.6;
    Di[i*3]=point.x+(Un()-.5)*.8;Di[i*3+1]=point.y+Un()*.25;Di[i*3+2]=point.z+(Un()-.5)*.8;
    jl[i].set(normal.x*(4+Un()*12)*power+(Un()-.5)*10,4+Un()*11*power,normal.z*(3+Un()*10)*power+(Un()-.5)*9);
  }
  const debris=RRFx.debris;
  for(let k=0;k<22;k++){
    const i=debris.cursor++%debris.life.length;debris.life[i]=.35+Un()*.6;
    debris.pos.set([point.x,point.y+.2,point.z],i*3);
    debris.velocity.set([normal.x*(3+Un()*6)+(Un()-.5)*5,4+Un()*6,normal.z*(3+Un()*6)+(Un()-.5)*5],i*3);
  }
  const ring=RRFx.rings.find(r=>r.life<=0)||RRFx.rings[0];ring.life=.48;ring.mesh.position.set(point.x,point.y-.2,point.z);ring.mesh.visible=true;
  RRFx.flash=.65;document.getElementById('rrHitEdge').style.opacity=RRFx.reduced?.2:.7;
  return true;
}
function RRUpdateImpactVisuals(dt) {
  if(!RRFx.debris)return;
  const d=RRFx.debris;
  for(let i=0;i<d.life.length;i++){
    if(d.life[i]<=0){d.pos[i*3+1]=-500;continue;}
    d.life[i]-=dt;d.velocity[i*3+1]-=dt*16;
    for(let axis=0;axis<3;axis++)d.pos[i*3+axis]+=d.velocity[i*3+axis]*dt;
  }
  d.geometry.attributes.position.needsUpdate=true;
  for(const ring of RRFx.rings){ring.life=Math.max(0,ring.life-dt);ring.mesh.visible=ring.life>0;
    ring.mesh.material.opacity=ring.life/.48*.65;ring.mesh.scale.setScalar(1+(1-ring.life/.48)*5);}
  RRFx.flash=Math.max(0,RRFx.flash-dt*4);
  const edge=document.getElementById('rrHitEdge');if(edge)edge.style.opacity=RRFx.flash;
}
