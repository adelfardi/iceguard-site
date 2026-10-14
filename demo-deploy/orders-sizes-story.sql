-- File-size spread on sales.orders: one historical month per size bucket of the Storage
-- histogram (1-8, 8-32, 32-128, 128-512 MB). customer = sha2(uuid) keeps the data barely
-- compressible (~74 bytes/row in Parquet), so row counts give predictable file sizes.
-- Run with: SPARK_DRIVER_MEMORY=3g ./spark-story.sh orders-sizes-story.sql

SET spark.sql.session.timeZone = UTC;
SET `spark.sql.iceberg.check-nullability` = false;

-- 2025-10: ~5 MB (1-8 MB), 71,032 rows
INSERT INTO demo.sales.orders
SELECT 1000000 + id, sha2(uuid(), 512),
       element_at(array('FR', 'DE', 'ES', 'IT', 'US', 'GB'), cast(floor(rand() * 6) AS INT) + 1),
       round(rand() * 900 + 5, 2), date'2025-10-01' + cast(id % 28 AS INT)
FROM range(71032);

-- 2025-11: ~12 MB (8-32 MB), 170,477 rows
INSERT INTO demo.sales.orders
SELECT 11000000 + id, sha2(uuid(), 512),
       element_at(array('FR', 'DE', 'ES', 'IT', 'US', 'GB'), cast(floor(rand() * 6) AS INT) + 1),
       round(rand() * 900 + 5, 2), date'2025-11-01' + cast(id % 28 AS INT)
FROM range(170477);

-- 2025-12: ~24 MB (8-32 MB), 340,954 rows
INSERT INTO demo.sales.orders
SELECT 21000000 + id, sha2(uuid(), 512),
       element_at(array('FR', 'DE', 'ES', 'IT', 'US', 'GB'), cast(floor(rand() * 6) AS INT) + 1),
       round(rand() * 900 + 5, 2), date'2025-12-01' + cast(id % 28 AS INT)
FROM range(340954);

-- 2026-01: ~70 MB (32-128 MB), 994,450 rows
INSERT INTO demo.sales.orders
SELECT 31000000 + id, sha2(uuid(), 512),
       element_at(array('FR', 'DE', 'ES', 'IT', 'US', 'GB'), cast(floor(rand() * 6) AS INT) + 1),
       round(rand() * 900 + 5, 2), date'2026-01-01' + cast(id % 28 AS INT)
FROM range(994450);

-- 2026-02: ~180 MB (128-512 MB), 2,557,157 rows
INSERT INTO demo.sales.orders
SELECT 41000000 + id, sha2(uuid(), 512),
       element_at(array('FR', 'DE', 'ES', 'IT', 'US', 'GB'), cast(floor(rand() * 6) AS INT) + 1),
       round(rand() * 900 + 5, 2), date'2026-02-01' + cast(id % 28 AS INT)
FROM range(2557157);

SELECT partition.order_date_month, count(*) AS files, sum(file_size_in_bytes) AS bytes
FROM demo.sales.orders.files GROUP BY 1 ORDER BY 1;
