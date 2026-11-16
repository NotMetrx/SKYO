let aladin;
const status = document.getElementById('sky-status');
const loadButton = document.getElementById('sky-retry');
loadButton.addEventListener('click', async () => {
  loadButton.disabled = true;
  status.textContent = 'Cargando Aladin Lite y el contexto HiPS…';
  try {
    const {default: A} = await import('aladin-lite');
    await A.init;
    aladin = A.aladin('#aladin-map', {survey:'https://irsa.ipac.caltech.edu/data/hips/CDS/2MASS/Color',target:'210.8023 54.3489',fov:1,cooFrame:'ICRS',showFullscreenControl:false});
    document.body.dataset.mapReady = 'true';
    status.textContent = 'Visor listo. Las imágenes 2MASS de IRSA se consultan en línea; su disponibilidad depende del proveedor.';
    loadButton.hidden = true;
  } catch (error) {
    status.textContent = 'No se pudo abrir el contexto HiPS. Comprueba la conexión o WebGL2 y vuelve a intentar.';
    console.warn('Contexto HiPS:', error);
    loadButton.disabled = false;
  }
});
document.getElementById('sky-position').addEventListener('submit', event => {
  event.preventDefault();
  if (!aladin) { status.textContent = 'Carga primero el mapa para cambiar las coordenadas.'; return; }
  aladin.gotoRaDec(Number(document.getElementById('sky-ra').value), Number(document.getElementById('sky-dec').value));
});
