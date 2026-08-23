-- Extensions used across the schema.
--
-- postgis      : geography types for parking locations and distance queries
-- btree_gist   : lets an exclusion constraint index scalar columns (needed for
--                the reservation double-booking guard)
-- pg_trgm      : trigram search over parking names/descriptions
create extension if not exists postgis;
create extension if not exists btree_gist;
create extension if not exists pg_trgm;
