CREATE TABLE "floor_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid,
	"name" text NOT NULL,
	"image_url" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "map_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"floor_plan_id" uuid NOT NULL,
	"label" text NOT NULL,
	"x" real NOT NULL,
	"y" real NOT NULL,
	"rotation" integer DEFAULT 0 NOT NULL,
	"scale" real DEFAULT 1 NOT NULL,
	"icon_key" text NOT NULL,
	"metadata" jsonb,
	"placed_by" uuid,
	"placed_at" timestamp with time zone DEFAULT now(),
	"removed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "floor_plans" ADD CONSTRAINT "floor_plans_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "map_assets" ADD CONSTRAINT "map_assets_floor_plan_id_floor_plans_id_fk" FOREIGN KEY ("floor_plan_id") REFERENCES "public"."floor_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "map_assets" ADD CONSTRAINT "map_assets_placed_by_users_id_fk" FOREIGN KEY ("placed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;