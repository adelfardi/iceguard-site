#!/usr/bin/env python3
"""Seed the public IceGuard demo through its API (runs from anywhere, stdlib only).

Registers the Polaris catalog (AWS S3) in IceGuard, then creates a couple of namespaces/tables
and inserts several batches so every table has a real snapshot history. Writes go through Caddy
with the admin token; everything is create-if-missing (safe to re-run).

    python3 seed.py                                      # https://<ICEGUARD_DOMAIN> from .env
    ICEGUARD_URL=http://localhost:8080 python3 seed.py   # via an SSH tunnel to the backend
"""
import json
import os
import random
import sys
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent


def load_env(path: Path) -> dict:
    env = {}
    for line in path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            v = v.strip()
            if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":  # quoted value (shell/compose style)
                v = v[1:-1]
            env[k.strip()] = v
    return env


ENV = {**load_env(HERE / ".env"), **os.environ}
BASE = ENV.get("ICEGUARD_URL") or f"https://{ENV['ICEGUARD_DOMAIN']}"
TOKEN = ENV["ICEGUARD_ADMIN_TOKEN"]


def call(method: str, path: str, body=None):
    req = urllib.request.Request(
        f"{BASE}/api{path}",
        method=method,
        data=None if body is None else json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "X-IceGuard-Admin-Token": TOKEN},
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            raw = resp.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        sys.exit(f"{method} {path} -> HTTP {e.code}: {e.read().decode(errors='replace')[:400]}")


def ensure_catalog(spec: dict) -> int:
    for c in call("GET", "/catalogs"):
        if c["name"] == spec["name"]:
            print(f"catalog {spec['name']}: exists (id={c['id']})")
            return c["id"]
    created = call("POST", "/catalogs", spec)
    print(f"catalog {spec['name']}: created (id={created['id']})")
    return created["id"]


def ensure_table(cat: int, ns: str, table: dict, batches) -> None:
    if ns not in [n["name"] for n in call("GET", f"/catalogs/{cat}/namespaces")]:
        call("POST", f"/catalogs/{cat}/namespaces", {"namespace": ns, "properties": {"owner": "demo"}})
    base = f"/catalogs/{cat}/namespaces/{ns}/tables"
    if table["name"] not in call("GET", base):
        call("POST", base, table)
        state = "created"
    elif call("GET", f"{base}/{table['name']}/snapshots"):
        print(f"  {ns}.{table['name']}: exists with data, skipped")
        return
    else:
        state = "existed empty (earlier failed run)"
    for rows in batches:  # one insert = one snapshot
        call("POST", f"{base}/{table['name']}/data", rows)
    print(f"  {ns}.{table['name']}: {state}, {len(batches)} snapshots")


ORDERS = {
    "name": "orders",
    "columns": [
        {"name": "order_id", "type": "long", "required": True, "doc": "Order identifier"},
        {"name": "customer", "type": "string", "required": False, "doc": None},
        {"name": "country", "type": "string", "required": False, "doc": "ISO country code"},
        {"name": "amount", "type": "double", "required": False, "doc": "Order total (EUR)"},
        {"name": "order_date", "type": "date", "required": True, "doc": None},
    ],
    "partitionFields": [{"sourceColumn": "order_date", "transform": "month"}],
    "properties": {"write.format.default": "parquet"},
}
EVENTS = {
    "name": "events",
    "columns": [
        {"name": "event_id", "type": "string", "required": True, "doc": None},
        {"name": "event_type", "type": "string", "required": True, "doc": None},
        {"name": "user_id", "type": "long", "required": False, "doc": None},
        {"name": "created_at", "type": "timestamptz", "required": True, "doc": None},
    ],
    "partitionFields": [{"sourceColumn": "created_at", "transform": "day"}],
    "properties": {"write.format.default": "parquet"},
}


