import { getTypeModifier } from './type-chart.js';

export function chooseAIMove(match,aiPlayer,difficulty='medio'){
  const options=aiPlayer.card.attacks.map((move,index)=>({move,index})).filter(x=>aiPlayer.mana>=x.move.cost);
  if(!options.length) return null;
  const opponents=match.players.filter(p=>p.team!==aiPlayer.team && !p.fainted);
  if(!opponents.length) return null;
  const target=opponents.sort((a,b)=>a.hp-b.hp)[0];
  if(difficulty==='facil') return options[Math.floor(Math.random()*options.length)];
  const ranked=options.map(option=>{
    const {move}=option;
    const type=getTypeModifier(aiPlayer.card.type1,target.card);
    const adjusted=move.damage+type+(move.effect?.type==='lowHpBonus' && aiPlayer.hp<=aiPlayer.card.hp/2?move.effect.amount:0);
    let score=adjusted + Math.max(0,Math.min(target.shield,adjusted))*.18;
    const e=move.effect;
    if(e){
      if(e.type==='poison'||e.type==='burn') score+=target.hp>e.amount*2?9:4;
      if(e.type==='heal') score+=(aiPlayer.card.hp-aiPlayer.hp>e.amount?e.amount:0)*.8;
      if(e.type==='shield') score+=Math.min(e.amount,aiPlayer.card.hp-aiPlayer.hp)*.45;
      if(e.type==='reduce') score+=6;
      if(e.type==='paralysis') score+=7;
      if(e.type==='mana') score+=e.amount*1.3;
      if(e.type==='breakShield') score+=Math.min(target.shield,e.amount)*.8;
    }
    if(difficulty==='dificil'){
      if(target.hp<=adjusted) score+=18;
      if(aiPlayer.hp<=aiPlayer.card.hp*.3 && e?.type==='heal') score+=16;
      if(aiPlayer.hp<=aiPlayer.card.hp*.35 && e?.type==='shield') score+=10;
      score-=move.cost*.7;
    }
    return {...option,score};
  }).sort((a,b)=>b.score-a.score);
  if(difficulty==='medio' && Math.random()<.16) return options[Math.floor(Math.random()*options.length)];
  return ranked[0];
}
