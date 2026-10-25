const {c,state,html}=require('./simulation-harness.cjs');
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const passed=[];function test(name,fn){fn();passed.push(name);console.log('PASS',name);}
function tick(n,input={x:0},count=1,rocks=[]){let events=[];for(let k=0;k<count;k++)events.push(...c.kh(n,1/60,input,rocks));return events;}

test('hull failure capsizes once, never ends the race, and requires ten distinct taps',()=>{
  const n=state();n.time=45;n.hp=0;
  const events=tick(n);assert(n.capsized);assert.equal(n.phase,'playing');assert.equal(n.capsizeCount,1);
  assert(events.some(e=>e.type==='capsize'));assert(!events.some(e=>e.type==='lost'));
  const before=n.time;tick(n,{x:0,stroke:true},120);assert.equal(n.recoveryTaps,1);assert(n.time>before+1.9);assert(n.capsized);
  for(let k=0;k<8;k++){tick(n);tick(n,{x:0,stroke:true});}assert(n.capsized);assert.equal(n.recoveryTaps,9);
  tick(n);const restored=tick(n,{x:0,stroke:true});assert(restored.some(e=>e.type==='righted'));
  assert(!n.capsized);assert.equal(n.hp,55);assert.equal(n.passengers,n.totalPassengers);assert(n.immunity>2);
  assert.equal(n.capsizeCount,1);
});
test('holding the ordinary paddle button cannot generate automatic recovery taps',()=>{
  const n=state();n.capsized=true;n.recoveryGoal=10;n.recoveryTaps=0;n.capsizeAge=0;
  c.ds=[];c.RRC.lastRepeat=-1;
  for(let frame=0;frame<300;frame++){const stroke=c.RRPulse(n,1/60,{actions:{stroke:true}});tick(n,{x:0,stroke});}
  assert.equal(n.recoveryTaps,0);assert(n.capsized);
});
test('rivals continue racing while a capsized player loses ground, including near the finish',()=>{
  const n=state(),rival=state();n.hp=0;n.s=n.finishS-.1;tick(n);const rivalStart=rival.s;
  tick(n,{x:0},180);tick(rival,{x:0},180);
  assert(n.capsized);assert(n.s<n.finishS);assert.equal(n.phase,'playing');assert(rival.s>rivalStart+80);
});
test('AI also pays the capsize penalty and can right its boat',()=>{
  const n=state();n.time=45;n.tactic=2;n.hp=0;tick(n);const begin=n.time;
  for(let k=0;k<600&&n.capsized;k++)tick(n,c.yf(n,[],[n],c.rt(n.s),null));
  assert(!n.capsized);assert(n.time-begin>2);assert.equal(n.hp,55);
});
test('waterfall warning precedes the lip by six seconds, switches at the lip, and exposes brake/brace conflict',()=>{
  for(const course of c.Pn){const fall=c.Ln.find(f=>f.courseId===course.id),n=state(course.id);n.speed=90;n.s=fall.start-450;
    let advice=c.RRDropAdvice(n);assert(advice);assert.equal(advice.stage,'approach');assert(advice.action.includes('B'));assert(advice.action.includes('R'));
    n.s=fall.start+1;advice=c.RRDropAdvice(n);assert.equal(advice.stage,'landing');assert(advice.action.includes('Bを離して'));
    n.s=fall.end-.1;n.time=45;const hp=n.hp;tick(n,{x:0,brace:true});assert.equal(n.hp,hp);assert(n.safeDrops>0);
  }
});
test('brake, steer and exit stroke create a bounded cutback only near a real hazard',()=>{
  const n=state();n.time=45;n.speed=65;const rocks=[{s:n.s+65,offset:1,r:1.2}];
  tick(n,{x:-.8,brake:true},14,rocks);assert(n.turnArmed);const slow=n.speed;
  const ev=tick(n,{x:-.8,stroke:true},1,rocks);assert(ev.some(e=>e.type==='cutback'));assert(n.speed>slow+8);assert.equal(n.cutbacks,1);
  tick(n,{x:-.8,brake:true},14,rocks);tick(n,{x:-.8,stroke:true},1,rocks);assert.equal(n.cutbacks,1);
});
test('three current routes trade speed for safety and central rocks leave the bank route open',()=>{
  for(const course of c.Pn){const s=course.start+3000,route=c.RRRouteAt(s,course.id);assert.equal(route.lanes.length,3);
    const n=state(course.id);n.s=s;const rates=[];
    for(const lane of route.lanes){n.offset=lane.offset;rates.push(c.RRReadRoute(n));assert.equal(n.routeLane,lane.id);}
    assert(rates[0]<1&&rates[1]>1&&rates[1]>rates[2]);
    const rocks=c.Bh().filter(r=>r.s>=route.start&&r.s<=route.end);assert(rocks.some(r=>Math.abs(r.offset)<1));
    for(const rock of rocks){const local=c.RRRouteAt(rock.s,course.id);assert(Math.abs(rock.offset-local.lanes[0].offset)>rock.r+2.3);}
  }
});
test('timed rising-wave strokes build a surf chain; a missed wave breaks it',()=>{
  const orig=c.un,n=state('zambezi');n.time=45;n.s=c.js('zambezi').start+60;
  c.un=()=>({speed:20,lateral:0,period:30,wave:1,type:'waves',vortex:{influence:0}});
  const crest=(s)=>Math.round(s/30)*30+30*.245;
  n.s=crest(n.s);let ev=tick(n,{x:0,stroke:true});assert(ev.some(e=>e.type==='wave'&&e.chain===1));
  n.time+=1.7;n.s=crest(n.s);n.lastWave=n.time-2;n.surfArmedUntil=-1;
  ev=tick(n,{x:0,stroke:true});assert(ev.some(e=>e.type==='wave'&&e.chain>=2));
  n.s=crest(n.s);n.lastWave=n.time-2;n.surfArmedUntil=-1;tick(n,{x:0});assert.equal(n.surfChain,0);
  c.un=orig;
});
test('all five rivals expose their own tactics without hiding hazard avoidance',()=>{
  const plans=[];
  for(let i=0;i<5;i++){const n=state();n.time=45;n.s=c.js('sogi').start+3000;n.tactic=i;
    const input=c.yf(n,[],[n],c.rt(n.s),null);assert(Number.isFinite(input.x));plans.push(n.aiProfile);}
  assert.equal(new Set(plans).size,5);
});
test('route guides are fixed pools and capsize poses pause, recover and respect reset',()=>{
  c.su=()=>{};vm.runInContext(fs.readFileSync('src/river-skills.js','utf8'),c);
  c.RRInitCurrentLines();assert.equal(c.RRCurrentLines.length,3);
  const geometry=c.RRCurrentLines[0].geometry;c.RRInitCurrentLines();assert.equal(c.RRCurrentLines[0].geometry,geometry);
  const boat=new c.Tt(),n=state();n.capsized=true;n.recoveryTaps=0;n.recoveryGoal=10;
  c.RRApplyCapsizePose(boat,n,.2);assert(boat.rotation.z>2);
  const value=c.RRRightingRoll.get(boat);boat.rotation.z=0;c.RRApplyCapsizePose(boat,n,0);assert.equal(c.RRRightingRoll.get(boat),value);
  n.capsized=false;boat.rotation.z=0;c.RRApplyCapsizePose(boat,n,2);assert(Math.abs(boat.rotation.z)<.001);
});
console.log(JSON.stringify({skillChecks:passed.length,cases:passed},null,2));
