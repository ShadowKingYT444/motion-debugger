import {createSpring} from './spring.mjs';

/** Original lit, articulated colony. Consumer supplies THREE, renderer and its frame loop. */
export function createColonyScene({THREE: T, renderer, count = 18, reducedMotion = false}) {
  if (!T || !renderer || !Number.isInteger(count) || count < 1 || count > 48) throw new TypeError('THREE, renderer and count 1–48 required');
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(42, 1, .1, 120), resources = [];
  const own = resource => {resources.push(resource); return resource;};
  const laneCount = count > 24 ? 6 : 3, rows = Math.ceil(count / laneCount);
  const queueStart = 1.65, spacing = .94, outerRadius = queueStart + (rows - 1) * spacing;
  const groundRadius = outerRadius + 1.05, orbitRadius = outerRadius + .05;
  const pitch = .61, sinPitch = Math.sin(pitch), cosPitch = Math.cos(pitch);
  const oldShadow = renderer.shadowMap ? {enabled: renderer.shadowMap.enabled, type: renderer.shadowMap.type} : null;
  if (renderer.shadowMap) {renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;}
  scene.add(new T.AmbientLight(0xe8e4da, 1.25));
  const key = new T.DirectionalLight(0xffe7c8, 2.8); key.position.set(-6, 12, 8); key.castShadow = true;
  if (key.shadow) {
    key.shadow.mapSize.set(512, 512); key.shadow.bias = -.0002; key.shadow.normalBias = .025;
    Object.assign(key.shadow.camera, {left:-groundRadius,right:groundRadius,top:groundRadius,bottom:-groundRadius,near:.1,far:50});
    key.shadow.camera.updateProjectionMatrix();
  }
  scene.add(key);
  const rim = new T.DirectionalLight(0xd7edfa, 1.6); rim.position.set(7, 4, -8); scene.add(rim);
  const sphere = own(new T.SphereGeometry(1, 12, 8)), eyeGeometry = own(new T.SphereGeometry(1, 6, 4));
  const upperLeg = own(new T.CylinderGeometry(.023, .017, .304, 6));
  const lowerLeg = own(new T.CylinderGeometry(.017, .009, .28, 6));
  const antennaGeometry = own(new T.CylinderGeometry(.012, .008, .24, 5));
  const abdomenMaterial = own(new T.MeshStandardMaterial({color:0x302b27,roughness:.29,metalness:.28}));
  const thoraxMaterial = own(new T.MeshStandardMaterial({color:0x675040,roughness:.38,metalness:.2}));
  const headMaterial = own(new T.MeshStandardMaterial({color:0x45382d,roughness:.32,metalness:.18}));
  const legMaterial = own(new T.MeshStandardMaterial({color:0x503d2e,roughness:.4,metalness:.15}));
  const eyeMaterial = own(new T.MeshStandardMaterial({color:0x100e0c,roughness:.12,metalness:.3}));
  const textureSize = 48, contactPixels = new Uint8Array(textureSize * textureSize * 4);
  const groundPixels = new Uint8Array(textureSize * textureSize * 4);
  for (let y = 0; y < textureSize; y++) for (let x = 0; x < textureSize; x++) {
    const index = (y * textureSize + x) * 4, radius = Math.hypot((x + .5) / textureSize * 2 - 1, (y + .5) / textureSize * 2 - 1);
    contactPixels[index] = contactPixels[index + 1] = contactPixels[index + 2] = 255;
    contactPixels[index + 3] = Math.round(Math.max(0, 1 - radius) ** 2 * 200);
    const grain = 244 + ((x * 17 + y * 31 + x * y * 7) % 9);
    groundPixels[index] = groundPixels[index + 1] = groundPixels[index + 2] = grain; groundPixels[index + 3] = 255;
  }
  const contactTexture = own(new T.DataTexture(contactPixels, textureSize, textureSize, T.RGBAFormat)); contactTexture.needsUpdate = true;
  const groundTexture = own(new T.DataTexture(groundPixels, textureSize, textureSize, T.RGBAFormat)); groundTexture.needsUpdate = true;
  const contactGeometry = own(new T.PlaneGeometry(1, 1));
  const contactMaterial = own(new T.MeshBasicMaterial({color:0x21160e,map:contactTexture,transparent:true,opacity:.52,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));
  const groundGeometry = own(new T.CylinderGeometry(groundRadius, groundRadius, .22, 64));
  const groundMaterial = own(new T.MeshStandardMaterial({color:0xcab99c,map:groundTexture,roughness:.91,metalness:0}));
  const ground = new T.Mesh(groundGeometry, groundMaterial); ground.position.y = -.13; ground.receiveShadow = true; scene.add(ground);
  const routeGeometry = own(new T.CylinderGeometry(.012, .012, 1, 5));
  const routeMaterial = own(new T.MeshStandardMaterial({color:0x9c8060,roughness:.75,transparent:true,opacity:.55}));
  const hubGeometry = own(new T.CylinderGeometry(.74, .82, .13, 48));
  const hubMaterial = own(new T.MeshStandardMaterial({color:0xede5d5,roughness:.7,metalness:.05}));
  const hub = new T.Mesh(hubGeometry,hubMaterial); hub.position.y = .045; hub.receiveShadow = true; hub.castShadow = true; scene.add(hub);
  const payloadMaterial = own(new T.MeshStandardMaterial({color:0xb74228,roughness:.35,metalness:.15}));
  const payload = new T.Mesh(sphere,payloadMaterial); payload.scale.set(.36,.16,.36); payload.position.y = .22; payload.castShadow = true; scene.add(payload);
  const routeBatch = new T.InstancedMesh(routeGeometry,routeMaterial,laneCount); routeBatch.frustumCulled = false;
  for (let lane = 0; lane < laneCount; lane++) {
    const angle = lane / laneCount * Math.PI * 2 + Math.PI / 6, route = new T.Group(), line = new T.Mesh(routeGeometry,routeMaterial);
    route.rotation.y = -angle; line.rotation.z = Math.PI / 2; line.position.set((outerRadius + .95) / 2,.004,0); line.scale.y = outerRadius - .95; route.add(line); route.updateMatrixWorld(true); routeBatch.setMatrixAt(lane,line.matrixWorld);
  }
  routeBatch.instanceMatrix.needsUpdate = true; scene.add(routeBatch);
  const ants = [], batchInputs = new Map();
  const rememberMesh = mesh => {
    let materials = batchInputs.get(mesh.geometry); if (!materials) batchInputs.set(mesh.geometry,materials = new Map());
    let instances = materials.get(mesh.material); if (!instances) materials.set(mesh.material,instances = []);
    instances.push(mesh);
  };
  for (let i = 0; i < count; i++) {
    const ant = new T.Group(); ant.scale.setScalar(.51);
    for (const [x, scale, material] of [[-.47,[.55,.33,.3],abdomenMaterial],[0,[.24,.26,.21],thoraxMaterial],[.4,[.27,.27,.24],headMaterial]]) {
      const body = new T.Mesh(sphere,material); body.position.set(x,.35,0); body.scale.set(...scale); body.castShadow = true; ant.add(body);
    }
    for (const side of [-1,1]) {
      const eye = new T.Mesh(eyeGeometry,eyeMaterial); eye.scale.set(.068,.074,.045); eye.position.set(.49,.43,side * .2); ant.add(eye);
      const antenna = new T.Group(); antenna.position.set(.53,.53,side * .13); antenna.rotation.z = -.65; antenna.rotation.x = side * .45;
      const stem = new T.Mesh(antennaGeometry,legMaterial); stem.position.y = .12; antenna.add(stem);
      const tip = new T.Mesh(antennaGeometry,legMaterial); tip.position.set(.055,.27,0); tip.scale.y = .65; tip.rotation.z = -.6; antenna.add(tip); ant.add(antenna);
    }
    const legs = [];
    for (let pair = 0; pair < 3; pair++) for (const side of [-1,1]) {
      const pivot = new T.Group(); pivot.position.set((pair - 1) * .24,.32,side * .15);
      const upper = new T.Mesh(upperLeg,legMaterial); upper.position.set(0,-.025,side * .15); upper.rotation.x = -side * 1.405; upper.castShadow = true;
      const knee = new T.Group(); knee.position.set(0,-.05,side * .3);
      const lower = new T.Mesh(lowerLeg,legMaterial); lower.position.set(0,-.13,side * .05); lower.rotation.x = -side * .36; lower.castShadow = true;
      knee.add(lower); pivot.add(upper,knee); ant.add(pivot); legs.push({pivot,pair,side});
    }
    const shadow = new T.Mesh(contactGeometry,contactMaterial); shadow.rotation.x = -Math.PI / 2; shadow.position.set(-.12,.005,0); shadow.scale.set(1.9,1.1,1); ant.add(shadow);
    // Keep an articulated transform hierarchy, but render identical parts in batches.
    // Hidden authoring groups contribute no draw calls; only their world matrices do.
    ant.visible = false; ant.traverse(remember => {if (remember.isMesh) rememberMesh(remember);}); scene.add(ant);
    const lane = i % laneCount, row = Math.floor(i / laneCount), queueAngle = lane / laneCount * Math.PI * 2 + Math.PI / 6;
    ants.push({ant,legs,lane,row,queueAngle,phase:i / count * Math.PI * 2,gaitPhase:i * 1.7,gaitWeight:0,previous:null});
  }
  const batches = [];
  for (const [geometry,materials] of batchInputs) for (const [material,inputs] of materials) {
    const batch = new T.InstancedMesh(geometry,material,inputs.length); batch.frustumCulled = false;
    batch.castShadow = inputs.some(mesh => mesh.castShadow); batch.instanceMatrix.setUsage(T.DynamicDrawUsage); scene.add(batch); batches.push({batch,inputs});
  }
  const sceneInverse = new T.Matrix4(), instanceTransform = new T.Matrix4();
  const assembly = createSpring({value:0,frequency:1.4,reducedMotion});
  let elapsed = 0, paused = false, reduced = Boolean(reducedMotion), disposed = false, renderedFrames = 0;
  const fitCamera = aspect => {
    const tangent = Math.tan(camera.fov * Math.PI / 360), targetY = -groundRadius * .14;
    let low = groundRadius * 1.01, high = groundRadius * 18;
    for (let iteration = 0; iteration < 26; iteration++) {
      const distance = (low + high) / 2; let extent = 0;
      for (let i = 0; i < 48; i++) for (const height of [-.24,.65]) {
        const angle = i / 48 * Math.PI * 2, x = Math.cos(angle) * groundRadius, z = Math.sin(angle) * groundRadius;
        const depth = distance - (height - targetY) * sinPitch - z * cosPitch;
        extent = Math.max(extent,Math.abs(x / (depth * tangent * aspect)),Math.abs(((height - targetY) * cosPitch - z * sinPitch) / (depth * tangent)));
      }
      if (extent > .9) low = distance; else high = distance;
    }
    camera.position.set(0,sinPitch * high + targetY,cosPitch * high); camera.lookAt(0,targetY,0);
  };
  function update(seconds) {
    if (disposed) throw new Error('Colony disposed');
    if (!Number.isFinite(seconds) || seconds < 0) throw new TypeError('Nonnegative elapsed seconds required');
    if (!paused && !reduced) elapsed += seconds;
    const blend = paused ? assembly.state.value : assembly.advance(seconds).value;
    for (const agent of ants) {
      const {ant,legs,queueAngle,phase,row} = agent, angle = phase + elapsed * .19;
      const radius = orbitRadius - (agent.lane % 3) * .21, destinationRadius = queueStart + row * spacing;
      const x = Math.cos(angle) * radius * (1 - blend) + Math.cos(queueAngle) * destinationRadius * blend;
      const z = Math.sin(angle) * radius * (1 - blend) + Math.sin(queueAngle) * destinationRadius * blend;
      const previous = agent.previous, dx = previous ? x - previous.x : 0, dz = previous ? z - previous.z : 0;
      const speed = seconds > 0 && previous && !paused && !reduced ? Math.hypot(dx,dz) / seconds : 0;
      ant.position.set(x,0,z);
      let heading = previous ? ant.rotation.y : -angle - Math.PI / 2;
      if (speed > .015) heading = -Math.atan2(dz,dx);
      else if (blend === 1) heading = Math.PI - queueAngle;
      const turn = Math.atan2(Math.sin(heading - ant.rotation.y),Math.cos(heading - ant.rotation.y));
      if (!paused) {
        if (reduced || !previous || Math.abs(turn) < .0001) ant.rotation.y = heading;
        else ant.rotation.y += turn * (1 - Math.exp(-seconds * 11));
      }
      if (!paused) {
        agent.gaitWeight = reduced ? 0 : Math.min(1,speed / .7);
        agent.gaitPhase += reduced ? 0 : speed * seconds * 10;
        for (const {pivot,pair,side} of legs) {
          const stride = Math.sin(agent.gaitPhase + pair * Math.PI + (side > 0 ? Math.PI : 0)) * agent.gaitWeight;
          pivot.rotation.y = stride * .4; pivot.rotation.z = stride * .07;
        }
      }
      agent.previous = {x,z};
    }
    payload.scale.set(.36 + blend * .09,.16 + blend * .03,.36 + blend * .09);
    scene.updateMatrixWorld(true); sceneInverse.copy(scene.matrixWorld).invert();
    for (const {batch,inputs} of batches) {inputs.forEach((mesh,index) => batch.setMatrixAt(index,instanceTransform.multiplyMatrices(sceneInverse,mesh.matrixWorld))); batch.instanceMatrix.needsUpdate = true;}
    renderer.render(scene,camera); renderedFrames++;
  }
  const resize = (width,height,pixelRatio = 1) => {
    if (disposed) throw new Error('Colony disposed');
    if (![width,height,pixelRatio].every(Number.isFinite) || width <= 0 || height <= 0 || pixelRatio <= 0) throw new TypeError('Positive dimensions required');
    camera.aspect = width / height; fitCamera(camera.aspect); camera.updateProjectionMatrix(); renderer.setPixelRatio(Math.min(pixelRatio,2)); renderer.setSize(width,height,false);
  };
  fitCamera(1);
  return {
    scene,camera,resize,update,
    setProgress(value) {assembly.retarget(Math.max(0,Math.min(1,value)));},
    setPaused(value) {paused = Boolean(value);},
    setReducedMotion(value) {reduced = Boolean(value); assembly.setReducedMotion(reduced);},
    get state() {return {progress:assembly.state.value,paused,reducedMotion:reduced,agents:count,renderedFrames,lanes:laneCount,queued:assembly.state.value === 1,batches:batches.length};},
    dispose() {if (disposed) return; disposed = true; assembly.dispose(); scene.clear(); routeBatch.dispose(); for (const {batch} of batches) batch.dispose(); for (const resource of resources) resource.dispose(); key.shadow?.dispose?.(); if (oldShadow) Object.assign(renderer.shadowMap,oldShadow);}
  };
}
