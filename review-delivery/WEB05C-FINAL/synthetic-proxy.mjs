// Independent test harness only. Loopback-bound; never imported by src or shipped.
// Uses Claude's original synthetic Supabase server at127.0.0.1:54326.
import http from 'node:http';
let mode='wide';
http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://127.0.0.1:54325');
 if(req.method==='POST'&&u.pathname==='/__review_mode'){
  mode=u.searchParams.get('mode')??'wide';res.end(mode);return;
 }
 console.log('synthetic-only',mode,u.pathname,u.search);
 res.setHeader('content-type','application/json');
 if(mode==='error'){res.writeHead(500);res.end(JSON.stringify({message:'synthetic HTTP500',code:'XX000'}));return;}
 if(mode==='slow')await new Promise(r=>setTimeout(r,8000));
 if(mode==='empty'){res.end('[]');return;}
 try {
  const upstream=await fetch('http://127.0.0.1:54326'+u.pathname+u.search);
  const data=await upstream.json();
  if(mode==='wide'&&u.pathname==='/rest/v1/research'&&data[0]){
   data[0].published_at='2026-02-31T00:00:00Z';
   data[0].sections.push({id:'review-wide',heading:{ar:'جدول اصطناعي واسع للمراجعة',en:'Independent synthetic wide table'},body:{ar:'| البند | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | الوحدة | العملة |\n| بند اصطناعي | 100 | 110 | 120 | 130 | 140 | 150 | مليون | SAR |',en:'| Item | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | Unit | Currency |\n| Synthetic row | 100 | 110 | 120 | 130 | 140 | 150 | million | SAR |'}});
   data[0].sections.push({id:'review-malformed',heading:{ar:'جدول اصطناعي ناقص الرأس',en:'Synthetic malformed financial table'},body:{ar:'| البند | 2025 |\n| رقم اصطناعي | 100 | 999999 |',en:'| Item | 2025 |\n| Synthetic numeric row | 100 | 999999 |'}});
  }
  res.end(JSON.stringify(data));
 }catch{res.writeHead(500);res.end(JSON.stringify({message:'synthetic upstream failure'}));}
}).listen(54325,'127.0.0.1',()=>console.log('Independent SYNTHETIC loopback-only wrapper:54325'));
