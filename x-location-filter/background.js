importScripts('countries.js','core.js');
// Serialise local writes and rate-limit reservations across every X tab.
let chain=Promise.resolve();
const serial=fn=>{const p=chain.then(fn);chain=p.catch(()=>{});return p;};
chrome.runtime.onInstalled.addListener(async details=>{const {settings}=await chrome.storage.local.get('settings');if(!settings)await chrome.storage.local.set({settings:XL.defaults()});if(details.reason==='install')await chrome.runtime.openOptionsPage();});
chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
  const fromX=sender.tab&&sender.url?.startsWith('https://x.com/');
  const fromUI=!sender.tab&&sender.url?.startsWith(chrome.runtime.getURL('')) || sender.url?.startsWith(chrome.runtime.getURL(''));
  if(!fromX&&!fromUI)return;
  serial(async()=>{
    const now=Date.now();
    if(msg.type==='init'){const s=await chrome.storage.local.get(['settings','cache','endpoint','cooldown','overrides','profiles']);return {...s,settings:XL.cleanSettings(s.settings),cache:s.cache||{},overrides:XL.cleanOverrides(s.overrides),profiles:XL.cleanProfiles(s.profiles)};}
    if(msg.type==='options'){await chrome.runtime.openOptionsPage();return {ok:true};}
    if(msg.type==='reserve'){
      const s=await chrome.storage.local.get(['rateAt','cooldown','lease']);
      const until=Math.max(s.rateAt||0,s.cooldown||0,s.lease?.until||0);
      if(until>now)return {wait:until-now};
      const token=crypto.randomUUID();await chrome.storage.local.set({rateAt:now+3500,lease:{token,until:now+18000}});return {token};
    }
    if(msg.type==='release'){const {lease}=await chrome.storage.local.get('lease');if(lease?.token===msg.token)await chrome.storage.local.remove('lease');return {};}
    if(msg.type==='cooldown'){await chrome.storage.local.set({cooldown:now+15*60000});return {};}
    if(msg.type==='endpoint'&&/^[A-Za-z0-9_-]{8,80}$/.test(msg.id)){await chrome.storage.local.set({endpoint:msg.id});return {};}
    if(msg.type==='record'&&/^[a-z0-9_]{1,15}$/.test(msg.handle)&&typeof msg.raw==='string'&&msg.raw.length<=100){
      const {cache={}}=await chrome.storage.local.get('cache');cache[msg.handle]={raw:msg.raw,checked:now,accurate:typeof msg.accurate==='boolean'?msg.accurate:null};
      const entries=Object.entries(cache).filter(([,r])=>r&&Number.isFinite(r.checked)).sort((a,b)=>b[1].checked-a[1].checked).slice(0,5000);
      await chrome.storage.local.set({cache:Object.fromEntries(entries)});return {record:cache[msg.handle]};
    }
    if(msg.type==='status'&&fromX){await chrome.storage.session.set({['tab:'+sender.tab.id]:{...msg.status,time:now}});return {};}
    if(msg.type==='save'&&fromUI){const settings=XL.cleanSettings(msg.settings);await chrome.storage.local.set({settings});return {settings};}
    if(msg.type==='allow'&&fromX&&/^[a-z0-9_]{1,15}$/.test(msg.handle)){const s=await chrome.storage.local.get('settings');const settings=XL.cleanSettings(s.settings);settings.allow=[...new Set([...settings.allow,msg.handle])];await chrome.storage.local.set({settings});return {};}
    if(msg.type==='override'&&/^[a-z0-9_]{1,15}$/.test(msg.handle)&&(msg.code===null||XL.byCode.has(msg.code))){
      const s=await chrome.storage.local.get('overrides'),overrides=XL.cleanOverrides(s.overrides);
      if(msg.code===null)delete overrides[msg.handle];
      else {if(!Object.hasOwn(overrides,msg.handle)&&Object.keys(overrides).length>=5000)return {error:'Manual location limit reached. Remove an old entry first.'};overrides[msg.handle]={code:msg.code,checked:now};}
      await chrome.storage.local.set({overrides});return {overrides};
    }
    if(msg.type==='import'&&fromUI){const settings=XL.cleanSettings(msg.settings);const patch={settings};if(msg.overrides!==undefined)patch.overrides=XL.cleanOverrides(msg.overrides);if(msg.profiles!==undefined)patch.profiles=XL.cleanProfiles(msg.profiles);await chrome.storage.local.set(patch);return patch;}
    if(msg.type==='pause'&&[0,15,30,60].includes(msg.minutes)){const s=await chrome.storage.local.get('settings');const settings=XL.cleanSettings(s.settings);settings.pauseUntil=msg.minutes?now+msg.minutes*60000:0;await chrome.storage.local.set({settings});return {settings};}
    if(msg.type==='profile'&&fromUI){const s=await chrome.storage.local.get(['profiles','settings']);let profiles=XL.cleanProfiles(s.profiles);const settings=XL.cleanSettings(s.settings);
      if(msg.action==='save'&&typeof msg.name==='string'&&msg.name.trim()){const name=msg.name.trim().slice(0,40);const existing=profiles.find(p=>p.name.toLowerCase()===name.toLowerCase());if(!existing&&profiles.length>=20)return {error:'20 profiles maximum. Remove an old profile first.'};const profile={id:existing?.id||crypto.randomUUID(),name,settings:{...settings,pauseUntil:0}};profiles=profiles.filter(p=>p.id!==profile.id).concat(profile);await chrome.storage.local.set({profiles});return {profiles};}
      if(msg.action==='delete'){profiles=profiles.filter(p=>p.id!==msg.id);await chrome.storage.local.set({profiles});return {profiles};}
      if(msg.action==='apply'){const profile=profiles.find(p=>p.id===msg.id);if(!profile)return {error:'Profile not found'};const next={...profile.settings,enabled:settings.enabled,pauseUntil:settings.pauseUntil};await chrome.storage.local.set({settings:next});return {settings:next,profiles};}
    }
    if(msg.type==='clear'&&fromUI){await chrome.storage.local.set({cache:{}});return {};}
    return {error:'Unsupported message'};
  }).then(reply).catch(()=>reply({error:'Local storage unavailable'}));return true;
});
chrome.tabs.onRemoved.addListener(id=>chrome.storage.session.remove('tab:'+id));
