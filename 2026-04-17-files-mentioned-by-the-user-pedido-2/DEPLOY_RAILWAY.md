# Deploy no Railway

Este projeto foi preparado para deploy no Railway com SQLite persistente em volume.

## Por que Railway

Entre as opcoes gratuitas citadas, o Railway e o mais adequado para este projeto porque suporta:

- app Flask em deploy direto;
- volume persistente para guardar o arquivo SQLite;
- dominio publico gerado pela propria plataforma.

Observacao importante:

- Render Free nao e adequado para SQLite persistente porque o filesystem local e efemero e os arquivos locais se perdem em restart/redeploy.
- Vercel nao e a melhor opcao para este caso porque Flask em Vercel roda em modelo serverless e SQLite local nao e uma escolha confiavel para persistencia diaria.

## Arquivos de producao incluidos

- `app.py`: agora le `PORT`, `DATA_DIR`, `DATABASE_PATH` e `SEED_PATH`
- `requirements.txt`: inclui `gunicorn`
- `Procfile`: comando web para producao
- `railway.toml`: start command e healthcheck
- `.env.example`: exemplo de variaveis locais

## Passo a passo

### 1. Suba o projeto para um repositório Git

Pode ser GitHub, GitLab ou Bitbucket. Exemplo com GitHub:

```powershell
cd C:\Users\JK\Documents\Codex\2026-04-17-files-mentioned-by-the-user-pedido-2
git init
git add .
git commit -m "Preparar sistema Flask para deploy no Railway"
```

Depois crie um repositório remoto e envie o codigo.

### 2. Crie um projeto no Railway

1. Acesse [railway.com](https://railway.com/).
2. Clique em `New Project`.
3. Escolha `Deploy from GitHub repo`.
4. Selecione o repositório deste projeto.

### 3. Configure o volume persistente

Como o banco e SQLite, voce precisa anexar um volume para nao perder os dados.

1. No projeto Railway, abra o menu do canvas.
2. Adicione um `Volume`.
3. Conecte esse volume ao servico web.
4. Defina o mount path como:

```text
/data
```

Esse caminho evita esconder o arquivo `data/seed_data.json` do repositorio.

### 4. Configure as variaveis de ambiente

No servico Railway, em `Variables`, configure:

```text
PORT=8080
DATA_DIR=/data
DATABASE_PATH=/data/pedidos.db
SEED_PATH=/app/data/seed_data.json
```

Esses valores deixam:

- o banco persistente no volume;
- o seed historico vindo do repositorio na primeira subida.

### 5. Confirme o start command

O projeto ja inclui:

- `Procfile`
- `railway.toml`

O Railway deve iniciar com:

```text
gunicorn --bind 0.0.0.0:$PORT app:app
```

### 6. Gere o dominio publico

1. Abra o servico no Railway.
2. Entre em `Settings` > `Networking`.
3. Clique em `Generate Domain`.
4. O Railway vai criar uma URL publica.

Exemplo:

```text
https://seu-app.up.railway.app
```

### 7. Teste o deploy

Teste no navegador:

- `/`
- `/healthz`
- cadastro de novo registro
- edicao e exclusao
- persistencia apos restart

## Checklist final

- frontend integrado ao Flask
- backend em producao com `gunicorn`
- porta dinamica via `PORT`
- host `0.0.0.0`
- SQLite em volume persistente
- healthcheck configurado
- dominio publico gerado no Railway
