import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { applicationsTable, usersTable, servicesTable } from '../db/schema';
import { type CreateApplicationInput } from '../schema';
import { createApplication } from '../handlers/create_application';
import { eq } from 'drizzle-orm';

describe('createApplication', () => {
  let testUser: { id: number };
  let testService: { id: number };

  beforeEach(async () => {
    await createDB();

    // Create test user (applicant)
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        full_name: 'Test User',
        phone: '+1234567890',
        role: 'CITIZEN'
      })
      .returning()
      .execute();
    testUser = userResult[0];

    // Create test service
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
    testService = serviceResult[0];
  });

  afterEach(resetDB);

  const testInput: CreateApplicationInput = {
    service_id: 0, // Will be set in beforeEach
    applicant_id: 0, // Will be set in beforeEach
    application_data: {
      applicant_name: 'John Doe',
      applicant_id_number: '1234567890',
      reason_for_adoption: 'We want to provide a loving home for a child'
    },
    notes: 'Initial application notes'
  };

  it('should create an application with DRAFT status', async () => {
    const input = {
      ...testInput,
      service_id: testService.id,
      applicant_id: testUser.id
    };

    const result = await createApplication(input);

    // Basic field validation
    expect(result.service_id).toEqual(testService.id);
    expect(result.applicant_id).toEqual(testUser.id);
    expect(result.status).toEqual('DRAFT');
    expect(result.application_data).toEqual(input.application_data);
    expect(result.notes).toEqual('Initial application notes');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Default values for DRAFT status
    expect(result.staff_notes).toBeNull();
    expect(result.submitted_at).toBeNull();
    expect(result.reviewed_at).toBeNull();
    expect(result.reviewed_by).toBeNull();
  });

  it('should save application to database', async () => {
    const input = {
      ...testInput,
      service_id: testService.id,
      applicant_id: testUser.id
    };

    const result = await createApplication(input);

    // Query database to verify data was saved
    const applications = await db.select()
      .from(applicationsTable)
      .where(eq(applicationsTable.id, result.id))
      .execute();

    expect(applications).toHaveLength(1);
    const savedApp = applications[0];
    expect(savedApp.service_id).toEqual(testService.id);
    expect(savedApp.applicant_id).toEqual(testUser.id);
    expect(savedApp.status).toEqual('DRAFT');
    expect(savedApp.application_data).toEqual(input.application_data);
    expect(savedApp.notes).toEqual('Initial application notes');
    expect(savedApp.created_at).toBeInstanceOf(Date);
    expect(savedApp.updated_at).toBeInstanceOf(Date);
  });

  it('should handle application with null notes', async () => {
    const input = {
      ...testInput,
      service_id: testService.id,
      applicant_id: testUser.id,
      notes: null
    };

    const result = await createApplication(input);

    expect(result.notes).toBeNull();
    expect(result.status).toEqual('DRAFT');
    expect(result.application_data).toEqual(input.application_data);
  });

  it('should handle complex application data', async () => {
    const complexApplicationData = {
      applicant_name: 'Jane Smith',
      applicant_id_number: '9876543210',
      applicant_birth_place: 'Jakarta',
      applicant_birth_date: '1985-05-15',
      applicant_address: '123 Main St, Jakarta',
      applicant_occupation: 'Teacher',
      applicant_monthly_income: 5000000,
      spouse_name: 'John Smith',
      spouse_id_number: '1122334455',
      desired_child_gender: 'ANY',
      desired_child_age_min: 0,
      desired_child_age_max: 5,
      reason_for_adoption: 'We have been trying to have children for years and want to provide a loving home',
      existing_children_count: 0,
      family_members_count: 2,
      housing_ownership: 'OWNED',
      housing_condition: 'EXCELLENT',
      previous_adoption_experience: false,
      support_from_extended_family: true,
      childcare_plan: 'One parent will take extended leave to care for the child'
    };

    const input = {
      service_id: testService.id,
      applicant_id: testUser.id,
      application_data: complexApplicationData,
      notes: 'Complex application with all fields'
    };

    const result = await createApplication(input);

    expect(result.application_data).toEqual(complexApplicationData);
    expect(result.notes).toEqual('Complex application with all fields');
    expect(result.status).toEqual('DRAFT');
  });

  it('should handle empty application data object', async () => {
    const input = {
      service_id: testService.id,
      applicant_id: testUser.id,
      application_data: {}, // Empty object
      notes: 'Application with minimal data'
    };

    const result = await createApplication(input);

    expect(result.application_data).toEqual({});
    expect(result.notes).toEqual('Application with minimal data');
    expect(result.status).toEqual('DRAFT');
    expect(result.service_id).toEqual(testService.id);
    expect(result.applicant_id).toEqual(testUser.id);
  });

  it('should create multiple applications for same user and service', async () => {
    const input = {
      ...testInput,
      service_id: testService.id,
      applicant_id: testUser.id
    };

    // Create first application
    const result1 = await createApplication(input);

    // Create second application with different data
    const secondInput = {
      ...input,
      application_data: {
        applicant_name: 'Different Name',
        reason_for_adoption: 'Different reason'
      },
      notes: 'Second application'
    };

    const result2 = await createApplication(secondInput);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.application_data).not.toEqual(result2.application_data);
    expect(result1.notes).not.toEqual(result2.notes);

    // Both should be DRAFT status
    expect(result1.status).toEqual('DRAFT');
    expect(result2.status).toEqual('DRAFT');
  });

  it('should preserve timestamps correctly', async () => {
    const input = {
      ...testInput,
      service_id: testService.id,
      applicant_id: testUser.id
    };

    const before = new Date();
    const result = await createApplication(input);
    const after = new Date();

    // Verify timestamps are within reasonable range
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(after.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(after.getTime());

    // created_at and updated_at should be very close for new records
    const timeDiff = Math.abs(result.updated_at.getTime() - result.created_at.getTime());
    expect(timeDiff).toBeLessThan(1000); // Less than 1 second difference
  });
});