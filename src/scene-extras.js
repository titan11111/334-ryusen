// World dressing, swimmers and an outboard pole with articulated guide arms.
const worldWaterfalls=[], swimmerViews=[], seatHomes=Ko.map(p=>p.position.clone());
const upAxis=new L(0,1,0), poleTop=new L(),poleBottom=new L(),poleVector=new L(),gripA=new L(),gripB=new L();
const armMaterial=new Ie({color:'#bdab82',roughness:.9});
const guideArms=[];
const passengerArms=[];
const paxArmGeometry=new On(.047,.057,1,7);
const faceMaterial=new ke({vertexShader:'varying vec2 uvFace;void main(){uvFace=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 uvFace;void main(){float l=length((uvFace-vec2(.26,.65))*vec2(1.3,1.)),r=length((uvFace-vec2(.74,.65))*vec2(1.3,1.)),m=length((uvFace-vec2(.5,.28))*vec2(1.2,.85));float a=max(1.-smoothstep(.06,.08,min(l,r)),1.-smoothstep(.075,.095,m));gl_FragColor=vec4(.12,.08,.055,a);}',transparent:true,side:He,depthWrite:false});
for(const mesh of Ko){
  const oldArms=[mesh.children[5],mesh.children[8]];oldArms.forEach(arm=>mesh.remove(arm));
  const face=Pe(new Kn(.22,.20),faceMaterial,mesh,0,.82,-.17);face.rotation.y=Math.PI;
  const arms=[];
  for(const side of[-1,1])arms.push({side,mesh:Pe(paxArmGeometry,armMaterial,mesh),shoulder:new L(side*.21,.6,-.02),hand:new L(),delta:new L()});
  passengerArms.push(arms);
}
Cc.children.slice(-2).forEach(p=>Cc.remove(p));
for(const side of[-1,1]){
  const shoulder=new L(side*.21,.95,0),upper=Pe(new On(.053,.065,1,8),armMaterial,Cc),lower=Pe(new On(.046,.055,1,8),armMaterial,Cc);
  const hand=Pe(new ss(.07,8,6),armMaterial,Cc);
  guideArms.push({shoulder,upper,lower,hand,elbow:new L(),target:new L(),delta:new L()});
}
ad.rotation.set(0,0,0);ad.position.set(0,0,0);
const ringMaterial=new fi({color:'#f7b94b',side:He,transparent:true,opacity:.95,depthWrite:false});
for(const person of Ko){
  const marker=new ye(new rs(.48,.09,8,24),ringMaterial);marker.rotation.x=-Math.PI/2;be.add(marker);marker.visible=false;
  swimmerViews.push(marker);
}

