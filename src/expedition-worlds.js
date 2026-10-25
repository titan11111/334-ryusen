// DAY 100: scenic identity and flow shading. These hooks also run during initial boot.
// Keep configuration inside functions: the first terrain builds before runtime initialization.
function RRWorldLook(id) {
  const looks={
    sogi:{deep:'#123f43',shallow:'#509487',sky:'#bcdcd3',foam:'#e0f2e6',accent:'#bad9ca',label:'蒼霧 / JAPAN INSPIRED',title:'蒼霧、白い水脈。',lead:'山の影を抜け、岩床を縫う。',features:['花崗岩の岩床','翡翠の流れ','霧の山林'],tip:'広い水路で進路を選び、波の山でA。岩が迫ればBで減速。'},
    zambezi:{deep:'#213e3d',shallow:'#848b64',sky:'#edbd8f',foam:'#fff0ce',accent:'#f1bd79',label:'ZAMBEZI / AFRICA',title:'黒い峡谷、黄金の飛沫。',lead:'夕陽に焼ける断崖。立ち波の向こうへ。',features:['玄武岩の柱状壁','乾いたアカシア','大きな立ち波'],tip:'狭い峡谷は早めにBで進路を整える。大波と着水はRで踏ん張る。'},
    iguazu:{deep:'#0a4146',shallow:'#4cae9a',sky:'#c9e8da',foam:'#e9fff9',accent:'#8de0bc',label:'IGUAZÚ / SOUTH AMERICA',title:'緑の聖域、幾重もの瀑布。',lead:'樹冠の奥から、水煙がほどける。',features:['重なる支流の滝','密な広葉樹林','水煙と淡い虹'],tip:'泡筋で流れを読み、合流では横流れを見越して操船。渦は外周へ。'}
  };
  return looks[id]||looks.sogi;
}

function RRWaterMaterial(material,id) {
  const look=RRWorldLook(id),uniforms=material.uniforms;
  for(const [key,color] of Object.entries({uDeep:look.deep,uShallow:look.shallow,uSky:look.sky,uFoam:look.foam}))uniforms[key]={value:new Ge(color)};
  uniforms.uRiverRegion={value:id==='zambezi'?1:id==='iguazu'?2:0};
  uniforms.uSun.value.set(...(id==='zambezi'?[-.78,.35,-.52]:[-.36,.87,-.33])).normalize();
  material.fragmentShader=material.fragmentShader
    .replace('uniform vec3 uTint;', 'uniform vec3 uTint;uniform vec3 uDeep;uniform vec3 uShallow;uniform vec3 uSky;uniform vec3 uFoam;uniform float uRiverRegion;')
    .replace('vec2 q=vec2(vW.x*.48,vW.z*.36+uTime*3.9);', `
      // Work in river coordinates so foam follows bends instead of crossing the banks.
      float bankMask=smoothstep(.62,.98,abs(vU.x-.5)*2.);
      float flowRate=mix(7.5,13.,clamp(vFlow.z,0.,1.));
      float advected=ss-uTime*flowRate;
      float shear=sin(ss*.09+uTime*.55)*bankMask*2.;
      vec2 q=vec2(lateral*.48+shear,-advected*.36);
    `)
    .replace('vec3 deep=vec3(.025,.22,.20),shallow=vec3(.11,.45,.36);', `
      float thread=ns(vec3(lateral*1.6+sin(advected*.14),advected*.09,2.));
      float lace=ns(vec3(lateral*3.1,advected*.6,uTime*.18));
      float ribbons=smoothstep(.66,.84,thread)*smoothstep(.28,.62,lace);
      float brokenCrest=crest*smoothstep(.25,.72,lace)*clamp(vFlow.z+.25,0.,1.);
      // River-edge eddies travel upstream, opposite to the main current.
      float backwash=ns(vec3(lateral*.8,(ss+uTime*2.8)*.25,4.));
      foam=max(foam,ribbons*(.22+vFlow.z*.5));
      foam=max(foam,brokenCrest*.88);
      foam=max(foam,bankMask*smoothstep(.65,.85,backwash)*.65);
      vec3 deep=uDeep,shallow=uShallow;
    `)
    .replace('vec3(.27,.43,.34),vec3(.68,.81,.73)', 'uSky*.46,uSky')
    .replace('vec3(.84,.96,.91),foam*.87','uFoam,clamp(foam*.9,0.,.94)')
    .replace('col*=uTint;', 'col*=mix(vec3(1.),uTint,.28);')
    // Use noise already evaluated for foam: finer wet glints, with no extra texture samples.
    .replace('normal=normalize(normal+vec3(sin(q.y*2.+uTime)*.12,0.,cos(q.x*2.3)*.14));',
      'normal=normalize(normal+vec3(sin(q.y*2.+uTime)*.12+(lace-.5)*.08,0.,cos(q.x*2.3)*.14+(thread-.5)*.08));')
    .replace('float fog=1.-exp(-fogDensity*fogDensity*vDepth*vDepth);',
      'float mistDepth=vDepth*(1.+(.06+uRiverRegion*.025)*(1.-smoothstep(3.,20.,cameraPosition.y-vW.y)));float fog=1.-exp(-fogDensity*fogDensity*mistDepth*mistDepth);');
  material.name='DAY100 river / '+id;
  return material;
}

