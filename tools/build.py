"""Build a single offline HTML from the unmodified Codex base and readable source files."""
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
s=(ROOT/'RYUSEN.html').read_text()
if '世界激流レガッタ' in s:
    raise SystemExit('RYUSEN.html is the regatta build. This integrator targets the older one-pole HTML and would overwrite index.html. Stopped.')

def replace(old,new):
    global s
    if old not in s:
        raise RuntimeError('Integration anchor missing: '+old[:100])
    s=s.replace(old,new,1)

def replace_between(start,end,body):
    global s
    a=s.index(start);b=s.index(end,a)
    s=s[:a]+body+s[b:]

replace('initial-scale=1,viewport-fit=cover','initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover')
replace('<title>流川 RYUSEN — 棒一本、十人の命。</title>','<title>流川 RYUSEN — WORLD RAPIDS / 世界激流紀行</title>')
replace('</style></head>', '</style><style>\n'+(ROOT/'fc-ios-controller.css').read_text()+'\n'+(ROOT/'src/ui.css').read_text()+'\n</style></head>')
replace('<div id="section">一ノ瀬 · 翡翠の淵</div>','<div id="section">岩棚の入口</div><div id="courseStamp"></div>')
replace('<div class="meter gold"><i id="staminabar"></i></div></div>','<div class="meter gold"><i id="staminabar"></i></div><div id="rescueHint"></div></div>')
replace('<div id="caption"', '<div id="dropWarning"><strong id="dropDistance"></strong><small id="dropAction"></small></div>\n<div id="caption"')
replace('3D RIVER SURVIVAL</div><h1>','WORLD RAPIDS · ONE POLE, TEN LIVES</div><h1>')
replace('R Y U S E N</em></h1>','R Y U S E N</em></h1><div class="world-label" id="worldLabel"></div>')
replace('翡翠の淵。その先に、牙をむく白い激流。<br>荒れる舟を操り、岩をかわし、<br>十人の乗客を下流の船着き場へ。','滝を見上げる暇はない。岩を突き、舟を返し、<br>落水者へ寄せろ。十人を乗せて、世界の瀬を越える。')
replace('<button class="start" id="startBtn"', '''<div class="course-picker" aria-label="コース選択">
<button class="course-choice" data-course="sogi"><span>曽木の滝</span><small>JAPAN / INTRO</small></button>
<button class="course-choice" data-course="iguazu"><span>イグアスの滝</span><small>AMERICA / HARD</small></button>
<button class="course-choice" data-course="zambezi"><span>ザンベジ</span><small>AFRICA / EXPERT</small></button></div>
<button class="start" id="startBtn"''')
replace('左右：竿で操船　E：竿ブレーキ　Space：踏ん張る<br>スマホは画面下のスティックとボタンで操作。','左右：竿で突く　B / E：ブレーキ　A / Space：踏ん張る<br>落水した人は浮輪へ寄せて救助。踏ん張り中は竿を使えない。</div><div class="world-note">実在の滝から着想した架空の航路。各コース 1,260m。')
replace('<div id="result">',(ROOT/'src/deck.html').read_text()+'\n<div id="result">')

# Replace the bundled old control surface with the unchanged canonical controller.
scripts=list(re.finditer(r'<script[^>]*>(.*?)</script>',s,re.S))
old_controller=scripts[0]
controller=(ROOT/'fc-ios-controller.js').read_text().replace('export function ','function ')
s=s[:old_controller.start()]+'<script>\n/* fc-ios-controller: canonical source embedded without behavioral changes. */\n'+controller+'\n</script>'+s[old_controller.end():]

replace('function te(i){return Math.sin(i*.009)*19+Math.sin(i*.022)*6}',(ROOT/'src/worlds.js').read_text()+ '\nfunction te(i){return Math.sin(i*.009)*CW.bend+Math.sin(i*.022)*6}')
replace('return 25+Math.sin(i*.014)*3-4*Math.exp(-(((i-750)/125)**2))','return CW.width+Math.sin(i*.014)*3-4*Math.exp(-(((i-750)/125)**2))')
replace('return-i*.016-5.4*ms(370,398,i)-7.8*ms(902,930,i)','return -i*.016-CW.drops.reduce((sum,d)=>sum+d.h*ms(d.start,d.end,i),0)')
replace('return Math.max(0,Math.sin(i*.034)*.35+.3)+.65*ms(230,290,i)*(1-ms(450,490,i))+.8*ms(620,680,i)*(1-ms(1050,1110,i))','return (Math.max(0,Math.sin(i*.034)*.35+.3)+.65*ms(230,290,i)*(1-ms(450,490,i))+.8*ms(620,680,i)*(1-ms(1050,1110,i)))*CW.grade')
replace('return Math.exp(-(((i-385)/15)**2))+1.4*Math.exp(-(((i-916)/15)**2))','return CW.drops.reduce((sum,d)=>sum+Math.exp(-(((i-d.s)/16)**2))*(d.h/6),0)')
replace_between('function Lo(', 'var Do=class', (ROOT/'src/simulation.js').read_text()+'\n')

