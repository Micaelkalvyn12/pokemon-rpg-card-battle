import { getTypeModifier } from './type-chart.js';
import { buildTurnOrder, livingTeamCount, opposingPlayers } from './teams.js';

const clone = value => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
const pushLog = (match,message,kind='') => {
  match.log.unshift({id:Date.now()+Math.random(),message,kind});
  match.log=match.log.slice(0,100);
};

export function getPokemonSpeed(card={}) {
  const stored=Number(card.speed);
  if(Number.isFinite(stored)&&stored>0) return Math.max(1,Math.min(200,Math.round(stored)));
  const types=`${card.type1||''} ${card.type2||''}`.toLowerCase();
  let bonus=0;
  if(types.includes('elétrico')||types.includes('eletrico')) bonus+=18;
  if(types.includes('voador')) bonus+=10;
  if(types.includes('psíquico')||types.includes('psiquico')) bonus+=7;
  if(types.includes('fogo')) bonus+=4;
  if(types.includes('gelo')) bonus+=3;
  if(types.includes('pedra')) bonus-=8;
  if(types.includes('aço')||types.includes('aco')) bonus-=5;
  return Math.max(25,Math.min(160,Math.round(108-(Number(card.hp)||70)*0.42+bonus)));
}

export function createMatch(participantConfigs,mode='1v1',difficulty='medio'){
  const players=participantConfigs.map((config,index)=>{
    const card=clone(config.card);
    card.speed=getPokemonSpeed(card);
    return {
      id:`player-${index+1}`,
      name:config.name || `Jogador ${index+1}`,
      team:config.team || (index%2?'B':'A'),
      isAI:!!config.isAI,
      difficulty:config.difficulty||difficulty,
      card,
      hp:Number(card.hp),
      mana:6,
      speed:card.speed,
      shield:0,
      statuses:[],
      buffs:[],
      fainted:false,
      damageDealt:0,
      healingDone:0
    };
  });
  const ordered=buildTurnOrder(players);
  const match={
    mode,difficulty,players:ordered,turn:1,finished:false,winnerTeam:null,
    roundActions:{},log:[],createdAt:Date.now()
  };
  pushLog(match,'A batalha começou! Todos escolhem seus golpes antes da rodada ser resolvida.','good');
  ordered.forEach(player=>pushLog(match,`${player.card.name} entrou na arena com velocidade ${player.speed}.`));
  return match;
}

export function getPlayer(match,id){return match.players.find(p=>p.id===id)||null;}
export function currentPlayer(match){return match.players.find(p=>!p.fainted&&!match.roundActions?.[p.id])||null;}
export function livingOpponents(match,player){return opposingPlayers(match,player);}
export function winnerTeam(match){
  const a=livingTeamCount(match,'A'),b=livingTeamCount(match,'B');
  if(a===0)return 'B';
  if(b===0)return 'A';
  return null;
}
export function checkFinished(match){
  const winner=winnerTeam(match);
  if(winner){
    match.finished=true;
    match.winnerTeam=winner;
    pushLog(match,`Equipe ${winner} venceu a batalha!`,'good');
    return true;
  }
  return false;
}
export function allActionsSubmitted(match){
  const active=match.players.filter(p=>!p.fainted);
  return active.length>0&&active.every(p=>Boolean(match.roundActions?.[p.id]));
}
export function submitAction(match,playerId,moveIndex,targetId){
  if(match.finished)return {ok:false,message:'A batalha já terminou.'};
  const player=getPlayer(match,playerId);
  if(!player||player.fainted)return {ok:false,message:'Este Pokémon não pode agir.'};
  if(match.roundActions[playerId])return {ok:false,message:'Este jogador já escolheu seu ataque nesta rodada.'};
  const move=player.card.attacks?.[moveIndex];
  if(!move)return {ok:false,message:'Ataque inválido.'};
  if(player.mana<Number(move.cost||0))return {ok:false,message:'Mana insuficiente para este ataque.'};
  const opponents=livingOpponents(match,player);
  const target=opponents.find(p=>p.id===targetId)||opponents[0];
  if(!target)return {ok:false,message:'Não há adversários disponíveis.'};
  match.roundActions[playerId]={moveIndex:Number(moveIndex),targetId:target.id,tieBreak:Math.random()};
  return {ok:true,complete:allActionsSubmitted(match),remaining:match.players.filter(p=>!p.fainted&&!match.roundActions[p.id]).length};
}
export function getResolutionOrder(match){
  return match.players
    .filter(player=>!player.fainted&&match.roundActions?.[player.id])
    .map(player=>({player,action:match.roundActions[player.id]}))
    .sort((a,b)=>b.player.speed-a.player.speed || b.action.tieBreak-a.action.tieBreak);
}

