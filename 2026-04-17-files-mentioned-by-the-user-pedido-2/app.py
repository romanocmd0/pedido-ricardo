from __future__ import annotations

import json
import os
import sqlite3
import unicodedata
from datetime import datetime
from pathlib import Path
from typing import Any

from flask import Flask, jsonify, render_template, request

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DATA_DIR = BASE_DIR / "data"
DATA_DIR = Path(os.getenv("DATA_DIR", str(DEFAULT_DATA_DIR))).resolve()
DATABASE_PATH = Path(os.getenv("DATABASE_PATH", str(DATA_DIR / "pedidos.db"))).resolve()
SEED_PATH = Path(os.getenv("SEED_PATH", str(DEFAULT_DATA_DIR / "seed_data.json"))).resolve()

MONTH_LABELS = {
    1: "JANEIRO",
    2: "FEVEREIRO",
    3: "MARCO",
    4: "ABRIL",
    5: "MAIO",
    6: "JUNHO",
    7: "JULHO",
    8: "AGOSTO",
    9: "SETEMBRO",
    10: "OUTUBRO",
    11: "NOVEMBRO",
    12: "DEZEMBRO",
}

MONTH_TITLES = {
    1: "Janeiro",
    2: "Fevereiro",
    3: "Marco",
    4: "Abril",
    5: "Maio",
    6: "Junho",
    7: "Julho",
    8: "Agosto",
    9: "Setembro",
    10: "Outubro",
    11: "Novembro",
    12: "Dezembro",
}

ALLOWED_SORT_COLUMNS = {
    "partner_name": "partner_name",
    "transferencia_qty": "transferencia_qty",
    "cautelar_qty": "cautelar_qty",
    "pesquisa_qty": "pesquisa_qty",
    "unit_transferencia": "unit_transferencia",
    "unit_cautelar": "unit_cautelar",
    "unit_pesquisa": "unit_pesquisa",
    "total_value": "total_value",
    "created_at": "created_at",
}

DEFAULT_FUTURE_MONTHS = 8

app = Flask(__name__)
app.config["JSON_AS_ASCII"] = False


def get_db() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def normalize_text(value: str | None) -> str:
    if not value:
        return ""
    normalized = unicodedata.normalize("NFKD", value.strip())
    ascii_only = normalized.encode("ascii", "ignore").decode("ascii")
    return ascii_only.upper()


def month_key_from_parts(year_number: int, month_number: int) -> str:
    return f"{year_number:04d}-{month_number:02d}"


def title_from_month(month_number: int, year_number: int) -> str:
    return f"{MONTH_TITLES[month_number]} {year_number}"


def label_from_month(month_number: int) -> str:
    return MONTH_LABELS[month_number]


def parse_month_key(month_key: str) -> tuple[int, int]:
    try:
        year_raw, month_raw = month_key.split("-", 1)
        year_number = int(year_raw)
        month_number = int(month_raw)
    except (ValueError, AttributeError) as exc:
        raise ValueError("Mes invalido. Use o formato YYYY-MM.") from exc

    if month_number < 1 or month_number > 12:
        raise ValueError("Mes invalido. O valor do mes deve ficar entre 01 e 12.")

    return year_number, month_number


def shift_month(year_number: int, month_number: int, offset: int) -> tuple[int, int]:
    absolute = (year_number * 12) + (month_number - 1) + offset
    next_year = absolute // 12
    next_month = (absolute % 12) + 1
    return next_year, next_month


def calculate_total(record: dict[str, Any]) -> float:
    return round(
        (record["transferencia_qty"] * record["unit_transferencia"])
        + (record["cautelar_qty"] * record["unit_cautelar"])
        + (record["pesquisa_qty"] * record["unit_pesquisa"]),
        2,
    )


def to_int(value: Any, field_name: str) -> int:
    if value in (None, ""):
        return 0
    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"O campo '{field_name}' deve ser inteiro.") from exc


def to_float(value: Any, field_name: str) -> float:
    if value in (None, ""):
        return 0.0
    try:
        return float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"O campo '{field_name}' deve ser numerico.") from exc


