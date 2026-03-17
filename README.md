# Marmoraria Online

Aplicacao web para marmorarias com:
- studio 3D de cortes
- orcamento comercial
- painel de licencas
- API local para licencas, clientes, estoque, orcamentos e producao

## Rodando localmente

Pre-requisitos:
- Node.js 18+

Passos:
1. Instale as dependencias com `npm install`
2. Crie um arquivo `.env.local` com base em `.env.example`
3. Rode a API com `npm run server`
4. Rode o frontend com `npm run dev`

Frontend local:
- `http://127.0.0.1:3000`

API local:
- `http://127.0.0.1:4010/api`

## Variaveis de ambiente

Exemplo em [`.env.example`](/C:/Users/levi.araujo/Downloads/marmorariaonline-main/marmorariaonline-main/.env.example):
- `VITE_GEMINI_API_KEY`
- `VITE_LICENSE_API_URL`
- `VITE_SYSTEM_API_URL`

## Deploy recomendado

### Opcao 1: Render

O projeto ja inclui [`render.yaml`](/C:/Users/levi.araujo/Downloads/marmorariaonline-main/marmorariaonline-main/render.yaml) para subir:
- um servico web Node para a API
- um site estatico para o frontend

No Render:
1. conecte o repositorio GitHub
2. escolha `Blueprint`
3. selecione este projeto
4. defina no site estatico:
   - `VITE_LICENSE_API_URL=https://SEU-BACKEND.onrender.com/api`
   - `VITE_SYSTEM_API_URL=https://SEU-BACKEND.onrender.com/api`
   - `VITE_GEMINI_API_KEY=sua_chave`

### Opcao 2: Vercel + Render

Use:
- Vercel para o frontend
- Render para a API Node

O frontend ja inclui [`vercel.json`](/C:/Users/levi.araujo/Downloads/marmorariaonline-main/marmorariaonline-main/vercel.json).

Na Vercel, configure:
- `VITE_LICENSE_API_URL=https://SEU-BACKEND.onrender.com/api`
- `VITE_SYSTEM_API_URL=https://SEU-BACKEND.onrender.com/api`
- `VITE_GEMINI_API_KEY=sua_chave`

Na Render, publique a API com:
- Build Command: `npm install`
- Start Command: `npm run server`

## Scripts

- `npm run dev` inicia o frontend
- `npm run server` inicia a API
- `npm run build` gera o build do frontend
