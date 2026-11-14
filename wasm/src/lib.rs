//! Kernel numerico WASM. No interpreta WCS ni emite descubrimientos.
//! Entrada B ya esta reproyectada al WCS de A por el worker.
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn compare_flux(a: &[f32], b: &[f32], va: &[f32], vb: &[f32], valid: &[u8], offset: f32) -> Vec<f32> {
    let n = a.len();
    if n == 0 || b.len() != n || va.len() != n || vb.len() != n || valid.len() != n {
        return Vec::new();
    }
    let mut out = vec![f32::NAN; n * 2];
    for i in 0..n {
        if valid[i] == 0 || !a[i].is_finite() || !b[i].is_finite() { continue; }
        let difference = a[i] - b[i] - offset;
        out[i] = difference;
        if va[i].is_finite() && vb[i].is_finite() && va[i] >= 0.0 && vb[i] >= 0.0 {
            let total_variance = va[i] + vb[i];
            if total_variance > 0.0 {
                out[n + i] = difference / total_variance.sqrt();
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
}
