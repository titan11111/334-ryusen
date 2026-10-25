// Execute the shipping menu, real selection callbacks, and real camera projection.
const {c,state,html}=require('./simulation-harness.cjs');
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
class Node{
  constructor(id=''){this.id=id;this.dataset={};this.attrs={};this.children=[];this.handlers={};this.style={};this.hidden=false;this.disabled=false;this.textContent='';this.classes=new Set();this.classList={toggle:(key,on)=>on?this.classes.add(key):this.classes.delete(key)};}
  setAttribute(key,value){this.attrs[key]=value;}getAttribute(key){return this.attrs[key];}
  addEventListener(key,fn){(this.handlers[key]||=[]).push(fn);}click(){for(const fn of this.handlers.click||[])fn({target:this,preventDefault(){}});}
  appendChild(node){this.children.push(node);}replaceChildren(){this.children=[];}
  querySelector(selector){if(selector==='span')return this.span||=(new Node());return this.children.find(n=>n.attrs['aria-pressed']==='true')||null;}
  querySelectorAll(selector){return this.children;}
  focus(){this.focused=true;}closest(){return this;}showModal(){this.open=true;}close(){this.open=false;}
}
const source=fs.readFileSync('src/menu.html','utf8'),nodes=new Map();
for(const match of source.matchAll(/id="([^"]+)"/g))nodes.set(match[1],new Node(match[1]));
const get=id=>nodes.get(id);c.j=get;c.document={body:new Node(),getElementById:get,createElement:()=>new Node(),querySelectorAll:selector=>get(selector.includes('courseSelect')?'courseSelect':'vesselSelect').children};
c.fr='sogi';c.Fi='wood';c.Ta='normal';c.lc=()=>{};c.RRDossier=()=>{};
vm.runInContext(fs.readFileSync('src/expedition-worlds.js','utf8'),c);
const from=html.indexOf('function Sf('),to=html.indexOf('var Ol=',from);vm.runInContext(html.slice(from,to),c);
vm.runInContext(fs.readFileSync('src/menu.js','utf8'),c);c.yv();c.RRInitMenu();
let passed=0;function test(name,run){run();passed++;console.log('PASS',name);}
test('start screen opens course selection; navigation uses one visible panel and a fixed launch action',()=>{
  assert.equal(get('overlay').dataset.menuScreen,'title');assert(!get('rrTitleScreen').hidden);assert(get('rrSelectScreen').hidden);
  get('rrEnterSelect').click();assert.equal(get('overlay').dataset.menuScreen,'select');assert(!get('rrCoursePanel').hidden);assert(get('rrBoatPanel').hidden);
  assert(!get('rrNextBoat').hidden);assert(get('raceStartBtn').hidden);
  get('rrNextBoat').click();assert(get('rrCoursePanel').hidden);assert(!get('rrBoatPanel').hidden);assert(!get('raceStartBtn').hidden);
  get('rrCourseStep').click();assert(!get('rrCoursePanel').hidden);assert(get('rrBoatPanel').hidden);
});
test('all three courses and six boats survive selection, back navigation and the actual launch binding',()=>{
  let launched=null;c.su=(...args)=>launched=args;
  const a=html.indexOf('j("raceStartBtn").addEventListener'),b=html.indexOf(';',a);vm.runInContext(html.slice(a,b+1),c);
  for(const course of get('courseSelect').children)for(const vessel of get('vesselSelect').children){
    get('rrCourseStep').click();course.click();get('rrNextBoat').click();vessel.click();
    assert.equal(c.fr,course.dataset.course);assert.equal(c.Fi,vessel.dataset.vessel);
    assert.equal(get('courseSelect').children.filter(n=>n.attrs['aria-pressed']==='true').length,1);
    assert.equal(get('vesselSelect').children.filter(n=>n.attrs['aria-pressed']==='true').length,1);
    assert(get('raceStartBtn').querySelector('span').textContent.includes(c.js(c.fr).name));
    get('raceStartBtn').click();assert.deepEqual(launched,[course.dataset.course,vessel.dataset.vessel]);
  }
});
test('keyboard selection cycles all courses and optional lore failures cannot cancel selection',()=>{
  const host=get('courseSelect'),buttons=host.children;c.RRSelectCourse('sogi');
  c.RRMenuArrow({key:'ArrowRight',target:buttons[0],preventDefault(){}},host,'course');assert.equal(c.fr,'iguazu');
  c.RRMenuArrow({key:'End',target:buttons[1],preventDefault(){}},host,'course');assert.equal(c.fr,'zambezi');
  c.RRDossier=()=>{throw Error('optional notes');};const old=c.console;c.console={warn(){}};
  c.RRSelectCourse('iguazu');assert.equal(c.fr,'iguazu');assert.equal(c.document.body.dataset.expedition,'iguazu');c.console=old;
  get('rrMenuBack').click();assert.equal(get('overlay').dataset.menuScreen,'title');
});
test('help is a separate compact dialog and the old field card cannot enlarge the new menu',()=>{
  get('rrMenuHelp').click();assert(get('rrHelpDialog').open);get('rrHelpClose').click();assert(!get('rrHelpDialog').open);
  c.RW={zambezi:{},iguazu:{}};c.RRInitExpedition();assert(!nodes.has('rrWorldCard'));
  assert(!source.includes('rr-selection-scroll'));assert(!source.includes('<img'));assert.equal((source.match(/id="raceStartBtn"/g)||[]).length,1);
});
c.RRFx={};vm.runInContext(fs.readFileSync('src/race-feedback.js','utf8'),c);
vm.runInContext(fs.readFileSync('src/mobile-view.js','utf8'),c);
test('portrait and landscape phone projections keep the boat and 20–50m obstacles in view',()=>{
  c.wa=true;c.hr=0;
  for(const [width,height,deck]of [[320,568,166],[375,667,166],[390,844,200],[667,375,114],[844,390,114]])
  for(const course of c.Pn)for(const speed of [65,130]){
    c.U=state(course.id);c.U.s=course.start+2000;c.U.speed=speed;c.innerWidth=width;c.innerHeight=height;
    const boatY=c.$e(c.U.s)+.36,position=new c.D(),target=new c.D();c.RRFrameMobileCamera(c.U.s,0,boatY,speed,position,target);
    const camera=new c.Ht(c.RRRaceFOV(speed),width/(height-deck),.1,2000);camera.position.copy(position);camera.lookAt(target);camera.updateMatrixWorld();
    const boat=new c.D(c.Fe(c.U.s),boatY,-c.U.s).project(camera);assert(Math.abs(boat.x)<.85);assert(boat.y>-.85&&boat.y<.6);
    for(const gap of [20,35,50]){const s=c.U.s+gap,point=new c.D(c.Fe(s),c.$e(s),-s).project(camera);assert(Math.abs(point.x)<1.05);assert(point.y>-.9&&point.y<.95);}
    c.U.capsized=true;c.RRFrameMobileCamera(c.U.s,0,boatY,speed,position,target);
    camera.fov=c.RRCameraLayout(width,height,speed,true).fov;camera.updateProjectionMatrix();camera.position.copy(position);camera.lookAt(target);camera.updateMatrixWorld();
    const inverted=new c.D(c.Fe(c.U.s),boatY,-c.U.s).project(camera);assert(Math.abs(inverted.x)<.02);assert(Math.abs(inverted.y)<.03);
  }
});
console.log(JSON.stringify({menuChecks:passed,launchCombinations:18,projectionConfigurations:30,nativeIOS:'NOT_TESTED'}));
