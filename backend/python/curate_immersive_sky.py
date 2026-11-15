"""Bounded copy of 12 real HiPS base tiles; no image manipulation or fake sky."""
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlopen

ROOT=Path(__file__).resolve().parents[2]
URL='https://irsa.ipac.caltech.edu/data/hips/SPHEREx/spherex_allsky_cube'
CHANNEL=62

def previous_manifest(path,properties):
    if not path.exists():
        return None
    previous=json.loads(path.read_text())
    for key in ['hips_release_date','hips_frame','hips_order','hips_tile_width','data_cube_crval3_arr']:
        if previous['properties'].get(key)!=properties.get(key):
            raise ValueError('HiPS edition changed: preserve this dataset and curate a new versioned directory')
    return previous

if __name__=='__main__':
    with urlopen(URL+'/properties',timeout=25) as r: raw=r.read(100000)
    properties=dict(line.split('=',1) for line in raw.decode().splitlines() if '=' in line and not line.startswith('#'))
    properties={k.strip():v.strip() for k,v in properties.items()}
    waves=list(map(float,properties['data_cube_crval3_arr'].split()))
    assert len(waves)==102 and properties['hips_frame']=='equatorial'
    target=ROOT/'frontend/public/datasets/immersive-sky';target.mkdir(parents=True,exist_ok=True)
    previous=previous_manifest(target/'manifest.json',properties)
    items=[];files={}
    for pixel in range(12):
        source=f'{URL}/Norder0/Dir0/Npix{pixel}/Npix{pixel}_{CHANNEL}.png'
        path=target/f'Npix{pixel}_{CHANNEL}.png'
        if not previous or not path.exists():
            with urlopen(source,timeout=25) as r: data=r.read(1_000_001)
            assert len(data)<=1_000_000 and data.startswith(b'\x89PNG\r\n\x1a\n')
        else:
            data=path.read_bytes()
            known=next((i for i in previous['items'] if i['file']==path.name),None)
            if not known or hashlib.sha256(data).hexdigest()!=known['sha256']:
                raise ValueError('Cached tile hash mismatch; originals are not overwritten')
        files[path]=data
        items.append(dict(pixel=pixel,file=path.name,source_url=source,bytes=len(data),sha256=hashlib.sha256(data).hexdigest()))
    result=dict(schema='skyo-immersive-hips-1',source_url=URL,properties=properties,channel=CHANNEL,wavelengths_um=waves,blank_channels=[50,51],items=items,retrieved_utc=datetime.now(timezone.utc).isoformat(),sourceKind='NASA-DERIVED',description='Unmodified IRSA visualization PNGs. Not calibrated flux and not individual epochs.')
    for path,data in files.items(): path.write_bytes(data)
    (target/'properties.txt').write_bytes(raw)
    (target/'manifest.json').write_text(json.dumps(result,indent=2)+'\n')
    print('12 real HiPS tiles preserved,',sum(i['bytes'] for i in items),'bytes')