function RRRegionalScenery(parent,start,end,random) {
  const id=Wn(start+100)?.courseId||'sogi';
  if(id==='sogi')return {region:id,falls:0,columns:0};
  const course=js(id),matrix=new Ct(),color=new Ge();
  // Segment scenery: one draw call per geometry/material, culled outside the local horizon.
  const segmentCount=Math.ceil((end-start)/180),waterMaterials=[];
  for(let segment=0;segment<segmentCount;segment++){
    const a=start+segment*180,b=Math.min(end,a+180),group=new Tt();
    group.userData.rrScenicRange=[a,b];parent.add(group);
    if(id==='zambezi'){
      const columns=new ri(new ln(1,1.16,1,6),new Lt({color:'#3a3834',roughness:.92}),20);
      for(let k=0;k<20;k++){
        const s=a+(k%10+.5)/10*(b-a),side=k<10?-1:1,depth=3.8+random()*3;
        const base=$e(s)+Gf(s,depth)-7,height=15+random()*18;
        matrix.position.set(Fe(s)+side*(rt(s)*.5+depth),base+height*.5,-s);
        matrix.rotation.set(0,random()*.35,side*.035);matrix.scale.set(1.9+random()*1.7,height,2.2+random()*1.5);matrix.updateMatrix();
        columns.setMatrixAt(k,matrix.matrix);columns.setColorAt(k,color.setHSL(.09,.08,.35+random()*.15));
      }
      group.add(columns);
      // Branching silhouettes supplement the sparse, flat acacia crowns of the base terrain.
      const branches=new ri(new ln(.08,.18,1,5),new Lt({color:'#64533b',roughness:1}),12);
      for(let k=0;k<12;k++){
        const s=a+(Math.floor(k/3)+.3)/4*(b-a),side=k%2?1:-1,depth=17+k%3*7;
        matrix.position.set(Fe(s)+side*(rt(s)*.5+depth),$e(s)+Gf(s,depth)+5.7,-s);
        matrix.rotation.set((k%3-1)*.65,0,(k%3-1)*.58);matrix.scale.set(1,5,1);matrix.updateMatrix();branches.setMatrixAt(k,matrix.matrix);
      }
      group.add(branches);
    }else{
      // Wide, broken curtains of falling water; the noise advects down the vertical face.
      const height=19+random()*12,width=11+random()*12,s=a+(b-a)*.55,side=segment%2?1:-1;
      const material=new Vt({uniforms:{time:{value:0}},transparent:true,depthWrite:false,side:Dt,
        vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader:`uniform float time;varying vec2 vUv;${Wf}
          void main(){float ribbon=ns(vec3(vUv.x*32.,(vUv.y+time*.48)*8.,1.));
          float gaps=smoothstep(.16,.33,ns(vec3(vUv.x*18.,0.,2.)));
          float streak=.68+.32*sin(vUv.x*210.+vUv.y*17.+time*12.);
          float edge=smoothstep(0.,.07,vUv.x)*(1.-smoothstep(.93,1.,vUv.x));
          float alpha=edge*gaps*(.35+ribbon*.55);
          gl_FragColor=vec4(mix(vec3(.45,.73,.65),vec3(.94,1.,.96),streak),alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`});
      const fall=new ut(new Hn(width,height,1,1),material),angle=Math.atan(Fv(s));
      // Plane is tangent to the bank; its bottom meets the river, not the cliff rim.
      fall.position.set(Fe(s)+side*(rt(s)*.5+.9),$e(s)+height*.5-.25,-s);fall.rotation.y=side*Math.PI*.5+angle;group.add(fall);waterMaterials.push(material);
      const count=10,positions=new Float32Array(count*3),speeds=[];
      for(let k=0;k<count;k++){positions[k*3]=(random()-.5)*width*1.6;positions[k*3+1]=random()*6;positions[k*3+2]=(random()-.5)*5;speeds.push(random());}
      const geometry=new ct();geometry.setAttribute('position',new vt(positions,3));
      const mist=new bi(geometry,new Si({color:'#d8f7e8',map:RRSoftMistTexture(),size:6,transparent:true,opacity:.2,depthWrite:false}));
      mist.position.set(fall.position.x,$e(s)+2,-s);mist.rotation.y=fall.rotation.y;group.add(mist);mist.userData.rrMist={base:positions.slice(),speeds};
      if(segment%4===1){
        const rainbow=new ut(new Ki(11,.22,3,36,Math.PI),new si({color:'#d6d6a5',transparent:true,opacity:.13,depthWrite:false,side:Dt}));
        rainbow.position.set(fall.position.x-side*3,$e(s)+4,-s);rainbow.rotation.y=fall.rotation.y;group.add(rainbow);
      }
      const vines=new ri(new ln(.055,.08,1,4),new Lt({color:'#2e5432',roughness:1}),9);
      for(let k=0;k<9;k++){const depth=3+k%3*2,sx=s+(k-4)*4,y=$e(sx)+Gf(sx,depth);matrix.position.set(Fe(sx)+side*(rt(sx)*.5+depth),y-2,-sx);matrix.rotation.set(0,0,.1*Math.sin(k));matrix.scale.set(1,6+random()*9,1);matrix.updateMatrix();vines.setMatrixAt(k,matrix.matrix);}group.add(vines);
    }
  }
  parent.userData.rrWaterfalls=waterMaterials;
  return {region:id,falls:id==='iguazu'?segmentCount:0,columns:id==='zambezi'?segmentCount*20:0};
}

