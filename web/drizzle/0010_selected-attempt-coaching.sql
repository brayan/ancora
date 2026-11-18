CREATE TABLE practice_coaching_requests (
  id text PRIMARY KEY,
  revision_id text NOT NULL REFERENCES practice_challenge_revisions(id),
  attempt_id text NOT NULL REFERENCES practice_attempts(id),
  source_digest text NOT NULL CHECK (source_digest ~ '^[a-f0-9]{64}$'),
  consent_version text NOT NULL CHECK (consent_version = 'code-sharing-v1'),
  state text NOT NULL CHECK (state IN ('generating', 'ready', 'failed', 'interrupted')),
  dispatches integer NOT NULL CHECK (dispatches BETWEEN 1 AND 2),
  output jsonb,
  error text CHECK (error IN ('coaching_invalid', 'provider_interrupted', 'coaching_unavailable')),
  events jsonb NOT NULL CHECK (jsonb_typeof(events) = 'array' AND jsonb_array_length(events) BETWEEN 1 AND 4),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT practice_coaching_outcome CHECK (
    (state = 'ready' AND output IS NOT NULL AND error IS NULL) OR
    (state = 'generating' AND output IS NULL AND error IS NULL) OR
    (state IN ('failed', 'interrupted') AND output IS NULL AND error IS NOT NULL)
  )
);
--> statement-breakpoint
CREATE UNIQUE INDEX practice_coaching_attempt_unique ON practice_coaching_requests(attempt_id);
--> statement-breakpoint
CREATE FUNCTION practice_protect_coaching() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (SELECT 1 FROM practice_attempts WHERE id = NEW.attempt_id
       AND revision_id = NEW.revision_id AND source_digest = NEW.source_digest AND report IS NOT NULL) THEN
      RAISE EXCEPTION 'Coaching requires a completed matching attempt';
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Coaching records cannot be deleted';
  END IF;
  IF (to_jsonb(NEW) - 'state' - 'dispatches' - 'output' - 'error' - 'events' - 'updated_at') IS DISTINCT FROM
     (to_jsonb(OLD) - 'state' - 'dispatches' - 'output' - 'error' - 'events' - 'updated_at')
     OR OLD.state = 'ready'
     OR NOT (
       (OLD.state = 'generating' AND NEW.dispatches = OLD.dispatches AND NEW.state IN ('ready', 'failed', 'interrupted')) OR
       (OLD.state IN ('failed', 'interrupted') AND OLD.dispatches = 1 AND NEW.dispatches = 2 AND NEW.state = 'generating')
     ) THEN
    RAISE EXCEPTION 'Coaching identity, allowance and accepted output are immutable';
  END IF;
  IF jsonb_array_length(NEW.events) <> jsonb_array_length(OLD.events) + 1
     OR (NEW.events - (jsonb_array_length(NEW.events) - 1)) IS DISTINCT FROM OLD.events THEN
    RAISE EXCEPTION 'Coaching events must be append-only';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER practice_immutable_coaching BEFORE INSERT OR UPDATE OR DELETE ON practice_coaching_requests
FOR EACH ROW EXECUTE FUNCTION practice_protect_coaching();
--> statement-breakpoint
ALTER TABLE practice_attempts ADD COLUMN coaching_available boolean NOT NULL DEFAULT false;
