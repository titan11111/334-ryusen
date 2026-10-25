// Deterministic CPU comparison, not an FPS/GPU measurement.
const fs=require('node:fs'),vm=require('node:vm'),{performance}=require('node:perf_hooks');
const html=fs.readFileSync(process.argv[2]||'index.html','utf8');
const c=vm.createContext({console,AbortController,URL,TextDecoder,TextEncoder});
const a=html.indexOf('var mf='),b=html.indexOf('var zh=',a),three=html.indexOf('/**',html.indexOf('<script>(()=>{'));
vm.runInContext(html.slice(three,a),c);vm.runInContext(html.slice(a,b),c);
let from=html.indexOf('var uv='),to=html.indexOf('function Df(',from);vm.runInContext(html.slice(from,to),c);
from=html.indexOf('var hi=');to=html.indexOf('Yn(Jf,tu,ui',from);vm.runInContext(html.slice(from,to),c);
vm.runInContext('RRRegisterHull("wood-player",Array.from({length:Jf.attributes.position.count},(_,i)=>[Jf.attributes.position.getX(i)*1.2,Jf.attributes.position.getZ(i)*1.2]))',c);
from=html.indexOf('var zh=');to=html.indexOf('function ',html.indexOf('function Bl(',from)+14);vm.runInContext(html.slice(from,to),c);
vm.runInContext(html.slice(html.indexOf('function Gf('),html.indexOf('function Xf(')),c);
from=html.indexOf('function Tf(');to=html.indexOf('var ls=',from);vm.runInContext(html.slice(from,to),c);
c.document={createElement(){return {getContext(){return {createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)};},putImageData(){}};}};}};
vm.runInContext(fs.readFileSync('src/expedition-worlds.js','utf8'),c);
c.eu=()=>.5;c.RWG=null;
const reports=[];
for(const id of ['sogi','zambezi','iguazu']){
  const scene=new c.Tt();scene.fog={color:new c.Ge('#b8d9cd')};const course=c.js(id),rocks=c.Bh();
  const opts={mobile:true,noise:()=>.5,naturalMaterial:color=>new c.Lt({color}),nGLSL:c.Wf,mountainHeight:c.Gf};
  let tick=performance.now();c.Tf(scene,opts)(course.start-100,course.finish+160,rocks.filter(r=>r.s>=course.start&&r.s<course.finish));
  const wholeMs=performance.now()-tick,chunkMs=[];
  for(let a=course.start-100;a<course.finish+160;a+=540){tick=performance.now();c.Tf(scene,opts)(a,Math.min(course.finish+160,a+540),rocks.filter(r=>r.s>=a&&r.s<a+540));chunkMs.push(performance.now()-tick);}
  const boats=c.Qs.map((spec,i)=>{const n=c.tr('normal',spec.id);Object.assign(n,{phase:'playing',s:course.start+3000,race:true,courseId:id,finishS:course.finish,tactic:i,time:45});return n;});
  const frames=[];
  for(let i=0;i<600;i++){tick=performance.now();for(const n of boats){const input=c.yf(n,rocks,boats,c.rt(n.s),c.Oh(n.s,n.speed*.65));c.kh(n,1/60,input,rocks);}frames.push(performance.now()-tick);}
  frames.sort((a,b)=>a-b);
  reports.push({course:id,wholeTerrainMs:+wholeMs.toFixed(2),largestChunkMs:+Math.max(...chunkMs).toFixed(2),
    simulationMeanMs:+(frames.reduce((a,b)=>a+b,0)/frames.length).toFixed(3),simulationP95Ms:+frames[570].toFixed(3)});
}
console.log(JSON.stringify({kind:'synthetic CPU; no renderer, no GPU',reports},null,2));
