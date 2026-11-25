# Pokémon RPG — Card Battle (V1.2)

Jogo local de batalha por cartas, feito com HTML, CSS e JavaScript puro. A primeira execução cadastra 72 cartas. A atualização V1.2 inclui 57 artes fornecidas em PDF (páginas 1–56 e 63), artes de campo em maior resolução, animações de ataque/impacto, além de música ambiente e efeitos sonoros originais sintetizados no navegador. Imagens personalizadas carregadas pelo painel ficam no IndexedDB do navegador.

## Como executar

**Recomendado:** abra a pasta do projeto no VS Code e execute `index.html` usando a extensão Live Server.

**Alternativa com Python:** abra um terminal dentro da pasta `pokemon-rpg` e execute:

```bash
python -m http.server 8000
```

Depois acesse `http://localhost:8000` no navegador.

Não abra o `index.html` diretamente pelo caminho `file://`, porque os módulos JavaScript e o IndexedDB podem não funcionar corretamente nesse modo.

## Modos incluídos

- **1 vs 1:** dois jogadores locais alternam os turnos no mesmo dispositivo.
- **1 vs IA:** um jogador contra IA em dificuldade fácil, média ou difícil.
- **Batalha em equipe:** de 2 a 5 participantes, distribuídos entre Equipe A e Equipe B.

## Painel de cartas

Na tela inicial, escolha **Gerenciar Cartas**. Senha local da V1.2: `PokemonRPG`.

O painel permite:

- Cadastrar, editar e excluir cartas.
- Alterar nome, tipos, vida, quatro atributos e dois ataques.
- Carregar imagens PNG, JPG/JPEG ou WEBP de até 5 MB.
- Pesquisar e filtrar cartas por tipo.
- Exportar e importar as cartas como JSON, incluindo imagens.

**Atenção:** a senha é apenas uma barreira de interface no navegador. Ela está no código do cliente e não deve ser usada como autenticação real em uma versão hospedada na internet. Os dados são locais ao navegador e não são sincronizados entre dispositivos. Faça backups JSON regularmente.

## Regras implementadas

- Vida por Pokémon, mana máxima 20 e mana inicial 6.
- Recuperação de 3 manas no início dos turnos seguintes.
- Um ataque por turno, respeitando o custo de mana.
- Vantagem de tipo simplificada: +5 de dano; resistência: -3.
- Veneno, queimadura, paralisia, escudo, cura, redução de dano, reflexão, recuperação de mana, bônus e quebra/penetração de escudo.
- Vitória quando todos os Pokémon de uma equipe forem derrotados.

## Sobre os atributos-base das cartas

Os valores de vida e dano vêm da lista personalizada definida para este jogo. Os atributos Ataque, Defesa, Ataque Especial e Defesa Especial das 53 cartas iniciais são parâmetros iniciais editáveis de balanceamento, gerados para a V1.2; não devem ser tratados como estatísticas oficiais dos jogos Pokémon. O dano cadastrado no ataque é o valor utilizado diretamente na batalha nesta versão.

## Arquivos

- `index.html`: estrutura principal.
- `css/`: estilos da interface, cartas, batalha e painel administrativo.
- `js/data.js`: cartas iniciais.
- `js/database.js`: IndexedDB, importação e exportação.
- `js/combat-system.js`: regras de combate e efeitos.
- `js/ai.js`: decisões da IA.
- `js/type-chart.js`: tabela simplificada de efetividade.
- `js/teams.js`: organização de turnos e equipes.
- `js/main.js`: interface e fluxo do jogo.

## Limitações conhecidas da V1.2

- Batalhas multiplayer são locais no mesmo dispositivo; não há partidas pela internet.
- A biblioteca e as imagens ficam no perfil do navegador em que foram cadastradas.
- Os atributos adicionais ficam armazenados para versões futuras, mas ainda não alteram matematicamente o dano.
- As cartas iniciais usam uma representação tipográfica como placeholder até que o administrador carregue as artes desejadas.


## Publicar na internet com GitHub Pages

O projeto já inclui o workflow `.github/workflows/deploy-pages.yml`. Depois de enviar os arquivos para a branch `main` do repositório:

1. Abra **Settings → Pages** no repositório.
2. Em **Build and deployment**, selecione **GitHub Actions** como fonte.
3. Abra a aba **Actions** e aguarde o workflow **Deploy Pokémon RPG to GitHub Pages** terminar com sucesso.
4. O GitHub mostrará o endereço público em **Settings → Pages** e no resultado do workflow.

O site pode ser acessado pela internet, mas a V1.2 continua com batalhas locais no mesmo dispositivo. As cartas/imagens adicionadas pelo painel e os backups ficam no armazenamento do navegador atual (IndexedDB); não são compartilhados automaticamente com outros visitantes nem entre dispositivos. Para uma biblioteca global de cartas, autenticação real no painel ou partidas multiplayer pela internet, será necessário adicionar um backend e banco de dados.

A senha `PokemonRPG` está no código do navegador e serve apenas como bloqueio visual. Não a utilize como senha de segurança para dados privados.


## Artes do PDF e sprites

A V1.2 usa `assets/cards-sprite.webp` e `assets/battle-sprite.webp`, folhas de sprites derivadas das 57 páginas do PDF que contêm cartas (páginas 1–56 e 63). As páginas 57–62 eram ícones/modelos em branco e não foram cadastradas como Pokémon. As 19 cartas novas foram adicionadas; cartas antigas que não aparecem no PDF continuam disponíveis com seus placeholders até receberem uma imagem própria. A migração de IndexedDB adiciona as novas cartas e os índices de arte sem sobrescrever cartas personalizadas.

## Áudio

`js/audio.js` cria uma trilha ambiente e efeitos sonoros originais por Web Audio API. O navegador exige uma interação antes de liberar o áudio; use o botão `♫` no cabeçalho para ligar/desligar música e efeitos.
