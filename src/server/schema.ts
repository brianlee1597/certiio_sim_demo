export const schema = `
CREATE TABLE IF NOT EXISTS invitations (
 id text PRIMARY KEY, name text NOT NULL, email text NOT NULL,
 created_at double precision NOT NULL, expires_at double precision NOT NULL,
 email_status text NOT NULL DEFAULT 'pending', email_id text, email_error text, email_sent_at double precision
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash text PRIMARY KEY, role text NOT NULL, invite_id text REFERENCES invitations(id),
 expires_at double precision NOT NULL
);
CREATE TABLE IF NOT EXISTS stage_runs (
 invite_id text REFERENCES invitations(id) ON DELETE CASCADE, stage text NOT NULL,
 status text NOT NULL DEFAULT 'not_started', started_at double precision, deadline double precision,
 submitted_at double precision, submission_reason text, revision integer NOT NULL DEFAULT 0,
 payload jsonb NOT NULL DEFAULT '{}', PRIMARY KEY(invite_id,stage)
);
CREATE TABLE IF NOT EXISTS transcript_segments (
 invite_id text REFERENCES invitations(id) ON DELETE CASCADE, segment_id text NOT NULL,
 speaker text NOT NULL, text text NOT NULL, occurred_at double precision NOT NULL, final boolean NOT NULL DEFAULT true,
 PRIMARY KEY(invite_id,segment_id)
);
CREATE TABLE IF NOT EXISTS artifacts (
 id text PRIMARY KEY, invite_id text NOT NULL REFERENCES invitations(id), stage text NOT NULL,
 kind text NOT NULL, pathname text UNIQUE NOT NULL, name text NOT NULL, size bigint NOT NULL,
 status text NOT NULL DEFAULT 'pending', url text, created_at double precision NOT NULL
);
CREATE TABLE IF NOT EXISTS rate_limits (
 key text PRIMARY KEY, count integer NOT NULL, resets_at double precision NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS artifacts_invite ON artifacts(invite_id);
`;
