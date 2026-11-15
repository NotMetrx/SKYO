/** Apply an installed update only after the user has saved their current work. */
if (import.meta.env?.PROD && 'serviceWorker' in navigator) {
  let reloading=false;
  const controlled=!!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(controlled&&!reloading){reloading=true;location.reload();}
  });
  navigator.serviceWorker.register(new URL('sw.js',document.baseURI)).then(registration=>{
    function offerUpdate() {
      if(!navigator.serviceWorker.controller || !registration.waiting || document.getElementById('offline-update')) return;
      const banner=document.createElement('p');banner.id='offline-update';banner.setAttribute('role','status');
      banner.style.cssText='position:fixed;top:76px;left:12px;right:12px;z-index:100;background:#121318;color:#fff;padding:16px;border:1px solid #7cc8ff';
      banner.append('Hay una actualización. Guarda tu trabajo antes de recargar. ');
      const button=document.createElement('button');button.textContent='Actualizar';button.type='button';
      button.onclick=()=>registration.waiting?.postMessage('activate');banner.append(button);document.body.append(banner);
    }
    offerUpdate();
    registration.addEventListener('updatefound',()=>{
      registration.installing?.addEventListener('statechange',offerUpdate);
    });
  }).catch(error=>console.warn('Offline no disponible:',error));
}
