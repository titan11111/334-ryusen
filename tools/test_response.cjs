const {c,state,html}=require('./test_extreme.cjs');
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),passed=[];
function test(name,run){run();passed.push(name);console.log('PASS',name);}
for(const source of ['impact-feedback.js','race-feedback.js','boat-details.js','crew-details.js'])vm.runInContext(fs.readFileSync(root+'/src/'+source,'utf8'),c);
// Browser-independent rig math and the exact mesh builders from the shipping HTML.
vm.runInContext(html.slice(html.indexOf('var ir='),html.indexOf('var uv=')),c);
const elements=new Map();
const body={insertAdjacentHTML(){elements.set('rrHitEdge',{style:{}});}};
c.document={body,getElementById:id=>elements.get(id),createElement(){return {width:0,height:0,getContext(){return {createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)};},putImageData(){}};}};}};
c._n=false;c.Pt=null;c.Mt=false;
function button(name){return {dataset:{titanAction:name},style:{},classList:{toggle(){}},setAttribute(){},animate(){this.animations=(this.animations||0)+1;},closest(selector){return selector==='[data-titan-action]'?this:selector==='[data-titan-controls]'?{}:null;}};}
test('touch gestures are cancelled without creating extra gameplay actions',()=>{
  c.U=state();c.ds=[];const b=button('stroke');c.RRC.buttons.set('stroke',b);
  let cancelled=0;
  for(const type of ['touchstart','touchend','touchend','dblclick','gesturestart'])c.RRTouchGuard({type,target:b,cancelable:true,preventDefault(){cancelled++;}});
  assert.equal(cancelled,5);assert.equal(c.ds.length,0);
  c.RRTouchGuard({target:{id:'audioBtn'},cancelable:true,preventDefault(){throw Error('toolbar was blocked');}});
  c.Mt=true;c.RRTouchGuard({target:b,cancelable:true,preventDefault(){throw Error('paused UI was blocked');}});c.Mt=false;
});
test('pointerdown gives immediate feedback once; fast second taps reach physics',()=>{
  c.U=state();c.ds=[];c.RRC.pointers.clear();const b=button('stroke');c.RRC.buttons.set('stroke',b);
  const event={target:b,pointerType:'touch',pointerId:1,cancelable:true,preventDefault(){}};
  c.RRPointerDown(event);c.RRPointerDown(event);assert.equal(c.ds.length,1);assert.equal(b.animations,1);
  assert(c.RRPulse(c.U,1/60,{actions:{stroke:true}}));
  const first=c.kh(c.U,1/60,{x:0,stroke:true},[]);assert(first.some(e=>e.type==='stroke'));
  c.kh(c.U,1/60,{x:0,stroke:false},[]);c.RRC.pointers.delete(1);
  c.U.time+=.12;c.RRPointerDown({...event,pointerId:2});
  const second=c.RRPulse(c.U,1/60,{actions:{stroke:true}});assert(second);
  assert(c.kh(c.U,1/60,{x:0,stroke:second},[]).some(e=>e.type==='stroke'));assert.equal(b.animations,2);
  c.RRC.pointers.clear();c.ds=[];
  c.U.time+=.12;c.U.recovery=1;c.ds=[{at:c.U.time}];assert(c.RRPulse(c.U,1/60,{actions:{}}));
});
test('cached joystick bounds avoid forced layout on repeated movement and reset safely',()=>{
  const {mount}=require('../src/titan-controller.js');let reads=0;
  const node=()=>({style:{},dataset:{},children:[],listeners:new Map(),setAttribute(){},appendChild(child){this.children.push(child);},addEventListener(type,fn){const a=this.listeners.get(type)||[];a.push(fn);this.listeners.set(type,a);},removeEventListener(){},setPointerCapture(){},getBoundingClientRect(){reads++;return {left:0,top:0,width:100,height:100};},remove(){}});
  const win=node(),doc={defaultView:win,createElement:()=>node(),addEventListener(){},removeEventListener(){}};doc.body=node();doc.body.ownerDocument=doc;
  const controller=mount({container:doc.body}),pad=doc.body.children[0].children[0];
  const ev={pointerType:'touch',pointerId:7,clientX:80,clientY:50,preventDefault(){}};
  pad.listeners.get('pointerdown')[0](ev);for(let i=0;i<50;i++)pad.listeners.get('pointermove')[0](ev);
  assert.equal(reads,1);assert(controller.read().x>.4);
  win.listeners.get('resize')[0]();assert.equal(reads,2);
  win.listeners.get('pointercancel')[0](ev);assert.equal(controller.read().x,0);
  controller.destroy();
});
test('rock impacts generate contact coordinates, rearward displacement, yaw, and lateral knockback',()=>{
  const n=state();n.time=45;n.speed=65;const old=n.s;
  const events=c.kh(n,1/60,{x:0},[{s:n.s+2,offset:.6,r:1.5}]),hit=events.find(e=>e.type==='impact');
  assert(hit.point&&hit.normal);assert(hit.impactSpeed>60);assert(n.vx<-4);assert(n.impactYaw>0);assert(n.knockback>0);assert(n.s<old+65/60);
  const prepared=state();prepared.time=45;prepared.speed=65;
  c.kh(prepared,1/60,{x:0,brace:true},[{s:prepared.s+2,offset:.6,r:1.5}]);assert(Math.abs(prepared.vx)<Math.abs(n.vx));
});
test('impact audio combines a sharp attack with a bounded non-silent tail',()=>{
  for(const rate of [44100,48000]){
    const audio=c.RRSynthFeedback('impact',rate),click=c.RRSynthFeedback('stroke',rate);
    assert(audio.length>rate*.7&&click.length<rate*.05);
    let peak=0,tail=0;for(let i=0;i<audio.length;i++){assert(Number.isFinite(audio[i]));peak=Math.max(peak,Math.abs(audio[i]));if(i>rate*.15)tail+=audio[i]*audio[i];}
    assert(peak>.7&&peak<=.941);assert(tail>1);
  }
});
test('contact spray, fragments and rings use bounded reusable pools',()=>{
  vm.runInContext('var Ra=384,Mv=0,Di=new Float32Array(Ra*3),Sa=new Float32Array(Ra),jl=Array.from({length:Ra},()=>new D),Un=()=>.5;',c);
  const hit={source:'rock',point:{x:25,y:3,z:-200},normal:{x:1,z:0},side:1,force:1};
  assert(c.RRImpactFeedback(hit));assert(Array.from(c.Sa).filter(l=>l>0).length>=120);assert(c.Di[0]>24&&c.Di[0]<26);assert(c.jl[0].x>0);
  const children=c.Ft.children.length;
  for(let i=0;i<20;i++)c.RRImpactFeedback(hit);assert.equal(c.Ft.children.length,children);assert.equal(c.RRFx.debris.life.length,72);assert.equal(c.RRFx.rings.length,4);
  c.RRUpdateImpactVisuals(1);c.RRUpdateImpactVisuals(1);assert(c.RRFx.rings.every(r=>r.life===0));
});
test('six detailed boat models preserve collision vertices and batch decorative trim',()=>{
  for(const craft of c.Qs){
    const group=new c.Tt(),vertices=[];
    for(const face of c.dv(craft.id))for(let i=1;i<face.v.length-1;i++)vertices.push(...face.v[0],...face.v[i],...face.v[i+1]);
    const geometry=new c.ct();geometry.setAttribute('position',new c.qe(vertices,3));geometry.computeVertexNormals();
    const mesh=new c.ut(geometry,new c.Lt({color:craft.color}));group.add(mesh);
    const before=Array.from(geometry.attributes.position.array);c.RRDecorateBoat(group,craft.id);
    assert.deepEqual(Array.from(geometry.attributes.position.array),before);assert(mesh.material.bumpMap);
    assert(group.children.at(-1).children.length<=4);assert(group.children.at(-1).children.length>0);
    const count=group.children.length;c.RRDecorateBoat(group,craft.id);assert.equal(group.children.length,count);
  }
});
test('crew include diverse human appearances and aliens without duplicating decorations',()=>{
  const rig=c.Gl(new c.Tt(),{count:10,boatman:false}),data=c.RRDecorateCrew(rig,'wood');
  assert(data.crew.some(p=>p.alien));assert(new Set(rig.passengers.map(p=>p.head.material.color.getHex())).size>=4);
  const count=rig.passengers[0].face.children.length;c.RRDecorateCrew(rig,'wood');assert.equal(rig.passengers[0].face.children.length,count);
  c.testRig=rig;
});
test('thirteen situational reactions restore their neutral pose and preserve arm lengths',()=>{
  const scenarios={cruise:{},impact:{hits:1},landing:{landedDrops:[1]},relief:{rescued:1},boost:{boostTime:2},brace:{bracing:true},brake:{braking:true},vortex:{vortexPower:.7},anticipate:{danger:{seconds:1}},fall:{activeDrop:1},duel:{duel:.8},paddle:{strokeThrust:1},celebrate:{phase:'won'}};
  for(const [expected,props]of Object.entries(scenarios)){
    const s=Object.assign(state(),props),data={lastHits:0,lastDrops:0,lastRescues:0,until:0,reason:'cruise'};assert.equal(c.RRCrewReaction(s,data,0),expected);
  }
  const rig=c.testRig,poses={passengers:Array.from({length:10},(_,i)=>c.va(i))},s=state();s.hits=1;
  c.Wl(rig,poses,10);c.RRAnimateCrew(rig,poses,s,0,'wood');const shocked=rig.passengers[0].mouth.scale.y;
  assert(Math.abs(rig.passengers[0].arms[0].upper.scale.y-.245)<.001);assert(Math.abs(rig.passengers[0].arms[0].fore.scale.y-.265)<.001);
  s.time=3;c.Wl(rig,poses,10);c.RRAnimateCrew(rig,poses,s,3,'wood');assert(rig.passengers[0].mouth.scale.y<shocked);assert.equal(rig.passengers[0].g.rotation.x,0);
});
test('legacy wood boat, captain, and all actual NPC builders retain valid crew poses',()=>{
  vm.runInContext(html.slice(html.indexOf('function Df('),html.indexOf('function Nf(')),c);
  c.ui=new c.Tt();c.ui.add(new c.ut(c.Jf.clone(),new c.Lt({color:'#865c35'})));c.nu=c.Gl(c.ui);
  c.iu=new Map(c.Qs.filter(s=>s.id!=='wood').map(s=>[s.id,c.Wh(s.id)]));
  c.RRInitBoatDetails();
  const wood=state(),poses={guide:c.xa(c.rr()),passengers:Array.from({length:10},(_,i)=>c.va(i))};
  c.Wl(c.nu,poses,10);c.RRAnimateCrew(c.nu,poses,wood,0,'wood');
  assert(c.RRCrewCache.get(c.nu).guideFace);
  for(const craft of c.Qs){
    const view=c.Wh(craft.id),s=state('sogi',craft.id);c.Xh(view,0,s,1/60);c.RRAnimateCrew(view.rig,view.poses,s,0,craft.id);
    assert(view.rig.passengers.every(p=>Number.isFinite(p.head.position.y)));
  }
});
console.log(JSON.stringify({responseChecks:passed.length,cases:passed},null,2));
module.exports={c,state,html};
