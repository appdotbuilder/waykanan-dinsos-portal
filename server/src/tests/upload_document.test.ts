import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, servicesTable, applicationsTable, applicationDocumentsTable } from '../db/schema';
import { type UploadDocumentInput, type CreateUserInput, type CreateServiceInput, type CreateApplicationInput } from '../schema';
import { uploadDocument } from '../handlers/upload_document';
import { eq } from 'drizzle-orm';

describe('uploadDocument', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUser: any;
  let testService: any;
  let testApplication: any;

  const setupTestData = async () => {
    // Create test user
    const userInput: CreateUserInput = {
      email: 'test@example.com',
      full_name: 'Test User',
      phone: '1234567890',
      role: 'CITIZEN'
    };

    const userResult = await db.insert(usersTable)
      .values(userInput)
      .returning()
      .execute();
    testUser = userResult[0];

    // Create test service with required documents
    const serviceInput: CreateServiceInput = {
      name: 'Adoption Service',
      description: 'Adoption recommendation service',
      type: 'ADOPTION_RECOMMENDATION',
      required_documents: ['SKCK', 'HEALTH_CERTIFICATE', 'PHOTO'],
      is_active: true
    };

    const serviceResult = await db.insert(servicesTable)
      .values(serviceInput)
      .returning()
      .execute();
    testService = serviceResult[0];

    // Create test application
    const applicationInput: CreateApplicationInput = {
      service_id: testService.id,
      applicant_id: testUser.id,
      application_data: { test: 'data' },
      notes: 'Test application'
    };

    const applicationResult = await db.insert(applicationsTable)
      .values(applicationInput)
      .returning()
      .execute();
    testApplication = applicationResult[0];
  };

  const testDocumentInput: UploadDocumentInput = {
    application_id: 0, // Will be set in tests
    document_type: 'SKCK',
    file_name: 'test_document.pdf',
    file_path: '/uploads/test_document.pdf',
    file_size: 1024000,
    mime_type: 'application/pdf'
  };

  it('should upload document successfully', async () => {
    await setupTestData();
    
    const documentInput = {
      ...testDocumentInput,
      application_id: testApplication.id
    };

    const result = await uploadDocument(documentInput);

    // Verify document properties
    expect(result.id).toBeDefined();
    expect(result.application_id).toEqual(testApplication.id);
    expect(result.document_type).toEqual('SKCK');
    expect(result.file_name).toEqual('test_document.pdf');
    expect(result.file_path).toEqual('/uploads/test_document.pdf');
    expect(result.file_size).toEqual(1024000);
    expect(result.mime_type).toEqual('application/pdf');
    expect(result.uploaded_at).toBeInstanceOf(Date);
  });

  it('should save document to database', async () => {
    await setupTestData();
    
    const documentInput = {
      ...testDocumentInput,
      application_id: testApplication.id
    };

    const result = await uploadDocument(documentInput);

    // Verify document was saved to database
    const documents = await db.select()
      .from(applicationDocumentsTable)
      .where(eq(applicationDocumentsTable.id, result.id))
      .execute();

    expect(documents).toHaveLength(1);
    expect(documents[0].application_id).toEqual(testApplication.id);
    expect(documents[0].document_type).toEqual('SKCK');
    expect(documents[0].file_name).toEqual('test_document.pdf');
    expect(documents[0].file_size).toEqual(1024000);
    expect(documents[0].uploaded_at).toBeInstanceOf(Date);
  });

  it('should upload multiple different document types', async () => {
    await setupTestData();
    
    const documentInputs = [
      {
        ...testDocumentInput,
        application_id: testApplication.id,
        document_type: 'SKCK' as const,
        file_name: 'skck.pdf'
      },
      {
        ...testDocumentInput,
        application_id: testApplication.id,
        document_type: 'HEALTH_CERTIFICATE' as const,
        file_name: 'health_cert.pdf'
      },
      {
        ...testDocumentInput,
        application_id: testApplication.id,
        document_type: 'PHOTO' as const,
        file_name: 'photo.jpg',
        mime_type: 'image/jpeg'
      }
    ];

    const results = await Promise.all(
      documentInputs.map(input => uploadDocument(input))
    );

    expect(results).toHaveLength(3);
    
    // Verify all documents were saved
    const documents = await db.select()
      .from(applicationDocumentsTable)
      .where(eq(applicationDocumentsTable.application_id, testApplication.id))
      .execute();

    expect(documents).toHaveLength(3);
    
    const documentTypes = documents.map(doc => doc.document_type);
    expect(documentTypes).toContain('SKCK');
    expect(documentTypes).toContain('HEALTH_CERTIFICATE');
    expect(documentTypes).toContain('PHOTO');
  });

  it('should throw error for non-existent application', async () => {
    const documentInput = {
      ...testDocumentInput,
      application_id: 99999 // Non-existent application
    };

    await expect(uploadDocument(documentInput))
      .rejects
      .toThrow(/Application with id 99999 not found/i);
  });

  it('should throw error for document type not required by service', async () => {
    await setupTestData();
    
    const documentInput = {
      ...testDocumentInput,
      application_id: testApplication.id,
      document_type: 'FINANCIAL_STATEMENT' as const // Not in required_documents
    };

    await expect(uploadDocument(documentInput))
      .rejects
      .toThrow(/Document type 'FINANCIAL_STATEMENT' is not required for this service/i);
  });

  it('should allow uploading same document type multiple times', async () => {
    await setupTestData();
    
    const documentInput1 = {
      ...testDocumentInput,
      application_id: testApplication.id,
      file_name: 'skck_version1.pdf',
      file_path: '/uploads/skck_version1.pdf'
    };

    const documentInput2 = {
      ...testDocumentInput,
      application_id: testApplication.id,
      file_name: 'skck_version2.pdf',
      file_path: '/uploads/skck_version2.pdf'
    };

    const result1 = await uploadDocument(documentInput1);
    const result2 = await uploadDocument(documentInput2);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.file_name).toEqual('skck_version1.pdf');
    expect(result2.file_name).toEqual('skck_version2.pdf');

    // Verify both documents exist in database
    const documents = await db.select()
      .from(applicationDocumentsTable)
      .where(eq(applicationDocumentsTable.application_id, testApplication.id))
      .execute();

    expect(documents).toHaveLength(2);
    expect(documents.every(doc => doc.document_type === 'SKCK')).toBe(true);
  });

  it('should handle large file sizes correctly', async () => {
    await setupTestData();
    
    const documentInput = {
      ...testDocumentInput,
      application_id: testApplication.id,
      file_size: 50 * 1024 * 1024, // 50MB
      file_name: 'large_document.pdf'
    };

    const result = await uploadDocument(documentInput);

    expect(result.file_size).toEqual(50 * 1024 * 1024);
    expect(typeof result.file_size).toBe('number');
  });
});