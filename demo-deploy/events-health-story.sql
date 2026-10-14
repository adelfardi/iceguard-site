-- Storage-health showcase on web.events: one day partition per health state.
-- Run with ./spark-story.sh events-health-story.sql, then size the table's target file size and the
-- demo's small-file threshold from the resulting files (see README, section 4).
--   2026-09-10  green      one well-sized file
--   2026-09-11  amber      two files around 60-70 % of the target
--   2026-09-12  red        many tiny files from micro-batches: compaction needed
--   2026-09-13  amber      well-sized files, one delete file (merge-on-read)
--   2026-09-14  red        one well-sized file, several delete files

SET spark.sql.session.timeZone = UTC;
-- Generated values are nullable expressions; the target columns are NOT NULL.
SET `spark.sql.iceberg.check-nullability` = false;

-- Row-level deletes write position delete files instead of rewriting data files.
ALTER TABLE demo.web.events SET TBLPROPERTIES (
  'format-version' = '2',
  'write.delete.mode' = 'merge-on-read',
  'write.update.mode' = 'merge-on-read',
  'write.merge.mode' = 'merge-on-read'
);

-- 2026-09-10: one well-sized file
INSERT INTO demo.web.events
SELECT concat('h10-', uuid()),
       element_at(array('page_view', 'click', 'signup', 'purchase'), cast(floor(rand() * 4) AS INT) + 1),
       cast(floor(rand() * 1000000) AS BIGINT),
       timestamp'2026-09-10 00:00:00' + make_dt_interval(0, 0, 0, id % 86400)
FROM range(4000);

-- 2026-09-11: two files, smaller than the target
INSERT INTO demo.web.events
SELECT concat('h11a-', uuid()), 'page_view', cast(floor(rand() * 1000000) AS BIGINT),
       timestamp'2026-09-11 00:00:00' + make_dt_interval(0, 0, 0, id % 86400)
FROM range(2600);
INSERT INTO demo.web.events
SELECT concat('h11b-', uuid()), 'click', cast(floor(rand() * 1000000) AS BIGINT),
       timestamp'2026-09-11 00:00:00' + make_dt_interval(0, 0, 0, id % 86400)
FROM range(2600);

-- 2026-09-12: streaming-style micro-batches, one tiny file each
INSERT INTO demo.web.events SELECT concat('h12-01-', uuid()), 'page_view', id, timestamp'2026-09-12 00:01:00' + make_dt_interval(0, 0, 0, id) FROM range(60);
INSERT INTO demo.web.events SELECT concat('h12-02-', uuid()), 'click', id, timestamp'2026-09-12 01:05:00' + make_dt_interval(0, 0, 0, id) FROM range(60);
INSERT INTO demo.web.events SELECT concat('h12-03-', uuid()), 'page_view', id, timestamp'2026-09-12 02:10:00' + make_dt_interval(0, 0, 0, id) FROM range(60);
INSERT INTO demo.web.events SELECT concat('h12-04-', uuid()), 'signup', id, timestamp'2026-09-12 03:15:00' + make_dt_interval(0, 0, 0, id) FROM range(60);
INSERT INTO demo.web.events SELECT concat('h12-05-', uuid()), 'page_view', id, timestamp'2026-09-12 04:20:00' + make_dt_interval(0, 0, 0, id) FROM range(60);
INSERT INTO demo.web.events SELECT concat('h12-06-', uuid()), 'click', id, timestamp'2026-09-12 05:25:00' + make_dt_interval(0, 0, 0, id) FROM range(60);
INSERT INTO demo.web.events SELECT concat('h12-07-', uuid()), 'purchase', id, timestamp'2026-09-12 06:30:00' + make_dt_interval(0, 0, 0, id) FROM range(60);
INSERT INTO demo.web.events SELECT concat('h12-08-', uuid()), 'page_view', id, timestamp'2026-09-12 07:35:00' + make_dt_interval(0, 0, 0, id) FROM range(60);
INSERT INTO demo.web.events SELECT concat('h12-09-', uuid()), 'click', id, timestamp'2026-09-12 08:40:00' + make_dt_interval(0, 0, 0, id) FROM range(60);
INSERT INTO demo.web.events SELECT concat('h12-10-', uuid()), 'page_view', id, timestamp'2026-09-12 09:45:00' + make_dt_interval(0, 0, 0, id) FROM range(60);
INSERT INTO demo.web.events SELECT concat('h12-11-', uuid()), 'signup', id, timestamp'2026-09-12 10:50:00' + make_dt_interval(0, 0, 0, id) FROM range(60);
INSERT INTO demo.web.events SELECT concat('h12-12-', uuid()), 'page_view', id, timestamp'2026-09-12 11:55:00' + make_dt_interval(0, 0, 0, id) FROM range(60);

-- 2026-09-13: three well-sized files, then one delete (one position delete file)
INSERT INTO demo.web.events
SELECT concat('h13a-', uuid()), 'page_view', cast(floor(rand() * 1000000) AS BIGINT),
       timestamp'2026-09-13 00:00:00' + make_dt_interval(0, 0, 0, id % 86400)
FROM range(4000);
INSERT INTO demo.web.events
SELECT concat('h13b-', uuid()), 'click', cast(floor(rand() * 1000000) AS BIGINT),
       timestamp'2026-09-13 00:00:00' + make_dt_interval(0, 0, 0, id % 86400)
FROM range(4000);
INSERT INTO demo.web.events
SELECT concat('h13c-', uuid()), 'purchase', cast(floor(rand() * 1000000) AS BIGINT),
       timestamp'2026-09-13 00:00:00' + make_dt_interval(0, 0, 0, id % 86400)
FROM range(4000);
DELETE FROM demo.web.events
WHERE created_at >= timestamp'2026-09-13 00:00:00' AND created_at < timestamp'2026-09-14 00:00:00'
  AND event_id LIKE 'h13a-%' AND user_id % 50 = 0;

-- 2026-09-14: one well-sized file, then three GDPR-style deletes (three delete files)
INSERT INTO demo.web.events
SELECT concat('h14-', uuid()), 'page_view', cast(floor(rand() * 1000000) AS BIGINT),
       timestamp'2026-09-14 00:00:00' + make_dt_interval(0, 0, 0, id % 86400)
FROM range(4000);
DELETE FROM demo.web.events WHERE created_at >= timestamp'2026-09-14 00:00:00' AND created_at < timestamp'2026-09-15 00:00:00' AND user_id % 97 = 1;
DELETE FROM demo.web.events WHERE created_at >= timestamp'2026-09-14 00:00:00' AND created_at < timestamp'2026-09-15 00:00:00' AND user_id % 97 = 2;
DELETE FROM demo.web.events WHERE created_at >= timestamp'2026-09-14 00:00:00' AND created_at < timestamp'2026-09-15 00:00:00' AND user_id % 97 = 3;

SELECT partition.created_at_day, content, count(*) AS files, sum(file_size_in_bytes) AS bytes,
       cast(avg(file_size_in_bytes) AS BIGINT) AS avg_bytes
FROM demo.web.events.files
GROUP BY partition.created_at_day, content
ORDER BY 1, 2;
