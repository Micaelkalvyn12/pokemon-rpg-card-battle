const row = (id,name,type,hp,a1,d1,a2,d2,effect1=null,effect2=null) => {
  const [move1,move1Cost=2,desc1='Executa um ataque do tipo do Pokémon.'] = a1;
  const [move2,move2Cost=4,desc2='Executa um ataque especial.'] = a2;
  const primary = type.split('/')[0];
  const secondary = type.split('/')[1] || '';
  return {
    id:String(id),name,type1:primary,type2:secondary,hp,
    // Parâmetros iniciais editáveis do jogo; não são apresentados como estatísticas oficiais.
    atk:Math.max(45,Math.round(d2*2.25)),def:Math.max(35,Math.round(hp*.82)),
    spAtk:Math.max(45,Math.round(d1*2.35)),spDef:Math.max(35,Math.round(hp*.78)),
    image:'',
    attacks:[
      {name:move1,description:desc1,damage:d1,cost:move1Cost,category:'special',effect:effect1},
      {name:move2,description:desc2,damage:d2,cost:move2Cost,category:'special',effect:effect2}
    ],
    createdAt:Date.now(),updatedAt:Date.now()
  };
};
const E = {
  poison:{type:'poison',amount:2,duration:2,label:'Veneno'},
  burn:{type:'burn',amount:3,duration:2,label:'Queimadura'},
  paralyze:{type:'paralysis',amount:4,duration:1,label:'Paralisia'},
  shield:{type:'shield',amount:6,label:'Escudo +6'},
  heal6:{type:'heal',amount:6,label:'Cura +6'},
  heal8:{type:'heal',amount:8,label:'Cura +8'},
  reduce3:{type:'reduce',amount:3,label:'Redução de dano 3'},
  reduce4:{type:'reduce',amount:4,label:'Redução de dano 4'},
  mana2:{type:'mana',amount:2,label:'Mana +2'},
  mana3:{type:'mana',amount:3,label:'Mana +3'},
  break5:{type:'breakShield',amount:5,label:'Quebra-escudo'},
  break6:{type:'breakShield',amount:6,label:'Quebra-escudo'},
  bonus3:{type:'bonus',amount:3,label:'Próximo ataque +3'},
  bonus5Low:{type:'lowHpBonus',amount:5,label:'Fúria +5 com pouca vida'},
  reflect5:{type:'reflect',amount:5,label:'Reflexão 5'},
  ignore4:{type:'pierce',amount:4,label:'Ignora 4 de escudo'}
};
export const DEFAULT_CARDS = [
 row(1,'Mew','Psíquico',83,['Onda Psíquica',2,'Uma onda de energia mental atinge o oponente.'],24,['Explosão Mental',4,'Libera uma explosão psíquica e cria uma barreira.'],28,null,E.shield),
 row(2,'Wartortle','Água',71,['Jato d’Água',2],19,['Giro de Concha',4],24,null,E.shield),
 row(3,'Pidgeotto','Normal/Voador',64,['Corte de Asa',2],19,['Tornado Aéreo',4],22,null,E.reduce3),
 row(4,'Pikachu','Elétrico',64,['Choque Elétrico',2],18,['Investida Volt',4],23,null,E.paralyze),
 row(5,'Nidoking','Veneno/Terra',73,['Terremoto',2],25,['Bomba de Lodo',4],29,null,E.poison),
 row(6,'Clefairy','Fada',66,['Brilho Encantado',2],19,['Desejo',4,'Faz um desejo que restaura parte da própria vida.'],16,null,E.heal8),
 row(7,'Meowth','Normal',56,['Arranhão',2],17,['Moeda Afiada',4,'Lança uma moeda cortante e recupera energia.'],22,null,E.mana2),
 row(8,'Psyduck','Água',61,['Jato Confuso',2],19,['Pulso Psíquico',4],23,null,E.reduce4),
 row(9,'Alakazam','Psíquico',68,['Onda Mental',2],28,['Colapso Psíquico',4],33,null,E.break5),
 row(10,'Gengar','Fantasma/Veneno',63,['Bola Sombria',2],27,['Névoa Venenosa',4],32,null,E.poison),
 row(11,'Aggron','Aço/Pedra',84,['Cauda de Ferro',2],25,['Impacto Rochoso',4],30,null,E.shield),
 row(12,'Charizard','Fogo/Voador',74,['Chama Aérea',2],25,['Fúria de Fogo',4],26,null,E.burn),
 row(13,'Ivysaur','Planta/Veneno',69,['Chicote de Vinha',2],19,['Raio Solar',4],26,null,E.reduce3),
 row(14,'Snorlax','Normal',88,['Pancada Pesada',2],25,['Investida Total',4],30,null,E.heal6),
 row(15,'Dragonite','Dragão/Voador',81,['Garra do Dragão',2],28,['Furacão',4],28,null,E.reduce4),
 row(16,'Omanyte','Pedra/Água',67,['Poder Ancestral',2],22,['Concha Cortante',4],21,null,E.shield),
 row(17,'Jolteon','Elétrico',71,['Raio Veloz',2],25,['Investida Relâmpago',4],24,null,E.paralyze),
 row(18,'Ditto','Normal',83,['Golpe Transformado',2],17,['Cópia Adaptável',4],22,null,E.bonus3),
 row(19,'Lapras','Água/Gelo',84,['Pulso de Água',2],22,['Nevasca Glacial',4],27,null,E.reduce4),
 row(20,'Magikarp','Água',54,['Splash Attack',2],11,['Salto Desesperado',4],16,null,E.bonus5Low),
 row(21,'Jynx','Gelo/Psíquico',68,['Beijo Gelado',2],25,['Psíquico Glacial',4],30,null,E.reduce4),
 row(22,'Starmine','Água/Psíquico',73,['Hidro Pulso',2],24,['Raio Cósmico',4],28,null,E.mana3),
 row(23,'Eevee','Normal',64,['Investida Rápida',2],18,['Mordida Evolutiva',4],22,null,E.shield),
 row(24,'Goldeen','Água',62,['Chifre Aquático',2],20,['Redemoinho',4],24,null,E.reduce3),
 row(25,'Cubone','Terra',64,['Osso Rápido',2],18,['Bumerangue Ósseo',4],22,null,{type:'bonusVsShield',amount:4,label:'+4 contra escudos'}),
 row(26,'Tinkaton','Fada/Aço',78,['Martelada de Aço',2],21,['Martelo Gigaton',4],25,null,E.break6),
 row(27,'Tangela','Planta',71,['Chicote de Cipó',2],24,['Drenagem Solar',4],28,null,E.heal6),
 row(28,'Articuno','Gelo/Voador',85,['Raio Congelante',2],23,['Nevasca Lendária',4],28,null,E.reduce4),
 row(29,'Seadra','Água',68,['Jato de Água',2],23,['Pulso do Dragão',4],28,null,E.reduce3),
 row(30,'Slowbro','Água/Psíquico',81,['Onda Psíquica',2],24,['Surf Telecinético',4],28,null,E.shield),
 row(31,'Machamp','Lutador',76,['Soco Dinâmico',2],27,['Combo de Quatro Golpes',4],32,null,E.reduce4),
 row(32,'Arcanine','Fogo',76,['Lança-Chamas',2],24,['Presas Flamejantes',4],30,null,E.burn),
 row(33,'Porygon','Normal',70,['Tri-Ataque Digital',2],22,['Raio de Dados',4],27,null,E.mana3),
 row(34,'Krabby','Água',61,['Pinça Poderosa',2],24,['Martelo de Pinça',4],29,null,E.break6),
 row(35,'Spearow','Normal/Voador',54,['Bicada',2],19,['Mergulho Aéreo',4],24,null,E.reduce3),
 row(36,'Zubat','Veneno/Voador',56,['Mordida',2],17,['Ferrão Venenoso',4],22,null,E.poison),
 row(37,'Dewgong','Água/Gelo',78,['Sopro Gelado',2],20,['Cauda Aquática',4],25,null,E.reduce3),
 row(38,'Pichu','Elétrico',50,['Choque',2],16,['Faísca',4],21,null,E.paralyze),
 row(39,'Meganium','Planta',80,['Folha Navalha',2],22,['Dança das Pétalas',4],26,null,E.heal6),
 row(40,'Cyndaquil','Fogo',59,['Brasas',2],19,['Roda de Fogo',4],23,null,E.burn),
 row(41,'Totodile','Água',64,['Jato d’Água',2],17,['Mordida Selvagem',4],24,null,E.reduce3),
 row(42,'Togepi','Fada',64,['Vento de Fada',2],16,['Brilho Encantado',4],21,null,E.shield),
 row(43,'Ampharos','Elétrico',78,['Raio',2],25,['Pulso do Dragão',4],28,null,E.reduce4),
 row(44,'Sudowoodo','Pedra',76,['Deslizamento de Pedras',2],24,['Contra-Ataque',4],28,null,E.shield),
 row(45,'Wooper','Água/Terra',58,['Tiro de Lama',2],15,['Investida Aquática',4],22,null,E.reduce3),
 row(46,'Espeon','Psíquico',71,['Psíquico',2],27,['Onda Mental',4],32,null,E.break5),
 row(47,'Umbreon','Sombrio',88,['Ataque Sombrio',2],19,['Pulso Noturno',4],24,null,E.shield),
 row(48,'Wobbuffet','Psíquico',84,['Contra-Ataque',2],14,['Espelho Psíquico',4],23,null,E.reflect5),
 row(49,'Lugia','Psíquico/Voador',96,['Aeroblasto',2],22,['Tempestade Psíquica',4],27,null,E.shield),
 row(50,'Gardevoir','Psíquico/Fada',75,['Força Lunar',2],27,['Explosão Psíquica',4],31,null,E.heal6),
 row(51,'Maushold','Normal',71,['Investida em Grupo',2],21,['Ataque Coordenado',4],25,null,E.bonus3),
 row(52,'Floragato','Planta',67,['Lâmina de Folhas',2],21,['Truque Floral',4],26,null,E.ignore4),
 row(53,'Gyarados','Água/Voador',79,['Cascata',2,'Avança com uma poderosa corrente de água.'],27,['Fúria do Dragão',4,'Desencadeia um ataque feroz e desequilibra o adversário.'],33,null,E.reduce4),
 // Cartas adicionais identificadas no PDF enviado pelo jogador.
 row(54,'Squirtle','Água',71,['Jato de Bolhas',2],20,['Hidro Jato',4],25,null,E.shield),
 row(55,'Pidgeot','Normal/Voador',64,['Ataque de Asa',2],23,['Vendaval',4],28,null,E.reduce3),
 row(56,'Seaking','Água',69,['Chifre Perfurante',2],22,['Redemoinho',4],27,null,E.reduce3),
 row(57,'Slowking','Água/Psíquico',82,['Confusão',2],24,['Poder do Rei',4],29,null,E.heal6),
 row(58,'Quilava','Fogo',65,['Brasa',2],22,['Explosão de Fogo',4],28,null,E.burn),
 row(59,'Mewtwo','Psíquico',88,['Onda Psíquica',2],31,['Ataque Supremo',4],36,null,E.break6),
 row(60,'Meowscarada','Planta/Sombrio',78,['Folha Mágica',2],26,['Truque Floral',4],31,null,E.ignore4),
 row(61,'Mimikyu','Fantasma/Fada',70,['Garra Sombria',2],24,['Susto Fantasma',4],30,null,E.reduce4),
 row(62,'Blastoise','Água',86,['Hidro Canhão',2],26,['Canhão de Água',4],32,null,E.shield),
 row(63,'Onix','Pedra/Terra',73,['Arremesso de Pedras',2],20,['Terremoto',4],27,null,E.shield),
 row(64,'Vaporeon','Água',82,['Jato d’Água',2],24,['Hidrobomba',4],30,null,E.heal6),
 row(65,'Donphan','Terra',75,['Rolagem',2],23,['Terremoto',4],29,null,E.reduce4),
 row(66,'Rayquaza','Dragão/Voador',93,['Corte Aéreo',2],31,['Ascensão do Dragão',4],37,null,E.bonus3),
 row(67,'Mismagius','Fantasma',70,['Onda Sombria',2],25,['Magia Fantasma',4],31,null,E.poison),
 row(68,'Milotic','Água',84,['Pulso de Água',2],24,['Cauda Aquática',4],30,null,E.heal6),
 row(69,'Reshiram','Dragão/Fogo',90,['Chama Cruzada',2],30,['Fogo Azul',4],36,null,E.burn),
 row(70,'Zekrom','Dragão/Elétrico',90,['Raio Negro',2],30,['Relâmpago Cruzado',4],36,null,E.paralyze),
 row(71,'Lucario','Lutador/Aço',79,['Esfera de Aura',2],26,['Punho de Aço',4],32,null,E.break6),
 row(72,'Sylveon','Fada',81,['Brilho Mágico',2],25,['Voz Lunar',4],31,null,E.heal6)
];

