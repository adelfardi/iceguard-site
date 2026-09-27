#!/usr/bin/env python3
"""First-run setup of the self-hosted Umami (run ON THE VM, stdlib only, idempotent):
replaces the default admin/umami password with UMAMI_ADMIN_PASSWORD from .env, creates the
websites listed in UMAMI_WEBSITES, and prints their tracking snippets."""
import json
import time
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
BASE = "http://127.0.0.1:3100/api"


def load_env() -> dict:
    env = {}
    for line in (HERE / ".env").read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            v = v.strip()
            if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
                v = v[1:-1]
            env[k.strip()] = v
    return env


def call(method, path, body=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(BASE + path, method=method, headers=headers,
                                 data=None if body is None else json.dumps(body).encode())
    with urllib.request.urlopen(req, timeout=30) as r:
        raw = r.read()
        return json.loads(raw) if raw else None


def login(user, password):
    try:
        return call("POST", "/auth/login", {"username": user, "password": password})["token"]
    except urllib.error.HTTPError:
        return None


def main():
    env = load_env()
    for _ in range(60):  # wait for Umami (DB migrations on first boot)
        try:
            urllib.request.urlopen("http://127.0.0.1:3100/api/heartbeat", timeout=5)
            break
        except Exception:
            time.sleep(3)

    new_pw = env["UMAMI_ADMIN_PASSWORD"]
    token = login("admin", new_pw)
    if token:
        print("admin: password already set")
    else:
        token = login("admin", "umami")
        if not token:
            raise SystemExit("Cannot log in as admin (neither UMAMI_ADMIN_PASSWORD nor the default).")
        call("POST", "/me/password", {"currentPassword": "umami", "newPassword": new_pw}, token)
        token = login("admin", new_pw)
        print("admin: default password replaced")

    listed = call("GET", "/websites?pageSize=100", token=token)
    existing = {w["domain"]: w for w in (listed.get("data", listed) if isinstance(listed, dict) else listed)}
    domain = env["STATS_DOMAIN"]
    for item in env["UMAMI_WEBSITES"].split():
        name, host = item.split("|", 1)
        site = existing.get(host) or call("POST", "/websites", {"name": name, "domain": host}, token)
        print(f"\n{name} ({host})  website id: {site['id']}")
        print(f'  <script defer src="https://{domain}/script.js" data-website-id="{site["id"]}"></script>')


if __name__ == "__main__":
    main()
