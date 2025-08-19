import { db } from '../db';
import { applicationsTable } from '../db/schema';
import { type Application } from '../schema';
import { eq } from 'drizzle-orm';

export const getApplicationById = async (id: number): Promise<Application | null> => {
  try {
    // Fetch application by ID - keep it simple without joins for now
    const result = await db.select()
      .from(applicationsTable)
      .where(eq(applicationsTable.id, id))
      .execute();

    if (result.length === 0) {
      return null;
    }

    const application = result[0];
    
    return {
      id: application.id,
      service_id: application.service_id,
      applicant_id: application.applicant_id,
      status: application.status,
      application_data: application.application_data,
      notes: application.notes,
      staff_notes: application.staff_notes,
      submitted_at: application.submitted_at,
      reviewed_at: application.reviewed_at,
      reviewed_by: application.reviewed_by,
      created_at: application.created_at,
      updated_at: application.updated_at
    };
  } catch (error) {
    console.error('Failed to fetch application:', error);
    throw error;
  }
};