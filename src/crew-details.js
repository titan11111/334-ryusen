// Identity and reaction temperament are independent. Every species wears flotation equipment.
var RRCrewCache=new WeakMap(),RRCrewMaterials=null,RRCrewTorso=null;
function RRCrewPalette() {
  if(RRCrewMaterials)return RRCrewMaterials;
  RRCrewTorso=new ln(.46,.53,1,12);
  return RRCrewMaterials={skin:['#f1c7a5','#d6a079','#ac7754','#774c38','#543c31','#e6b9a3','#90b7b5','#8f87bc'].map(color=>new Lt({color,roughness:.8})),dark:new Lt({color:'#283033',roughness:.7}),cloth:['#4e6669','#775d62','#3e5866','#6b704f'].map(color=>new Lt({color,roughness:.85}))};
}
function RRDecorateCrew(rig,id) {
  if(RRCrewCache.has(rig))return RRCrewCache.get(rig);
  const palette=RRCrewPalette(),seed=Array.from(id).reduce((a,c)=>a+c.charCodeAt(0),0);
  const crew=rig.passengers.map((person,index)=>{
    const code=(seed+index*5)%23,alien=code%7===3||code%11===7;
    const skin=palette.skin[alien?6+code%2:code%6];
    person.head.material=skin;person.neck.material=skin;
    person.arms.forEach(arm=>{arm.fore.material=skin;arm.hand.material=skin;arm.upper.material=palette.cloth[code%4];});
    person.head.scale.x*=alien?1.1:.92+(code%4)*.045;
    person.head.scale.y*=alien?1.12:.96+(code%3)*.04;
    person.body.geometry=RRCrewTorso;
    const trim=new Tt();
    const add=(geometry,material,x,y,z)=>{const mesh=new ut(geometry,material);mesh.position.set(x,y,z);trim.add(mesh);return mesh;};
    for(const side of [-1,1]){
      const ear=add(new wi(1,8,6),skin,side*(alien?.171:.145),.005,.005);ear.scale.set(alien?.061:.032,alien?.027:.045,.025);
      if(alien){add(new ln(.009,.012,.13,6),skin,side*.09,.20,.01);add(new wi(.022,7,5),palette.dark,side*.09,.275,.01);}
    }
    RRMergeBoatTrim(trim);person.face.add(trim);
    const brows=[-1,1].map(side=>{const b=new ut(new Mn(.054,.011,.012),palette.dark);b.position.set(side*.061,.075,-.147);person.face.add(b);return b;});
    return {person,brows,alien,temperament:.8+(code%5)*.1,phase:code*.71,
      eyeScale:person.eyes.map(eye=>eye.scale.clone()),mouthScale:new D(person.mouth.scale.x,.018,person.mouth.scale.z),reaction:'cruise'};
  });
  let guideFace=null;
  if(rig.guide){
    const guide=rig.guide,skin=palette.skin[seed%6];guide.head.material=skin;guide.neck.material=skin;
    guide.arms.forEach(a=>{a.fore.material=skin;a.hand.material=skin;});
    guideFace=new Tt();for(const sign of [-1,1]){const eye=new ut(new wi(.017,7,5),palette.dark);eye.position.set(sign*.06,.025,-.146);guideFace.add(eye);}
    RRMergeBoatTrim(guideFace);guide.g.add(guideFace);
  }
  const data={crew,guideFace,lastHits:0,lastDrops:0,lastRescues:0,until:0,reason:'cruise'};RRCrewCache.set(rig,data);return data;
}
function RRCrewReaction(state,data,time) {
  const hits=state.hits||0,drops=state.landedDrops?.length||0,rescues=state.rescued||0;
  if(hits>data.lastHits){data.reason='impact';data.until=time+1.05;}
  else if(rescues>data.lastRescues){data.reason='relief';data.until=time+1.8;}
  else if(drops>data.lastDrops){data.reason='landing';data.until=time+.9;}
  data.lastHits=hits;data.lastDrops=drops;data.lastRescues=rescues;
  if(state.phase==='won')return 'celebrate';
  if(time<data.until)return data.reason;
  if(state.boostTime>0)return 'boost';
  if(state.bracing)return 'brace';
  if(state.braking)return 'brake';
  if(state.vortexPower>.25)return 'vortex';
  if(state.danger?.seconds<1.3)return 'anticipate';
  if(state.activeDrop>=0)return 'fall';
  if(state.duel>.5)return 'duel';
  if(state.strokeThrust>.15)return 'paddle';
  return 'cruise';
}
function RRAnimateCrew(rig,poses,state,time,id) {
  const data=RRDecorateCrew(rig,id),reaction=RRCrewReaction(state,data,state.time||0);
  if(data.guideFace){data.guideFace.position.copy(rig.guide.head.position);data.guideFace.rotation.y=rig.guide.head.rotation.y;}
  for(let index=0;index<data.crew.length;index++){
    const m=data.crew[index],p=m.person;
    if(!p.g.visible)continue;m.reaction=reaction;
    const shock=['impact','landing','fall'].includes(reaction),calm=['relief','celebrate'].includes(reaction);
    const wobble=Math.sin(time*5+m.phase)*m.temperament;
    const lean=reaction==='boost'?.10:reaction==='brake'?-.10:reaction==='brace'?-.07:reaction==='impact'?-.12*wobble:reaction==='paddle'?-.06:0;
    // Paddling crew retain grip alignment; larger whole-body motion is reserved for passengers.
    p.g.rotation.x=id==='wood'?lean:lean*.22;
    p.g.rotation.z=id==='wood'?(reaction==='vortex'?.1*Math.sin(time*7+m.phase):shock?.07*wobble:0):0;
    const blink=!shock&&Math.sin(time*(1.1+(index%3)*.11)+m.phase)>.997;
    p.eyes.forEach((eye,i)=>{const base=m.eyeScale[i];eye.scale.set(base.x*(m.alien?1.28:1),base.y*(blink?.12:shock?1.24:calm?.7:1),base.z);});
    const mouth=shock?2.3+Math.abs(wobble):reaction==='boost'?1.8:reaction==='anticipate'?1.4:calm?.65:1;
    p.mouth.scale.set(m.mouthScale.x*(calm?1.5:1),m.mouthScale.y*mouth,m.mouthScale.z);
    m.brows.forEach((b,i)=>{b.rotation.z=(i?1:-1)*(shock?-.28:calm?.2:reaction==='anticipate'?-.17:0);b.position.y=.075+(shock?.016:0);});
    if(reaction==='duel'){const turn=Math.sin(time*2+m.phase)*.23;p.head.rotation.y+=turn;p.face.rotation.y+=turn;p.hair.rotation.y+=turn;}
    const pose=poses?.passengers?.[index];
    if(id==='wood'&&pose&&(shock||reaction==='brace'||reaction==='celebrate'||reaction==='anticipate')){
      p.arms.forEach((arm,side)=>{
        const sign=side?1:-1,root=pose.arms[side].root;
        const target=Re(shock||reaction==='celebrate'?pose.head:pose.chest,[sign*.24,shock?.06:reaction==='celebrate'?.13:-.08,-.12]);
        const base=pose.arms[side];
        const solved=sr(root,target,It(yt(base.elbow,root)),It(yt(base.hand,base.elbow)),[sign*.5,-.05,.45]);
        tn(arm.upper,solved.root,solved.elbow,.054);tn(arm.fore,solved.elbow,solved.hand,.044);en(arm.hand,solved.hand);
      });
    }
  }
}
function RRAnimateAllCrew() {
  if(typeof nu==='undefined')return;
  if(U.vesselId==='wood')RRAnimateCrew(nu,lr,U,pt,'wood');
  else {const view=iu.get(U.vesselId);if(view)RRAnimateCrew(view.rig,view.poses,U,pt,U.vesselId);}
  gn.forEach((state,index)=>{const view=Aa[index];if(view?.group.visible)RRAnimateCrew(view.rig,view.poses,state,pt,state.vesselId);});
}