// Índices das artes do PDF (páginas 1–56 e 63), em uma única folha de sprites.
const PDF_ART_INDEX = {
  Mew:0, Squirtle:1, Pidgeot:2, Pikachu:3, Nidoking:4, Clefairy:5, Gengar:6,
  Omanyte:7, Alakazam:8, Aggron:9, Psyduck:10, Charizard:11, Ivysaur:12,
  Dragonite:13, Snorlax:14, Jolteon:15, Ditto:16, Lapras:17, Starmine:18,
  Tangela:19, Eevee:20, Cubone:21, Tinkaton:22, Machamp:23, Articuno:24,
  Seaking:25, Slowking:26, Dewgong:27, Arcanine:28, Pichu:29, Meganium:30,
  Quilava:31, Totodile:32, Ampharos:33, Sudowoodo:34, Espeon:35, Umbreon:36,
  Wobbuffet:37, Mewtwo:38, Meowscarada:39, Lugia:40, Gardevoir:41, Maushold:42,
  Mimikyu:43, Blastoise:44, Onix:45, Vaporeon:46, Gyarados:47, Donphan:48,
  Rayquaza:49, Mismagius:50, Milotic:51, Reshiram:52, Zekrom:53, Lucario:54,
  Sylveon:55, Spearow:56
};
DEFAULT_CARDS.forEach(card => {
  if (Object.prototype.hasOwnProperty.call(PDF_ART_INDEX, card.name)) {
    card.spriteIndex = PDF_ART_INDEX[card.name];
  }
});
