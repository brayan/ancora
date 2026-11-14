CREATE TABLE practice_generations (
  id text PRIMARY KEY,
  request jsonb NOT NULL,
  state text NOT NULL CHECK (state IN ('generating', 'validating', 'correction_available', 'ready', 'rejected', 'interrupted')),
  dispatches integer NOT NULL CHECK (dispatches BETWEEN 1 AND 2),
  revision_id text REFERENCES practice_challenge_revisions(id),
  error text,
  model text,
  events jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(events) = 'array' AND jsonb_array_length(events) <= 12),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE practice_generation_candidates (
  revision_id text PRIMARY KEY REFERENCES practice_challenge_revisions(id),
  generation_id text NOT NULL REFERENCES practice_generations(id),
  dispatch integer NOT NULL CHECK (dispatch BETWEEN 1 AND 2),
  job_id text NOT NULL,
  report jsonb,
  approved boolean NOT NULL DEFAULT false,
  CONSTRAINT practice_candidate_approval_report CHECK (NOT approved OR report IS NOT NULL)
);
--> statement-breakpoint
CREATE UNIQUE INDEX practice_generation_dispatch_unique ON practice_generation_candidates(generation_id, dispatch);
--> statement-breakpoint
CREATE UNIQUE INDEX practice_generation_job_unique ON practice_generation_candidates(job_id);
--> statement-breakpoint
CREATE FUNCTION practice_protect_candidate() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Generation candidates cannot be deleted';
  END IF;
  IF (to_jsonb(NEW) - 'report' - 'approved') IS DISTINCT FROM
     (to_jsonb(OLD) - 'report' - 'approved')
     OR OLD.report IS NOT NULL OR NEW.report IS NULL THEN
    RAISE EXCEPTION 'Candidate identity and validation reports are immutable';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER practice_immutable_candidate BEFORE UPDATE OR DELETE ON practice_generation_candidates
FOR EACH ROW EXECUTE FUNCTION practice_protect_candidate();
--> statement-breakpoint
CREATE TABLE practice_session_selection (
  id integer PRIMARY KEY CHECK (id = 1),
  revision_id text NOT NULL REFERENCES practice_challenge_revisions(id)
);
