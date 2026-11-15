//! Display-only FITS decoding. No WCS, masks or scientific calibration implied.
use std::collections::BTreeMap;
use std::sync::OnceLock;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct FitsTexture {
    pub width: u32,
    pub height: u32,
    pub detector: u32,
    pub low: f64,
    pub high: f64,
    rgba: Vec<u8>,
    pixels: Vec<f32>,
}

#[wasm_bindgen]
impl FitsTexture {
    pub fn rgba(&self) -> Vec<u8> { self.rgba.clone() }
    pub fn pixels(&self) -> Vec<f32> { self.pixels.clone() }
}

fn number(h: &BTreeMap<String, String>, key: &str, default: f64) -> Result<f64, String> {
    match h.get(key) {
        None => Ok(default),
        Some(v) => v.replace(['D', 'd'], "E").parse::<f64>()
            .ok().filter(|v| v.is_finite()).ok_or_else(|| format!("Invalid {key}")),
    }
}
fn integer(h: &BTreeMap<String, String>, key: &str, default: usize) -> Result<usize, String> {
    let n = number(h, key, default as f64)?;
    if n < 0. || n.fract() != 0. || n > 96_000_000. { return Err(format!("Invalid {key}")); }
    Ok(n as usize)
}
fn pad(n: usize) -> usize { n.div_ceil(2880) * 2880 }

// ZScale-style sampled line fit with iterative 2.5-sigma rejection, contrast 0.25.
// shortcut: excludes rejection growth used by IRAF, compare before scientific display matching.
fn limits(data: &[f64], zscale: bool) -> (f64, f64) {
    let stride = data.len().div_ceil(2000).max(1);
    let mut s: Vec<f64> = data.iter().step_by(stride).copied().filter(|v| v.is_finite()).collect();
    s.sort_by(f64::total_cmp);
    if s.is_empty() { return (0., 1.); }
    let n = s.len();
    if !zscale { return (s[(n-1)*2/100], s[(n-1)*995/1000]); }
    let mut good = vec![true; n];
    let mut slope = 0.;
    for _ in 0..5 {
        let count = good.iter().filter(|&&v| v).count();
        if count < 5.max(n / 2) { return (s[0], s[n-1]); }
        let (mut sx, mut sy, mut sxx, mut sxy) = (0., 0., 0., 0.);
        for (i, &y) in s.iter().enumerate().filter(|(i, _)| good[*i]) {
            let x = i as f64;
            sx += x; sy += y; sxx += x*x; sxy += x*y;
        }
        let c = count as f64;
        slope = (c*sxy - sx*sy) / (c*sxx - sx*sx);
        let intercept = (sy - slope*sx) / c;
        let sigma = (s.iter().enumerate().filter(|(i, _)| good[*i])
            .map(|(i, y)| (y-intercept-slope*i as f64).powi(2)).sum::<f64>() / c).sqrt();
        if sigma <= f64::EPSILON { break; }
        let mut changed = false;
        for i in 0..n {
            if good[i] && (s[i]-intercept-slope*i as f64).abs() > 2.5*sigma {
                good[i] = false; changed = true;
            }
        }
        if !changed { break; }
    }
    let mid = (n-1) as f64 / 2.;
    let median = (s[(n-1)/2] + s[n/2]) / 2.;
    ((median - mid*slope/0.25).max(s[0]), (median + mid*slope/0.25).min(s[n-1]))
}

