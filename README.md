# Pokémon RPG — Card Battle

Versão 1.0 do jogo de batalhas por cartas Pokémon.

## Publicação

O site é publicado pelo GitHub Pages usando o workflow em `.github/workflows/pages.yml`.
A cada atualização da branch `main`, o workflow extrai o pacote do jogo e publica o conteúdo estático.

## Arquivos do jogo

O pacote completo de desenvolvimento está em `pokemon-rpg-v1.zip.b64` (arquivo ZIP codificado em Base64). O workflow o decodifica e publica a pasta `pokemon-rpg/` do pacote.

## Importante

- As batalhas são locais no mesmo dispositivo; esta versão não possui multiplayer pela internet.
- Cartas e imagens cadastradas no painel ficam no IndexedDB do navegador local e não são compartilhadas entre visitantes.
- A senha do painel administrativo está no código do cliente e é apenas uma barreira visual, não uma autenticação segura.


## Publicação automática

Atualizações na branch `main` iniciam o deploy do GitHub Pages pelo workflow `Publish Pokémon RPG`.
