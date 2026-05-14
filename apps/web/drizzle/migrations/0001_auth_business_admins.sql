CREATE TABLE "business_admins" (
	"business_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_admins_business_id_user_id_pk" PRIMARY KEY("business_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "business_admins" ADD CONSTRAINT "business_admins_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Row Level Security para business_admins. Acceso: solo el propio user
-- puede leer su(s) fila(s) (un user puede ser admin de varios negocios).
ALTER TABLE "business_admins" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "business_admins_self" ON "business_admins"
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());