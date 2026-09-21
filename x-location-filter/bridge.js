/* Runs only on x.com, in page context. Session headers stay in memory here.
   Only public AboutAccountQuery lookups are made. No arbitrary URL proxy. */
(() => {
  if(window.__atlasBridge)return;window.__atlasBridge=true;
  const channel='atlas-x-v1', nativeFetch=window.fetch, original={open:XMLHttpRequest.prototype.open,send:XMLHttpRequest.prototype.send,header:XMLHttpRequest.prototype.setRequestHeader};
  let endpoint='TzOG2twZEfhr9KmClvVVqA', auth={},active=false,last=0,enabled=false;
  const emit=(type,payload={})=>window.postMessage({channel,direction:'out',type,...payload},location.origin);
  const parseURL=value=>{try{const u=new URL(value,location.origin);return u.origin==='https://x.com'&&u.pathname.startsWith('/i/api/graphql/')?u:null;}catch{return null;}};
  const ready=()=>Boolean(auth.authorization&&auth['x-csrf-token']);
  function capture(headers){try{new Headers(headers).forEach((v,k)=>{if(['authorization','x-csrf-token','x-twitter-auth-type','x-twitter-active-user','x-twitter-client-language'].includes(k))auth[k]=v;});}catch{} }
  function observe(u,body){if(!u||!u.pathname.endsWith('/AboutAccountQuery'))return;try{const id=u.pathname.split('/').at(-2);if(/^[\w-]{8,80}$/.test(id)){endpoint=id;emit('endpoint',{id});}const handle=JSON.parse(u.searchParams.get('variables')||'{}').screenName?.toLowerCase();const p=body?.data?.user_result_by_screen_name?.result?.about_profile;if(/^[a-z0-9_]{1,15}$/.test(handle)&&p)emit('record',{handle,raw:typeof p.account_based_in==='string'?p.account_based_in:'',accurate:p.location_accurate});}catch{} }
  window.fetch=function(input,init){const u=parseURL(input instanceof Request?input.url:input);if(u){capture(input instanceof Request?input.headers:undefined);capture(init?.headers);}const p=nativeFetch.apply(this,arguments);if(u?.pathname.endsWith('/AboutAccountQuery'))p.then(r=>{if(r.ok)r.clone().json().then(b=>observe(u,b)).catch(()=>{});}).catch(()=>{});return p;};
  const xhrData=new WeakMap();
  XMLHttpRequest.prototype.open=function(method,url){xhrData.set(this,{u:parseURL(url),headers:{}});return original.open.apply(this,arguments);};
  XMLHttpRequest.prototype.setRequestHeader=function(k,v){const d=xhrData.get(this);if(d?.u)d.headers[k]=v;return original.header.apply(this,arguments);};
  XMLHttpRequest.prototype.send=function(){const d=xhrData.get(this);if(d?.u){capture(d.headers);if(d.u.pathname.endsWith('/AboutAccountQuery'))this.addEventListener('load',()=>{if(this.status===200)try{observe(d.u,this.responseType==='json'?this.response:JSON.parse(this.responseText));}catch{}},{once:true});}return original.send.apply(this,arguments);};
  window.addEventListener('message',async e=>{
    const m=e.data;if(e.source!==window||e.origin!==location.origin||m?.channel!==channel||m.direction!=='in')return;
    if(m.type==='configure'){enabled=m.enabled===true;if(/^[\w-]{8,80}$/.test(m.endpoint))endpoint=m.endpoint;emit('ready',{ready:ready()});return;}
    if(m.type==='ping'){emit('ready',{ready:ready()});return;}
    if(m.type!=='lookup'||!enabled||!/^[a-z0-9_]{1,15}$/.test(m.handle)||typeof m.requestId!=='string')return;
    const send=payload=>emit('result',{requestId:m.requestId,handle:m.handle,...payload});
    if(!ready()){send({error:'session'});return;}if(active||Date.now()-last<3000){send({error:'busy'});return;}
    active=true;last=Date.now();const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
    try{
      const u=new URL(`/i/api/graphql/${endpoint}/AboutAccountQuery`,location.origin);u.searchParams.set('variables',JSON.stringify({screenName:m.handle}));
      const r=await nativeFetch.call(window,u.href,{method:'GET',credentials:'same-origin',headers:{...auth,'content-type':'application/json'},signal:controller.signal});
      if(r.status===429){send({error:'rate'});return;}if([401,403].includes(r.status)){send({error:'session'});return;}if(!r.ok){send({error:'endpoint'});return;}
      const b=await r.json();if(b.errors?.some(x=>x.code===88)){send({error:'rate'});return;}
      const result=b.data?.user_result_by_screen_name?.result,p=result?.about_profile;
      if(p){send({raw:typeof p.account_based_in==='string'?p.account_based_in:'',accurate:p.location_accurate});}
      else if((result?.__typename==='User'&&!p)||b.errors?.some(e=>[50,63].includes(e.code))||result?.__typename==='UserUnavailable'||result?.__typename==='UserTombstone'||b.data?.user_result_by_screen_name===null){send({raw:''});}
      else send({error:'schema'});
    }catch{send({error:'network'});}finally{clearTimeout(timer);active=false;}
  });
})();
