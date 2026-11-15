/**
 * SKYO — Fuente Única de Verdad (Catálogos, Épocas, Bandas, Fases ROADMAP y Pipeline)
 * Alineado a nasa/*.md y Filosofía Ponytail
 */

export const SUBS = [
  'Atrévete a explorar',
  'Ve a lo desconocido',
  '¿Realmente estamos solos?',
  'El universo te espera',
  'Cada punto de luz es una historia',
  'Mira más allá del cielo',
  'Lo desconocido también tiene coordenadas'
];

export const MSG = {
  inicio: 'Soy KRYO-9, tu copiloto en SKYO. Pulsa Enter o tócame para despegar hacia la Bóveda SPHEREx.',
  explorar: '¡En órbita ICRS! Estás viendo el Plano Focal de SPHEREx: toca una píldora abajo para que te explique sus bandas infrarrojas o cómo detectar candidatos.',
  '3d': 'Arrastra para girar el sistema solar. Usa la rueda o ＋ y － para comparar dónde orbitan el Cinturón, los cometas y las regiones lejanas.',
  fases: 'Recorre la constelación 3D o elige una fase (0–6) para ver cómo SPHEREx, WCS TAN-SIP y el cruce con JPL separan candidatos reales.'
};

export const GUIA_SPHEREX = {
  que_es: {
    label: '¿Qué es SPHEREx?',
    clip: 'Wave_Hello',
    text: 'SPHEREx es un telescopio espacial de la NASA que fotografía todo el cielo cada 6 meses en 102 longitudes de onda infrarrojas (0.75–5.01 µm). Aquí exploras una ventana de 0.05°×0.05° en coordenadas fijas ICRS.'
  },
  bandas: {
    label: '2 bandas IR',
    clip: 'Scan_Sky',
    text: 'Sus filtros variables lineales (LVF) separan dos regímenes: IR Corto (D1–D3, 0.75–2.41 µm) resalta estrellas frías; IR Largo (D4–D6, 2.42–5.01 µm) revela hielos, polvo térmico y colas cometarias.'
  },
  blink: {
    label: 'Blink (6 meses)',
    clip: 'Scan_Sky',
    text: 'Al comparar Época 1 frente a Época 4 («Parpadear épocas»), las estrellas lejanas quedan inmóviles como ancla WCS, mientras asteroides y cometas cercanos saltan dibujando su vector de desplazamiento Δθ.'
  },
  planeta_x: {
    label: '¿Por qué SPX-26?',
    clip: 'Found_PlanetX',
    text: 'Si un objeto se desplaza entre épocas pero no aparece en JPL Small-Body DB, lo marcamos como «Candidato». Un hipotético Planeta X se movería muy lento; antes de afirmar un hallazgo hay que validar PSF, residuos WCS y más épocas.'
  },
  neois: {
    label: 'Equipo Neois',
    clip: 'Wave_Hello',
    text: 'El Grupo Neois (Edwin Lizana, Valentín García, Aron Ayala y Jhoao Lopez) creó SKYO para NASA Space Apps 2026, abriendo la exploración de datos de SPHEREx al público.'
  }
};

export const DATOS = [
  'La luz del Sol tarda unos 8 minutos en llegar a la Tierra.',
  'En Venus un día dura más que un año.',
  'SPHEREx cartografía todo el cielo cada seis meses en 102 bandas infrarrojas (0.75–5.01 µm).',
  'Un objeto lejano se mueve muy poco en seis meses: SKYO distingue candidatos sin afirmar hallazgos.',
  'La Vía Láctea y Andrómeda chocarán dentro de unos 4 500 millones de años.'
];

export const FI = {
  Sistema: 'Tamaños y distancias ilustrativos, no están a escala real.',
  Cometa: 'La cola de un cometa siempre apunta lejos del Sol por el viento solar.',
  Cinturón: 'Entre Marte y Júpiter orbitan millones de asteroides.'
};

export const EPOCAS = [
  { id: 0, label: 'Época 1', span: 'Mar–Ago 2025', desc: 'Primer barrido completo del cielo (referencia base).' },
  { id: 1, label: 'Época 2', span: 'Sep 2025–Feb 2026', desc: 'Segunda pasada semestral: primeros desplazamientos visibles.' },
  { id: 2, label: 'Época 3', span: 'Mar–Ago 2026', desc: 'Tercera pasada: cometas y asteroides avanzan en su órbita.' },
  { id: 3, label: 'Época 4', span: 'Sep–Nov 2026', desc: 'Versión rápida reciente: seguimiento activo de candidatos.' }
];

