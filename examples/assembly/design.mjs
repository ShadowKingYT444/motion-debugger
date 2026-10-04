// Original camera geometry, endpoint rig and fixed art. Protected during motion authoring.
export const DESIGN={schemaVersion:1,product:'ASSEMBLY A–01',background:0xe4e1d7,camera:{position:[6,3.7,10],lookAt:[0,-.55,0],fov:31},lights:{ambient:2.0,key:5.0,fill:2.5},body:{width:3.2,height:2.0,depth:1.0},lenses:{wide:{focalLengthMm:24,name:'WIDE / SEE MORE',length:.55},standard:{focalLengthMm:35,name:'EVERYDAY / STAY CURIOUS',length:.85},tele:{focalLengthMm:85,name:'PORTRAIT / COME CLOSER',length:1.25}},poses:{assembled:{body:[0,0,0],ring:[0,0,.68],sensor:[0,0,.45],selectedLens:[0,0,1.15]},exploded:{body:[-.75,.15,-.9],ring:[.1,0,.9],sensor:[-.1,.18,.0],selectedLens:[.65,.15,2.45]},inspector:{body:[-1.5,.25,-1.4],ring:[.2,-.4,.7],sensor:[.2,.3,1.4],selectedLens:[1.05,.15,2.5]},parked:{wide:[-2.1,-1.5,.8],standard:[-.5,-1.6,1.4],tele:[1.2,-1.6,1.7]}}};
export function createCameraScene(THREE,renderer){
  const scene=new THREE.Scene();scene.background=new THREE.Color(DESIGN.background);
  const camera=new THREE.PerspectiveCamera(DESIGN.camera.fov,1,.1,100);camera.position.set(...DESIGN.camera.position);camera.lookAt(...DESIGN.camera.lookAt);
  scene.add(new THREE.HemisphereLight(0xffffff,0x8b9480,DESIGN.lights.ambient));
  const key=new THREE.DirectionalLight(0xfff5e1,DESIGN.lights.key);key.position.set(-3,7,6);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-8,right:8,top:8,bottom:-8});key.shadow.bias=-.0005;scene.add(key);
  const fill=new THREE.DirectionalLight(0xe1eaf2,DESIGN.lights.fill);fill.position.set(6,2,-4);scene.add(fill);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:DESIGN.background,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-2.25;floor.receiveShadow=true;scene.add(floor);
  const black=new THREE.MeshStandardMaterial({color:0x242a2c,roughness:.32,metalness:.6}),grip=new THREE.MeshStandardMaterial({color:0x171e20,roughness:.84,metalness:.1}),metal=new THREE.MeshStandardMaterial({color:0xb9b9aa,roughness:.26,metalness:.88}),glass=new THREE.MeshStandardMaterial({color:0x263e4c,roughness:.09,metalness:.78}),orange=new THREE.MeshStandardMaterial({color:0xb95b30,roughness:.45,metalness:.25});
  const rig=new THREE.Group();rig.rotation.set(.06,-.13,-.03);scene.add(rig);
  const actors={};
  const mesh=(geometry,material,parent,position=[0,0,0])=>{const item=new THREE.Mesh(geometry,material);item.position.set(...position);item.castShadow=true;item.receiveShadow=true;parent.add(item);return item};
  const cylinder=(radius,depth,material,parent,z)=>{const item=mesh(new THREE.CylinderGeometry(radius,radius,depth,64),material,parent,[0,0,z]);item.rotation.x=Math.PI/2;return item};
  const body=new THREE.Group();actors.body=body;rig.add(body);
  const shape=new THREE.Shape(),w=DESIGN.body.width/2,h=DESIGN.body.height/2,r=.16;shape.moveTo(-w+r,-h);shape.lineTo(w-r,-h);shape.quadraticCurveTo(w,-h,w,-h+r);shape.lineTo(w,h-r);shape.quadraticCurveTo(w,h,w-r,h);shape.lineTo(-w+r,h);shape.quadraticCurveTo(-w,h,-w,h-r);shape.lineTo(-w,-h+r);shape.quadraticCurveTo(-w,-h,-w+r,-h);
  const shell=mesh(new THREE.ExtrudeGeometry(shape,{depth:.92,bevelEnabled:true,bevelSize:.04,bevelThickness:.04,bevelSegments:3,steps:1}),black,body,[0,0,-.5]);
  mesh(new THREE.BoxGeometry(.7,1.75,.19),grip,body,[1.09,-.01,.51]);for(let i=0;i<16;i++)mesh(new THREE.BoxGeometry(.62,.018,.018),black,body,[1.09,-.7+i*.095,.614]);
  mesh(new THREE.BoxGeometry(.82,.32,.58),black,body,[0,1.11,-.08]);mesh(new THREE.BoxGeometry(.53,.17,.06),glass,body,[0,1.11,.24]);
  const dial=mesh(new THREE.CylinderGeometry(.27,.27,.16,32),metal,body,[-1.0,1.04,0]);for(let i=0;i<28;i++){const angle=i/28*Math.PI*2;mesh(new THREE.BoxGeometry(.024,.17,.024),grip,body,[-1+Math.cos(angle)*.268,1.04,Math.sin(angle)*.268]);}
  mesh(new THREE.CylinderGeometry(.13,.13,.12,32),orange,body,[1.1,1.06,.15]);
  // Tiny engraving is original vector artwork drawn locally, without external font/network assets.
  const label=document.createElement('canvas');label.width=256;label.height=64;const ctx=label.getContext('2d');ctx.fillStyle='#d1d0bd';ctx.font='28px Arial';ctx.fillText('A–01',10,42);const texture=new THREE.CanvasTexture(label);const badge=mesh(new THREE.PlaneGeometry(.54,.135),new THREE.MeshBasicMaterial({map:texture,transparent:true}),body,[-1.0,.56,.471]);
  const ring=new THREE.Group();actors.ring=ring;rig.add(ring);const ringMesh=mesh(new THREE.TorusGeometry(.62,.047,12,64),metal,ring);for(let i=0;i<16;i++){const angle=i/16*Math.PI*2;mesh(new THREE.BoxGeometry(.023,.045,.11),grip,ring,[Math.cos(angle)*.67,Math.sin(angle)*.67,0]);}
  const sensor=new THREE.Group();actors.sensor=sensor;rig.add(sensor);mesh(new THREE.BoxGeometry(.9,.69,.055),metal,sensor);mesh(new THREE.BoxGeometry(.79,.55,.065),new THREE.MeshStandardMaterial({color:0x5c617f,metalness:.7,roughness:.18}),sensor,[0,0,.045]);mesh(new THREE.BoxGeometry(.72,.49,.07),glass,sensor,[0,0,.07]);
  for(const [id,spec] of Object.entries(DESIGN.lenses)){const lens=new THREE.Group();actors['lens-'+id]=lens;rig.add(lens);cylinder(.59,spec.length,black,lens,spec.length/2);cylinder(.635,.085,metal,lens,.035);cylinder(.62,.12,grip,lens,spec.length*.62);for(let i=0;i<40;i++){const angle=i/40*Math.PI*2;const item=mesh(new THREE.BoxGeometry(.021,.021,spec.length*.48),grip,lens,[Math.cos(angle)*.607,Math.sin(angle)*.607,spec.length*.54]);item.rotation.z=angle;}
    cylinder(.535,.05,glass,lens,spec.length+.012);cylinder(.405,.052,new THREE.MeshStandardMaterial({color:0x162632,metalness:.9,roughness:.1}),lens,spec.length+.04);const rim=mesh(new THREE.TorusGeometry(.55,.018,8,64),metal,lens,[0,0,spec.length+.049]);cylinder(.17,.055,new THREE.MeshStandardMaterial({color:0x315a64,metalness:.9,roughness:.12}),lens,spec.length+.066);
  }
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  return {scene,camera,actors,rig};
}
