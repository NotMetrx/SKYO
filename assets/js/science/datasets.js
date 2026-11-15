// Copia sincronizada del manifiesto publicado; Vite no permite importar desde public/.
import m101 from '../../../data/published/m101-visual-v2/manifest.json' with {type:'json'};
// Only this bundled manifest can establish NASA provenance; user manifests cannot.
export const CURATED_DATASETS=Object.freeze({'m101-visual-v2':m101});
export function curatedObservation(datasetId,digest){return (datasetId?[CURATED_DATASETS[datasetId]]:Object.values(CURATED_DATASETS)).filter(Boolean).flatMap(dataset=>dataset.items).find(item=>item.sha256===digest)??null;}
export function curatedRegion(a,b){
  const dataset=CURATED_DATASETS[a.datasetId];
  return dataset?.regions.find(region=>['A','B'].every((side,index)=>dataset.items.find(item=>item.local_file===region.files[side])?.sha256===[a,b][index].sha256))??null;
}
