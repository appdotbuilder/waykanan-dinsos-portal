import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, servicesTable, applicationsTable } from '../db/schema';
import { type UpdateApplicationInput } from '../schema';
import { updateApplication } from '../handlers/update_application';
import { eq } from 'drizzle-orm';

// Helper function to create a test user
async function createTestUser(role: 'CITIZEN' | 'STAFF' = 'CITIZEN') {
  const result = await db.insert(usersTable)
    .values({
      email: role === 'CITIZEN' ? 'test@example.com' : 'staff@example.com',
      full_name: role === 'CITIZEN' ? 'Test User' : 'Staff User',
      phone: '1234567890',
      role: role
    })
    .returning()
    .execute();
  
  return result[0];
}

// Helper function to create a test service
async function createTestService() {
  const result = await db.insert(servicesTable)
    .values({
      name: 'Adoption Service',
      description: 'Test adoption service',
      type: 'ADOPTION_RECOMMENDATION',
      required_documents: ['HEALTH_CERTIFICATE', 'SKCK'],
      is_active: true
    })
    .returning()
    .execute();
  
  return result[0];
}

// Helper function to create a test application
async function createTestApplication(applicantId: number, serviceId: number, status: 'DRAFT' | 'SUBMITTED' = 'DRAFT') {
  const applicationData: any = {
    service_id: serviceId,
    applicant_id: applicantId,
    status: status,
    application_data: { test: 'data' },
    notes: 'Initial notes'
  };

  // If status is SUBMITTED, set submitted_at
  if (status === 'SUBMITTED') {
    applicationData.submitted_at = new Date();
  }

  const result = await db.insert(applicationsTable)
    .values(applicationData)
    .returning()
    .execute();
  
  return result[0];
}