function addStatus(target,status){
  const existing=target.statuses.find(s=>s.type===status.type);
  if(existing)existing.duration=Math.max(existing.duration,status.duration);
  else target.statuses.push({...status});
}
function addBuff(target,buff){
  const existing=target.buffs.find(b=>b.type===buff.type);
  if(existing)existing.amount=Math.max(existing.amount,buff.amount);
  else target.buffs.push({...buff});
}
function applyStartRound(match,player){
  if(player.fainted)return;
  const ongoing=[];
  for(const status of player.statuses){
    if(status.type==='poison'||status.type==='burn'){
      const amount=status.amount||(status.type==='poison'?2:3);
      player.hp=Math.max(0,player.hp-amount);
      pushLog(match,`${player.card.name} sofreu ${amount} de dano por ${status.type==='poison'?'veneno':'queimadura'}.`,'bad');
      if(player.hp<=0){player.fainted=true;pushLog(match,`${player.card.name} foi derrotado pelo efeito!`,'bad');}
    }
    status.duration=(status.duration??1)-1;
    if(status.duration>0)ongoing.push(status);
  }
  player.statuses=ongoing;
  if(!player.fainted){
    const before=player.mana;
    player.mana=Math.min(20,player.mana+3);
    if(player.mana>before)pushLog(match,`${player.name} recuperou ${player.mana-before} de mana.`,'good');
  }
}

/**
 * Resolve a escolha de um participante. O d20 é rolado no momento do ataque:
 * 1 a 19 usa multiplicador crescente; 20 é acerto crítico.
 */
