// Cosmetic surfaces stay within the existing hull envelope; collision footprints do not grow.
var RRBoatDetailCache=new WeakSet(),RRBoatMats=null,RRBoatBaseWh=null;
function RRBoatTexture(wood) {
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
  const ctx=canvas.getContext('2d'),image=ctx.createImageData(128,128);let seed=wood?173:941;
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
    seed=(seed*1664525+1013904223)>>>0;
    const value=wood?132+Math.sin(x*.64+Math.sin(y*.035)*1.4)*18+(seed/4294967296-.5)*14:128+(seed/4294967296-.5)*28;
    const i=(y*128+x)*4;image.data[i]=image.data[i+1]=image.data[i+2]=value;image.data[i+3]=255;
  }
  ctx.putImageData(image,0,0);const texture=new jt(canvas);texture.wrapS=texture.wrapT=1e3;texture.repeat.set(wood?3:5,wood?2:8);texture.needsUpdate=true;return texture;
}
function RRBoatMaterials() {
  if(RRBoatMats)return RRBoatMats;
  return RRBoatMats={wood:RRBoatTexture(true),fabric:RRBoatTexture(false),rope:new Lt({color:'#b9a77f',roughness:.88}),rubber:new Lt({color:'#273330',roughness:.72}),metal:new Lt({color:'#879695',metalness:.8,roughness:.27}),stitch:new Lt({color:'#e0d6b8',roughness:.85})};
}
function RRSmoothBoatHull(geometry) {
  const p=geometry.attributes.position,n=geometry.attributes.normal,groups=new Map();
  for(let i=0;i<p.count;i++){
    const key=p.getX(i).toFixed(4)+','+p.getY(i).toFixed(4)+','+p.getZ(i).toFixed(4);
    let item=groups.get(key);if(!item){item={x:0,y:0,z:0,indices:[]};groups.set(key,item);}
    item.x+=n.getX(i);item.y+=n.getY(i);item.z+=n.getZ(i);item.indices.push(i);
  }
  for(const g of groups.values()){const length=Math.hypot(g.x,g.y,g.z)||1;for(const i of g.indices)n.setXYZ(i,g.x/length,g.y/length,g.z/length);}
  n.needsUpdate=true;
}
function RRMergeBoatTrim(group) {
  group.updateMatrixWorld(true);const batches=new Map();
  const position=new D,normal=new D,normalMatrix=new Ye;
  for(const mesh of group.children){
    const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry,p=geometry.attributes.position,n=geometry.attributes.normal;
    let batch=batches.get(mesh.material);if(!batch){batch={positions:[],normals:[]};batches.set(mesh.material,batch);}
    normalMatrix.getNormalMatrix(mesh.matrixWorld);
    for(let i=0;i<p.count;i++){
      position.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);normal.fromBufferAttribute(n,i).applyMatrix3(normalMatrix).normalize();
      batch.positions.push(position.x,position.y,position.z);batch.normals.push(normal.x,normal.y,normal.z);
    }
    if(geometry!==mesh.geometry)geometry.dispose();mesh.geometry.dispose();
  }
  group.clear();
  for(const [material,b] of batches){const geometry=new ct();geometry.setAttribute('position',new qe(b.positions,3));geometry.setAttribute('normal',new qe(b.normals,3));const mesh=new ut(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}
}
function RRDecorateBoat(group,id,legacy=false) {
  if(RRBoatDetailCache.has(group))return;RRBoatDetailCache.add(group);
  const mats=RRBoatMaterials(),spec=At(id),hull=group.children.find(m=>m.isMesh&&m.geometry?.attributes.position);
  if(hull){
    hull.material.roughness=id==='wood'||id==='canoe'?.38:id==='kayak'?.3:.52;hull.material.metalness=0;
    const geo=hull.geometry,p=geo.attributes.position,uvs=[];
    for(let i=0;i<p.count;i++)uvs.push(p.getX(i)/spec.width+.5,p.getZ(i)/spec.length+.5);
    geo.setAttribute('uv',new qe(uvs,2));hull.material.bumpMap=id==='wood'||id==='canoe'?mats.wood:mats.fabric;hull.material.bumpScale=id==='wood'?.022:.008;hull.material.needsUpdate=true;
    if(!['wood','canoe'].includes(id))RRSmoothBoatHull(geo);
  }
  const trim=new Tt();
  function part(geometry,material,x,y,z,rotation=null){const mesh=new ut(geometry,material);mesh.position.set(x,y,z);if(rotation)mesh.rotation.set(...rotation);trim.add(mesh);return mesh;}
  function rope(a,b,radius=.022,material=mats.rope){const from=new D(...a),to=new D(...b),d=new D().subVectors(to,from);const mesh=part(new ln(radius,radius,d.length(),6),material,...from.add(to).multiplyScalar(.5).toArray());mesh.quaternion.setFromUnitVectors(new D(0,1,0),d.normalize());}
  if(id==='wood'||id==='canoe'){
    const bow=-spec.length*.37,stern=spec.length*.35;
    for(let i=0;i<3;i++)part(new Ki(.23+i*.035,.018,5,24),mats.rope,0,legacy?.47:.58,bow,[Math.PI/2,0,i*.4]);
    for(const z of [bow,stern]){
      part(new ln(.028,.028,.32,7),mats.metal,0,.63,z,[0,0,Math.PI/2]);
      part(new Mn(.2,.035,.16),mats.metal,0,.55,z);
    }
    for(const side of [-1,1])for(let z=-spec.length*.3;z<spec.length*.31;z+=.9){
      const x=side*spec.width*.4*Math.sqrt(Math.max(.2,1-(z/(spec.length*.52))**2));
      part(new wi(.028,6,4),mats.metal,x,.55,z);
    }
  }else if(id==='kayak'){
    const rim=part(new Ki(.48,.042,7,32),mats.rubber,0,.25,.12,[Math.PI/2,0,0]);rim.scale.set(.78,1.4,1);
    part(new Mn(.48,.27,.13),mats.rubber,0,.22,.52,[.18,0,0]);
    for(const end of [-1,1]){
      for(let i=0;i<3;i++){const z=end*(.92+i*.22);rope([-.25,.27,z-.13],[.25,.27,z+.13],.014,mats.rubber);rope([.25,.27,z-.13],[-.25,.27,z+.13],.014,mats.rubber);}
      part(new Ki(.1,.024,5,16),mats.rubber,0,.15,end*1.85,[Math.PI/2,0,0]);
    }
  }else{
    const width=spec.width*.41,length=spec.length*.36;
    for(const side of [-1,1]){
      const x=side*width;
      rope([x,.48,-length],[x,.48,length],.025);
      for(const z of [-length,0,length]){
        const handle=part(new Ki(.12,.026,5,16),mats.rubber,x,.49,z,[Math.PI/2,0,0]);handle.scale.set(1.3,.65,1);
        part(new Mn(.19,.022,.12),mats.rubber,x,.47,z);
      }
      for(const z of [-length*.65,length*.65]){
        const seam=part(new Ki(id==='packraft'?.19:.27,.009,4,16),mats.stitch,x,.3,z,[0,Math.PI/2,0]);seam.scale.set(1,.83,1);
      }
    }
    part(new ln(.045,.045,.04,8),mats.rubber,width,.59,-length*.55);
  }
  RRMergeBoatTrim(trim);group.add(trim);
}
function RRInitBoatDetails() {
  RRDecorateBoat(ui,'wood',true);for(const [id,view] of iu)RRDecorateBoat(view.group,id);
  if(!RRBoatBaseWh){RRBoatBaseWh=Wh;Wh=function(id){const view=RRBoatBaseWh(id);RRDecorateBoat(view.group,id);return view;};}
}
