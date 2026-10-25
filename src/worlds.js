// Fictional whitewater courses inspired by real places. All dimensions are game units.
const RIVER_WORLDS = {
  sogi: {name:'蒼霧の滝',en:'AOGIRI FALLS',country:'FICTIONAL · KYUSHU-INSPIRED',subtitle:'岩棚を読み、白い瀑布を抜ける。',
    width:25,bend:19,grade:1,dropScale:1,forest:0,sky:'#b6ccbc',fog:'#a4c4b7',sun:'#fff0c7',fogDensity:.0065,
    water:['#124c42','#419386'],stone:'#727f79',sections:['岩棚の入口','千畳岩の瀬','白絹の落差'],drops:[{s:385,start:370,end:398,h:5.4},{s:916,start:902,end:930,h:7.8}]},
  iguazu: {name:'イグアスの滝',en:'IGUAZU FALLS',country:'SOUTH AMERICA',subtitle:'緑の回廊。見上げるほどの水の壁。',
    width:31,bend:23,grade:1.17,dropScale:1.28,forest:1,sky:'#c4d9cd',fog:'#a6cdc0',sun:'#e4ffe3',fogDensity:.0072,
    water:['#135954','#4daca0'],stone:'#526a59',sections:['熱帯の水路','水煙の回廊','悪魔の喉笛'],drops:[{s:385,start:366,end:401,h:7.6},{s:916,start:895,end:935,h:10.4}]},
  zambezi: {name:'ザンベジの峡谷',en:'ZAMBEZI GORGE',country:'AFRICA',subtitle:'夕陽を裂く、最後の激流。',
    width:23,bend:16,grade:1.32,dropScale:1.5,forest:2,sky:'#cdb7a0',fog:'#b5aa98',sun:'#ffcb85',fogDensity:.0068,
    water:['#184e48','#648e7b'],stone:'#826f61',sections:['赤い岩の門','轟音の曲がり角','雷鳴の瀬'],drops:[{s:385,start:368,end:399,h:8.2},{s:710,start:698,end:722,h:5},{s:916,start:897,end:932,h:11.2}]}
};
const courseKey = Object.hasOwn(RIVER_WORLDS,new URLSearchParams(location.search).get('course')) ? new URLSearchParams(location.search).get('course') : 'sogi';
const CW=RIVER_WORLDS[courseKey];