export const MESES = [
  { id: 0, label: 'Mes 1', name: 'Inicio de barrido' },
  { id: 1, label: 'Mes 2', name: 'Barrido medio-alto' },
  { id: 2, label: 'Mes 3', name: 'Cruce eclíptico' },
  { id: 3, label: 'Mes 4', name: 'Barrido profundo' },
  { id: 4, label: 'Mes 5', name: 'Cierre orbital' },
  { id: 5, label: 'Mes 6', name: 'Fin de época' }
];

export const BANDAS = [
  {
    id: 'ir1',
    label: 'IR Corto (D1–D3)',
    range: '0.75–2.41 µm',
    hex: '#5bb8ff',
    desc: 'Resalta estrellas frías y polvo estelar reflejado.'
  },
  {
    id: 'ir2',
    label: 'IR Largo (D4–D6)',
    range: '2.42–5.01 µm',
    hex: '#b57bff',
    desc: 'Destaca hielos, comas cometarias y emisión térmica.'
  }
];

export const MODOS_LECTURA = {
  vuelo: {
    id: 'vuelo',
    label: 'Vuelo',
    note: 'Lenguaje sencillo, sin jerga técnica.'
  },
  explorador: {
    id: 'explorador',
    label: 'Explorador',
    note: 'Filtros, comparación temporal entre pasadas y bandas infrarrojas.'
  },
  cientifico: {
    id: 'cientifico',
    label: 'Científico',
    note: 'Grilla HEALPix 3D, desplazamiento Δθ (> 2") y trazabilidad IRSA / JPL.'
  }
};

export const ETAPAS_EXPLORACION = [
  { id: 'donde', num: '01', question: '¿A dónde vamos?', title: 'Ventana ICRS y catálogo' },
  { id: 'cuando', num: '02', question: '¿Cuándo?', title: 'Épocas y parpadeo (Blink)' },
  { id: 'luz', num: '03', question: '¿Con qué luz?', title: 'Banda IR y vector Δθ' }
];

/**
 * Misiones guiadas de aula por H.E.R.A 7 (HERA-7.md y ROADMAP.md)
 */
export const MISIONES_HERA = [
  {
    id: 'm1',
    title: 'Caza por parpadeo (Blink)',
    prompt: 'Activa «Parpadear épocas» (o compara Época 1 y 4) y toca el candidato sin cruce JPL que más se desplazó.',
    hints: [
      'Pista 1: Pulsa «Parpadear épocas (Blink)» abajo para ver qué puntos saltan frente a las estrellas fijas.',
      'Pista 2: Filtra por «Asteroides» arriba y busca el objeto resaltado en morado llamado SPX-26.'
    ],
    check: ({ object, epoch, blinkUsed, compare }) =>
      object && object[0] === 'Candidato SPX-26' && (blinkUsed || compare || epoch >= 1),
    closure: '¡Excelente ojo clínico! SPX-26 exhibe un desplazamiento aparente claro frente al marco fijo ICRS, pero al no coincidir con JPL permanece como «Candidato» sin afirmar un descubrimiento.'
  },
  {
    id: 'm2',
    title: 'Firma infrarroja en IR Largo',
    prompt: 'Cambia a IR Largo (D4–D6 · 2.42–5.01 µm), avanza al menos a Época 3 y selecciona un cometa activo.',
    hints: [
      'Pista 1: En «¿Con qué luz?», elige el botón «IR Largo (D4–D6)» y sube a Época 3 o 4.',
      'Pista 2: Toca cualquiera de los cometas con cola brillante (Halley, NEOWISE o 67P).'
    ],
    check: ({ object, epoch, band }) =>
      object && object[1] === 'Cometa' && band === 1 && epoch >= 2,
    closure: '¡Reto cumplido! En IR Largo (2.42–5.01 µm), SPHEREx capta la emisión térmica del polvo y hielos volatilizados en la coma del cometa conforme avanza por el recorte.'
  },
  {
    id: 'm3',
    title: 'Estrella fija vs cuerpo cercano',
    prompt: 'Activa «Comparar épocas» en Época 4 e inspecciona una estrella fija para ver cómo calibramos el cielo.',
    hints: [
      'Pista 1: Selecciona Época 4 y activa «Comparar épocas». Verás que algunas fuentes no trazan vector morado.',
      'Pista 2: Toca Sirius, Polaris o Betelgeuse para confirmar su deriva nula.'
    ],
    check: ({ object, epoch, compare }) =>
      object && object[1] === 'Estrella' && (compare || epoch >= 1),
    closure: '¡Exacto! Las estrellas lejanas están a decenas o cientos de años luz: entre pasadas de 6 meses no cambian de posición visible y sirven como ancla astrométrica ICRS.'
  },
  {
    id: 'm4',
    title: 'Registro en Bitácora de Aula',
    prompt: 'Inspecciona un asteroide conocido (Bennu, Eros o Ceres) en Época 2–4 y guárdalo en tu Bitácora.',
    hints: [
      'Pista 1: Elige Época 2, 3 o 4, toca Bennu, Eros o Ceres para abrir su ficha.',
      'Pista 2: Dentro de la ficha del objeto, pulsa «Registrar en bitácora».'
    ],
    check: ({ object, loggedNow }) =>
      Boolean(loggedNow && object && object[1] === 'Asteroide'),
    closure: '¡Registro archivado! Acabas de completar el ciclo científico real de SKYO: localizar, medir desplazamiento Δθ, anotar la banda infrarroja y documentar la evidencia.'
  }
];