def order_batches(n=6, size=40, seed=1):
    rnd, start, oid, out = random.Random(seed), date(2026, 3, 1), 1, []
    for b in range(n):
        rows = []
        for _ in range(size):
            rows.append({
                "order_id": oid,
                "customer": rnd.choice(["acme", "globex", "initech", "umbrella", "hooli", "stark"]),
                "country": rnd.choice(["FR", "DE", "ES", "IT", "US", "GB"]),
                "amount": round(rnd.uniform(5, 900), 2),
                "order_date": (start + timedelta(days=b * 30 + rnd.randint(0, 27))).isoformat(),
            })
            oid += 1
        out.append(rows)
    return out


def event_batches(n=8, size=60, seed=2):
    rnd, start, out = random.Random(seed), datetime(2026, 9, 1, tzinfo=timezone.utc), []
    for b in range(n):
        out.append([{
            "event_id": f"e{b:02d}-{i:04d}",
            "event_type": rnd.choice(["page_view", "click", "signup", "purchase"]),
            "user_id": rnd.randint(1000, 1200),
            "created_at": (start + timedelta(days=b, minutes=rnd.randint(0, 1439))).isoformat(),
        } for i in range(size)])
    return out


def table_ref(cat: int, ns: str, table: str) -> dict:
    return {"catalogId": cat, "namespace": ns, "tableName": table}


def ensure_widgets(cat: int) -> None:
    """Dashboard widgets, matched by title (the dashboard shows them in this order)."""
    widgets = [
        {"title": "Catalogs", "widgetType": "catalogs-count"},
        {"title": "Maintenance runs", "widgetType": "executions-summary"},
        {"title": "Orders storage", "widgetType": "storage-overview", **table_ref(cat, "sales", "orders")},
        {"title": "Products reliability", "widgetType": "maintenance-reliability",
         **table_ref(cat, "sales", "products")},
        {"title": "Events file sizes", "widgetType": "file-histogram", **table_ref(cat, "web", "events")},
        {"title": "Events: active partitions", "widgetType": "hot-partitions", **table_ref(cat, "web", "events")},
        {"title": "Catalog list", "widgetType": "catalog-list"},
    ]
    existing = {w["title"] for w in call("GET", "/dashboard-widgets")}
    for w in widgets:
        if w["title"] in existing:
            continue
        call("POST", "/dashboard-widgets", w)
        print(f"widget {w['title']}: created")


def ensure_pipelines(cat: int) -> None:
    """Realistic maintenance pipelines, created DISABLED: the scheduler never runs them, so the
    demo's snapshot history stays intact (expire_snapshots would really delete it)."""
    week_ms = str(7 * 24 * 3600 * 1000)
    pipelines = [
        {
            "name": "Nightly compaction: orders", "catalogId": cat, "namespace": "sales", "tableName": "orders",
            "description": "Compact small files every night, then expire old snapshots.",
            "cronExpression": "0 2 * * *", "enabled": False,
            "tasks": [
                {"name": "Compact data files", "actionType": "REWRITE_DATA_FILES",
                 "parameters": {"engine": "spark", "target-file-size-bytes": "134217728", "min-input-files": "5",
                                "retries": "2", "retryDelaySeconds": "300"}},
                {"name": "Expire snapshots", "actionType": "EXPIRE_SNAPSHOTS",
                 "parameters": {"olderThanMs": week_ms, "retainLast": "20"}},
            ],
        },
        {
            "name": "Weekly hygiene: events", "catalogId": cat, "namespace": "web", "tableName": "events",
            "description": "Rewrite manifests, clean orphan files and keep the last 50 snapshots.",
            "cronExpression": "0 3 * * 0", "enabled": False,
            "tasks": [
                {"name": "Rewrite manifests", "actionType": "REWRITE_MANIFESTS", "parameters": {}},
                {"name": "Remove orphan files", "actionType": "REMOVE_ORPHAN_FILES", "parameters": {}},
                {"name": "Expire snapshots", "actionType": "EXPIRE_SNAPSHOTS",
                 "parameters": {"retainLast": "50"}},
            ],
        },
        {
            "name": "Monthly cleanup: products", "catalogId": cat, "namespace": "sales", "tableName": "products",
            "description": "Keep release history lean; branches and tags keep their own retention.",
            "cronExpression": "0 4 1 * *", "enabled": False,
            "tasks": [
                {"name": "Expire snapshots", "actionType": "EXPIRE_SNAPSHOTS",
                 "parameters": {"retainLast": "30", "retries": "1", "retryDelaySeconds": "60"}},
            ],
        },
    ]
    existing = {p["name"] for p in call("GET", "/pipelines")}
    for p in pipelines:
        if p["name"] in existing:
            continue
        call("POST", "/pipelines", p)
        print(f"pipeline {p['name']}: created (disabled)")


