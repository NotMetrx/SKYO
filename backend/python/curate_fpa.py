"""Prepare six full-footprint display previews; keep downloaded MEFs untouched."""
import csv
import hashlib
import io
import json
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlopen

import numpy as np
from astropy.io import fits

ROOT = Path(__file__).resolve().parents[2]


def prepare(row):
    assert row['observationid'] == '2025W31_2A_0156_1', 'This curator is pinned to one exposure'
    detector = int(row['productid'][1:])
    url = 'https://irsa.ipac.caltech.edu/' + row['uri']
    cloud = url.replace('https://irsa.ipac.caltech.edu/ibe/data/spherex/',
                        'https://nasa-irsa-spherex.s3.us-east-1.amazonaws.com/')
    original = ROOT / f'data/fpa-originals/D{detector}.fits'
    original.parent.mkdir(parents=True, exist_ok=True)
    if not original.exists():
        with urlopen(cloud, timeout=120) as response:
            raw = response.read(90_000_001)
        if len(raw) > 90_000_000:
            raise ValueError('MEF exceeds download budget')
        with fits.open(io.BytesIO(raw)) as hdus:
            hdus.verify('exception')
        temporary = original.with_suffix('.tmp')
        temporary.write_bytes(raw)
        temporary.replace(original)
    raw = original.read_bytes()
    with fits.open(io.BytesIO(raw)) as hdus:
        image = hdus['IMAGE']
        data = image.data.astype(np.float64)
        height, width = data.shape
        assert height % 8 == 0 and width % 8 == 0
        blocks = data.reshape(height // 8, 8, width // 8, 8)
        finite = np.isfinite(blocks)
        total = np.where(finite, blocks, 0).sum(axis=(1, 3))
        count = finite.sum(axis=(1, 3))
        preview = np.divide(total, count, out=np.full_like(total, np.nan), where=count > 0)
        header = fits.Header()
        for key in ['DETECTOR', 'BUNIT', 'VERSION', 'DATE-OBS', 'MJD-OBS', 'TIMESYS']:
            value = image.header.get(key, hdus[0].header.get(key))
            if value is not None:
                header[key] = value
        header['DETECTOR'] = detector
        header['ORIGIN'] = 'SKYO display derivative from NASA/IPAC SPHEREx'
        header['HISTORY'] = 'Full IMAGE footprint, finite-only 8x8 block mean; no WCS or quality masking.'
        output = ROOT / f'frontend/public/datasets/fpa-dr1/D{detector}.fits'
        output.parent.mkdir(parents=True, exist_ok=True)
        fits.PrimaryHDU(preview.astype('float32'), header).writeto(output, overwrite=True)
        return dict(detector=detector, file=output.name, sha256=hashlib.sha256(output.read_bytes()).hexdigest(),
                    bytes=output.stat().st_size, source_url=url, cloud_url=cloud,
                    original_sha256=hashlib.sha256(raw).hexdigest(), original_bytes=len(raw),
                    observation_id=row['observationid'], observation_utc=header.get('DATE-OBS'),
                    processing_version=header.get('VERSION'), release='DR1', sourceKind='NASA-DERIVED',
                    original_shape=[height, width], display_shape=list(preview.shape),
                    transform='finite-only 8x8 block mean, full IMAGE footprint; no mask; no WCS',
                    units=header.get('BUNIT'), scienceReady=False)


if __name__ == '__main__':
    rows = list(csv.DictReader((ROOT / 'docs/evidence/investigacion-nasa-20261113/3iatlas-first-exposure-current-valid.csv').open()))
    assert sorted(row['productid'] for row in rows) == [f'D{i}' for i in range(1, 7)]
    with ThreadPoolExecutor(max_workers=3) as pool:
        items = list(pool.map(prepare, rows))
    manifest = dict(schema='skyo-fpa-display-1', retrieved_utc=datetime.now(timezone.utc).isoformat(),
                    description='Six detectors from one exposure; schematic arrangement, not a sky mosaic.', items=items)
    (ROOT / 'frontend/public/datasets/fpa-dr1/manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print('Prepared six real full-footprint previews; original MEFs preserved in data/fpa-originals/.')