function addFalls(start,length,side,height,seed){
  const positions=[],uv=[],indices=[],rows=72;
  for(let row=0;row<=rows;row++){
    const s=start+row/rows*length;
    for(let k=0;k<2;k++){
      const top=k===1,x=te(s)+side*(Ge(s)/2+.8+Math.sin(s*.025)*.6);
      positions.push(x+side*(top?2.5:0),oe(s)+(top?height*(.92+Math.sin(s*.075)*.08):.1),-s);
      uv.push(row/rows,k);
    }
    if(row<rows){const a=row*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
  }
  const geometry=new xe();geometry.setAttribute('position',new Jt(positions,3));geometry.setAttribute('uv',new Jt(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const material=new ke({uniforms:{time:{value:0},seed:{value:seed},mistColor:{value:new Bt(CW.fog)}},
    vertexShader:'varying vec2 vUv;varying float vD;void main(){vUv=uv;vec4 p=modelViewMatrix*vec4(position,1.);vD=-p.z;gl_Position=projectionMatrix*p;}',
    fragmentShader:`uniform float time;uniform float seed;uniform vec3 mistColor;varying vec2 vUv;varying float vD;
      float hash(float x){return fract(sin(x*127.1+seed)*43758.54);}
      void main(){float stripe=floor(vUv.x*105.);float edge=smoothstep(0.,.025,vUv.x)*smoothstep(1.,.97,vUv.x);
        float stream=.55+.3*sin(vUv.x*430.+sin(vUv.y*18.+time*5.)*.8)+.15*sin(vUv.x*1140.);
        float gaps=smoothstep(.13,.23,hash(stripe));float falls=sin(vUv.y*105.+time*17.+stripe)*.06;
        float cap=smoothstep(1.,.94,vUv.y);float a=edge*gaps*cap*(.59+stream*.3);
        vec3 col=mix(vec3(.59,.75,.71),vec3(.97,1.,.93),stream+falls);col=mix(col,mistColor,1.-exp(-vD*vD*.000035));
        gl_FragColor=vec4(col,a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,transparent:true,side:He,depthWrite:false});
  const curtain=new ye(geometry,material);be.add(curtain);worldWaterfalls.push(material);
  // The backing cliff physically meets the upper edge of the water curtain.
  for(let j=0;j<10;j++){
    const s=start+(j+.5)/10*length,x=te(s)+side*(Ge(s)/2+12),h=height*(.91+Math.sin(s*.075)*.08);
    const rock=new ye(Go,Ju);rock.position.set(x,oe(s)+h*.46,-s);rock.scale.set(6,h*.55,length/10*.83);rock.rotation.y=Math.sin(j*4+seed)*.15;rock.receiveShadow=true;be.add(rock);
    const lip=new ye(new tn(9,.7,length/10*1.04),Ju);lip.position.set(te(s)+side*(Ge(s)/2+6.4),oe(s)+h-.3,-s);lip.receiveShadow=true;be.add(lip);
  }
}
const fallHeight=CW.forest===1?49:CW.forest===2?59:27;
addFalls(42,135,1,fallHeight,29);
for(const [index,start] of[100,330,565,805,1065].entries()){
  addFalls(start,CW.forest===1?155:86,index%2?-1:1,fallHeight*(.8+index*.07),index+3);
  if(CW.forest===1)addFalls(start+60,88,index%2?1:-1,fallHeight*.75,index+11);
}
// Soft mist uses a fixed pool. Seeded once; no per-frame allocations or DOM growth.
const mistCount=320,mistBase=[],mistPos=new Float32Array(mistCount*3),mistSize=new Float32Array(mistCount);
for(let j=0;j<mistCount;j++){
  const group=j%5,start=[100,330,565,805,1065][group],s=start+Gt()*110,side=group%2?-1:1;
  mistBase.push({s,side,x:Gt()*5,h:Gt()*4,k:Gt()*6.28});mistSize[j]=5+Gt()*7;
}
const mistGeo=new xe();mistGeo.setAttribute('position',new Re(mistPos,3));mistGeo.setAttribute('aSize',new Re(mistSize,1));
const mistCloud=new Qi(mistGeo,new ke({uniforms:{tint:{value:new Bt(CW.fog)}},vertexShader:'attribute float aSize;varying float fade;void main(){vec4 p=modelViewMatrix*vec4(position,1.);fade=smoothstep(220.,60.,-p.z);gl_PointSize=clamp(aSize*220./max(5.,-p.z),2.,200.);gl_Position=projectionMatrix*p;}',fragmentShader:'uniform vec3 tint;varying float fade;void main(){float r=length(gl_PointCoord-.5)*2.;float a=pow(max(0.,1.-r*r),3.)*.085*fade;gl_FragColor=vec4(tint,a);}',transparent:true,depthWrite:false}));mistCloud.frustumCulled=false;be.add(mistCloud);

// Tropical broadleaf crowns use instancing and the existing seeded tree locations.
br.visible=false;
const crowns=new Fn(new ss(1,9,7),new Ie({color:'#758d67',roughness:.95}),$u.length*3);
$u.forEach((tree,index)=>{for(let k=0;k<3;k++){
  const acacia=CW.forest===2,scale=acacia?.43:.3;
  de.position.set(tree.x+(k-1)*2.2,tree.y+tree.h*(acacia?.7:.66+k*.09),-tree.s+Math.sin(index+k)*1.3);
  de.scale.set(tree.h*scale,tree.h*(acacia?.09:.18),tree.h*scale);de.rotation.set(0,tree.s*.3,k*.06);de.updateMatrix();crowns.setMatrixAt(index*3+k,de.matrix);
  crowns.setColorAt(index*3+k,Dc.setHSL(.22+Gt()*.08,.15+Gt()*.2,.33+Gt()*.15));
}});be.add(crowns);

// Split the original course-wide instances into short sections. Distant vegetation and
// boulders otherwise consume vertices even when they are a kilometre behind the boat.
const sceneChunks=[];
for(const mesh of[Sr,Yo,Nc,wc,crowns]){
  const groups=new Map(),matrix=new re(),color=new Bt();
  for(let index=0;index<mesh.count;index++){
    mesh.getMatrixAt(index,matrix);const key=Math.floor(-matrix.elements[14]/100);
    if(!groups.has(key))groups.set(key,[]);groups.get(key).push(index);
  }
  for(const [key,indices] of groups){
    const chunk=new Fn(mesh.geometry,mesh.material,indices.length);chunk.castShadow=mesh.castShadow;chunk.receiveShadow=mesh.receiveShadow;chunk.frustumCulled=false;
    indices.forEach((source,index)=>{mesh.getMatrixAt(source,matrix);chunk.setMatrixAt(index,matrix);if(mesh.instanceColor){mesh.getColorAt(source,color);chunk.setColorAt(index,color);}});
    sceneChunks.push({start:key*100,mesh:chunk});be.add(chunk);
  }
  mesh.visible=false;
}

// Share repeated crew/boat meshes by geometry and material. Simulation still owns
// the original hierarchy, while each visible batch takes one GPU draw call.
const crewBatches=[],crewGroups=new Map(),hiddenInstance=new re().makeScale(0,0,0);
Se.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.material.isMeshStandardMaterial||Array.isArray(mesh.material))return;
  const m=mesh.material,g=mesh.geometry;
  const key=g.type+JSON.stringify(g.parameters||{uuid:g.uuid})+m.type+m.color.getHexString()+m.roughness+m.metalness+String(m.onBeforeCompile);
  if(!crewGroups.has(key))crewGroups.set(key,{geometry:g,material:m,sources:[]});
  crewGroups.get(key).sources.push(mesh);
});
for(const group of crewGroups.values()){
  const batch=new Fn(group.geometry,group.material,group.sources.length);batch.frustumCulled=false;batch.castShadow=true;batch.receiveShadow=true;be.add(batch);
  group.sources.forEach(mesh=>mesh.visible=false);crewBatches.push({batch,sources:group.sources});
}

function updateWorld(dt,t){
  const riverS=ft.phase==='ready'?18:ft.s;
  for(const chunk of sceneChunks)chunk.mesh.visible=chunk.start<riverS+240&&chunk.start+100>riverS-45;
  worldWaterfalls.forEach(m=>m.uniforms.time.value=t);
  for(let j=0;j<mistCount;j++){
    const p=mistBase[j],s=p.s+Math.sin(t*.2+p.k)*3;
    mistPos[j*3]=te(s)+p.side*(Ge(s)/2+2+p.x)+Math.sin(t*.5+p.k)*1.5;
    mistPos[j*3+1]=oe(s)+p.h+Math.sin(t*.35+p.k)*1.4;mistPos[j*3+2]=-s;
  }
  mistGeo.attributes.position.needsUpdate=true;
  const playing=ft.phase!=='ready';
  for(let index=0;index<Ko.length;index++){
    const mesh=Ko[index],person=ft.pax[index],ring=swimmerViews[index];
    if(person.state==='water'&&playing){
      if(mesh.parent!==be)be.attach(mesh);
      mesh.visible=true;mesh.position.set(te(person.s)+person.offset,oe(person.s)+.08+Math.sin(t*4+index)*.07,-person.s);
      mesh.rotation.set(-.7,Math.sin(t*2+index)*.18,Math.sin(t*5+index)*.14);
      ring.visible=true;ring.position.set(mesh.position.x,oe(person.s)+.17,mesh.position.z);ring.scale.setScalar(1+Math.sin(t*5)*.08);
    }else{
      if(mesh.parent!==Se){Se.attach(mesh);mesh.position.copy(seatHomes[index]);}
      ring.visible=false;mesh.visible=person.state==='aboard';
      const reaction=ft.warning&&!ft.bracing?Math.sin(t*8+index)*.055:0;
      mesh.rotation.set(ft.bracing?.32:Math.sin(t*2+index)*.025+reaction,0,ft.bracing?-.05:Math.sin(t*3+index)*Mr(ft.s)*.045);
    }
    mesh.rotation.y=person.state==='water'?Math.sin(t+index)*.5:ft.warning&&!ft.bracing?(index%2?1:-1)*1.7:(index%2?1:-1)*.15;
    for(const arm of passengerArms[index]){
      const water=person.state==='water',wave=ft.warning&&!ft.bracing||ft.shake>.4;
      arm.hand.set(arm.side*(ft.bracing?.43:water?.38:wave?.40:.27),water?.92+Math.sin(t*8+index)*.12:ft.bracing?.21:wave?.7+Math.sin(t*7+index)*.15:.22,water?-.1:ft.bracing?0:-.28);
      arm.delta.subVectors(arm.hand,arm.shoulder);arm.mesh.position.copy(arm.hand).add(arm.shoulder).multiplyScalar(.5);arm.mesh.scale.y=arm.delta.length();arm.mesh.quaternion.setFromUnitVectors(upAxis,arm.delta.normalize());
    }
  }
  // At gunwale height the shaft is outboard. Its upper end can be above the guide safely.
  const side=ft.poleSide||1,stroke=ft.strokeT>0?Math.sin((1-ft.strokeT/.44)*Math.PI):0;
  poleTop.set(side*.25,2.95,3.45+stroke*.1);
  poleBottom.set(side*(ft.braking?3.05:3.3+stroke*.22),-.36,3.6-stroke*.85+(ft.braking?.7:0));
  if(ft.bracing){poleTop.set(side*1,2.9,3.5);poleBottom.set(side*1.8,.55,3.85);}
  Tr.position.copy(poleTop).add(poleBottom).multiplyScalar(.5);poleVector.subVectors(poleTop,poleBottom);
  Tr.quaternion.setFromUnitVectors(upAxis,poleVector.clone().normalize());ad.scale.y=poleVector.length()/5.1;
  // Hands target two points on the shaft. Elbows split the reach into two visible segments.
  Cc.position.x=side*.85;Se.updateMatrixWorld(true);Cc.updateMatrixWorld(true);
  for(let j=0;j<2;j++){
    const arm=guideArms[j];arm.target.copy(poleTop).lerp(poleBottom,.36+(side===1?j:1-j)*.1);Se.localToWorld(arm.target);Cc.worldToLocal(arm.target);
    arm.elbow.copy(arm.shoulder).lerp(arm.target,.52);arm.elbow.z+=.19;arm.elbow.y-=.18;
    segment(arm.upper,arm.shoulder,arm.elbow,arm.delta);segment(arm.lower,arm.elbow,arm.target,arm.delta);arm.hand.position.copy(arm.target);
  }
  Se.updateMatrixWorld(true);
  for(const {batch,sources} of crewBatches){
    sources.forEach((source,index)=>{
      let parent=source.parent,visible=true;while(parent&&parent!==be){if(!parent.visible){visible=false;break;}parent=parent.parent;}
      source.updateWorldMatrix(true,false);batch.setMatrixAt(index,visible?source.matrixWorld:hiddenInstance);
    });batch.instanceMatrix.needsUpdate=true;
  }
  function segment(mesh,a,b,delta){delta.subVectors(b,a);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.y=delta.length();mesh.quaternion.setFromUnitVectors(upAxis,delta.normalize());}
}

function updateWorldUI(){
  bt('courseStamp').textContent=CW.en;
  bt('section').textContent=CW.sections[ft.s<420?0:ft.s<820?1:2];
  const water=ft.pax.filter(p=>p.state==='water');
  bt('rescueHint').textContent=water.length?`落水 ${water.length}人 · 浮輪へ寄せて救助`:ft.rescued?`救助 ${ft.rescued}人`:'十人を船着き場へ';
  [...bt('pips').children].forEach((el,index)=>el.className=ft.pax[index].state==='water'?'water':ft.pax[index].state==='team'?'out':'');
  bt('poleState').textContent=ft.exhausted?'体力回復を待つ':ft.bracing?'全員、踏ん張る':ft.braking?'竿を入れて減速':ft.strokeT>0?(ft.strong?'岩を突く！':'竿で一突き'):water.length?'浮輪へ寄せろ':'竿を構える';
  const warning=ft.warning;bt('dropWarning').style.display=warning?'block':'none';bt('dropWarning').classList.toggle('safe',ft.bracing);
  if(warning){bt('dropDistance').textContent=ft.bracing?'そのまま、構えろ':`落差まで ${Math.ceil(warning.s-ft.s)}m`;bt('dropAction').textContent=ft.bracing?'全員が舟にしがみついている':'A / Space で踏ん張る';}
  bt('fc-btn-a').classList.toggle('ready',!!warning);
}

// Local-only QA hook is installed only when ?qa=1 is explicitly present.
if(new URLSearchParams(location.search).get('qa')==='1')window.ryusenQA={
  state:()=>ft,rocks:()=>ys,step:(dt,input={x:0})=>Hu(ft,dt,input,ys),start:hd,
  set:patch=>Object.assign(ft,patch),world:CW,create:Lo,simulate:Hu,
  ui:()=>dd(),
  pole:()=>({top:poleTop.toArray(),bottom:poleBottom.toArray()}),
  scene:()=>({waterfalls:worldWaterfalls.length,swimmers:ft.pax.filter(p=>p.state==='water').length})
};
