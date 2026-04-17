# Relatorio Mensal

Sistema web em Flask para controle mensal de pedidos com:

- abas por mes no intervalo de Abril de 2026 ate Dezembro de 2030;
- tabela principal com calculos automaticos;
- tabela separada de `Clientes Particulares`;
- edicao inline;
- exportacao em Excel e PDF;
- tema azul escuro com destaque dourado.

## Estrutura do banco

Tabela `months`

- calendario fixo de `2026-04` ate `2030-12`

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

Tabela `private_clients`

- `month_key`
- `field_1` ate `field_10`

## Regras aplicadas

- registros anteriores a Abril de 2026 sao removidos;
- meses apos Dezembro de 2030 nao sao exibidos;
- os dados de `Clientes Particulares` nao se misturam com a tabela principal;
- os totais detalhados do mes consideram apenas o mes selecionado.

## Exportacao

- `/api/export/<month_key>.xlsx`
- `/api/export/<month_key>.pdf`

## Execucao local

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```
