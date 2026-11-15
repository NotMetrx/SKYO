#!/usr/bin/env python3
"""Prepara dos ROI visuales de un par seleccionado; conserva referencias originales."""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import tempfile

import astropy.units as u
from astropy.io import fits
from astropy.wcs import WCS
import numpy as np
from curate_irsa import allowed_url


def spectral(hdus,x,y):
    header=hdus['IMAGE'].header.copy()
    for key in list(header):
        if key.startswith(('A_','B_','AP_','BP_')):del header[key]
    w=WCS(header,fobj=hdus,key='W');w.sip=None
    wave,band=w.pixel_to_world(x,y)
    return np.asarray(wave.to_value(u.um)),np.asarray(band.to_value(u.um))

def build(search_path,output):
    search=json.loads(search_path.read_text())
    if not search.get('pairs'):raise ValueError('Sin pareja candidata compatible')
    if output.exists():raise FileExistsError('Dataset existente intacto; usa otra versión')
    pair=search['pairs'][0];output.parent.mkdir(parents=True,exist_ok=True)
    if len(pair)!=2 or pair[0]['observation_id']==pair[1]['observation_id'] or pair[0]['mjd_mid']==pair[1]['mjd_mid']:raise ValueError('Se requieren dos observaciones/tiempos distintos')
    if pair[0]['observation_id'].rsplit('_',1)[0]==pair[1]['observation_id'].rsplit('_',1)[0]:raise ValueError('Mismo grupo de exposición; no es el par temporal seleccionado')
    staging=Path(tempfile.mkdtemp(prefix='.'+output.name+'-',dir=output.parent))
    opened=[]
    try:
        for item in pair:
            allowed_url(item['source_url']);directory=Path(item['directory'])
            for path,key in [(item['local_file'],'sha256'),(item['original_file'],'source_sha256')]:
                if hashlib.sha256((directory/path).read_bytes()).hexdigest()!=item[key]:raise ValueError('Hash de origen/curación inválido; no publicar paquete NASA')
            opened.append(fits.open(directory/item['local_file'],memmap=False))
        if opened[0]['IMAGE'].header.get('BUNIT')!=opened[1]['IMAGE'].header.get('BUNIT'):raise ValueError('Unidades incompatibles')
        a,b=opened;aw=WCS(a['IMAGE'].header);bw=WCS(b['IMAGE'].header)
        width=a['IMAGE'].data.shape[1];height=a['IMAGE'].data.shape[0]
        size=min(12,(width-2)//2,(height-2)//2)
        if size<6:raise ValueError('ROI de origen insuficiente para dos regiones')
        regions=[];items=[]
        for region,x,y in [('noroeste',1,1),('sureste',width-size-1,height-size-1)]:
            center=aw.all_pix2world([[x+(size-1)/2,y+(size-1)/2]],0)[0]
            bx,by=bw.all_world2pix([center],0)[0]
            origins=[(x,y),(round(bx-(size-1)/2),round(by-(size-1)/2))]
            region_items=[];cropped=[]
            for side,(source,meta,(x0,y0)) in enumerate(zip(opened,pair,origins)):
                if x0<0 or y0<0 or x0+size>source['IMAGE'].data.shape[1] or y0+size>source['IMAGE'].data.shape[0]:raise ValueError('ROI no cubierta en ambas épocas')
                layers=[]
                for hdu in source:
                    if hdu.name=='EPSF':continue
                    copy=hdu.copy()
                    if hdu.name in ['IMAGE','FLAGS','VARIANCE','ZODI']:
                        copy.data=hdu.data[y0:y0+size,x0:x0+size].copy()
                        for suffix in ['', 'W']:
                            for axis,delta in [(1,x0),(2,y0)]:
                                key=f'CRPIX{axis}{suffix}'
                                if key in copy.header:copy.header[key]-=delta
                    layers.append(copy)
                hdus=fits.HDUList(layers);hdus[0].header.add_history('SKYO visual ROI; EPSF omitted with original source reference')
                stream=io.BytesIO();hdus.writeto(stream,checksum=True);data=stream.getvalue();sha=hashlib.sha256(data).hexdigest()
                name=f'{region}-{chr(65+side)}-{sha[:16]}.fits';(staging/name).write_bytes(data)
                wave,band=spectral(hdus,(size-1)/2,(size-1)/2)
                item={key:value for key,value in meta.items() if key not in ['directory','original_file']}
                item.update(local_file=name,sha256=sha,bytes=len(data),dataset_id=output.name,ra_deg=float(center[0]),dec_deg=float(center[1]),wavelength_um=float(wave),bandwidth_um=float(band),available_hdus=[h.name for h in hdus],omitted_hdus=['EPSF'])
                item['transforms']=meta['transforms']+[{'software':'skyo-visual-dataset-0.1','operation':f'Crop origin={x0},{y0}; shape={size},{size}; update spatial/alternate CRPIX; input SHA256={meta["sha256"]}; omit EPSF, retain original URL/hash'}]
                item['missing_reasons']={**meta['missing_reasons'],'epsf':'Omitida del perfil visual; conservada en el original curado fuera de dist y recuperable por source_url/source_sha256.'}
                items.append(item);region_items.append(item);cropped.append(hdus)
            ca,cb=cropped;caw=WCS(ca['IMAGE'].header);cbw=WCS(cb['IMAGE'].header)
            yy,xx=np.mgrid[0:size,0:size];world=caw.all_pix2world(np.column_stack([xx.ravel(),yy.ravel()]),0);other=cbw.all_world2pix(world,0)
            la,ba=spectral(ca,xx.ravel(),yy.ravel());lb,bb=spectral(cb,other[:,0],other[:,1])
            spatial=(other[:,0]>=0)&(other[:,0]<size-1)&(other[:,1]>=0)&(other[:,1]<size-1)
            valid=spatial&np.isfinite(la)&np.isfinite(lb)&np.isfinite(ba)&np.isfinite(bb)&(ba>0)&(bb>0)
            compatible=valid&(np.abs(la-lb)<=.25*np.minimum(ba,bb))
            if not compatible.any():raise ValueError('Ningún píxel espectralmente compatible en la ROI')
            corners=caw.all_pix2world([[0,0],[size-1,0],[size-1,size-1],[0,size-1]],0).tolist()
            map_name=region+'-spectral-visual.json'
            (staging/map_name).write_text(json.dumps({'method':'Astropy alternate WCS-WAVE with SIP removed; visual only','scienceCalibrationVerified':False,'width':size,'height':size,'lambdaAUm':la.tolist(),'lambdaBUm':lb.tolist(),'bandwidthAUm':ba.tolist(),'bandwidthBUm':bb.tolist(),'spatialMask':spatial.astype(int).tolist(),'compatibleMask':compatible.astype(int).tolist()},allow_nan=False))
            regions.append({'id':region,'label':region.capitalize()+' de M101','files':{side:item['local_file'] for side,item in zip(['A','B'],region_items)},'observationIds':[item['observation_id'] for item in region_items],'epochGroups':[item['observation_id'].rsplit('_',1)[0] for item in region_items],'deltaDays':region_items[1]['mjd_mid']-region_items[0]['mjd_mid'],'footprintICRS':corners,'spectralMap':map_name,'spatialPixels':int(spatial.sum()),'spectralCompatiblePixels':int(compatible.sum()),'compatibleFractionOfOverlap':float(compatible.sum()/spatial.sum()),'thresholdPolicy':'Project preselection |lambdaA-lambdaB| <=0.25*min(bandwidth); not NASA science criterion','negativeControl':{'A':region_items[0]['local_file'],'B':region_items[0]['local_file']}})
        manifest={'schema_version':'skyo-curated-0.1','dataset_id':output.name,'profile':'visual','status':'complete','source':'NASA/IPAC IRSA SPHEREx DR1','regions':regions,'items':items,'warnings':['Dos subregiones del mismo campo M101, no dos blancos independientes.','No se garantiza movimiento ni variabilidad detectables.','WCS-WAVE visual; CWAVE/CBAND, PSF y significancia científica no verificados.','Consulta histórica con recibo; archivos descargados nuevamente y verificados.']}
        (staging/'manifest.json').write_text(json.dumps(manifest,indent=2,allow_nan=False)+'\n')
        (staging/'pair-selection.json').write_text(json.dumps({'regions':regions,'sourceSearch':str(search_path),'sourceSearchSha256':hashlib.sha256(search_path.read_bytes()).hexdigest(),'profile':'visual'},indent=2)+'\n')
        os.rename(staging,output)
        return manifest
    finally:
        for hdus in opened:hdus.close()
        if staging.exists():shutil.rmtree(staging)

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('search',type=Path);parser.add_argument('output',type=Path)
    args=parser.parse_args();manifest=build(args.search,args.output)
    print(json.dumps({'dataset':manifest['dataset_id'],'regions':[(r['id'],r['spatialPixels'],r['compatibleFractionOfOverlap']) for r in manifest['regions']],'bytes':sum(i['bytes'] for i in manifest['items'])}))
