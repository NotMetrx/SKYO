/**
 * Copia el manifiesto curado publicado a una ruta importable desde JavaScript.
 * Vite no permite importar assets de `public/`; el paquete sigue siendo la
 * fuente canónica y esta copia solo evita ese patrón no soportado.
 */
import fs from 'node:fs/promises';

const source = new URL('../public/datasets/m101-visual-v2/manifest.json', import.meta.url);
const target = new URL('../data/published/m101-visual-v2/manifest.json', import.meta.url);
const data = await fs.readFile(source);
const current = await fs.readFile(target).catch(() => null);
if (current?.equals(data)) {
  console.log('Manifiesto curado ya sincronizado');
} else {
  await fs.mkdir(new URL('.', target), { recursive: true });
  await fs.writeFile(target, data);
  console.log('Manifiesto curado sincronizado en data/published/');
}
