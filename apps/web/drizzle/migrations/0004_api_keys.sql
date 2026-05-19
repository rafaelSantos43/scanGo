CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY NOT NULL,
	"business_id" uuid NOT NULL,
	"hashed_key" text NOT NULL,
	"prefix" text NOT NULL,
	"scope" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "api_keys_prefix_unique" UNIQUE("prefix")
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Row Level Security. Aislamiento por negocio (tenant): el backend (rol
-- postgres) bypassea RLS; esto aplica al anon key del browser. Ver D-007.
ALTER TABLE "api_keys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "api_keys_tenant_isolation" ON "api_keys"
  FOR ALL
  USING (business_id = (auth.jwt() ->> 'business_id')::uuid)
  WITH CHECK (business_id = (auth.jwt() ->> 'business_id')::uuid);
