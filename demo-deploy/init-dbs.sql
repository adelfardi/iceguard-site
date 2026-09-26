-- Extra database created on a fresh Postgres volume (docker-entrypoint-initdb.d):
--   polaris -> Apache Polaris (relational-jdbc persistence)
SELECT 'CREATE DATABASE polaris'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'polaris')\gexec