describe('updateApplication', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update basic application fields', async () => {
    // Setup test data
    const user = await createTestUser();
    const service = await createTestService();
    const application = await createTestApplication(user.id, service.id);

    const updateInput: UpdateApplicationInput = {
      id: application.id,
      application_data: { updated: 'data', field: 'value' },
      notes: 'Updated notes'
    };

    const result = await updateApplication(updateInput);

    // Verify the update
    expect(result).toBeDefined();
    expect(result!.id).toEqual(application.id);
    expect(result!.application_data).toEqual({ updated: 'data', field: 'value' });
    expect(result!.notes).toEqual('Updated notes');
    expect(result!.status).toEqual('DRAFT'); // Should remain unchanged
    expect(result!.updated_at).toBeInstanceOf(Date);
    expect(result!.updated_at > application.updated_at).toBe(true);
  });

  it('should update application status to SUBMITTED and set submitted_at', async () => {
    // Setup test data
    const user = await createTestUser();
    const service = await createTestService();
    const application = await createTestApplication(user.id, service.id);

    const updateInput: UpdateApplicationInput = {
      id: application.id,
      status: 'SUBMITTED'
    };

    const result = await updateApplication(updateInput);

    // Verify status change and timestamp
    expect(result).toBeDefined();
    expect(result!.status).toEqual('SUBMITTED');
    expect(result!.submitted_at).toBeInstanceOf(Date);
    expect(result!.submitted_at).not.toBeNull();
    expect(result!.reviewed_at).toBeNull(); // Should still be null
    expect(result!.reviewed_by).toBeNull(); // Should still be null
  });

  it('should set reviewed_at and reviewed_by when staff reviews application', async () => {
    // Setup test data
    const user = await createTestUser();
    const staff = await createTestUser('STAFF');
    const service = await createTestService();
    const application = await createTestApplication(user.id, service.id, 'SUBMITTED');

    const updateInput: UpdateApplicationInput = {
      id: application.id,
      status: 'UNDER_REVIEW',
      staff_notes: 'Starting review process',
      reviewed_by: staff.id
    };

    const result = await updateApplication(updateInput);

    // Verify review fields are set
    expect(result).toBeDefined();
    expect(result!.status).toEqual('UNDER_REVIEW');
    expect(result!.staff_notes).toEqual('Starting review process');
    expect(result!.reviewed_by).toEqual(staff.id);
    expect(result!.reviewed_at).toBeInstanceOf(Date);
    expect(result!.reviewed_at).not.toBeNull();
  });

  it('should update staff notes without changing other fields', async () => {
    // Setup test data
    const user = await createTestUser();
    const service = await createTestService();
    const application = await createTestApplication(user.id, service.id);

    const updateInput: UpdateApplicationInput = {
      id: application.id,
      staff_notes: 'Internal staff notes'
    };

    const result = await updateApplication(updateInput);

    // Verify only staff_notes changed
    expect(result).toBeDefined();
    expect(result!.staff_notes).toEqual('Internal staff notes');
    expect(result!.status).toEqual(application.status);
    expect(result!.notes).toEqual(application.notes);
    expect(result!.application_data).toEqual(application.application_data);
    expect(result!.submitted_at).toEqual(application.submitted_at);
    expect(result!.reviewed_at).toEqual(application.reviewed_at);
  });

  it('should handle application approval workflow', async () => {
    // Setup test data
    const user = await createTestUser();
    const staff = await createTestUser('STAFF');
    const service = await createTestService();
    const application = await createTestApplication(user.id, service.id, 'SUBMITTED');

    const updateInput: UpdateApplicationInput = {
      id: application.id,
      status: 'APPROVED',
      staff_notes: 'Application approved after review',
      reviewed_by: staff.id
    };

    const result = await updateApplication(updateInput);

    // Verify approval workflow
    expect(result).toBeDefined();
    expect(result!.status).toEqual('APPROVED');
    expect(result!.staff_notes).toEqual('Application approved after review');
    expect(result!.reviewed_by).toEqual(staff.id);
    expect(result!.reviewed_at).toBeInstanceOf(Date);
    expect(result!.submitted_at).toBeInstanceOf(Date); // Should preserve existing submitted_at
  });

  it('should handle application rejection workflow', async () => {
    // Setup test data
    const user = await createTestUser();
    const staff = await createTestUser('STAFF');
    const service = await createTestService();
    const application = await createTestApplication(user.id, service.id, 'SUBMITTED');

    const updateInput: UpdateApplicationInput = {
      id: application.id,
      status: 'REJECTED',
      staff_notes: 'Missing required documents',
      reviewed_by: staff.id
    };

    const result = await updateApplication(updateInput);

    // Verify rejection workflow
    expect(result).toBeDefined();
    expect(result!.status).toEqual('REJECTED');
    expect(result!.staff_notes).toEqual('Missing required documents');
    expect(result!.reviewed_by).toEqual(staff.id);
    expect(result!.reviewed_at).toBeInstanceOf(Date);
  });

  it('should handle multiple field updates in single operation', async () => {
    // Setup test data
    const user = await createTestUser();
    const staff = await createTestUser('STAFF');
    const service = await createTestService();
    const application = await createTestApplication(user.id, service.id);

    const updateInput: UpdateApplicationInput = {
      id: application.id,
      status: 'REQUIRES_DOCUMENTS',
      application_data: { additional: 'info', updated: true },
      notes: 'Updated by applicant',
      staff_notes: 'Need birth certificate',
      reviewed_by: staff.id
    };

    const result = await updateApplication(updateInput);

    // Verify all fields updated
    expect(result).toBeDefined();
    expect(result!.status).toEqual('REQUIRES_DOCUMENTS');
    expect(result!.application_data).toEqual({ additional: 'info', updated: true });
    expect(result!.notes).toEqual('Updated by applicant');
    expect(result!.staff_notes).toEqual('Need birth certificate');
    expect(result!.reviewed_by).toEqual(staff.id);
    expect(result!.reviewed_at).toBeInstanceOf(Date);
    expect(result!.updated_at > application.updated_at).toBe(true);
  });

  it('should return null when application does not exist', async () => {
    const updateInput: UpdateApplicationInput = {
      id: 999999, // Non-existent ID
      status: 'SUBMITTED'
    };

    const result = await updateApplication(updateInput);

    expect(result).toBeNull();
  });

  it('should save changes to database correctly', async () => {
    // Setup test data
    const user = await createTestUser();
    const service = await createTestService();
    const application = await createTestApplication(user.id, service.id);

    const updateInput: UpdateApplicationInput = {
      id: application.id,
      status: 'SUBMITTED',
      application_data: { verified: true }
    };

    await updateApplication(updateInput);

    // Verify changes are persisted in database
    const applications = await db.select()
      .from(applicationsTable)
      .where(eq(applicationsTable.id, application.id))
      .execute();

    expect(applications).toHaveLength(1);
    const updatedApp = applications[0];
    expect(updatedApp.status).toEqual('SUBMITTED');
    expect(updatedApp.application_data).toEqual({ verified: true });
    expect(updatedApp.submitted_at).toBeInstanceOf(Date);
    expect(updatedApp.updated_at > application.updated_at).toBe(true);
  });

  it('should handle nullable field updates correctly', async () => {
    // Setup test data
    const user = await createTestUser();
    const service = await createTestService();
    const application = await createTestApplication(user.id, service.id);

    // Update with null values
    const updateInput: UpdateApplicationInput = {
      id: application.id,
      notes: null,
      staff_notes: null,
      reviewed_by: null
    };

    const result = await updateApplication(updateInput);

    // Verify null values are set correctly
    expect(result).toBeDefined();
    expect(result!.notes).toBeNull();
    expect(result!.staff_notes).toBeNull();
    expect(result!.reviewed_by).toBeNull();
    expect(result!.reviewed_at).toBeNull(); // Should not be set when reviewed_by is null
  });
});