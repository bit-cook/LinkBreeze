-- 0024: Share & wallet exports — per-page opt-in toggle for the public
-- share block (vCard + wallet buttons). share_enabled is per-page so an
-- operator running multiple pages (personal, work, a client's) chooses
-- per page. NULL = off (the block is opt-in, never on by default).

ALTER TABLE "pages" ADD "share_enabled" integer DEFAULT NULL;