/**
 * Fases de la Hoja de Ruta (nasa/ROADMAP.md) vinculadas a ARQUITECTURA.md y DATOS-Y-APIS.md
 */
export const FASES_PROYECTO = [
  {
    id: 'f0',
    num: '0',
    title: 'Prototipo',
    status: 'Completada',
    tone: 'ok',
    summary: 'Interfaz viva en español con Inicio, Explorar 3D, Sistema Solar 3D, transiciones fluidas y guía H.E.R.A 7 sobre datos ilustrativos.',
    route: '#inicio',
    routeLabel: 'Ir a Inicio',
    etapas: [
      { tag: 'Etapa 0.1', name: 'Identidad negro cosmos', detail: 'Fondo #000000 absoluto con acento azul SPHEREx (#5bb8ff) y morado H.E.R.A 7 (#b57bff).' },
      { tag: 'Etapa 0.2', name: 'Motor Three.js unificado', detail: 'Escena WebGL viva en las 4 vistas sin duplicar contextos gráficos ni despertar la CPU en reposo.' },
      { tag: 'Etapa 0.3', name: 'Divulgación progresiva', detail: 'Niveles Vuelo, Explorador y Científico pensados para móvil primero y accesibilidad AA.' }
    ]
  },
  {
    id: 'f1',
    num: '1',
    title: 'Mapa real',
    status: 'En diseño',
    tone: 'ac',
    summary: 'Integración de fondo HiPS (DSS color) y Aladin Lite v3 con búsqueda por nombre astronómico y capas progresivas.',
    route: '#explorar',
    routeLabel: 'Abrir Explorar',
    etapas: [
      { tag: 'Etapa 1.1', name: 'Capas HiPS', detail: 'Despliegue rápido del fondo celeste antes de cargar recortes espectrales pesados.' },
      { tag: 'Etapa 1.2', name: 'Búsqueda guiada', detail: 'Localización de estrellas, cometas y asteroides en lenguaje natural en español.' },
      { tag: 'Etapa 1.3', name: 'Encuadre inteligente', detail: 'Recortes acotados de 0.01° a 0.05° para no saturar conexiones móviles.' }
    ]
  },
  {
    id: 'f2',
    num: '2',
    title: 'Datos SPHEREx',
    status: 'En diseño',
    tone: 'ac',
    summary: 'Backend propio en FastAPI que consulta NASA/IPAC IRSA (TAP `spherex.obscore` y SIA2) para entregar recortes listos.',
    route: '#explorar',
    routeLabel: 'Ver bandas IR',
    etapas: [
      { tag: 'Etapa 2.1', name: 'Consultas ADQL en servidor', detail: 'El navegador nunca habla ADQL ni expone CORS: todo pasa por pyvo / astroquery.' },
      { tag: 'Etapa 2.2', name: 'Recortes FITS a PNG', detail: 'Conversión con astropy y reproject conservando coordenadas WCS exactas.' },
      { tag: 'Etapa 2.3', name: 'Tareas asíncronas', detail: 'Identificador de consulta en backend mientras una animación 3D acompaña la espera.' }
    ]
  },
  {
    id: 'f3',
    num: '3',
    title: 'Caché HEALPix',
    status: 'En diseño',
    tone: 'ac',
    summary: 'Indexación espacial del cielo por celdas HEALPix en PostgreSQL + Redis con 15 a 20 regiones curadas precalculadas.',
    route: '#explorar',
    routeLabel: 'Ver malla en Científico',
    etapas: [
      { tag: 'Etapa 3.1', name: 'Clave espacial HEALPix', detail: 'Quienes observan zonas cercanas comparten respuesta desde caché en milisegundos.' },
      { tag: 'Etapa 3.2', name: 'Zonas precalculadas', detail: 'Conjunto curado de 15–20 regiones procesadas de antemano para respuesta < 3 s.' },
      { tag: 'Etapa 3.3', name: 'Resiliencia de red', detail: 'Respuestas ligeras pensadas para celulares de gama media y baja conectividad.' }
    ]
  },
  {
    id: 'f4',
    num: '4',
    title: 'Cambios y JPL',
    status: 'Activo (Demo)',
    tone: 'ac2',
    summary: 'Detección catálogo contra catálogo en la misma banda espectral y cruce con JPL SB Identification para separar conocidos de candidatos.',
    route: '#explorar',
    routeLabel: 'Comparar épocas',
    etapas: [
      { tag: 'Etapa 4.1', name: 'Detección photutils', detail: 'Extracción y alineación WCS de fuentes entre épocas dentro de la misma banda IR.' },
      { tag: 'Etapa 4.2', name: 'Cruce SkyCoord', detail: 'Separación angular entre épocas (`sep > 2"`) para revelar desplazamiento propio.' },
      { tag: 'Etapa 4.3', name: 'Oráculo JPL SSD', detail: 'Clasificación honesta: Conocido, Candidato sin identificar (ej. SPX-26) o Descartado.' }
    ]
  },
  {
    id: 'f5',
    num: '5',
    title: 'IA y Misiones',
    status: 'Activa (Local)',
    tone: 'ac',
    summary: 'Conexión de H.E.R.A 7 a `POST /hera` con contexto astronómico, clasificación de artefactos y misiones guiadas interactivas.',
    route: '#3d',
    routeLabel: 'Vuelo orbital 3D',
    etapas: [
      { tag: 'Etapa 5.1', name: '7 Reglas H.E.R.A 7', detail: 'Español claro, rigor científico, cero datos personales y fuentes visibles.' },
      { tag: 'Etapa 5.2', name: 'Clasificador real/ruido', detail: 'Filtro asistido por IA para descartar rayos cósmicos y bordes de sensor.' },
      { tag: 'Etapa 5.3', name: 'Teletransportación', detail: 'Comandos guiados como «llévame al cometa que más se movió entre épocas».' }
    ]
  },
  {
    id: 'f6',
    num: '6',
    title: 'Comunidad',
    status: 'Planificada',
    tone: 'mut',
    summary: 'Modo docente, guías de aula en español y auditoría completa de rendimiento, accesibilidad y licencias (GPL v3 / abiertas).',
    route: '#fases',
    routeLabel: 'Ver pipeline',
    etapas: [
      { tag: 'Etapa 6.1', name: 'Adopción escolar', detail: 'Misiones listas para docentes y estudiantes desde cualquier navegador móvil.' },
      { tag: 'Etapa 6.2', name: 'Atribución transparente', detail: 'Crédito visible a NASA/IPAC IRSA y JPL Solar System Dynamics en cada vista.' },
      { tag: 'Etapa 6.3', name: 'Auditoría energética', detail: 'Verificación de 60 fps fluidos, bajo RSS y compatibilidad sin WebGL.' }
    ]
  }
];

