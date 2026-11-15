#!/usr/bin/env python3
"""Curación puntual DR1/QR3; conserva originales y todas las HDU, sin certificar ciencia."""
from __future__ import annotations
import argparse
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
import hashlib
from http.client import IncompleteRead
import io
import json
import math
import os
from pathlib import Path
import shutil
import socket
import tempfile
import time
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qsl, urlencode, urljoin, urlsplit, urlunsplit
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

VERSION='skyo-curator-0.2'
COLLECTIONS={'spherex_dr1':'DR1','spherex_qr3':'QR3'}

def parse_args():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--ra',type=float,required=True)
    p.add_argument('--dec',type=float,required=True)
    p.add_argument('--detector',type=int,choices=range(1,7),default=2)
    p.add_argument('--size-deg',type=float,default=.05)
    p.add_argument('--limit',type=int,default=200)
    p.add_argument('--max-files',type=int,default=4)
    p.add_argument('--min-gap-days',type=float,default=0,help='Filtro opcional, no criterio científico')
    p.add_argument('--job-budget-seconds',type=float,default=600)
    p.add_argument('--output',type=Path,default=Path('data/datasets/region01'))
    a=p.parse_args()
    if not 0<=a.ra<360 or not -90<=a.dec<=90 or not .005<=a.size_deg<=.25:p.error('Coordenadas/tamaño fuera de rango')
    if not 1<=a.limit<=200 or not 1<=a.max_files<=10:p.error('Límite fuera de rango')
    if not math.isfinite(a.min_gap_days) or a.min_gap_days<0 or not 0<a.job_budget_seconds<=3600:p.error('Presupuesto/gap fuera de rango')
    return a

def utc_now():return datetime.now(timezone.utc).isoformat().replace('+00:00','Z')
def digest(data):return hashlib.sha256(data).hexdigest()
def allowed_url(value):
    parts=urlsplit(value)
    if parts.scheme!='https' or parts.hostname!='irsa.ipac.caltech.edu' or parts.username or parts.password or parts.port not in (None,443):
        raise ValueError('Se requiere URL HTTPS de IRSA sin credenciales')
    return value

def cutout_url(uri,ra,dec,size):
    parts=urlsplit(allowed_url(urljoin('https://irsa.ipac.caltech.edu/',uri)))
    query=dict(parse_qsl(parts.query));query.update(center=f'{ra},{dec}d',size=str(size))
    return urlunsplit(parts._replace(query=urlencode(query),fragment=''))

def download_bytes(url,*,opener=None,sleeper=time.sleep,clock=time.monotonic,deadline=None,max_bytes=20*1024*1024):
    allowed_url(url);opener=opener or urlopen
    deadline=deadline if deadline is not None else clock()+240
    for attempt in range(3):
        remaining=deadline-clock()
        if remaining<=0:raise TimeoutError('Se agotó el presupuesto del job')
        try:
            with opener(Request(url,headers={'User-Agent':f'SKYO/{VERSION}'}),timeout=min(180,remaining)) as response:
                allowed_url(response.geturl())
                length=response.headers.get('Content-Length')
                if length is not None and int(length)>max_bytes:raise ValueError('Respuesta supera límite de bytes')
                chunks=[];total=0
                while True:
                    chunk=response.read(min(1024*1024,max_bytes+1-total))
                    if not chunk:break
                    total+=len(chunk)
                    if total>max_bytes:raise ValueError('Respuesta supera límite de bytes')
                    if clock()>deadline:raise TimeoutError('Se agotó el presupuesto del job')
                    chunks.append(chunk)
                if length is not None and total!=int(length):raise ConnectionError('Descarga interrumpida: tamaño distinto de Content-Length')
                return b''.join(chunks)
        except (HTTPError,URLError,TimeoutError,ConnectionError,socket.timeout,IncompleteRead) as error:
            if isinstance(error,HTTPError) and error.code not in (429,503):raise
            if attempt==2:raise
            header=error.headers.get('Retry-After') if isinstance(error,HTTPError) else None
            try:delay=max(0,float(header)) if header else 5*(attempt+1)
            except ValueError:delay=max(0,parsedate_to_datetime(header).timestamp()-time.time())
            if not math.isfinite(delay) or delay>=deadline-clock():
                raise TimeoutError(f'Reintento fuera del presupuesto; Retry-After={header}; recuperar en otro job') from error
            sleeper(delay)

