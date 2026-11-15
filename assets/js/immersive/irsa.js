export async function queryObservations(ra,dec,channel,signal){
  if(!Number.isFinite(ra)||ra<0||ra>=360||!Number.isFinite(dec)||Math.abs(dec)>90||!Number.isInteger(channel)||channel<0||channel>101)throw Error('Consulta celeste inválida');
  const band=Math.floor(channel/17)+1;
  const query=`SELECT TOP 12 ar.uri,o.observationid,o.collection,p.time_bounds_lower,p.time_bounds_upper,p.energy_bandpassname FROM spherex.artifact ar JOIN spherex.plane p ON ar.planeid=p.planeid JOIN spherex.observation o ON o.obsid=p.obsid WHERE 1=CONTAINS(POINT('ICRS',${ra},${dec}),p.poly) AND p.energy_bandpassname='SPHEREx-D${band}' AND o.collection IN ('spherex_dr1','spherex_qr3') ORDER BY p.time_bounds_lower DESC`;
  const url=new URL('https://irsa.ipac.caltech.edu/TAP/sync');url.search=new URLSearchParams({REQUEST:'doQuery',LANG:'ADQL',FORMAT:'votable',MAXREC:'12',QUERY:query});
  const response=await fetch(url,{signal});if(!response.ok)throw Error(`IRSA HTTP${response.status}`);
  const text=await response.text();if(text.length>2_000_000)throw Error('Consulta IRSA supera presupuesto');
  const xml=new DOMParser().parseFromString(text,'application/xml');
  if(xml.querySelector('parsererror')||[...xml.querySelectorAll('INFO')].some(n=>n.getAttribute('name')==='QUERY_STATUS'&&n.getAttribute('value')==='ERROR'))throw Error('Consulta IRSA rechazada');
  const fields=[...xml.querySelectorAll('FIELD')].map(n=>n.getAttribute('name'));
  if(!['uri','observationid','collection','time_bounds_lower'].every(f=>fields.includes(f)))throw Error('Respuesta IRSA incompatible');
  return [...xml.querySelectorAll('TABLEDATA TR')].slice(0,12).map(row=>{const cells=[...row.querySelectorAll('TD')].map(n=>n.textContent);return Object.fromEntries(fields.map((f,i)=>[f,cells[i]]));}).filter(r=>/^ibe\/data\/spherex\/(dr1|qr3)\/level2\/[\w./-]+\.fits$/.test(r.uri)&&!r.uri.includes('..'));
}
