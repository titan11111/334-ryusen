// Run the shipping simulation without rendering. No duplicate physics implementation.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=require('node:path').resolve(__dirname,'..');
const html=fs.readFileSync(root+'/index.html','utf8');
function load(source) {
  const c=vm.createContext({console,AbortController,URL,TextDecoder,TextEncoder});
  const a=source.indexOf('var mf='),b=source.indexOf('var zh=',a);
  const three=source.indexOf('/**',source.indexOf('<script>(()=>{'));
  vm.runInContext(source.slice(three,a),c);
  vm.runInContext(source.slice(a,b),c);
  const modelStart=source.indexOf('var uv='),modelEnd=source.indexOf('function Df(',modelStart);
  vm.runInContext(source.slice(modelStart,modelEnd),c);
  const deckStart=source.indexOf('var hi='),deckEnd=source.indexOf('Yn(Jf,tu,ui',deckStart);
  vm.runInContext(source.slice(deckStart,deckEnd),c);
  vm.runInContext('RRRegisterHull("wood-player",Array.from({length:Jf.attributes.position.count},(_,i)=>[Jf.attributes.position.getX(i)*1.2,Jf.attributes.position.getZ(i)*1.2]))',c);
  return c;
}
const c=load(html);
const reports=[];
function test(name,fn){fn();reports.push(name);console.log('PASS',name);}
function state(course='sogi',vessel='wood') {
  const n=c.tr('normal',vessel),w=c.js(course);
  Object.assign(n,{phase:'playing',s:w.start+10,race:true,courseId:course,finishS:w.finish,offset:0});
  return n;
}
function advance(n,seconds,input={x:0}) {
  for(let t=0;t<seconds&&n.phase==='playing';t+=1/120)c.kh(n,1/120,input,[]);
}
test('three separated courses retain 12 sections and five landings',()=>{
  for(const w of c.Pn){assert.equal(w.length,11375);assert.equal(w.sections.length,12);assert.equal(w.drops.length,5);assert.equal(w.sections.at(-1).end,w.finish);}
  for(let i=1;i<c.Pn.length;i++)assert(c.Pn[i].start>c.Pn[i-1].finish);
});
test('steady flow is at least three times the previous target',()=>{
  const w=c.js('sogi'),n=state(); n.s=w.start+40;
  const f=c.un(n.s,0,0),oldTarget=(f.speed-1.5-1+c.Pi(n.s).width*0)*1;
  advance(n,1);
  assert(n.speed>oldTarget*2.7,`${n.speed} vs ${oldTarget}`);
  // Direct equilibrium comparison isolates the specified multiplier from slope and line choice.
  const origFlow=c.un,origSlope=c.bf,origRough=c.ga,origTech=c.xf,origWidth=c.rt;
  c.un=()=>({speed:20,lateral:0,period:18,wave:0});c.bf=()=>0;c.ga=()=>0;c.xf=()=>0;c.rt=()=>30;
  const flat=state();advance(flat,8);assert(Math.abs(flat.speed/18.5-3.25)<.001);
  c.un=origFlow;c.bf=origSlope;c.ga=origRough;c.xf=origTech;c.rt=origWidth;
});
test('swept collision hits rocks crossed in a fast step',()=>{
  const n=state();n.time=45;n.speed=180;
  const rock={s:n.s+1.5,offset:0,r:1.2};c.kh(n,1/60,{x:0},[rock]);
  assert(n.hp<50);assert(rock.hit);assert.equal(n.lastDamage,'rock');
});
test('all six actual hull models collide at bow, stern, and side',()=>{
  for(const craft of c.Qs){
    const n=state('sogi',craft.id);n.speed=65;
    const hull=c.RRWorldHull(n);
    const edge=[hull.reduce((a,b)=>a[1]<b[1]?a:b),hull.reduce((a,b)=>a[1]>b[1]?a:b),hull.reduce((a,b)=>a[0]>b[0]?a:b)];
    for(const [x,z] of edge){const s=-z,rock={s,offset:x-c.Fe(s),r:.12};assert(c.RRHitsRock(n,rock),craft.id+' edge');}
    assert(!c.RRHitsRock(n,{s:n.s+30,offset:20,r:.2}),craft.id+' clear');
  }
});
test('physical widths distinguish kayak and raft without arbitrary forgiveness',()=>{
  const old=c.Fe;c.Fe=()=>0;
  const kayak=state('sogi','kayak'),raft=state('sogi','raft');kayak.speed=raft.speed=65;
  const rock={s:kayak.s,offset:1.15,r:.1};
  assert(!c.RRHitsRock(kayak,rock));assert(c.RRHitsRock(raft,rock));
  const moving=state();moving.offset=4;assert(c.RRHitsRock(moving,{s:moving.s,offset:0,r:.2},moving.s,-4));
  c.Fe=old;
});
test('brace reduces collision damage and brake wins combined actions',()=>{
  const a=state(),b=state();a.time=b.time=45;a.speed=b.speed=65;
  c.kh(a,1/60,{x:0},[{s:a.s+1,offset:0,r:1.2}]);
  c.kh(b,1/60,{x:0,brace:true},[{s:b.s+1,offset:0,r:1.2}]);
  assert(b.hp>a.hp+25);
  const n=state();n.speed=65;n.brakeImpulse=true;c.kh(n,1/60,{x:0,brace:true,brake:true},[]);
  assert(n.braking&&!n.bracing);assert(n.speed<60);
});
test('reinforced full hull survives one large landing; damaged hull still needs bracing',()=>{
  const fall=c.Ln.filter(f=>f.height>=28).at(-1);
  const a=state('iguazu'),b=state('iguazu');a.time=b.time=45;a.s=b.s=fall.end-.2;a.speed=b.speed=75;
  c.kh(a,1/60,{x:0},[]);c.kh(b,1/60,{x:0,brace:true},[]);
  assert.equal(a.phase,'playing');assert(a.hp<20);assert.equal(b.phase,'playing');assert(b.hp>65);
  const damaged=state('iguazu');damaged.time=45;damaged.s=fall.end-.2;damaged.speed=75;damaged.hp=80;
  c.kh(damaged,1/60,{x:0},[]);assert.equal(damaged.phase,'playing');assert(damaged.capsized);
});
test('danger forecast gives direction and time before collision',()=>{
  const n=state();n.speed=65;
  const d=c.RRforecast(n,[{s:n.s+95,offset:0,r:2}]);
  assert.equal(d.kind,'rock');assert(d.seconds>1&&d.seconds<2);assert(d.action.includes('左'));
});
test('broken boats capsize and cannot win on the finish line',()=>{
  const n=state();n.s=n.finishS-.05;n.hp=0;const ev=c.kh(n,1/60,{x:0},[]);
  assert.equal(n.phase,'playing');assert(n.capsized);assert(!ev.some(e=>e.type==='won'));
});
test('AI survives every course with the shipped hazards',()=>{
  for(const course of ['sogi','zambezi','iguazu']){
    const n=state(course,'raft'),rocks=c.Bh();n.tactic=1;
    for(let tick=0;tick<300*60&&n.phase==='playing';tick++){
      const input=c.yf(n,rocks,[n],c.rt(n.s),c.Oh(n.s,Math.max(12,n.speed*.65)));
      c.kh(n,1/60,input,rocks);
    }
    console.log('AI',course,n.phase,Math.round(n.time),Math.round(n.hp),n.hits);
    assert.equal(n.phase,'won',course);
  }
});
// Runtime adapter source has no side effects until RRInitControls is called.
vm.runInContext(fs.readFileSync(root+'/src/extreme-runtime.js','utf8'),c);
c.ds=[];
test('A hold repeats at an accessible pace; B cancels A',()=>{
  const n=state(),input={actions:{stroke:true}};
  assert(c.RRPulse(n,1/60,input));n.time=.2;assert(!c.RRPulse(n,1/60,input));n.time=.5;assert(c.RRPulse(n,1/60,input));
  c.ds=[{at:n.time}];assert(!c.RRPulse(n,1/60,{actions:{stroke:true,act:true}}));
});
test('three-frame input buffer fires as recovery ends and stale taps expire',()=>{
  const n=state();n.time=1;n.recovery=.04;c.ds=[{at:.97}];assert(c.RRPulse(n,1/60,{actions:{}}));
  c.ds=[{at:.8}];assert(!c.RRPulse(n,1/60,{actions:{}}));
});
test('engines spawn rarely, drift with water, and avoid falls and vortices',()=>{
  for(const course of ['sogi','zambezi','iguazu']){
    c.RRResetBoosts(course);assert(c.RRBoostItems.length>=2&&c.RRBoostItems.length<=4,course);
    for(const item of c.RRBoostItems){assert(!c.Ln.some(f=>f.start<item.s+430&&f.end>item.s-180));assert(!c.Wt.some(v=>Math.abs(v.s-item.s)<240));}
    const n=state(course),item=c.RRBoostItems[0];n.s=item.s-300;
    const before=item.s;c.RRAdvanceBoosts(n,1);assert(item.active);assert(item.s>before);assert(item.s-before<n.speed*10);
  }
  c.RRBoostItems=[];
});
test('engine doubles speed for two seconds without stacking or extending',()=>{
  const n=state();n.speed=65;
  c.RRBoostItems=[{id:0,s:n.s,offset:0,active:true,taken:false},{id:1,s:n.s,offset:0,active:true,taken:false}];
  n.tactic=0; // freeze pickup drift in this isolated collision check
  const events=c.kh(n,1/120,{x:0},[]);
  assert(events.some(e=>e.type==='boost'));assert(n.speed>125&&n.speed<135);assert.equal(n.boostTime,2);
  c.kh(n,1/120,{x:0},[]);assert(n.boostTime<2);assert(!c.RRBoostItems[1].taken);
  advance(n,2.1);assert.equal(n.boostTime,0);assert(n.speed<85);assert(n.boostCooldown>0);
  c.RRBoostItems=[];
});
test('braking and impact cancel boosts immediately with no defensive bonus',()=>{
  const n=state();n.speed=130;n.boostTime=2;
  c.kh(n,1/120,{x:0,brake:true},[]);assert.equal(n.boostTime,0);assert(n.speed<65);
  const tired=state();tired.speed=130;tired.boostTime=2;tired.stamina=0;
  c.kh(tired,1/120,{x:0,brake:true},[]);assert.equal(tired.boostTime,0);
  const hit=state();hit.time=45;hit.speed=130;hit.boostTime=2;
  c.kh(hit,1/120,{x:0},[{s:hit.s+1,offset:0,r:1.2}]);assert.equal(hit.boostTime,0);assert(hit.hp<40);
});
test('full courses with engines remain challenging three-minute races',()=>{
  for(const course of ['sogi','zambezi','iguazu']){
    c.RRResetBoosts(course);
    const n=state(course,'raft'),rocks=c.Bh();
    for(let tick=0;tick<300*60&&n.phase==='playing';tick++){
      const input=c.yf(n,rocks,[n],c.rt(n.s),c.Oh(n.s,Math.max(12,n.speed*.65)));
      c.kh(n,1/60,input,rocks);
    }
    console.log('BOOST RACE',course,n.phase,Math.round(n.time),'engines',n.boostCount||0,'HP',Math.round(n.hp));
    assert.equal(n.phase,'won');assert(n.time>150);assert((n.boostCount||0)<=4);
  }
  c.RRBoostItems=[];
});
test('engine meshes initialize from the shipped Three.js classes',()=>{
  c.RRBoostItems=[{s:c.js('sogi').start+100,offset:0,active:true,taken:false}];
  vm.runInContext('var Ft=new Tt,U=tr();U.race=true;U.phase="playing";U.s=js("sogi").start;var Mt=false,pt=0;RRDrawBoosts();',c);
  assert.equal(c.RRBoostViews.length,1);assert(c.RRBoostViews[0].group.visible);assert(c.RRBoostViews[0].group.children.length>=5);
  c.RRBoostItems=[];
});
console.log(JSON.stringify({passed:reports.length,cases:reports},null,2));
module.exports={c,state,html};


