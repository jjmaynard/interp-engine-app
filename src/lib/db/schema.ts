/**
 * Database Schema for NRCS Soil Interpretation Engine
 * Using Drizzle ORM for type-safe database access
 */

import { 
  pgTable, 
  serial, 
  text, 
  integer, 
  boolean, 
  numeric, 
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/**
 * Interpretation Categories Table
 */
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  nameIdx: uniqueIndex('categories_name_idx').on(table.name),
}));

/**
 * Interpretations Table
 * Stores interpretation metadata and tree structure
 */
export const interpretations = pgTable('interpretations', {
  id: serial('id').primaryKey(),
  interpid: integer('interpid').notNull(),
  name: text('name').notNull(),
  categoryId: integer('category_id').references(() => categories.id),
  treeStructure: jsonb('tree_structure').notNull(), // Stores RuleNode tree
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  interpidIdx: uniqueIndex('interpretations_interpid_idx').on(table.interpid),
  nameIdx: index('interpretations_name_idx').on(table.name),
  categoryIdx: index('interpretations_category_idx').on(table.categoryId),
}));

/**
 * Properties Table
 * Stores soil property definitions
 */
export const properties = pgTable('properties', {
  id: serial('id').primaryKey(),
  propiid: text('propiid').notNull(),
  propname: text('propname').notNull(),
  propuom: text('propuom'), // Unit of measure
  propmin: numeric('propmin'),
  propmax: numeric('propmax'),
  propmod: text('propmod'),
  dataafuse: boolean('dataafuse').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  propiidIdx: uniqueIndex('properties_propiid_idx').on(table.propiid),
  propnameIdx: index('properties_propname_idx').on(table.propname),
}));

/**
 * Evaluations Table
 * Stores evaluation curve definitions
 */
export const evaluations = pgTable('evaluations', {
  id: serial('id').primaryKey(),
  evaliid: integer('evaliid').notNull(),
  evalname: text('evalname').notNull(),
  evaldesc: text('evaldesc'),
  evaluationtype: text('evaluationtype').notNull(), // 'Crisp', 'Fuzzy', 'Continuous'
  invertevaluationresults: boolean('invertevaluationresults').default(false),
  propname: text('propname').notNull(),
  propmod: text('propmod'),
  evalxml: text('evalxml'), // XML evaluation definition
  points: jsonb('points'), // Parsed evaluation points
  interpolation: text('interpolation'), // 'linear', 'spline', 'step'
  crispExpression: text('crisp_expression'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  evaliidIdx: uniqueIndex('evaluations_evaliid_idx').on(table.evaliid),
  evalnameIdx: index('evaluations_evalname_idx').on(table.evalname),
  propnameIdx: index('evaluations_propname_idx').on(table.propname),
}));

/**
 * Interpretation-Property Junction Table
 * Links interpretations to required properties
 */
export const interpretationProperties = pgTable('interpretation_properties', {
  id: serial('id').primaryKey(),
  interpretationId: integer('interpretation_id')
    .notNull()
    .references(() => interpretations.id, { onDelete: 'cascade' }),
  propertyId: integer('property_id')
    .notNull()
    .references(() => properties.id, { onDelete: 'cascade' }),
  required: boolean('required').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  interpPropIdx: uniqueIndex('interp_prop_idx').on(
    table.interpretationId, 
    table.propertyId
  ),
  interpIdx: index('interp_properties_interp_idx').on(table.interpretationId),
  propIdx: index('interp_properties_prop_idx').on(table.propertyId),
}));

/**
 * Interpretation-Evaluation Junction Table
 * Links interpretations to evaluations used in their trees
 */
export const interpretationEvaluations = pgTable('interpretation_evaluations', {
  id: serial('id').primaryKey(),
  interpretationId: integer('interpretation_id')
    .notNull()
    .references(() => interpretations.id, { onDelete: 'cascade' }),
  evaluationId: integer('evaluation_id')
    .notNull()
    .references(() => evaluations.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  interpEvalIdx: uniqueIndex('interp_eval_idx').on(
    table.interpretationId, 
    table.evaluationId
  ),
  interpIdx: index('interp_evals_interp_idx').on(table.interpretationId),
  evalIdx: index('interp_evals_eval_idx').on(table.evaluationId),
}));

/**
 * Evaluation Results Cache Table (Optional)
 * Stores computed results for common property combinations
 */
export const evaluationResultsCache = pgTable('evaluation_results_cache', {
  id: serial('id').primaryKey(),
  interpretationId: integer('interpretation_id')
    .notNull()
    .references(() => interpretations.id, { onDelete: 'cascade' }),
  propertyDataHash: text('property_data_hash').notNull(), // Hash of input properties
  propertyData: jsonb('property_data').notNull(),
  fuzzyValue: numeric('fuzzy_value').notNull(),
  ratingClass: text('rating_class').notNull(),
  ratingValue: numeric('rating_value'),
  limitationClass: text('limitation_class'),
  evaluationResults: jsonb('evaluation_results'), // Detailed breakdown
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
}, (table) => ({
  cacheKeyIdx: uniqueIndex('cache_key_idx').on(
    table.interpretationId,
    table.propertyDataHash
  ),
  expiresIdx: index('cache_expires_idx').on(table.expiresAt),
}));

// Type exports for use in the application
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Interpretation = typeof interpretations.$inferSelect;
export type NewInterpretation = typeof interpretations.$inferInsert;

export type Property = typeof properties.$inferSelect;
export type NewProperty = typeof properties.$inferInsert;

export type Evaluation = typeof evaluations.$inferSelect;
export type NewEvaluation = typeof evaluations.$inferInsert;

export type InterpretationProperty = typeof interpretationProperties.$inferSelect;
export type NewInterpretationProperty = typeof interpretationProperties.$inferInsert;

export type InterpretationEvaluation = typeof interpretationEvaluations.$inferSelect;
export type NewInterpretationEvaluation = typeof interpretationEvaluations.$inferInsert;

export type EvaluationResultCache = typeof evaluationResultsCache.$inferSelect;
export type NewEvaluationResultCache = typeof evaluationResultsCache.$inferInsert;
