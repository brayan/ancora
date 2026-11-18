CREATE TABLE practice_hint_requests (
  id text PRIMARY KEY,
  revision_id text NOT NULL REFERENCES practice_challenge_revisions(id),
  level integer NOT NULL CHECK (level BETWEEN 1 AND 3),
  state text NOT NULL CHECK (state IN ('generating', 'ready', 'failed', 'interrupted')),
  dispatches integer NOT NULL CHECK (dispatches BETWEEN 1 AND 2),
  output jsonb,
  error text CHECK (error IN ('hint_invalid', 'provider_interrupted', 'hints_unavailable')),
  events jsonb NOT NULL CHECK (jsonb_typeof(events) = 'array' AND jsonb_array_length(events) BETWEEN 1 AND 4),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT practice_hint_outcome CHECK (
    (state = 'ready' AND output IS NOT NULL AND error IS NULL) OR
    (state = 'generating' AND output IS NULL AND error IS NULL) OR
    (state IN ('failed', 'interrupted') AND output IS NULL AND error IS NOT NULL)
  )
);
--> statement-breakpoint
CREATE UNIQUE INDEX practice_hint_revision_level_unique ON practice_hint_requests(revision_id, level);
--> statement-breakpoint
CREATE FUNCTION practice_protect_hint() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Hint records cannot be deleted';
  END IF;
  IF (to_jsonb(NEW) - 'state' - 'dispatches' - 'output' - 'error' - 'events' - 'updated_at') IS DISTINCT FROM
     (to_jsonb(OLD) - 'state' - 'dispatches' - 'output' - 'error' - 'events' - 'updated_at')
     OR OLD.state = 'ready'
     OR NOT (
       (OLD.state = 'generating' AND NEW.dispatches = OLD.dispatches AND NEW.state IN ('ready', 'failed', 'interrupted')) OR
       (OLD.state IN ('failed', 'interrupted') AND OLD.dispatches = 1 AND NEW.dispatches = 2 AND NEW.state = 'generating')
     ) THEN
    RAISE EXCEPTION 'Hint identity, allowance and accepted output are immutable';
  END IF;
  IF jsonb_array_length(NEW.events) <> jsonb_array_length(OLD.events) + 1
     OR (NEW.events - (jsonb_array_length(NEW.events) - 1)) IS DISTINCT FROM OLD.events THEN
    RAISE EXCEPTION 'Hint events must be append-only';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER practice_immutable_hint BEFORE UPDATE OR DELETE ON practice_hint_requests
FOR EACH ROW EXECUTE FUNCTION practice_protect_hint();
--> statement-breakpoint
ALTER TABLE practice_attempts ADD COLUMN hint_level integer NOT NULL DEFAULT 0 CHECK (hint_level BETWEEN 0 AND 3);
