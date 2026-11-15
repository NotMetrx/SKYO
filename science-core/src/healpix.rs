//! Display geometry only: right-handed ICRS on a sphere, not physical distances.
use wasm_bindgen::prelude::*;

fn point(order:u32,pixel:u32,u:f64,v:f64)->[f64;3]{
    let n=1u32<<order;let area=n*n;let face=pixel/area;
    let mut bits=pixel%area;let(mut x,mut y)=(0,0);
    for i in 0..order{x|=(bits&1)<<i;bits>>=1;y|=(bits&1)<<i;bits>>=1;}
    let x=(x as f64+u)/n as f64;let y=(y as f64+v)/n as f64;
    let row=face/4;let ring=2.+row as f64-x-y;
    let k=if ring<1.{ring}else if ring>3.{4.-ring}else{1.};
    let z=if ring<1.{1.-k*k/3.}else if ring>3.{k*k/3.-1.}else{(2.-ring)*2./3.};
    let meridian=if row==1{2*(face%4)}else{2*(face%4)+1};
    let phi=(meridian as f64+if k>1e-14{(x-y)/k}else{0.})*std::f64::consts::FRAC_PI_4;
    let c=(1.-z*z).max(0.).sqrt();[-1000.*c*phi.sin(),1000.*z,-1000.*c*phi.cos()]
}

#[wasm_bindgen]
pub fn hips_vertices(order:u32,pixel:u32,steps:u32,radius:f64)->Vec<f32>{
    if order>5||pixel>=12*4u32.pow(order)||steps==0||steps>32||!radius.is_finite()||radius<=0.||radius>1000.{return Vec::new();}
    let mut out=Vec::with_capacity(((steps+1)*(steps+1)*3) as usize);
    let radius=radius/1000.;
    for j in 0..=steps{for i in 0..=steps{
        out.extend(point(order,pixel,1.-j as f64/steps as f64,i as f64/steps as f64).map(|v|(v*radius) as f32));
    }}out
}

#[wasm_bindgen]
pub fn sky_tiles(clip:&[f64],height:f64,fov:f64,max_order:u32,origin:&[f64])->Vec<u32>{
    if clip.len()!=16||!clip.iter().all(|v|v.is_finite())||!height.is_finite()||height<=0.||height>65536.||!fov.is_finite()||fov<=0.||fov>=180.||max_order>5||origin.len()!=3||!origin.iter().all(|v|v.is_finite()){return Vec::new();}
    let origin_distance=origin.iter().map(|v|v*v).sum::<f64>().sqrt();if origin_distance>=1000.{return Vec::new();}
    let mut planes=[[0.;4];6];
    for (i,axis) in [0,0,1,1,2,2].iter().enumerate(){
        let sign=if i%2==0{1.}else{-1.};
        for j in 0..4{planes[i][j]=clip[j*4+3]+sign*clip[j*4+axis];}
        let norm=(planes[i][0].powi(2)+planes[i][1].powi(2)+planes[i][2].powi(2)).sqrt();
        if norm<=f64::EPSILON{return Vec::new();}for v in &mut planes[i]{*v/=norm;}
    }
    struct View<'a>{planes:[[f64;4];6],origin:&'a [f64],nearest:f64,demand:f64,max:u32}
    fn visit(level:u32,pixel:u32,v:&View,out:&mut Vec<(u32,u32,[f64;3])>){
        let p=point(level,pixel,0.5,0.5);let radius=if level==0{901.}else{1100./(1u32<<level) as f64+1.};
        if v.planes.iter().any(|a|a[0]*p[0]+a[1]*p[1]+a[2]*p[2]+a[3]< -radius){return;}
        out.push((level,pixel,p));
        let distance=(0..3).map(|i|(p[i]-v.origin[i]).powi(2)).sum::<f64>().sqrt();
        let nearest=(distance-radius).max(v.nearest);
        if level<v.max&&((1u32<<level) as f64)<v.demand*1000./nearest{for i in 0..4{visit(level+1,pixel*4+i,v,out);}}
    }
    let v=View{planes,origin,nearest:1000.-origin_distance,demand:height*58.632301/(512.*fov),max:max_order};
    let mut tiles=Vec::new();for p in 0..12{visit(0,p,&v,&mut tiles);}
    let score=|p:[f64;3]|{let w=clip[3]*p[0]+clip[7]*p[1]+clip[11]*p[2]+clip[15];if w<=0.{f64::MAX}else{
        let x=clip[0]*p[0]+clip[4]*p[1]+clip[8]*p[2]+clip[12];let y=clip[1]*p[0]+clip[5]*p[1]+clip[9]*p[2]+clip[13];(x*x+y*y)/(w*w)
    }};
    tiles.sort_by(|a,b|a.0.cmp(&b.0).then(score(a.2).total_cmp(&score(b.2))).then(a.1.cmp(&b.1)));
    let mut out=Vec::with_capacity(tiles.len()*2+1);out.push(tiles.iter().map(|t|t.0).max().unwrap_or(0));
    for (level,pixel,_) in tiles{out.extend([level,pixel]);}out
}

#[cfg(test)]mod tests{
    use super::*;
    #[test]fn bounds_and_cardinal_geometry(){
        assert!(hips_vertices(6,0,8,1000.).is_empty());assert!(sky_tiles(&[0.;16],900.,70.,5,&[0.;3]).is_empty());
        for order in 0..=5{for pixel in 0..12*4u32.pow(order){
            let c=point(order,pixel,0.5,0.5);let r=if order==0{901.}else{1100./(1u32<<order) as f64+1.};
            for u in [0.,0.25,0.5,0.75,1.]{for v in [0.,0.25,0.5,0.75,1.]{let p=point(order,pixel,u,v);assert!((0..3).map(|i|(p[i]-c[i]).powi(2)).sum::<f64>().sqrt()<=r);}}
        }}
    }
}
