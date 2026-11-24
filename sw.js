/* Service worker do Laboratório Musical — cache offline.
   Ao publicar uma nova versão do index.html ou do banco, troque o número em VERSAO para os aparelhos atualizarem. */
const VERSAO='lm-v4';
const ARQUIVOS=['./index.html','./manifest.json','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./apple-touch-icon.png','./midi-reader.js','./APP%20(LEVADAS).mid','./rockblocks-beat.mid'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSAO).then(c=>c.addAll(ARQUIVOS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSAO).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);if(u.origin!==location.origin)return;
  if(r.mode==='navigate'){e.respondWith(caches.match('./index.html').then(c=>c||fetch(r)));return;}
  /* banco-enxuto.sf2 entra no cache no primeiro download e depois vem do aparelho */
  e.respondWith(caches.match(r).then(c=>c||fetch(r).then(res=>{if(res&&res.status===200){const cp=res.clone();caches.open(VERSAO).then(ch=>ch.put(r,cp));}return res;})));
});
