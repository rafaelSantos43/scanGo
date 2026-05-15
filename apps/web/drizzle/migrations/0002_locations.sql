CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Backfill: una sede "Sede principal" por cada negocio existente, para que
-- las filas previas de attendances/qr_tokens tengan a donde apuntar.
INSERT INTO "locations" ("id", "business_id", "name")
SELECT gen_random_uuid(), b."id", 'Sede principal'
FROM "businesses" b;
--> statement-breakpoint
ALTER TABLE "attendances" ADD COLUMN "location_id" uuid;--> statement-breakpoint
ALTER TABLE "qr_tokens" ADD COLUMN "location_id" uuid;--> statement-breakpoint
UPDATE "attendances" a
SET "location_id" = l."id"
FROM "locations" l
WHERE l."business_id" = a."business_id" AND l."name" = 'Sede principal';
--> statement-breakpoint
UPDATE "qr_tokens" q
SET "location_id" = l."id"
FROM "locations" l
WHERE l."business_id" = q."business_id" AND l."name" = 'Sede principal';
--> statement-breakpoint
ALTER TABLE "attendances" ALTER COLUMN "location_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "qr_tokens" ALTER COLUMN "location_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_tokens" ADD CONSTRAINT "qr_tokens_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Row Level Security para locations. Aislamiento por negocio (tenant):
-- el anon key del browser solo ve las sedes de su business_id.
ALTER TABLE "locations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "locations_tenant_isolation" ON "locations"
  FOR ALL
  USING (business_id = (auth.jwt() ->> 'business_id')::uuid)
  WITH CHECK (business_id = (auth.jwt() ->> 'business_id')::uuid);
