const {c,state,html}=require('./test_response.cjs');
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),vm=require('node:vm');
const passed=[];function test(name,run){run();passed.push(name);console.log('PASS',name);}
test('all craft gain 20 percent durability across opening stages and bracing',()=>{
  for(const spec of c.Qs)for(const time of [5,31,45])for(const brace of [false,true]){
    const n=state('sogi',spec.id);n.time=time;n.speed=65;n.tactic=1;
    const hit=c.kh(n,1/60,{x:0,brace},[{s:n.s+1,offset:0,r:1.2}]).find(e=>e.type==='impact');
    assert(hit,spec.id);const raw=(16+hit.impactSpeed*.65)*(brace?.27:1)*spec.damage;
    const cap=n.time<40?6+Math.max(0,n.time-30)*10:Infinity;
    assert(Math.abs(hit.damage-Math.min(raw,cap)/1.2)<1e-8,spec.id+'/'+time+'/'+brace);
    assert(n.hp<=100&&n.hp>=0);
  }
});
test('render detail preserves original collision surfaces and caches bounded meshes',()=>{
  const expected={wood:'63bc828d5acae93df6035d055781e1165722fcf41992250f60deccd28ecf1181',kayak:'cb1347693b142ccf3b2c30e545972fc33f9d0b4b5db53dbdf1bce238a0f7db38',canoe:'3c497a13a84b6640748e5eec401198c4a155fffab7e4b0e6cd9658040538f005',raft:'0d37205cd4369c625c277a926b1bacdda9b175e387343e2c516df0777c966ca7',packraft:'98f1aa656d968a3d2cc6957d170aa68c44b263816df12179331d9de035203c05',cataraft:'e7e17a011664dd3b459c3c22f94451dc91ccf5273159887fe41e4d1ad20ee2b4'};
  for(const spec of c.Qs){
    assert.equal(crypto.createHash('sha256').update(JSON.stringify(c.dv(spec.id))).digest('hex'),expected[spec.id]);
    assert(c.dv(spec.id,true).length>c.dv(spec.id).length);
    const g=c.RRRefineBoatGeometry(spec.id);assert.equal(c.RRRefineBoatGeometry(spec.id),g);assert(g.attributes.position.count<14000);
    assert(g.attributes.position.array.every(Number.isFinite));assert(g.attributes.normal.array.every(Number.isFinite));
  }
});
test('high-density rendering respects pixel budgets and enables antialiasing',()=>{
  vm.runInContext(fs.readFileSync(__dirname+'/../src/visual-quality.js','utf8'),c);
  assert(c.RRRenderPixelRatio(390,633,3,true)>1);
  for(const [w,h] of [[390,844],[844,390],[1920,1080],[3840,2160]])for(const coarse of [false,true]){
    const r=c.RRRenderPixelRatio(w,h,3,coarse),budget=coarse?2200000:3600000;assert(r===.75||w*h*r*r<=budget+1);
  }
  assert(html.includes('canvas:$l,antialias:!0'));
});
test('fictional course name replaces real name while saved record keys remain valid',()=>{
  assert.equal(c.js('sogi').name,'蒼霧の滝');assert(c.RRREGIONS.sogi.text.includes('架空'));
  assert(!html.includes('曽木'));assert(!html.includes('\\u66FD\\u6728'));assert(html.includes('tg.334.race.extreme-v6.4.'));
});
test('large controls and canvas share a reserved deck',()=>{
  const css=fs.readFileSync(__dirname+'/../src/extreme-ui.css','utf8');
  for(const size of [136,108,104,88])assert(css.includes('width:'+size+'px!important'));
  assert(html.includes('Math.round(innerHeight-deck)'));assert(!css.includes('inset:75%'));
});
console.log(JSON.stringify({qualityChecks:passed.length,cases:passed},null,2));
