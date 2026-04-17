from __future__ import annotations

import io
import json
import os
import sqlite3
import unicodedata
from datetime import datetime
from pathlib import Path
from typing import Any

from flask import Flask, jsonify, render_template, request, send_file
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

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
    "combo_transferencia_qty": "combo_transferencia_qty",
    "cautelar_qty": "cautelar_qty",
    "pesquisa_qty": "pesquisa_qty",
    "unit_transferencia": "unit_transferencia",
    "unit_combo_transferencia": "unit_combo_transferencia",
    "unit_cautelar": "unit_cautelar",
    "unit_pesquisa": "unit_pesquisa",
    "total_value": "total_value",
    "created_at": "created_at",
}

MIN_MONTH_KEY = "2026-04"
MAX_MONTH_KEY = "2050-12"

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


def compare_month_key(month_key_a: str, month_key_b: str) -> int:
    year_a, month_a = parse_month_key(month_key_a)
    year_b, month_b = parse_month_key(month_key_b)
    if year_a == year_b and month_a == month_b:
        return 0
    return -1 if (year_a, month_a) < (year_b, month_b) else 1


def clamp_month_key(month_key: str) -> str:
    if compare_month_key(month_key, MIN_MONTH_KEY) < 0:
        return MIN_MONTH_KEY
    if compare_month_key(month_key, MAX_MONTH_KEY) > 0:
        return MAX_MONTH_KEY
    return month_key


def is_month_allowed(month_key: str) -> bool:
    return compare_month_key(month_key, MIN_MONTH_KEY) >= 0 and compare_month_key(month_key, MAX_MONTH_KEY) <= 0


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
        + (record["combo_transferencia_qty"] * record["unit_combo_transferencia"])
        + (record["cautelar_qty"] * record["unit_cautelar"])
        + (record["pesquisa_qty"] * record["unit_pesquisa"]),
        2,
    )


def validate_main_payload(payload: dict[str, Any]) -> dict[str, Any]:
    partner_name = (payload.get("partner_name") or "").strip()
    if not partner_name:
        raise ValueError("O nome do parceiro ou cliente e obrigatorio.")

    month_key = clamp_month_key((payload.get("month_key") or "").strip())
    if not month_key:
        raise ValueError("O mes ativo e obrigatorio.")
    if not is_month_allowed(month_key):
        raise ValueError("O mes precisa estar entre Abril de 2026 e Dezembro de 2050.")

    year_number, month_number = parse_month_key(month_key)
    record = {
        "month_key": month_key,
        "year_number": year_number,
        "month_number": month_number,
        "period_label": label_from_month(month_number),
        "partner_name": partner_name,
        "transferencia_qty": to_int(payload.get("transferencia_qty"), "transferencia_qty"),
        "combo_transferencia_qty": to_int(payload.get("combo_transferencia_qty"), "combo_transferencia_qty"),
        "cautelar_qty": to_int(payload.get("cautelar_qty"), "cautelar_qty"),
        "pesquisa_qty": to_int(payload.get("pesquisa_qty"), "pesquisa_qty"),
        "unit_transferencia": to_float(payload.get("unit_transferencia"), "unit_transferencia"),
        "unit_combo_transferencia": to_float(payload.get("unit_combo_transferencia"), "unit_combo_transferencia"),
        "unit_cautelar": to_float(payload.get("unit_cautelar"), "unit_cautelar"),
        "unit_pesquisa": to_float(payload.get("unit_pesquisa"), "unit_pesquisa"),
    }

    for field_name in (
        "transferencia_qty",
        "combo_transferencia_qty",
        "cautelar_qty",
        "pesquisa_qty",
        "unit_transferencia",
        "unit_combo_transferencia",
        "unit_cautelar",
        "unit_pesquisa",
    ):
        if record[field_name] < 0:
            raise ValueError(f"O campo '{field_name}' nao pode ser negativo.")

    record["total_value"] = calculate_total(record)
    return record


