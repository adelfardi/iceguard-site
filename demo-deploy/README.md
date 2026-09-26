# IceGuard public demo: deployment kit

Runs the public read-only demo (**https://demo.iceguard.cloud**) on a VM that already has a reverse
proxy for other sites. Copy `.env.sample` to `.env` and fill it in: `.env` holds the secrets and is
git-ignored, never commit it.

```
Internet ─443─▶ existing reverse proxy (HTTPS) ─▶ guard:80 (Caddy, read-only) ─▶ frontend:80 ─/api─▶ backend:8080
                                                   backend ──▶ postgres (state) · polaris ──▶ AWS S3
```

One `docker-compose.yml`: a read-only guard (Caddy), IceGuard (published GHCR images), Postgres and
Apache Polaris.

- **Read-only** is enforced by the guard: any non-`GET` on `/api/*` gets a 403 unless it carries
  `X-IceGuard-Admin-Token` (`ICEGUARD_ADMIN_TOKEN` in `.env`).
- The frontend runs with `ICEGUARD_DEMO_MODE=true`: banner + a clear message instead of failed actions.
- Nothing is published publicly: the guard joins the reverse proxy's Docker network
  (`EDGE_NETWORK`) as `iceguard-demo-guard`; the backend listens on `127.0.0.1:8080` of the VM
  (admin over SSH); Postgres and Polaris are internal.

| File | What |
|---|---|
| `docker-compose.yml` | guard, frontend, backend, postgres, polaris (+ one-shot `polaris-bootstrap`) |
| `.env.sample` | template for `.env`: domain, image version, admin token, secrets, AWS settings |
| `Caddyfile` | the read-only guard (plain HTTP behind the reverse proxy) |
| `init-dbs.sql` | creates the `polaris` database on a fresh Postgres volume |
| `polaris-init.sh` | creates the Polaris catalog on S3 (run on the VM) |
| `seed.py` | registers the catalog, demo tables, dashboard widgets and pipelines through the API |
| `spark-story.sh`, `products-story.sql` | branches, tags and schema changes via Spark SQL |
| `iam-policy.json` | least-privilege S3 policy for the Polaris IAM user |

## 1. AWS: S3 for Polaris, with keys that never expire

Temporary STS credentials (`aws sso`, assumed roles) expire after about an hour. Use a **dedicated
IAM user with an access key** instead: no session token, no expiry.

1. Create a bucket (or reuse one) and pick a prefix, e.g. `s3://my-bucket/polaris-demo`. The extra
   catalogs (`POLARIS_EXTRA_CATALOGS`) go under the sibling prefix `polaris-catalogs/` (Polaris
   rejects catalogs whose locations overlap); `iam-policy.json` allows both prefixes.
2. IAM → Users → create `iceguard-demo-polaris` (no console access), attach an inline policy from
   `iam-policy.json` (replace `CHANGE-ME-bucket`, and `polaris-demo` if you use another prefix).
3. Security credentials → **Create access key** → "Application running outside AWS".
4. In `.env`: `POLARIS_S3_LOCATION`, `POLARIS_S3_REGION`, `POLARIS_AWS_ACCESS_KEY_ID`,
   `POLARIS_AWS_SECRET_ACCESS_KEY`.

**VM on EC2?** Better: attach an **instance profile** (IAM role with the same policy) and leave both
key variables empty. The AWS SDK uses the role's credentials and rotates them itself.

Rotating the key: create the new one, update `.env`, `docker compose up -d polaris`, update the
catalog's `s3.*` credentials in IceGuard, then delete the old key.

## 2. VM

Requirements: Docker + Compose, ~3 GB RAM, a reverse proxy already serving HTTPS in Docker, and the
DNS record `A demo.iceguard.cloud → VM IP`.

```bash
scp -r demo-deploy vm:~/ && ssh vm
cd ~/demo-deploy
cp .env.sample .env && chmod 600 .env && vi .env                  # secrets, EDGE_NETWORK, AWS
docker compose up -d postgres
docker compose --profile bootstrap run --rm polaris-bootstrap     # once, on a fresh volume
docker compose up -d
./polaris-init.sh                                                 # Polaris catalogs on S3 (idempotent)
```

`polaris-init.sh` creates the showcase catalog (`POLARIS_CATALOG_NAME`) and every extra catalog of
`POLARIS_EXTRA_CATALOGS` (quoted, space-separated) at `s3://<bucket>/polaris-catalogs/<name>`
(override with `POLARIS_EXTRA_S3_LOCATION`).

Then point the reverse proxy at the guard. With Caddy (reload gracefully afterwards):

```
demo.iceguard.cloud {
	reverse_proxy iceguard-demo-guard:80 {
		header_up X-Forwarded-Host {host}
		header_up X-Forwarded-Proto {scheme}
	}
}
```

`ICEGUARD_VERSION` must be a published tag that includes the demo mode: `0.3.0` once released, or
`edge` / `sha-*` for a snapshot (`gh workflow run snapshot.yml --ref <branch>`). Older images still
work behind the guard, just without the banner.

After editing `.env`, run `docker compose up -d` without a service name: Compose recreates every
container whose settings changed (e.g. the backend reads `POLARIS_S3_REGION` too).

## 3. Seed the demo (from your machine)

```bash
python3 seed.py          # https://$ICEGUARD_DOMAIN with the admin token from .env
```

Registers the showcase catalog `retail-lakehouse-showcase` (renaming the older `polaris-aws` in
place), the extra catalogs with a namespace and a table each, and creates `sales.orders` and `web.events` with several inserts each (so every
table has a snapshot history), three maintenance pipelines and the dashboard widgets. Re-running only
adds what is missing.

The pipelines are created **disabled**: the scheduler runs server-side, behind the guard, and an
`expire_snapshots` would really delete the demo's history.

Any other write works the same way:

```bash
TOKEN=$(grep ^ICEGUARD_ADMIN_TOKEN .env | cut -d= -f2)
curl -X POST https://demo.iceguard.cloud/api/catalogs/1/namespaces \
     -H "X-IceGuard-Admin-Token: $TOKEN" -H "Content-Type: application/json" \
     -d '{"namespace":"marketing"}'
```

Rather not send the token over the Internet? `ssh -L 8080:localhost:8080 vm`, then
`ICEGUARD_URL=http://localhost:8080 python3 seed.py`.

## 4. Branches, tags and schema changes (Spark)

The IceGuard API cannot create branches/tags or evolve schemas, so `spark-story.sh` runs a Spark SQL
file against Polaris (as catalog `demo`) in a throwaway `apache/spark` container on the stack
network. Run it on the VM:

```bash
./spark-story.sh                    # products-story.sql: sales.products with 3 branches, 2 tags,
                                    # 4 schema changes (not idempotent: the table must not exist)
./spark-story.sh my-changes.sql     # any other script
```

Secrets reach Spark through a temporary `spark-defaults.conf` (0600, deleted on exit).

## Operations

- **Upgrade:** bump `ICEGUARD_VERSION` in `.env`, then `docker compose pull && docker compose up -d`.
- **Rotate the admin token:** edit `.env`, then `docker compose up -d --force-recreate guard`
  (a reload does not re-read `{$VAR}`).
- **Reset the data:** `docker compose down && docker volume rm iceguard-demo_postgres-data`, then
  redo steps 2 to 4. S3 objects under the Polaris prefix are not deleted.
- **Check the guard:** `curl -X DELETE https://demo.iceguard.cloud/api/catalogs/1` must answer
  `403 IceGuard public demo is read-only`.
- **Changing published ports in an override file:** use `ports: !override [...]`. `!reset [...]`
  empties the list and ignores the value.
