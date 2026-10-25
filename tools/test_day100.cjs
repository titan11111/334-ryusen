// Rendering-independent integration: execute the actual shipping scenery and crew code.
require('./test_quality.cjs');
require('./test_raceflow.cjs');
const {c,state,html}=require('./test_response.cjs');
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const passed=[];function test(name,fn){fn();passed.push(name);console.log('PASS',name);}
vm.runInContext(fs.readFileSync(__dirname+'/../src/expedition-worlds.js','utf8'),c);

test('each course has a distinct water palette, flowing foam, and an original field-guide illustration',()=>{
  const colors=new Set();
  for(const id of ['sogi','zambezi','iguazu']){
    const look=c.RRWorldLook(id);colors.add(look.deep);
    const poster=c.RRWorldPoster(id);assert(poster.startsWith('<svg'));assert(poster.includes('role="img"'));assert(!poster.includes('http://')||poster.includes('http://www.w3.org/2000/svg'));assert(!poster.includes('<script'));
    const start=html.indexOf('function Tf('),end=html.indexOf('var ls=',start);
    c.eu=()=>.5;c.RWG=null;
    vm.runInContext(html.slice(html.indexOf('function Gf('),html.indexOf('function Xf(')),c);
    vm.runInContext(html.slice(start,end),c);
    const scene=new c.Tt();scene.fog={color:new c.Ge('#b8d9cd')};
    const build=c.Tf(scene,{mobile:true,noise:()=>.5,naturalMaterial:color=>new c.Lt({color}),nGLSL:c.Wf,mountainHeight:c.Gf});
    const course=c.js(id),result=build(course.start-100,course.start+600,[]);
    assert.equal(result.regional.region,id);
    assert.equal(result.waterUniforms.uDeep.value.getHexString(),new c.Ge(look.deep).getHexString());
    let material;
    scene.traverse(node=>{if(node.material?.name==='DAY100 river / '+id)material=node.material;
      if(node.geometry?.attributes.position)assert(node.geometry.attributes.position.array.every(Number.isFinite));});
    assert(material);assert(material.fragmentShader.includes('float advected=ss-uTime*flowRate'));
    assert(!material.fragmentShader.includes('vec3 deep=vec3(.025,.22,.20)'));
    assert(material.fragmentShader.includes('float backwash='));
    if(id==='zambezi')assert(result.regional.columns>0&&result.regional.falls===0);
    if(id==='iguazu')assert(result.regional.falls>0&&result.regional.columns===0);
    c.Ft=scene;c.Xn=result;c.RRUpdateScenery(3,course.start+150);
    const cache=c.RRUpdateScenery.cache;
    assert(cache.ranges.filter(node=>node.visible).length<=5);
    if(id==='iguazu'){assert(cache.materials.length>0);assert(cache.materials.every(m=>m.uniforms.time.value===3));}
    c.RRUpdateScenery(4,course.start+150);assert.equal(cache,c.RRUpdateScenery.cache);
  }
  assert.equal(colors.size,3);
});
test('passenger identity controls the visible seat for every vessel and rescues return to that same seat',()=>{
  for(const spec of c.Qs){
    const view=c.Wh(spec.id),s=state('sogi',spec.id);s.time=2;
    c.Xh(view,0,s,1/60);c.RRAnimateCrew(view.rig,view.poses,s,0,spec.id);
    const seat=view.rig.passengers[0].g.position.clone();
    s.pax[0].st=1;s.passengers--;s.time=3;
    c.Xh(view,1,s,1/60);c.RRAnimateCrew(view.rig,view.poses,s,1,spec.id);
    assert(!view.rig.passengers[0].g.visible,spec.id);
    if(s.totalPassengers>1)assert(view.rig.passengers.at(-1).g.visible,spec.id);
    s.pax[0].st=0;s.passengers++;s.rescued=1;s.time=4;
    c.Xh(view,2,s,1/60);c.RRAnimateCrew(view.rig,view.poses,s,2,spec.id);
    assert(view.rig.passengers[0].g.visible);assert(view.rig.passengers[0].g.position.equals(seat));
    s.time=4.4;c.RRAnimateCrew(view.rig,view.poses,s,2.4,spec.id);
    assert(view.rig.passengers[0].g.position.y>seat.y);
    s.time=5;c.RRAnimateCrew(view.rig,view.poses,s,3,spec.id);
    assert(view.rig.passengers[0].g.position.equals(seat));
    s.pax[0].st=2;s.time=6;c.RRAnimateCrew(view.rig,view.poses,s,4,spec.id);
    assert(!view.rig.passengers[0].g.visible);
    const manifest=c.RRCrewManifest(s);assert.equal(manifest.people[0].state,'rescue-team');assert.equal(manifest.people[0].seat,0);
  }
});
test('damped secondary motion is frame-rate independent and cannot explode on slow frames',()=>{
  const values=[];
  for(const fps of [4,30,120]){
    const spring={x:0,v:0};for(let i=0;i<fps*2;i++)c.RRCrewSpring(spring,.12,1/fps);
    assert(Number.isFinite(spring.x));assert(spring.x<=.12&&spring.x>.119);values.push(spring.x);
  }
  assert(Math.max(...values)-Math.min(...values)<1e-10);
  const spring={x:.1,v:0};const before=JSON.stringify(spring);c.RRCrewSpring(spring,0,0);assert.equal(JSON.stringify(spring),before);
});
test('body motion pauses with simulation time and retry resets secondary motion and rescue poses',()=>{
  const view=c.Wh('wood'),s=state();s.time=3;c.Xh(view,0,s,1/60);c.RRAnimateCrew(view.rig,view.poses,s,0,'wood');
  s.vx=8;s.speed=70;s.time=3.15;c.Xh(view,.15,s,1/60);c.RRAnimateCrew(view.rig,view.poses,s,.15,'wood');
  const data=c.RRCrewCache.get(view.rig);assert(Math.abs(data.roll.x)>0);
  const before=JSON.stringify([data.pitch,data.roll]);c.RRAnimateCrew(view.rig,view.poses,s,.15,'wood');assert.equal(JSON.stringify([data.pitch,data.roll]),before);
  const retry=state();retry.time=0;c.Xh(view,0,retry,0);c.RRAnimateCrew(view.rig,view.poses,retry,0,'wood');
  assert.equal(data.roll.x,0);assert.equal(data.pitch.x,0);assert(view.rig.passengers.every(person=>person.g.visible));
});
test('anniversary field guide uses a dismissible native modal without blocking the race start',()=>{
  const nodes=new Map();let modal=false;
  function node(id){return {id,innerHTML:'',dataset:{},setAttribute(){},addEventListener(type,fn){this[type]=fn;},before(el){nodes.set(el.id,el);},appendChild(el){nodes.set(el.id,el);},querySelector(){return this.button||=(node('button'));},showModal(){modal=true;}};}
  for(const id of ['courseTag','rrDossier'])nodes.set(id,node(id));
  const eyebrow=node('eyebrow'),description=node('description');
  c.document={body:node('body'),createElement:()=>node(''),getElementById:id=>nodes.get(id),querySelector:s=>s.includes('eyebrow')?eyebrow:description};
  c.RW={sogi:{},iguazu:{},zambezi:{}};c.fr='zambezi';c.RRMusic={tracks:{zambezi:'The_Raging_Descent.mp3'}};
  c.RRInitExpedition();assert(eyebrow.textContent.includes('DAY 100'));assert.equal(c.document.body.dataset.expedition,'zambezi');
  assert(nodes.get('rrWorldCard').innerHTML.includes('ZAMBEZI / AFRICA'));
  nodes.get('rrWorldCard').button.click();assert(modal);assert(nodes.get('rrWorldDialog').innerHTML.includes('method="dialog"'));assert(nodes.get('rrWorldDialog').innerHTML.includes('The Raging Descent'));
  c.fr='iguazu';c.RRRenderExpedition();assert.equal(c.document.body.dataset.expedition,'iguazu');assert(nodes.get('rrWorldCard').innerHTML.includes('IGUAZÚ / SOUTH AMERICA'));
});
console.log(JSON.stringify({day100Checks:passed.length,cases:passed},null,2));
