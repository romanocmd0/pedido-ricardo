CREATE TABLE IF NOT EXISTS months (
    month_key TEXT PRIMARY KEY,
    year_number INTEGER NOT NULL,
    month_number INTEGER NOT NULL,
    month_label TEXT NOT NULL,
    month_title TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    month_key TEXT,
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
CREATE INDEX IF NOT EXISTS idx_records_month ON records (month_key);
CREATE INDEX IF NOT EXISTS idx_months_sort ON months (year_number, month_number);
