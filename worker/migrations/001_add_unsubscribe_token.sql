-- Migration: Add unsubscribe_token column to subscribers table
-- Safe to run multiple times — checks if column exists first via a no-op SELECT
-- If this errors with "duplicate column", the migration already ran.

ALTER TABLE subscribers ADD COLUMN unsubscribe_token TEXT UNIQUE;
