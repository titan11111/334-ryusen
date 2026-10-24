// Pure simulation boundary. No meshes, DOM nodes or audio objects are held here.
const PAX_NAMES=['田中','佐藤','鈴木','高橋','渡辺','伊藤','山本','中村','小林','加藤'];
function Lo(mode='normal') {
  return {phase:'ready',mode,s:0,offset:0,vx:0,speed:8,hp:100,stamina:100,time:0,
    passengers:10,pax:PAX_NAMES.map((name,id)=>({id,name,state:'aboard',s:0,offset:0,t:0,speed:0})),
    hits:0,near:0,rescued:0,safeDrops:0,immunity:0,shake:0,bracing:false,braking:false,
    strokes:0,strokeT:0,strokeCD:0,poleSide:1,strong:false,exhausted:false,falls:[],
    caption:'',captionT:0,score:0,warning:null};
}
function poleReach(state,side,rocks) {
  if(Ge(state.s)/2-state.offset*side<4.7)return true;
  return rocks.some(r=>Math.abs(r.s-state.s)<4.8&&(r.offset-state.offset)*side>1.2&&(r.offset-state.offset)*side-r.r<4.5);
}
function Hu(state,dt,input,rocks) {
  if(state.phase!=='playing')return [];
  const events=[], scenic=state.mode==='scenic', rough=Mr(state.s), drop=Po(state.s), prev=state.s;
  state.time+=dt;state.immunity=Math.max(0,state.immunity-dt);state.shake*=Math.exp(-dt*5);
  state.captionT=Math.max(0,state.captionT-dt);state.strokeT=Math.max(0,state.strokeT-dt);state.strokeCD-=dt;
  if(state.stamina<=1)state.exhausted=true;
  if(state.stamina>=27)state.exhausted=false;
  const active=!state.exhausted&&state.stamina>1;
  state.bracing=!!input.brace&&active;
  state.braking=!!input.brake&&active&&!state.bracing;
  state.stamina=Math.max(0,Math.min(100,state.stamina+dt*(state.bracing?-12:state.braking?-16:17)));
  // Brace is deliberately exclusive with pole use. A planted stroke is an impulse, not a motor.
  if(!state.bracing&&!state.braking&&Math.abs(input.x)>.18&&state.strokeCD<=0) {
    state.poleSide=-Math.sign(input.x);state.strong=poleReach(state,state.poleSide,rocks);
    state.strokeT=.44;state.strokeCD=.44;state.strokes++;
    state.vx+=Math.sign(input.x)*(state.strong?7.2:3.55)*Math.min(1,Math.abs(input.x)*1.4);
    events.push({type:'stroke',strong:state.strong,side:state.poleSide});
  }
  const target=(scenic?8:11.3)+rough*(scenic?3:6.5)+drop*3;
  state.speed+=((state.braking?Math.max(3.5,target-9):target)-state.speed)*Math.min(1,dt*1.7);
  state.vx+=(Math.sin(state.s*.041+state.time*.24)*rough*(scenic?.9:2.2)-state.vx*1.75)*dt;
  state.offset+=state.vx*dt;state.s+=state.speed*dt;
  const half=Ge(state.s)/2-1.65;
  if(Math.abs(state.offset)>half){const side=Math.sign(state.offset),impact=Math.abs(state.vx);state.offset=side*half;state.vx=-side*impact*.4;if(state.immunity<=0&&impact>1.5)damage(5+impact*.7,'bank');}
  for(const rock of rocks){
    const ds=rock.s-state.s,dx=rock.offset-state.offset;
    if(Math.abs(ds)<rock.r+2.8&&Math.abs(dx)<rock.r+1.05&&Math.hypot(ds*.7,dx)<rock.r+1.3&&state.immunity<=0){
      rock.hit=true;state.vx+=Math.sign(-dx||1)*3.4;state.speed*=.7;damage(11+state.speed*.36,'rock');
    }
    if(!rock.passed&&ds<-rock.r-3){rock.passed=true;if(!rock.hit&&Math.abs(dx)<rock.r+3.2){state.near++;events.push({type:'near'});}}
  }
  for(const [index,fall] of CW.drops.entries())if(prev<fall.s&&state.s>=fall.s&&!state.falls.includes(index)){
    state.falls.push(index);state.shake=1.2;
    if(state.bracing){state.safeDrops++;events.push({type:'safeDrop'});}else if(!scenic){damage(7+fall.h*.35,'fall');eject(fall.h>9?2:1);}
    events.push({type:'fall',safe:state.bracing});
  }
  state.warning=CW.drops.find(f=>f.s>state.s&&f.s-state.s<65)||null;
  for(const person of state.pax)if(person.state==='water'){
    person.t+=dt;const flow=(scenic?8:11.3)+Mr(person.s)*(scenic?3:6.5);
    person.speed+=(flow*.91-person.speed)*dt;person.s+=person.speed*dt;
    person.offset+=Math.sin(person.s*.06+person.id)*rough*.24*dt;
    person.offset=Math.max(-Ge(person.s)/2+1,Math.min(Ge(person.s)/2-1,person.offset));
    if(person.t>1.1&&Math.hypot((person.s-state.s)*.7,person.offset-state.offset)<3.15){
      person.state='aboard';state.rescued++;events.push({type:'rescue',name:person.name});
    }else if(Math.abs(person.s-state.s)>55){person.state='team';events.push({type:'team',name:person.name});}
  }
  state.passengers=state.pax.filter(p=>p.state==='aboard').length;
  if(state.hp<=0){state.phase='lost';events.push({type:'lost'});}
  else if(state.s>=1260){state.s=1260;state.phase='won';state.pax.forEach(p=>{if(p.state==='water')p.state='team';});events.push({type:'won'});}
  return events;
  function eject(count){
    const aboard=state.pax.filter(p=>p.state==='aboard').reverse();
    for(const person of aboard.slice(0,count)){
      person.state='water';person.s=state.s+6.5+person.id%2*1.5;person.offset=state.offset+(person.id%2?1:-1)*3.5;
      person.t=0;person.speed=state.speed*.9;events.push({type:'eject',name:person.name});
    }
    state.passengers=state.pax.filter(p=>p.state==='aboard').length;
  }
  function damage(base,source){
    const amount=base*(scenic?.48:1)*(state.bracing?.28:1);
    state.hp=Math.max(0,state.hp-amount);state.hits++;state.immunity=1.05;state.shake=Math.min(1.5,amount/12);
    if(!state.bracing&&source==='rock'&&amount>12&&state.hp<84&&!scenic)eject(1);
    events.push({type:'impact',damage:amount,lost:0,source});
  }
}
