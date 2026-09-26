-- A product catalogue that lives like a real one: releases tagged, a backfill branch forked
-- from an old release, a pricing experiment, a hotfix branch, and four schema changes on main.
-- Run with ./spark-story.sh (catalog `demo` = Polaris). Not idempotent: the table must not exist.

CREATE NAMESPACE IF NOT EXISTS demo.sales;

CREATE TABLE demo.sales.products (
  product_id BIGINT COMMENT 'Product identifier',
  name       STRING,
  category   STRING,
  price      DOUBLE COMMENT 'List price (EUR)'
) USING iceberg
PARTITIONED BY (category)
TBLPROPERTIES ('format-version' = '2', 'write.format.default' = 'parquet');

-- Initial catalogue, then release v1.0
INSERT INTO demo.sales.products VALUES
  (1, 'Trail Runner', 'shoes', 89.0), (2, 'City Sneaker', 'shoes', 69.0),
  (3, 'Rain Jacket', 'apparel', 120.0), (4, 'Wool Beanie', 'apparel', 25.0);
INSERT INTO demo.sales.products VALUES (5, 'Daypack 20L', 'bags', 55.0), (6, 'Duffel 40L', 'bags', 85.0);
ALTER TABLE demo.sales.products CREATE TAG `v1.0` RETAIN 365 DAYS;

-- The legacy backfill job works from the v1.0 catalogue
ALTER TABLE demo.sales.products CREATE BRANCH `etl-backfill` RETAIN 30 DAYS WITH SNAPSHOT RETENTION 5 SNAPSHOTS;

-- Schema change 1: stock tracking
ALTER TABLE demo.sales.products ADD COLUMN stock INT COMMENT 'Units in stock';
INSERT INTO demo.sales.products VALUES (7, 'Trail Socks', 'apparel', 12.0, 300), (8, 'Hiking Boot', 'shoes', 149.0, 40);

-- Pricing team forks here to test promotions
ALTER TABLE demo.sales.products CREATE BRANCH `pricing-experiment` RETAIN 14 DAYS;

-- Schema change 2: clearer column name
ALTER TABLE demo.sales.products RENAME COLUMN name TO product_name;
INSERT INTO demo.sales.products VALUES (9, 'Sling Bag', 'bags', 39.0, 120);

-- Schema change 3: discounts, then release v1.1
ALTER TABLE demo.sales.products ADD COLUMN discount DOUBLE COMMENT 'Discount rate (0-1)';
INSERT INTO demo.sales.products VALUES (10, 'Trail Runner GTX', 'shoes', 119.0, 60, 0.10);
ALTER TABLE demo.sales.products CREATE TAG `v1.1` RETAIN 365 DAYS;

-- Hotfix branch cut from v1.1
ALTER TABLE demo.sales.products CREATE BRANCH `hotfix-prices` RETAIN 7 DAYS;

-- Schema change 4: stock outgrows INT; a discontinued product; a new one
ALTER TABLE demo.sales.products ALTER COLUMN stock TYPE BIGINT;
DELETE FROM demo.sales.products WHERE product_id = 4;
INSERT INTO demo.sales.products VALUES (11, 'Down Jacket', 'apparel', 210.0, 25, 0.0);

-- Work on the branches (they diverge from main)
INSERT INTO demo.sales.products.`branch_etl-backfill` VALUES (101, 'Legacy Sandal', 'shoes', 35.0, 10, NULL);
INSERT INTO demo.sales.products.`branch_etl-backfill` VALUES (102, 'Legacy Tote', 'bags', 22.0, 15, NULL);
INSERT INTO demo.sales.products.`branch_pricing-experiment` VALUES (201, 'Trail Runner (promo)', 'shoes', 79.0, 100, 0.15);
DELETE FROM demo.sales.products.`branch_pricing-experiment` WHERE product_id = 2;
INSERT INTO demo.sales.products.`branch_hotfix-prices` VALUES (301, 'Rain Jacket v2', 'apparel', 110.0, 80, 0.05);

SELECT name, type, snapshot_id FROM demo.sales.products.refs ORDER BY type, name;
