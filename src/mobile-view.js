// A higher overview keeps the boat and its immediate avoidance corridor together.
function RRCameraLayout(width,height,speed,capsized=false){
  const portrait=width<height;
  return capsized?{back:portrait?17:19,height:portrait?16:17,ahead:0,fov:portrait?58:55,side:8}:
    {back:portrait?28:25,height:portrait?26:23,ahead:Math.min(40,26+Math.max(0,speed-50)*.13),side:0};
}
function RRFrameMobileCamera(s,offset,boatY,speed,position,target){
  const mobile=wa||innerWidth<=700,active=['playing','countdown'].includes(U.phase),capsized=!!U.capsized;
  if(!active||(!mobile&&!capsized)||hr!==0&&!capsized)return;
  const layout=RRCameraLayout(innerWidth,innerHeight,speed,capsized);
  const center=Fe(s),ahead=s+layout.ahead;
  position.set(center+offset*.7+layout.side,Math.max($e(s)+layout.height,boatY+layout.height),-s+layout.back);
  target.set(capsized?center+offset:Fe(ahead)+offset*.32,capsized?boatY+.15:$e(ahead)+.5,-ahead);
}
function RRInitMobileView(){
  const update=()=>document.body.classList.toggle('rr-mobile-view',wa||innerWidth<=700);
  update();addEventListener('resize',update);
}
