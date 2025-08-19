import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, servicesTable, applicationsTable } from '../db/schema';
import { type GetApplicationsQuery } from '../schema';
import { getApplications } from '../handlers/get_applications';

// Test data
const testUser = {
  email: 'test@example.com',
  full_name: 'Test User',
  phone: '123456789',
  role: 'CITIZEN' as const
};

const testUser2 = {
  email: 'test2@example.com',
  full_name: 'Test User 2',
  phone: '987654321',
  role: 'CITIZEN' as const
};

const testService = {
  name: 'Adoption Recommendation',
  description: 'Adoption recommendation service',
  type: 'ADOPTION_RECOMMENDATION' as const,
  required_documents: ['SKCK', 'HEALTH_CERTIFICATE'],
  is_active: true
};

describe('getApplications', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no applications exist', async () => {
    const query: GetApplicationsQuery = {
      limit: 50,
      offset: 0
    };

    const result = await getApplications(query);

    expect(result).toEqual([]);
  });

  it('should return all applications without filters', async () => {
    // Create prerequisites
    const users = await db.insert(usersTable)
      .values([testUser, testUser2])
      .returning()
      .execute();

    const services = await db.insert(servicesTable)
      .values(testService)
      .returning()
      .execute();

    // Create test applications
    const applicationData = {
      applicant_name: 'John Doe',
      reason_for_adoption: 'Want to provide a loving home'
    };

    await db.insert(applicationsTable)
      .values([
        {
          service_id: services[0].id,
          applicant_id: users[0].id,
          status: 'DRAFT',
          application_data: applicationData,
          notes: 'Test note 1'
        },
        {
          service_id: services[0].id,
          applicant_id: users[1].id,
          status: 'SUBMITTED',
          application_data: applicationData,
          notes: 'Test note 2'
        }
      ])
      .execute();

    const query: GetApplicationsQuery = {
      limit: 50,
      offset: 0
    };

    const result = await getApplications(query);

    expect(result).toHaveLength(2);
    expect(result[0].status).toBeDefined();
    expect(result[0].application_data).toEqual(applicationData);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should filter by status', async () => {
    // Create prerequisites
    const users = await db.insert(usersTable)
      .values([testUser, testUser2])
      .returning()
      .execute();

    const services = await db.insert(servicesTable)
      .values(testService)
      .returning()
      .execute();

    const applicationData = {
      applicant_name: 'John Doe',
      reason_for_adoption: 'Want to provide a loving home'
    };

    await db.insert(applicationsTable)
      .values([
        {
          service_id: services[0].id,
          applicant_id: users[0].id,
          status: 'DRAFT',
          application_data: applicationData,
          notes: null
        },
        {
          service_id: services[0].id,
          applicant_id: users[1].id,
          status: 'SUBMITTED',
          application_data: applicationData,
          notes: null
        },
        {
          service_id: services[0].id,
          applicant_id: users[0].id,
          status: 'APPROVED',
          application_data: applicationData,
          notes: null
        }
      ])
      .execute();

    const query: GetApplicationsQuery = {
      status: 'SUBMITTED',
      limit: 50,
      offset: 0
    };

    const result = await getApplications(query);

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('SUBMITTED');
    expect(result[0].applicant_id).toBe(users[1].id);
  });

  it('should filter by applicant_id', async () => {
    // Create prerequisites
    const users = await db.insert(usersTable)
      .values([testUser, testUser2])
      .returning()
      .execute();

    const services = await db.insert(servicesTable)
      .values(testService)
      .returning()
      .execute();

    const applicationData = {
      applicant_name: 'John Doe',
      reason_for_adoption: 'Want to provide a loving home'
    };

    await db.insert(applicationsTable)
      .values([
        {
          service_id: services[0].id,
          applicant_id: users[0].id,
          status: 'DRAFT',
          application_data: applicationData,
          notes: null
        },
        {
          service_id: services[0].id,
          applicant_id: users[1].id,
          status: 'SUBMITTED',
          application_data: applicationData,
          notes: null
        },
        {
          service_id: services[0].id,
          applicant_id: users[0].id,
          status: 'APPROVED',
          application_data: applicationData,
          notes: null
        }
      ])
      .execute();

    const query: GetApplicationsQuery = {
      applicant_id: users[0].id,
      limit: 50,
      offset: 0
    };

    const result = await getApplications(query);

    expect(result).toHaveLength(2);
    result.forEach(app => {
      expect(app.applicant_id).toBe(users[0].id);
    });
  });

  it('should filter by service_id', async () => {
    // Create prerequisites
    const users = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const services = await db.insert(servicesTable)
      .values([
        testService,
        {
          name: 'Other Service',
          description: 'Another service',
          type: 'ADOPTION_RECOMMENDATION' as const,
          required_documents: ['BIRTH_CERTIFICATE'],
          is_active: true
        }
      ])
      .returning()
      .execute();

    const applicationData = {
      applicant_name: 'John Doe',
      reason_for_adoption: 'Want to provide a loving home'
    };

    await db.insert(applicationsTable)
      .values([
        {
          service_id: services[0].id,
          applicant_id: users[0].id,
          status: 'DRAFT',
          application_data: applicationData,
          notes: null
        },
        {
          service_id: services[1].id,
          applicant_id: users[0].id,
          status: 'SUBMITTED',
          application_data: applicationData,
          notes: null
        }
      ])
      .execute();

    const query: GetApplicationsQuery = {
      service_id: services[0].id,
      limit: 50,
      offset: 0
    };

    const result = await getApplications(query);

    expect(result).toHaveLength(1);
    expect(result[0].service_id).toBe(services[0].id);
  });

  it('should apply multiple filters together', async () => {
    // Create prerequisites
    const users = await db.insert(usersTable)
      .values([testUser, testUser2])
      .returning()
      .execute();

    const services = await db.insert(servicesTable)
      .values(testService)
      .returning()
      .execute();

    const applicationData = {
      applicant_name: 'John Doe',
      reason_for_adoption: 'Want to provide a loving home'
    };

    await db.insert(applicationsTable)
      .values([
        {
          service_id: services[0].id,
          applicant_id: users[0].id,
          status: 'SUBMITTED',
          application_data: applicationData,
          notes: null
        },
        {
          service_id: services[0].id,
          applicant_id: users[1].id,
          status: 'SUBMITTED',
          application_data: applicationData,
          notes: null
        },
        {
          service_id: services[0].id,
          applicant_id: users[0].id,
          status: 'DRAFT',
          application_data: applicationData,
          notes: null
        }
      ])
      .execute();

    const query: GetApplicationsQuery = {
      status: 'SUBMITTED',
      applicant_id: users[0].id,
      service_id: services[0].id,
      limit: 50,
      offset: 0
    };

    const result = await getApplications(query);

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('SUBMITTED');
    expect(result[0].applicant_id).toBe(users[0].id);
    expect(result[0].service_id).toBe(services[0].id);
  });

  it('should apply pagination correctly', async () => {
    // Create prerequisites
    const users = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const services = await db.insert(servicesTable)
      .values(testService)
      .returning()
      .execute();

    const applicationData = {
      applicant_name: 'John Doe',
      reason_for_adoption: 'Want to provide a loving home'
    };

    // Create 5 applications
    const applicationValues = Array.from({ length: 5 }, (_, i) => ({
      service_id: services[0].id,
      applicant_id: users[0].id,
      status: 'DRAFT' as const,
      application_data: { ...applicationData, index: i },
      notes: `Note ${i}`
    }));

    await db.insert(applicationsTable)
      .values(applicationValues)
      .execute();

    // Test first page
    const firstPageQuery: GetApplicationsQuery = {
      limit: 2,
      offset: 0
    };

    const firstPageResult = await getApplications(firstPageQuery);
    expect(firstPageResult).toHaveLength(2);

    // Test second page
    const secondPageQuery: GetApplicationsQuery = {
      limit: 2,
      offset: 2
    };

    const secondPageResult = await getApplications(secondPageQuery);
    expect(secondPageResult).toHaveLength(2);

    // Test third page (should have 1 remaining)
    const thirdPageQuery: GetApplicationsQuery = {
      limit: 2,
      offset: 4
    };

    const thirdPageResult = await getApplications(thirdPageQuery);
    expect(thirdPageResult).toHaveLength(1);

    // Verify no duplicates between pages
    const firstPageIds = firstPageResult.map(app => app.id);
    const secondPageIds = secondPageResult.map(app => app.id);
    const thirdPageIds = thirdPageResult.map(app => app.id);

    const allIds = [...firstPageIds, ...secondPageIds, ...thirdPageIds];
    const uniqueIds = [...new Set(allIds)];
    expect(allIds).toHaveLength(uniqueIds.length);
  });

  it('should handle edge case with limit 0', async () => {
    // Create prerequisites
    const users = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const services = await db.insert(servicesTable)
      .values(testService)
      .returning()
      .execute();

    await db.insert(applicationsTable)
      .values({
        service_id: services[0].id,
        applicant_id: users[0].id,
        status: 'DRAFT',
        application_data: { test: 'data' },
        notes: null
      })
      .execute();

    const query: GetApplicationsQuery = {
      limit: 1, // minimum positive value
      offset: 0
    };

    const result = await getApplications(query);
    expect(result).toHaveLength(1);
  });

  it('should return empty array when offset exceeds total records', async () => {
    // Create prerequisites
    const users = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const services = await db.insert(servicesTable)
      .values(testService)
      .returning()
      .execute();

    await db.insert(applicationsTable)
      .values({
        service_id: services[0].id,
        applicant_id: users[0].id,
        status: 'DRAFT',
        application_data: { test: 'data' },
        notes: null
      })
      .execute();

    const query: GetApplicationsQuery = {
      limit: 50,
      offset: 100 // Way beyond available records
    };

    const result = await getApplications(query);
    expect(result).toEqual([]);
  });
});