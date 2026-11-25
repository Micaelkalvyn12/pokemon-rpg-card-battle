import { seedCards, getCards, saveCard, removeCard, importCards, exportCards } from './database.js';
import { createMatch, currentPlayer, executeAttack, advanceTurn, livingOpponents, checkFinished } from './combat-system.js';
import { chooseAIMove } from './ai.js';
import { audio } from './audio.js';

const app=document.getElementById('app');
const modalRoot=document.getElementById('modal-root');
const toastRegion=document.getElementById('toast-region');
const ADMIN_PASSWORD='PokemonRPG'; // Barreira local de interface; não é autenticação segura para hospedagem pública.
const TYPES=['Normal','Fogo','Água','Elétrico','Planta','Gelo','Lutador','Veneno','Terra','Voador','Psíquico','Inseto','Pedra','Fantasma','Dragão','Sombrio','Aço','Fada'];
const state={view:'home',cards:[],setupMode:null,participants:[],selectionIndex:0,pendingCardId:null,match:null,selectedTargetId:null,turnMask:false,adminUnlocked:false,adminFormOpen:false,editingId:null,pendingImage:null,adminSearch:'',adminType:'',difficulty:'medio',sound:true,battleFx:null,victoryPlayed:false};

function esc(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

function toast(message,type=''){const el=document.createElement('div');el.className=`toast ${type}`;el.textContent=message;toastRegion.append(el);setTimeout(()=>el.remove(),3300);}
function typeClass(type=''){return String(type).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z]/g,'');}
function typeChips(card){return [card.type1,card.type2].filter(Boolean).map(t=>`<span class="type-chip ${typeClass(t)}">${esc(t)}</span>`).join('');}
function initials(name='?'){return esc(name.trim().split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase());}
function safeImage(card){return typeof card.image==='string' && /^data:image\/(png|jpeg|webp);base64,/i.test(card.image)?card.image:'';}
function spritePosition(card,battle=false){
  const index=Number(card.spriteIndex);
  if(!Number.isInteger(index)||index<0||index>56)return '';
  const col=index%7,row=Math.floor(index/7);
  return `background-position:${(col/6*100).toFixed(4)}% ${(row/8*100).toFixed(4)}%`;
}
function cardImage(card,large=false,battle=false){
  const image=safeImage(card);
  if(image)return `<img class="${battle?'battle-upload-image':'uploaded-card-image'}" src="${esc(image)}" alt="${esc(card.name)}">`;
  if(card.spriteIndex!==undefined&&spritePosition(card,battle))return `<div class="card-sprite ${battle?'battle-sprite':''} ${large?'large':''}" style="${spritePosition(card,battle)}" role="img" aria-label="${esc(card.name)}"></div>`;
  return `<span class="card-placeholder">${initials(card.name)}</span>`;
}
function findCard(id){return state.cards.find(c=>String(c.id)===String(id));}
function updateCards(){return getCards().then(cards=>{state.cards=cards;});}
function typeOptions(current=''){return `<option value="">Nenhum</option>`+TYPES.map(t=>`<option value="${t}" ${t===current?'selected':''}>${t}</option>`).join('');}
function render(){
  const views={home:renderHome,setup:renderSetup,selection:renderSelection,battle:renderBattle,admin:renderAdmin};
  app.innerHTML=(views[state.view]||renderHome)();
  audio.setScene(state.view==='battle'?'battle':'home');
  syncTeamRows();
}
function syncTeamRows(){
  const count=Number(document.getElementById('team-count')?.value||2);
  document.querySelectorAll('[data-team-row]').forEach(row=>{row.style.display=Number(row.dataset.teamRow)<count?'grid':'none';});
}
function renderHome(){return `
  <section class="hero">
    <div class="hero-copy">
      <span class="hero-kicker">✦ CARTAS · ESTRATÉGIA · BATALHAS POR TURNOS</span>
      <h1 class="hero-title">POKÉMON <span>RPG</span></h1>
      <p>Monte sua estratégia, escolha seu Pokémon e entre na arena. Batalhas locais, inteligência artificial e confrontos em equipe em uma única experiência de cartas.</p>
      <button class="btn btn-primary" data-action="start-setup" data-mode="1v1">COMEÇAR BATALHA <b>→</b></button>
    </div>
    <div class="hero-art" aria-hidden="true"><div class="hero-orb"></div></div>
  </section>
  <section class="mode-grid">
    <button class="mode-card" data-action="start-setup" data-mode="1v1"><span class="mode-icon">⚔</span><h3>1 VS 1</h3><p>Dois treinadores, dois Pokémon e uma batalha local por turnos no mesmo dispositivo.</p><span class="arrow">↗</span></button>
    <button class="mode-card" data-action="start-setup" data-mode="1vsIA"><span class="mode-icon">✧</span><h3>1 VS IA</h3><p>Enfrente a inteligência artificial e escolha entre três níveis de dificuldade.</p><span class="arrow">↗</span></button>
    <button class="mode-card" data-action="start-setup" data-mode="team"><span class="mode-icon">♟</span><h3>BATALHA EM EQUIPE</h3><p>Organize duas equipes de treinadores e enfrente uma batalha de até cinco participantes.</p><span class="arrow">↗</span></button>
  </section>
  <section class="panel home-bottom"><div><strong>✦ Biblioteca de cartas</strong><br><span>${state.cards.length} Pokémon disponíveis · imagens e atributos editáveis</span></div><div><button class="btn btn-secondary" data-action="open-admin">⚙ GERENCIAR CARTAS</button></div></section>
  `;}