/**
 * Pipeline técnico de Detección de Cambios (nasa/DETECCION-DE-CAMBIOS.md)
 */
export const ETAPAS_PIPELINE = [
  { step: '01', name: 'Selección', code: 'Misma banda IR', detail: 'Se eligen región y dos épocas en la misma banda (nunca se mezclan bandas distintas).' },
  { step: '02', name: 'Alineación', code: 'reproject / WCS', detail: 'Ambas imágenes pasan exactamente al mismo sistema de coordenadas celestes.' },
  { step: '03', name: 'Detección', code: 'photutils', detail: 'Se extraen las fuentes luminosas de cada época junto con su flujo y posición.' },
  { step: '04', name: 'Cruce', code: 'sep > 2"', detail: 'SkyCoord.match_to_catalog_sky identifica objetos que desplazaron su posición.' },
  { step: '05', name: 'Cruce JPL', code: 'SB Identification', detail: 'Consulta a JPL para verificar si corresponde a un cometa o asteroide conocido.' },
  { step: '06', name: 'Clasificación', code: 'Conocido / Candidato', detail: 'Separa objetos conocidos, candidatos reales en revisión y posibles artefactos.' }
];

/**
 * Catálogo de cuerpos celestes:
 * [nombre, tipo, radioRelativo, anguloBase, colorHex, descripcion, datoAdicional, estado, derivaPorMes]
 */
