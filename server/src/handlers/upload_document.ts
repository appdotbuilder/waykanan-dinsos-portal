import { db } from '../db';
import { applicationsTable, applicationDocumentsTable, servicesTable } from '../db/schema';
import { type UploadDocumentInput, type ApplicationDocument } from '../schema';
import { eq } from 'drizzle-orm';

export const uploadDocument = async (input: UploadDocumentInput): Promise<ApplicationDocument> => {
  try {
    // First, validate that the application exists and get its service info
    const applicationWithService = await db.select({
      application_id: applicationsTable.id,
      service_id: applicationsTable.service_id,
      required_documents: servicesTable.required_documents
    })
      .from(applicationsTable)
      .innerJoin(servicesTable, eq(applicationsTable.service_id, servicesTable.id))
      .where(eq(applicationsTable.id, input.application_id))
      .execute();

    if (applicationWithService.length === 0) {
      throw new Error(`Application with id ${input.application_id} not found`);
    }

    const application = applicationWithService[0];
    
    // Validate that the document type is required for this service
    const requiredDocuments = application.required_documents as string[];
    if (!requiredDocuments.includes(input.document_type)) {
      throw new Error(`Document type '${input.document_type}' is not required for this service`);
    }

    // Insert the document record
    const result = await db.insert(applicationDocumentsTable)
      .values({
        application_id: input.application_id,
        document_type: input.document_type,
        file_name: input.file_name,
        file_path: input.file_path,
        file_size: input.file_size,
        mime_type: input.mime_type
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Document upload failed:', error);
    throw error;
  }
};