// Tabela simplificada e editável de vantagens para a regra própria do jogo (+5 / -3).
const strongAgainst={
  Fogo:['Planta','Gelo','Inseto','Aço'],
  Água:['Fogo','Terra','Pedra'],
  Planta:['Água','Terra','Pedra'],
  Elétrico:['Água','Voador'],
  Gelo:['Planta','Terra','Voador','Dragão'],
  Lutador:['Normal','Gelo','Pedra','Sombrio','Aço'],
  Veneno:['Planta','Fada'],
  Terra:['Fogo','Elétrico','Veneno','Pedra','Aço'],
  Voador:['Planta','Lutador','Inseto'],
  Psíquico:['Lutador','Veneno'],
  Inseto:['Planta','Psíquico','Sombrio'],
  Pedra:['Fogo','Gelo','Voador','Inseto'],
  Fantasma:['Psíquico','Fantasma'],
  Dragão:['Dragão'],
  Sombrio:['Psíquico','Fantasma'],
  Aço:['Gelo','Pedra','Fada'],
  Fada:['Lutador','Dragão','Sombrio']
};
const weakAgainst={
  Fogo:['Água','Terra','Pedra'], Água:['Planta','Elétrico'], Planta:['Fogo','Gelo','Veneno','Voador','Inseto'],
  Elétrico:['Terra'], Gelo:['Fogo','Lutador','Pedra','Aço'], Lutador:['Voador','Psíquico','Fada'],
  Veneno:['Terra','Psíquico'], Terra:['Água','Planta','Gelo'], Voador:['Elétrico','Gelo','Pedra'],
  Psíquico:['Inseto','Fantasma','Sombrio'], Inseto:['Fogo','Voador','Pedra'], Pedra:['Água','Planta','Lutador','Terra','Aço'],
  Fantasma:['Fantasma','Sombrio'], Dragão:['Gelo','Dragão','Fada'], Sombrio:['Lutador','Inseto','Fada'],
  Aço:['Fogo','Lutador','Terra'], Fada:['Veneno','Aço']
};
export function getTypeModifier(attackType,target){
  const defenders=[target.type1,target.type2].filter(Boolean);
  if(defenders.some(t=>(strongAgainst[attackType]||[]).includes(t))) return 5;
  if(defenders.some(t=>(weakAgainst[attackType]||[]).includes(t))) return -3;
  return 0;
}
