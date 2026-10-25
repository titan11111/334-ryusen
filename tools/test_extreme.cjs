// Run the shipping simulation without rendering. No duplicate physics implementation.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=require('node:path').resolve(__dirname,'..');
const html=fs.readFileSync(root+'/index.html','utf8');
function load(source) {
  const c=vm.createContext({console});
  const a=source.indexOf('var mf='),b=source.indexOf('var zh=',a);
  vm.runInContext(source.slice(a,b),c);
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
  const n=state();n.speed=180;
  const rock={s:n.s+1.5,offset:0,r:1.2};c.kh(n,1/60,{x:0},[rock]);
  assert(n.hp<50);assert(rock.hit);assert.equal(n.lastDamage,'rock');
});
test('brace reduces collision damage and brake wins combined actions',()=>{
  const a=state(),b=state();a.speed=b.speed=65;
  c.kh(a,1/60,{x:0},[{s:a.s+1,offset:0,r:1.2}]);
  c.kh(b,1/60,{x:0,brace:true},[{s:b.s+1,offset:0,r:1.2}]);
  assert(b.hp>a.hp+25);
  const n=state();n.speed=65;n.brakeImpulse=true;c.kh(n,1/60,{x:0,brace:true,brake:true},[]);
  assert(n.braking&&!n.bracing);assert(n.speed<60);
});
test('large unbraced landing is fatal; a prepared landing is survivable',()=>{
  const fall=c.Ln.filter(f=>f.height>=28).at(-1);
  const a=state('iguazu'),b=state('iguazu');a.s=b.s=fall.end-.2;a.speed=b.speed=75;
  c.kh(a,1/60,{x:0},[]);c.kh(b,1/60,{x:0,brace:true},[]);
  assert.equal(a.phase,'lost');assert.equal(b.phase,'playing');assert(b.hp>65);
});
test('danger forecast gives direction and time before collision',()=>{
  const n=state();n.speed=65;
  const d=c.RRforecast(n,[{s:n.s+95,offset:0,r:2}]);
  assert.equal(d.kind,'rock');assert(d.seconds>1&&d.seconds<2);assert(d.action.includes('左'));
});
test('dead boats cannot win on the finish line',()=>{
  const n=state();n.s=n.finishS-.05;n.hp=0;const ev=c.kh(n,1/60,{x:0},[]);
  assert.equal(n.phase,'lost');assert(!ev.some(e=>e.type==='won'));
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
console.log(JSON.stringify({passed:reports.length,cases:reports},null,2));
