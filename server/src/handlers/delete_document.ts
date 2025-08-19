import { db } from '../db';
import { applicationDocumentsTable, applicationsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { unlink } from 'fs/promises';

export async function deleteDocument(documentId: number): Promise<boolean> {
  try {
    // First, get the document with its associated application status
    const result = await db
      .select({
        document: applicationDocumentsTable,
        applicationStatus: applicationsTable.status
      })
      .from(applicationDocumentsTable)
      .innerJoin(
        applicationsTable,
        eq(applicationDocumentsTable.application_id, applicationsTable.id)
      )
      .where(eq(applicationDocumentsTable.id, documentId))
      .execute();

    if (result.length === 0) {
      return false; // Document not found
    }

    const { document, applicationStatus } = result[0];

    // Only allow deletion if application is still in DRAFT status
    if (applicationStatus !== 'DRAFT') {
      return false; // Cannot delete documents from non-draft applications
    }

    // Delete the document record from database
    const deleteResult = await db
      .delete(applicationDocumentsTable)
      .where(eq(applicationDocumentsTable.id, documentId))
      .execute();

    if (deleteResult.rowCount === 0) {
      return false;
    }

    // Attempt to delete the physical file from storage
    // This is wrapped in try-catch to not fail the operation if file doesn't exist
    try {
      await unlink(document.file_path);
    } catch (fileError) {
      // Log the error but don't fail the operation
      // The file might have already been deleted or moved
      console.error('Failed to delete physical file:', fileError);
    }

    return true;
  } catch (error) {
    console.error('Document deletion failed:', error);
    throw error;
  }
}