def parse_metadata(data,limit):
    root=ET.fromstring(data)
    statuses=[(el.get('value','').upper(),el.text or '') for el in root.iter() if el.tag.rsplit('}',1)[-1]=='INFO' and el.get('name','').upper()=='QUERY_STATUS']
    if not statuses:raise ValueError('TAP no devolvió QUERY_STATUS')
    for status,message in statuses:
        if status not in ('OK','OVERFLOW'):raise ValueError(f'QUERY_STATUS={status}: {message}')
    from astropy.io.votable import parse_single_table
    table=parse_single_table(io.BytesIO(data)).to_table()
    rows=[]
    for row in table:
        item={}
        for key in table.colnames:
            value=row[key]
            if getattr(value,'mask',False):value=None
            elif hasattr(value,'item'):value=value.item()
            if isinstance(value,bytes):value=value.decode()
            if isinstance(value,float) and not math.isfinite(value):value=None
            item[key]=value
        rows.append(item)
    return rows,any(status=='OVERFLOW' for status,_ in statuses) or len(rows)>=limit

def query_metadata(a,deadline=None):
    query=f"""SELECT TOP {a.limit}
 ar.uri, ar.planeid, p.obsid, o.observationid, o.collection,
 p.time_bounds_lower, p.time_bounds_upper, p.energy_bandpassname, p.provenance_version
 FROM spherex.artifact ar JOIN spherex.plane p ON ar.planeid=p.planeid
 JOIN spherex.observation o ON o.obsid=p.obsid
 WHERE 1=CONTAINS(POINT('ICRS',{a.ra},{a.dec}),p.poly)
 AND p.energy_bandpassname='SPHEREx-D{a.detector}'
 AND o.collection IN ('spherex_dr1','spherex_qr3')
 ORDER BY p.time_bounds_lower, ar.planeid"""
    url='https://irsa.ipac.caltech.edu/TAP/sync?'+urlencode({'REQUEST':'doQuery','LANG':'ADQL','FORMAT':'votable','MAXREC':a.limit,'QUERY':query})
    raw=download_bytes(url,deadline=deadline,max_bytes=4*1024*1024)
    rows,truncated=parse_metadata(raw,a.limit)
    return rows,{'query':query,'url':url,'retrieved_utc':utc_now(),'response_sha256':digest(raw),'rows':len(rows),'truncated':truncated}

