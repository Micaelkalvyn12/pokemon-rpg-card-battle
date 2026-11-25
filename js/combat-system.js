import { getTypeModifier } from './type-chart.js';
import { buildTurnOrder, livingTeamCount, opposingPlayers } from './teams.js';

const clone = value => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
const pushLog = (match,message,kind='') => { match.log.unshift({id:Date.now()+Math.random(),message,kind}); match.log=match.log.slice(0,80); };

export function createMatch(participantConfigs,mode='1v1',difficulty='medio'){
  const players=participantConfigs.map((config,index)=>({
    id:`player-${index+1}`,name:config.name || `Jogador ${index+1}`,team:config.team || (index%2?'B':'A'),
    isAI:!!config.isAI,difficulty:config.difficulty||difficulty,card:clone(config.card),hp:Number(config.card.hp),mana:6,
    shield:0,statuses:[],buffs:[],fainted:false,damageDealt:0,healingDone:0
  }));
  const ordered=buildTurnOrder(players);
  const match={mode,difficulty,players:ordered,currentPlayerId:ordered[0]?.id,turn:1,finished:false,winnerTeam:null,log:[],createdAt:Date.now()};
  pushLog(match,`A batalha começou! ${ordered[0]?.name} inicia com ${ordered[0]?.card.name}.`,'good');
  return match;
}
export function currentPlayer(match){return match.players.find(p=>p.id===match.currentPlayerId) || null;}
export function getPlayer(match,id){return match.players.find(p=>p.id===id) || null;}
export function livingOpponents(match,player){return opposingPlayers(match,player);}
export function winnerTeam(match){
  const a=livingTeamCount(match,'A');const b=livingTeamCount(match,'B');
  if(a===0) return 'B';if(b===0) return 'A';return null;
}
export function checkFinished(match){
  const winner=winnerTeam(match);
  if(winner){match.finished=true;match.winnerTeam=winner;pushLog(match,`Equipe ${winner} venceu a batalha!`,'good');return true;}
  return false;
}
function addStatus(target,status){
  const existing=target.statuses.find(s=>s.type===status.type);
  if(existing) existing.duration=Math.max(existing.duration,status.duration);
  else target.statuses.push({...status});
}
function addBuff(target,buff){
  const existing=target.buffs.find(b=>b.type===buff.type);
  if(existing) existing.amount=Math.max(existing.amount,buff.amount);
  else target.buffs.push({...buff});
}
function applyStartTurn(match,player){
  const ongoing=[];
  for(const status of player.statuses){
    if(status.type==='paralysis'){ongoing.push(status);continue;}
    if(status.type==='poison'||status.type==='burn'){
      const amount=status.amount|| (status.type==='poison'?2:3);
      player.hp=Math.max(0,player.hp-amount);
      pushLog(match,`${player.name} sofreu ${amount} de dano por ${status.type==='poison'?'veneno':'queimadura'}.`,'bad');
      if(player.hp<=0){player.fainted=true;pushLog(match,`${player.card.name} foi derrotado pelo efeito!`,'bad');}
    }
    status.duration=(status.duration??1)-1;
    if(status.duration>0) ongoing.push(status);
  }
  player.statuses=ongoing;
  if(!player.fainted){
    const before=player.mana;player.mana=Math.min(20,player.mana+3);
    if(player.mana>before) pushLog(match,`${player.name} recuperou ${player.mana-before} de mana.`,'good');
  }
}
export function advanceTurn(match){
  if(match.finished) return match;
  if(checkFinished(match)) return match;
  const currentIndex=match.players.findIndex(p=>p.id===match.currentPlayerId);
  for(let step=1;step<=match.players.length;step++){
    const index=(currentIndex+step)%match.players.length;
    const next=match.players[index];
    if(!next.fainted){
      match.currentPlayerId=next.id;match.turn+=1;
      applyStartTurn(match,next);
      if(checkFinished(match)) return match;
      if(next.fainted) return advanceTurn(match);
      pushLog(match,`Turno de ${next.name} (${next.card.name}).`,'');
      return match;
    }
  }
  checkFinished(match);return match;
}

