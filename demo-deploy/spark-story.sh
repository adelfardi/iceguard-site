#!/usr/bin/env bash
# Runs a Spark SQL file against the demo's Polaris catalog (as Spark catalog `demo`), in a
# throwaway container on the stack network. Needed for what the IceGuard API cannot do:
# branches, tags, schema changes. Run ON THE VM from demo-deploy/:  ./spark-story.sh [file.sql]
set -euo pipefail
cd "$(dirname "$0")"
set -a; . ./.env; set +a
SQL_FILE="${1:-products-story.sql}"
ICEBERG=1.10.0

# Secrets go through a spark-defaults file (0600, removed on exit), never on the command line.
CONF=$(mktemp); trap 'rm -f "$CONF"' EXIT; chmod 600 "$CONF"
cat > "$CONF" <<CONF
spark.jars.ivy                            /tmp/.ivy
spark.jars.packages                       org.apache.iceberg:iceberg-spark-runtime-3.5_2.12:${ICEBERG},org.apache.iceberg:iceberg-aws-bundle:${ICEBERG}
spark.sql.extensions                      org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions
spark.sql.catalog.demo                    org.apache.iceberg.spark.SparkCatalog
spark.sql.catalog.demo.type               rest
spark.sql.catalog.demo.uri                http://polaris:8181/api/catalog
spark.sql.catalog.demo.warehouse          ${POLARIS_CATALOG_NAME}
spark.sql.catalog.demo.credential         ${POLARIS_ROOT_CLIENT_ID}:${POLARIS_ROOT_CLIENT_SECRET}
spark.sql.catalog.demo.scope              PRINCIPAL_ROLE:ALL
# Polaris refuses client metrics reports (REPORT_WRITE_METRICS): harmless, but noisy.
spark.sql.catalog.demo.rest-metrics-reporting-enabled false
spark.sql.catalog.demo.io-impl            org.apache.iceberg.aws.s3.S3FileIO
spark.sql.catalog.demo.client.region      ${POLARIS_S3_REGION}
spark.sql.catalog.demo.s3.access-key-id   ${POLARIS_AWS_ACCESS_KEY_ID}
spark.sql.catalog.demo.s3.secret-access-key ${POLARIS_AWS_SECRET_ACCESS_KEY}
CONF

docker run --rm --user root --network iceguard-demo_default \
  -v "$CONF:/opt/spark/conf/spark-defaults.conf:ro" \
  -v "$PWD/$SQL_FILE:/story.sql:ro" \
  apache/spark:3.5.6 /opt/spark/bin/spark-sql --master 'local[2]' --driver-memory 1g -f /story.sql \
  2> >(grep -vE ' (INFO|WARN) |^\s*$|:: |confs:|found org|downloading|artifacts|resolution report|modules|^\s+\||----' >&2)
