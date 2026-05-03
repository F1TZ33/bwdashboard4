(function(){
  const API = '/api/content';
  const WRITE_ROLES = ['editor','admin'];

  function localKey(key){ return 'bwRemoteCache::' + key; }
  function userRoles(){ return (window.BWUser && window.BWUser.userRoles ? window.BWUser.userRoles : []).map(r => String(r).toLowerCase()); }
  function canWrite(){ const roles=userRoles(); return roles.includes('admin') || roles.includes('editor'); }

  async function get(key, fallbackValue){
    try{
      const res = await fetch(API + '?key=' + encodeURIComponent(key), { cache:'no-store' });
      if(res.ok){
        const data = await res.json();
        if(data && data.value !== null && data.value !== undefined){
          try{ localStorage.setItem(localKey(key), JSON.stringify(data.value)); }catch(e){}
          return data.value;
        }
      }
    }catch(e){}
    try{
      const cached = localStorage.getItem(localKey(key));
      if(cached) return JSON.parse(cached);
    }catch(e){}
    return fallbackValue;
  }

  async function save(key, value){
    try{ localStorage.setItem(localKey(key), JSON.stringify(value)); }catch(e){}
    const res = await fetch(API, {
      method:'POST',
      headers:{ 'content-type':'application/json' },
      body: JSON.stringify({ key, value })
    });
    if(!res.ok){
      let detail='';
      try{ const body = await res.json(); detail = body.detail || body.error || JSON.stringify(body); }catch(e){}
      throw new Error(detail || ('Save failed: ' + res.status));
    }
    return await res.json();
  }

  async function remove(key){
    try{ localStorage.removeItem(localKey(key)); }catch(e){}
    const res = await fetch(API + '?key=' + encodeURIComponent(key), { method:'DELETE' });
    if(!res.ok){
      let detail='';
      try{ const body = await res.json(); detail = body.detail || body.error || JSON.stringify(body); }catch(e){}
      throw new Error(detail || ('Delete failed: ' + res.status));
    }
    return await res.json();
  }

  async function waitForUser(){
    if(window.BWUser !== undefined) return { user: window.BWUser, canEdit: window.BWCanEdit };
    return new Promise(resolve => {
      document.addEventListener('bw:user-ready', e => resolve(e.detail || {}), { once:true });
      setTimeout(() => resolve({ user: window.BWUser || null, canEdit: !!window.BWCanEdit }), 3000);
    });
  }

  window.BWContentStore = { get, save, remove, waitForUser, canWrite, WRITE_ROLES };
})();
