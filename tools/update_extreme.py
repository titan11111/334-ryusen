"""Update the actual shipping HTML, preserving its bundled Three.js runtime.

The first migration patches the previous regatta bundle with checked anchors.
Subsequent runs only embed the readable simulation, adapter, and CSS sources.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / 'index.html'
html = path.read_text()

def replace(old, new, count=1):
    global html
    found = html.count(old)
    if found != count:
        raise SystemExit(f'Anchor mismatch: {old[:90]!r}: expected {count}, found {found}')
    html = html.replace(old, new)

def embed(marker, source):
    global html
    start, end = f'/* {marker}_BEGIN */', f'/* {marker}_END */'
    sources=source if isinstance(source,list) else [source]
    content = start + '\n' + '\n'.join((ROOT / item).read_text() for item in sources) + '\n' + end
    html = re.sub(re.escape(start) + r'[\s\S]*?' + re.escape(end), lambda _: content, html)

if '/* RR_SIM_BEGIN */' not in html:
    # Preserve approximately three minutes at 3.25x speed by extending all courses.
    replace('length:3500', 'length:11375', 3)
    replace('start:5200', 'start:13100')
    replace('start:8900', 'start:24700')
    a=html.index('function RWbend(n)');b=html.index('function Fe(n)',a)
    html=html[:a]+'''function RWbend(n){return n<12875?1:n<13100?1+.4*(n-12875)/225:n<24475?1.4:n<24700?1.4-.25*(n-24475)/225:1.15}
function RWwide(n){return n<12875?1:n<13100?1-.22*(n-12875)/225:n<24475?.78:n<24700?.78+.34*(n-24475)/225:1.12}'''+html[b:]
    # Fix an existing mismatch: water shader was using the old, almost straight centerline.
    center='(sin(ss*.0045)*92.+sin(ss*.0098+2.1)*33.+sin(ss*.0231+.7)*10.)*uBend'
    replace('uniform float uTime;attribute vec4 aFlow;', 'uniform float uTime;uniform float uBend;attribute vec4 aFlow;')
    replace('sin(-p.y*.009)*19.+sin(-p.y*.022)*6.',center.replace('ss','-p.y'))
    replace('uniform vec4 uVortices[8];uniform float uPatch;', 'uniform vec4 uVortices[8];uniform float uBend;uniform float uPatch;')
    replace('sin(ss*.009)*19.+sin(ss*.022)*6.',center)
    replace('uPatch:{value:0},u', 'uBend:{value:RWbend(g+100)},uPatch:{value:0},u')
    # Same mesh budget as before, but with longer horizon and more spaced obstacles.
    replace('Math.ceil((d-g)/3)+1','Math.ceil((d-g)/9)+1')
    replace('let Ie=g+Oe*3;', 'let Ie=g+Oe*9;')
    replace('Math.ceil((d-g)*.38)','Math.ceil((d-g)*.13)')
    replace('Math.ceil((d-g)*.48)','Math.ceil((d-g)*.15)')
    replace('Math.ceil((d-g)/1.8)+1','Math.ceil((d-g)/5.4)+1')
    replace('let ue=g+Q*1.8,I=un(ue);','let ue=g+Q*5.4,I=un(ue);')
    replace('s+=a?24+e()*12:45+e()*22','s+=a?72+e()*36:135+e()*66')
    # Separate the five rapids with genuinely quieter pools.
    replace('wave:s.wave*r,force:s.force*r,lateral:c*r,roll:',
      'wave:s.wave*r*(s.index===0?.4:1),force:s.force*r,lateral:c*r,roll:')
    # Region-specific rock walls and vegetation; retain the renderer-facing tree metadata.
    replace('return 1.1+Math.pow(Math.max(0,e),.8)*1.55+',
      'let rg=Wn(n)?.courseId;return 1.1+Math.pow(Math.max(0,e),.8)*(rg==="zambezi"?3.5:rg==="iguazu"?1.8:1.55)+')
    replace('new ri(new Ji(1,1,7),new Lt({color:"#375b3b",roughness:1}),M*3)',
      'new ri(Wn(g+100)?.courseId==="sogi"?new Ji(1,1,7):new wi(1,7,5),new Lt({color:Wn(g+100)?.courseId==="zambezi"?"#657044":"#375b3b",roughness:1}),M*3)')
    replace('E.scale.set(X*(.22-se*.043),X*.56,X*(.22-se*.043))',
      'E.scale.set(X*(Wn(ue)?.courseId==="zambezi"?.42:.22-se*.043),X*(Wn(ue)?.courseId==="zambezi"?.11:Wn(ue)?.courseId==="iguazu"?.3:.56),X*(Wn(ue)?.courseId==="zambezi"?.42:.22-se*.043))')
    replace('rock:"#826f61",bank:"#6d5748",soil:"#4a3426"', 'rock:"#3d4142",bank:"#4a4540",soil:"#4a3426"')
    # All boat occupants get visible flotation vests and rounded helmets.
    replace('let b=Dn(hv[R])','let b=Dn(["#e2a64a","#ce6240","#d6ac50"][R%3])')
    replace('new wi(.159,12,7,0,Math.PI*2,0,Math.PI*.53),r)',
      'new wi(.185,12,7,0,Math.PI*2,0,Math.PI*.6),Dn("#e7d9a9"))')
    replace('new Ji(.4,.16,18),Dn("#c8b17a")', 'new wi(.21,12,7),Dn("#e7d9a9")')
    a=html.index('function kh(n,e,t,i)');b=html.index('var zh=',a)
    html=html[:a]+'/* RR_SIM_BEGIN */\n/* RR_SIM_END */\n'+html[b:]
    replace('n.surge=Math.min(7,(n.surge||0)+3.6+cb),n.strokeThrust=1',
      'n.surge=Math.min(7,(n.surge||0)+3.6+cb),n.speed+=n.mode==="scenic"?2:5,n.strokeThrust=1')
    # Remove the old F-only queue handler. The adapter owns all three actions.
    a=html.index('function Vf()');b=html.index('for(let n=0;n<10;n++)',a)
    html=html[:a]+html[b:]
    replace('let M=Ni.read(),L=[];', 'let M=RRInput(Ni.read()),L=[];')
    replace('let H=ds[0]&&ds[0].at<=U.time+F?ds.shift():null;', 'let H=RRPulse(U,F,M);')
    replace('strokeAt:H?.at','strokeAt:U.time')
    replace('Math.min(n,1),t=Math.min(e,.1)', 'Math.min(n,.1),t=Math.min(e,.1)')
    replace('Oh(z.s,5)', 'Oh(z.s,Math.max(12,z.speed*.65))')
    replace('Oh(U.s,48)', 'Oh(U.s,Math.max(48,U.speed*2.6))')
    replace('Qf(),nc(),mn("3",1.1)', 'RRResetBoosts(n,r,t),Qf(),nc(),mn("3",1.1)')
    replace('for(let P of L){if(P.type===', 'for(let P of L){if(P.type==="boost"){mn("加速エンジン！ 2秒だけ×2",1.2);hs(30,.8);_n&&Pt&&Pt.effect("perfect",1);}if(P.type===')
    replace('g*5+(U.duel||0)*3:57','g*5+(U.duel||0)*3+(U.boostTime>0?6:0):57')
    a=html.index('function yf(');b=html.index('function Mf(',a)
    ai=html[a:b].replace('n.s+45','n.s+165').replace('Pi(n.s+20)','Pi(n.s+75)').replace('Pi(n.s+16)','Pi(n.s+65)').replace('E<38','E<140').replace('E/42','E/150')
    html=html[:a]+ai+html[b:]
    replace('P.quality==="perfect"&&hs(8,.4)', '["good","perfect"].includes(P.quality)&&hs(10,.55)')
    replace('let L=r+(U.race?8:12);', 'let L=r+(U.race?Math.max(22,c*.65):12);')
    replace('j("skillHUD").style.display=n?"block":"none",', 'RRUpdateHUD(),j("skillHUD").style.display=n?"block":"none",')
    replace('function mr(){ds=[],', 'function mr(){RRClear(),ds=[],')
    replace('function np(){j(', 'function np(){RRClear(),j(')
    replace('function cc(n=0){ds=[],', 'function cc(n=0){RRClear(),ds=[],')
    replace('e&&(e.textContent="\\u6E1B\\u901F E"),','e&&e.setAttribute("aria-label","B 減速"),')
    # Every lookup returns an uncluttered warning; labels never conceal the boat.
    replace('controller:"1.0.0",three:"180"', 'controller:"1.0.0+extreme-adapter",three:"180",speed:U.speed,course:U.courseId,danger:U.danger,lastDamage:U.lastDamage,boostTime:U.boostTime||0,boostCount:U.boostCount||0,engines:RRBoostItems.map(i=>({s:Math.round(i.s),active:i.active,taken:i.taken}))')
    replace('build:"5.0"', 'build:"6.2-engine"')
    replace('"tg.334.race."', '"tg.334.race.extreme-v6.2."')
    replace('localStorage.getItem("ryusen-race-v5-"+(U.practice?', 'localStorage.getItem("ryusen-race-extreme-v6.2-"+(U.practice?')
    replace('nn.position.set(16,8,35);ip();', '/* RR_RUNTIME_BEGIN */\n/* RR_RUNTIME_END */\nRRInitControls();RRDossier();nn.position.set(16,8,35);ip();')
    # Menu and labels.
    replace('</style>    <meta', '/* RR_STYLE_BEGIN */\n/* RR_STYLE_END */\n</style>    <meta')
    replace('<p class="tagline">激流を、競え。</p>', '<p class="tagline">一瞬の迷いが、命取り。</p>')
    replace('一戦は、濃密な三分間。<br>流れを読み、漕いで差をつけろ。', '速度は従来比3.25倍。<br>先を読み、減速し、激流を生き抜け。')
    replace('激流を征く</button>', 'EXTREME ×3.25</button>')
    replace('ゆったり川旅</button>', 'TOURING ×1</button>')
    replace('左右：操船　F：漕ぐ<br>E：減速　Space：踏ん張る', '十字キー：操船　A / Z：漕ぐ<br>B / X：減速　R / Space：踏ん張る')
    replace('<small>km/h</small>', '<small>km/h · ゲーム内速度</small>')
    replace('<span>「漕ぐ F」を押すと進む</span>', '<span>A：漕ぐ / B：減速</span>')
    replace('<details class="race-notes">', '<p class="fiction-note">金色の加速エンジン：取ると2秒間×2。Bで解除、重ね取り不可。</p><details id="rrDossier"></details><details class="race-notes">')
    replace('6 BOATS / 3 × 3 MIN / 36 RAPID SECTIONS', 'EXTREME ×3.25 / 6 BOATS / 3 EXPEDITIONS')
    replace('緑の合図で「漕ぐ F」。連打は体力を浪費。', 'A / Z：漕ぐ。長押しでも前進。B / X：減速。')
    # Refresh dossier on course selection without depending on initialization order.
    replace('function Zh(){', 'function Zh(){if(typeof RRREGIONS!=="undefined")RRDossier();')

if '/* RR_RESPONSE_V63 */' not in html:
    replace('/* RR_RUNTIME_BEGIN */','/* RR_RESPONSE_V63 */\n/* RR_RUNTIME_BEGIN */')
    replace('n.time-(n.lastStroke??-10)>.24','n.time-(n.lastStroke??-10)>.10')
    replace('this.ctx=new e;','this.ctx=new e({latencyHint:"interactive"});')
    replace('var Ra=170,','var Ra=384,')
    replace('hs(65,1.4),kf(P.source,qn(P.damage/12,.65,1.5))','(RRImpactFeedback(P)||(hs(65,1.4),kf(P.source,qn(P.damage/12,.65,1.5))))')
    replace('4)+(U.spin||0),qn','4)+(U.spin||0)+(U.impactYaw||0),qn')
    replace('*.4+(e.spin||0),qn','*.4+(e.spin||0)+(e.impactYaw||0),qn')
    replace('C=R<.8,b=U.shake;','C=R<.8,b=RRFx.reduced?0:U.shake;')
    replace('ci.x+=Math.sin(pt*41)*b*.12,ci.y+=Math.cos(pt*37)*b*.12','ci.x+=Math.sin(pt*41)*b*.24,ci.y+=Math.cos(pt*37)*b*.18')
    replace('Xt.render(Ft,nn),Ev(nn,i)','RRUpdateImpactVisuals(Mt?0:e),RRAnimateAllCrew(),Xt.render(Ft,nn),Ev(nn,i)')
    replace('build:"6.2-engine"','build:"6.3-impact-crew"')
    replace('"tg.334.race.extreme-v6.2."','"tg.334.race.extreme-v6.3."')
    replace('"ryusen-race-extreme-v6.2-"','"ryusen-race-extreme-v6.3-"')

if '/* RR_QUALITY_V65 */' not in html:
    replace('/* RR_RACE_V64 */','/* RR_QUALITY_V65 */\n/* RR_RACE_V64 */')
    replace('canvas:$l,antialias:!wa','canvas:$l,antialias:!0')
    replace('Xt.setPixelRatio(Math.min(devicePixelRatio,wa?1:1.7))','Xt.setPixelRatio(RRRenderPixelRatio(innerWidth,innerHeight,devicePixelRatio,wa))')
    replace('setPixelRatio(e){this.pixelRatio=Math.min(e,1.1)}','setPixelRatio(e){this.pixelRatio=Math.min(e,1.5)}')
    replace('Xt.setSize(innerWidth,h);nn.aspect=', 'Xt.setPixelRatio(RRRenderPixelRatio(innerWidth,h,devicePixelRatio,wa));Xt.setSize(innerWidth,h);nn.aspect=')
    replace('bevelSegments:2,steps:1','bevelSegments:5,curveSegments:32,steps:1')
    replace('new ea(new Bs(t),32,.13,5,!1)','new ea(new Bs(t),72,.13,10,!1)')
    # Keep collision geometry at its exact original resolution. Only renderers opt into detail.
    start=html.index('function dv(n)');end=html.index('function Df(',start)
    coarse=html[start:end]
    fine=coarse.replace('function dv(n){','function dv(n,detail=false){')
    fine=fine.replace('s=36,','s=detail?64:36,radial=detail?16:8,longitudinal=detail?48:30,')
    for old,new in [('m<36','m<s'),('m/36','m/s'),('(m+1)/36','(m+1)/s'),('_<8','_<radial'),('_/8','_/radial'),('(_+1)/8','(_+1)/radial'),('o<30','o<longitudinal'),('o/30','o/longitudinal'),('(o+1)/30','(o+1)/longitudinal'),('e.length/30','e.length/longitudinal'),('m<8','m<radial'),('m/8','m/radial'),('(m+1)/8','(m+1)/radial'),('m<4','m<radial/2'),('l<30','l<longitudinal'),('l/30','l/longitudinal'),('(l+1)/30','(l+1)/longitudinal'),('c+.16','c+4.8/longitudinal'),('g<8','g<radial'),('g/8','g/radial'),('(g+1)/8','(g+1)/radial')]:fine=fine.replace(old,new)
    fine=fine.replace('.72+_*.045','detail?.92:.72+_*.045').replace('.73+m*.055','detail?.92:.73+m*.055').replace('.75+g*.04','detail?.92:.75+g*.04')
    html=html[:start]+fine+html[end:]
    replace('build:"6.4-race-flow"','build:"6.5-hull-quality"')

# Fictional display name; retain course ID `sogi` for saved records and course routing.
if '/* RR_LARGE_CONTROLS_V65 */' not in html:
    replace('/* RR_QUALITY_V65 */','/* RR_LARGE_CONTROLS_V65 */\n/* RR_QUALITY_V65 */')
    replace('const h=Math.max(1,Math.round(innerHeight*(play?0.75:1)));', 'const deck=play?document.querySelector("[data-titan-controls]").getBoundingClientRect().height:0;const h=Math.max(1,Math.round(innerHeight-deck));')
html=html.replace('曽木','蒼霧').replace(r'\u66FD\u6728','蒼霧').replace('JAPAN / GRANITE','FICTIONAL / GRANITE')
controller=ROOT/'src/titan-controller.js'
if '/* RR_LANDSCAPE_V63 */' not in html:
    replace('/* RR_RESPONSE_V63 */','/* RR_LANDSCAPE_V63 */\n/* RR_RESPONSE_V63 */')
    replace('tg.className="rival-tag",tg.style.background', 'tg.className="rival-tag",tg.dataset.rescue="true",tg.style.background')
if '/* RR_RACE_V64 */' not in html:
    replace('/* RR_RESPONSE_V63 */','/* RR_RACE_V64 */\n/* RR_RESPONSE_V63 */')
    replace('for(let P of L){if(P.type===','for(let P of L){RRRaceEvent(P);if(P.type===')
    replace('U.bracing||(U.shake=Math.max(U.shake,.25))','(U.bracing||P.braced)||(U.shake=Math.max(U.shake,.25))')
    replace('RRUpdateImpactVisuals(Mt?0:e),RRAnimateAllCrew()', 'RRUpdateRaceFeedback(Mt?0:e),RRUpdateImpactVisuals(Mt?0:e),RRAnimateAllCrew()')
    replace('(U.race?65:58)+qn(c-12,0,13)*.6+g*5+(U.duel||0)*3+(U.boostTime>0?6:0)', '(U.race?RRRaceFOV(c,U.boostTime,g,U.duel||0):58+qn(c-12,0,13)*.6+g*5)')
    replace(':57,.035),nn.updateProjectionMatrix()', ':57,1-Math.exp(-e*8)),nn.updateProjectionMatrix()')
    replace('build:"6.3-impact-crew"','build:"6.4-race-flow"')
    replace('"tg.334.race.extreme-v6.3."','"tg.334.race.extreme-v6.4."')
    replace('"ryusen-race-extreme-v6.3-"','"ryusen-race-extreme-v6.4-"')
html=html.replace('n.time-(n.lastStroke??-10)>.10','n.time-(n.lastStroke??-10)>=.10')
if controller.exists():
    html=re.sub(r'(<script data-titan-controller="1">)[\s\S]*?(</script>)',lambda m:m[1]+'\n'+controller.read_text()+'\n'+m[2],html,count=1)
embed('RR_SIM', 'src/extreme-simulation.js')
embed('RR_RUNTIME', ['src/extreme-runtime.js','src/visual-quality.js','src/impact-feedback.js','src/race-feedback.js','src/boat-details.js','src/crew-details.js'])
embed('RR_STYLE', 'src/extreme-ui.css')
path.write_text(html)
print(f'Embedded extreme sources: {path.stat().st_size:,} bytes')

