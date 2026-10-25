// Direct, independent course selection: lore/art never owns the selection state.
var RRMenuReady=false,RRMenuStep='course';
function RRSetMenuScreen(screen,focus=true){
  const select=screen==='select',overlay=j('overlay');
  overlay.dataset.menuScreen=select?'select':'title';
  j('rrTitleScreen').hidden=select;j('rrSelectScreen').hidden=!select;
  document.body.classList.toggle('rr-capsized',false);
  if(select)RRSetSelectionStep('course',false);
  if(focus){const target=select?j('courseSelect').querySelector('[aria-pressed="true"]'):j('rrEnterSelect');target?.focus({preventScroll:true});}
}
function RRSetSelectionStep(step,focus=true){
  RRMenuStep=step==='boat'?'boat':'course';const boat=RRMenuStep==='boat';
  j('rrCoursePanel').hidden=boat;j('rrBoatPanel').hidden=!boat;
  j('rrNextBoat').hidden=boat;j('raceStartBtn').hidden=!boat;
  j('rrCourseStep').setAttribute('aria-current',boat?'false':'step');
  j('rrBoatStep').setAttribute('aria-current',boat?'step':'false');
  j('rrSelectHeading').textContent=boat?'相棒になる、一艇を。':'次は、どの激流へ。';
  if(focus)(boat?j('vesselSelect'):j('courseSelect')).querySelector('[aria-pressed="true"]')?.focus({preventScroll:true});
}
function RRSelectCourse(id){
  if(!Pn.some(course=>course.id===id))return;
  fr=id;Zh();
}
function RRSelectVessel(id){
  if(!Qs.some(vessel=>vessel.id===id))return;
  Fi=id;lc(id);Zh();
}
function RRMenuArrow(event,host,attribute){
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
  const buttons=Array.from(host.querySelectorAll('button')),current=buttons.indexOf(event.target.closest('button'));
  if(current<0)return;event.preventDefault();
  const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(current+(['ArrowLeft','ArrowUp'].includes(event.key)?-1:1)+buttons.length)%buttons.length;
  const button=buttons[next];attribute==='course'?RRSelectCourse(button.dataset.course):RRSelectVessel(button.dataset.vessel);button.focus();
}
function yv(){
  const courseHost=j('courseSelect'),vesselHost=j('vesselSelect');
  const info={sogi:['JAPAN INSPIRED','蒼霧','岩床を縫う、精密な操船。'],iguazu:['SOUTH AMERICA','イグアス','緑の連瀑と、交差する流れ。'],zambezi:['AFRICA','ザンベジ','黒い峡谷と、うねる大波。']};
  courseHost.replaceChildren();vesselHost.replaceChildren();
  for(const id of ['sogi','iguazu','zambezi']){
    const course=js(id),data=info[id],button=document.createElement('button');
    button.type='button';button.dataset.course=id;button.className='rr-course-card';
    button.setAttribute('aria-label',data[1]+'を選択');
    button.innerHTML='<span class="rr-course-image" aria-hidden="true">'+RRWorldPoster(id)+'</span><span class="rr-course-top"><small>'+data[0]+'</small><i class="rr-selected-mark" aria-hidden="true">✓</i></span><span class="rr-course-copy"><b>'+data[1]+'</b><span>'+data[2]+'</span><small>約３分 <i>／</i> '+String(course.sections.length)+' SECTIONS</small></span>';
    button.addEventListener('click',()=>RRSelectCourse(id));courseHost.appendChild(button);
  }
  for(const vessel of Qs){
    const button=document.createElement('button');button.type='button';button.dataset.vessel=vessel.id;
    button.innerHTML='<span class="boat-glyph" aria-hidden="true">'+Sf(vessel)+'</span><span><b>'+vessel.name+'</b><small>'+vessel.capacity+'人</small></span><i class="rr-selected-mark" aria-hidden="true">✓</i>';
    button.addEventListener('click',()=>RRSelectVessel(vessel.id));vesselHost.appendChild(button);
  }
  courseHost.addEventListener('keydown',event=>RRMenuArrow(event,courseHost,'course'));
  vesselHost.addEventListener('keydown',event=>RRMenuArrow(event,vesselHost,'vessel'));
  Zh();
}
function Zh(){
  const vessel=At(Fi),course=js(fr);
  document.querySelectorAll('#courseSelect [data-course]').forEach(button=>{
    const selected=button.dataset.course===fr;button.classList.toggle('selected',selected);
    button.setAttribute('aria-pressed',String(selected));
  });
  document.querySelectorAll('#vesselSelect [data-vessel]').forEach(button=>{
    const selected=button.dataset.vessel===Fi;button.classList.toggle('selected',selected);
    button.setAttribute('aria-pressed',String(selected));
  });
  document.body.dataset.expedition=fr;
  j('vesselName').textContent=vessel.name;j('vesselTag').textContent=vessel.tag;
  j('vesselStats').innerHTML=['速さ','旋回','安定'].map((label,index)=>'<span>'+label+' <b>'+'●'.repeat(vessel.ratings[index])+'○'.repeat(5-vessel.ratings[index])+'</b></span>').join('');
  j('courseTag').textContent=course.name+'を選択中 · '+(Ta==='scenic'?'ゆったり川旅':'約３分のレース');
  j('raceStartBtn').querySelector('span').textContent=course.name+'へ出航';
  j('rrSelectionSummary').textContent=course.name+' / '+vessel.short;
  // Optional field notes may fail without interrupting the selected course or launch.
  if(RRMenuReady)try{RRDossier();}catch(error){console.warn('Field guide unavailable',error);}
}
function RRInitMenu(){
  RRMenuReady=true;
  j('rrEnterSelect').addEventListener('click',()=>RRSetMenuScreen('select'));
  j('rrMenuBack').addEventListener('click',()=>RRSetMenuScreen('title'));
  j('rrMenuHome').addEventListener('click',event=>{event.preventDefault();RRSetMenuScreen('title');});
  j('rrNextBoat').addEventListener('click',()=>RRSetSelectionStep('boat'));
  j('rrCourseStep').addEventListener('click',()=>RRSetSelectionStep('course'));
  j('rrBoatStep').addEventListener('click',()=>RRSetSelectionStep('boat'));
  j('rrMenuHelp').addEventListener('click',()=>j('rrHelpDialog').showModal());
  j('rrHelpClose').addEventListener('click',()=>j('rrHelpDialog').close());
  document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',Zh));
  j('vortexTrialBtn').addEventListener('click',()=>j('rrHelpDialog').close());
  j('overlay').addEventListener('keydown',event=>{if(event.key==='Escape'&&j('overlay').dataset.menuScreen==='select'){event.preventDefault();event.stopPropagation();RRSetMenuScreen('title');}});
  Zh();RRSetMenuScreen('title',false);
}
