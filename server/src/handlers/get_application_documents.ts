import { db } from '../db';
import { applicationDocumentsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type ApplicationDocument } from '../schema';

export async function getApplicationDocuments(applicationId: number): Promise<ApplicationDocument[]> {
  try {
    const documents = await db.select()
      .from(applicationDocumentsTable)
      .where(eq(applicationDocumentsTable.application_id, applicationId))
      .execute();

    return documents;
  } catch (error) {
    console.error('Failed to fetch application documents:', error);
    throw error;
  }
}