function renderSetup(){
  const mode=state.setupMode;
  if(mode==='1v1') return `<div class="page-heading"><div><span class="eyebrow">CONFIGURAÇÃO DA PARTIDA</span><h1>DUELO 1 VS 1</h1><p>Defina os treinadores antes de escolher os Pokémon.</p></div><button class="btn btn-ghost" data-action="home">← Voltar</button></div>
  <section class="panel mode-panel"><h2>Dois treinadores, uma arena.</h2><div class="setup-steps"><span class="step-pill active">01 · JOGADORES</span><span class="step-pill">02 · POKÉMON</span><span class="step-pill">03 · BATALHA</span></div>
  <form id="setup-form"><div class="player-setup-grid"><div class="field"><label>Nome do jogador 1</label><input name="p1" maxlength="22" required value="Treinador 1" placeholder="Seu nome"></div><div class="field"><label>Nome do jogador 2</label><input name="p2" maxlength="22" required value="Treinador 2" placeholder="Nome do adversário"></div></div><div class="setup-actions"><button type="button" class="btn btn-ghost" data-action="home">Cancelar</button><button class="btn btn-primary" type="submit">ESCOLHER POKÉMON →</button></div></form></section>`;
  if(mode==='1vsIA') return `<div class="page-heading"><div><span class="eyebrow">CONFIGURAÇÃO DA PARTIDA</span><h1>DESAFIO VS IA</h1><p>Prepare seu treinador e escolha o nível de desafio.</p></div><button class="btn btn-ghost" data-action="home">← Voltar</button></div>
  <section class="panel mode-panel"><h2>Enfrente a inteligência artificial.</h2><div class="setup-steps"><span class="step-pill active">01 · JOGADOR</span><span class="step-pill">02 · POKÉMON</span><span class="step-pill">03 · BATALHA</span></div>
  <form id="setup-form"><div class="form-grid"><div class="field"><label>Seu nome</label><input name="p1" maxlength="22" required value="Treinador"></div><div class="field"><label>Dificuldade da IA</label><select name="difficulty"><option value="facil">Fácil — escolhas simples</option><option value="medio" selected>Médio — dano e efeitos</option><option value="dificil">Difícil — estratégia completa</option></select></div></div><div class="setup-actions"><button type="button" class="btn btn-ghost" data-action="home">Cancelar</button><button class="btn btn-primary" type="submit">ESCOLHER POKÉMON →</button></div></form></section>`;
  return `<div class="page-heading"><div><span class="eyebrow">CONFIGURAÇÃO DA PARTIDA</span><h1>BATALHA EM EQUIPE</h1><p>Monte duas equipes com 2 a 5 participantes no total. Cada treinador controla um Pokémon.</p></div><button class="btn btn-ghost" data-action="home">← Voltar</button></div>
  <section class="panel mode-panel"><h2>Monte as equipes.</h2><div class="setup-steps"><span class="step-pill active">01 · EQUIPES</span><span class="step-pill">02 · POKÉMON</span><span class="step-pill">03 · BATALHA</span></div>
  <form id="setup-form"><div class="field" style="max-width:220px;margin-bottom:16px"><label>Quantidade de participantes</label><select name="teamCount" id="team-count">${[2,3,4,5].map(n=>`<option value="${n}" ${n===2?'selected':''}>${n} participantes</option>`).join('')}</select></div><div class="team-setup-grid"><div class="team-column"><h3>◈ EQUIPE A</h3>${[0,2,4].map((i)=>`<div class="participant-row team-row-${i}" data-team-row="${i}"><input class="field-input" name="p${i}name" placeholder="Treinador ${i+1}" value="${i===0?'Treinador 1':`Treinador ${i+1}`}" maxlength="22"><select name="p${i}team"><option value="A" selected>Equipe A</option><option value="B">Equipe B</option></select></div>`).join('')}</div><div class="team-column b"><h3>◈ EQUIPE B</h3>${[1,3].map(i=>`<div class="participant-row team-row-${i}" data-team-row="${i}"><input name="p${i}name" placeholder="Treinador ${i+1}" value="${i===1?'Treinador 2':`Treinador ${i+1}`}" maxlength="22"><select name="p${i}team"><option value="B" selected>Equipe B</option><option value="A">Equipe A</option></select></div>`).join('')}</div></div><p class="admin-note">Você pode alterar a equipe de cada participante. É obrigatório ter pelo menos um treinador em cada lado.</p><div class="setup-actions"><button type="button" class="btn btn-ghost" data-action="home">Cancelar</button><button class="btn btn-primary" type="submit">ESCOLHER POKÉMON →</button></div></form></section>`;
}
function renderCard(card,selected=false,admin=false){
  const hasArtwork=Boolean(safeImage(card)||card.spriteIndex!==undefined);
  if(hasArtwork)return `<article class="pokemon-card artwork-card ${selected?'selected':''}" data-card-id="${esc(card.id)}" ${admin?'':'data-action="pick-card"'}>
    <div class="artwork-frame">${cardImage(card)}<span class="artwork-hp">♥ ${Number(card.hp)||0} HP</span></div>
    <div class="artwork-caption"><strong>${esc(card.name)}</strong><span>${typeChips(card)}</span></div>
    ${admin?`<div class="admin-card-actions"><button class="btn btn-secondary btn-small" data-action="edit-card" data-id="${esc(card.id)}">Editar</button><button class="btn btn-danger btn-small" data-action="delete-card" data-id="${esc(card.id)}">Excluir</button></div>`:''}
  </article>`;
  return `<article class="pokemon-card ${selected?'selected':''}" data-card-id="${esc(card.id)}" ${admin?'':'data-action="pick-card"'}>
    <div class="card-head"><span class="card-name">${esc(card.name)}</span><span class="card-no">#${esc(card.id)}</span></div>
    <div class="card-image">${cardImage(card)}</div><div class="type-row">${typeChips(card)}</div>
    <div class="card-stats"><span>♥ VIDA <b>${Number(card.hp)||0}</b></span><span>✦ MANA <b>20</b></span></div>
    <div class="card-attacks"><div class="attack-mini"><span>${esc(card.attacks?.[0]?.name||'Ataque 1')}</span><b>${Number(card.attacks?.[0]?.damage)||0} DMG</b></div><div class="attack-mini"><span>${esc(card.attacks?.[1]?.name||'Ataque 2')}</span><b>${Number(card.attacks?.[1]?.damage)||0} DMG</b></div></div>
    ${admin?`<div class="admin-card-actions"><button class="btn btn-secondary btn-small" data-action="edit-card" data-id="${esc(card.id)}">Editar</button><button class="btn btn-danger btn-small" data-action="delete-card" data-id="${esc(card.id)}">Excluir</button></div>`:''}
  </article>`;
}
function currentSelector(){return state.participants[state.selectionIndex];}
function renderSelection(){
  const participant=currentSelector();const chosen=state.pendingCardId?findCard(state.pendingCardId):null;
  const aiCount=state.participants.filter(p=>p.isAI).length;
  return `<div class="page-heading"><div><span class="eyebrow">ETAPA 02 · ESCOLHA DO TIME</span><h1>SELECIONE SEU POKÉMON</h1><p>${participant?`Vez de <b>${esc(participant.name)}</b> — Equipe ${participant.team}.`:'Todos os treinadores já escolheram.'} ${aiCount?'A IA receberá um Pokémon automaticamente.':''}</p></div><button class="btn btn-ghost" data-action="home">← Sair</button></div>
  <div class="selection-layout"><section><div class="filter-bar"><input id="selection-search" placeholder="Pesquisar Pokémon..." aria-label="Pesquisar Pokémon"><select id="selection-type"><option value="">Todos os tipos</option>${TYPES.map(t=>`<option>${t}</option>`).join('')}</select></div><div class="card-grid" id="selection-grid">${state.cards.map(c=>renderCard(c,chosen?.id===c.id)).join('')}</div></section>
  <aside class="panel selection-side"><span class="eyebrow">ESCOLHA ATUAL</span><h3>${participant?esc(participant.name):'Seleção concluída'}</h3><div class="selection-preview">${chosen?cardImage(chosen,true):'<span class="muted">Selecione uma carta</span>'}</div>${chosen?`<strong>${esc(chosen.name)}</strong><div class="type-row" style="padding:8px 0">${typeChips(chosen)}</div><div class="stat-line"><span>Vida máxima</span><b>${chosen.hp} HP</b></div><div class="attack-mini"><span>${esc(chosen.attacks[0].name)}</span><b>${chosen.attacks[0].damage}</b></div><div class="attack-mini"><span>${esc(chosen.attacks[1].name)}</span><b>${chosen.attacks[1].damage}</b></div>`:'<p class="select-hint">Clique em uma carta para ver os detalhes e confirmar sua escolha.</p>'}
  <button class="btn btn-primary" data-action="confirm-selection" ${!chosen||!participant?'disabled':''}>${state.selectionIndex>=state.participants.filter(p=>!p.isAI).length-1?'CONFIRMAR E INICIAR':'CONFIRMAR ESCOLHA'}</button><button class="btn btn-ghost" data-action="cancel-selection">Voltar</button><p class="select-hint">${state.selectionIndex+1} de ${state.participants.filter(p=>!p.isAI).length} escolhas humanas</p></aside></div>`;
}
function renderCombatant(player,enemy=false){
  const hpPct=Math.max(0,Math.min(100,player.hp/player.card.hp*100));const manaPct=Math.max(0,Math.min(100,player.mana/20*100));
  const effects=[...player.statuses.map(s=>({label:s.type==='poison'?'☠ Veneno':s.type==='burn'?'🔥 Queimadura':'⚡ Paralisia',cls:''})),...(player.shield?[{label:`🛡 Escudo ${player.shield}`,cls:'shield'}]:[]),...player.buffs.map(b=>({label:b.type==='reflect'?'↩ Reflexão':b.type==='reduce'?`🛡 Redução ${b.amount}`:b.type==='bonus'?`✦ +${b.amount} próximo golpe`:'Efeito',cls:'shield'}))];
  const fx=state.battleFx;
  const fxClass=fx?`${fx.attackerId===player.id?'fx-attacker':''} ${fx.targetId===player.id?'fx-target':''}`:'';
  return `<div class="combatant ${enemy?'enemy':''} ${player.id===state.match.currentPlayerId?'active':''} ${fxClass}"><div class="combatant-head"><div><strong>${esc(player.card.name)}</strong><small>${esc(player.name)} · EQUIPE ${player.team}</small></div><span class="tag">${player.fainted?'DERROTADO':player.isAI?'IA':'JOGADOR'}</span></div><div class="combat-art">${cardImage(player.card,true,true)}</div><div class="type-row" style="padding:0">${typeChips(player.card)}</div>
  <div class="stat-line"><span>VIDA</span><b>${player.hp} / ${player.card.hp}</b></div><div class="bar"><span class="hp-fill" style="width:${hpPct}%"></span></div>
  <div class="stat-line"><span>MANA</span><b>${player.mana} / 20</b></div><div class="bar"><span class="mana-fill" style="width:${manaPct}%"></span></div>
  ${effects.length?`<div class="effects-row">${effects.map(e=>`<span class="effect-pill ${e.cls}">${esc(e.label)}</span>`).join('')}</div>`:''}</div>`;
}
function renderTeamBoard(match){
  if(match.players.length<=2)return '';
  return `<div class="team-board"><div><h4>◈ EQUIPE A</h4>${match.players.filter(p=>p.team==='A').map(p=>`<div class="team-member ${p.fainted?'out':''}">${esc(p.name)} · ${esc(p.card.name)} — ${p.fainted?'Derrotado':`${p.hp} HP`}</div>`).join('')}</div><div><h4 style="color:#d4b1ff">◈ EQUIPE B</h4>${match.players.filter(p=>p.team==='B').map(p=>`<div class="team-member ${p.fainted?'out':''}">${esc(p.name)} · ${esc(p.card.name)} — ${p.fainted?'Derrotado':`${p.hp} HP`}</div>`).join('')}</div></div>`;
}
function renderBattle(){
  const match=state.match;if(!match)return renderHome();
  if(match.finished){if(!state.victoryPlayed){audio.play('victory');state.victoryPlayed=true;}const winner=match.players.find(p=>p.team===match.winnerTeam);const winners=match.players.filter(p=>p.team===match.winnerTeam);return `<section class="panel winner-panel"><div class="trophy">🏆</div><span class="eyebrow">FIM DE BATALHA</span><h2>${match.players.length===2?`VITÓRIA DE ${esc(winners[0]?.name||'TREINADOR')}`:`VITÓRIA DA EQUIPE ${match.winnerTeam}`}</h2><p class="muted">${winners.map(p=>esc(p.name)).join(', ')} venceu${winners.length>1?'ram':''} a partida!</p><div class="divider"></div><div class="team-board"><div><h4>RESULTADO</h4>${match.players.map(p=>`<div class="team-member">${esc(p.name)} · ${esc(p.card.name)}<br><span class="muted">${p.fainted?'Derrotado':`${p.hp} HP restantes`} · ${p.damageDealt} dano causado</span></div>`).join('')}</div><div><h4>RESUMO</h4><div class="team-member">Turnos realizados: ${match.turn}</div><div class="team-member">Registros de combate: ${match.log.length}</div><div class="team-member">Modo: ${match.mode==='1vsIA'?'1 VS IA':match.mode==='team'?'Batalha em equipe':'1 VS 1'}</div></div></div><div class="battle-actions" style="justify-content:center"><button class="btn btn-primary" data-action="replay">JOGAR NOVAMENTE</button><button class="btn btn-secondary" data-action="home">MENU INICIAL</button></div></section>`;}
  const player=currentPlayer(match);const opponents=livingOpponents(match,player);const target=opponents.find(p=>p.id===state.selectedTargetId)||opponents[0];if(target)state.selectedTargetId=target.id;
  const moves=player.card.attacks||[];
  const fx=state.battleFx;
  return `<div class="battle-top"><div><span class="eyebrow">ARENA DE BATALHA · TURNO ${match.turn}</span><h1 class="hero-title" style="font-size:39px;margin-top:5px">${match.mode==='team'?'BATALHA EM EQUIPE':match.mode==='1vsIA'?'DESAFIO VS IA':'DUELO 1 VS 1'}</h1></div><span class="battle-status">● TURNO DE ${esc(player.name).toUpperCase()}</span></div>
  <section class="battle-arena battle-stage ${fx?`fx-${esc(fx.kind)}`:''}"><div class="arena-lights"></div><div class="battlefield-title"><span>CAMPO DE BATALHA</span><b>TURNO ${match.turn}</b></div><div class="combatants">${renderCombatant(player,false)}${renderCombatant(target,true)}</div><div class="arena-vs">VS</div>${fx?`<div class="battle-fx-label">${esc(fx.label)}</div>`:''}</section>
  ${renderTeamBoard(match)}
  <section class="battle-lower"><div class="panel battle-controls"><span class="eyebrow">SUA JOGADA</span><h3>${esc(player.name)} — ${esc(player.card.name)}</h3><p>${player.isAI?'A inteligência artificial está escolhendo uma jogada.':'Escolha um ataque. Você pode executar um ataque por turno.'}</p>
    ${opponents.length>1?`<div class="field" style="margin-bottom:12px"><label>Escolher alvo</label><select id="target-select">${opponents.map(p=>`<option value="${p.id}" ${p.id===target?.id?'selected':''}>${esc(p.name)} — ${esc(p.card.name)} (${p.hp} HP)</option>`).join('')}</select></div>`:''}
    <div class="move-grid">${moves.map((m,i)=>`<button class="move-btn" data-action="attack" data-index="${i}" ${player.isAI||player.mana<m.cost?'disabled':''}><strong>${esc(m.name)}</strong><span class="move-meta"><b>⚔ ${m.damage} DANO</b><span>✦ ${m.cost} MANA</span></span><small>${esc(m.description||'Ataque Pokémon')}</small></button>`).join('')}</div>
    <div class="battle-actions"><button class="btn btn-ghost btn-small" data-action="surrender">Desistir</button><span class="select-hint">Mana disponível: ${player.mana}/20</span></div></div>
    <aside class="panel battle-log"><h3>📜 HISTÓRICO DA BATALHA</h3><div class="log-list">${match.log.slice(0,24).map(entry=>`<div class="log-entry ${entry.kind}">${esc(entry.message)}</div>`).join('')}</div></aside></section>
    ${state.turnMask?`<div class="turn-mask"><div class="panel turn-mask-card"><span class="eyebrow">PASSAGEM DE TURNO</span><h2>VEZ DE ${esc(player.name).toUpperCase()}</h2><p>Entregue o dispositivo para <b>${esc(player.name)}</b>. Quando estiver pronto, revele a batalha e faça sua jogada.</p><button class="btn btn-primary" data-action="turn-ready">ESTOU PRONTO →</button></div></div>`:''}`;
}
function renderAdminForm(card=null){
 const value=(key,def='')=>esc(card?.[key]??def);
 const atk=(i,key,def='')=>esc(card?.attacks?.[i]?.[key]??def);
 const image=state.pendingImage || card?.image || '';
 return `<form id="admin-card-form" class="panel admin-form"><h3>${card?'Editar Pokémon':'Adicionar novo Pokémon'}</h3><div class="form-grid">
  <div class="form-section-title">IDENTIFICAÇÃO</div>
  <div class="field"><label>Nome do Pokémon *</label><input name="name" required maxlength="32" value="${value('name')}" placeholder="Ex.: Gyarados"></div>
  <div class="field"><label>Vida máxima *</label><input type="number" name="hp" min="1" max="999" required value="${value('hp','70')}"></div>
  <div class="field"><label>Tipo primário *</label><select name="type1" required>${TYPES.map(t=>`<option ${t===value('type1','Normal')?'selected':''}>${t}</option>`).join('')}</select></div>
  <div class="field"><label>Tipo secundário</label><select name="type2">${typeOptions(value('type2'))}</select></div>
  <div class="field full"><label>Imagem da carta</label><div class="upload-box"><input type="file" id="image-upload" accept="image/png,image/jpeg,image/webp"><small>PNG, JPG, JPEG ou WEBP. A imagem ficará salva no navegador.</small><div class="upload-preview" id="upload-preview">${image?`<img src="${esc(image)}" alt="Prévia da carta">`:card?cardImage(card,true):'Prévia da imagem aparecerá aqui'}</div></div></div>
  <div class="form-section-title">ATRIBUTOS EDITÁVEIS DO JOGO</div>
  <div class="field"><label>Ataque físico</label><input type="number" name="atk" min="0" max="999" value="${value('atk','60')}"></div>
  <div class="field"><label>Defesa física</label><input type="number" name="def" min="0" max="999" value="${value('def','60')}"></div>
  <div class="field"><label>Ataque especial</label><input type="number" name="spAtk" min="0" max="999" value="${value('spAtk','60')}"></div>
  <div class="field"><label>Defesa especial</label><input type="number" name="spDef" min="0" max="999" value="${value('spDef','60')}"></div>
  <div class="form-section-title">ATAQUE 1</div>
  <div class="field"><label>Nome do ataque *</label><input name="a1name" required value="${atk(0,'name','Ataque 1')}"></div>
  <div class="field"><label>Dano *</label><input type="number" name="a1damage" required min="0" max="999" value="${atk(0,'damage','20')}"></div>
  <div class="field"><label>Custo de mana *</label><input type="number" name="a1cost" required min="0" max="20" value="${atk(0,'cost','2')}"></div>
  <div class="field"><label>Categoria</label><select name="a1category"><option value="physical" ${atk(0,'category')==='physical'?'selected':''}>Físico</option><option value="special" ${!card||atk(0,'category')==='special'?'selected':''}>Especial</option></select></div>
  <div class="field full"><label>Descrição</label><textarea name="a1description" rows="2">${atk(0,'description')}</textarea></div>
  <div class="field full"><label>Efeito especial</label><select name="a1effect">${effectOptions(card?.attacks?.[0]?.effect?.type||'')}</select></div>
  <div class="form-section-title">ATAQUE 2</div>
  <div class="field"><label>Nome do ataque *</label><input name="a2name" required value="${atk(1,'name','Ataque 2')}"></div>
  <div class="field"><label>Dano *</label><input type="number" name="a2damage" required min="0" max="999" value="${atk(1,'damage','30')}"></div>
  <div class="field"><label>Custo de mana *</label><input type="number" name="a2cost" required min="0" max="20" value="${atk(1,'cost','4')}"></div>
  <div class="field"><label>Categoria</label><select name="a2category"><option value="physical" ${atk(1,'category')==='physical'?'selected':''}>Físico</option><option value="special" ${!card||atk(1,'category')==='special'?'selected':''}>Especial</option></select></div>
  <div class="field full"><label>Descrição</label><textarea name="a2description" rows="2">${atk(1,'description')}</textarea></div>
  <div class="field full"><label>Efeito especial</label><select name="a2effect">${effectOptions(card?.attacks?.[1]?.effect?.type||'')}</select></div>
  </div><p class="admin-note">Os atributos físicos e especiais ficam armazenados para balanceamentos futuros. Nesta versão, o dano cadastrado em cada ataque é usado diretamente na batalha.</p>
  <div class="admin-bottom"><button type="submit" class="btn btn-primary">${card?'SALVAR ALTERAÇÕES':'CADASTRAR POKÉMON'}</button><button type="button" class="btn btn-ghost" data-action="cancel-card-form">Cancelar</button></div></form>`;
}
function effectOptions(current=''){
 const opts=[['','Nenhum efeito'],['poison','Veneno (2 por 2 turnos)'],['burn','Queimadura (3 por 2 turnos)'],['paralysis','Paralisia (-4 no próximo ataque)'],['shield','Escudo (+6)'],['heal','Cura (+6)'],['reduce','Reduz próximo dano (-4)'],['reflect','Reflete 5 de dano'],['mana','Recupera 3 de mana'],['bonus','Próximo ataque +3'],['lowHpBonus','+5 de dano com metade da vida'],['breakShield','Remove até 6 de escudo'],['pierce','Ignora até 4 de escudo'],['bonusVsShield','+4 de dano contra escudos']];
 return opts.map(([v,l])=>`<option value="${v}" ${v===current?'selected':''}>${l}</option>`).join('');
}
function renderAdmin(){
 const filtered=state.cards.filter(c=>(!state.adminSearch||c.name.toLowerCase().includes(state.adminSearch.toLowerCase()))&&(!state.adminType||c.type1===state.adminType||c.type2===state.adminType));
 const editing=state.editingId?findCard(state.editingId):null;
 return `<div class="page-heading"><div><span class="eyebrow">CENTRAL DE GERENCIAMENTO</span><h1>PAINEL DE CARTAS</h1><p>Cadastre, edite, importe e atualize as cartas. As alterações aparecem automaticamente nas seleções e batalhas futuras.</p></div><button class="btn btn-ghost" data-action="home">← Menu inicial</button></div>
 <div class="admin-stats"><div class="panel stat-card"><strong>${state.cards.length}</strong><span>Cartas cadastradas</span></div><div class="panel stat-card"><strong>${state.cards.filter(c=>c.image).length}</strong><span>Com imagem própria</span></div><div class="panel stat-card"><strong>20</strong><span>Mana máxima</span></div></div>
 ${state.adminFormOpen?renderAdminForm(editing):''}
 <section class="panel" style="padding:18px"><div class="admin-toolbar"><button class="btn btn-primary" data-action="new-card">＋ ADICIONAR POKÉMON</button><input id="admin-search" placeholder="Pesquisar carta..." value="${esc(state.adminSearch)}"><select id="admin-type"><option value="">Todos os tipos</option>${TYPES.map(t=>`<option ${state.adminType===t?'selected':''}>${t}</option>`).join('')}</select></div>
 <div class="card-grid">${filtered.length?filtered.map(c=>renderCard(c,false,true)).join(''):'<div class="empty-state" style="grid-column:1/-1">Nenhuma carta encontrada.</div>'}</div></section>
 <section class="panel import-export"><div><strong>Backup da biblioteca</strong><p>Exporte cartas e imagens em JSON ou importe um backup sem apagar as cartas atuais.</p></div><div class="admin-bottom" style="margin:0"><button class="btn btn-secondary" data-action="export-cards">↓ EXPORTAR CARTAS</button><button class="btn btn-secondary" data-action="import-cards">↑ IMPORTAR JSON</button><input type="file" id="import-file" accept="application/json,.json" hidden></div></section>
 <p class="admin-note">Aviso: a senha protege somente a interface local. Os dados ficam neste navegador e não são sincronizados entre computadores. Faça exportações de backup periodicamente.</p>`;
}
function renderModal(title,body,buttons){modalRoot.innerHTML=`<div class="modal-backdrop"><section class="panel modal"><h2>${title}</h2>${body}<div class="modal-actions">${buttons}</div></section></div>`;}
function clearModal(){modalRoot.innerHTML='';}
function showAdminPassword(){renderModal('Acesso administrativo','<p>Digite a senha para abrir o gerenciamento de cartas.</p><div class="field"><label>Senha</label><input id="admin-password" type="password" autocomplete="current-password" placeholder="Senha de acesso"></div>',`<button class="btn btn-ghost" data-action="close-modal">Cancelar</button><button class="btn btn-primary" data-action="check-password">ENTRAR</button>`);setTimeout(()=>document.getElementById('admin-password')?.focus(),30);}
function beginSetup(mode){audio.play('menu');state.setupMode=mode;state.view='setup';state.teamCount=2;render();}
function handleSetupSubmit(form){
 const fd=new FormData(form);const participants=[];
 if(state.setupMode==='1v1'){
  participants.push({name:String(fd.get('p1')||'Treinador 1').trim(),team:'A',isAI:false},{name:String(fd.get('p2')||'Treinador 2').trim(),team:'B',isAI:false});
 }else if(state.setupMode==='1vsIA'){
  state.difficulty=String(fd.get('difficulty')||'medio');
  participants.push({name:String(fd.get('p1')||'Treinador').trim(),team:'A',isAI:false},{name:'Treinador IA',team:'B',isAI:true,difficulty:state.difficulty});
 }else{
  const count=Number(fd.get('teamCount'))||2;
  for(let i=0;i<count;i++){participants.push({name:String(fd.get(`p${i}name`)||`Treinador ${i+1}`).trim()||`Treinador ${i+1}`,team:String(fd.get(`p${i}team`)|| (i%2?'B':'A')),isAI:false});}
  if(!participants.some(p=>p.team==='A')||!participants.some(p=>p.team==='B')){toast('Cada equipe precisa ter pelo menos um participante.','error');return;}
 }
 state.participants=participants;state.selectionIndex=participants.findIndex(p=>!p.isAI);state.pendingCardId=null;state.view='selection';render();
}
function confirmSelection(){
 const p=currentSelector();const card=findCard(state.pendingCardId);
 if(!p||!card){toast('Escolha um Pokémon antes de continuar.','error');return;}
 audio.play('select');p.card=card;state.selectionIndex=state.participants.findIndex((x,i)=>i>state.selectionIndex&&!x.isAI);
 if(state.selectionIndex===-1){
  state.participants.filter(x=>x.isAI).forEach(ai=>{const options=state.cards.filter(c=>c.id!==state.participants.find(p=>!p.isAI)?.card?.id);ai.card=options[Math.floor(Math.random()*options.length)]||state.cards[0];});
  startBattle();
 }else{state.pendingCardId=null;render();}
}
function startBattle(){
 if(state.participants.some(p=>!p.card)){toast('Todos os jogadores precisam escolher um Pokémon.','error');return;}
 const mode=state.setupMode;state.match=createMatch(state.participants,mode,state.difficulty);state.selectedTargetId=null;state.view='battle';state.turnMask=mode!=='1vsIA';state.battleFx=null;state.victoryPlayed=false;audio.play('start');render();
 if(!state.turnMask) prepareTurn();
}
function prepareTurn(){
 if(!state.match||state.match.finished){render();return;}
 const p=currentPlayer(state.match);
 if(p?.isAI){render();setTimeout(runAI,650);}
 else if(state.match.mode!=='1vsIA' && state.match.players.length>1){state.turnMask=true;render();}
 else render();
}
function runAI(){
 const match=state.match;if(!match||match.finished)return;
 const ai=currentPlayer(match);if(!ai?.isAI)return;
 const choice=chooseAIMove(match,ai,ai.difficulty||state.difficulty);
 const targets=livingOpponents(match,ai).sort((a,b)=>a.hp-b.hp);
 let result=null;
 if(choice&&targets[0]) result=executeAttack(match,ai.id,choice.index,targets[0].id);
 if(result?.ok){playMoveSound(ai,result);state.battleFx={kind:moveFxKind(result),attackerId:result.attacker.id,targetId:result.target.id,label:battleFxLabel(result),key:Date.now()};}
 if(!match.finished) advanceTurn(match);
 state.selectedTargetId=null;render();clearBattleFxLater();if(!match.finished)prepareTurn();
}
function playAttack(index){
 const p=currentPlayer(state.match);if(!p)return;
 const result=executeAttack(state.match,p.id,index,state.selectedTargetId);
 if(!result.ok){toast(result.message,'error');return;}
 playMoveSound(p,result);state.battleFx={kind:moveFxKind(result),attackerId:result.attacker.id,targetId:result.target.id,label:battleFxLabel(result),key:Date.now()};
 if(!state.match.finished)advanceTurn(state.match);
 state.selectedTargetId=null;render();clearBattleFxLater();if(!state.match.finished)prepareTurn();
}
function battleFxLabel(result){
 const effect=result.move?.effect;
 if(effect?.type==='heal')return `+${effect.amount||6} HP`;
 if(effect?.type==='shield')return `+${effect.amount||6} ESCUDO`;
 if(effect?.type==='mana')return `+${effect.amount||3} MANA`;
 return `-${result.damage} HP`;
}
function moveFxKind(result){
 const effect=result.move?.effect?.type;
 if(effect==='heal')return 'heal';if(effect==='shield'||effect==='reduce'||effect==='reflect')return 'shield';
 const t=String(result.attacker?.card?.type1||'').toLowerCase();
 if(t.includes('fogo'))return 'fire';if(t.includes('água'))return 'water';if(t.includes('elétrico'))return 'electric';if(t.includes('psíquico'))return 'psychic';if(t.includes('planta'))return 'plant';if(t.includes('fantasma')||t.includes('sombrio'))return 'ghost';return 'hit';
}
function playMoveSound(attacker,result){
 const effect=result.move?.effect?.type;
 if(effect==='heal'){audio.play('heal');return;}
 if(['shield','reduce','reflect'].includes(effect)){audio.play('shield');return;}
 const t=String(attacker.card?.type1||'').toLowerCase();
 if(t.includes('fogo'))audio.play('fire');else if(t.includes('água'))audio.play('water');else if(t.includes('elétrico'))audio.play('electric');else if(t.includes('psíquico'))audio.play('psychic');else if(t.includes('planta'))audio.play('plant');else if(t.includes('fantasma')||t.includes('sombrio'))audio.play('ghost');else audio.play('attack');
 if(result.target?.fainted) setTimeout(()=>audio.play('faint'),280);else setTimeout(()=>audio.play('hit'),90);
 if(effect==='poison'||effect==='burn'||effect==='paralysis')setTimeout(()=>audio.play('status'),180);
}
function clearBattleFxLater(){
 const key=state.battleFx?.key;if(!key)return;
 setTimeout(()=>{if(state.battleFx?.key===key){state.battleFx=null;if(state.view==='battle')render();}},1050);
}
function enterAdmin(){state.view='admin';state.adminFormOpen=false;state.editingId=null;state.pendingImage=null;render();}
function buildEffect(type){
 if(!type)return null;
 const values={poison:{type,amount:2,duration:2},burn:{type,amount:3,duration:2},paralysis:{type,amount:4,duration:1},shield:{type,amount:6},heal:{type,amount:6},reduce:{type,amount:4},reflect:{type,amount:5},mana:{type,amount:3},bonus:{type,amount:3},lowHpBonus:{type,amount:5},breakShield:{type,amount:6},pierce:{type,amount:4},bonusVsShield:{type,amount:4}};
 return values[type]||null;
}
function handleAdminSubmit(form){
 const fd=new FormData(form);const old=state.editingId?findCard(state.editingId):null;
 const attack=(n)=>({name:String(fd.get(`a${n}name`)).trim(),damage:Number(fd.get(`a${n}damage`)),cost:Number(fd.get(`a${n}cost`)),category:String(fd.get(`a${n}category`)||'special'),description:String(fd.get(`a${n}description`)||''),effect:buildEffect(String(fd.get(`a${n}effect`)||''))});
 const card={id:old?old.id:`custom-${Date.now()}`,name:String(fd.get('name')).trim(),type1:String(fd.get('type1')),type2:String(fd.get('type2')||''),hp:Number(fd.get('hp')),atk:Number(fd.get('atk')||0),def:Number(fd.get('def')||0),spAtk:Number(fd.get('spAtk')||0),spDef:Number(fd.get('spDef')||0),image:state.pendingImage!==null?state.pendingImage:(old?.image||''),spriteIndex:old?.spriteIndex,attacks:[attack(1),attack(2)],createdAt:old?.createdAt||Date.now()};
 if(!card.name||card.hp<=0||card.attacks.some(a=>!a.name||a.damage<0||a.cost<0||a.cost>20)){toast('Confira os campos obrigatórios e os valores dos ataques.','error');return;}
 saveCard(card).then(async()=>{await updateCards();state.adminFormOpen=false;state.editingId=null;state.pendingImage=null;state.adminSearch='';render();toast(old?'Carta atualizada com sucesso.':'Pokémon cadastrado com sucesso.','success');}).catch(e=>toast(e.message,'error'));
}
function setImageFile(file){
 if(!file)return;
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)){toast('Formato inválido. Use PNG, JPG ou WEBP.','error');return;}
 if(file.size>5*1024*1024){toast('A imagem deve ter no máximo 5 MB.','error');return;}
 const reader=new FileReader();reader.onload=()=>{state.pendingImage=String(reader.result);const preview=document.getElementById('upload-preview');if(preview)preview.innerHTML=`<img src="${state.pendingImage}" alt="Prévia da carta">`;};reader.onerror=()=>toast('Não foi possível ler a imagem.','error');reader.readAsDataURL(file);
}