fn decode(bytes: &[u8], zscale: bool) -> Result<FitsTexture, String> {
    if bytes.is_empty() || bytes.len() % 2880 != 0 || bytes.len() > 96_000_000 {
        return Err("Incomplete FITS or exceeds 96 MB display budget".into());
    }
    let mut offset = 0;
    let mut image = None;
    let mut detector = 0;
    let mut hdus = 0;
    while offset < bytes.len() {
        hdus += 1;
        if hdus > 64 { return Err("Too many HDUs".into()); }
        let start = offset;
        let mut h = BTreeMap::new();
        loop {
            let card = bytes.get(offset..offset+80).ok_or("Truncated header")?;
            if !card.is_ascii() { return Err("Non-ASCII header".into()); }
            let text = std::str::from_utf8(card).map_err(|_| "Non-ASCII header")?;
            offset += 80;
            let key = text.get(..8).ok_or("Invalid FITS card")?.trim();
            if key == "END" { break; }
            if offset-start > 184_320 { return Err("Header too large".into()); }
            if card[8] == b'=' {
                let value = text.get(10..).ok_or("Invalid FITS value")?.trim();
                let value = if let Some(quoted) = value.strip_prefix('\'') {
                    quoted.split('\'').next().unwrap_or("").trim()
                } else { value.split('/').next().unwrap_or("").trim() };
                h.insert(key.to_string(), value.to_string());
            }
        }
        if hdus == 1 && h.get("SIMPLE").map(String::as_str) != Some("T") { return Err("Missing SIMPLE".into()); }
        let end = start + pad(offset-start);
        let raw_bitpix = number(&h, "BITPIX", 0.)?;
        if raw_bitpix.fract() != 0. { return Err("Invalid BITPIX".into()); }
        let bitpix = raw_bitpix as i32;
        if ![8,16,32,64,-32,-64].contains(&bitpix) { return Err("Unsupported BITPIX".into()); }
        let axes = integer(&h, "NAXIS", 0)?;
        if axes > 6 { return Err("Invalid NAXIS".into()); }
        let mut dims = Vec::new();
        for axis in 1..=axes { dims.push(integer(&h, &format!("NAXIS{axis}"), 0)?); }
        let count = if axes == 0 { 0 } else { dims.iter().try_fold(1usize, |a, &b| a.checked_mul(b)).ok_or("Dimensions overflow")? };
        let pcount = integer(&h, "PCOUNT", 0)?;
        if integer(&h, "GCOUNT", 1)? != 1 { return Err("Random groups unsupported".into()); }
        let size = count.checked_add(pcount).and_then(|v| v.checked_mul(bitpix.unsigned_abs() as usize / 8)).ok_or("Size overflow")?;
        if size > bytes.len() || end.checked_add(pad(size)).filter(|&v| v <= bytes.len()).is_none() { return Err("Truncated HDU".into()); }
        let ext = h.get("XTENSION").map(String::as_str).unwrap_or("PRIMARY");
        if !["PRIMARY", "IMAGE", "BINTABLE", "TABLE"].contains(&ext) { return Err("Unsupported XTENSION".into()); }
        if ["PRIMARY", "IMAGE"].contains(&ext) && pcount != 0 { return Err("Image heap unsupported".into()); }
        let name = h.get("EXTNAME").map(String::as_str).unwrap_or(ext);
        let det = integer(&h, "DETECTOR", detector)?;
        if det > 6 { return Err("Invalid detector".into()); }
        detector = det;
        if ["PRIMARY", "IMAGE"].contains(&ext) && (name == "IMAGE" || (ext == "PRIMARY" && axes == 2)) {
            if axes != 2 || dims.contains(&0) || dims.iter().any(|&v| v > 2048) || count > 2048*2048 { return Err("Display supports at most 2048 x 2048".into()); }
            if image.is_some() && name == "IMAGE" { return Err("Duplicate IMAGE".into()); }
            let scale = number(&h, "BSCALE", 1.)?;
            let zero = number(&h, "BZERO", 0.)?;
            if scale == 0. { return Err("Invalid BSCALE".into()); }
            let blank = number(&h, "BLANK", f64::NAN)?;
            let step = bitpix.unsigned_abs() as usize / 8;
            let mut values = Vec::with_capacity(count);
            for chunk in bytes[end..end+size].chunks_exact(step) {
                let raw = match bitpix {
                    -32 => f32::from_be_bytes(chunk.try_into().unwrap()) as f64,
                    -64 => f64::from_be_bytes(chunk.try_into().unwrap()),
                    8 => chunk[0] as f64,
                    16 => i16::from_be_bytes(chunk.try_into().unwrap()) as f64,
                    32 => i32::from_be_bytes(chunk.try_into().unwrap()) as f64,
                    64 => { let v = i64::from_be_bytes(chunk.try_into().unwrap());
                        if v.unsigned_abs() > 9_007_199_254_740_991 { return Err("Integer precision exceeded".into()); } v as f64 },
                    _ => unreachable!(),
                };
                values.push(if bitpix > 0 && raw == blank { f64::NAN } else { raw*scale+zero });
            }
            image = Some((dims[0], dims[1], values));
        }
        offset = end + pad(size);
    }
    let (width, height, data) = image.ok_or("No uncompressed 2D IMAGE")?;
    Ok(render_plane(width as u32,height as u32,detector as u32,data,zscale))
}

struct Stretch { cuts:[f64;255], bins:[u8;4096], norm:f64 }
impl Stretch {
    fn new()->Self {
        let norm=10_f64.asinh();
        let cuts=std::array::from_fn(|i|(((i as f64+0.5)*norm/255.).sinh())/10.);
        let mut g=0;
        let bins=std::array::from_fn(|i|{let x=i as f64/4096.;while g<255&&x>=cuts[g]{g+=1;}g as u8});
        Self{cuts,bins,norm}
    }
    fn gray(&self,x:f64)->u8 {
        if x.is_nan()||x<=0. {return 0;}if x>=1. {return 255;}
        let mut g=self.bins[(x*4096.) as usize] as usize;
        if g<255&&x>=self.cuts[g]{g+=1;}
        // Resolve inverse-function rounding only at a quantization boundary.
        if (g>0&&(x-self.cuts[g-1]).abs()<1e-13)||(g<255&&(x-self.cuts[g]).abs()<1e-13){
            return (255.*(10.*x).asinh()/self.norm).round() as u8;
        }
        g as u8
    }
}
static STRETCH:OnceLock<Stretch>=OnceLock::new();