function RRSoftMistTexture() {
  if(RRSoftMistTexture.texture)return RRSoftMistTexture.texture;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=32;
  const context=canvas.getContext('2d'),image=context.createImageData(32,32);
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){
    const radius=Math.hypot((x-15.5)/15.5,(y-15.5)/15.5),i=(y*32+x)*4;
    image.data[i]=image.data[i+1]=image.data[i+2]=255;image.data[i+3]=Math.round(Math.max(0,1-radius)**2*255);
  }
  context.putImageData(image,0,0);return RRSoftMistTexture.texture=new jt(canvas);
}

function RRUpdateScenery(time,position) {
  // Traverse only when the terrain instance changes, then reuse the bounded list.
  if(RRUpdateScenery.terrain!==Xn){
    const ranges=[],mist=[],materials=[];
    Ft.traverse(node=>{
      if(node.userData.rrScenicRange)ranges.push(node);
      if(node.userData.rrMist)mist.push(node);
      if(node.userData.rrWaterfalls)materials.push(...node.userData.rrWaterfalls);
    });
    RRUpdateScenery.terrain=Xn;RRUpdateScenery.cache={ranges,mist,materials};
  }
  const cache=RRUpdateScenery.cache;
  cache.ranges.forEach(node=>{const [a,b]=node.userData.rrScenicRange;node.visible=b>position-100&&a<position+430;});
  cache.materials.forEach(material=>material.uniforms.time.value=time);
  cache.mist.forEach(node=>{if(!node.parent.visible)return;const data=node.userData.rrMist,p=node.geometry.attributes.position;
    for(let k=0;k<p.count;k++)p.setY(k,(data.base[k*3+1]+time*(.55+data.speeds[k]))%8);p.needsUpdate=true;
  });
}

