export function createControls(T,canvas,camera,player,{onSelect,onChange,isXR}){
  const keys=new Set(),pointers=new Map(),handlers=[];
  const initial={ra:60.8109955,dec:51.3404038};
  let moving=false,orientation=false,lastPinch=0,device=null,screenAngle=0,orientationReady=null,orientationTimer=0,calibrate=false;
  const gyroOffset=new T.Quaternion();
  const euler=new T.Euler(),q=new T.Quaternion(),north=new T.Vector3(0,0,1),fix=new T.Quaternion(-Math.sqrt(.5),0,0,Math.sqrt(.5));
  function listen(target,name,fn,options){target.addEventListener(name,fn,options);handlers.push(()=>target.removeEventListener(name,fn,options));}
  function look(dx,dy){if(isXR())return;camera.rotation.y-=dx*.003;camera.rotation.x=Math.max(-1.55,Math.min(1.55,camera.rotation.x-dy*.003));onChange();}
  function zoom(factor){if(isXR())return;camera.fov=Math.max(.05,Math.min(95,camera.fov*factor));camera.updateProjectionMatrix();onChange();}
  function reset(){player.position.set(0,0,0);player.rotation.set(0,0,0);camera.rotation.set(initial.dec*Math.PI/180,initial.ra*Math.PI/180,0,'YXZ');camera.fov=70;camera.updateProjectionMatrix();onChange();}
  listen(canvas,'contextmenu',e=>e.preventDefault());
  listen(canvas,'pointerdown',e=>{canvas.focus();canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY});lastPinch=0;});
  listen(canvas,'pointermove',e=>{
    if(document.pointerLockElement===canvas){look(e.movementX,e.movementY);return;}
    const old=pointers.get(e.pointerId);if(!old)return;
    if(pointers.size===2){const other=[...pointers.entries()].find(([id])=>id!==e.pointerId)[1],dist=Math.hypot(e.clientX-other.x,e.clientY-other.y);if(lastPinch>0&&dist>0)zoom(lastPinch/dist);lastPinch=dist;}
    else look(e.clientX-old.x,e.clientY-old.y);
    Object.assign(old,{x:e.clientX,y:e.clientY});
  });
  listen(canvas,'pointerup',e=>{const p=pointers.get(e.pointerId);if(p&&pointers.size===1&&Math.hypot(p.startX-e.clientX,p.startY-e.clientY)<6){
    const r=canvas.getBoundingClientRect();
    onSelect(document.pointerLockElement===canvas?r.left+r.width/2:e.clientX,document.pointerLockElement===canvas?r.top+r.height/2:e.clientY);
  }pointers.delete(e.pointerId);lastPinch=0;});
  for(const name of ['pointercancel','lostpointercapture'])listen(canvas,name,e=>{pointers.delete(e.pointerId);lastPinch=0;});
  listen(canvas,'wheel',e=>{e.preventDefault();zoom(Math.exp(Math.max(-.5,Math.min(.5,e.deltaY*.001))));},{passive:false});
  listen(window,'keydown',e=>{
    if(e.target.closest('input,select,textarea,button,a')||isXR())return;
    const c=e.code||('Key'+e.key.toUpperCase());
    if(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft'].includes(c)||['w','W','a','A','s','S','d','D','q','Q','e','E'].includes(e.key)){e.preventDefault();keys.add(c);onChange();}
    if(['+','=','-'].includes(e.key)){e.preventDefault();zoom(e.key==='-'?1.2:1/1.2);}
    if(e.key==='Home'){e.preventDefault();reset();}
  });
  listen(window,'keyup',e=>{keys.delete(e.code);keys.delete('Key'+(e.key||'').toUpperCase());onChange();});listen(window,'blur',()=>{keys.clear();moving=false;pointers.clear();});
  listen(window,'orientationchange',()=>{screenAngle=(screen.orientation?.angle||window.orientation||0)*Math.PI/180;});
  const forward=new T.Vector3(),right=new T.Vector3(),step=new T.Vector3();
  function update(dt){
    if(isXR())return false;
    if(orientation&&device){
      const {alpha,beta,gamma}=device;euler.set(beta*Math.PI/180,alpha*Math.PI/180,-gamma*Math.PI/180,'YXZ');q.setFromEuler(euler).multiply(fix).multiply(new T.Quaternion().setFromAxisAngle(north,-screenAngle));
      if(calibrate){gyroOffset.copy(camera.quaternion).multiply(q.clone().invert());calibrate=false;}camera.quaternion.copy(gyroOffset).multiply(q);
    }
    const z=Number(keys.has('KeyW')||keys.has('ArrowUp')||moving)-Number(keys.has('KeyS')||keys.has('ArrowDown'));
    const x=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
    const y=Number(keys.has('KeyE'))-Number(keys.has('KeyQ'));
    if(z||x||y){camera.getWorldDirection(forward);right.crossVectors(forward,camera.up).normalize();step.copy(forward).multiplyScalar(z).addScaledVector(right,x);step.y+=y;step.normalize().multiplyScalar(dt*(keys.has('ShiftLeft')?160:70));player.position.add(step);if(player.position.length()>750)player.position.setLength(750);}
    return !!(z||x||y||orientation&&device);
  }
  async function toggleOrientation(){
    if(orientation){orientation=false;device=null;onChange();return false;}
    if(!window.DeviceOrientationEvent)throw Error('Giroscopio no disponible en este navegador');
    if(typeof DeviceOrientationEvent.requestPermission==='function' && await DeviceOrientationEvent.requestPermission()!=='granted')throw Error('Permiso de orientación no concedido');
    orientation=true;device=null;calibrate=true;screenAngle=(screen.orientation?.angle||0)*Math.PI/180;onChange();
    return new Promise((resolve,reject)=>{orientationReady=()=>{clearTimeout(orientationTimer);orientationReady=null;resolve(true);};orientationTimer=setTimeout(()=>{orientation=false;orientationReady=null;reject(Error('El dispositivo no entregó datos de orientación; usa arrastre táctil.'));},5000);});
  }
  listen(window,'deviceorientation',e=>{if(orientation&&[e.alpha,e.beta,e.gamma].every(Number.isFinite)){device={alpha:e.alpha,beta:e.beta,gamma:e.gamma};orientationReady?.();onChange();}});
  reset();
  return {reset,zoom,update,toggleOrientation,fly(value){moving=value;onChange();},lock(){canvas.focus();canvas.requestPointerLock?.();},dispose(){handlers.forEach(fn=>fn());keys.clear();clearTimeout(orientationTimer);if(document.pointerLockElement===canvas)document.exitPointerLock();}};
}
