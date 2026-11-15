import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const files=['AGENTS.md','MEMORY.md','docs/constitution.md','docs/SPEC_SKYO_2.1_AUDITADO.md','docs/specs/002-comparador-local/plan.md','docs/specs/002-comparador-local/tareas-plan.md','docs/specs/002-comparador-local/validacion.md','docs/pipelines/validacion-local.md'];
for(const file of files) assert.ok((await fs.readFile(new URL(file,root),'utf8')).trim(),file);
const pipeline=await fs.readFile(new URL('docs/pipelines/validacion-local.md',root),'utf8');
for(const heading of ['Objetivo','Entradas','Etapas y responsables','Comandos exactos','Artefactos de salida','Validación y criterio de éxito','Condiciones de parada y reintento','Siguiente paso']) assert.ok(pipeline.includes('## '+heading),heading);
assert.ok(pipeline.includes('002-comparador-local'));
const spec=await fs.readFile(new URL('docs/SPEC_SKYO_2.1_AUDITADO.md',root),'utf8');
for(let n=1;n<=20;n++) assert.ok(spec.includes('RF-'+String(n).padStart(2,'0')));
for(const file of files) {
  const url=new URL(file,root),text=await fs.readFile(url,'utf8');
  for(const match of text.matchAll(/\]\(([^\s)#]+)(?:#[^)]*)?\)/g)) {
    if(/^[a-z]+:/.test(match[1])||match[1].startsWith('/')) continue;
    await fs.access(new URL(match[1],url));
  }
}
const sha=createHash('sha256').update(spec).digest('hex');
console.log(`Documentos 002 verificados; SPEC SHA-256 ${sha}`);