adapter='''(() => {
  const controller=initFcIosController({buttons:{'fc-btn-a':['Space','KeyZ'],'fc-btn-b':['KeyE','KeyX']},enabled:()=>ft.phase==='playing'&&!Je,onInteract:()=>{ld();Me?.ctx.resume();}});
  installFcIosTouchGuard();
  addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(event.code))event.preventDefault();},{passive:false});
  return {read:()=>({x:controller.K.AxisX||(Number(!!(controller.K.ArrowRight||controller.K.KeyD))-Number(!!(controller.K.ArrowLeft||controller.K.KeyA))),y:0,actions:{act:!!(controller.K.KeyE||controller.K.KeyX),jump:!!(controller.K.Space||controller.K.KeyZ)}}),reset:()=>{controller.reset();document.querySelectorAll('.pressed').forEach(el=>el.classList.remove('pressed'));},destroy:controller.destroy};
})()'''
replace('TitanController.mount({actions:{act:"\\u7AFF\\u30D6\\u30EC\\u30FC\\u30AD",jump:"\\u8E0F\\u3093\\u5F35\\u308B"}})',adapter)
replace('Fe.setSize(innerWidth,innerHeight);','Fe.setSize(innerWidth,innerHeight);')
replace('be.background=new Bt("#acc6b8")','be.background=new Bt(CW.sky)')
replace('be.fog=new qs("#a5c4bb",.0067)','be.fog=new qs(CW.fog,CW.fogDensity)')
replace('var Xe=new as("#fff0c7",3.6)','var Xe=new as(CW.sun,3.6)')
replace('var Ju=Lc("#727f79",.55,!0)','var Ju=Lc(CW.stone,.55,!0)')
replace('fogDensity:{value:.0067}','fogDensity:{value:CW.fogDensity}')
replace_between('fragmentShader:`uniform float uTime;uniform vec3 uSun', 'side:He}),v0', 'fragmentShader:`'+(ROOT/'src/water.frag').read_text()+'`,')
replace('vec2(1.7,.7)','vec2(.7,1.7)')
replace('Ho?1.45:1.7','Ho?1.25:1.6')
replace('Ho?1024:2048,Ho?1024:2048','Ho?512:1024,Ho?512:1024')
replace('Xe.shadow.normalBias=.12','Xe.shadow.autoUpdate=false;Xe.shadow.normalBias=.12')
replace('Uo(m*.23,-.24,.04)','Uo(Math.atan(m*.5),-.48,.08)')
replace('Fe.render(be,_n)','Xe.shadow.needsUpdate=bc%4===0,Fe.render(be,_n)')
# Smooth normals across duplicated rock vertices without adding mobile geometry cost.
replace('Go.computeVertexNormals()', '''Go.computeVertexNormals();{const p=Go.attributes.position,n=Go.attributes.normal;for(let j=0;j<p.count;j++){const v=new L(p.getX(j),p.getY(j)*1.1,p.getZ(j)).normalize();n.setXYZ(j,v.x,v.y,v.z);}n.needsUpdate=true}''')
replace('let h=r-(_?15:12)','let h=r-(_?8:11)')
replace('o+(_?8.8:6.5)','o+(_?5.5:5.8)')
replace('Fo.set(te(r+19)+a*.3,oe(r+19)+.1,-r-19)','Fo.set(te(r+(_?12:15))+a*.3,oe(r+(_?12:15))+.1,-r-(_?12:15))')

