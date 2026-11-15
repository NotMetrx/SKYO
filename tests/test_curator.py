import importlib.util
import io
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

spec=importlib.util.spec_from_file_location('curator',Path(__file__).parents[1]/'backend/python/curate_irsa.py')
curator=importlib.util.module_from_spec(spec)
spec.loader.exec_module(curator)

URL='https://irsa.ipac.caltech.edu/ibe/data/spherex/dr1/level2/test.fits'
class Response(io.BytesIO):
    headers={}
    def geturl(self):return URL

class CuratorTests(unittest.TestCase):
    def test_retry_after_and_budget(self):
        elapsed=[0];calls=[]
        def opener(*args,**kwargs):
            calls.append(1)
            if len(calls)==1:raise HTTPError(URL,503,'Busy',{'Retry-After':'7'},None)
            return Response(b'SIMPLE  ='+b' '*2871)
        data=curator.download_bytes(URL,opener=opener,sleeper=lambda delay:elapsed.__setitem__(0,elapsed[0]+delay),clock=lambda:elapsed[0],deadline=20)
        self.assertEqual(elapsed[0],7);self.assertTrue(data.startswith(b'SIMPLE'))
        with self.assertRaisesRegex(Exception,'presupuesto'):
            curator.download_bytes(URL,opener=lambda *a,**k:(_ for _ in ()).throw(HTTPError(URL,429,'Busy',{'Retry-After':'100'},None)),sleeper=lambda delay:self.fail('No debe esperar fuera de presupuesto'),clock=lambda:0,deadline=20)
        attempts=[]
        def missing(*args,**kwargs):attempts.append(1);raise HTTPError(URL,404,'Missing',{},None)
        with self.assertRaises(HTTPError):curator.download_bytes(URL,opener=missing)
        self.assertEqual(len(attempts),1)
        attempts.clear();delays=[]
        def timeout(*args,**kwargs):attempts.append(1);raise TimeoutError('Read timeout')
        with self.assertRaises(TimeoutError):curator.download_bytes(URL,opener=timeout,sleeper=delays.append,clock=lambda:0,deadline=100)
        self.assertEqual(len(attempts),3);self.assertEqual(delays,[5,10])

    def test_query_status_and_limit(self):
        error=b'<VOTABLE><RESOURCE><INFO name="QUERY_STATUS" value="ERROR">Bad ADQL</INFO></RESOURCE></VOTABLE>'
        with self.assertRaisesRegex(ValueError,'Bad ADQL'):curator.parse_metadata(error,10)
        table=b'''<VOTABLE version="1.3" xmlns="http://www.ivoa.net/xml/VOTable/v1.3"><RESOURCE type="results"><INFO name="QUERY_STATUS" value="OK"/><TABLE><FIELD name="uri" datatype="char" arraysize="*"/><DATA><TABLEDATA><TR><TD>test</TD></TR></TABLEDATA></DATA></TABLE><INFO name="QUERY_STATUS" value="OVERFLOW"/></RESOURCE></VOTABLE>'''
        rows,truncated=curator.parse_metadata(table,10)
        self.assertEqual(rows[0]['uri'],'test');self.assertTrue(truncated)
        self.assertTrue(curator.parse_metadata(table.replace(b'OVERFLOW',b'OK'),1)[1])

    def test_url_and_download_limits(self):
        url=curator.cutout_url(URL+'?existing=1',210,54,.01)
        self.assertIn('existing=1&',url);self.assertEqual(url.count('?'),1)
        for bad in ['http://irsa.ipac.caltech.edu/a','https://evil.example/a','https://user:secret@irsa.ipac.caltech.edu/a']:
            with self.assertRaises(ValueError):curator.cutout_url(bad,210,54,.01)
        with self.assertRaisesRegex(ValueError,'límite'):
            curator.download_bytes(URL,opener=lambda *a,**k:Response(b'x'*100),max_bytes=50)

    def test_preserve_primary_times_epsf_flags_and_original(self):
        self.assert_preserved(451,'DR1')

    def test_qr3_and_epsf_441(self):
        self.assert_preserved(441,'QR3')

    def assert_preserved(self,epsf_rows,release):
        import numpy as np
        from astropy.io import fits
        primary=fits.PrimaryHDU();primary.header['VERSION']='test-v27'
        image=fits.ImageHDU(np.ones((3,3),dtype=np.float32),name='IMAGE')
        image.header.update({'DETECTOR':2,'BUNIT':'MJy / sr','DATE-OBS':'2025-05-10T17:04:37.741','MJD-AVG':60805.712214117,'FINAST':1})
        flags=fits.ImageHDU(np.full((3,3),2**31+3,dtype=np.uint32),name='FLAGS');flags.header['MSKN0031']='SATELLITE_HALO'
        epsf=fits.BinTableHDU.from_columns([fits.Column(name='model',format='E',array=np.zeros(epsf_rows))],name='EPSF')
        raw=io.BytesIO();fits.HDUList([primary,image,flags,fits.ImageHDU(np.ones((3,3)),name='VARIANCE'),epsf]).writeto(raw,checksum=True)
        url=URL.replace('/dr1/','/'+release.lower()+'/')
        row={'uri':url,'collection':'spherex_'+release.lower(),'observationid':'obs1','planeid':'plane1','obsid':'uuid1','time_bounds_lower':60805.71,'time_bounds_upper':60805.72,'provenance_version':'metadata-v27'}
        with tempfile.TemporaryDirectory() as temp:
            args=SimpleNamespace(ra=210,dec=54,detector=2,size_deg=.01)
            item=curator.curate_bytes(raw.getvalue(),row,args,Path(temp),url)
            with fits.open(Path(temp)/item['local_file']) as output:
                self.assertEqual(output[0].header['VERSION'],'test-v27')
                self.assertEqual(output['IMAGE'].header['DATE-OBS'],image.header['DATE-OBS'])
                self.assertEqual(int(output['FLAGS'].data[0,0]),2**31+3)
                self.assertEqual(len(output['EPSF'].data),epsf_rows)
            self.assertEqual((Path(temp)/item['original_file']).read_bytes(),raw.getvalue())
            self.assertEqual(item['source_release'],release);self.assertEqual(item['mjd_mid'],60805.712214117)
            self.assertEqual(item['processing_version'],'test-v27');self.assertEqual(item['epsf']['rows'],epsf_rows)
            self.assertIsNone(item['wavelength_um']);self.assertTrue(item['missing_reasons']['spectral_calibration'])

    def test_atomic_publish_and_partial(self):
        with tempfile.TemporaryDirectory() as temp:
            args=SimpleNamespace(output=Path(temp)/'dataset',ra=210,dec=54,detector=2,size_deg=.01,limit=10,max_files=2,min_gap_days=0,job_budget_seconds=30)
            rows=[{'uri':URL,'planeid':'p1','observationid':'o1','mjd':1},{'uri':URL,'planeid':'p2','observationid':'o2','mjd':2}]
            with patch.object(curator,'query_metadata',return_value=(rows,{'truncated':False})),patch.object(curator,'save_cutout',side_effect=[{'local_file':'test.fits'},ValueError('interrumpido')]):
                result=curator.curate(args)
            self.assertEqual(result['status'],'partial');self.assertEqual(len(result['errors']),1)
            previous=(args.output/'manifest.json').read_bytes()
            with self.assertRaises(FileExistsError):curator.curate(args)
            self.assertEqual((args.output/'manifest.json').read_bytes(),previous)
            args.output=Path(temp)/'new-dataset'
            with patch.object(curator,'query_metadata',return_value=(rows,{'truncated':False})),patch.object(curator,'save_cutout',side_effect=KeyboardInterrupt):
                with self.assertRaises(KeyboardInterrupt):curator.curate(args)
            self.assertFalse(args.output.exists());self.assertFalse(list(Path(temp).glob('.new-dataset-*')))

if __name__=='__main__':unittest.main()
