CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference_date TEXT,
    period_label TEXT NOT NULL,
    period_sort INTEGER NOT NULL DEFAULT 99,
    partner_name TEXT NOT NULL,
    transferencia_qty INTEGER NOT NULL DEFAULT 0,
    cautelar_qty INTEGER NOT NULL DEFAULT 0,
    pesquisa_qty INTEGER NOT NULL DEFAULT 0,
    unit_transferencia REAL NOT NULL DEFAULT 0,
    unit_cautelar REAL NOT NULL DEFAULT 0,
    unit_pesquisa REAL NOT NULL DEFAULT 0,
    total_value REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_records_partner ON records (partner_name);
CREATE INDEX IF NOT EXISTS idx_records_period ON records (period_label, period_sort);
CREATE INDEX IF NOT EXISTS idx_records_date ON records (reference_date);
