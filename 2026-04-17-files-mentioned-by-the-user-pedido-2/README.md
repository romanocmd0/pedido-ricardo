# Relatorio Mensal

Sistema web em Flask para controle mensal de pedidos com:

- abas por mes de Abril de 2026 ate Dezembro de 2050;
- tabela principal com calculos automaticos;
- edicao inline;
- exportacao em Excel e PDF;
- area separada de comparacao entre meses;
- area separada de comparacao entre clientes;
- dashboard visual com evolucao e comparacao por tipo.

## Rotas principais

- `/`: tela principal
- `/comparison`: analise comparativa entre meses
- `/client-comparison`: analise comparativa entre clientes
- `/api/records`: dados da tela principal
- `/api/comparison`: dados analiticos
- `/api/export/<month_key>.xlsx`
- `/api/export/<month_key>.pdf`

## Estrutura do banco

Tabela `months`

- calendario fixo de `2026-04` ate `2050-12`

Tabela `records`

- `partner_name`
- `transferencia_qty`
- `caminhao_transferencia_qty`
- `combo_transferencia_qty`
- `cautelar_qty`
- `pesquisa_qty`
- `unit_transferencia`
- `unit_caminhao_transferencia`
- `unit_combo_transferencia`
- `unit_cautelar`
- `unit_pesquisa`
- `total_value`

## Observacoes

- a estrutura de `Clientes Particulares` foi removida;
- o sistema preserva os dados existentes da tabela principal;
- os meses novos sao gerados vazios automaticamente ate Dezembro de 2050.
