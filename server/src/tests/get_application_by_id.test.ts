import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, servicesTable, applicationsTable, applicationDocumentsTable } from '../db/schema';
import { getApplicationById } from '../handlers/get_application_by_id';

// Test data
const testUser = {
  email: 'test@example.com',
  full_name: 'Test User',
  phone: '+6281234567890',
  role: 'CITIZEN' as const
};

const testService = {
  name: 'Adoption Recommendation',
  description: 'Service for adoption recommendation',
  type: 'ADOPTION_RECOMMENDATION' as const,
  required_documents: ['SKCK', 'HEALTH_CERTIFICATE', 'PSYCHOLOGICAL_CERTIFICATE'],
  is_active: true
};

const testApplicationData = {
  applicant_name: 'John Doe',
  applicant_id_number: '1234567890123456',
  reason_for_adoption: 'Want to provide love and care to a child in need'
};

describe('getApplicationById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return application by id', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const [service] = await db.insert(servicesTable)
      .values(testService)
      .returning()
      .execute();

    const [application] = await db.insert(applicationsTable)
      .values({
        service_id: service.id,
        applicant_id: user.id,
        application_data: testApplicationData,
        notes: 'Test application notes',
        status: 'SUBMITTED'
      })
      .returning()
      .execute();

    // Test the handler
    const result = await getApplicationById(application.id);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(application.id);
    expect(result!.service_id).toBe(service.id);
    expect(result!.applicant_id).toBe(user.id);
    expect(result!.status).toBe('SUBMITTED');
    expect(result!.application_data).toEqual(testApplicationData);
    expect(result!.notes).toBe('Test application notes');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent application', async () => {
    const result = await getApplicationById(999999);
    expect(result).toBeNull();
  });

  it('should handle application with staff notes and reviewer', async () => {
    // Create users
    const [citizen] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const [staff] = await db.insert(usersTable)
      .values({
        email: 'staff@example.com',
        full_name: 'Staff Member',
        phone: null,
        role: 'STAFF'
      })
      .returning()
      .execute();

    // Create service
    const [service] = await db.insert(servicesTable)
      .values(testService)
      .returning()
      .execute();

    // Create application with review data
    const [application] = await db.insert(applicationsTable)
      .values({
        service_id: service.id,
        applicant_id: citizen.id,
        application_data: testApplicationData,
        notes: 'Applicant notes',
        staff_notes: 'Staff internal notes',
        status: 'UNDER_REVIEW',
        reviewed_by: staff.id,
        reviewed_at: new Date(),
        submitted_at: new Date()
      })
      .returning()
      .execute();

    const result = await getApplicationById(application.id);

    expect(result).not.toBeNull();
    expect(result!.status).toBe('UNDER_REVIEW');
    expect(result!.notes).toBe('Applicant notes');
    expect(result!.staff_notes).toBe('Staff internal notes');
    expect(result!.reviewed_by).toBe(staff.id);
    expect(result!.reviewed_at).toBeInstanceOf(Date);
    expect(result!.submitted_at).toBeInstanceOf(Date);
  });

  it('should work with application that has associated documents', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const [service] = await db.insert(servicesTable)
      .values(testService)
      .returning()
      .execute();

    const [application] = await db.insert(applicationsTable)
      .values({
        service_id: service.id,
        applicant_id: user.id,
        application_data: testApplicationData,
        notes: null,
        status: 'DRAFT'
      })
      .returning()
      .execute();

    // Add some documents
    await db.insert(applicationDocumentsTable)
      .values([
        {
          application_id: application.id,
          document_type: 'SKCK',
          file_name: 'skck.pdf',
          file_path: '/uploads/skck.pdf',
          file_size: 1024000,
          mime_type: 'application/pdf'
        },
        {
          application_id: application.id,
          document_type: 'HEALTH_CERTIFICATE',
          file_name: 'health_cert.pdf',
          file_path: '/uploads/health_cert.pdf',
          file_size: 512000,
          mime_type: 'application/pdf'
        }
      ])
      .execute();

    // Test the handler - should still return application data
    const result = await getApplicationById(application.id);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(application.id);
    expect(result!.status).toBe('DRAFT');
    expect(result!.notes).toBeNull();
  });

  it('should handle applications with nullable fields correctly', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values({
        ...testUser,
        phone: null // Test nullable field
      })
      .returning()
      .execute();

    const [service] = await db.insert(servicesTable)
      .values({
        ...testService,
        description: null // Test nullable field
      })
      .returning()
      .execute();

    const [application] = await db.insert(applicationsTable)
      .values({
        service_id: service.id,
        applicant_id: user.id,
        application_data: testApplicationData,
        notes: null,
        staff_notes: null,
        status: 'DRAFT'
      })
      .returning()
      .execute();

    const result = await getApplicationById(application.id);

    expect(result).not.toBeNull();
    expect(result!.notes).toBeNull();
    expect(result!.staff_notes).toBeNull();
    expect(result!.submitted_at).toBeNull();
    expect(result!.reviewed_at).toBeNull();
    expect(result!.reviewed_by).toBeNull();
  });
});