app.addEventListener('click',event=>{
 const actionEl=event.target.closest('[data-action]');
 if(actionEl){
  const action=actionEl.dataset.action;
  if(action!=='attack'&&action!=='turn-ready'&&action!=='close-modal')audio.play('click');
  if(action==='home'){state.view='home';state.match=null;state.turnMask=false;clearModal();render();}
  else if(action==='start-setup')beginSetup(actionEl.dataset.mode);
  else if(action==='open-admin')showAdminPassword();
  else if(action==='pick-card'){state.pendingCardId=actionEl.dataset.cardId;renderSelectionAfterPick();}
  else if(action==='confirm-selection')confirmSelection();
  else if(action==='cancel-selection'){state.view='setup';state.participants=[];render();}
  else if(action==='turn-ready'){state.turnMask=false;render();if(currentPlayer(state.match)?.isAI)prepareTurn();}
  else if(action==='attack')playAttack(Number(actionEl.dataset.index));
  else if(action==='replay'){state.view='selection';state.selectionIndex=state.participants.findIndex(p=>!p.isAI);state.participants=state.participants.map(p=>({...p,card:null}));state.pendingCardId=null;render();}
  else if(action==='surrender'){const p=currentPlayer(state.match);const losing=p.team;state.match.players.filter(x=>x.team===losing&&!x.fainted).forEach(x=>{x.hp=0;x.fainted=true;});checkFinished(state.match);render();}
  else if(action==='close-modal')clearModal();
  else if(action==='check-password'){const input=document.getElementById('admin-password');if(input?.value===ADMIN_PASSWORD){clearModal();state.adminUnlocked=true;enterAdmin();}else{toast('Senha incorreta.','error');if(input)input.value='';}}
  else if(action==='new-card'){state.adminFormOpen=true;state.editingId=null;state.pendingImage=null;render();document.querySelector('.admin-form')?.scrollIntoView({behavior:'smooth',block:'start'});}
  else if(action==='cancel-card-form'){state.adminFormOpen=false;state.editingId=null;state.pendingImage=null;render();}
  else if(action==='edit-card'){state.editingId=actionEl.dataset.id;state.adminFormOpen=true;state.pendingImage=null;render();document.querySelector('.admin-form')?.scrollIntoView({behavior:'smooth',block:'start'});}
  else if(action==='delete-card'){const id=actionEl.dataset.id;const card=findCard(id);if(confirm(`Excluir a carta ${card?.name||''}? Esta ação não poderá ser desfeita.`)){removeCard(id).then(async()=>{await updateCards();render();toast('Carta excluída.','success');}).catch(e=>toast(e.message,'error'));}}
  else if(action==='export-cards'){exportCards().then(n=>toast(`${n} cartas exportadas.`,'success')).catch(e=>toast(e.message,'error'));}
  else if(action==='import-cards')document.getElementById('import-file')?.click();
 }
});
function renderSelectionAfterPick(){
 const participant=currentSelector();const chosen=findCard(state.pendingCardId);
 // Atualiza o painel de prévia sem recriar a grade inteira, preservando posição e filtros.
 document.querySelectorAll('.pokemon-card').forEach(el=>el.classList.toggle('selected',el.dataset.cardId===String(state.pendingCardId)));
 const side=document.querySelector('.selection-side');if(side){
  side.innerHTML=`<span class="eyebrow">ESCOLHA ATUAL</span><h3>${esc(participant?.name||'Treinador')}</h3><div class="selection-preview">${chosen?cardImage(chosen,true):'<span class="muted">Selecione uma carta</span>'}</div>${chosen?`<strong>${esc(chosen.name)}</strong><div class="type-row" style="padding:8px 0">${typeChips(chosen)}</div><div class="stat-line"><span>Vida máxima</span><b>${chosen.hp} HP</b></div><div class="attack-mini"><span>${esc(chosen.attacks[0].name)}</span><b>${chosen.attacks[0].damage}</b></div><div class="attack-mini"><span>${esc(chosen.attacks[1].name)}</span><b>${chosen.attacks[1].damage}</b></div>`:'<p class="select-hint">Clique em uma carta para ver os detalhes.</p>'}<button class="btn btn-primary" data-action="confirm-selection" ${!chosen?'disabled':''}>${state.selectionIndex>=state.participants.filter(p=>!p.isAI).length-1?'CONFIRMAR E INICIAR':'CONFIRMAR ESCOLHA'}</button><button class="btn btn-ghost" data-action="cancel-selection">Voltar</button><p class="select-hint">${state.selectionIndex+1} de ${state.participants.filter(p=>!p.isAI).length} escolhas humanas</p>`;
 }
}
app.addEventListener('submit',event=>{
 if(event.target.id==='setup-form'){event.preventDefault();handleSetupSubmit(event.target);}
 if(event.target.id==='admin-card-form'){event.preventDefault();handleAdminSubmit(event.target);}
});
app.addEventListener('change',event=>{
 if(event.target.id==='image-upload')setImageFile(event.target.files?.[0]);
 if(event.target.id==='admin-type'){state.adminType=event.target.value;render();}
  if(event.target.id==='selection-type'){const query=document.getElementById('selection-search')?.value.toLowerCase()||'';const type=event.target.value;document.querySelectorAll('#selection-grid .pokemon-card').forEach(el=>{const c=findCard(el.dataset.cardId);el.style.display=c&&c.name.toLowerCase().includes(query)&&(!type||c.type1===type||c.type2===type)?'':'none';});}
 if(event.target.id==='target-select'){state.selectedTargetId=event.target.value;render();}
 if(event.target.id==='import-file'){
  const file=event.target.files?.[0];if(!file)return;
  const reader=new FileReader();reader.onload=async()=>{try{const parsed=JSON.parse(String(reader.result));const list=Array.isArray(parsed)?parsed:parsed.cards;const result=await importCards(list);await updateCards();render();toast(`Importadas: ${result.added.length}. Ignoradas: ${result.skipped.length}. Inválidas: ${result.invalid}.`,'success');}catch(e){toast(`Falha ao importar: ${e.message}`,'error');}};reader.readAsText(file);event.target.value='';
 }
});
app.addEventListener('input',event=>{
 if(event.target.id==='admin-search'){state.adminSearch=event.target.value;const value=event.target.value;const pos=event.target.selectionStart;render();const input=document.getElementById('admin-search');input?.focus();input?.setSelectionRange(pos,pos);}
 if(event.target.id==='selection-search'||event.target.id==='selection-type'){
  const query=document.getElementById('selection-search')?.value.toLowerCase()||'';const type=document.getElementById('selection-type')?.value||'';
  document.querySelectorAll('#selection-grid .pokemon-card').forEach(el=>{const c=findCard(el.dataset.cardId);el.style.display=c&&c.name.toLowerCase().includes(query)&&(!type||c.type1===type||c.type2===type)?'':'none';});
 }
});

