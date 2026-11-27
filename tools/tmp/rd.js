const fs=require('fs');const r=JSON.parse(fs.readFileSync(process.argv[2]))[0].results;const S=JSON.parse(r.map(x=>x.data).join(''));
const ps=S.box.filter(P=>P.sp===851);for(const P of ps){const m=(S.gym.mon||{})[P.id]||{};console.log('MY851',JSON.stringify({id:P.id,iv:P.iv,lv:m.lv,nat:m.nat,ev:m.ev,evp:m.evp,it:m.it}));}
const b=(S.gym.blog||[]).find(b=>b.fo.some(f=>f[0]===473));if(!b){console.log('NO473',(S.gym.blog||[]).map(b=>b.foe+' '+b.fo.map(f=>f[0])).join(' / '));process.exit();}
console.log('BLOG',new Date(b.t+9*3600e3).toISOString(),b.v,b.foe,'won',b.won,'turns',b.turns);console.log(' my',JSON.stringify(b.my));console.log(' fo',JSON.stringify(b.fo));
console.log(b.log.filter(l=>/^\|(switch|move|turn|-boost|-unboost|-status|-weather|-fieldstart|cant|-start|-enditem|-item|-ability|detailschange|faint)\|/.test(l)).join('\n'));
