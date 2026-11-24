/* Leitor MIDI nativo do Laboratório Musical — SMF tipo 0/1. */
(function(){
'use strict';
const drumMap={35:'kick',36:'kick',37:'rim',38:'snare',39:'snare',40:'snare',42:'hh',44:'hhp',46:'hh',49:'ride',51:'ride',53:'ride',55:'ride',56:'cowbell',63:'conga',64:'conga',70:'shaker',75:'clave',76:'clave'};
function parse(input,name){
 const u=input instanceof Uint8Array?input:new Uint8Array(input),v=new DataView(u.buffer,u.byteOffset,u.byteLength);
 const str=(o,n)=>String.fromCharCode(...u.subarray(o,o+n)),u32=o=>v.getUint32(o,false),u16=o=>v.getUint16(o,false);
 if(u.length<14||str(0,4)!=='MThd')throw Error('Arquivo MIDI inválido.');
 const hs=u32(4),fmt=u16(8),nt=u16(10),div=u16(12);
 if(fmt>1)throw Error('MIDI tipo 2 não é suportado.');
 if(div&0x8000)throw Error('Divisão SMPTE não suportada.');
 const ppq=div||480;let p=8+hs,tempo=500000,num=4,den=4,max=0;const tracks=[];
 const vl=end=>{let x=0,b=0,n=0;do{if(p>=end||n++>4)throw Error('Evento MIDI truncado.');b=u[p++];x=(x<<7)|(b&127);}while(b&128);return x;};
 for(let ti=0;ti<nt&&p+8<=u.length;ti++){
  if(str(p,4)!=='MTrk')throw Error('Trilha MIDI inválida.');
  const end=p+8+u32(p+4);p+=8;let tick=0,run=0,tname='',ev=[],active=new Map();
  while(p<end){
   tick+=vl(end);if(p>=end)break;let st=u[p];if(st<128){if(!run)throw Error('Status MIDI ausente.');st=run;}else p++;
   if(st===255){run=0;const typ=u[p++],len=vl(end),at=p;p+=len;
    if(typ===3)tname=String.fromCharCode(...u.subarray(at,at+len)).replace(/\0/g,'').trim();
    if(typ===81&&len===3)tempo=(u[at]<<16)|(u[at+1]<<8)|u[at+2];
    if(typ===88&&len>=2){num=u[at];den=Math.pow(2,u[at+1]);}
    if(typ===47)break;continue;
   }
   if(st===240||st===247){run=0;p+=vl(end);continue;}
   const kind=st&240,ch=st&15;if(kind<128||kind>224)throw Error('Evento MIDI desconhecido.');run=st;
   const a=u[p++],b=(kind===192||kind===208)?0:u[p++];
   if(kind===144&&b){const key=ch+':'+a,q=active.get(key)||[];q.push({tick,note:a,velocity:b,channel:ch});active.set(key,q);}
   else if(kind===128||(kind===144&&!b)){const q=active.get(ch+':'+a);if(q&&q.length){const on=q.shift();ev.push({...on,end:Math.max(tick,on.tick+1)});}}
  }
  for(const q of active.values())for(const on of q)ev.push({...on,end:on.tick+Math.round(ppq*.25)});
  for(const e of ev)if(e.end>max)max=e.end;tracks.push({name:tname,events:ev});p=end;
 }
 const beats=num*4/den,barTicks=ppq*beats,count=Math.max(1,Math.ceil(max/barTicks)),bars=Array.from({length:Math.min(4,count)},()=>[]);
 for(const tr of tracks){if(!tr.events.length)continue;const nm=(tr.name||'').toLowerCase(),avg=tr.events.reduce((s,e)=>s+e.note,0)/tr.events.length;
  const isDr=tr.events.some(e=>e.channel===9)||/drum|bateria|percuss|kit/.test(nm),role=isDr?'drums':(/bass|baixo/.test(nm)||avg<46?'bass':'piano');
  for(const e of tr.events){const bi=Math.floor(e.tick/barTicks);if(bi>=bars.length)continue;const beat=(e.tick%barTicks)/ppq,len=Math.max(.08,Math.min(4,(e.end-e.tick)/ppq));
   if(role==='drums'){const inst=drumMap[e.note];if(inst)bars[bi].push({role,inst,beat,len,velocity:e.velocity/127,note:e.note});}
   else bars[bi].push({role,beat,len,velocity:e.velocity/127,note:e.note});
  }
 }
 bars.forEach(b=>b.sort((a,c)=>a.beat-c.beat));while(bars.length>1&&!bars[bars.length-1].length)bars.pop();if(!bars.some(b=>b.length))throw Error('O MIDI não contém notas utilizáveis.');
 return{name:(name||'Levada MIDI').replace(/\.(mid|midi)$/i,''),bpm:Math.max(30,Math.min(300,Math.round(60000000/tempo))),beats,bars,format:fmt,ppq,tracks:tracks.length};
}
window.LMMidiReader={parse};
})();