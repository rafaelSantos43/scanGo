CREATE TABLE "attendances" (
	"id" uuid PRIMARY KEY NOT NULL,
	"customer_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"package_id" uuid NOT NULL,
	"qr_token" uuid NOT NULL,
	"scanned_at" timestamp with time zone NOT NULL,
	"scanned_date" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"timezone" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "businesses_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"business_id" uuid NOT NULL,
	"user_id" uuid,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"customer_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"total_visits" integer NOT NULL,
	"remaining_visits" integer NOT NULL,
	"status" text NOT NULL,
	"purchased_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "qr_tokens" (
	"token" uuid PRIMARY KEY NOT NULL,
	"business_id" uuid NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone DEFAULT now() + interval '24 hours' NOT NULL,
	"used_by" uuid,
	"used_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_qr_token_qr_tokens_token_fk" FOREIGN KEY ("qr_token") REFERENCES "public"."qr_tokens"("token") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_tokens" ADD CONSTRAINT "qr_tokens_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_tokens" ADD CONSTRAINT "qr_tokens_used_by_customers_id_fk" FOREIGN KEY ("used_by") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attendances_no_double_scan_per_day" ON "attendances" USING btree ("customer_id","business_id","scanned_date");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_business_email_unique" ON "customers" USING btree ("business_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "one_active_package_per_customer" ON "packages" USING btree ("customer_id") WHERE "packages"."status" = 'active';--> statement-breakpoint
-- Row Level Security policies. Backend (Drizzle, rol postgres) bypassea RLS. Aplica al ANON_KEY del browser conectado a Supabase Realtime. Ver D-007 y ARCHITECTURE §7.2.
ALTER TABLE "businesses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "businesses_self" ON "businesses"
  FOR ALL
  USING (id = (auth.jwt() ->> 'business_id')::uuid)
  WITH CHECK (id = (auth.jwt() ->> 'business_id')::uuid);--> statement-breakpoint
ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "customers_tenant_isolation" ON "customers"
  FOR ALL
  USING (business_id = (auth.jwt() ->> 'business_id')::uuid)
  WITH CHECK (business_id = (auth.jwt() ->> 'business_id')::uuid);--> statement-breakpoint
ALTER TABLE "packages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "packages_tenant_isolation" ON "packages"
  FOR ALL
  USING (business_id = (auth.jwt() ->> 'business_id')::uuid)
  WITH CHECK (business_id = (auth.jwt() ->> 'business_id')::uuid);--> statement-breakpoint
ALTER TABLE "qr_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "qr_tokens_tenant_isolation" ON "qr_tokens"
  FOR ALL
  USING (business_id = (auth.jwt() ->> 'business_id')::uuid)
  WITH CHECK (business_id = (auth.jwt() ->> 'business_id')::uuid);--> statement-breakpoint
ALTER TABLE "attendances" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "attendances_tenant_isolation" ON "attendances"
  FOR ALL
  USING (business_id = (auth.jwt() ->> 'business_id')::uuid)
  WITH CHECK (business_id = (auth.jwt() ->> 'business_id')::uuid);