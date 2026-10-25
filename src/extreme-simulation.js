// RYUSEN EXTREME. Pure simulation; embedded by tools/update_extreme.py.
// Distances and speed are game units, not measured white-water speeds.
var RRHulls = Object.create(null),RRWorldHulls=new WeakMap();
// A 1.2x effective hull capacity, displayed as the same familiar 0–100% meter.
var RRDurabilityMultiplier = 1.2;
function RREaseOpeningRocks(rocks) {
  const last=new Map();
  return rocks.filter(rock=>{
    const course=Pn.find(c=>rock.s>=c.start&&rock.s<c.start+2500);if(!course)return true;
    const distance=rock.s-course.start;
    if(distance<480||distance-(last.get(course.id)||0)<450)return false;
    const side=(Math.floor(distance/450)%2)?1:-1;
    rock.offset=side*Math.max(5.6,rt(rock.s)*.5-rock.r-1.1);last.set(course.id,distance);return true;
  });
}
var RRRawRocks=Bh;Bh=function(){
  const rocks=RREaseOpeningRocks(RRRawRocks());
  for(const course of Pn){
    // Central rocks make the fast current a real choice, with a clear bank passage.
    for(let s=course.start+2900;s<course.finish-600;s+=1450){
      if(Ln.some(f=>Math.abs(f.start-s)<180)||Wt.some(v=>Math.abs(v.s-s)<160))continue;
      rocks.push({s,offset:0,r:1.2,scaleY:1.2,seed:.37,hit:false});
    }
  }
  for(const rock of rocks){const route=Pn.map(c=>RRRouteAt(rock.s,c.id)).find(r=>r&&rock.s>=r.start&&rock.s<=r.end);
    if(route&&Math.abs(rock.offset-route.lanes[0].offset)<rock.r+2.4)rock.offset=route.lanes[0].offset-route.side*(rock.r+3);}
  return rocks.sort((a,b)=>a.s-b.s);
};
function RROpening(state){return state.race&&!state.practice&&state.time<30;}
var RRBoostItems=[];
function RRResetBoosts(courseId,start=0,practice=false) {
  RRBoostItems=[];if(practice)return;
  const course=js(courseId),rocks=Bh();
  for(let index=0;index<4;index++){
    const wanted=course.start+650+index*2550;
    for(let s=wanted;s<wanted+1100&&s<course.finish-550;s+=35){
      if(Ln.some(f=>f.start<s+550&&f.end>s-180)||Wt.some(v=>Math.abs(v.s-s)<300))continue;
      const candidates=[[-3.8,3.8,-2.8,2.8][index],0,-5.5,5.5,-2,2];
      const offset=candidates.find(o=>Math.abs(o)<rt(s)*.5-3&&!rocks.some(r=>Math.abs(r.s-s)<150&&Math.abs(r.offset-o)<r.r+2.2));
      if(offset===undefined)continue;
      RRBoostItems.push({id:index,s,spawnS:s,offset,baseOffset:offset,active:false,taken:false,passed:false,age:0});break;
    }
  }
}
function RRAdvanceBoosts(player,dt) {
  const leader=typeof gn==='undefined'?player.s:Math.max(player.s,...gn.map(r=>r.s));
  for(const item of RRBoostItems){
    if(!item.active&&!item.taken&&!item.passed&&leader>item.spawnS-400)item.active=true;
    if(!item.active)continue;
    item.age+=dt;
    const flow=un(item.s,item.offset,player.time);
    item.s+=flow.speed*(player.mode==='scenic'?1:3.25)*.34*dt;
    item.offset+=((flow.lateral||0)*.12+(item.baseOffset-item.offset)*.5)*dt;
    const width=rt(item.s)*.5-2;item.offset=_f(item.offset,-width,width);
    if(item.s<player.s-160||item.s>js(player.courseId).finish-250){item.active=false;item.passed=true;}
    if(Ln.some(f=>f.start>item.s&&f.start-item.s<350)||Wt.some(v=>Math.abs(v.s-item.s)<150)){
      item.active=false;item.passed=true;
    }
  }
}
function RRStopBoost(state) {
  if(!(state.boostTime>0))return;
  state.speed*=.5;state.boostTime=0;state.boostCooldown=6;
}
function RRConvexHull(points) {
  const sorted=points.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const half=list=>{const out=[];for(const p of list){while(out.length>1&&cross(out.at(-2),out.at(-1),p)<=0)out.pop();out.push(p);}return out;};
  return half(sorted).slice(0,-1).concat(half(sorted.slice().reverse()).slice(0,-1));
}
function RRRegisterHull(key,points) {RRHulls[key]=RRConvexHull(points);return RRHulls[key];}
function RRGetHull(state) {
  const key=state.vesselId==='wood'&&state.tactic===undefined?'wood-player':state.vesselId;
  // Pure fallback uses the same model faces used by the renderer, never old hit radii.
  return RRHulls[key]||RRRegisterHull(key,dv(state.vesselId).flatMap(f=>f.v.map(p=>[p[0]*1.2,p[2]*1.2])));
}
function RRWorldHull(state,s=state.s,offset=state.offset) {
  const yaw=-Math.atan2(Fe(s+2)-Fe(s-2),4)
    -(state.vesselId==='wood'&&state.tactic===undefined?0:Math.atan2(state.vx,state.speed)*.4)+(state.spin||0)+(state.impactYaw||0);
  const cos=Math.cos(yaw),sin=Math.sin(yaw),center=Fe(s)+offset,hull=RRGetHull(state);
  // Reuse transforms for bank checks, forecasts and contact tests within a step.
  let cache=RRWorldHulls.get(state);
  if(!cache||cache.hull!==hull){cache={hull,points:hull.map(()=>[0,0])};RRWorldHulls.set(state,cache);}
  if(cache.s===s&&cache.offset===offset&&cache.yaw===yaw)return cache.points;
  cache.s=s;cache.offset=offset;cache.yaw=yaw;
  for(let i=0;i<hull.length;i++){const [x,z]=hull[i];cache.points[i][0]=center+x*cos+z*sin;cache.points[i][1]=-s-x*sin+z*cos;}
  return cache.points;
}
function RRHitsRock(state,rock,fromS=state.s,fromOffset=state.offset) {
  const distance=Math.hypot(state.s-fromS,state.offset-fromOffset);
  const steps=Math.max(1,Math.ceil(distance/.45));
  const rx=rock.r*1.18+.10,rz=rock.r*1.35+.10;
  const cx=Fe(rock.s)+rock.offset,cz=-rock.s;
  for(let step=0;step<=steps;step++){
    const t=step/steps;
    const poly=RRWorldHull(state,fromS+(state.s-fromS)*t,fromOffset+(state.offset-fromOffset)*t);
    let inside=false;
    for(let i=0,j=poly.length-1;i<poly.length;j=i++){
      const ax=(poly[j][0]-cx)/rx,az=(poly[j][1]-cz)/rz,bx=(poly[i][0]-cx)/rx,bz=(poly[i][1]-cz)/rz;
      if((az>0)!==(bz>0)&&0<(bx-ax)*(-az)/(bz-az)+ax)inside=!inside;
      const dx=bx-ax,dz=bz-az,u=_f(-(ax*dx+az*dz)/(dx*dx+dz*dz||1));
      if((ax+u*dx)**2+(az+u*dz)**2<=1)return true;
    }
    if(inside)return true;
  }
  return false;
}
function RRBankOverlap(state) {
  let penetration=0,side=0;
  for(const [x,z] of RRWorldHull(state)){
    const local=x-Fe(-z),depth=Math.abs(local)-rt(-z)*.5+.18;
    if(depth>penetration){penetration=depth;side=Math.sign(local);}
  }
  return {penetration,side};
}
// Three navigable currents share the same river bed. Choice changes progress and risk.
function RRRouteAt(s,courseId) {
  const course=js(courseId),local=s-course.start-2700;
  if(local<0||s>course.finish-500)return null;
  const index=Math.floor(local/1450),start=course.start+2700+index*1450;
  if(s>start+850)return null;
  const half=rt(s)*.5,side=index%2?1:-1;
  return {id:courseId+':'+index,start,end:start+850,side,
    lanes:[{id:'bank',name:'岸側・安全迂回',offset:side*half*.64,factor:.90},
      {id:'main',name:'中央・岩間の速流',offset:0,factor:1.10},
      {id:'outer',name:'外周・横流れ',offset:-side*half*.56,factor:1.04}]};
}
function RRReadRoute(n) {
  const route=n.race?RRRouteAt(n.s,n.courseId):null;
  if(!route){n.routeId=null;n.routeLane=null;return 1;}
  const lane=route.lanes.reduce((a,b)=>Math.abs(a.offset-n.offset)<Math.abs(b.offset-n.offset)?a:b);
  n.routeId=route.id;n.routeLane=lane.id;n.routeName=lane.name;
  return 1+(lane.factor-1)*Math.min(1,(n.s-route.start)/60,(route.end-n.s)/60);
}
function RRDropAdvice(n) {
  const speed=Math.max(1,n.speed),fall=Ln.find(f=>f.end>=n.s&&f.start-n.s<Math.max(150,speed*6));
  if(!fall)return null;
  const falling=n.s>=fall.start,seconds=Math.max(0,(fall.start-n.s)/speed);
  return {id:fall.id,name:fall.name,height:fall.height,distance:Math.max(0,fall.start-n.s),seconds,
    landingSeconds:Math.max(0,(fall.end-n.s)/speed),stage:falling?'landing':seconds<2?'edge':'approach',
    action:falling?'Bを離して R：着水まで踏ん張る':seconds<2?'Bで減速 → 落下したら R':'Bで減速・体力を温存 → 着水は R'};
}
function RRCapsize(n,events,source) {
  RRStopBoost(n);n.capsized=true;n.capsizeCount=(n.capsizeCount||0)+1;
  n.recoveryTaps=0;n.recoveryGoal=10;n.capStrokeHeld=false;n.capsizeAge=0;
  n.capsizeCause=source;n.hp=0;n.vx*=.2;n.speed=Math.min(n.speed,8);n.surfChain=0;n.combo=0;
  n.bracing=false;n.braking=false;
  // The rescue team returns the crew together; the penalty is time and position.
  n.pax?.forEach(p=>p.st=0);n.passengers=n.totalPassengers;n.lostPax=0;
  events.push({type:'capsize',source,goal:n.recoveryGoal});
}
function RRRecoverCapsize(n,e,input,events) {
  n.capsizeAge+=e;n.bracing=false;n.braking=false;
  n.speed+=(5-n.speed)*Math.min(1,e*3);n.s=Math.min(n.finishS-1,n.s+n.speed*e);
  n.offset*=Math.exp(-e*.3);n.stamina=Math.min(100,n.stamina+e*14);
  const tap=!!input.stroke&&!n.capStrokeHeld;n.capStrokeHeld=!!input.stroke;
  if(tap){n.recoveryTaps++;events.push({type:'righting',taps:n.recoveryTaps,goal:n.recoveryGoal});}
  if(n.recoveryTaps>=n.recoveryGoal){
    n.capsized=false;n.hp=55;n.immunity=2.5;n.recovery=.3;n.capsize=0;n.speed=12;
    n.landedDrops=Ln.filter(f=>f.end<=n.s).map(f=>f.id);n.activeDrop=-1;
    n.strokeHeld=true;n.lastStroke=n.time;n.lastDamage=null;
    events.push({type:'righted',penalty:n.capsizeAge});
  }
  return events;
}
function RRSkillStep(n,e,input,flow,rocks,events) {
  n.turnCooldown=Math.max(0,(n.turnCooldown||0)-e);
  if(n.braking){
    if(!n.wasBraking){n.turnEntrySpeed=n.speed;n.turnBrakeTime=0;n.turnArmed=false;}
    n.turnBrakeTime+=e;
    const hazard=rocks.some(r=>r.s>n.s&&r.s-n.s<Math.max(90,n.speed*2)&&Math.abs(r.offset-n.offset)<r.r+4);
    if(n.turnBrakeTime>=.12&&n.turnBrakeTime<1.2&&Math.abs(input.x)>.45&&(hazard||Math.abs(Fv(n.s+25)-Fv(n.s))>.06)){
      n.turnArmed=true;n.turnSide=Math.sign(input.x);n.turnWindow=n.time+.8;
    }
  }
  if(!n.braking&&!n.bracing&&n.turnArmed&&n.time<=n.turnWindow&&input.stroke&&Math.sign(input.x)===n.turnSide&&!(n.turnCooldown>0)){
    n.speed=Math.max(n.speed,n.turnEntrySpeed*.9);n.vx+=n.turnSide*2.5;
    n.surge=Math.min(7,(n.surge||0)+2);n.cutbacks=(n.cutbacks||0)+1;n.turnCooldown=3;n.turnArmed=false;
    events.push({type:'cutback'});
  }
  if(n.time>n.turnWindow)n.turnArmed=false;
  n.wasBraking=n.braking;
  const phase=((n.s*Math.PI*2/flow.period)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
  n.wavePhase=phase;n.surfWindow=flow.wave>.30&&phase>.15&&phase<1.55;
  if(input.stroke&&!n.braking&&!n.bracing&&n.surfWindow&&n.time-(n.lastSurfStroke??-10)>.32){
    n.lastSurfStroke=n.time;n.surfArmedUntil=n.time+.6;
  }
}
var RRAIProfiles=['直線勝負','岩間巧者','波乗り派','合流読み','引き波狙い'];
function RRSmartAI(n,rocks,boats,width,fall){
  if(n.capsized)return {x:0,stroke:Math.floor(n.time*6)%2===0,brake:false,brace:false};
  const input=RRBaseAI(n,rocks,boats,width,fall),style=(n.tactic||0)%5;
  n.aiProfile=RRAIProfiles[style];
  const route=RRRouteAt(n.s+55,n.courseId),near=rocks.some(r=>r.s>n.s-5&&r.s<n.s+100&&Math.abs(r.offset-n.offset)<r.r+3);
  if(route&&!near&&!fall){
    const lane=route.lanes[style===0||style===1?1:style===3?2:0];
    const leader=style===4?boats.filter(b=>b!==n&&!b.capsized&&b.s>n.s+6&&b.s<n.s+35).sort((a,b)=>a.s-b.s)[0]:null;
    const target=leader?.offset??lane.offset;
    if(!rocks.some(r=>r.s>n.s&&r.s<n.s+130&&Math.abs(r.offset-target)<r.r+2.5))
      input.x=_f((target-n.offset)*.8-n.vx*.35,-1,1);
    n.plannedLane=leader?'wake':lane.id;
  }
  const drop=RRDropAdvice(n);
  if(drop&&n.stamina>10){input.brake=drop.stage!=='landing'&&drop.seconds<2.4&&n.speed>34;input.brace=drop.stage==='landing';}
  if(style===2&&n.surfWindow&&n.stamina>20&&!input.brace&&!input.brake&&n.time-(n.lastStroke??-10)>.35)input.stroke=true;
  return input;
}
function kh(n, e, input, rocks) {
  if (n.phase !== 'playing') return [];
  const events = [], previous = n.s, previousOffset=n.offset, craft = At(n.vesselId);
  const touring = n.mode === 'scenic', multiplier = touring ? 1 : 3.25;
  n.time += e;
  if(n.capsized){if(n.race&&n.tactic===undefined)RRAdvanceBoosts(n,e);return RRRecoverCapsize(n,e,input,events);}
  for (const key of ['immunity', 'captionT', 'landing', 'reaction'])
    n[key] = Math.max(0, (n[key] || 0) - e);
  n.shake *= Math.exp(-e * 5);
  n.impactYaw=(n.impactYaw||0)*Math.exp(-e*13);
  n.knockback=Math.max(0,(n.knockback||0)-e);
  if (n.stamina <= 2) n.exhausted = true;
  if (n.stamina >= 28) n.exhausted = false;
  const active = !n.exhausted && n.stamina > 2;
  const opening=RROpening(n);
  n.braking = !!input.brake && active;
  n.bracing = !!input.brace && active && !n.braking;
  n.boostCooldown=Math.max(0,(n.boostCooldown||0)-e);
  if(n.boostTime>0){
    if(input.brake||n.boostTime<=e)RRStopBoost(n);
    else n.boostTime-=e;
  }
  if(n.race&&n.tactic===undefined)RRAdvanceBoosts(n,e);
  if (n.brakeImpulse) {if (n.braking) n.speed *= .88; n.brakeImpulse=false;}
  n.stamina = _f(n.stamina + e * (n.bracing ? -11 : n.braking ? -17 : n.race ? 8 : 15), 0, 100);
  const flow = un(n.s, n.offset, n.time, n.flowSeed || 0);
  const routeFactor=RRReadRoute(n);
  RRSkillStep(n,e,input,flow,rocks,events);
  n.flowLateral = flow.lateral;
  n.waveImpact = Math.max(0, Math.sin(n.s * Math.PI * 2 / flow.period));
  const technique = n.race ? xf(n, e, {...input, stroke:input.stroke && !n.bracing && !n.braking}, flow, events) : 0;
  // Narrowing and slope accelerate the boat; bends push it toward the outer bank.
  const narrowing = Math.max(0, (rt(n.s - 18) - rt(n.s + 18)) / 10);
  const slope = Math.min(1.8, bf(n.s));
  const bend = (Fv(n.s + 9) - Fv(n.s - 9)) * n.speed * .5;
  const target = (n.race ? Math.max(8, flow.speed - 1.5 + technique + ga(n.s) * 3)
    : (touring ? 9 : 12.4) + er(n.s) * (touring ? 3.4 : 7)) * multiplier
    * Math.pow(craft.speed, .18) * (n.speedScale || 1) * routeFactor + (n.wakeBoost || 0)
    + (touring ? 0 : narrowing * 9 + slope * 6);
  const desired = n.braking ? Math.max(9, target * .35) : target*(n.boostTime>0?2:1);
  n.speed += (desired - n.speed) * Math.min(1, e * (n.braking ? 4.8 : 1.7));
  const paddleSurf=opening&&flow.wave>.12&&(n.strokeThrust||0)>.05;
  if ((flow.wave > .75||paddleSurf) && n.waveImpact > .94 && n.time-(n.lastWave || -10)>1.5) {
    n.lastWave=n.time; n.reaction=Math.max(n.reaction,.4);
    const timed=n.time<=(n.surfArmedUntil||-1),saved=n.bracing||paddleSurf||timed;
    if(saved){
      n.surfCount=(n.surfCount||0)+1;n.surge=Math.min(7,(n.surge||0)+1.2);
      if(timed){n.surfChain=n.time-(n.lastChainWave??-10)<4?(n.surfChain||0)+1:1;n.lastChainWave=n.time;
        n.speed+=Math.min(5,n.surfChain)*.8;n.bestSurfChain=Math.max(n.bestSurfChain||0,n.surfChain);}
    }else {n.speed*=.93;n.shake=Math.max(n.shake,.3);n.surfChain=0;}
    events.push({type:'wave',braced:saved,surf:saved,chain:timed?n.surfChain:0});
  }
  const control = (n.bracing ? .38 : n.braking ? 1.5 : 1) * (touring ? 1 : 2.1);
  n.vx += (input.x * 13.5 * craft.turn * control
    + (flow.lateral * (touring ? 1 : 1.5) - bend)*(opening?.35:1) / craft.stability - n.vx * 3.1) * e;
  n.offset += n.vx * e;
  n.s += n.speed * e;
  const bank=RRBankOverlap(n);
  if (bank.penetration>0) {
    const impact = Math.abs(n.vx);
    n.offset -= bank.side*bank.penetration; n.vx *= -.25;
    if (n.immunity <= 0) damage(9 + impact * 1.4, 'bank');
  }
  // Swept collision: fast boats cannot tunnel through rocks between simulation steps.
  for (const rock of rocks) {
    if (rock.s > n.s + 160) break;
    const dx = rock.offset - n.offset, ds = rock.s - n.s;
    const reach=craft.length*.8+rock.r*1.5+1;
    const crossed = rock.s >= previous-reach && rock.s <= n.s+reach;
    if (crossed && n.immunity <= 0 && RRHitsRock(n,rock,previous,previousOffset)) {
      rock.hit = true;
      damage(16 + n.speed * .65, 'rock',rock);
    }
    if (!rock.passed && ds < -rock.r - craft.halfHit) {
      rock.passed = true;
      if (!rock.hit && Math.abs(dx) < rock.r + craft.radius + 2) {
        n.near++; events.push({type:'near'});
      }
    }
  }
  for (const fall of Ln) {
    if (previous < fall.start && n.s >= fall.start) {
      n.activeDrop = fall.id; n.lastFall = fall.start;
      n.dropEntrySpeed=n.speed;
      events.push({type:'fall', drop:fall});
    }
    if (previous < fall.end && n.s >= fall.end && !n.landedDrops.includes(fall.id)) {
      n.landedDrops.push(fall.id); n.activeDrop = -1; n.landing = n.reaction = 1;
      n.shake = Math.max(n.shake, fall.height / 15);
      if (n.bracing) {
        n.surge = Math.min(7, (n.surge || 0) + 2); n.safeDrops = (n.safeDrops || 0) + 1;
        n.lastLandingQuality=(n.dropEntrySpeed||n.speed)<40?'soft':'braced';
      } else if (!touring) damage(fall.height * 3 + n.speed * .28, 'fall');
      events.push({type:'landing', drop:fall, braced:n.bracing});
    }
  }
  // A sustained boil may capsize an unbraced craft. Escape direction is visible in HUD.
  const trapped = (flow.vortex?.influence || 0) > .67 && !n.bracing;
  n.capsize = _f((n.capsize || 0) + e * (trapped ? .9 / craft.stability : -1.5));
  if (!touring && n.capsize >= 1 && n.immunity <= 0) {damage(110, 'vortex'); n.capsize = 0;}
  if (n.pax) for (const person of n.pax) if (person.st === 1) {
    person.t += e;
    const water = un(person.s, person.o, n.time, n.flowSeed || 0);
    person.sp += ((water.speed || 19) * multiplier * .78 - person.sp) * Math.min(1, e * 1.3);
    person.s += person.sp * e; person.o += (water.lateral || 0) * .4 * e;
    const width = rt(person.s) * .5 - 1.1;
    person.o = _f(person.o, -width, width);
    const gap = person.s - n.s;
    if (person.t > .55 && Math.abs(gap) < 5 && Math.abs(person.o - n.offset) < 3.6) {
      person.st = 0; n.passengers++; n.rescued++; events.push({type:'rescue'});
    } else if (Math.abs(gap) > 125) {person.st = 2; n.lostPax++; events.push({type:'teamPickup'});}
  }
  if(n.race&&!n.braking&&!n.bracing&&!(n.boostTime>0)&&!(n.boostCooldown>0)&&n.hp>0){
    for(const item of RRBoostItems){
      if(!item.active||item.taken||Math.abs(item.s-n.s)>20)continue;
      if(RRHitsRock(n,{s:item.s,offset:item.offset,r:.72},previous,previousOffset)){
        item.taken=true;item.active=false;item.takenBy=n.tactic??'player';
        n.boostTime=2;n.boostCooldown=6;n.speed*=2;n.boostCount=(n.boostCount||0)+1;
        events.push({type:'boost',duration:2});break;
      }
    }
  }
  n.danger = RRforecast(n, rocks);
  n.dropWarning=RRDropAdvice(n);
  if (n.hp <= 0 || (n.passengers === 0 && !n.pax?.some(q => q.st === 1))) {
    RRCapsize(n,events,n.lastDamage||'crew');
  } else if (n.s >= n.finishS) {
    n.s = n.finishS; n.finishTime = n.time; n.phase = 'won';
    n.pax?.forEach(q => {if (q.st === 1) {q.st = 2; n.lostPax++;}});
    events.push({type:'won'});
  }
  return events;
  function damage(base, source,rock=null) {
    const impactSpeed=n.speed,side=rock?(Math.sign(n.offset-rock.offset)||Math.sign(n.vx)||1):Math.sign(-n.offset)||1;
    const force=_f(impactSpeed/65,.5,1.7);
    let point=null,normal=null;
    if(rock){
      const rx=Fe(rock.s)+rock.offset,rz=-rock.s;
      const nx=Fe(n.s)+n.offset-rx,nz=rock.s-n.s,len=Math.hypot(nx,nz)||1;
      normal={x:nx/len,z:nz/len};
      point={x:rx+normal.x*rock.r,y:$e(rock.s)+.45,z:rz+normal.z*rock.r*1.2};
    }
    RRStopBoost(n);
    const rawDamage = base * (touring ? .28 : 1) * (n.bracing ? .27 : 1) * craft.damage;
    const cap=n.race&&!n.practice&&n.time<40?6+Math.max(0,n.time-30)*10:Infinity;
    const amount=Math.min(rawDamage,cap)/RRDurabilityMultiplier;
    n.hp = Math.max(0, n.hp - amount); n.hits++; n.reaction = 1;
    n.shake = Math.min(1.6, amount / 20); n.immunity = opening?1.1:.65;
    n.lastDamage = source; n.speed *= opening?.78:source==='rock'?(n.bracing?.8:.43):(n.bracing?.88:.57);
    if(rock){
      const resistance=(n.bracing?.45:1)*(opening?.35:1)/Math.sqrt(craft.stability);
      n.vx+=side*(7+Math.min(130,impactSpeed)*.045)*resistance;
      n.offset+=side*.25*force*resistance;
      n.s=Math.max(n.race?(n.raceStartS??js(n.courseId).start):0,n.s-.7*force*resistance);
      n.impactYaw=-side*.13*force*resistance;n.knockback=.22;
      const overlap=RRBankOverlap(n);n.offset-=overlap.side*overlap.penetration;
    }
    n.surge = 0; n.combo = 0; n.recovery = n.bracing ? .3 : 1.2;
    let lost = 0;
    if (!touring && !n.bracing && amount > 28 && n.totalPassengers > 1) {
      const person = n.pax?.find(q => q.st === 0);
      if (person) {Object.assign(person,{st:1,s:n.s-2,o:n.offset+(person.id%2?1:-1)*2.3,t:0,sp:n.speed*.85}); n.passengers--; lost=1;}
    }
    events.push({type:'impact',damage:amount,lost,source,point,normal,side,force,impactSpeed});
  }
}

function RRforecast(state, rocks) {
  const speed = Math.max(1, state.speed), horizon = Math.max(65, speed * 2.8);
  const hull=RRWorldHull(state),center=Fe(state.s)+state.offset;
  const front=Math.max(...hull.map(p=>-p[1]))-state.s;
  const beam=Math.max(...hull.map(p=>Math.abs(p[0]-center)));
  let best = null;
  for (const fall of Ln) {
    const distance = fall.end - state.s;
    if (distance > 0 && distance < horizon) {
      best = {kind:'fall', seconds:distance/speed, distance, name:fall.name, height:fall.height, action:'踏ん張る', offset:state.offset}; break;
    }
  }
  for (const rock of rocks) {
    const distance = rock.s - state.s - rock.r*1.35 - front;
    if (distance < 0 || distance > horizon) continue;
    if (Math.abs(rock.offset-state.offset) > rock.r*1.18+beam+.2) continue;
    if (!best || distance < best.distance) best = {kind:'rock',seconds:distance/speed,distance,name:'衝突コース',action:rock.offset>=state.offset?'← 左へ回避':'右へ回避 →',offset:rock.offset};
  }
  return best;
}