def validate_payload(payload: dict[str, Any]) -> dict[str, Any]:
    partner_name = (payload.get("partner_name") or "").strip()
    if not partner_name:
        raise ValueError("O nome do parceiro ou cliente e obrigatorio.")

    month_key = (payload.get("month_key") or "").strip()
    if not month_key:
        raise ValueError("O mes ativo e obrigatorio.")

    year_number, month_number = parse_month_key(month_key)
    record = {
        "month_key": month_key,
        "year_number": year_number,
        "month_number": month_number,
        "period_label": label_from_month(month_number),
        "partner_name": partner_name,
        "transferencia_qty": to_int(payload.get("transferencia_qty"), "transferencia_qty"),
        "cautelar_qty": to_int(payload.get("cautelar_qty"), "cautelar_qty"),
        "pesquisa_qty": to_int(payload.get("pesquisa_qty"), "pesquisa_qty"),
        "unit_transferencia": to_float(payload.get("unit_transferencia"), "unit_transferencia"),
        "unit_cautelar": to_float(payload.get("unit_cautelar"), "unit_cautelar"),
        "unit_pesquisa": to_float(payload.get("unit_pesquisa"), "unit_pesquisa"),
    }

    for field_name in (
        "transferencia_qty",
        "cautelar_qty",
        "pesquisa_qty",
        "unit_transferencia",
        "unit_cautelar",
        "unit_pesquisa",
    ):
        if record[field_name] < 0:
            raise ValueError(f"O campo '{field_name}' nao pode ser negativo.")

    record["total_value"] = calculate_total(record)
    return record


