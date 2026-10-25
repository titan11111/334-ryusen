// Extract the shipped Three.js and simulation; never duplicate gameplay equations.
const fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require('node:path').resolve(__dirname,'../index.html'),'utf8');
const c=vm.createContext({console,AbortController,URL,TextDecoder,TextEncoder});
const a=html.indexOf('var mf='),b=html.indexOf('var zh=',a),three=html.indexOf('/**',html.indexOf('<script>(()=>{'));
vm.runInContext(html.slice(three,a),c);vm.runInContext(html.slice(a,b),c);
let from=html.indexOf('var uv='),to=html.indexOf('function Df(',from);vm.runInContext(html.slice(from,to),c);
from=html.indexOf('var hi=');to=html.indexOf('Yn(Jf,tu,ui',from);vm.runInContext(html.slice(from,to),c);
vm.runInContext('RRRegisterHull("wood-player",Array.from({length:Jf.attributes.position.count},(_,i)=>[Jf.attributes.position.getX(i)*1.2,Jf.attributes.position.getZ(i)*1.2]))',c);
function state(course='sogi',vessel='wood'){
  const n=c.tr('normal',vessel),w=c.js(course);
  Object.assign(n,{phase:'playing',s:w.start+10,race:true,courseId:course,finishS:w.finish,offset:0});return n;
}
vm.runInContext(fs.readFileSync(require('node:path').resolve(__dirname,'../src/extreme-runtime.js'),'utf8'),c);
c.Ft=new c.Tt();c._n=false;c.Pt=null;c.Mt=false;c.U=state();c.pt=0;c.ds=[];
module.exports={c,state,html};
