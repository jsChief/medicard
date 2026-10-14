-- =============================================================================
-- CardEase — Realtime completeness for notifications
--
-- The default replica identity puts only the primary key in the old tuple, so
-- a Realtime filter on a non-key column (recipient_id) cannot be evaluated for
-- DELETE events and dismissing a notification would not propagate to the
-- user's other tabs. The table is tiny, so the extra WAL volume is negligible.
-- =============================================================================
alter table public.notifications replica identity full;