export const OBJ = [
  ['Sirius', 'Estrella', 0.30, 0.4, '#dfe8f5', 'La estrella más brillante del cielo nocturno.', 'Distancia: 8,6 años luz', 'Confirmado', 0],
  ['Betelgeuse', 'Estrella', 0.62, 2.2, '#ff9c6b', 'Supergigante roja en la constelación de Orión.', 'Distancia: unos 550 a 700 años luz', 'Confirmado', 0],
  ['Vega', 'Estrella', 0.45, 3.6, '#dfe8f5', 'Una de las estrellas más brillantes, en la constelación de Lira.', 'Distancia: unos 25 años luz', 'Confirmado', 0],
  ['Antares', 'Estrella', 0.78, 4.9, '#ff7a5a', 'Supergigante roja en el corazón de Escorpio.', 'Distancia: unos 550 años luz', 'Confirmado', 0],
  ['Rigel', 'Estrella', 0.70, 5.9, '#c9dff5', 'Supergigante azul en Orión.', 'Distancia: unos 860 años luz', 'Confirmado', 0],
  ['Polaris', 'Estrella', 0.20, 1.4, '#fff2c8', 'La estrella polar, casi fija sobre el polo norte celeste.', 'Distancia: unos 430 años luz', 'Confirmado', 0],
  ['Alfa Centauri', 'Estrella', 0.55, 1.1, '#ffe9a8', 'El sistema estelar más cercano al Sol.', 'Distancia: 4,4 años luz', 'Confirmado', 0],
  ['1P/Halley', 'Cometa', 0.36, 5.2, '#5bb8ff', 'El cometa más famoso; vuelve cada 76 años aproximadamente.', 'Próximo perihelio: 2061', 'Confirmado', 0.035],
  ['C/2020 F3 (NEOWISE)', 'Cometa', 0.68, 1.7, '#9ad4ff', 'Cometa brillante visible a simple vista en 2020.', 'Período orbital: ~6 800 años', 'Confirmado', 0.022],
  ['67P/Churyumov-Gerasimenko', 'Cometa', 0.52, 3.1, '#5bb8ff', 'Visitado y estudiado de cerca por la misión Rosetta de la ESA.', 'Tiene forma bilobulada («patito de goma»)', 'Confirmado', 0.028],
  ['Bennu', 'Asteroide', 0.50, 5.5, '#c4b8a8', 'Asteroide cercano a la Tierra; OSIRIS-REx trajo una muestra en 2023.', 'Rico en carbono y agua', 'Confirmado', 0.045],
  ['Eros', 'Asteroide', 0.25, 2.8, '#d9be9c', 'Primer asteroide orbitado y aterrizado por una sonda (NEAR Shoemaker).', 'Forma alargada de cacahuate', 'Confirmado', 0.038],
  ['Ceres', 'Asteroide', 0.72, 0.9, '#e0dbd0', 'El objeto más grande del cinturón de asteroides; planeta enano.', 'Tiene depósitos brillantes de sal', 'Confirmado', 0.018],
  ['Candidato SPX-26', 'Asteroide', 0.60, 4.1, '#b57bff', 'Fuente tenue con desplazamiento propio entre épocas; en verificación.', 'Desplazamiento ilustrativo · Sin cruce JPL', 'Candidato', 0.052]
];

