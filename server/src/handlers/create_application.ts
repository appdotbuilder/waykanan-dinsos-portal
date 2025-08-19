import { db } from '../db';
import { applicationsTable } from '../db/schema';
import { type CreateApplicationInput, type Application } from '../schema';

export const createApplication = async (input: CreateApplicationInput): Promise<Application> => {
  try {
    // Insert application record with default DRAFT status
    const result = await db.insert(applicationsTable)
      .values({
        service_id: input.service_id,
        applicant_id: input.applicant_id,
        application_data: input.application_data,
        notes: input.notes,
        // Default values for DRAFT status
        status: 'DRAFT',
        staff_notes: null,
        submitted_at: null,
        reviewed_at: null,
        reviewed_by: null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Application creation failed:', error);
    throw error;
  }
};