def curate_bytes(data,row,args,directory,url):
    import numpy as np
    import astropy.units as u
    from astropy.io import fits
    from astropy.wcs import WCS
    if not data.startswith(b'SIMPLE  =') or len(data)%2880:raise ValueError('Respuesta no es un FITS completo')
    release=COLLECTIONS.get(row.get('collection'))
    if not release or f'/spherex/{release.lower()}/' not in urlsplit(url).path:raise ValueError('Colección/release no verificados')
    with fits.open(io.BytesIO(data),memmap=False,checksum=True) as hdus:
        hdus.verify('exception')
        for hdu in hdus:
            if 'CHECKSUM' in hdu.header and hdu.verify_checksum()!=1:raise ValueError('CHECKSUM FITS inválido')
            if 'DATASUM' in hdu.header and hdu.verify_datasum()!=1:raise ValueError('DATASUM FITS inválido')
        image=hdus['IMAGE'];shape=image.data.shape
        if len(shape)!=2 or min(shape)<=0 or max(shape)>512:raise ValueError('ROI debe ser 2D y no superar 512 píxeles por eje')
        if int(image.header.get('DETECTOR',0))!=args.detector:raise ValueError('Detector distinto del solicitado')
        if 'FLAGS' not in hdus or 'VARIANCE' not in hdus:raise ValueError('Faltan FLAGS/VARIANCE')
        for name in ['FLAGS','VARIANCE','ZODI']:
            if name in hdus and hdus[name].data.shape!=shape:raise ValueError(f'Dimensiones incompatibles: {name}')
        spectral_reason=None;wavelength=None;bandwidth=None
        try:
            spatial=WCS(image.header);x,y=spatial.all_world2pix([[args.ra,args.dec]],0)[0]
            spectral_header=image.header.copy()
            for key in list(spectral_header):
                if key.startswith(('A_','B_','AP_','BP_')):del spectral_header[key]
            spectral=WCS(spectral_header,fobj=hdus,key='W');spectral.sip=None
            wave,band=spectral.pixel_to_world(x,y)
            wavelength,bandwidth=float(wave.to_value(u.um)),float(band.to_value(u.um))
            if not np.isfinite([wavelength,bandwidth]).all() or min(wavelength,bandwidth)<=0:raise ValueError('WCS-WAVE central inválido')
        except (KeyError,ValueError,TypeError) as error:
            wavelength=bandwidth=None;spectral_reason=f'Estimación visual ausente: {error}'
        original_hash=digest(data);original=Path('originals')/(original_hash+'.fits')
        (directory/original).parent.mkdir(exist_ok=True)
        (directory/original).write_bytes(data)
        copies=[]
        for hdu in hdus:
            if isinstance(hdu,fits.CompImageHDU):copies.append(fits.ImageHDU(data=hdu.data.copy(),header=hdu.header.copy(),name=hdu.name))
            else:copies.append(hdu.copy())
        copies[0].header.add_history(f'{VERSION}: preserve IMAGE/time; decompress tiled image HDUs')
        stream=io.BytesIO();fits.HDUList(copies).writeto(stream,checksum=True)
        derived=stream.getvalue();name=f'd{args.detector}-{digest(derived)[:24]}.fits'
        (directory/name).write_bytes(derived)
        def native(key):
            value=image.header.get(key,hdus[0].header.get(key))
            return value if value is None or isinstance(value,(str,bool,int)) or isinstance(value,float) and math.isfinite(value) else str(value)
        epsf=hdus['EPSF'] if 'EPSF' in hdus else None
        return {'local_file':name,'original_file':original.as_posix(),'source_url':url,'parent_mef_url':urlunsplit(urlsplit(url)._replace(query='')),
          'source_release':release,'collection':row['collection'],'observation_id':str(row['observationid']),'plane_id':str(row['planeid']),'obsid':str(row.get('obsid','')),
          'sha256':digest(derived),'source_sha256':original_hash,'parent_sha256':None,'bytes':len(derived),'retrieved_utc':utc_now(),
          'sourceKind':'NASA-DERIVED','curator_version':VERSION,'processing_version':str(hdus[0].header.get('VERSION')) if 'VERSION' in hdus[0].header else None,
          'metadata_processing_version':row.get('provenance_version'),'observation_utc':native('DATE-OBS') if native('TIMESYS')=='UTC' else None,
          'native_time_cards':{key:native(key) for key in ['DATE-OBS','MJD-OBS','MJD-BEG','MJD-END','MJD-AVG','TIMESYS','TIMEUNIT','TREFPOS']},
          'mjd':row.get('time_bounds_lower'),'mjd_start':native('MJD-BEG'),'mjd_end':native('MJD-END'),'mjd_mid':native('MJD-AVG'),'time_scale':native('TIMESYS'),
          'metadata_time_bounds':{'lower':row.get('time_bounds_lower'),'upper':row.get('time_bounds_upper')},'detector':args.detector,
          'ra_deg':args.ra,'dec_deg':args.dec,'size_deg':args.size_deg,'units':native('BUNIT'),'finast':native('FINAST'),
          'wavelength_um':wavelength,'bandwidth_um':bandwidth,'wavelength_quality':'center_only_from_WCS_WAVE' if wavelength else 'unavailable',
          'has_uncompressed_flags':True,'has_variance':True,'epsf':{'rows':len(epsf.data),'columns':list(epsf.columns.names)} if epsf is not None else None,
          'available_hdus':[hdu.name for hdu in hdus],'omitted_hdus':[],
          'transforms':[{'software':VERSION,'operation':'preserve all HDUs; decompress tiled image extensions; update checksums'}],
          'missing_reasons':{'parent_sha256':'MEF completo no descargado; source_sha256 identifica el recorte recibido.','spectral_calibration':spectral_reason or 'WCS-WAVE central visual; CWAVE/CBAND científicos no verificados.','time_scale':None if native('TIMESYS') else 'TIMESYS ausente; tiempo nativo conservado sin inferir una escala.','epsf':None if epsf is not None else 'EPSF ausente en el recorte; no se ha inventado un modelo.'}}

