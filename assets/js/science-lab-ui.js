import {mountLab} from './science/lab-ui.js';
let lab,callbacks={};
export function initScienceLab(options={}){
  callbacks=options;
  lab ||= mountLab({integrated:true,onNotify:message=>callbacks.onHeraNotify?.(message),onAdd:entry=>callbacks.onAddToBitacora?.(entry)});
}
