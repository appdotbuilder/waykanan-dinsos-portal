import { z } from 'zod';

// Enums
export const applicationStatusEnum = z.enum([
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'REQUIRES_DOCUMENTS',
  'APPROVED',
  'REJECTED'
]);

export const userRoleEnum = z.enum(['CITIZEN', 'STAFF', 'ADMIN']);

export const serviceTypeEnum = z.enum(['ADOPTION_RECOMMENDATION']);

export const documentTypeEnum = z.enum([
  'SKCK', // Surat Keterangan Catatan Kepolisian
  'HEALTH_CERTIFICATE',
  'PSYCHOLOGICAL_CERTIFICATE',
  'FINANCIAL_STATEMENT',
  'FAMILY_CONSENT',
  'BIRTH_CERTIFICATE',
  'MARRIAGE_CERTIFICATE',
  'PHOTO',
  'OTHER'
]);

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  full_name: z.string(),
  phone: z.string().nullable(),
  role: userRoleEnum,
  created_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Service schema
export const serviceSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  type: serviceTypeEnum,
  required_documents: z.array(documentTypeEnum),
  is_active: z.boolean(),
  created_at: z.coerce.date()
});

export type Service = z.infer<typeof serviceSchema>;

// Application schema
export const applicationSchema = z.object({
  id: z.number(),
  service_id: z.number(),
  applicant_id: z.number(),
  status: applicationStatusEnum,
  application_data: z.record(z.any()), // JSON data for form fields
  notes: z.string().nullable(),
  staff_notes: z.string().nullable(),
  submitted_at: z.coerce.date().nullable(),
  reviewed_at: z.coerce.date().nullable(),
  reviewed_by: z.number().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Application = z.infer<typeof applicationSchema>;

// Application document schema
export const applicationDocumentSchema = z.object({
  id: z.number(),
  application_id: z.number(),
  document_type: documentTypeEnum,
  file_name: z.string(),
  file_path: z.string(),
  file_size: z.number(),
  mime_type: z.string(),
  uploaded_at: z.coerce.date()
});

export type ApplicationDocument = z.infer<typeof applicationDocumentSchema>;

// Input schemas for creating users
export const createUserInputSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1),
  phone: z.string().nullable(),
  role: userRoleEnum
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Input schemas for creating services
export const createServiceInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable(),
  type: serviceTypeEnum,
  required_documents: z.array(documentTypeEnum),
  is_active: z.boolean().default(true)
});

export type CreateServiceInput = z.infer<typeof createServiceInputSchema>;

// Input schemas for creating applications
export const createApplicationInputSchema = z.object({
  service_id: z.number(),
  applicant_id: z.number(),
  application_data: z.record(z.any()),
  notes: z.string().nullable()
});

export type CreateApplicationInput = z.infer<typeof createApplicationInputSchema>;

// Input schemas for updating applications
export const updateApplicationInputSchema = z.object({
  id: z.number(),
  status: applicationStatusEnum.optional(),
  application_data: z.record(z.any()).optional(),
  notes: z.string().nullable().optional(),
  staff_notes: z.string().nullable().optional(),
  reviewed_by: z.number().nullable().optional()
});

export type UpdateApplicationInput = z.infer<typeof updateApplicationInputSchema>;

// Input schemas for uploading documents
export const uploadDocumentInputSchema = z.object({
  application_id: z.number(),
  document_type: documentTypeEnum,
  file_name: z.string().min(1),
  file_path: z.string().min(1),
  file_size: z.number().positive(),
  mime_type: z.string().min(1)
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentInputSchema>;

// Query schemas
export const getApplicationsQuerySchema = z.object({
  status: applicationStatusEnum.optional(),
  applicant_id: z.number().optional(),
  service_id: z.number().optional(),
  limit: z.number().int().positive().default(50),
  offset: z.number().int().nonnegative().default(0)
});

export type GetApplicationsQuery = z.infer<typeof getApplicationsQuerySchema>;

// Adoption specific schema for application data
export const adoptionApplicationDataSchema = z.object({
  // Personal Information
  applicant_name: z.string().min(1),
  applicant_id_number: z.string().min(1),
  applicant_birth_place: z.string().min(1),
  applicant_birth_date: z.string(), // ISO date string
  applicant_address: z.string().min(1),
  applicant_occupation: z.string().min(1),
  applicant_monthly_income: z.number().positive(),
  
  // Spouse Information (if married)
  spouse_name: z.string().nullable(),
  spouse_id_number: z.string().nullable(),
  spouse_birth_place: z.string().nullable(),
  spouse_birth_date: z.string().nullable(),
  spouse_occupation: z.string().nullable(),
  spouse_monthly_income: z.number().nullable(),
  
  // Marriage Information
  marriage_date: z.string().nullable(),
  marriage_duration_years: z.number().int().nonnegative().nullable(),
  
  // Child Information
  desired_child_gender: z.enum(['MALE', 'FEMALE', 'ANY']),
  desired_child_age_min: z.number().int().nonnegative(),
  desired_child_age_max: z.number().int().nonnegative(),
  reason_for_adoption: z.string().min(10),
  
  // Family Information
  existing_children_count: z.number().int().nonnegative(),
  family_members_count: z.number().int().positive(),
  housing_ownership: z.enum(['OWNED', 'RENTED', 'FAMILY_OWNED']),
  housing_condition: z.enum(['EXCELLENT', 'GOOD', 'ADEQUATE', 'POOR']),
  
  // Additional Information
  previous_adoption_experience: z.boolean(),
  support_from_extended_family: z.boolean(),
  childcare_plan: z.string().min(10)
});

export type AdoptionApplicationData = z.infer<typeof adoptionApplicationDataSchema>;