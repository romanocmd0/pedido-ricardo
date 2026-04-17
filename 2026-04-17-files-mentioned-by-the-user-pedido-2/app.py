from __future__ import annotations

import json
import os
import sqlite3
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

HISTORICAL_PERIOD_ORDER = {
    "SETEMBRO": 1,
    "OUTUBRO": 2,
    "NOVEMBRO": 3,
    "DEZEMBRO": 4,
    "JANEIRO": 5,
    "FEVEREIRO": 6,
    "MARCO": 7,
    "ABRIL": 8,
}

ALLOWED_SORT_COLUMNS = {
    "reference_date": "reference_date",
    "period_label": "period_label",
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


app = Flask(__name__)
app.config["JSON_AS_ASCII"] = False


def get_db() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def normalize_period_label(label: str | None) -> str:
    if not label:
        return ""
    return (
        label.strip()
        .upper()
        .replace("Ç", "C")
        .replace("Ç", "C")
        .replace("Ã", "A")
        .replace("Á", "A")
        .replace("Â", "A")
        .replace("Ê", "E")
        .replace("É", "E")
        .replace("Í", "I")
        .replace("Ó", "O")
        .replace("Õ", "O")
        .replace("Ú", "U")
    )


def resolve_period_label(reference_date: str | None, fallback_label: str | None) -> str:
    if reference_date:
        try:
            parsed = datetime.strptime(reference_date, "%Y-%m-%d")
            return MONTH_LABELS[parsed.month]
        except ValueError:
            raise ValueError("A data deve estar no formato YYYY-MM-DD.")

    normalized = normalize_period_label(fallback_label)
    if normalized:
        return normalized

    return MONTH_LABELS[datetime.now().month]


def resolve_period_sort(period_label: str) -> int:
    return HISTORICAL_PERIOD_ORDER.get(period_label, 99)


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


def calculate_total(record: dict[str, Any]) -> float:
    return round(
        (record["transferencia_qty"] * record["unit_transferencia"])
        + (record["cautelar_qty"] * record["unit_cautelar"])
        + (record["pesquisa_qty"] * record["unit_pesquisa"]),
        2,
    )


def validate_payload(payload: dict[str, Any]) -> dict[str, Any]:
    partner_name = (payload.get("partner_name") or "").strip()
    if not partner_name:
        raise ValueError("O nome do parceiro/cliente e obrigatorio.")

    reference_date = payload.get("reference_date") or None
    period_label = resolve_period_label(reference_date, payload.get("period_label"))

    record = {
        "reference_date": reference_date,
        "period_label": period_label,
        "period_sort": resolve_period_sort(period_label),
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
        "reference_date": row["reference_date"],
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


def init_db() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with get_db() as connection:
        connection.executescript(
            """
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
            """
        )

        count = connection.execute("SELECT COUNT(*) FROM records").fetchone()[0]
        if count == 0 and SEED_PATH.exists():
            seed_records = json.loads(SEED_PATH.read_text(encoding="utf-8-sig"))
            connection.executemany(
                """
                INSERT INTO records (
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
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        None,
                        normalize_period_label(item["period_label"]),
                        resolve_period_sort(normalize_period_label(item["period_label"])),
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
    period = normalize_period_label(request.args.get("period"))
    sort_by = ALLOWED_SORT_COLUMNS.get(request.args.get("sort_by"), "partner_name")
    sort_order = "DESC" if (request.args.get("sort_order") or "").lower() == "desc" else "ASC"

    conditions: list[str] = []
    params: list[Any] = []

    if search:
        conditions.append("(partner_name LIKE ? OR period_label LIKE ?)")
        term = f"%{search}%"
        params.extend([term, term])

    if period:
        conditions.append("period_label = ?")
        params.append(period)

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    query = f"""
        SELECT *
        FROM records
        {where_clause}
        ORDER BY
            CASE WHEN reference_date IS NULL OR reference_date = '' THEN 1 ELSE 0 END,
            reference_date DESC,
            period_sort ASC,
            {sort_by} {sort_order},
            partner_name ASC
    """

    with get_db() as connection:
        rows = connection.execute(query, params).fetchall()
        periods = [
            row["period_label"]
            for row in connection.execute(
                """
                SELECT period_label, MIN(period_sort) AS period_rank
                FROM records
                GROUP BY period_label
                ORDER BY period_rank, period_label
                """
            ).fetchall()
        ]

    return jsonify(
        {
            "records": [serialize_record(row) for row in rows],
            "periods": periods,
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
        cursor = connection.execute(
            """
            INSERT INTO records (
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
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """,
            (
                record["reference_date"],
                record["period_label"],
                record["period_sort"],
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
        row = connection.execute(
            "SELECT * FROM records WHERE id = ?", (cursor.lastrowid,)
        ).fetchone()

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

        connection.execute(
            """
            UPDATE records
            SET
                reference_date = ?,
                period_label = ?,
                period_sort = ?,
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
                record["reference_date"],
                record["period_label"],
                record["period_sort"],
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
        row = connection.execute("SELECT * FROM records WHERE id = ?", (record_id,)).fetchone()

    return jsonify(serialize_record(row))


@app.delete("/api/records/<int:record_id>")
def delete_record(record_id: int):
    with get_db() as connection:
        cursor = connection.execute("DELETE FROM records WHERE id = ?", (record_id,))
        if cursor.rowcount == 0:
            return jsonify({"error": "Registro nao encontrado."}), 404

    return jsonify({"message": "Registro excluido com sucesso."})


init_db()


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    debug = os.getenv("FLASK_DEBUG", "").lower() in {"1", "true", "yes"}
    app.run(host="0.0.0.0", port=port, debug=debug)