modalRoot.addEventListener('click',event=>{
 const action=event.target.closest('[data-action]')?.dataset.action;
 if(action==='close-modal')clearModal();
 if(action==='check-password'){
  const input=document.getElementById('admin-password');
  if(input?.value===ADMIN_PASSWORD){clearModal();state.adminUnlocked=true;enterAdmin();}
  else{toast('Senha incorreta.','error');if(input)input.value='';}
 }
});
modalRoot.addEventListener('keydown',event=>{if(event.key==='Enter' && event.target.id==='admin-password'){event.preventDefault();const input=event.target;if(input.value===ADMIN_PASSWORD){clearModal();state.adminUnlocked=true;enterAdmin();}else{toast('Senha incorreta.','error');input.value='';}}});

document.getElementById('brand-home').addEventListener('click',()=>{state.view='home';state.match=null;clearModal();render();});
document.getElementById('sound-toggle').addEventListener('click',event=>{
  state.sound=audio.toggle();event.currentTarget.textContent=state.sound?'♫':'♪';
  event.currentTarget.title=state.sound?'Música e efeitos ativados':'Música e efeitos desativados';
  event.currentTarget.dataset.enabled=String(state.sound);
  if(state.sound)audio.play('select');toast(state.sound?'Música ambiente e efeitos ativados.':'Áudio desativado.');
});
app.addEventListener('pointerdown',()=>audio.unlock(),{passive:true});
app.addEventListener('pointerover',event=>{
  const target=event.target.closest('.btn,.mode-card,.pokemon-card');
  if(!target)return;const now=Date.now();if(now-audio.lastHover<85)return;audio.lastHover=now;audio.play('hover');
});

async function init(){
 try{await seedCards();await updateCards();render();}
 catch(error){app.innerHTML=`<section class="panel mode-panel"><h2>Não foi possível iniciar o jogo</h2><p>${esc(error.message)}</p><p>Abra o projeto por um servidor local (por exemplo, Live Server ou <code>python -m http.server 8000</code>) e acesse <code>http://localhost:8000</code>.</p></section>`;}
}
init();