SHOWCASE = "retail-lakehouse-showcase"      # the catalog with branches, tags and schema history
SHOWCASE_TAGS = ["showcase", "branches", "schema-evolution", "aws"]
LEGACY_NAMES = ["polaris-aws"]              # earlier name of the showcase catalog


def polaris_catalog(name: str, warehouse: str, tags: list) -> dict:
    return {
        "name": name, "uri": "http://polaris:8181/api/catalog", "warehouse": warehouse,
        "vendor": "POLARIS", "authType": "OAUTH2", "tags": tags,
        "credentials": {
            "credential": f"{ENV['POLARIS_ROOT_CLIENT_ID']}:{ENV['POLARIS_ROOT_CLIENT_SECRET']}",
            "oauth2-server-uri": "http://polaris:8181/api/catalog/v1/oauth/tokens",
            "scope": "PRINCIPAL_ROLE:ALL",
            # client.region is what Iceberg's S3FileIO reads; without it the backend falls back to
            # its AWS_REGION env var, and a mismatch with the bucket region gives S3 301 errors.
            "client.region": ENV["POLARIS_S3_REGION"],
            "s3.region": ENV["POLARIS_S3_REGION"],
            # Empty keys (EC2 instance profile): the backend uses its default AWS credentials.
            **({"s3.access-key-id": ENV["POLARIS_AWS_ACCESS_KEY_ID"],
                "s3.secret-access-key": ENV["POLARIS_AWS_SECRET_ACCESS_KEY"]}
               if ENV.get("POLARIS_AWS_ACCESS_KEY_ID") else {}),
        },
    }


def ensure_showcase() -> int:
    """The showcase catalog, renamed in place from a legacy name (same id: widgets and pipelines
    keep pointing at it)."""
    spec = polaris_catalog(SHOWCASE, ENV["POLARIS_CATALOG_NAME"], SHOWCASE_TAGS)
    by_name = {c["name"]: c for c in call("GET", "/catalogs")}
    for old in LEGACY_NAMES:
        if old in by_name and SHOWCASE not in by_name:
            call("PUT", f"/catalogs/{by_name[old]['id']}", spec)
            print(f"catalog {old}: renamed to {SHOWCASE} (id={by_name[old]['id']})")
            return by_name[old]["id"]
    return ensure_catalog(spec)


def batches(n: int, size: int, make_row, seed: int):
    rnd = random.Random(seed)
    return [[make_row(rnd, b, i) for i in range(size)] for b in range(n)]


def col(name, type_, required=False, doc=None):
    return {"name": name, "type": type_, "required": required, "doc": doc}


D0 = date(2026, 3, 1)
T0 = datetime(2026, 9, 1, tzinfo=timezone.utc)

