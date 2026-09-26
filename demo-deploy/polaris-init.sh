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

echo "Creating catalog ${POLARIS_CATALOG_NAME} at ${POLARIS_S3_LOCATION}"
pcurl -o /dev/null -w "  catalog: HTTP %{http_code} (409 = already exists)\n" \
  -X POST http://polaris:8181/api/management/v1/catalogs \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"catalog\":{\"name\":\"${POLARIS_CATALOG_NAME}\",\"type\":\"INTERNAL\",
       \"properties\":{\"default-base-location\":\"${POLARIS_S3_LOCATION}\"},
       \"storageConfigInfo\":{\"storageType\":\"S3\",\"allowedLocations\":[\"${POLARIS_S3_LOCATION}\"],
                              \"region\":\"${POLARIS_S3_REGION}\"}}}"

# Recent Polaris versions grant catalog_admin to service_admin on catalog creation; only add it
# when missing (a duplicate grant fails with HTTP 500).
ROLES_URL="http://polaris:8181/api/management/v1/principal-roles/service_admin/catalog-roles/${POLARIS_CATALOG_NAME}"
if pcurl "$ROLES_URL" -H "Authorization: Bearer $TOKEN" | grep -q '"catalog_admin"'; then
  echo "  service_admin already has catalog_admin"
else
  pcurl -o /dev/null -w "  grant catalog_admin to service_admin: HTTP %{http_code}\n" -X PUT "$ROLES_URL" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d '{"catalogRole":{"name":"catalog_admin"}}'
fi
