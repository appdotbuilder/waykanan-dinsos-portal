import { db } from '../db';
import { applicationsTable, applicationDocumentsTable, servicesTable } from '../db/schema';
import { type Application, documentTypeEnum } from '../schema';
import { eq } from 'drizzle-orm';

export const submitApplication = async (applicationId: number): Promise<Application | null> => {
  try {
    // First, get the application with its service to check required documents
    const applicationResults = await db.select()
      .from(applicationsTable)
      .innerJoin(servicesTable, eq(applicationsTable.service_id, servicesTable.id))
      .where(eq(applicationsTable.id, applicationId))
      .execute();

    if (applicationResults.length === 0) {
      return null; // Application not found
    }

    const applicationData = applicationResults[0].applications;
    const serviceData = applicationResults[0].services;

    // Check if application is in DRAFT status
    if (applicationData.status !== 'DRAFT') {
      throw new Error('Application can only be submitted from DRAFT status');
    }

    // Get required documents for this service  
    const requiredDocuments = serviceData.required_documents as string[];

    // Get uploaded documents for this application
    const uploadedDocuments = await db.select()
      .from(applicationDocumentsTable)
      .where(eq(applicationDocumentsTable.application_id, applicationId))
      .execute();

    // Check if all required documents are uploaded
    const uploadedDocumentTypes = uploadedDocuments.map(doc => doc.document_type);
    const missingDocuments = requiredDocuments.filter(
      reqDoc => !uploadedDocumentTypes.includes(reqDoc as any)
    );

    if (missingDocuments.length > 0) {
      throw new Error(`Missing required documents: ${missingDocuments.join(', ')}`);
    }

    // Update application status to SUBMITTED and set submitted_at timestamp
    const result = await db.update(applicationsTable)
      .set({
        status: 'SUBMITTED',
        submitted_at: new Date(),
        updated_at: new Date()
      })
      .where(eq(applicationsTable.id, applicationId))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Application submission failed:', error);
    throw error;
  }
};