export function getObjectProvenance(o) {
  if (!o) return { label: 'Recreación educativa (SKYO)', type: 'synthetic' };
  if (o[7] === 'Candidato') {
    return {
      label: 'Recreación sintética educativa (SKYO · Sin cruce JPL)',
      type: 'synthetic'
    };
  }
  if (o[1] === 'Estrella') {
    return {
      label: 'Referencia catalogada · Gaia DR3 / Hipparcos (posiciones ilustrativas)',
      type: 'catalog'
    };
  }
  return {
    label: 'Referencia catalogada · JPL Small-Body Database (órbita ilustrativa)',
    type: 'catalog'
  };
}

export const PLANETAS = [
  ['Mercurio', 0x9a9a9a, 12, 1.60, 1.0],
  ['Venus',    0xe6c07a, 18, 1.20, 1.9],
  ['Tierra',   0x7cc8ff, 25, 1.00, 2.1],
  ['Marte',    0xd1603d, 32, 0.80, 0.4],
  ['Júpiter',  0xd9b38c, 54, 0.45, 3.4],
  ['Saturno',  0xe3d3a3, 70, 0.35, 3.0],
  ['Urano',    0x8fe3e8, 86, 0.25, 2.1],
  ['Neptuno',  0x4a6bff, 100, 0.20, 2.0]
];

/**
 * Generador pseudoaleatorio determinista (Mulberry32)
 */
export const rng = seed => () => {
  seed |= 0;
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const EQUIPO_NEOIS = [
  {
    name: 'Edwin Lizana',
    role: 'Estudiante · Neois',
    initials: 'EL',
    bio: 'Investigación astronómica y desarrollo computacional en SKYO.',
    contact: 'Grupo Neois · NASA Space Apps 2026'
  },
  {
    name: 'Valentín García',
    role: 'Estudiante · Neois',
    initials: 'VG',
    bio: 'Modelado y simulación de sistemas celestes y análisis espectral.',
    contact: 'Grupo Neois · NASA Space Apps 2026'
  },
  {
    name: 'Aron Ayala',
    role: 'Estudiante · Neois',
    initials: 'AA',
    bio: 'Arquitectura de software interactivo y procesamiento de datos astronómicos.',
    contact: 'aronemilioayalalopez11@gmail.com',
    github: 'https://github.com/aronemilio'
  },
  {
    name: 'Jhoao Lopez',
    role: 'Estudiante · Neois',
    initials: 'JL',
    bio: 'Diseño de experiencia interactiva y divulgación científica del cosmos.',
    contact: 'Grupo Neois · NASA Space Apps 2026'
  }
];

export const RESUMEN_TRABAJO = [
  {
    badge: '3D · VISUAL',
    title: 'Bóveda Celeste 3D',
    desc: 'Domo HEALPix con astrolabio, rotación de asteroides SPX-26 y cometas con física orbital en Three.js.'
  },
  {
    badge: 'PBR · BLENDER',
    title: 'Plano Focal Infrarrojo (FPA)',
    desc: 'Calibración física PBR con 19 materiales espaciales y 6 detectores LVF D1–D6 (0.75 a 5.01 µm).'
  },
  {
    badge: 'CIENCIA · FITS',
    title: 'Laboratorio FITS Local-First',
    desc: 'Pipeline en navegador con WCS TAN-SIP, máscaras FLAGS, reproyección y detección de candidatos.'
  },
  {
    badge: 'CINEMÁTICA · WEBGL',
    title: 'Eclipse Solar y Transición Warp',
    desc: 'Corona solar pulsante procedural, destello diamante en el limbo y salto orbital hacia la Bóveda.'
  },
  {
    badge: 'IA · ASISTENTE',
    title: 'Copiloto KRYO-9',
    desc: 'Asistente orbital con síntesis de voz, personalización de avatar y guía científica contextual.'
  }
];

export const MISION_SPHEREX = {
  tag: '✦ GRUPO NEOIS · NASA SPACE APPS 2026',
  title: 'Llevar la exploración espacial a todas las personas',
  summary: 'Con SKYO queremos que el universo deje de ser un lugar lejano: una plataforma interactiva que muestra el cosmos en luz infrarroja mediante datos del telescopio espacial SPHEREx para que cualquier persona o estudiante pueda explorar galaxias, asteroides y estrellas sin barreras.',
  spherexInfo: 'SPHEREx (Spectro-Photometer for the History of the Universe, Epoch of Reionization and Ices Explorer) es un telescopio espacial de la NASA diseñado para cartografiar todo el cielo en 102 bandas infrarrojas (0.75 a 5.01 µm), revelando el origen del universo y la presencia de agua y hielos interestelares.'
};
