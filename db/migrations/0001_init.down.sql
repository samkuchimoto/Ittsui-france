-- 0001_init.down.sql -- rollback for 0001_init.sql
-- Drops in reverse dependency order so foreign keys never block a DROP.
DROP TABLE IF EXISTS slot_instance_responses;
DROP TABLE IF EXISTS slot_instances;
DROP TABLE IF EXISTS recurring_slots;
DROP TABLE IF EXISTS community_members;
DROP TABLE IF EXISTS communities;
DROP TABLE IF EXISTS pair_members;
DROP TABLE IF EXISTS pairs;
DROP TABLE IF EXISTS users;
