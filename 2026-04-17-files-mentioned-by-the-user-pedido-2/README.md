# Sistema Web de Controle Mensal

Este projeto transforma a planilha `Pedido Ricardo.xlsx` em um sistema web simples com:

- abas por mes;
- cadastro diario direto no mes ativo;
- CRUD completo;
- busca e ordenacao por colunas;
- calculo automatico de totais;
- resumo mensal com metricas;
- persistencia em banco SQLite.

## Estrutura atual do banco

Tabela `months`

- `month_key`: chave no formato `YYYY-MM`
- `year_number`: ano do mes
- `month_number`: numero do mes
- `month_label`: rotulo em caixa alta (`ABRIL`, `MAIO`)
- `month_title`: titulo amigavel (`Abril 2026`)

Tabela `records`

- `id`: identificador do registro
- `month_key`: mes ao qual o registro pertence
- `partner_name`: nome do parceiro ou cliente
- `transferencia_qty`: quantidade de transferencias
- `cautelar_qty`: quantidade de cautelares
- `pesquisa_qty`: quantidade de pesquisas
- `unit_transferencia`: valor unitario de transferencia
- `unit_cautelar`: valor unitario de cautelar
- `unit_pesquisa`: valor unitario de pesquisa
- `total_value`: total calculado automaticamente
- `created_at` / `updated_at`: auditoria basica

## Como os dados antigos foram adaptados

- Os dados historicos da planilha foram importados para `records`.
- Os meses antigos foram convertidos para chaves mensais em `months`.
- O sistema cria automaticamente os meses seguintes, mesmo sem registros.
- Meses novos comecam vazios e aparecem como abas normalmente.

## Funcionalidades principais

- navegar entre meses usando abas no topo;
- registrar dados manualmente no mes selecionado;
- editar e excluir registros existentes;
- atualizar totais automaticamente no formulario e no resumo do mes;
- mostrar valor total ao lado da busca;
- exibir quantidade e percentual de transferencias, cautelares e pesquisas.

## Como rodar localmente

Requisitos:

- Python 3.11+ instalado
- `pip` disponivel

Passos:

1. Abra um terminal na pasta do projeto.
2. Crie o ambiente virtual:

```powershell
python -m venv .venv
```

3. Ative o ambiente:

```powershell
.venv\Scripts\Activate.ps1
```

4. Instale as dependencias:

```powershell
pip install -r requirements.txt
```

5. Rode a aplicacao:

```powershell
python app.py
```

6. Abra no navegador:

```text
http://127.0.0.1:5000
```

## Deploy

Para publicar no Railway, siga o passo a passo em `DEPLOY_RAILWAY.md`.

## Estrutura do projeto

```text
app.py
schema.sql
requirements.txt
README.md
DEPLOY_RAILWAY.md
data/
  seed_data.json
templates/
  index.html
static/
  styles.css
  app.js
```
