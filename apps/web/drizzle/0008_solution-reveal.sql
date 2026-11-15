CREATE TABLE practice_solution_reveals (
  revision_id text PRIMARY KEY REFERENCES practice_challenge_revisions(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE FUNCTION practice_reject_reveal_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Solution reveal records are immutable';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER practice_immutable_solution_reveal BEFORE UPDATE OR DELETE ON practice_solution_reveals
FOR EACH ROW EXECUTE FUNCTION practice_reject_reveal_mutation();
--> statement-breakpoint
ALTER TABLE practice_attempts ADD COLUMN solution_revealed boolean NOT NULL DEFAULT false;
