/* Pure location matching. Never uses profile bios, language or inferred nationality. */
(() => {
  const countries=globalThis.XLCountries, byCode=new Map(countries.map(c=>[c.code,c]));
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,' and ').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  const names=new Map(); for(const c of countries) for(const n of [...c.aliases,c.code,c.iso2]) names.set(norm(n),c.code);
  const extra={'United States of America':'USA','UK':'GBR','South Korea':'KOR','North Korea':'PRK','Ivory Coast':'CIV','Czech Republic':'CZE','Türkiye':'TUR','Turkey':'TUR','Hong Kong SAR':'HKG','Russian Federation':'RUS','Palestinian Territories':'PSE','Vatican City':'VAT','Congo - Kinshasa':'COD','Congo - Brazzaville':'COG'};
  for(const [n,c] of Object.entries(extra)) names.set(norm(n),c);
  // Broad X regions are handled as sets, never converted into a guessed country.
  const regions=new Map();
  for(const c of countries) for(const r of [c.region,c.subregion].filter(Boolean)){const k=norm(r); if(!regions.has(k))regions.set(k,[]);regions.get(k).push(c.code);}
  const alias={'South Asia':'Southern Asia','East Asia':'Eastern Asia','Southeast Asia':'South-Eastern Asia','South East Asia':'South-Eastern Asia','West Asia':'Western Asia','North Africa':'Northern Africa','East Africa':'Eastern Africa','West Africa':'Western Africa','Central Africa':'Middle Africa','Central America':'Central America'};
  for(const [a,r] of Object.entries(alias))if(regions.has(norm(r)))regions.set(norm(a),regions.get(norm(r)));
  regions.set('americas',countries.filter(c=>/America$/.test(c.region)).map(c=>c.code));
  const eu='AUT BEL BGR HRV CYP CZE DNK EST FIN FRA DEU GRC HUN IRL ITA LVA LTU LUX MLT NLD POL PRT ROU SVK SVN ESP SWE'.split(' ');
  regions.set('european union',eu); regions.set('eu',eu);
  const defaults=()=>({enabled:true,blocked:countries.filter(c=>['Africa','South America'].includes(c.region)||['IND','PAK'].includes(c.code)).map(c=>c.code),mode:'hide',unknown:'show',regionPolicy:'all',badge:'both',allow:[],quotes:true,motion:true,preserveReposts:true,pauseUntil:0});
  function cleanSettings(s={}){const d=defaults();return {...d,enabled:typeof s.enabled==='boolean'?s.enabled:d.enabled,blocked:Array.isArray(s.blocked)?[...new Set(s.blocked.filter(c=>byCode.has(c)))]:d.blocked,mode:['hide','collapse','label'].includes(s.mode)?s.mode:d.mode,unknown:['show','hold'].includes(s.unknown)?s.unknown:d.unknown,regionPolicy:['all','any'].includes(s.regionPolicy)?s.regionPolicy:d.regionPolicy,badge:['both','code','name'].includes(s.badge)?s.badge:d.badge,allow:Array.isArray(s.allow)?[...new Set(s.allow.map(h=>String(h).replace(/^@/,'').toLowerCase()).filter(h=>/^[a-z0-9_]{1,15}$/.test(h)))].slice(0,1000):[],quotes:typeof s.quotes==='boolean'?s.quotes:d.quotes,motion:typeof s.motion==='boolean'?s.motion:d.motion,preserveReposts:typeof s.preserveReposts==='boolean'?s.preserveReposts:true,pauseUntil:Number.isFinite(s.pauseUntil)?Math.max(0,Math.min(s.pauseUntil,Date.now()+86400000)):0};}
  function locate(raw){const n=norm(raw);if(names.has(n))return {kind:'country',country:byCode.get(names.get(n)),raw};if(regions.has(n))return {kind:'region',codes:regions.get(n),raw};return {kind:'unknown',raw:typeof raw==='string'?raw:''};}
  function active(settings,now=Date.now()){return settings.enabled&&!(settings.pauseUntil>now);}
  function decide(record,settings,handle){if(!active(settings)||settings.allow.includes(String(handle).toLowerCase()))return {block:false,reason:'Allowed'};const l=locate(record?.raw),b=new Set(settings.blocked);if(l.kind==='country')return {block:b.has(l.country.code),reason:l.country.name};if(l.kind==='region'){const matches=l.codes.filter(c=>b.has(c)).length;return {block:settings.regionPolicy==='any'?matches>0:matches===l.codes.length,reason:l.raw,ambiguous:matches>0&&matches<l.codes.length};}return {block:settings.unknown==='hold',reason:record?.raw?`Unmapped X region: ${record.raw}`:record?'Location unavailable':'Location pending'};}
  const flag=iso=>String.fromCodePoint(...iso.toUpperCase().split('').map(c=>127397+c.charCodeAt(0)));
  function badge(record,style='both'){const l=locate(record?.raw);if(l.kind==='country')return style==='name'?l.country.name:style==='code'?l.country.code:`${flag(l.country.iso2)} ${l.country.code}`;return l.kind==='region'?`🌐 ${l.raw}`:record?.raw?`? ${record.raw}`:record?'? Unknown':'◌ Pending';}
  function fresh(r,now=Date.now()){return !!r&&Number.isFinite(r.checked)&&now-r.checked<(r.raw?7*86400000:6*3600000)&&now>=r.checked;}
  function cleanOverrides(value){const out=Object.create(null);if(!value||typeof value!=='object'||Array.isArray(value))return out;for(const [h,o] of Object.entries(value).slice(0,5000)){if(/^[a-z0-9_]{1,15}$/.test(h)&&o&&byCode.has(o.code))out[h]={code:o.code,checked:Number.isFinite(o.checked)?o.checked:Date.now()};}return out;}
  function effective(handle,cache,overrides){const o=Object.hasOwn(overrides||{},handle)?overrides[handle]:null,c=byCode.get(o?.code);return c?{raw:c.name,checked:o.checked,source:'manual'}:fresh(cache[handle])?cache[handle]:undefined;}
  function queueCandidates(candidates,cache,overrides){return [...new Set(candidates)].filter(h=>/^[a-z0-9_]{1,15}$/.test(h)&&!effective(h,cache,overrides)).slice(0,200);}
  function cleanProfiles(value){if(!Array.isArray(value))return [];return value.slice(0,20).filter(p=>p&&typeof p.id==='string'&&/^[a-zA-Z0-9_-]{1,50}$/.test(p.id)&&typeof p.name==='string'&&p.name.trim()).map(p=>({id:p.id,name:p.name.trim().slice(0,40),settings:{...cleanSettings(p.settings),pauseUntil:0}}));}
  const api={active,cleanProfiles,cleanOverrides,effective,queueCandidates,countries,byCode,norm,defaults,cleanSettings,locate,decide,flag,badge,fresh};globalThis.XL=api;
  if(typeof module!=='undefined')module.exports=api;
})();
