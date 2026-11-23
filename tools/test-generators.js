global.window={};const NB=window.NB={};const V={};NB.StepRenderer={register:(n,f)=>V[n]=f,html:s=>V[s.type](s.props)};
NB.QuestionGenerator={practice:(t)=>({a:47,b:6,key:'x'})};
require('../js/content/methods.js');require('../js/content/methods2.js');
const bad=[];
for(const id of ['add-1','add-2','add-3','ang-1','ang-2','ang-3','shp-1','shp-2','shp-3','mult-2','mult-3','div-1','div-2','div-3','alg-1','alg-2','alg-3','frac-1','frac-2','frac-3']){
 const M=NB.Methods[id];
 for(let t=0;t<3;t++)for(let i=0;i<2000;i++){
  const q=M.gen(t,[]);const S=M.build(q,'alone');
  const chk={'add-1':q.a+q.b,'add-2':q.a+q.b,'add-3':q.a-q.b}[id];
  if(chk!==undefined&&S.tot!==chk)bad.push(id+' tot');
  S.moves.forEach(m=>{if(!Number.isInteger(m.answer)||m.answer<0)bad.push(id+' move '+m.key+' '+m.answer)});
  // each row's [] count equals moves for that row
  S.rows.forEach(r=>{const n=(r.tpl.match(/\[\]/g)||[]).length,m=S.moves.filter(x=>x.row===r.id).length;if(n!==m)bad.push(id+' row '+r.id)});
  if(S.moves[S.moves.length-1].answer!==S.tot)bad.push(id+' final');
  if(/^ang-[23]/.test(id)&&(S.tot<=0||S.tot>=180&&id!=='ang-2'))bad.push(id+' range '+S.tot);
  try{const vals={};const c={vals};S.visual&&NB.StepRenderer.html(S.visual(c));S.moves.forEach(m=>vals[m.key]=m.answer);S.visual&&NB.StepRenderer.html(S.visual(c))}catch(e){bad.push(id+' vis '+e.message)}
 }
 // also the lesson examples
 const C=NB.Content[id];if(C){[C.handover.watch.q,C.handover.together.q].forEach(q=>{const S=M.build(q,'watch');if(!S.tot&&S.tot!==0)bad.push(id+' ex')})}
}
const u=[...new Set(bad)];console.log(u.length?u.slice(0,20):'ALL OK', bad.length);
console.log(u.length ? 'FAIL' : 'PASS');process.exit(u.length?1:0);