replace_between('function cd(', 'function A0()', '''function cd(value){ld();if(!Me)return;_s=value??!_s;muted=!_s;Me.ctx.resume();Me.master.gain.setTargetAtTime(_s?.27:0,Me.ctx.currentTime,.2);bt('audioBtn').textContent=_s?'音 ON':'音 OFF';bt('audioBtn').setAttribute('aria-pressed',String(_s));try{localStorage.setItem('tg.334.audio',_s?'1':'0');}catch{}}
function readAudio(){try{return localStorage.getItem('tg.334.audio')==='1';}catch{return false;}}
var muted=true;
''')
replace('ld(),cd(!0),','ld(),cd(readAudio()),resizeWorldViewport(),')
replace('document.body.classList.remove("titan-visible"),Ko.forEach', 'document.body.classList.remove("titan-visible","paused"),resizeWorldViewport(),bt("dropWarning").style.display="none",Ko.forEach')
replace('bt("record").textContent=(ft.mode', 'bt("record").textContent=CW.name+" · 救助 "+ft.rescued+"人 / 落差成功 "+ft.safeDrops+"回 / "+(ft.mode')
replace('let s="ryusen-best-"+ft.mode','let s="tg.334.best."+courseKey+"."+ft.mode')
replace('Number(localStorage.getItem(s)||0)','Number(localStorage.getItem(s)||(courseKey==="sogi"?localStorage.getItem("ryusen-best-"+ft.mode):0)||0)')
replace('ft.passengers*100+ft.hp*3+ft.near*15','ft.passengers*100+ft.hp*3+ft.near*15+ft.rescued*35+ft.safeDrops*50')
replace('document.body.classList.remove("titan-visible"),bt("hint")','document.body.classList.remove("titan-visible","paused"),resizeWorldViewport(),bt("dropWarning").style.display="none",bt("hint")')
replace('document.body.classList.toggle("titan-visible",!Je)','document.body.classList.toggle("titan-visible",!Je),document.body.classList.toggle("paused",Je),resizeWorldViewport()')
replace('bt("hint").style.display="block",document.body.classList.add("titan-visible")','bt("hint").style.display="block",document.body.classList.remove("paused"),document.body.classList.add("titan-visible")')
replace('bt("startBtn").addEventListener("click",hd);', '''bt('worldLabel').textContent=CW.country+' / '+CW.subtitle;
document.querySelectorAll('[data-course]').forEach(el=>{el.classList.toggle('active',el.dataset.course===courseKey);el.addEventListener('click',()=>{if(el.dataset.course!==courseKey){const next=new URL(location.href);next.searchParams.set('course',el.dataset.course);location.href=next.href;}});});
for(const id of ['viewBtn','audioBtn','pauseBtn'])bt('deckTools').appendChild(bt(id));
bt("startBtn").addEventListener("click",hd);''')

replace('var Fo=new L,gs=new L,Ic=-1;', (ROOT/'src/scene-extras.js').read_text()+'\nvar Fo=new L,gs=new L,Ic=-1;')
replace_between('function dd()', 'function fd()', '''function dd(){
  bt('distance').textContent=Math.max(0,Math.round(1260-ft.s)).toLocaleString();bt('progress').style.width=ft.s/1260*100+'%';
  bt('hp').textContent=Math.ceil(ft.hp)+'%';bt('hpbar').style.width=ft.hp+'%';bt('hpbar').style.background=ft.hp<30?'#ef8b69':'#b7e3ca';
  bt('stamina').textContent=Math.ceil(ft.stamina)+'%';bt('staminabar').style.width=ft.stamina+'%';bt('people').textContent=ft.passengers+' / 10';bt('kmh').textContent=Math.round(ft.speed*3.6);
  updateWorldUI();
}
''')

# Event adapter: consequences and captions come from the simulation, not from mesh state.
replace('for(let v of S)v.type===', '''for(const event of S){
  if(event.type==='eject')vs(event.name+'さん落水！ 浮輪へ舟を寄せろ',2.8);
  if(event.type==='rescue'){vs(event.name+'さん、救助！',2.5);Tc(25,.5);}
  if(event.type==='team')vs(event.name+'さんは下流救助隊へ',2.2);
  if(event.type==='safeDrop')vs('全員、持ちこたえた！',2.2);
  if(event.type==='stroke'&&event.strong){Tc(7,.4);}
}for(let v of S)v.type===''')
replace('let d=Ai.read().x;Tr.rotation.z=', 'let d=Ai.read().x;Tr.rotation.z=')
# Replace fixed arms / interpolated old pole with the outboard-contact and rescue renderer.
replace('be.userData.river={s:r,', 'updateWorld(e,Ce),be.userData.river={s:r,')
replace('Je?.07:.22+l*.12','Je?0:.22+l*.12')

replace('addEventListener("resize",()=>{Fe.setSize(innerWidth,innerHeight),_n.aspect=innerWidth/innerHeight,_n.updateProjectionMatrix()});', '''function resizeWorldViewport(){const active=document.body.classList.contains('titan-visible')||document.body.classList.contains('paused'),height=innerHeight*(active?.75:1);Fe.setSize(innerWidth,height);_n.aspect=innerWidth/height;_n.updateProjectionMatrix();}
addEventListener('resize',resizeWorldViewport);''')
replace('controller:"1.0.0",three:"180"','controller:"fc-ios-controller/2026-10-22",course:courseKey,water:ft.pax.filter(p=>p.state==="water").length,rescued:ft.rescued,safeDrops:ft.safeDrops,three:"180"')

# Context loss is explicit; originals remain unchanged as reference files.
(ROOT/'index.html').write_text(s)
print(f'Built index.html: {len(s.encode()):,} bytes; canonical controls + 3 worlds + rescue simulation')
