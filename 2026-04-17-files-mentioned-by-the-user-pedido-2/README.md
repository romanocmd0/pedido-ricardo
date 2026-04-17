# Sistema Web para substituir a planilha

Este projeto transforma a planilha `Pedido Ricardo.xlsx` em um sistema web simples com:

- cadastro, edição e exclusão de registros;
- filtro por período e busca textual;
- ordenação por colunas;
- interface responsiva para desktop e celular;
- persistência em banco SQLite.

## Estrutura do banco

Tabela principal: `records`

- `id`: identificador do registro
- `reference_date`: data do lançamento para os novos registros
- `period_label`: período de referência em texto (`ABRIL`, `MAIO` etc.)
- `period_sort`: apoio para ordenação dos períodos
- `partner_name`: nome do parceiro/cliente
- `transferencia_qty`: quantidade de transferências
- `cautelar_qty`: quantidade de cautelares
- `pesquisa_qty`: quantidade de pesquisas
- `unit_transferencia`: valor unitário de transferência
- `unit_cautelar`: valor unitário de cautelar
- `unit_pesquisa`: valor unitário de pesquisa
- `total_value`: total calculado automaticamente
- `created_at` / `updated_at`: auditoria básica

## Como os dados do Excel foram mapeados

Abas encontradas:

- `SETEMBRO`
- `OUTUBRO`
- `NOVEMBRO`
- `DEZEMBRO`
- `JANEIRO`
- `FEVEREIRO`
- `MARÇO`
- `ABRIL`

Colunas da planilha:

- `A`: parceiro/cliente
- `B`: `TRANSFERENCIA`
- `C`: `CAUTELAR`
- `D`: `PESQUISA`
- `E`: `VALOR TOTAL`
- `F`: `VALOR TRANSFERENCIA`
- `G`: `VALOR CAUTELAR`
- `H`: `VALOR PESQUISA`

Carga inicial gerada:

- `611` registros históricos extraídos do Excel
- arquivo: `data/seed_data.json`

## Como rodar localmente

Requisitos:

- Python 3.11+ instalado
- `pip` disponível

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

4. Instale as dependências:

```powershell
pip install -r requirements.txt
```

5. Rode a aplicação:

```powershell
python app.py
```

6. Abra no navegador:

```text
http://127.0.0.1:5000
```

## Observações importantes

- Na primeira execução, o banco `data/pedidos.db` é criado automaticamente.
- Se o banco estiver vazio, a aplicação importa a carga inicial de `data/seed_data.json`.
- O total do registro é recalculado automaticamente no backend e no frontend.
- Para registros novos, a data preenchida define automaticamente o período do mês.
- Os dados históricos do Excel foram importados com `reference_date = null`, porque a planilha original separa por mês, mas não informa a data exata do lançamento.

## Estrutura do projeto

```text
app.py
requirements.txt
README.md
data/
  seed_data.json
templates/
  index.html
static/
  styles.css
  app.js
```