export function executeAttack(match,attackerId,moveIndex,targetId){
  if(match.finished) return {ok:false,message:'A batalha já terminou.'};
  const attacker=getPlayer(match,attackerId);
  if(!attacker || attacker.id!==match.currentPlayerId) return {ok:false,message:'Não é o turno deste jogador.'};
  if(attacker.fainted) return {ok:false,message:'Este Pokémon já foi derrotado.'};
  const move=attacker.card.attacks[moveIndex];
  if(!move) return {ok:false,message:'Ataque inválido.'};
  if(attacker.mana<Number(move.cost)) return {ok:false,message:'Mana insuficiente para este ataque.'};
  const opponents=livingOpponents(match,attacker);
  const target=opponents.find(p=>p.id===targetId) || opponents[0];
  if(!target) return {ok:false,message:'Não há adversários disponíveis.'};
  attacker.mana-=Number(move.cost);
  let effect=move.effect || null;
  let typeBonus=getTypeModifier(attacker.card.type1,target.card);
  let damage=Number(move.damage)||0;
  if(typeBonus!==0){damage+=typeBonus;pushLog(match,typeBonus>0?'Ataque super efetivo! +5 de dano.':'O alvo resistiu ao golpe. -3 de dano.',typeBonus>0?'good':'bad');}
  if(effect?.type==='lowHpBonus' && attacker.hp<=attacker.card.hp/2) damage+=Number(effect.amount)||0;
  if(effect?.type==='bonusVsShield' && target.shield>0) damage+=Number(effect.amount)||0;
  const bonus=attacker.buffs.find(b=>b.type==='bonus');
  if(bonus){damage+=bonus.amount;attacker.buffs=attacker.buffs.filter(b=>b!==bonus);pushLog(match,`${attacker.card.name} fortaleceu o ataque em +${bonus.amount}.`,'good');}
  const paralysis=attacker.statuses.find(s=>s.type==='paralysis');
  if(paralysis){damage=Math.max(0,damage-(paralysis.amount||4));attacker.statuses=attacker.statuses.filter(s=>s!==paralysis);pushLog(match,`${attacker.name} está sob paralisia: o dano foi reduzido.`,'bad');}
  damage=Math.max(0,Math.round(damage));
  // Efeitos que quebram escudo são resolvidos antes do dano.
  if(effect?.type==='breakShield' && target.shield>0){const removed=Math.min(target.shield,effect.amount||0);target.shield-=removed;pushLog(match,`${attacker.card.name} removeu ${removed} pontos do escudo inimigo.`,'good');}
  let absorbed=0;
  const reduce=target.buffs.find(b=>b.type==='reduce');
  if(reduce){damage=Math.max(0,damage-reduce.amount);target.buffs=target.buffs.filter(b=>b!==reduce);pushLog(match,`A proteção reduziu ${reduce.amount} pontos do dano recebido.`,'good');}
  if(effect?.type==='pierce' && target.shield>0){
    const bypass=Math.min(damage,effect.amount||0);const shieldDamage=Math.min(target.shield,damage-bypass);target.shield-=shieldDamage;absorbed=shieldDamage;target.hp=Math.max(0,target.hp-bypass);
  }else{
    absorbed=Math.min(target.shield,damage);target.shield-=absorbed;const hpDamage=damage-absorbed;target.hp=Math.max(0,target.hp-hpDamage);
  }
  const actualHpDamage=Math.max(0,Math.min(target.hp+Math.max(0,damage-absorbed),damage-absorbed));
  attacker.damageDealt+=damage;
  pushLog(match,`${attacker.name} usou ${move.name} em ${target.card.name}: ${damage} de dano${absorbed?` (${absorbed} absorvidos pelo escudo)`:''}.`,'bad');
  // Efeitos aplicados depois do dano.
  if(effect){
    switch(effect.type){
      case 'poison': addStatus(target,{type:'poison',amount:effect.amount||2,duration:effect.duration||2});pushLog(match,`${target.card.name} foi envenenado.`,'bad');break;
      case 'burn': addStatus(target,{type:'burn',amount:effect.amount||3,duration:effect.duration||2});pushLog(match,`${target.card.name} sofreu queimadura.`,'bad');break;
      case 'paralysis': addStatus(target,{type:'paralysis',amount:effect.amount||4,duration:1});pushLog(match,`${target.card.name} foi paralisado: seu próximo ataque terá -4 de dano.`,'bad');break;
      case 'shield': attacker.shield=Math.min(999,attacker.shield+(effect.amount||6));pushLog(match,`${attacker.card.name} recebeu ${effect.amount||6} pontos de escudo.`,'good');break;
      case 'heal': {const healed=Math.min(effect.amount||0,attacker.card.hp-attacker.hp);attacker.hp+=healed;attacker.healingDone+=healed;pushLog(match,`${attacker.card.name} recuperou ${healed} pontos de vida.`,'good');break;}
      case 'reduce': addBuff(target,{type:'reduce',amount:effect.amount||0});pushLog(match,`O próximo ataque contra ${target.card.name} terá dano reduzido em ${effect.amount||0}.`,'good');break;
      case 'mana': {const recovered=Math.min(effect.amount||0,20-attacker.mana);attacker.mana+=recovered;pushLog(match,`${attacker.name} recuperou ${recovered} de mana.`,'good');break;}
      case 'bonus': addBuff(attacker,{type:'bonus',amount:effect.amount||0});pushLog(match,`O próximo ataque de ${attacker.card.name} receberá +${effect.amount||0} de dano.`,'good');break;
      case 'reflect': addBuff(attacker,{type:'reflect',amount:effect.amount||5});pushLog(match,`${attacker.card.name} preparou uma reflexão de dano.`,'good');break;
    }
  }
  // Reflexão ativa no alvo devolve dano ao atacante.
  const reflect=target.buffs.find(b=>b.type==='reflect');
  if(reflect && damage>0){const reflected=Math.min(reflect.amount,damage);attacker.hp=Math.max(0,attacker.hp-reflected);target.buffs=target.buffs.filter(b=>b!==reflect);pushLog(match,`${target.card.name} refletiu ${reflected} de dano!`,'good');}
  if(target.hp<=0){target.fainted=true;pushLog(match,`${target.card.name} foi derrotado!`,'bad');}
  if(attacker.hp<=0){attacker.fainted=true;pushLog(match,`${attacker.card.name} foi derrotado!`,'bad');}
  checkFinished(match);
  return {ok:true,attacker,target,move,damage,absorbed,finished:match.finished};
}