# Extra catalogs: realistic names, each a real Polaris catalog (see POLARIS_EXTRA_CATALOGS) with a
# few namespaces/tables. They only need to look alive; the showcase holds the rich history.
EXTRA_CATALOGS = [
    ("finance-prod", ["prod", "finance", "pii"], [
        ("ledger", {"name": "transactions", "columns": [
            col("txn_id", "long", True), col("account_id", "long", True), col("amount", "double"),
            col("currency", "string"), col("booked_on", "date", True)],
            "partitionFields": [{"sourceColumn": "booked_on", "transform": "month"}]},
         batches(4, 50, lambda r, b, i: {
             "txn_id": b * 1000 + i, "account_id": r.randint(10_000, 10_200),
             "amount": round(r.uniform(-2_500, 9_000), 2), "currency": r.choice(["EUR", "EUR", "USD", "GBP"]),
             "booked_on": (D0 + timedelta(days=b * 31 + r.randint(0, 27))).isoformat()}, 11)),
        ("reporting", {"name": "monthly_revenue", "columns": [
            col("month", "date", True), col("region", "string", True), col("revenue", "double")]},
         batches(3, 4, lambda r, b, i: {
             "month": (D0 + timedelta(days=b * 31)).isoformat(),
             "region": ["EMEA", "NA", "APAC", "LATAM"][i], "revenue": round(r.uniform(80_000, 450_000), 2)}, 12)),
    ]),
    ("marketing-analytics", ["prod", "marketing"], [
        ("campaigns", {"name": "ad_spend", "columns": [
            col("campaign_id", "string", True), col("channel", "string"), col("spend", "double"),
            col("clicks", "long"), col("day", "date", True)],
            "partitionFields": [{"sourceColumn": "day", "transform": "day"}]},
         batches(5, 12, lambda r, b, i: {
             "campaign_id": f"cmp-{r.randint(100, 120)}", "channel": r.choice(["search", "social", "display", "email"]),
             "spend": round(r.uniform(50, 2_000), 2), "clicks": r.randint(10, 5_000),
             "day": (date(2026, 9, 1) + timedelta(days=b)).isoformat()}, 13)),
    ]),
    ("data-science-sandbox", ["dev", "sandbox"], [
        ("experiments", {"name": "churn_features", "columns": [
            col("customer_id", "long", True), col("tenure_months", "int"), col("monthly_charges", "double"),
            col("churn_score", "double", doc="Model v3 output")]},
         batches(2, 80, lambda r, b, i: {
             "customer_id": b * 1000 + i, "tenure_months": r.randint(1, 72),
             "monthly_charges": round(r.uniform(15, 120), 2), "churn_score": round(r.random(), 3)}, 14)),
    ]),
    # Registered but left empty: a demo lakehouse also has catalogs nobody filled yet.
    ("hr-people-analytics", ["prod", "hr", "pii"], []),
    ("supply-chain-dev", ["dev", "supply-chain"], []),
    ("customer-360-uat", ["uat", "crm"], []),
    ("iot-telemetry-staging", ["staging", "iot"], [
        ("sensors", {"name": "readings", "columns": [
            col("device_id", "string", True), col("metric", "string", True), col("value", "double"),
            col("recorded_at", "timestamptz", True)],
            "partitionFields": [{"sourceColumn": "recorded_at", "transform": "day"}]},
         batches(6, 60, lambda r, b, i: {
             "device_id": f"dev-{r.randint(1, 40):03d}", "metric": r.choice(["temperature", "humidity", "vibration"]),
             "value": round(r.uniform(0, 100), 2),
             "recorded_at": (T0 + timedelta(days=b, seconds=r.randint(0, 86_399))).isoformat()}, 15)),
    ]),
]


def main() -> None:
    if ENV.get("POLARIS_AWS_ACCESS_KEY_ID") == "CHANGE-ME":
        sys.exit("Set the POLARIS_AWS_* keys in .env first (or leave them empty on EC2).")
    print(f"Seeding {BASE}")
    catalog = ensure_showcase()
    ensure_table(catalog, "sales", ORDERS, order_batches())
    ensure_table(catalog, "web", EVENTS, event_batches())
    ensure_pipelines(catalog)
    ensure_widgets(catalog)

    wanted = set(ENV.get("POLARIS_EXTRA_CATALOGS", "").split())
    for name, tags, tables in EXTRA_CATALOGS:
        if name not in wanted:
            print(f"catalog {name}: skipped (not in POLARIS_EXTRA_CATALOGS)")
            continue
        cat = ensure_catalog(polaris_catalog(name, name, tags))
        for ns, table, rows in tables:
            try:
                ensure_table(cat, ns, {"properties": {"write.format.default": "parquet"}, **table}, rows)
            except SystemExit as e:  # e.g. S3 AccessDenied: report it and go on with the others
                print(f"  {ns}.{table['name']}: FAILED, {str(e)[:160]}")
    print(f"Done. Open {BASE}")


if __name__ == "__main__":
    main()
