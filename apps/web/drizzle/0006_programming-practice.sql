CREATE TABLE practice_challenges (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE practice_challenge_revisions (
  id text PRIMARY KEY,
  challenge_id text NOT NULL REFERENCES practice_challenges(id),
  revision integer NOT NULL CHECK (revision > 0),
  content jsonb NOT NULL,
  content_digest text NOT NULL CHECK (content_digest ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX practice_revision_number_unique ON practice_challenge_revisions(challenge_id, revision);
--> statement-breakpoint
CREATE TABLE practice_drafts (
  revision_id text PRIMARY KEY REFERENCES practice_challenge_revisions(id),
  source text NOT NULL CHECK (char_length(source) <= 12000),
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE practice_attempts (
  id text PRIMARY KEY,
  revision_id text NOT NULL REFERENCES practice_challenge_revisions(id),
  source text NOT NULL CHECK (char_length(source) BETWEEN 1 AND 12000),
  mode text NOT NULL CHECK (mode IN ('examples', 'check')),
  source_digest text NOT NULL CHECK (source_digest ~ '^[a-f0-9]{64}$'),
  cases_digest text NOT NULL CHECK (cases_digest ~ '^[a-f0-9]{64}$'),
  runtime_version text NOT NULL,
  report jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT practice_attempt_completion_pair CHECK ((report IS NULL) = (completed_at IS NULL))
);
--> statement-breakpoint
CREATE INDEX practice_attempt_revision_created_idx ON practice_attempts(revision_id, created_at DESC);
--> statement-breakpoint
CREATE FUNCTION practice_reject_revision_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Challenge revisions are immutable';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER practice_immutable_revision BEFORE UPDATE OR DELETE ON practice_challenge_revisions
FOR EACH ROW EXECUTE FUNCTION practice_reject_revision_mutation();
--> statement-breakpoint
CREATE FUNCTION practice_protect_attempt() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Attempts cannot be deleted';
  END IF;
  IF (to_jsonb(NEW) - 'report' - 'completed_at') IS DISTINCT FROM
     (to_jsonb(OLD) - 'report' - 'completed_at')
     OR OLD.report IS NOT NULL OR NEW.report IS NULL OR NEW.completed_at IS NULL THEN
    RAISE EXCEPTION 'Attempt snapshots and completed reports are immutable';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER practice_immutable_attempt BEFORE UPDATE OR DELETE ON practice_attempts
FOR EACH ROW EXECUTE FUNCTION practice_protect_attempt();