def serialize_record(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "month_key": row["month_key"],
        "period_label": row["period_label"],
        "partner_name": row["partner_name"],
        "transferencia_qty": row["transferencia_qty"],
        "cautelar_qty": row["cautelar_qty"],
        "pesquisa_qty": row["pesquisa_qty"],
        "unit_transferencia": row["unit_transferencia"],
        "unit_cautelar": row["unit_cautelar"],
        "unit_pesquisa": row["unit_pesquisa"],
        "total_value": row["total_value"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def ensure_month(connection: sqlite3.Connection, year_number: int, month_number: int) -> str:
    month_key = month_key_from_parts(year_number, month_number)
    connection.execute(
        """
        INSERT OR IGNORE INTO months (
            month_key,
            year_number,
            month_number,
            month_label,
            month_title
        ) VALUES (?, ?, ?, ?, ?)
        """,
        (
            month_key,
            year_number,
            month_number,
            label_from_month(month_number),
            title_from_month(month_number, year_number),
        ),
    )
    return month_key


def get_default_month_key() -> str:
    now = datetime.now()
    return month_key_from_parts(now.year, now.month)


def infer_seed_month_map(seed_records: list[dict[str, Any]]) -> dict[str, str]:
    ordered_labels: list[str] = []
    for item in seed_records:
        label = normalize_text(item.get("period_label"))
        if label and label not in ordered_labels:
            ordered_labels.append(label)

    if not ordered_labels:
        return {}

    now = datetime.now()
    current_label = label_from_month(now.month)
    if current_label in ordered_labels:
        anchor_index = ordered_labels.index(current_label)
        anchor_year = now.year
        anchor_month = now.month
    else:
        anchor_index = len(ordered_labels) - 1
        anchor_year = now.year
        anchor_month = now.month

    month_map: dict[str, str] = {}
    year_number = anchor_year
    month_number = anchor_month
    month_map[ordered_labels[anchor_index]] = month_key_from_parts(year_number, month_number)

    cursor_year = year_number
    cursor_month = month_number
    for index in range(anchor_index - 1, -1, -1):
        cursor_year, cursor_month = shift_month(cursor_year, cursor_month, -1)
        month_map[ordered_labels[index]] = month_key_from_parts(cursor_year, cursor_month)

    cursor_year = year_number
    cursor_month = month_number
    for index in range(anchor_index + 1, len(ordered_labels)):
        cursor_year, cursor_month = shift_month(cursor_year, cursor_month, 1)
        month_map[ordered_labels[index]] = month_key_from_parts(cursor_year, cursor_month)

    return month_map


def ensure_future_months(connection: sqlite3.Connection, future_count: int = DEFAULT_FUTURE_MONTHS) -> None:
    current_year, current_month = parse_month_key(get_default_month_key())
    ensure_month(connection, current_year, current_month)

    row = connection.execute(
        """
        SELECT year_number, month_number
        FROM months
        ORDER BY year_number DESC, month_number DESC
        LIMIT 1
        """
    ).fetchone()

    latest_year = row["year_number"] if row else current_year
    latest_month = row["month_number"] if row else current_month

    for offset in range(1, future_count + 1):
        next_year, next_month = shift_month(latest_year, latest_month, offset)
        ensure_month(connection, next_year, next_month)


def summarize_month(connection: sqlite3.Connection, month_key: str) -> dict[str, Any]:
    row = connection.execute(
        """
        SELECT
            COALESCE(SUM(total_value), 0) AS total_value,
            COALESCE(SUM(transferencia_qty), 0) AS transferencia_qty,
            COALESCE(SUM(cautelar_qty), 0) AS cautelar_qty,
            COALESCE(SUM(pesquisa_qty), 0) AS pesquisa_qty,
            COUNT(*) AS record_count
        FROM records
        WHERE month_key = ?
        """,
        (month_key,),
    ).fetchone()

    total_operations = (
        row["transferencia_qty"] + row["cautelar_qty"] + row["pesquisa_qty"]
    )

    def percentage(value: int) -> float:
        if total_operations == 0:
            return 0.0
        return round((value / total_operations) * 100, 2)

    return {
        "total_value": row["total_value"],
        "record_count": row["record_count"],
        "transferencia_qty": row["transferencia_qty"],
        "cautelar_qty": row["cautelar_qty"],
        "pesquisa_qty": row["pesquisa_qty"],
        "total_operations": total_operations,
        "transferencia_pct": percentage(row["transferencia_qty"]),
        "cautelar_pct": percentage(row["cautelar_qty"]),
        "pesquisa_pct": percentage(row["pesquisa_qty"]),
    }


def list_months(connection: sqlite3.Connection) -> list[dict[str, Any]]:
    current_key = get_default_month_key()
    rows = connection.execute(
        """
        SELECT
            m.month_key,
            m.month_label,
            m.month_title,
            m.year_number,
            m.month_number,
            COUNT(r.id) AS record_count,
            COALESCE(SUM(r.total_value), 0) AS total_value
        FROM months m
        LEFT JOIN records r ON r.month_key = m.month_key
        GROUP BY
            m.month_key,
            m.month_label,
            m.month_title,
            m.year_number,
            m.month_number
        ORDER BY m.year_number, m.month_number
        """
    ).fetchall()

    return [
        {
            "month_key": row["month_key"],
            "month_label": row["month_label"],
            "month_title": row["month_title"],
            "year_number": row["year_number"],
            "month_number": row["month_number"],
            "record_count": row["record_count"],
            "total_value": row["total_value"],
            "is_current": row["month_key"] == current_key,
        }
        for row in rows
    ]


def init_db() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with get_db() as connection:
        connection.executescript(
            """
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
            """
        )

        columns = {
            row["name"] for row in connection.execute("PRAGMA table_info(records)").fetchall()
        }
        if "month_key" not in columns:
            connection.execute("ALTER TABLE records ADD COLUMN month_key TEXT")

        record_count = connection.execute("SELECT COUNT(*) FROM records").fetchone()[0]
        if record_count == 0 and SEED_PATH.exists():
            seed_records = json.loads(SEED_PATH.read_text(encoding="utf-8-sig"))
            seed_month_map = infer_seed_month_map(seed_records)
            for month_key in sorted(set(seed_month_map.values())):
                year_number, month_number = parse_month_key(month_key)
                ensure_month(connection, year_number, month_number)

            connection.executemany(
                """
                INSERT INTO records (
                    month_key,
                    reference_date,
                    period_label,
                    period_sort,
                    partner_name,
                    transferencia_qty,
                    cautelar_qty,
                    pesquisa_qty,
                    unit_transferencia,
                    unit_cautelar,
                    unit_pesquisa,
                    total_value
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        seed_month_map.get(normalize_text(item["period_label"]), get_default_month_key()),
                        None,
                        normalize_text(item["period_label"]),
                        0,
                        item["partner_name"],
                        item["transferencia_qty"],
                        item["cautelar_qty"],
                        item["pesquisa_qty"],
                        item["unit_transferencia"],
                        item["unit_cautelar"],
                        item["unit_pesquisa"],
                        item["total_value"],
                    )
                    for item in seed_records
                ],
            )

        existing_bound_months = connection.execute(
            """
            SELECT DISTINCT month_key
            FROM records
            WHERE month_key IS NOT NULL AND month_key <> ''
            """
        ).fetchall()
        for row in existing_bound_months:
            year_number, month_number = parse_month_key(row["month_key"])
            ensure_month(connection, year_number, month_number)

        existing_month_keys = connection.execute(
            "SELECT DISTINCT month_key, period_label FROM records"
        ).fetchall()
        if any(not row["month_key"] for row in existing_month_keys):
            labels = [
                {"period_label": row["period_label"]}
                for row in connection.execute(
                    """
                    SELECT period_label, MIN(id) AS first_id
                    FROM records
                    WHERE (month_key IS NULL OR month_key = '')
                    GROUP BY period_label
                    ORDER BY first_id
                    """
                ).fetchall()
            ]
            inferred_map = infer_seed_month_map(labels)
            for label, month_key in inferred_map.items():
                year_number, month_number = parse_month_key(month_key)
                ensure_month(connection, year_number, month_number)
                connection.execute(
                    """
                    UPDATE records
                    SET month_key = ?
                    WHERE (month_key IS NULL OR month_key = '')
                      AND period_label = ?
                    """,
                    (month_key, label),
                )

        ensure_future_months(connection)


@app.route("/")
def index() -> str:
    return render_template("index.html")


@app.get("/healthz")
def healthcheck():
    with get_db() as connection:
        connection.execute("SELECT 1")
    return jsonify({"status": "ok"})


@app.get("/api/records")
def list_records():
    search = (request.args.get("search") or "").strip()
    month_key = (request.args.get("month_key") or get_default_month_key()).strip()
    sort_by = ALLOWED_SORT_COLUMNS.get(request.args.get("sort_by"), "partner_name")
    sort_order = "DESC" if (request.args.get("sort_order") or "").lower() == "desc" else "ASC"

    try:
        year_number, month_number = parse_month_key(month_key)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    with get_db() as connection:
        ensure_month(connection, year_number, month_number)
        ensure_future_months(connection)

        conditions = ["month_key = ?"]
        params: list[Any] = [month_key]

        if search:
            conditions.append("partner_name LIKE ?")
            params.append(f"%{search}%")

        query = f"""
            SELECT *
            FROM records
            WHERE {' AND '.join(conditions)}
            ORDER BY {sort_by} {sort_order}, partner_name ASC, id DESC
        """
        rows = connection.execute(query, params).fetchall()
        months = list_months(connection)
        summary = summarize_month(connection, month_key)
        active_month = next((item for item in months if item["month_key"] == month_key), None)

    return jsonify(
        {
            "records": [serialize_record(row) for row in rows],
            "months": months,
            "summary": summary,
            "active_month": active_month,
            "meta": {"total_records": len(rows)},
        }
    )


@app.post("/api/records")
def create_record():
    payload = request.get_json(silent=True) or {}
    try:
        record = validate_payload(payload)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    with get_db() as connection:
        ensure_month(connection, record["year_number"], record["month_number"])
        cursor = connection.execute(
            """
            INSERT INTO records (
                month_key,
                reference_date,
                period_label,
                period_sort,
                partner_name,
                transferencia_qty,
                cautelar_qty,
                pesquisa_qty,
                unit_transferencia,
                unit_cautelar,
                unit_pesquisa,
                total_value,
                updated_at
            ) VALUES (?, NULL, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """,
            (
                record["month_key"],
                record["period_label"],
                record["partner_name"],
                record["transferencia_qty"],
                record["cautelar_qty"],
                record["pesquisa_qty"],
                record["unit_transferencia"],
                record["unit_cautelar"],
                record["unit_pesquisa"],
                record["total_value"],
            ),
        )
        ensure_future_months(connection)
        row = connection.execute("SELECT * FROM records WHERE id = ?", (cursor.lastrowid,)).fetchone()

    return jsonify(serialize_record(row)), 201


@app.put("/api/records/<int:record_id>")
def update_record(record_id: int):
    payload = request.get_json(silent=True) or {}
    try:
        record = validate_payload(payload)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    with get_db() as connection:
        existing = connection.execute("SELECT id FROM records WHERE id = ?", (record_id,)).fetchone()
        if existing is None:
            return jsonify({"error": "Registro nao encontrado."}), 404

        ensure_month(connection, record["year_number"], record["month_number"])
        connection.execute(
            """
            UPDATE records
            SET
                month_key = ?,
                reference_date = NULL,
                period_label = ?,
                partner_name = ?,
                transferencia_qty = ?,
                cautelar_qty = ?,
                pesquisa_qty = ?,
                unit_transferencia = ?,
                unit_cautelar = ?,
                unit_pesquisa = ?,
                total_value = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (
                record["month_key"],
                record["period_label"],
                record["partner_name"],
                record["transferencia_qty"],
                record["cautelar_qty"],
                record["pesquisa_qty"],
                record["unit_transferencia"],
                record["unit_cautelar"],
                record["unit_pesquisa"],
                record["total_value"],
                record_id,
            ),
        )
        ensure_future_months(connection)
        row = connection.execute("SELECT * FROM records WHERE id = ?", (record_id,)).fetchone()

    return jsonify(serialize_record(row))


@app.delete("/api/records/<int:record_id>")
def delete_record(record_id: int):
    with get_db() as connection:
        cursor = connection.execute("DELETE FROM records WHERE id = ?", (record_id,))
        if cursor.rowcount == 0:
            return jsonify({"error": "Registro nao encontrado."}), 404
        ensure_future_months(connection)

    return jsonify({"message": "Registro excluido com sucesso."})


init_db()


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    debug = os.getenv("FLASK_DEBUG", "").lower() in {"1", "true", "yes"}
    app.run(host="0.0.0.0", port=port, debug=debug)
