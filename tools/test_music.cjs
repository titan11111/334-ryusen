const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(root+'/src/music.js','utf8'),html=fs.readFileSync(root+'/index.html','utf8');
function setup(protocol='https:'){
  class Audio{
    constructor(){this.paused=true;this.currentTime=0;this.plays=0;this.loads=0;this.listeners={};}
    addEventListener(t,f){this.listeners[t]=f;}load(){this.loads++;this.currentTime=0;this.error=null;}pause(){this.paused=true;}
    play(){this.plays++;if(this.reject)return Promise.reject(new Error('blocked'));this.paused=false;return Promise.resolve();}
  }
  const param={value:0,cancelScheduledValues(){},setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;}};
  const c=vm.createContext({Audio,location:{protocol},document:{hidden:false,button:{},getElementById(){return this.button;}},localStorage:{getItem(){return null;}},_n:true,Mt:false,Ql:{},U:{phase:'countdown',race:true,courseId:'sogi'},Pt:{master:{},ctx:{currentTime:0,state:'running',createMediaElementSource(){return{connect(){}};},createGain(){return{gain:{...param},connect(){}};}}}});
  vm.runInContext(source,c);return c;
}
test('shipping HTML contains music source, start/resume hooks and all four real files',()=>{
  assert(html.includes(source));for(const f of Object.values(setup().RRMusic.tracks))assert(fs.statSync(root+'/'+f).size>1000);
  for(const h of ['RRMusicSync(true),Ni.reset()','RRResetBoosts(n,r,t),RRMusic.defer=false,RRMusicSync(true)','au(RRMusicSoundEnabled())','function np(){RRMusicReset();'])assert(html.includes(h),h);
});
test('countdown starts one loop; rendering never replays an active track',async()=>{
  const c=setup();c.RRMusicSync();await new Promise(setImmediate);for(let i=0;i<200;i++)c.RRMusicSync();assert.equal(c.RRMusic.audio.plays,1);assert.equal(c.RRMusic.audio.loop,true);
});
test('three courses and victory select correct tracks; retirement stops playback',()=>{
  const c=setup();for(const id of ['sogi','iguazu','zambezi']){c.U.courseId=id;c.RRMusicSync();assert.equal(c.RRMusic.audio.src,'./'+c.RRMusic.tracks[id]);}
  c.U.phase='won';c.RRMusicSync();assert.equal(c.RRMusic.key,'won');c.U.phase='lost';c.RRMusicSync();assert(c.RRMusic.audio.paused);
});
test('pause, mute, hidden tab and menu stop playback; resume preserves position',async()=>{
  for(const which of ['pause','mute','hidden','menu']){const c=setup();c.RRMusicSync();await new Promise(setImmediate);c.RRMusic.audio.currentTime=42;
    if(which==='pause')c.Mt=true;if(which==='mute')c._n=false;if(which==='hidden')c.document.hidden=true;if(which==='menu')c.U.phase='ready';
    c.RRMusicSync();assert(c.RRMusic.audio.paused);c.Mt=false;c._n=true;c.document.hidden=false;c.U.phase='playing';c.RRMusicSync(true);assert.equal(c.RRMusic.audio.currentTime,42);assert(!c.RRMusic.audio.paused);
  }
});
test('retry starts the same course from the beginning',()=>{const c=setup();c.RRMusicSync();c.RRMusic.audio.currentTime=98;c.RRMusicReset();c.RRMusicSync(true);assert.equal(c.RRMusic.audio.currentTime,0);assert.equal(c.RRMusic.audio.loads,2);});
test('autoplay rejection waits for explicit retry and then recovers',async()=>{
  const c=setup();c.RRMusicSync();await new Promise(setImmediate);const a=c.RRMusic.audio;a.pause();a.reject=true;c.RRMusicSync(true);await new Promise(setImmediate);assert(c.RRMusic.blocked);
  const count=a.plays;for(let i=0;i<100;i++)c.RRMusicSync();assert.equal(a.plays,count);a.reject=false;c.RRMusicSync(true);await new Promise(setImmediate);assert(!a.paused);assert(!c.RRMusic.blocked);
});
test('missing media does not cause per-frame retries and sound ON reloads it',()=>{
  const c=setup();c.RRMusicSync();const a=c.RRMusic.audio;a.pause();a.error={code:4};a.listeners.error();const count=a.loads;for(let i=0;i<100;i++)c.RRMusicSync();assert.equal(a.loads,count);assert.match(c.RRMusic.error,/読み込めません/);c.RRMusicSync(true);assert.equal(a.loads,count+1);
});
test('local files bypass opaque-origin Web Audio routing and still mute',()=>{const c=setup('file:');c.Pt.ctx.createMediaElementSource=()=>{throw Error('must not route local files');};c.RRMusicSync();assert.equal(c.RRMusic.gain,null);assert(!c.RRMusic.audio.paused);c._n=false;c.RRMusicSync();assert(c.RRMusic.audio.paused);});
test('saved mute survives retry while first run enables music after a start gesture',()=>{const c=setup();assert(c.RRMusicSoundEnabled());c.localStorage.getItem=()=> '0';assert(!c.RRMusicSoundEnabled());});
test('race setup defers the temporary first course and plays only the selected soundtrack',()=>{
  const c=setup();c.RRMusic.defer=true;c.RRMusicSync(true);assert.equal(c.RRMusic.audio,null);
  c.U.courseId='iguazu';c.RRMusic.defer=false;c.RRMusicSync(true);
  assert.equal(c.RRMusic.audio.plays,1);assert.equal(c.RRMusic.key,'iguazu');
  assert(html.includes('cc(r,true),Xn=ic('));
});
