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
    combo_transferencia_qty INTEGER NOT NULL DEFAULT 0,
    cautelar_qty INTEGER NOT NULL DEFAULT 0,
    pesquisa_qty INTEGER NOT NULL DEFAULT 0,
    unit_transferencia REAL NOT NULL DEFAULT 0,
    unit_combo_transferencia REAL NOT NULL DEFAULT 0,
    unit_cautelar REAL NOT NULL DEFAULT 0,
    unit_pesquisa REAL NOT NULL DEFAULT 0,
    total_value REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS private_clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    month_key TEXT NOT NULL,
    field_1 TEXT NOT NULL DEFAULT '',
    field_2 TEXT NOT NULL DEFAULT '',
    field_3 TEXT NOT NULL DEFAULT '',
    field_4 TEXT NOT NULL DEFAULT '',
    field_5 TEXT NOT NULL DEFAULT '',
    field_6 TEXT NOT NULL DEFAULT '',
    field_7 TEXT NOT NULL DEFAULT '',
    field_8 TEXT NOT NULL DEFAULT '',
    field_9 TEXT NOT NULL DEFAULT '',
    field_10 TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_records_partner ON records (partner_name);
CREATE INDEX IF NOT EXISTS idx_records_month ON records (month_key);
CREATE INDEX IF NOT EXISTS idx_private_clients_month ON private_clients (month_key);
CREATE INDEX IF NOT EXISTS idx_months_sort ON months (year_number, month_number);
