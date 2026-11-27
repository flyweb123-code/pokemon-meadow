const fs=require('fs');const r=JSON.parse(fs.readFileSync(process.argv[2]))[0].results;const S=JSON.parse(r.map(x=>x.data).join(''));
const ps=S.box.filter(P=>P.sp===851);for(const P of ps){const m=(S.gym.mon||{})[P.id]||{};console.log('MY851',JSON.stringify({id:P.id,iv:P.iv,nat:P.nat,lv:m.lv,mnat:m.nat,ev:m.ev,evp:m.evp,fm:P.fm,it:m.it}));}
for(const b of (S.gym.blog||[])){console.log('BLOG',new Date(b.t+9*3600e3).toISOString(),b.v,b.foe,'won',b.won,'turns',b.turns);console.log(' my',JSON.stringify(b.my));console.log(' fo',JSON.stringify(b.fo));
 if(b.fo.some(f=>f[0]===473)||b.my.some(f=>f[0]===851)){console.log(b.log.slice(0,250).join('\n'));}}
