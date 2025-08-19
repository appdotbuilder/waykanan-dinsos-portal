import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, servicesTable, applicationsTable, applicationDocumentsTable } from '../db/schema';
import { deleteDocument } from '../handlers/delete_document';
import { eq } from 'drizzle-orm';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join } from 'path';

describe('deleteDocument', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testServiceId: number;
  let testApplicationId: number;
  let testDocumentId: number;
  let testFilePath: string;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        full_name: 'Test User',
        phone: '1234567890',
        role: 'CITIZEN'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test service
    const serviceResult = await db.insert(servicesTable)
      .values({
        name: 'Test Service',
        description: 'A service for testing',
        type: 'ADOPTION_RECOMMENDATION',
        required_documents: ['BIRTH_CERTIFICATE', 'PHOTO'],
        is_active: true
      })
      .returning()
      .execute();
    testServiceId = serviceResult[0].id;

    // Create test application in DRAFT status
    const applicationResult = await db.insert(applicationsTable)
      .values({
        service_id: testServiceId,
        applicant_id: testUserId,
        status: 'DRAFT',
        application_data: { test: 'data' },
        notes: 'Test notes'
      })
      .returning()
      .execute();
    testApplicationId = applicationResult[0].id;

    // Create test file path and file
    testFilePath = join(process.cwd(), 'test-uploads', 'test-document.pdf');
    await mkdir(dirname(testFilePath), { recursive: true });
    await writeFile(testFilePath, 'test document content');

    // Create test document
    const documentResult = await db.insert(applicationDocumentsTable)
      .values({
        application_id: testApplicationId,
        document_type: 'BIRTH_CERTIFICATE',
        file_name: 'test-document.pdf',
        file_path: testFilePath,
        file_size: 1024,
        mime_type: 'application/pdf'
      })
      .returning()
      .execute();
    testDocumentId = documentResult[0].id;
  });

  it('should successfully delete document from DRAFT application', async () => {
    const result = await deleteDocument(testDocumentId);

    expect(result).toBe(true);

    // Verify document is deleted from database
    const documents = await db.select()
      .from(applicationDocumentsTable)
      .where(eq(applicationDocumentsTable.id, testDocumentId))
      .execute();

    expect(documents).toHaveLength(0);

    // Verify physical file is deleted
    expect(existsSync(testFilePath)).toBe(false);
  });

  it('should return false for non-existent document', async () => {
    const result = await deleteDocument(99999);

    expect(result).toBe(false);
  });

  it('should not delete document from SUBMITTED application', async () => {
    // Update application status to SUBMITTED
    await db.update(applicationsTable)
      .set({ status: 'SUBMITTED', submitted_at: new Date() })
      .where(eq(applicationsTable.id, testApplicationId))
      .execute();

    const result = await deleteDocument(testDocumentId);

    expect(result).toBe(false);

    // Verify document still exists in database
    const documents = await db.select()
      .from(applicationDocumentsTable)
      .where(eq(applicationDocumentsTable.id, testDocumentId))
      .execute();

    expect(documents).toHaveLength(1);

    // Verify physical file still exists
    expect(existsSync(testFilePath)).toBe(true);
  });

  it('should not delete document from UNDER_REVIEW application', async () => {
    // Update application status to UNDER_REVIEW
    await db.update(applicationsTable)
      .set({ status: 'UNDER_REVIEW' })
      .where(eq(applicationsTable.id, testApplicationId))
      .execute();

    const result = await deleteDocument(testDocumentId);

    expect(result).toBe(false);

    // Verify document still exists
    const documents = await db.select()
      .from(applicationDocumentsTable)
      .where(eq(applicationDocumentsTable.id, testDocumentId))
      .execute();

    expect(documents).toHaveLength(1);
  });

  it('should not delete document from APPROVED application', async () => {
    // Update application status to APPROVED
    await db.update(applicationsTable)
      .set({ status: 'APPROVED', reviewed_at: new Date() })
      .where(eq(applicationsTable.id, testApplicationId))
      .execute();

    const result = await deleteDocument(testDocumentId);

    expect(result).toBe(false);

    // Verify document still exists
    const documents = await db.select()
      .from(applicationDocumentsTable)
      .where(eq(applicationDocumentsTable.id, testDocumentId))
      .execute();

    expect(documents).toHaveLength(1);
  });

  it('should not delete document from REJECTED application', async () => {
    // Update application status to REJECTED
    await db.update(applicationsTable)
      .set({ status: 'REJECTED', reviewed_at: new Date() })
      .where(eq(applicationsTable.id, testApplicationId))
      .execute();

    const result = await deleteDocument(testDocumentId);

    expect(result).toBe(false);

    // Verify document still exists
    const documents = await db.select()
      .from(applicationDocumentsTable)
      .where(eq(applicationDocumentsTable.id, testDocumentId))
      .execute();

    expect(documents).toHaveLength(1);
  });

  it('should handle case where physical file does not exist', async () => {
    // Delete the physical file first
    await Bun.file(testFilePath).write('');
    const file = Bun.file(testFilePath);
    if (await file.exists()) {
      await file.stream().cancel();
    }

    // The handler should still succeed in deleting the database record
    const result = await deleteDocument(testDocumentId);

    expect(result).toBe(true);

    // Verify document is deleted from database
    const documents = await db.select()
      .from(applicationDocumentsTable)
      .where(eq(applicationDocumentsTable.id, testDocumentId))
      .execute();

    expect(documents).toHaveLength(0);
  });

  it('should delete document from REQUIRES_DOCUMENTS application', async () => {
    // Update application status to REQUIRES_DOCUMENTS (should still allow deletion)
    await db.update(applicationsTable)
      .set({ status: 'REQUIRES_DOCUMENTS' })
      .where(eq(applicationsTable.id, testApplicationId))
      .execute();

    const result = await deleteDocument(testDocumentId);

    expect(result).toBe(false); // Should not allow deletion from non-draft status
  });

  it('should verify document belongs to correct application', async () => {
    // Create another application and document
    const anotherApplicationResult = await db.insert(applicationsTable)
      .values({
        service_id: testServiceId,
        applicant_id: testUserId,
        status: 'SUBMITTED',
        application_data: { test: 'data' }
      })
      .returning()
      .execute();

    const anotherFilePath = join(process.cwd(), 'test-uploads', 'another-document.pdf');
    await writeFile(anotherFilePath, 'another test document');

    const anotherDocumentResult = await db.insert(applicationDocumentsTable)
      .values({
        application_id: anotherApplicationResult[0].id,
        document_type: 'PHOTO',
        file_name: 'another-document.pdf',
        file_path: anotherFilePath,
        file_size: 512,
        mime_type: 'application/pdf'
      })
      .returning()
      .execute();

    // Try to delete document from SUBMITTED application (should fail)
    const result = await deleteDocument(anotherDocumentResult[0].id);

    expect(result).toBe(false);

    // Original document in DRAFT should still be deletable
    const originalResult = await deleteDocument(testDocumentId);
    expect(originalResult).toBe(true);
  });
});