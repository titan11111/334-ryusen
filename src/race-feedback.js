// Race feedback changes presentation only. Intro assistance lives in the simulation.
RRFx.passPulse=0;RRFx.wind=null;RRFx.openingComboShown=false;RRFx.openingSurfShown=false;
function RRRaceFOV(speed,boost=0,drop=0,duel=0) {
  return 60+_f((speed-25)/110)*18+(boost>0?2:0)+drop*3+duel-RRFx.passPulse*3;
}
function RRInitWind() {
  if(!Pt||RRFx.wind?.ctx===Pt.ctx)return;
  if(RRFx.wind){try{RRFx.wind.source.stop();}catch{}}
  const ctx=Pt.ctx,buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),samples=buffer.getChannelData(0);
  let seed=3187,low=0;
  for(let i=0;i<samples.length;i++){seed=(seed*1664525+1013904223)>>>0;low=low*.96+(seed/2147483648-1)*.04;samples[i]=low;}
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
  source.buffer=buffer;source.loop=true;filter.type='lowpass';filter.frequency.value=900;gain.gain.value=0;
  source.connect(filter);filter.connect(gain);gain.connect(Pt.master);source.start();RRFx.wind={ctx,source,filter,gain};
}
function RRRaceEvent(event) {
  if(event.type==='overtake'&&(event.ahead===0||event.behind===0)){
    const ahead=event.ahead===0;RRFx.passPulse=ahead?1:.2;
    RRPlayFeedback(ahead?'pass':'passback',ahead?.42:.15);
    const rank=document.getElementById('raceRank');
    if(rank?.animate&&!RRFx.reduced)rank.animate(ahead?[{transform:'scale(1)',color:'#f6df9b'},{transform:'scale(1.4)',color:'#fff6cb'},{transform:'scale(1)',color:'#eeede1'}]:[{opacity:1},{opacity:.55},{opacity:1}],{duration:ahead?360:180});
  }
  if(!U.race||U.practice||U.time>=30)return;
  if(event.type==='stroke'&&(U.combo||0)>=6&&!RRFx.openingComboShown){RRFx.openingComboShown=true;mn('連続6漕ぎ！ いい加速！',1.3);RRPlayFeedback('pass',.27);}
  if(event.type==='wave'&&event.surf&&!RRFx.openingSurfShown){RRFx.openingSurfShown=true;mn('波を捉えた！ SURF BOOST',1.3);}
}
function RRUpdateRaceFeedback(dt) {
  RRFx.passPulse=Math.max(0,RRFx.passPulse-dt*2.8);
  const active=['playing','countdown'].includes(U.phase)&&!Mt,playing=U.phase==='playing'&&!Mt;
  if(U.time<.1){RRFx.openingComboShown=false;RRFx.openingSurfShown=false;}
  const lines=document.getElementById('rrSpeedLines');
  if(lines){const speed=_f((U.speed-35)/95);lines.style.opacity=active&&!RRFx.reduced?Math.min(.3,speed*.10+(U.boostTime>0?.12:0)+RRFx.passPulse*.17):0;}
  if(RRFx.wind){
    const wind=RRFx.wind,now=wind.ctx.currentTime,speed=_f((U.speed-30)/100);
    wind.gain.gain.setTargetAtTime(playing&&_n?.05+speed*.3+(U.boostTime>0?.13:0):0,now,.07);
    wind.filter.frequency.setTargetAtTime(600+speed*2100,now,.1);
  }
}
