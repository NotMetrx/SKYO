import {defineConfig} from 'vite';
export default defineConfig({base:'./',publicDir:'public',build:{target:'es2022',rollupOptions:{input:{main:'index.html',lab:'lab.html',contexto:'contexto.html',espectral:'espectral.html',inmersivo:'inmersivo.html'}}},worker:{format:'es'}});
