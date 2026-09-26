#!/usr/bin/env bash
# Creates the Polaris catalog on AWS S3 and grants the root principal admin on it.
# Run ON THE VM from demo-deploy/, once the stack is up. Polaris is not published, so calls
# go through a throwaway curl container on the compose network (iceguard-demo_default).
set -euo pipefail
cd "$(dirname "$0")"
set -a; . ./.env; set +a

pcurl() { docker run --rm --network iceguard-demo_default curlimages/curl:latest -sS "$@"; }

echo "Waiting for Polaris…"
until TOKEN=$(pcurl http://polaris:8181/api/catalog/v1/oauth/tokens \
    -d grant_type=client_credentials -d "client_id=${POLARIS_ROOT_CLIENT_ID}" \
    -d "client_secret=${POLARIS_ROOT_CLIENT_SECRET}" -d scope=PRINCIPAL_ROLE:ALL 2>/dev/null \
    | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p') && [ -n "$TOKEN" ]; do sleep 3; done

create_catalog() {  # name location
  local name=$1 location=$2
  echo "Catalog ${name} at ${location}"
  local code
  code=$(pcurl -o /dev/null -w "%{http_code}" \
    -X POST http://polaris:8181/api/management/v1/catalogs \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"catalog\":{\"name\":\"${name}\",\"type\":\"INTERNAL\",
         \"properties\":{\"default-base-location\":\"${location}\"},
         \"storageConfigInfo\":{\"storageType\":\"S3\",\"allowedLocations\":[\"${location}\"],
                                \"region\":\"${POLARIS_S3_REGION}\"}}}")
  case "$code" in
    201) echo "  created" ;;
    409) echo "  already exists" ;;
    *)   echo "  FAILED: HTTP $code (e.g. locations of two catalogs must not overlap)"; return 1 ;;
  esac

  # Recent Polaris versions grant catalog_admin to service_admin on catalog creation; only add it
  # when missing (a duplicate grant fails with HTTP 500).
  local roles_url="http://polaris:8181/api/management/v1/principal-roles/service_admin/catalog-roles/${name}"
  if pcurl "$roles_url" -H "Authorization: Bearer $TOKEN" | grep -q '"catalog_admin"'; then
    echo "  service_admin already has catalog_admin"
  else
    pcurl -o /dev/null -w "  grant catalog_admin to service_admin: HTTP %{http_code}\n" -X PUT "$roles_url" \
      -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
      -d '{"catalogRole":{"name":"catalog_admin"}}'
  fi
}

# Main showcase catalog, then the extra ones. Polaris rejects catalogs whose locations overlap, so
# the extras live under a SIBLING prefix (default s3://<bucket>/polaris-catalogs/<name>), which the
# IAM policy must allow too (see iam-policy.json).
BUCKET_URL=$(echo "${POLARIS_S3_LOCATION}" | sed 's#^\(s3://[^/]*\).*#\1#')
EXTRA_BASE="${POLARIS_EXTRA_S3_LOCATION:-${BUCKET_URL}/polaris-catalogs}"
create_catalog "${POLARIS_CATALOG_NAME}" "${POLARIS_S3_LOCATION}"
for extra in ${POLARIS_EXTRA_CATALOGS:-}; do
  create_catalog "${extra}" "${EXTRA_BASE%/}/${extra}"
done
