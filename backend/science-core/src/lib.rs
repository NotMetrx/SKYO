//! Kernel numerico WASM. No interpreta WCS ni emite descubrimientos.
//! Entrada B ya esta reproyectada al WCS de A por el worker.
use wasm_bindgen::prelude::*;
mod texture;
pub use texture::*;
mod healpix;
pub use healpix::*;

#[wasm_bindgen]
pub fn compare_flux(a: &[f32], b: &[f32], va: &[f32], vb: &[f32], valid: &[u8], offset: f64) -> Vec<f32> {
    let n = a.len();
    if n == 0 || b.len() != n || va.len() != n || vb.len() != n || valid.len() != n {
        return Vec::new();
    }
    let mut out = vec![f32::NAN; n * 2];
    for i in 0..n {
        if valid[i] == 0 || !a[i].is_finite() || !b[i].is_finite() { continue; }
        let difference = f64::from(a[i]) - f64::from(b[i]) - offset;
        out[i] = difference as f32;
        if va[i].is_finite() && vb[i].is_finite() && va[i] >= 0.0 && vb[i] >= 0.0 {
            let total_variance = f64::from(va[i]) + f64::from(vb[i]);
            if total_variance > 0.0 {
                out[n + i] = (difference / total_variance.sqrt()) as f32;
            }
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn subtracts_with_variance_and_mask() {
        let r=compare_flux(&[12.,10.], &[7.,4.], &[4.,4.], &[5.,5.], &[1,0], 2.);
        assert_eq!(r.len(),4);
        assert!((r[0]-3.).abs()<1e-6);
        assert!((r[2]-1.).abs()<1e-6);
        assert!(r[1].is_nan());
        assert!(r[3].is_nan());
    }
    #[test]
    fn preserves_offset_precision_and_large_finite_variance() {
        let precise=compare_flux(&[16_777_218.], &[0.], &[1.], &[1.], &[1], 16_777_217.);
        assert_eq!(precise[0],1.);
        let large=compare_flux(&[1e20], &[0.], &[3e38], &[3e38], &[1], 0.);
        assert!(large[1]>4. && large[1]<4.2);
    }
}
