/** One renderer/session; same actions and data as desktop. Device tests remain required. */
export function createXR(T,renderer,scene,camera,player,{onSelect,onChannel,onRead,onReset,onStatus,getText,wake}){
  renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local');
  const controllers=[],sources=new Map(),raycaster=new T.Raycaster(),rotation=new T.Matrix4();
  const hudCanvas=document.createElement('canvas');hudCanvas.width=1024;hudCanvas.height=640;
  const context=hudCanvas.getContext('2d'),texture=new T.CanvasTexture(hudCanvas);
  const panel=new T.Mesh(new T.PlaneGeometry(1.25,.78),new T.MeshBasicMaterial({map:texture,transparent:true,depthTest:false}));
  panel.position.set(0,-.55,-1.7);panel.renderOrder=100;panel.visible=false;camera.add(panel);
  const reticle=new T.Mesh(new T.RingGeometry(.005,.007,24),new T.MeshBasicMaterial({color:0xcdefff,depthTest:false}));
  reticle.position.z=-2;reticle.renderOrder=101;reticle.visible=false;camera.add(reticle);
  let session=null,ending=false,lastHud=0,turnReady=true,savedRotation;
  const forward=new T.Vector3(),right=new T.Vector3(),delta=new T.Vector3();
  function choose(controller){
    rotation.identity().extractRotation(controller.matrixWorld);raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);raycaster.ray.direction.set(0,0,-1).applyMatrix4(rotation);
    const hit=raycaster.intersectObject(panel,false)[0];
    if(hit){const {x,y}=hit.uv;
      if(y<.16){if(x<.5)onReset();else session?.end();}
      else if(y<.34)onRead();
      else if(y<.52)onChannel(x<.5?-1:1);
    }else onSelect(raycaster.ray.origin,raycaster.ray.direction);
    wake();
  }
  for(let i=0;i<2;i++){
    const c=renderer.xr.getController(i);player.add(c);controllers.push(c);
    const line=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3(0,0,-20)]),new T.LineBasicMaterial({color:0x7cc8ff}));c.add(line);
    c.addEventListener('connected',e=>sources.set(c,e.data));c.addEventListener('disconnected',()=>sources.delete(c));c.addEventListener('selectstart',()=>choose(c));
  }
  async function check(){
    if(!isSecureContext)return {supported:false,message:'VR necesita HTTPS o localhost'};
    if(!navigator.xr)return {supported:false,message:'WebXR no disponible; usa los controles de pantalla'};
    try{const supported=await navigator.xr.isSessionSupported('immersive-vr');return {supported,message:supported?'Entrar en VR':'Sin visor WebXR disponible; modo pantalla activo'};}
    catch(error){return {supported:false,message:`WebXR: ${error.message}`};}
  }
  async function enter(){
    if(session)return;
    try{
      const next=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor']});
      session=next;savedRotation=camera.rotation.clone();
      next.addEventListener('end',()=>{session=null;panel.visible=false;reticle.visible=false;camera.position.set(0,0,0);camera.rotation.copy(savedRotation);onStatus('Sesión VR finalizada; controles de pantalla activos');wake();});
      next.addEventListener('visibilitychange',wake);
      await renderer.xr.setSession(next);panel.visible=true;reticle.visible=true;onStatus('VR activo · mandos: seleccionar, canal, lectura y vuelo visual');wake();
    }catch(error){if(session){try{await session.end();}catch{}}session=null;panel.visible=false;reticle.visible=false;onStatus(`No se pudo entrar en VR: ${error.message}`);wake();}
  }
  function drawHud(now){
    if(now-lastHud<150)return;lastHud=now;
    context.fillStyle='rgba(7,7,10,.94)';context.fillRect(0,0,1024,640);context.fillStyle='#7cc8ff';context.font='28px sans-serif';
    getText().slice(0,6).forEach((line,i)=>context.fillText(line.slice(0,75),28,42+i*40));
    context.strokeStyle='#7cc8ff';context.strokeRect(1,1,1022,638);context.fillStyle='#e6e8ec';context.font='32px sans-serif';
    context.fillText('◀ Canal',80,360);context.fillText('Canal ▶',650,360);context.fillText('Leer flujo / detalle FITS',250,475);context.fillText('Volver al origen',60,585);context.fillText('Salir de VR',650,585);texture.needsUpdate=true;
  }
  function update(dt,now){
    if(!session)return;drawHud(now);
    for(const [c,source] of sources){
      const axes=source.gamepad?.axes;if(!axes?.length)continue;
      const offset=axes.length>=4?2:0,x=axes[offset]||0,y=axes[offset+1]||0;
      camera.getWorldDirection(forward);forward.y=0;forward.normalize();right.crossVectors(forward,new T.Vector3(0,1,0)).normalize();
      if(source.handedness==='right'){
        if(Math.abs(x)<.2)turnReady=true;
        if(Math.abs(x)>.65&&turnReady){player.rotation.y-=Math.sign(x)*Math.PI/4;turnReady=false;}
        if(Math.abs(y)>.15)player.position.y-=y*dt*35;
      }else if(Math.hypot(x,y)>.15){delta.copy(forward).multiplyScalar(-y).addScaledVector(right,x).multiplyScalar(dt*45);player.position.add(delta);}
      if(player.position.length()>750)player.position.setLength(750);
    }
  }
  return {check,enter,update,get active(){return !!session;},get visible(){return !session||session.visibilityState!=='hidden';},dispose(){if(ending)return;ending=true;session?.end().catch(()=>{});for(const c of controllers){player.remove(c);c.children.forEach(child=>{child.geometry?.dispose();child.material?.dispose();});}camera.remove(panel);camera.remove(reticle);reticle.geometry.dispose();reticle.material.dispose();panel.geometry.dispose();panel.material.dispose();texture.dispose();}};
}
