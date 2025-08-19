import { db } from '../db';
import { applicationsTable } from '../db/schema';
import { type UpdateApplicationInput, type Application } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateApplication(input: UpdateApplicationInput): Promise<Application | null> {
  try {
    // Build the update data object dynamically
    const updateData: any = {
      updated_at: new Date()
    };

    // Handle status changes with automatic timestamp updates
    if (input.status !== undefined) {
      updateData.status = input.status;
      
      // Set submitted_at when status changes to SUBMITTED
      if (input.status === 'SUBMITTED') {
        updateData.submitted_at = new Date();
      }
      
      // Set reviewed_at when staff reviews (status changes from SUBMITTED to other states)
      if (input.status !== 'DRAFT' && input.status !== 'SUBMITTED' && input.reviewed_by) {
        updateData.reviewed_at = new Date();
        updateData.reviewed_by = input.reviewed_by;
      }
    }

    // Handle other optional fields
    if (input.application_data !== undefined) {
      updateData.application_data = input.application_data;
    }

    if (input.notes !== undefined) {
      updateData.notes = input.notes;
    }

    if (input.staff_notes !== undefined) {
      updateData.staff_notes = input.staff_notes;
    }

    if (input.reviewed_by !== undefined) {
      updateData.reviewed_by = input.reviewed_by;
      // If reviewed_by is being set and status suggests review, set reviewed_at
      if (input.status && input.status !== 'DRAFT' && input.status !== 'SUBMITTED') {
        updateData.reviewed_at = new Date();
      }
    }

    // Update the application
    const result = await db.update(applicationsTable)
      .set(updateData)
      .where(eq(applicationsTable.id, input.id))
      .returning()
      .execute();

    // Return the updated application or null if not found
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Application update failed:', error);
    throw error;
  }
}