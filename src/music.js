// Stream the supplied soundtrack; keep decoding/loading off the render loop.
var RRMusic={
  tracks:{sogi:'Current_Against_the_Stone.mp3',iguazu:'Crossing_the_Razor_River.mp3',zambezi:'The_Raging_Descent.mp3',won:'Torrent_and_Triumph.mp3'},
  audio:null,gain:null,key:null,pending:false,blocked:false,serial:0,error:'',defer:false
};
function RRMusicSoundEnabled(){
  try{return localStorage.getItem('tg.334.audio')!=='0';}catch{return true;}
}
function RRMusicReset(){
  RRMusic.serial++;RRMusic.pending=false;RRMusic.blocked=false;RRMusic.key=null;RRMusic.error='';
  if(RRMusic.audio){RRMusic.audio.pause();RRMusic.audio.currentTime=0;}
}
function RRMusicStatus(){
  const music=RRMusic,audio=music.audio;
  return {track:music.key,file:music.tracks[music.key]||null,playing:!!audio&&!audio.paused,currentTime:audio?.currentTime||0,readyState:audio?.readyState||0,blocked:music.blocked,error:music.error};
}
function RRMusicSync(retry=false){
  const music=RRMusic,active=['playing','countdown'].includes(U.phase);
  if(music.defer)return;
  const key=U.phase==='won'?'won':active?(U.race?U.courseId:(Ql?.courseId||'sogi')):null;
  if(retry){music.blocked=false;if(music.audio?.error){music.audio.load();music.error='';}}
  if(!_n||Mt||document.hidden||!key){
    if(music.audio){music.audio.pause();if(music.gain){music.gain.gain.cancelScheduledValues(Pt.ctx.currentTime);music.gain.gain.value=0;}}
    if(music.pending){music.serial++;music.pending=false;}
    return;
  }
  if(!Pt||!music.tracks[key])return;
  if(!music.audio){
    const audio=new Audio();audio.preload='none';audio.loop=true;
    music.audio=audio;
    // file:// media must play directly: routing local files through Web Audio
    // can produce silence because file origins are opaque in browsers.
    if(location.protocol!=='file:'){
      const source=Pt.ctx.createMediaElementSource(audio),gain=Pt.ctx.createGain();
      gain.gain.value=0;source.connect(gain);gain.connect(Pt.master);
      music.gain=gain;music.source=source;
    }else audio.volume=.29;
    audio.addEventListener('error',()=>{
      music.pending=false;music.blocked=true;music.error='BGMを読み込めません。音ONで再試行';
      document.getElementById('audioBtn').title=music.error;
    });
  }
  if(music.key!==key){
    music.serial++;music.audio.pause();music.pending=false;music.blocked=false;music.error='';
    music.key=key;music.audio.src='./'+music.tracks[key];music.audio.load();
  }
  if(music.pending||music.blocked||!music.audio.paused)return;
  const serial=++music.serial;music.pending=true;
  if(music.gain){const gain=music.gain.gain,now=Pt.ctx.currentTime;
    gain.cancelScheduledValues(now);gain.setValueAtTime(0,now);gain.linearRampToValueAtTime(.38,now+.65);}
  if(Pt.ctx.state==='suspended')Pt.ctx.resume().catch(()=>{});
  // play() must run synchronously inside start/resume/unmute gestures on iOS.
  try{
    Promise.resolve(music.audio.play()).then(()=>{
      if(serial===music.serial){music.pending=false;music.error='';document.getElementById('audioBtn').title='BGM: '+music.tracks[key].replaceAll('_',' ').replace('.mp3','');}
    },()=>{if(serial===music.serial){music.pending=false;music.blocked=true;music.error='音ONでBGMを再生';document.getElementById('audioBtn').title=music.error;}});
  }catch{music.pending=false;music.blocked=true;}
}
