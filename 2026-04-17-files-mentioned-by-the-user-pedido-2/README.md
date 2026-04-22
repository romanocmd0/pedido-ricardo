# Relatorio Mensal

Sistema web em Flask para controle mensal de pedidos com:

- abas por mes de Abril de 2026 ate Dezembro de 2050;
- tabela principal com calculos automaticos;
- edicao inline;
- exportacao em Excel e PDF;
- exportacao direta por aba/mes em Excel e PDF;
- tela de login protegendo o acesso ao sistema;
- modulo de fluxo de caixa diario com arquivo por ano, mes e dia;
- relatorio final consolidado a partir dos caixas finalizados;
- area separada de comparacao entre meses;
- area separada de comparacao entre clientes;
- dashboard visual com evolucao e comparacao por tipo.

## Rotas principais

- `/`: tela principal
- `/login`: tela de acesso protegido
- `/cash-flow`: fluxo de caixa diario
- `/final-report`: relatorio final consolidado
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

Tabela `cash_days`

- `cash_date`
- `year_number`
- `month_number`
- `day_number`
- `finalized`
- `finalized_at`

Tabela `cash_entries`

- `cash_date`
- `customer_name`
- `plate`
- `service_name`
- `amount`
- `payment_method`
- `payment_group`
- `flow_type`

## Observacoes

- a estrutura de `Clientes Particulares` foi removida;
- o sistema preserva os dados existentes da tabela principal;
- os meses novos sao gerados vazios automaticamente ate Dezembro de 2050.

## Senha de acesso

O sistema usa a variavel de ambiente `APP_PASSWORD` para proteger o acesso.

Para rodar localmente no PowerShell:

```powershell
$env:APP_PASSWORD='@Certive123'
$env:SECRET_KEY='troque-por-uma-chave-grande-e-aleatoria'
flask --app app run
```

No Railway:

- Abra o projeto no Railway.
- Entre em `Variables`.
- Adicione `APP_PASSWORD` com o valor da senha atual.
- Adicione `SECRET_KEY` com uma chave longa e aleatoria para manter as sessoes seguras.
- Salve e faca um novo deploy.
