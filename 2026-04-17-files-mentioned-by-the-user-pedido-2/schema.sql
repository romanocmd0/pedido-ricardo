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
    caminhao_transferencia_qty INTEGER NOT NULL DEFAULT 0,
    combo_transferencia_qty INTEGER NOT NULL DEFAULT 0,
    cautelar_qty INTEGER NOT NULL DEFAULT 0,
    pesquisa_qty INTEGER NOT NULL DEFAULT 0,
    unit_transferencia REAL NOT NULL DEFAULT 0,
    unit_caminhao_transferencia REAL NOT NULL DEFAULT 0,
    unit_combo_transferencia REAL NOT NULL DEFAULT 0,
    unit_cautelar REAL NOT NULL DEFAULT 0,
    unit_pesquisa REAL NOT NULL DEFAULT 0,
    total_value REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cash_days (
    cash_date TEXT PRIMARY KEY,
    year_number INTEGER NOT NULL,
    month_number INTEGER NOT NULL,
    day_number INTEGER NOT NULL,
    month_title TEXT NOT NULL,
    finalized INTEGER NOT NULL DEFAULT 0,
    finalized_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cash_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cash_date TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    plate TEXT,
    service_name TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL,
    payment_group TEXT NOT NULL DEFAULT 'outras',
    flow_type TEXT NOT NULL DEFAULT 'entrada',
    synced_to_monthly INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cash_date) REFERENCES cash_days (cash_date)
);

CREATE INDEX IF NOT EXISTS idx_records_partner ON records (partner_name);
CREATE INDEX IF NOT EXISTS idx_records_month ON records (month_key);
CREATE INDEX IF NOT EXISTS idx_months_sort ON months (year_number, month_number);
CREATE INDEX IF NOT EXISTS idx_cash_entries_date ON cash_entries (cash_date);
CREATE INDEX IF NOT EXISTS idx_cash_entries_customer ON cash_entries (customer_name);
CREATE INDEX IF NOT EXISTS idx_cash_days_sort ON cash_days (year_number, month_number, day_number);