def serialize_main_record(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "month_key": row["month_key"],
        "period_label": row["period_label"],
        "partner_name": row["partner_name"],
        "transferencia_qty": row["transferencia_qty"],
        "combo_transferencia_qty": row["combo_transferencia_qty"],
        "cautelar_qty": row["cautelar_qty"],
        "pesquisa_qty": row["pesquisa_qty"],
        "unit_transferencia": row["unit_transferencia"],
        "unit_combo_transferencia": row["unit_combo_transferencia"],
        "unit_cautelar": row["unit_cautelar"],
        "unit_pesquisa": row["unit_pesquisa"],
        "total_value": row["total_value"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def ensure_month(connection: sqlite3.Connection, year_number: int, month_number: int) -> str:
    month_key = month_key_from_parts(year_number, month_number)
    if not is_month_allowed(month_key):
        raise ValueError("O mes precisa estar entre Abril de 2026 e Dezembro de 2050.")
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
    return clamp_month_key(month_key_from_parts(now.year, now.month))


def infer_seed_month_map(seed_records: list[dict[str, Any]]) -> dict[str, str]:
    ordered_labels: list[str] = []
    for item in seed_records:
        label = normalize_text(item.get("period_label"))
        if label and label not in ordered_labels:
            ordered_labels.append(label)
    if not ordered_labels:
        return {}

    current_year, current_month = parse_month_key(MIN_MONTH_KEY)
    month_map: dict[str, str] = {}
    for label in ordered_labels:
        month_key = month_key_from_parts(current_year, current_month)
        if is_month_allowed(month_key):
            month_map[label] = month_key
        current_year, current_month = shift_month(current_year, current_month, 1)
    return month_map


def ensure_allowed_months(connection: sqlite3.Connection) -> None:
    current_year, current_month = parse_month_key(MIN_MONTH_KEY)
    while compare_month_key(month_key_from_parts(current_year, current_month), MAX_MONTH_KEY) <= 0:
        ensure_month(connection, current_year, current_month)
        current_year, current_month = shift_month(current_year, current_month, 1)
    connection.execute("DELETE FROM months WHERE month_key < ? OR month_key > ?", (MIN_MONTH_KEY, MAX_MONTH_KEY))


def summarize_month(connection: sqlite3.Connection, month_key: str) -> dict[str, Any]:
    row = connection.execute(
        """
        SELECT
            COALESCE(SUM(total_value), 0) AS total_value,
            COALESCE(SUM(transferencia_qty), 0) AS transferencia_qty,
            COALESCE(SUM(combo_transferencia_qty), 0) AS combo_transferencia_qty,
            COALESCE(SUM(cautelar_qty), 0) AS cautelar_qty,
            COALESCE(SUM(pesquisa_qty), 0) AS pesquisa_qty,
            COALESCE(SUM(transferencia_qty * unit_transferencia), 0) AS transferencia_total_value,
            COALESCE(SUM(combo_transferencia_qty * unit_combo_transferencia), 0) AS combo_transferencia_total_value,
            COALESCE(SUM(cautelar_qty * unit_cautelar), 0) AS cautelar_total_value,
            COALESCE(SUM(pesquisa_qty * unit_pesquisa), 0) AS pesquisa_total_value,
            COUNT(*) AS record_count
        FROM records
        WHERE month_key = ?
        """,
        (month_key,),
    ).fetchone()

    total_operations = (
        row["transferencia_qty"]
        + row["combo_transferencia_qty"]
        + row["cautelar_qty"]
        + row["pesquisa_qty"]
    )

    def percentage(value: int) -> float:
        if total_operations == 0:
            return 0.0
        return round((value / total_operations) * 100, 2)

    return {
        "total_value": row["total_value"],
        "record_count": row["record_count"],
        "transferencia_qty": row["transferencia_qty"],
        "combo_transferencia_qty": row["combo_transferencia_qty"],
        "cautelar_qty": row["cautelar_qty"],
        "pesquisa_qty": row["pesquisa_qty"],
        "transferencia_total_value": row["transferencia_total_value"],
        "combo_transferencia_total_value": row["combo_transferencia_total_value"],
        "cautelar_total_value": row["cautelar_total_value"],
        "pesquisa_total_value": row["pesquisa_total_value"],
        "total_operations": total_operations,
        "transferencia_pct": percentage(row["transferencia_qty"]),
        "combo_transferencia_pct": percentage(row["combo_transferencia_qty"]),
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


def get_month_title(connection: sqlite3.Connection, month_key: str) -> str:
    row = connection.execute("SELECT month_title FROM months WHERE month_key = ?", (month_key,)).fetchone()
    return row["month_title"] if row else month_key


def get_month_report(
    connection: sqlite3.Connection,
    month_key: str,
    search: str = "",
    sort_by: str = "partner_name",
    sort_order: str = "ASC",
) -> dict[str, Any]:
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
    return {
        "records": rows,
        "summary": summarize_month(connection, month_key),
        "month_title": get_month_title(connection, month_key),
        "month_key": month_key,
    }


def get_comparison_data(connection: sqlite3.Connection) -> list[dict[str, Any]]:
    rows = connection.execute(
        """
        SELECT
            m.month_key,
            m.month_title,
            COALESCE(SUM(r.total_value), 0) AS total_value,
            COALESCE(SUM(r.transferencia_qty * r.unit_transferencia), 0) AS transferencia_total_value,
            COALESCE(SUM(r.combo_transferencia_qty * r.unit_combo_transferencia), 0) AS combo_transferencia_total_value,
            COALESCE(SUM(r.cautelar_qty * r.unit_cautelar), 0) AS cautelar_total_value,
            COALESCE(SUM(r.pesquisa_qty * r.unit_pesquisa), 0) AS pesquisa_total_value
        FROM months m
        LEFT JOIN records r ON r.month_key = m.month_key
        GROUP BY m.month_key, m.month_title, m.year_number, m.month_number
        ORDER BY m.year_number, m.month_number
        """
    ).fetchall()

    return [
        {
            "month_key": row["month_key"],
            "month_title": row["month_title"],
            "total_value": row["total_value"],
            "transferencia_total_value": row["transferencia_total_value"],
            "combo_transferencia_total_value": row["combo_transferencia_total_value"],
            "cautelar_total_value": row["cautelar_total_value"],
            "pesquisa_total_value": row["pesquisa_total_value"],
        }
        for row in rows
    ]


def build_excel_report(report: dict[str, Any]) -> io.BytesIO:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Relatorio"

    title_fill = PatternFill("solid", fgColor="0E2A47")
    title_font = Font(color="FFFFFF", bold=True, size=13)
    header_fill = PatternFill("solid", fgColor="D4AF37")
    header_font = Font(bold=True, color="0E2A47")

    sheet.merge_cells("A1:J1")
    sheet["A1"] = f"Relatorio Mensal - {report['month_title']}"
    sheet["A1"].fill = title_fill
    sheet["A1"].font = title_font
    sheet["A1"].alignment = Alignment(horizontal="center")

    summary = report["summary"]
    summary_rows = [
        ("Valor total", summary["total_value"]),
        ("Total Transferencia", summary["transferencia_total_value"]),
        ("Total Transf. de Combo", summary["combo_transferencia_total_value"]),
        ("Total Cautelar", summary["cautelar_total_value"]),
        ("Total Pesquisa", summary["pesquisa_total_value"]),
        ("Percentual Transferencias", f"{summary['transferencia_pct']}%"),
        ("Percentual Transf. de Combo", f"{summary['combo_transferencia_pct']}%"),
        ("Percentual Cautelares", f"{summary['cautelar_pct']}%"),
        ("Percentual Pesquisas", f"{summary['pesquisa_pct']}%"),
    ]

    current_row = 3
    for label, value in summary_rows:
        sheet[f"A{current_row}"] = label
        sheet[f"B{current_row}"] = value
        current_row += 1

    current_row += 1
    headers = [
        "Parceiro",
        "Transfer.",
        "Transf. de Combo",
        "Cautelar",
        "Pesquisa",
        "Vlr. Transfer.",
        "Vlr. Combo",
        "Vlr. Cautelar",
        "Vlr. Pesquisa",
        "Total",
    ]
    for col_index, header in enumerate(headers, start=1):
        cell = sheet.cell(row=current_row, column=col_index, value=header)
        cell.fill = header_fill
        cell.font = header_font

    for row in report["records"]:
        current_row += 1
        values = [
            row["partner_name"],
            row["transferencia_qty"],
            row["combo_transferencia_qty"],
            row["cautelar_qty"],
            row["pesquisa_qty"],
            row["unit_transferencia"],
            row["unit_combo_transferencia"],
            row["unit_cautelar"],
            row["unit_pesquisa"],
            row["total_value"],
        ]
        for col_index, value in enumerate(values, start=1):
            sheet.cell(row=current_row, column=col_index, value=value)

    for column_letter, width in {"A": 28, "B": 12, "C": 18, "D": 12, "E": 12, "F": 15, "G": 15, "H": 15, "I": 15, "J": 15}.items():
        sheet.column_dimensions[column_letter].width = width

    buffer = io.BytesIO()
    workbook.save(buffer)
    buffer.seek(0)
    return buffer


def build_pdf_report(report: dict[str, Any]) -> io.BytesIO:
    buffer = io.BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=10 * mm,
        rightMargin=10 * mm,
        topMargin=10 * mm,
        bottomMargin=10 * mm,
    )
    styles = getSampleStyleSheet()
    story = [Paragraph(f"Relatorio Mensal - {report['month_title']}", styles["Title"]), Spacer(1, 8)]

    summary = report["summary"]
    summary_data = [
        ["Metrica", "Valor"],
        ["Valor total", f"R$ {summary['total_value']:.2f}"],
        ["Total Transferencia", f"R$ {summary['transferencia_total_value']:.2f}"],
        ["Total Transf. de Combo", f"R$ {summary['combo_transferencia_total_value']:.2f}"],
        ["Total Cautelar", f"R$ {summary['cautelar_total_value']:.2f}"],
        ["Total Pesquisa", f"R$ {summary['pesquisa_total_value']:.2f}"],
    ]
    summary_table = Table(summary_data, colWidths=[70 * mm, 45 * mm])
    summary_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0E2A47")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D4AF37")),
                ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#F8F4E6")),
            ]
        )
    )
    story.extend([summary_table, Spacer(1, 10)])

    table_data = [[
        "Parceiro",
        "Transfer.",
        "Combo",
        "Cautelar",
        "Pesquisa",
        "Vlr. Transfer.",
        "Vlr. Combo",
        "Vlr. Cautelar",
        "Vlr. Pesquisa",
        "Total",
    ]]
    for row in report["records"]:
        table_data.append(
            [
                row["partner_name"],
                row["transferencia_qty"],
                row["combo_transferencia_qty"],
                row["cautelar_qty"],
                row["pesquisa_qty"],
                f"R$ {row['unit_transferencia']:.2f}",
                f"R$ {row['unit_combo_transferencia']:.2f}",
                f"R$ {row['unit_cautelar']:.2f}",
                f"R$ {row['unit_pesquisa']:.2f}",
                f"R$ {row['total_value']:.2f}",
            ]
        )

    table = Table(
        table_data,
        colWidths=[45 * mm, 16 * mm, 19 * mm, 16 * mm, 16 * mm, 22 * mm, 22 * mm, 22 * mm, 22 * mm, 22 * mm],
        repeatRows=1,
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0E2A47")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D4AF37")),
                ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#FFFDF7")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    story.append(table)
    document.build(story)
    buffer.seek(0)
    return buffer


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
            """
        )

        columns = {row["name"] for row in connection.execute("PRAGMA table_info(records)").fetchall()}
        if "month_key" not in columns:
            connection.execute("ALTER TABLE records ADD COLUMN month_key TEXT")
        if "combo_transferencia_qty" not in columns:
            connection.execute("ALTER TABLE records ADD COLUMN combo_transferencia_qty INTEGER NOT NULL DEFAULT 0")
        if "unit_combo_transferencia" not in columns:
            connection.execute("ALTER TABLE records ADD COLUMN unit_combo_transferencia REAL NOT NULL DEFAULT 0")

        connection.executescript(
            """
            CREATE INDEX IF NOT EXISTS idx_records_partner ON records (partner_name);
            CREATE INDEX IF NOT EXISTS idx_records_month ON records (month_key);
            CREATE INDEX IF NOT EXISTS idx_months_sort ON months (year_number, month_number);
            DROP TABLE IF EXISTS private_clients;
            """
        )

        record_count = connection.execute("SELECT COUNT(*) FROM records").fetchone()[0]
        if record_count == 0 and SEED_PATH.exists():
            seed_records = json.loads(SEED_PATH.read_text(encoding="utf-8-sig"))
            seed_month_map = infer_seed_month_map(seed_records)
            for month_key in sorted(set(seed_month_map.values())):
                if is_month_allowed(month_key):
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
                    combo_transferencia_qty,
                    cautelar_qty,
                    pesquisa_qty,
                    unit_transferencia,
                    unit_combo_transferencia,
                    unit_cautelar,
                    unit_pesquisa,
                    total_value
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        seed_month_map.get(normalize_text(item["period_label"]), MIN_MONTH_KEY),
                        None,
                        normalize_text(item["period_label"]),
                        0,
                        item["partner_name"],
                        item["transferencia_qty"],
                        0,
                        item["cautelar_qty"],
                        item["pesquisa_qty"],
                        item["unit_transferencia"],
                        0,
                        item["unit_cautelar"],
                        item["unit_pesquisa"],
                        item["total_value"],
                    )
                    for item in seed_records
                    if is_month_allowed(seed_month_map.get(normalize_text(item["period_label"]), MIN_MONTH_KEY))
                ],
            )

        missing_month_rows = connection.execute(
            """
            SELECT period_label, MIN(id) AS first_id
            FROM records
            WHERE month_key IS NULL OR month_key = ''
            GROUP BY period_label
            ORDER BY first_id
            """
        ).fetchall()
        if missing_month_rows:
            inferred_map = infer_seed_month_map([{"period_label": row["period_label"]} for row in missing_month_rows])
            for label, month_key in inferred_map.items():
                if is_month_allowed(month_key):
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

        existing_bound_months = connection.execute(
            "SELECT DISTINCT month_key FROM records WHERE month_key IS NOT NULL AND month_key <> ''"
        ).fetchall()
        for row in existing_bound_months:
            if is_month_allowed(row["month_key"]):
                year_number, month_number = parse_month_key(row["month_key"])
                ensure_month(connection, year_number, month_number)

        connection.execute("DELETE FROM records WHERE month_key IS NULL OR month_key = ''")
        connection.execute("DELETE FROM records WHERE month_key < ? OR month_key > ?", (MIN_MONTH_KEY, MAX_MONTH_KEY))
        ensure_allowed_months(connection)


@app.route("/")
def index() -> str:
    return render_template("index.html")


@app.route("/comparison")
def comparison_page() -> str:
    return render_template("comparison.html")


@app.get("/healthz")
def healthcheck():
    return jsonify({"status": "ok"})


@app.get("/api/records")
def list_records():
    search = (request.args.get("search") or "").strip()
    month_key = clamp_month_key((request.args.get("month_key") or get_default_month_key()).strip())
    sort_by = ALLOWED_SORT_COLUMNS.get(request.args.get("sort_by"), "partner_name")
    sort_order = "DESC" if (request.args.get("sort_order") or "").lower() == "desc" else "ASC"

    try:
        year_number, month_number = parse_month_key(month_key)
        if not is_month_allowed(month_key):
            raise ValueError("O mes precisa estar entre Abril de 2026 e Dezembro de 2050.")
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    with get_db() as connection:
        ensure_month(connection, year_number, month_number)
        ensure_allowed_months(connection)
        report = get_month_report(connection, month_key, search, sort_by, sort_order)
        months = list_months(connection)
        active_month = next((item for item in months if item["month_key"] == month_key), None)

    return jsonify(
        {
            "records": [serialize_main_record(row) for row in report["records"]],
            "months": months,
            "summary": report["summary"],
            "active_month": active_month,
            "meta": {"total_records": len(report["records"])},
        }
    )


@app.get("/api/comparison")
def comparison_data():
    with get_db() as connection:
        ensure_allowed_months(connection)
        months = get_comparison_data(connection)
    return jsonify({"months": months})


@app.get("/api/export/<string:month_key>.xlsx")
def export_month_xlsx(month_key: str):
    month_key = clamp_month_key(month_key)
    try:
        year_number, month_number = parse_month_key(month_key)
        if not is_month_allowed(month_key):
            raise ValueError("Mes fora do intervalo permitido.")
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    with get_db() as connection:
        ensure_month(connection, year_number, month_number)
        report = get_month_report(connection, month_key)

    buffer = build_excel_report(report)
    return send_file(
        buffer,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        as_attachment=True,
        download_name=f"relatorio-mensal-{month_key}.xlsx",
    )


@app.get("/api/export/<string:month_key>.pdf")
def export_month_pdf(month_key: str):
    month_key = clamp_month_key(month_key)
    try:
        year_number, month_number = parse_month_key(month_key)
        if not is_month_allowed(month_key):
            raise ValueError("Mes fora do intervalo permitido.")
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    with get_db() as connection:
        ensure_month(connection, year_number, month_number)
        report = get_month_report(connection, month_key)

    buffer = build_pdf_report(report)
    return send_file(
        buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"relatorio-mensal-{month_key}.pdf",
    )


@app.post("/api/records")
def create_record():
    payload = request.get_json(silent=True) or {}
    try:
        record = validate_main_payload(payload)
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
                combo_transferencia_qty,
                cautelar_qty,
                pesquisa_qty,
                unit_transferencia,
                unit_combo_transferencia,
                unit_cautelar,
                unit_pesquisa,
                total_value,
                updated_at
            ) VALUES (?, NULL, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """,
            (
                record["month_key"],
                record["period_label"],
                record["partner_name"],
                record["transferencia_qty"],
                record["combo_transferencia_qty"],
                record["cautelar_qty"],
                record["pesquisa_qty"],
                record["unit_transferencia"],
                record["unit_combo_transferencia"],
                record["unit_cautelar"],
                record["unit_pesquisa"],
                record["total_value"],
            ),
        )
        row = connection.execute("SELECT * FROM records WHERE id = ?", (cursor.lastrowid,)).fetchone()

    return jsonify(serialize_main_record(row)), 201


@app.put("/api/records/<int:record_id>")
def update_record(record_id: int):
    payload = request.get_json(silent=True) or {}
    try:
        record = validate_main_payload(payload)
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
                combo_transferencia_qty = ?,
                cautelar_qty = ?,
                pesquisa_qty = ?,
                unit_transferencia = ?,
                unit_combo_transferencia = ?,
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
                record["combo_transferencia_qty"],
                record["cautelar_qty"],
                record["pesquisa_qty"],
                record["unit_transferencia"],
                record["unit_combo_transferencia"],
                record["unit_cautelar"],
                record["unit_pesquisa"],
                record["total_value"],
                record_id,
            ),
        )
        row = connection.execute("SELECT * FROM records WHERE id = ?", (record_id,)).fetchone()

    return jsonify(serialize_main_record(row))


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