fn render_plane(width:u32,height:u32,detector:u32,data:Vec<f64>,zscale:bool)->FitsTexture {
    let (low, high) = limits(&data, zscale);
    let span = (high-low).max(1e-12);
    let mut rgba = Vec::with_capacity(data.len()*4);
    let stretch=STRETCH.get_or_init(Stretch::new);
    for &v in &data {
        let g = stretch.gray(((v-low)/span).clamp(0.,1.));
        rgba.extend_from_slice(&[g, g, g, if v.is_finite() { 255 } else { 0 }]);
    }
    FitsTexture { width, height, detector, low, high, rgba, pixels:data.into_iter().map(|v|v as f32).collect() }
}

#[wasm_bindgen]
pub fn float_plane_to_texture(bytes:&[u8],width:u32,height:u32,scale:f64,zero:f64,zscale:bool)->Result<FitsTexture,JsError>{
    decode_plane(bytes,width,height,scale,zero,zscale).map_err(|e|JsError::new(&e))
}
fn decode_plane(bytes:&[u8],width:u32,height:u32,scale:f64,zero:f64,zscale:bool)->Result<FitsTexture,String>{
    if width==0 || height==0 || width>2048 || height>2048 || bytes.len()!=width as usize*height as usize*4 || !scale.is_finite() || scale==0. || !zero.is_finite(){return Err("Invalid float32 plane".into());}
    let data=bytes.chunks_exact(4).map(|b|f32::from_be_bytes(b.try_into().unwrap()) as f64*scale+zero).collect();
    Ok(render_plane(width,height,0,data,zscale))
}

#[wasm_bindgen]
pub fn fits_to_texture(bytes: &[u8], zscale: bool) -> Result<FitsTexture, JsError> {
    decode(bytes, zscale).map_err(|e| JsError::new(&e))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn stretch_matches_reference_bytes_including_boundaries(){
        let s=Stretch::new();
        let reference=|x:f64|(255.*(10.*x.clamp(0.,1.)).asinh()/10_f64.asinh()).round() as u8;
        for i in 0..1_000_001 {let x=i as f64/1_000_000.;assert_eq!(s.gray(x),reference(x));}
        for cut in s.cuts {for dx in [-1e-12,-f64::EPSILON,0.,f64::EPSILON,1e-12]{assert_eq!(s.gray(cut+dx),reference(cut+dx));}}
        for x in [f64::NAN,f64::NEG_INFINITY,f64::INFINITY,-1.,2.]{assert_eq!(s.gray(x),reference(x));}
    }
    fn fixture() -> Vec<u8> {
        let mut b = vec![b' '; 2880];
        for (i, card) in ["SIMPLE  =                    T", "BITPIX  =                  -32", "NAXIS   =                    2", "NAXIS1  =                    2", "NAXIS2  =                    2", "DETECTOR=                    3", "END"].iter().enumerate() {
            b[i*80..i*80+card.len()].copy_from_slice(card.as_bytes());
        }
        for v in [0_f32, 1., 2., f32::NAN] { b.extend_from_slice(&v.to_be_bytes()); }
        b.resize(5760, 0); b
    }
    #[test]
    fn decodes_big_endian_asinh_and_nan() {
        let t = decode(&fixture(), false).unwrap();
        assert_eq!((t.width,t.height,t.detector), (2,2,3));
        assert_eq!(t.rgba.len(),16);
        assert_eq!(&t.rgba[0..4], &[0,0,0,255]);
        assert_eq!(t.rgba[15],0);
        assert!(t.rgba[8] >= t.rgba[4]);
    }
    #[test]
    fn rejects_truncation_and_abusive_dimensions() {
        let b = fixture();
        assert!(decode(&b[..b.len()-1],true).is_err());
        let mut b = fixture();
        b[3*80..4*80].fill(b' ');
        b[3*80..3*80+30].copy_from_slice(b"NAXIS1  =                 9999");
        assert!(decode(&b,true).is_err());
    }
    #[test]
    fn zscale_handles_constant_and_outliers() {
        assert_eq!(limits(&[3.;100],true),(3.,3.));
        let mut data: Vec<f64> = (0..1000).map(|i| i as f64).collect();
        data.push(1e12);
        let (lo,hi) = limits(&data,true);
        assert!(lo <= 500. && hi > lo && hi < 1e6);
    }
    #[test]
    fn raw_cube_plane_preserves_flux_scaling_and_nan(){
        let bytes:Vec<u8>=[1_f32,-2.,f32::NAN,5.].iter().flat_map(|v|v.to_be_bytes()).collect();
        let t=decode_plane(&bytes,2,2,2.,10.,true).unwrap();
        assert_eq!(t.pixels[0],12.);assert_eq!(t.pixels[1],6.);assert!(t.pixels[2].is_nan());
        assert!(decode_plane(&bytes,2049,2,1.,0.,true).is_err());assert!(decode_plane(&bytes,2,2,0.,0.,true).is_err());
    }
}
