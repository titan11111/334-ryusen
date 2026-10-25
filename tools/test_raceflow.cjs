const {c,state,html}=require('./test_response.cjs');
const assert=require('node:assert/strict'),vm=require('node:vm');
const passed=[];
function test(name,fn){fn();passed.push(name);console.log('PASS',name);}
test('opening rocks leave an initial runway, a wide center lane and large gaps',()=>{
  for(const course of c.Pn){
    const rocks=c.Bh().filter(r=>r.s>=course.start&&r.s<course.start+2500);
    assert(rocks.length>=2&&rocks.length<=5);assert(rocks[0].s-course.start>=480);
    rocks.forEach((r,i)=>{if(i)assert(r.s-rocks[i-1].s>=450);assert(Math.abs(r.offset)-r.r>3);});
  }
});
function simulate(n,seconds,fps,paddle=false){
  const rocks=c.Bh();c.RRBoostItems=[];c.ds=[];c.RRC.lastRepeat=-1;c.RRC.impulse=false;
  for(let frame=0;frame<seconds*fps&&n.phase==='playing';frame++){
    let frameTime=1/fps;
    while(frameTime>1e-7){const dt=Math.min(1/60,frameTime);frameTime-=dt;
      const stroke=paddle&&c.RRPulse(n,dt,{actions:{stroke:true}});
      c.kh(n,dt,{x:0,stroke},rocks);
    }
  }
  return n;
}
test('4fps-equivalent opening survives six seconds and thirty seconds without input for all craft',()=>{
  for(const course of c.Pn)for(const craft of c.Qs){
    const n=state(course.id,craft.id);n.offset=-1.8;
    simulate(n,6,4);assert.equal(n.phase,'playing',course.id+'/'+craft.id);assert(n.hp>=94);assert.equal(n.passengers,n.totalPassengers);
    simulate(n,24,4);assert.equal(n.phase,'playing',course.id+'/'+craft.id);assert(n.hp>=60,course.id+'/'+craft.id+' HP '+n.hp);
  }
});
test('holding A earns six real strokes and a surf success in every opening',()=>{
  for(const course of c.Pn){
    const n=simulate(state(course.id,'wood'),12,4,true);
    assert(n.totalStrokes>=6,course.id);assert(n.combo>=6,course.id);assert(n.surfCount>=1,course.id);assert(n.hp>=90);
  }
});
test('opening impact protection fades into dangerous regular impacts',()=>{
  for(const [time,max,min]of [[5,6,0],[31,16,6],[45,100,40]]){
    const n=state();n.time=time;n.speed=65;
    const event=c.kh(n,1/60,{x:0},[{s:n.s+2,offset:0,r:1.2}]).find(e=>e.type==='impact');
    assert(event.damage<=max+.3&&event.damage>=min,time+' damage '+event.damage);
  }
});
test('the actual race crossing detector drives strong passing and smaller losing feedback',()=>{
  vm.runInContext(html.slice(html.indexOf('function zl()'),html.indexOf('var ir=')),c);
  const rank={animate(frames,opts){this.duration=opts.duration;}};
  const get=c.document.getElementById;c.document.getElementById=id=>id==='raceRank'?rank:get(id);c.mn=()=>{};
  const you=state(),rival=state('sogi','kayak');you.time=rival.time=10;you.s=2000;rival.s=2005;you.offset=-3;rival.offset=3;
  c.U=you;const race=c.zl();c.Rf(race,[you,rival],1/60);you.s=2006;
  const pass=c.Rf(race,[you,rival],1/60).find(e=>e.type==='overtake');assert(pass&&pass.ahead===0);
  c.RRRaceEvent(pass);assert.equal(c.RRFx.passPulse,1);assert.equal(rank.duration,360);
  you.s=2004;you.time=rival.time=14;
  const loss=c.Rf(race,[you,rival],1/60).find(e=>e.type==='overtake');assert(loss&&loss.behind===0);
  c.RRRaceEvent(loss);assert.equal(c.RRFx.passPulse,.2);assert.equal(rank.duration,180);
});
test('FOV responds across the actual speed range and boost remains bounded',()=>{
  c.RRFx.passPulse=0;
  const slow=c.RRRaceFOV(30),normal=c.RRRaceFOV(65),boost=c.RRRaceFOV(130,2);
  assert(normal>slow+4);assert(boost>normal+10);assert(boost<=82);
  c.RRFx.passPulse=1;assert(c.RRRaceFOV(65)<normal);
});
test('passing audio rises in pitch while loss feedback falls',()=>{
  const rate=44100;
  function crossings(a,start,end){let count=0;for(let i=Math.floor(start*rate)+1;i<end*rate;i++)if(a[i-1]<0&&a[i]>=0)count++;return count;}
  const pass=c.RRSynthFeedback('pass',rate),loss=c.RRSynthFeedback('passback',rate);
  assert(crossings(pass,.18,.23)>crossings(pass,.02,.07));assert(crossings(loss,.18,.23)<crossings(loss,.02,.07));
});
console.log(JSON.stringify({raceFlowChecks:passed.length,total:27+passed.length,cases:passed},null,2));
