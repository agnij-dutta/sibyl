import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createId } from './utils';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const investigationStatusEnum = pgEnum('investigation_status', [
  'running',
  'completed',
  'failed',
]);

export const incidentLevelEnum = pgEnum('incident_level', [
  'error',
  'warning',
  'info',
]);

export const incidentStatusEnum = pgEnum('incident_status', [
  'open',
  'resolved',
  'ignored',
]);

export const alertRuleTypeEnum = pgEnum('alert_rule_type', [
  'threshold',
  'anomaly',
  'pattern',
]);

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const organizations = pgTable(
  'organizations',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    plan: text('plan').notNull().default('free'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [uniqueIndex('organizations_slug_idx').on(table.slug)],
);

export const users = pgTable(
  'users',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    name: text('name').notNull(),
    role: text('role').notNull().default('member'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [uniqueIndex('users_email_idx').on(table.email)],
);

export const projects = pgTable(
  'projects',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id),
    name: text('name').notNull(),
    dsn: text('dsn').notNull(),
    platform: text('platform'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [uniqueIndex('projects_dsn_idx').on(table.dsn)],
);

export const apiKeys = pgTable('api_keys', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id),
  keyHash: text('key_hash').notNull(),
  keyPrefix: text('key_prefix').notNull(),
  label: text('label'),
  scopes: jsonb('scopes').$type<string[]>().notNull().default(['ingest']),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const investigations = pgTable('investigations', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id),
  query: text('query').notNull(),
  status: investigationStatusEnum('status').notNull().default('running'),
  messages: jsonb('messages').$type<unknown[]>().notNull().default([]),
  summary: text('summary'),
  rootCause: text('root_cause'),
  confidence: integer('confidence'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});

export const incidents = pgTable('incidents', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id),
  fingerprint: text('fingerprint').notNull(),
  title: text('title').notNull(),
  level: incidentLevelEnum('level').notNull(),
  status: incidentStatusEnum('status').notNull().default('open'),
  firstSeen: timestamp('first_seen', { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastSeen: timestamp('last_seen', { withTimezone: true })
    .notNull()
    .defaultNow(),
  eventCount: integer('event_count').notNull().default(1),
  affectedUsers: integer('affected_users').notNull().default(0),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const alertRules = pgTable('alert_rules', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id),
  name: text('name').notNull(),
  type: alertRuleTypeEnum('type').notNull(),
  condition: jsonb('condition').$type<Record<string, unknown>>().notNull(),
  channels: jsonb('channels').$type<Record<string, unknown>[]>().notNull(),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});

export const deploys = pgTable('deploys', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id),
  version: text('version').notNull(),
  environment: text('environment').notNull(),
  commitSha: text('commit_sha'),
  commitMessage: text('commit_message'),
  deployedBy: text('deployed_by'),
  deployedAt: timestamp('deployed_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  projects: many(projects),
}));

export const usersRelations = relations(users, ({ one }) => ({
  organization: one(organizations, {
    fields: [users.orgId],
    references: [organizations.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.orgId],
    references: [organizations.id],
  }),
  apiKeys: many(apiKeys),
  investigations: many(investigations),
  incidents: many(incidents),
  alertRules: many(alertRules),
  deploys: many(deploys),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  project: one(projects, {
    fields: [apiKeys.projectId],
    references: [projects.id],
  }),
}));

export const investigationsRelations = relations(investigations, ({ one }) => ({
  project: one(projects, {
    fields: [investigations.projectId],
    references: [projects.id],
  }),
}));

export const incidentsRelations = relations(incidents, ({ one }) => ({
  project: one(projects, {
    fields: [incidents.projectId],
    references: [projects.id],
  }),
}));

export const alertRulesRelations = relations(alertRules, ({ one }) => ({
  project: one(projects, {
    fields: [alertRules.projectId],
    references: [projects.id],
  }),
}));

export const deploysRelations = relations(deploys, ({ one }) => ({
  project: one(projects, {
    fields: [deploys.projectId],
    references: [projects.id],
  }),
}));