function RRWorldPoster(id) {
  const desert=id==='zambezi',jungle=id==='iguazu',look=RRWorldLook(id);
  // Original vector artwork, also usable without a network or image downloads.
  const trees=Array.from({length:jungle?22:desert?6:14},(_,k)=>{
    const x=(k*137+29)%800,y=95+(k*31)%92,size=jungle?26+(k%4)*9:desert?16:25;
    return `<path d="M${x},${y+35}v-40m0,15l-13,-14m13,11l14,-14" stroke="${desert?'#504635':'#284939'}" stroke-width="4"/><ellipse cx="${x}" cy="${y-9}" rx="${size}" ry="${desert?7:jungle?22:32}" fill="${desert?'#6d7040':k%2?'#2f6550':'#214c41'}"/>`;
  }).join('');
  const falls=jungle?Array.from({length:13},(_,k)=>`<path d="M${50+k*58},111q${k%2?7:-5},40 0,90" stroke="#e7fff2" stroke-opacity="${.35+k%3*.2}" stroke-width="${6+k%4*3}"/>`).join(''):'';
  return `<svg viewBox="0 0 800 270" role="img" aria-label="${look.title}" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="270" fill="${look.sky}"/><circle cx="650" cy="55" r="${desert?33:21}" fill="${desert?'#ffe1a3':'#f0ffe6'}"/><path d="M0 95L105 45 202 90 320 55 450 95 570 58 800 90V270H0Z" fill="${desert?'#84725d':'#648d79'}"/><path d="M0 130L125 78 253 139 370 112 415 186 485 125 607 102 800 130V270H0Z" fill="${desert?'#3c3d38':'#284f43'}"/>${desert?'<path d="M70 110v105m42-122v120m45-103v115m490-112v110m42-98v120m35-110v120" stroke="#77725d" stroke-opacity=".45" stroke-width="8"/>':''}${trees}${falls}<path d="M385 160Q310 187 410 210T350 275H580Q480 235 508 212T432 158Z" fill="${look.shallow}"/><path d="M407 174q-45 20 30 36t-9 52m13-72q-11 8 22 16m-44 28q20 6 45 4" stroke="${look.foam}" fill="none" stroke-width="3" opacity=".8"/>${jungle?'<ellipse cx="415" cy="199" rx="330" ry="24" fill="#e8fff0" opacity=".22"/>':''}</svg>`;
}

function RRRenderExpedition() {
  if(!document.getElementById('rrWorldCard'))return;
  const look=RRWorldLook(fr);document.body.dataset.expedition=fr;
  const card=document.getElementById('rrWorldCard');
  card.innerHTML=RRWorldPoster(fr)+`<div class="rr-world-copy"><small>${look.label}</small><b>${look.title}</b><button type="button" id="rrWorldOpen">風景と攻略を見る ↗</button></div>`;
  card.querySelector('button').addEventListener('click',()=>{
    const dialog=document.getElementById('rrWorldDialog'),region=RRREGIONS[fr];
    dialog.innerHTML=`<form method="dialog"><button class="rr-world-close" aria-label="閉じる">×</button></form>${RRWorldPoster(fr)}<div class="rr-dialog-copy"><small>DAY 100 · ${look.label}</small><h2 id="rrWorldTitle">${look.title}</h2><p>${look.lead}</p><div class="rr-world-tags">${look.features.map(tag=>'<span>'+tag+'</span>').join('')}</div><p>${region.text}</p><b>流れを読む</b><p>${look.tip}</p><p class="rr-track">♪ ${RRMusic.tracks[fr].replaceAll('_',' ').replace('.mp3','')}<br><small>レース開始で再生 · 音ON/OFFに連動</small></p><small>実在の川から着想した架空の競技コースです。</small></div>`;
    dialog.showModal();
  });
}

function RRInitExpedition() {
  // The compact menu owns its illustrations; never insert the old 142px field card.
  if(document.getElementById('rrTitleScreen')){
    Object.assign(RW.zambezi,{bg:'#d5a477',fogC:'#ba9679',fogD:.0048,sun:'#ffd299',sunP:[-124,36,-94],hemiS:'#f4cfab',hemiG:'#302b22',bank:'#69604c'});
    Object.assign(RW.iguazu,{bg:'#b8d9cd',fogC:'#b2d8c7',fogD:.0075,hemiS:'#dcffe8',hemiG:'#173c2d',bank:'#3a6047'});
    RWC=null;return;
  }
  const title=document.querySelector('.hero .eyebrow');title.textContent='DAY 100 / SPECIAL EXPEDITION';
  document.querySelector('.hero .description').innerHTML='100日、つくり続けた先へ。<br>流れを読み、仲間と帰ろう。';
  const host=document.getElementById('courseTag'),card=document.createElement('div');card.id='rrWorldCard';host.before(card);
  const dialog=document.createElement('dialog');dialog.id='rrWorldDialog';dialog.setAttribute('aria-labelledby','rrWorldTitle');document.body.appendChild(dialog);
  dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});
  // Stronger lighting identities; existing shader tint remains compatible with other effects.
  Object.assign(RW.zambezi,{bg:'#d5a477',fogC:'#ba9679',fogD:.0048,sun:'#ffd299',sunP:[-124,36,-94],hemiS:'#f4cfab',hemiG:'#302b22',bank:'#69604c'});
  Object.assign(RW.iguazu,{bg:'#b8d9cd',fogC:'#b2d8c7',fogD:.0075,hemiS:'#dcffe8',hemiG:'#173c2d',bank:'#3a6047'});
  RWC=null;RRRenderExpedition();
}
