export function buildTurnOrder(participants){
  const a=participants.filter(p=>p.team==='A');
  const b=participants.filter(p=>p.team==='B');
  const order=[];const count=Math.max(a.length,b.length);
  for(let i=0;i<count;i++){if(a[i])order.push(a[i]);if(b[i])order.push(b[i]);}
  return order;
}
export function livingTeamCount(match,team){return match.players.filter(p=>p.team===team && !p.fainted).length;}
export function opposingPlayers(match,player){return match.players.filter(p=>p.team!==player.team && !p.fainted);}
