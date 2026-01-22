CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluation_results_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"interpretation_id" integer NOT NULL,
	"property_data_hash" text NOT NULL,
	"property_data" jsonb NOT NULL,
	"fuzzy_value" numeric NOT NULL,
	"rating_class" text NOT NULL,
	"rating_value" numeric,
	"limitation_class" text,
	"evaluation_results" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluations" (
	"id" serial PRIMARY KEY NOT NULL,
	"evaliid" integer NOT NULL,
	"evalname" text NOT NULL,
	"evaldesc" text,
	"evaluationtype" text NOT NULL,
	"invertevaluationresults" boolean DEFAULT false,
	"propname" text NOT NULL,
	"propmod" text,
	"evalxml" text,
	"points" jsonb,
	"interpolation" text,
	"crisp_expression" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interpretation_evaluations" (
	"id" serial PRIMARY KEY NOT NULL,
	"interpretation_id" integer NOT NULL,
	"evaluation_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interpretation_properties" (
	"id" serial PRIMARY KEY NOT NULL,
	"interpretation_id" integer NOT NULL,
	"property_id" integer NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interpretations" (
	"id" serial PRIMARY KEY NOT NULL,
	"interpid" integer NOT NULL,
	"name" text NOT NULL,
	"category_id" integer,
	"tree_structure" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" serial PRIMARY KEY NOT NULL,
	"propiid" text NOT NULL,
	"propname" text NOT NULL,
	"propuom" text,
	"propmin" numeric,
	"propmax" numeric,
	"propmod" text,
	"dataafuse" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "evaluation_results_cache" ADD CONSTRAINT "evaluation_results_cache_interpretation_id_interpretations_id_fk" FOREIGN KEY ("interpretation_id") REFERENCES "public"."interpretations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interpretation_evaluations" ADD CONSTRAINT "interpretation_evaluations_interpretation_id_interpretations_id_fk" FOREIGN KEY ("interpretation_id") REFERENCES "public"."interpretations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interpretation_evaluations" ADD CONSTRAINT "interpretation_evaluations_evaluation_id_evaluations_id_fk" FOREIGN KEY ("evaluation_id") REFERENCES "public"."evaluations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interpretation_properties" ADD CONSTRAINT "interpretation_properties_interpretation_id_interpretations_id_fk" FOREIGN KEY ("interpretation_id") REFERENCES "public"."interpretations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interpretation_properties" ADD CONSTRAINT "interpretation_properties_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interpretations" ADD CONSTRAINT "interpretations_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_name_idx" ON "categories" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "cache_key_idx" ON "evaluation_results_cache" USING btree ("interpretation_id","property_data_hash");--> statement-breakpoint
CREATE INDEX "cache_expires_idx" ON "evaluation_results_cache" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "evaluations_evaliid_idx" ON "evaluations" USING btree ("evaliid");--> statement-breakpoint
CREATE INDEX "evaluations_evalname_idx" ON "evaluations" USING btree ("evalname");--> statement-breakpoint
CREATE INDEX "evaluations_propname_idx" ON "evaluations" USING btree ("propname");--> statement-breakpoint
CREATE UNIQUE INDEX "interp_eval_idx" ON "interpretation_evaluations" USING btree ("interpretation_id","evaluation_id");--> statement-breakpoint
CREATE INDEX "interp_evals_interp_idx" ON "interpretation_evaluations" USING btree ("interpretation_id");--> statement-breakpoint
CREATE INDEX "interp_evals_eval_idx" ON "interpretation_evaluations" USING btree ("evaluation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "interp_prop_idx" ON "interpretation_properties" USING btree ("interpretation_id","property_id");--> statement-breakpoint
CREATE INDEX "interp_properties_interp_idx" ON "interpretation_properties" USING btree ("interpretation_id");--> statement-breakpoint
CREATE INDEX "interp_properties_prop_idx" ON "interpretation_properties" USING btree ("property_id");--> statement-breakpoint
CREATE UNIQUE INDEX "interpretations_interpid_idx" ON "interpretations" USING btree ("interpid");--> statement-breakpoint
CREATE INDEX "interpretations_name_idx" ON "interpretations" USING btree ("name");--> statement-breakpoint
CREATE INDEX "interpretations_category_idx" ON "interpretations" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "properties_propiid_idx" ON "properties" USING btree ("propiid");--> statement-breakpoint
CREATE INDEX "properties_propname_idx" ON "properties" USING btree ("propname");