def save_cutout(row,args,directory,deadline):
    url=cutout_url(row['uri'],args.ra,args.dec,args.size_deg)
    return curate_bytes(download_bytes(url,deadline=deadline),row,args,directory,url)

def curate(args):
    if args.output.exists():raise FileExistsError('Dataset existente intacto; usa otro --output para una nueva versión')
    args.output.parent.mkdir(parents=True,exist_ok=True)
    staging=Path(tempfile.mkdtemp(prefix=f'.{args.output.name}-',dir=args.output.parent))
    deadline=time.monotonic()+args.job_budget_seconds
    try:
        rows,receipt=query_metadata(args,deadline)
        items=[];errors=[];excluded=[];seen=set()
        for row in rows:
            identity=(row.get('planeid'),row.get('uri'))
            if identity in seen:excluded.append({'identity':list(identity),'reason':'Producto duplicado'});continue
            seen.add(identity)
            if len(items)>=args.max_files:break
            try:
                mjd=row.get('time_bounds_lower',row.get('mjd'))
                if args.min_gap_days and mjd is not None and any(abs(mjd-item['mjd'])<args.min_gap_days for item in items if item.get('mjd') is not None):
                    excluded.append({'identity':list(identity),'reason':'Filtro opcional min-gap-days'});continue
                item=save_cutout(row,args,staging,deadline)
                item['dataset_id']=args.output.name;items.append(item)
            except Exception as error:errors.append({'identity':list(identity),'message':str(error),'type':type(error).__name__})
        status='failed' if not items else 'partial' if errors or receipt['truncated'] else 'complete'
        manifest={'schema_version':'skyo-curated-0.1','dataset_id':args.output.name,'profile':'visual','status':status,'created_utc':utc_now(),'curator_version':VERSION,
          'selection':{key:getattr(args,key) for key in ['ra','dec','detector','size_deg','limit','max_files','min_gap_days']},'query_receipt':receipt,'items':items,'errors':errors,'excluded':excluded,
          'warnings':['Candidatas descargadas; el orden no selecciona una pareja temporal compatible.','Procedencia declarada por este curador; un manifiesto manual no se autentica por su SHA.']}
        (staging/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2,allow_nan=False)+'\n')
        os.rename(staging,args.output)
        return manifest
    finally:
        if staging.exists():shutil.rmtree(staging)

def main():
    try:
        result=curate(parse_args());print(json.dumps({'status':result['status'],'files':len(result['items']),'errors':result['errors']},ensure_ascii=False))
        return {'complete':0,'partial':1,'failed':2}[result['status']]
    except Exception as error:
        print(json.dumps({'status':'failed','error':str(error)},ensure_ascii=False));return 2

if __name__=='__main__':raise SystemExit(main())