export function executeAttack(match,attackerId,moveIndex,targetId,dieRoll=10){
  if(match.finished)return {ok:false,message:'A batalha já terminou.'};
  const attacker=getPlayer(match,attackerId);
  if(!attacker||attacker.fainted)return {ok:false,message:'Este Pokémon não pode atacar.'};
  const move=attacker.card.attacks?.[moveIndex];
  if(!move)return {ok:false,message:'Ataque inválido.'};
  if(attacker.mana<Number(move.cost||0))return {ok:false,message:'Mana insuficiente para este ataque.'};
  const opponents=livingOpponents(match,attacker);
  const target=opponents.find(p=>p.id===targetId)||opponents[0];
  if(!target)return {ok:false,message:'Não há adversários disponíveis.'};

  const roll=Math.max(1,Math.min(20,Math.round(Number(dieRoll)||1)));
  attacker.mana-=Number(move.cost||0);
  const effect=move.effect||null;
  const typeBonus=getTypeModifier(attacker.card.type1,target.card);
  const multiplier=roll===20?1.6:0.55+(roll*0.045);
  let damage=Math.round((Number(move.damage)||0)*multiplier);
  if(typeBonus!==0){
    damage+=typeBonus;
    pushLog(match,typeBonus>0?'Ataque super efetivo! +5 de dano.':'O alvo resistiu ao golpe. -3 de dano.',typeBonus>0?'good':'bad');
  }
  if(effect?.type==='lowHpBonus'&&attacker.hp<=attacker.card.hp/2)damage+=Number(effect.amount)||0;
  if(effect?.type==='bonusVsShield'&&target.shield>0)damage+=Number(effect.amount)||0;
  const bonus=attacker.buffs.find(b=>b.type==='bonus');
  if(bonus){damage+=bonus.amount;attacker.buffs=attacker.buffs.filter(b=>b!==bonus);pushLog(match,`${attacker.card.name} fortaleceu o ataque em +${bonus.amount}.`,'good');}
  const paralysis=attacker.statuses.find(s=>s.type==='paralysis');
  if(paralysis){damage=Math.max(0,damage-(paralysis.amount||4));attacker.statuses=attacker.statuses.filter(s=>s!==paralysis);pushLog(match,`${attacker.name} está sob paralisia: o dano foi reduzido.`,'bad');}
  damage=Math.max(0,Math.round(damage));

  if(effect?.type==='breakShield'&&target.shield>0){
    const removed=Math.min(target.shield,effect.amount||0);
    target.shield-=removed;
    pushLog(match,`${attacker.card.name} removeu ${removed} pontos do escudo inimigo.`,'good');
  }
  let absorbed=0;
  const reduce=target.buffs.find(b=>b.type==='reduce');
  if(reduce){damage=Math.max(0,damage-reduce.amount);target.buffs=target.buffs.filter(b=>b!==reduce);pushLog(match,`A proteção reduziu ${reduce.amount} pontos do dano recebido.`,'good');}
  if(effect?.type==='pierce'&&target.shield>0){
    const bypass=Math.min(damage,effect.amount||0);
    const shieldDamage=Math.min(target.shield,damage-bypass);
    target.shield-=shieldDamage;
    absorbed=shieldDamage;
    target.hp=Math.max(0,target.hp-bypass);
  }else{
    absorbed=Math.min(target.shield,damage);
    target.shield-=absorbed;
    target.hp=Math.max(0,target.hp-(damage-absorbed));
  }

  const critical=roll===20;
  attacker.damageDealt+=damage;
  pushLog(match,`${attacker.name} usou ${move.name} em ${target.card.name}: D20 ${roll}/20${critical?' — CRÍTICO!':''}; ${damage} de dano${absorbed?` (${absorbed} absorvidos pelo escudo)`:''}.`,'bad');

  if(effect){
    switch(effect.type){
      case 'poison':addStatus(target,{type:'poison',amount:effect.amount||2,duration:effect.duration||2});pushLog(match,`${target.card.name} foi envenenado.`,'bad');break;
      case 'burn':addStatus(target,{type:'burn',amount:effect.amount||3,duration:effect.duration||2});pushLog(match,`${target.card.name} sofreu queimadura.`,'bad');break;
      case 'paralysis':addStatus(target,{type:'paralysis',amount:effect.amount||4,duration:1});pushLog(match,`${target.card.name} foi paralisado: seu próximo ataque terá -4 de dano.`,'bad');break;
      case 'shield':attacker.shield=Math.min(999,attacker.shield+(effect.amount||6));pushLog(match,`${attacker.card.name} recebeu ${effect.amount||6} pontos de escudo.`,'good');break;
      case 'heal':{const healed=Math.min(effect.amount||0,attacker.card.hp-attacker.hp);attacker.hp+=healed;attacker.healingDone+=healed;pushLog(match,`${attacker.card.name} recuperou ${healed} pontos de vida.`,'good');break;}
      case 'reduce':addBuff(target,{type:'reduce',amount:effect.amount||0});pushLog(match,`O próximo ataque contra ${target.card.name} terá dano reduzido em ${effect.amount||0}.`,'good');break;
      case 'mana':{const recovered=Math.min(effect.amount||0,20-attacker.mana);attacker.mana+=recovered;pushLog(match,`${attacker.name} recuperou ${recovered} de mana.`,'good');break;}
      case 'bonus':addBuff(attacker,{type:'bonus',amount:effect.amount||0});pushLog(match,`O próximo ataque de ${attacker.card.name} receberá +${effect.amount||0} de dano.`,'good');break;
      case 'reflect':addBuff(attacker,{type:'reflect',amount:effect.amount||5});pushLog(match,`${attacker.card.name} preparou uma reflexão de dano.`,'good');break;
    }
  }
  const reflect=target.buffs.find(b=>b.type==='reflect');
  if(reflect&&damage>0){
    const reflected=Math.min(reflect.amount,damage);
    attacker.hp=Math.max(0,attacker.hp-reflected);
    target.buffs=target.buffs.filter(b=>b!==reflect);
    pushLog(match,`${target.card.name} refletiu ${reflected} de dano!`,'good');
  }
  if(target.hp<=0){target.fainted=true;pushLog(match,`${target.card.name} foi derrotado!`,'bad');}
  if(attacker.hp<=0){attacker.fainted=true;pushLog(match,`${attacker.card.name} foi derrotado!`,'bad');}
  checkFinished(match);
  return {ok:true,attacker,target,move,damage,absorbed,roll,critical,finished:match.finished};
}

export function advanceTurn(match){
  if(match.finished)return match;
  match.turn+=1;
  match.roundActions={};
  for(const player of match.players)applyStartRound(match,player);
  checkFinished(match);
  if(!match.finished)pushLog(match,`Rodada ${match.turn}: todos escolhem seus próximos ataques.`,'good');
  return match;
}
