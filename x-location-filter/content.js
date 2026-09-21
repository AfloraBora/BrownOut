(() => {
  const channel='atlas-x-v1', send=async m=>{try{return await chrome.runtime.sendMessage(m);}catch{return {error:'Extension reloaded; refresh X'};}};
  const post=(type,data={})=>window.postMessage({channel,direction:'in',type,...data},location.origin);
  let settings=XL.defaults(),cache={},overrides={},initialized=false,sessionReady=false,busy=false,wakeAt=0,status='Connecting to X…',endpoint,scanTimer,widget,dialog,drawer,drawerOpen=false,lastDrawerKey="";
  const pending=new Map(),revealed=new Set(),articles=new WeakMap(),revealedQuotes=new Set(),filtered=new Map();
  const onFeed=()=>!/^\/(i\/(chat|grok)|messages|settings|compose)(\/|$)/.test(location.pathname);
  function applyFlags(){document.documentElement?.toggleAttribute('data-atlas-strict',initialized&&XL.active(settings)&&settings.unknown==='hold'&&settings.mode!=='label'&&onFeed());post('configure',{enabled:initialized&&XL.active(settings)&&onFeed(),endpoint});}
  function schedule(){clearTimeout(scanTimer);scanTimer=setTimeout(scan,140);}
  function handles(article){return [...article.querySelectorAll('[data-testid="User-Name"], [data-testid="UserName"]')].map(header=>{
    const a=[...header.querySelectorAll('a[href]')].find(a=>/^\/[A-Za-z0-9_]{1,15}$/.test(a.getAttribute('href')));
    const handle=(a?.getAttribute('href')?.slice(1)||header.textContent.match(/@([A-Za-z0-9_]{1,15})\b/)?.[1]||'').toLowerCase();return {header,handle};
  }).filter(x=>x.handle);}
  function identity(article,hs){const time=article.querySelector('time');const href=time?.closest('a')?.getAttribute('href');return (href||hs[0]?.handle||'unknown')+'|'+hs.map(h=>h.handle).join(',');}
  function el(tag,text,cls){const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;}
  function button(text,fn){const b=el('button',text);b.type='button';b.onclick=e=>{e.preventDefault();e.stopPropagation();fn();};return b;}
  function details(handle){dialog?.remove();dialog=el('dialog',null,'atlas-dialog');const native=cache[handle],r=XL.effective(handle,cache,overrides),manual=r?.source==='manual';
    dialog.setAttribute('aria-label','Brownout account location');
    dialog.append(el('small',manual?'✎ YOUR FIELD NOTES':'BROWNOUT · ACCOUNT LOCATION'),el('h2',XL.badge(r,'both')),el('p','@'+handle));
    dialog.append(el('p',manual?'Country set by you. This local override takes precedence over X.':native?.raw?`X reports: ${native.raw}`:'X has not provided a usable country or region yet.'));
    if(manual&&native?.raw)dialog.append(el('p',`X’s underlying value: ${native.raw}`));
    if(r)dialog.append(el('p',`${manual?'Your note saved':'Last checked'}: ${new Date(r.checked).toLocaleString()}`));
    if(!manual&&native?.accurate===false)dialog.append(el('p','X marks this location as potentially inaccurate.'));
    const form=el('form',null,'brownout-manual'),label=el('label','Know this account’s country?'),input=el('input'),list=el('datalist'),feedback=el('p',null,'brownout-feedback');
    input.id='brownout-country';input.setAttribute('list','brownout-countries');input.placeholder='Search a country or type its code';input.autocomplete='off';label.htmlFor=input.id;list.id='brownout-countries';
    for(const c of XL.countries){const option=el('option');option.value=`${c.name} (${c.code})`;list.append(option);}
    if(manual){const c=XL.byCode.get(overrides[handle].code);input.value=`${c.name} (${c.code})`;}
    const save=el('button','Save my location');save.type='submit';feedback.setAttribute('role','status');
    form.append(label,input,list,el('p','Stored only on this laptop. Marked ✎ on the badge; never presented as X’s data.','brownout-help'),save,feedback);
    form.onsubmit=async e=>{e.preventDefault();const code=input.value.match(/\(([A-Z]{3})\)$/)?.[1],location=XL.locate(input.value),country=XL.byCode.get(code)||location.country;if(!country){feedback.textContent='Choose a country from the list or enter its three-letter code.';return;}save.disabled=true;const result=await send({type:'override',handle,code:country.code});if(result.error){feedback.textContent=result.error;save.disabled=false;return;}overrides=XL.cleanOverrides(result.overrides);pending.delete(handle);schedule();dialog.close();};
    dialog.append(form);const actions=el('div',null,'atlas-actions');const link=el('a','View on X ↗');link.href=`https://x.com/${handle}/about`;link.target='_blank';link.rel='noopener noreferrer';
    actions.append(link,button('Always allow this account',async()=>{await send({type:'allow',handle});dialog.close();}));
    if(manual)actions.append(button('Remove my override',async()=>{const result=await send({type:'override',handle,code:null});if(result.error){feedback.textContent=result.error;return;}overrides=XL.cleanOverrides(result.overrides);schedule();details(handle);}));
    actions.append(button('Close',()=>dialog.close()));dialog.append(actions);document.body.append(dialog);dialog.showModal();
  }
  function remember(set,key){set.add(key);if(set.size>200)set.delete(set.values().next().value);}
  function sharer(article){const social=article.querySelector('[data-testid="socialContext"]');if(!social||!/reposted|retweeted/i.test(social.textContent))return null;const a=social.closest('a[href]')||social.querySelector('a[href]');const h=a?.getAttribute('href')?.match(/^\/([A-Za-z0-9_]{1,15})(?:\/)?$/)?.[1];return h?{handle:h.toLowerCase(),header:social}:null;}
  function quoteRoot(header,article){const root=header.closest('[data-testid="quoteTweet"], [role="link"]');return root&&root!==article&&article.contains(root)&&root.querySelectorAll('[data-testid="User-Name"], [data-testid="UserName"]').length===1?root:null;}
  function recordFiltered(key,data){filtered.delete(key);filtered.set(key,{...data,time:Date.now()});if(filtered.size>100)filtered.delete(filtered.keys().next().value);}
  function decorate(header,handle,active){const r=XL.effective(handle,cache,overrides);let badge=header.querySelector('.atlas-badge');if(!badge){badge=button('',()=>details(handle));badge.className='atlas-badge';header.append(badge);}badge.hidden=!active;const text=XL.badge(r,settings.badge)+(r?.source==='manual'?' ✎':'');if(badge.textContent!==text)badge.textContent=text;badge.classList.toggle('brownout-own',r?.source==='manual');const d=XL.decide(r,settings,handle);badge.classList.toggle('atlas-match',d.block&&!!r?.raw);badge.title=r?.source==='manual'?`Set by you: ${r.raw}. Click to edit or restore X’s value.`:r?.raw?`X reports ${r.raw}. Click for source and controls.`:r?'No location available from X.':'Waiting for X location lookup.';return {r,d};}
  function render(article,candidates=[]){const hs=handles(article),id=identity(article,hs);let state=articles.get(article);
    if(!state||state.id!==id){article.removeAttribute('data-atlas-reviewed');article.classList.remove('atlas-hidden','atlas-collapsed');article.querySelectorAll('.atlas-badge,.atlas-notice,.brownout-quote-notice').forEach(n=>n.remove());article.querySelectorAll('.brownout-quote-hidden').forEach(n=>n.classList.remove('brownout-quote-hidden'));state={id};articles.set(article,state);}
    const active=XL.active(settings)&&onFeed(),shared=settings.preserveReposts?sharer(article):null,box=article.getBoundingClientRect();let blocked=false,why='',unknown=false,quoteCount=0;
    const queue=(handle,r)=>{if(active&&!r&&box.top<innerHeight+1600&&box.bottom>-1600)candidates.push(handle);};
    for(const [index,{header,handle}] of hs.entries()){
      const {r,d}=decorate(header,handle,active);queue(handle,r);if(!r)unknown=true;
      if(index===0){if(!shared){blocked=d.block;why=d.reason;}continue;}
      // A quoted author can only collapse its own embedded card, never the poster.
      const root=quoteRoot(header,article),key=id+'::quote::'+handle;
      const collapse=active&&settings.quotes&&settings.mode!=='label'&&d.block&&!revealedQuotes.has(key)&&!revealed.has(id);
      if(root){root.classList.toggle('brownout-quote-hidden',collapse);let notice=root.nextElementSibling?.classList.contains('brownout-quote-notice')?root.nextElementSibling:null;
        if(collapse){quoteCount++;if(!notice){notice=el('div',null,'brownout-quote-notice');notice.append(el('span'),button('Show quote',()=>{remember(revealedQuotes,key);render(article);}));root.after(notice);}const text=`Quoted post filtered · ${d.reason}`;if(notice.firstChild.textContent!==text)notice.firstChild.textContent=text;recordFiltered(key,{id,handle,reason:d.reason,kind:'Quoted post',url:root.getAttribute('href')||article.querySelector('time')?.closest('a')?.getAttribute('href')});}else{notice?.remove();filtered.delete(key);}
      }
    }
    if(shared){const {r,d}=decorate(shared.header,shared.handle,active);queue(shared.handle,r);blocked=d.block;why='Shared by @'+shared.handle+' · '+d.reason;if(!r)unknown=true;}
    if(!hs.length&&settings.unknown==='hold'){blocked=true;why='Author could not be read';unknown=true;}
    blocked=active&&blocked&&settings.mode!=='label'&&!revealed.has(id);
    article.classList.toggle('atlas-hidden',blocked&&settings.mode==='hide');article.classList.toggle('atlas-collapsed',blocked&&settings.mode==='collapse');article.setAttribute('data-atlas-reviewed','');
    let notice=article.querySelector(':scope > .atlas-notice');if(blocked&&settings.mode==='collapse'){
      if(!notice){notice=el('div',null,'atlas-notice');notice.append(el('span'),button('Show once',()=>{remember(revealed,id);render(article);}));article.append(notice);}const text=`Brownout · ${why}`;if(notice.firstChild.textContent!==text)notice.firstChild.textContent=text;
    }else notice?.remove();
    if(blocked)recordFiltered(id,{id,handle:shared?.handle||hs[0]?.handle||'unknown',reason:why,kind:'Post',url:article.querySelector('time')?.closest('a')?.getAttribute('href')});else filtered.delete(id);
    return {blocked,quoteCount,unknown:active&&unknown};
  }
  function paintDrawer(){if(!drawerOpen)return;const loaded=new Set([...document.querySelectorAll('article[data-testid="tweet"]')].map(a=>articles.get(a)?.id));const key=JSON.stringify([...filtered].map(([k,v])=>[k,v.reason]))+'|'+settings.pauseUntil+'|'+settings.enabled+'|'+status+'|'+[...loaded].join(',');if(key===lastDrawerKey)return;lastDrawerKey=key;drawer.replaceChildren();
    const head=el('div',null,'brownout-drawer-head');head.append(el('strong','♜ Brownout'),button('Close',()=>toggleDrawer(false)));drawer.append(head,el('p',status,'brownout-drawer-status'));
    const actions=el('div',null,'atlas-actions');actions.append(button('Map & settings',()=>send({type:'options'})),button(settings.pauseUntil>Date.now()?'Resume now':'Pause 15 minutes',async()=>{await send({type:'pause',minutes:settings.pauseUntil>Date.now()?0:15});schedule();}));drawer.append(actions,el('h3','Filtered posts'),el('p','Last 100 matches in this tab. No post text is saved.','brownout-drawer-status'));
    if(!filtered.size)drawer.append(el('p','No filtered posts in this tab yet.'));
    for(const [key,r] of [...filtered].reverse()){const row=el('div',null,'brownout-review-row');row.append(el('strong','@'+r.handle),el('small',r.kind+' · '+r.reason));
      if(loaded.has(r.id))row.append(button('Show once',()=>{remember(revealed,r.id);if(r.kind==='Quoted post')remember(revealedQuotes,key);filtered.delete(key);lastDrawerKey='';schedule();paintDrawer();const a=[...document.querySelectorAll('article[data-testid="tweet"]')].find(a=>articles.get(a)?.id===r.id);if(a){render(a);a.scrollIntoView({block:'center',behavior:'smooth'});}}));
      if(r.url&&/^\/[A-Za-z0-9_]+\/status\/\d+/.test(r.url)){const a=el('a','Open source ↗');a.href='https://x.com'+r.url;a.target='_blank';a.rel='noopener noreferrer';row.append(a);}drawer.append(row);}
  }
  function toggleDrawer(open=!drawerOpen){drawerOpen=open;drawer.hidden=!open;widget.setAttribute('aria-expanded',String(open));if(open){lastDrawerKey='';paintDrawer();drawer.querySelector('button')?.focus();}else widget.focus();}
  async function scan(){if(!initialized||!document.body)return;applyFlags();let hidden=0,unknown=0,quotes=0;const candidates=[];
    for(const a of document.querySelectorAll('article[data-testid="tweet"]')){const r=render(a,candidates);hidden+=r.blocked?1:0;quotes+=r.quoteCount;unknown+=r.unknown?1:0;}
    pending.clear();for(const h of XL.queueCandidates(candidates,cache,overrides))pending.set(h,true);
    if(!widget){widget=button('♜',()=>toggleDrawer());widget.id='atlas-widget';widget.setAttribute('aria-label','Expand Brownout side tab');widget.setAttribute('aria-expanded','false');widget.setAttribute('aria-controls','brownout-drawer');drawer=el('aside',null,'brownout-drawer');drawer.id='brownout-drawer';drawer.hidden=true;drawer.setAttribute('aria-label','Brownout filtered-post drawer');drawer.addEventListener('keydown',e=>{if(e.key==='Escape')toggleDrawer(false);});document.body.append(widget,drawer);}
    widget.hidden=!onFeed();if(!onFeed()){drawer.hidden=true;drawerOpen=false;widget.setAttribute('aria-expanded','false');}
    widget.title=XL.active(settings)?`Brownout · ${hidden} posts and ${quotes} quotes filtered · ${unknown} pending`:'Brownout · Paused';paintDrawer();
    send({type:'status',status:{text:status,ready:sessionReady,hidden,quotes,pending:unknown,queued:pending.size,enabled:XL.active(settings)}});
  }
  async function run(){
    if(!initialized||busy||!XL.active(settings)||!onFeed()||document.hidden||Date.now()<wakeAt)return;
    if(!sessionReady){post('ping');return;}
    const handle=[...pending.keys()].find(h=>!XL.effective(h,cache,overrides));if(!handle)return;
    busy=true;const lease=await send({type:'reserve'});
    if(!lease?.token){busy=false;wakeAt=Date.now()+(lease?.wait||5000);return;}
    const requestId=crypto.randomUUID();let timer;
    const response=await new Promise(resolve=>{
      const listener=e=>{const m=e.data;if(e.source===window&&e.origin===location.origin&&m?.channel===channel&&m.direction==='out'&&m.type==='result'&&m.requestId===requestId){clearTimeout(timer);window.removeEventListener('message',listener);resolve(m);}};
      window.addEventListener('message',listener);timer=setTimeout(()=>{window.removeEventListener('message',listener);resolve({error:'timeout'});},15000);post('lookup',{handle,requestId});
    });
    await send({type:'release',token:lease.token});
    if(typeof response.raw==='string'){
      const result=await send({type:'record',handle,raw:response.raw.slice(0,100),accurate:response.accurate});if(result?.record)cache[handle]=result.record;pending.delete(handle);status='Connected · X account location';wakeAt=Date.now()+3500;
    }else{
      const messages={rate:'X rate limit · lookups paused for 15 minutes',session:'Waiting for X session · refresh X if this persists',endpoint:'X query changed · open any account’s About page to reconnect',schema:'X response changed · open an About page to reconnect',network:'Network unavailable · retrying in one minute',timeout:'X did not respond · retrying in one minute',busy:'Waiting for next lookup'};
      status=messages[response.error]||'Lookup paused';wakeAt=Date.now()+(response.error==='rate'?900000:response.error==='busy'?5000:60000);if(response.error==='rate')await send({type:'cooldown'});
    }
    busy=false;schedule();
  }
  window.addEventListener('message',async e=>{const m=e.data;if(e.source!==window||e.origin!==location.origin||m?.channel!==channel||m.direction!=='out')return;
    if(m.type==='ready'){const changed=sessionReady!==m.ready;sessionReady=m.ready===true;if(changed){if(sessionReady)status='Connected · X account location';schedule();}}
    if(m.type==='endpoint'&&/^[\w-]{8,80}$/.test(m.id)){endpoint=m.id;await send({type:'endpoint',id:m.id});wakeAt=0;}
    if(m.type==='record'&&/^[a-z0-9_]{1,15}$/.test(m.handle)&&typeof m.raw==='string'){await send({type:'record',handle:m.handle,raw:m.raw.slice(0,100),accurate:m.accurate});pending.delete(m.handle);wakeAt=0;status='Connected · X account location';schedule();}
  });
  chrome.storage.onChanged.addListener((changes,area)=>{if(area!=='local')return;if(changes.settings){settings=XL.cleanSettings(changes.settings.newValue);if(!XL.active(settings))pending.clear();}if(changes.overrides){overrides=XL.cleanOverrides(changes.overrides.newValue);}if(changes.cache){cache=changes.cache.newValue||{};}if(changes.endpoint){endpoint=changes.endpoint.newValue;wakeAt=0;}if(changes.cooldown)wakeAt=Math.max(wakeAt,changes.cooldown.newValue||0);schedule();});
  const observer=new MutationObserver(ms=>{if(ms.some(m=>!m.target.closest?.('#brownout-drawer,.atlas-dialog')&&[...m.addedNodes,...m.removedNodes].some(n=>n.nodeType===1&&!n.classList?.contains('atlas-badge')&&!n.classList?.contains('atlas-notice')&&!n.classList?.contains('brownout-quote-notice')&&n.id!=='atlas-widget'&&n.id!=='brownout-drawer')))schedule();});
  (async()=>{const s=await send({type:'init'});settings=XL.cleanSettings(s?.settings);cache=s?.cache||{};overrides=XL.cleanOverrides(s?.overrides);endpoint=s?.endpoint;initialized=true;wakeAt=s?.cooldown||0;applyFlags();observer.observe(document.documentElement,{childList:true,subtree:true});schedule();setInterval(run,1000);setInterval(()=>{pending.forEach((_,h)=>{if(XL.effective(h,cache,overrides))pending.delete(h);});schedule();},5000);})();
})();
