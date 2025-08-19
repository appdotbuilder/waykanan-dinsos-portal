import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, servicesTable, applicationsTable, applicationDocumentsTable } from '../db/schema';
import { submitApplication } from '../handlers/submit_application';
import { eq } from 'drizzle-orm';

describe('submitApplication', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testServiceId: number;
  let testApplicationId: number;

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

    // Create test service with required documents
    const serviceResult = await db.insert(servicesTable)
      .values({
        name: 'Adoption Recommendation',
        description: 'Service for adoption recommendation',
        type: 'ADOPTION_RECOMMENDATION',
        required_documents: ['SKCK', 'HEALTH_CERTIFICATE'],
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
        notes: 'Test application'
      })
      .returning()
      .execute();
    testApplicationId = applicationResult[0].id;
  });

  it('should submit application successfully when all required documents are uploaded', async () => {
    // Upload required documents
    await db.insert(applicationDocumentsTable)
      .values([
        {
          application_id: testApplicationId,
          document_type: 'SKCK',
          file_name: 'skck.pdf',
          file_path: '/uploads/skck.pdf',
          file_size: 1024,
          mime_type: 'application/pdf'
        },
        {
          application_id: testApplicationId,
          document_type: 'HEALTH_CERTIFICATE',
          file_name: 'health.pdf',
          file_path: '/uploads/health.pdf',
          file_size: 2048,
          mime_type: 'application/pdf'
        }
      ])
      .execute();

    const result = await submitApplication(testApplicationId);

    // Verify result
    expect(result).not.toBeNull();
    expect(result!.id).toBe(testApplicationId);
    expect(result!.status).toBe('SUBMITTED');
    expect(result!.submitted_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);

    // Verify database state
    const applications = await db.select()
      .from(applicationsTable)
      .where(eq(applicationsTable.id, testApplicationId))
      .execute();

    expect(applications).toHaveLength(1);
    expect(applications[0].status).toBe('SUBMITTED');
    expect(applications[0].submitted_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent application', async () => {
    const result = await submitApplication(99999);
    expect(result).toBeNull();
  });

  it('should throw error when required documents are missing', async () => {
    // Upload only one of two required documents
    await db.insert(applicationDocumentsTable)
      .values({
        application_id: testApplicationId,
        document_type: 'SKCK',
        file_name: 'skck.pdf',
        file_path: '/uploads/skck.pdf',
        file_size: 1024,
        mime_type: 'application/pdf'
      })
      .execute();

    await expect(submitApplication(testApplicationId))
      .rejects.toThrow(/Missing required documents: HEALTH_CERTIFICATE/i);
  });

  it('should throw error when no documents are uploaded', async () => {
    await expect(submitApplication(testApplicationId))
      .rejects.toThrow(/Missing required documents: SKCK, HEALTH_CERTIFICATE/i);
  });

  it('should throw error when application is not in DRAFT status', async () => {
    // Update application status to SUBMITTED
    await db.update(applicationsTable)
      .set({ status: 'SUBMITTED' })
      .where(eq(applicationsTable.id, testApplicationId))
      .execute();

    await expect(submitApplication(testApplicationId))
      .rejects.toThrow(/Application can only be submitted from DRAFT status/i);
  });

  it('should handle application with UNDER_REVIEW status', async () => {
    // Update application status to UNDER_REVIEW
    await db.update(applicationsTable)
      .set({ status: 'UNDER_REVIEW' })
      .where(eq(applicationsTable.id, testApplicationId))
      .execute();

    await expect(submitApplication(testApplicationId))
      .rejects.toThrow(/Application can only be submitted from DRAFT status/i);
  });

  it('should work with service that has no required documents', async () => {
    // Create service with no required documents
    const serviceResult = await db.insert(servicesTable)
      .values({
        name: 'No Docs Service',
        description: 'Service with no required documents',
        type: 'ADOPTION_RECOMMENDATION',
        required_documents: [],
        is_active: true
      })
      .returning()
      .execute();

    // Create application for this service
    const applicationResult = await db.insert(applicationsTable)
      .values({
        service_id: serviceResult[0].id,
        applicant_id: testUserId,
        status: 'DRAFT',
        application_data: { test: 'data' },
        notes: 'Test application'
      })
      .returning()
      .execute();

    const result = await submitApplication(applicationResult[0].id);

    expect(result).not.toBeNull();
    expect(result!.status).toBe('SUBMITTED');
    expect(result!.submitted_at).toBeInstanceOf(Date);
  });

  it('should handle extra uploaded documents beyond required ones', async () => {
    // Upload required documents plus extra ones
    await db.insert(applicationDocumentsTable)
      .values([
        {
          application_id: testApplicationId,
          document_type: 'SKCK',
          file_name: 'skck.pdf',
          file_path: '/uploads/skck.pdf',
          file_size: 1024,
          mime_type: 'application/pdf'
        },
        {
          application_id: testApplicationId,
          document_type: 'HEALTH_CERTIFICATE',
          file_name: 'health.pdf',
          file_path: '/uploads/health.pdf',
          file_size: 2048,
          mime_type: 'application/pdf'
        },
        {
          application_id: testApplicationId,
          document_type: 'PHOTO',
          file_name: 'photo.jpg',
          file_path: '/uploads/photo.jpg',
          file_size: 512,
          mime_type: 'image/jpeg'
        }
      ])
      .execute();

    const result = await submitApplication(testApplicationId);

    expect(result).not.toBeNull();
    expect(result!.status).toBe('SUBMITTED');
    expect(result!.submitted_at).toBeInstanceOf(Date);
  });
});