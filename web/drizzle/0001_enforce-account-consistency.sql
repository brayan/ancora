ALTER TABLE "source_chunks" DROP CONSTRAINT "source_chunks_source_id_sources_id_fk";
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "active_account_id" text;--> statement-breakpoint
UPDATE "users"
SET "active_account_id" = "membership"."account_id"
FROM (
	SELECT DISTINCT ON ("user_id") "user_id", "account_id"
	FROM "account_memberships"
	ORDER BY "user_id", "created_at" ASC, "account_id" ASC
) AS "membership"
WHERE "users"."id" = "membership"."user_id"
	AND "users"."active_account_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "sources_account_id_id_unique" ON "sources" USING btree ("account_id","id");--> statement-breakpoint
ALTER TABLE "source_chunks" ADD CONSTRAINT "source_chunks_account_source_fk" FOREIGN KEY ("account_id","source_id") REFERENCES "public"."sources"("account_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_active_account_id_accounts_id_fk" FOREIGN KEY ("active_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "source_chunks_account_id_id_unique" ON "source_chunks" USING btree ("account_id","id");--> statement-breakpoint
CREATE INDEX "users_active_account_id_idx" ON "users" USING btree ("active_account_id");
