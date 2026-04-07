# Site Namibia Oliveira (Psicologia)

Landing page em HTML/CSS/JS com carregamento dinamico das avaliacoes do Google Empresa via API oficial do Google Places.

## Estrutura
- `index.html`
- `styles.css`
- `script.js`
- `assets/`
- `server.js` (API + servidor estatico)
- `package.json`
- `.env.example`

## Integracao das avaliacoes do Google
A secao `#avaliacoes` busca dados em `GET /api/google-reviews`.

Fluxo da API:
1. Resolve o local pelo `GOOGLE_PLACE_ID` (recomendado) ou por `GOOGLE_PLACE_SEARCH_QUERY`.
2. Consulta detalhes no Google Places.
3. Retorna nota, total de avaliacoes e reviews para o front.

## Configuracao local
1. Instale dependencias:
   - `npm install`
2. Crie o `.env`:
   - copie `.env.example` para `.env`
3. Preencha ao menos:
   - `GOOGLE_PLACES_API_KEY`
   - `GOOGLE_PLACE_ID` (recomendado)
4. Rode:
   - `npm run dev`
5. Abra:
   - `http://localhost:3000`

## Variaveis de ambiente
- `GOOGLE_PLACES_API_KEY`: chave da API Google Places.
- `GOOGLE_PLACE_ID`: ID do local no Google Places (preferivel para precisao).
- `GOOGLE_PLACE_SEARCH_QUERY`: busca textual (fallback se nao houver place id).
- `GOOGLE_PLACE_LANGUAGE`: idioma, ex. `pt-BR`.
- `GOOGLE_PLACE_REGION`: regiao, ex. `BR`.
- `GOOGLE_REVIEWS_LIMIT`: numero maximo de reviews exibidos (1-10).
- `PORT`: porta do servidor.

## Publicacao
Para manter avaliacoes dinamicas sem expor chave no navegador, publique em ambiente com Node.js (Vercel, Render, Railway, VPS, etc.).
