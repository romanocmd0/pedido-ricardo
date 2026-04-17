# Relatorio Mensal

Sistema web em Flask para controle mensal de pedidos, com abas por mes, calculos automaticos, edicao inline e exportacao profissional.

## Recursos principais

- navegacao por meses com criacao automatica de meses futuros;
- cadastro diario por mes;
- CRUD completo;
- edicao inline na tabela;
- novo campo `Transf. de Combo`;
- resumo mensal com totais e percentuais;
- exportacao do mes atual em Excel e PDF;
- persistencia em SQLite.

## Estrutura do banco

Tabela `months`

- `month_key`: chave `YYYY-MM`
- `year_number`: ano do mes
- `month_number`: numero do mes
- `month_label`: rotulo em caixa alta
- `month_title`: titulo amigavel

Tabela `records`

- `partner_name`
- `transferencia_qty`
- `combo_transferencia_qty`
- `cautelar_qty`
- `pesquisa_qty`
- `unit_transferencia`
- `unit_combo_transferencia`
- `unit_cautelar`
- `unit_pesquisa`
- `total_value`

## Exportacao

Rotas disponiveis:

- `/api/export/<month_key>.xlsx`
- `/api/export/<month_key>.pdf`

Os arquivos exportam:

- todos os registros do mes atual;
- valor total;
- totais por tipo;
- percentuais mensais.

## Como rodar localmente

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

Abra:

```text
http://127.0.0.1:5000
```

## Dependencias principais

- Flask
- gunicorn
- openpyxl
- reportlab
