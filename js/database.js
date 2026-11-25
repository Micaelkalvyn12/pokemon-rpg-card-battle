import { DEFAULT_CARDS } from './data.js';

const DB_NAME = 'pokemon-rpg-card-battle';
const DB_VERSION = 1;
let dbPromise;

function openDB(){
  if(dbPromise) return dbPromise;
  dbPromise = new Promise((resolve,reject)=>{
    if(!('indexedDB' in window)){reject(new Error('Este navegador não oferece IndexedDB.'));return;}
    const request = indexedDB.open(DB_NAME,DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if(!db.objectStoreNames.contains('cards')) db.createObjectStore('cards',{keyPath:'id'});
      if(!db.objectStoreNames.contains('meta')) db.createObjectStore('meta',{keyPath:'key'});
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error || new Error('Não foi possível abrir o banco local.'));
  });
  return dbPromise;
}

async function transaction(store,mode,action){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(store,mode);
    const objectStore=tx.objectStore(store);
    let req;
    try{req=action(objectStore);}catch(error){reject(error);return;}
    if(req){req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);}
    else {tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error);}
  });
}

export async function getCards(){
  const cards=await transaction('cards','readonly',s=>s.getAll());
  return cards.sort((a,b)=>Number(a.id)-Number(b.id) || a.name.localeCompare(b.name,'pt-BR'));
}
export async function getCard(id){return transaction('cards','readonly',s=>s.get(String(id)));}
export async function saveCard(card){
  if(!card || !card.id || !card.name) throw new Error('Carta sem identificação ou nome.');
  const now=Date.now();
  const data={...card,id:String(card.id),updatedAt:now,createdAt:card.createdAt||now};
  await transaction('cards','readwrite',s=>s.put(data));
  return data;
}
export async function removeCard(id){return transaction('cards','readwrite',s=>s.delete(String(id)));}
export async function seedCards(){
  const marker = await transaction('meta','readonly',s=>s.get('seeded-default-cards'));
  const count = await transaction('cards','readonly',s=>s.count());

  // Primeira instalação: grava toda a biblioteca padrão.
  if(!marker && count===0){
    const db=await openDB();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(['cards','meta'],'readwrite');
      const store=tx.objectStore('cards');
      DEFAULT_CARDS.forEach(card=>store.put(card));
      tx.objectStore('meta').put({key:'seeded-default-cards',value:true});
      tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
    });
  } else if(!marker) {
    await transaction('meta','readwrite',s=>s.put({key:'seeded-default-cards',value:true}));
  }

  // Migração segura e repetível: garante as cartas padrão e repara índices
  // de arte ausentes mesmo em navegadores que já tenham um marcador antigo.
  // Não substitui imagens próprias nem atributos personalizados do jogador.
  const existing = await getCards();
  const byId = new Map(existing.map(card=>[String(card.id),card]));
  const legacyHp = {'4':58,'10':68,'18':61,'25':68,'41':63};
  const db=await openDB();
  await new Promise((resolve,reject)=>{
    const tx=db.transaction(['cards','meta'],'readwrite');
    const store=tx.objectStore('cards');
    DEFAULT_CARDS.forEach(def=>{
      const old=byId.get(String(def.id));
      if(!old){
        store.put(def);
        return;
      }
      const updated={...old};
      let changed=false;
      if(def.spriteIndex!==undefined && Number(updated.spriteIndex)!==Number(def.spriteIndex)){
        updated.spriteIndex=def.spriteIndex;
        changed=true;
      }
      // Corrige HP antigo somente quando ainda conserva o valor legado conhecido.
      if(legacyHp[String(def.id)]!==undefined && Number(updated.hp)===legacyHp[String(def.id)]){
        updated.hp=def.hp;
        changed=true;
      }
      if(String(def.id)==='22' && updated.name==='Starmie'){
        updated.name='Starmine';
        changed=true;
      }
      if(changed) store.put(updated);
    });
    tx.objectStore('meta').put({key:'pdf-card-art-v2',value:true});
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
  });
  return true;
}
export async function importCards(cards,{overwrite=false}={}){
  if(!Array.isArray(cards)) throw new Error('O arquivo não contém uma lista de cartas.');
  const existing=await getCards();
  const seen=new Set(existing.map(c=>String(c.id)));
  const valid=cards.filter(c=>c && c.name && Array.isArray(c.attacks) && c.attacks.length>=2 && Number(c.hp)>0);
  if(!valid.length) throw new Error('Nenhuma carta válida foi encontrada.');
  const db=await openDB();
  const added=[];const skipped=[];
  await new Promise((resolve,reject)=>{
    const tx=db.transaction('cards','readwrite');const store=tx.objectStore('cards');
    for(const original of valid){
      const card={...original,id:String(original.id || `custom-${Date.now()}-${Math.random().toString(36).slice(2,8)}`)};
      if(seen.has(card.id) && !overwrite){skipped.push(card.name);continue;}
      store.put({...card,updatedAt:Date.now()});seen.add(card.id);added.push(card.name);
    }
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
  });
  return {added,skipped,invalid:cards.length-valid.length};
}
export async function exportCards(){
  const cards=await getCards();
  const blob=new Blob([JSON.stringify({format:'pokemon-rpg-cards',version:1,exportedAt:new Date().toISOString(),cards},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='pokemon-rpg-cartas-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
  return cards.length;
}
