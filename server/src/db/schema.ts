import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  boolean, 
  integer,
  json,
  pgEnum
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define enums
export const applicationStatusEnum = pgEnum('application_status', [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'REQUIRES_DOCUMENTS',
  'APPROVED',
  'REJECTED'
]);

export const userRoleEnum = pgEnum('user_role', ['CITIZEN', 'STAFF', 'ADMIN']);

export const serviceTypeEnum = pgEnum('service_type', ['ADOPTION_RECOMMENDATION']);

export const documentTypeEnum = pgEnum('document_type', [
  'SKCK',
  'HEALTH_CERTIFICATE',
  'PSYCHOLOGICAL_CERTIFICATE',
  'FINANCIAL_STATEMENT',
  'FAMILY_CONSENT',
  'BIRTH_CERTIFICATE',
  'MARRIAGE_CERTIFICATE',
  'PHOTO',
  'OTHER'
]);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  full_name: text('full_name').notNull(),
  phone: text('phone'), // Nullable by default
  role: userRoleEnum('role').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Services table
export const servicesTable = pgTable('services', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'), // Nullable by default
  type: serviceTypeEnum('type').notNull(),
  required_documents: json('required_documents').$type<string[]>().notNull(), // Array of document types
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Applications table
export const applicationsTable = pgTable('applications', {
  id: serial('id').primaryKey(),
  service_id: integer('service_id').notNull(),
  applicant_id: integer('applicant_id').notNull(),
  status: applicationStatusEnum('status').default('DRAFT').notNull(),
  application_data: json('application_data').$type<Record<string, any>>().notNull(),
  notes: text('notes'), // Nullable by default - applicant notes
  staff_notes: text('staff_notes'), // Nullable by default - staff internal notes
  submitted_at: timestamp('submitted_at'), // Nullable by default
  reviewed_at: timestamp('reviewed_at'), // Nullable by default
  reviewed_by: integer('reviewed_by'), // Nullable by default - staff user id
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Application documents table
export const applicationDocumentsTable = pgTable('application_documents', {
  id: serial('id').primaryKey(),
  application_id: integer('application_id').notNull(),
  document_type: documentTypeEnum('document_type').notNull(),
  file_name: text('file_name').notNull(),
  file_path: text('file_path').notNull(),
  file_size: integer('file_size').notNull(), // in bytes
  mime_type: text('mime_type').notNull(),
  uploaded_at: timestamp('uploaded_at').defaultNow().notNull()
});

// Define relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  applications: many(applicationsTable, { relationName: 'applicant' }),
  reviewedApplications: many(applicationsTable, { relationName: 'reviewer' })
}));

export const servicesRelations = relations(servicesTable, ({ many }) => ({
  applications: many(applicationsTable)
}));

export const applicationsRelations = relations(applicationsTable, ({ one, many }) => ({
  service: one(servicesTable, {
    fields: [applicationsTable.service_id],
    references: [servicesTable.id]
  }),
  applicant: one(usersTable, {
    fields: [applicationsTable.applicant_id],
    references: [usersTable.id],
    relationName: 'applicant'
  }),
  reviewer: one(usersTable, {
    fields: [applicationsTable.reviewed_by],
    references: [usersTable.id],
    relationName: 'reviewer'
  }),
  documents: many(applicationDocumentsTable)
}));

export const applicationDocumentsRelations = relations(applicationDocumentsTable, ({ one }) => ({
  application: one(applicationsTable, {
    fields: [applicationDocumentsTable.application_id],
    references: [applicationsTable.id]
  })
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Service = typeof servicesTable.$inferSelect;
export type NewService = typeof servicesTable.$inferInsert;

export type Application = typeof applicationsTable.$inferSelect;
export type NewApplication = typeof applicationsTable.$inferInsert;

export type ApplicationDocument = typeof applicationDocumentsTable.$inferSelect;
export type NewApplicationDocument = typeof applicationDocumentsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  users: usersTable,
  services: servicesTable,
  applications: applicationsTable,
  applicationDocuments: applicationDocumentsTable
};