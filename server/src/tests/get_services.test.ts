import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { servicesTable } from '../db/schema';
import { type CreateServiceInput } from '../schema';
import { getServices } from '../handlers/get_services';

// Test service inputs
const testService1: CreateServiceInput = {
  name: 'Adoption Recommendation',
  description: 'Service for adoption recommendation process',
  type: 'ADOPTION_RECOMMENDATION',
  required_documents: ['SKCK', 'HEALTH_CERTIFICATE', 'PSYCHOLOGICAL_CERTIFICATE'],
  is_active: true
};

const testService2: CreateServiceInput = {
  name: 'Basic Adoption Service',
  description: 'Basic adoption service with minimal requirements',
  type: 'ADOPTION_RECOMMENDATION',
  required_documents: ['BIRTH_CERTIFICATE', 'MARRIAGE_CERTIFICATE'],
  is_active: true
};

const inactiveService: CreateServiceInput = {
  name: 'Inactive Service',
  description: 'This service should not appear in results',
  type: 'ADOPTION_RECOMMENDATION',
  required_documents: ['OTHER'],
  is_active: false
};

describe('getServices', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all active services', async () => {
    // Create test services
    await db.insert(servicesTable)
      .values([
        {
          name: testService1.name,
          description: testService1.description,
          type: testService1.type,
          required_documents: testService1.required_documents,
          is_active: testService1.is_active
        },
        {
          name: testService2.name,
          description: testService2.description,
          type: testService2.type,
          required_documents: testService2.required_documents,
          is_active: testService2.is_active
        }
      ])
      .execute();

    const result = await getServices();

    expect(result).toHaveLength(2);
    
    // Verify first service
    expect(result[0].name).toEqual('Adoption Recommendation');
    expect(result[0].description).toEqual('Service for adoption recommendation process');
    expect(result[0].type).toEqual('ADOPTION_RECOMMENDATION');
    expect(result[0].required_documents).toEqual(['SKCK', 'HEALTH_CERTIFICATE', 'PSYCHOLOGICAL_CERTIFICATE']);
    expect(result[0].is_active).toBe(true);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);

    // Verify second service
    expect(result[1].name).toEqual('Basic Adoption Service');
    expect(result[1].description).toEqual('Basic adoption service with minimal requirements');
    expect(result[1].type).toEqual('ADOPTION_RECOMMENDATION');
    expect(result[1].required_documents).toEqual(['BIRTH_CERTIFICATE', 'MARRIAGE_CERTIFICATE']);
    expect(result[1].is_active).toBe(true);
  });

  it('should exclude inactive services', async () => {
    // Create both active and inactive services
    await db.insert(servicesTable)
      .values([
        {
          name: testService1.name,
          description: testService1.description,
          type: testService1.type,
          required_documents: testService1.required_documents,
          is_active: testService1.is_active
        },
        {
          name: inactiveService.name,
          description: inactiveService.description,
          type: inactiveService.type,
          required_documents: inactiveService.required_documents,
          is_active: inactiveService.is_active
        }
      ])
      .execute();

    const result = await getServices();

    // Should only return the active service
    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Adoption Recommendation');
    expect(result[0].is_active).toBe(true);

    // Verify inactive service is not included
    const serviceNames = result.map(s => s.name);
    expect(serviceNames).not.toContain('Inactive Service');
  });

  it('should return services ordered by name', async () => {
    // Create services with names that will test ordering
    await db.insert(servicesTable)
      .values([
        {
          name: 'Zebra Service',
          description: 'Should appear last',
          type: 'ADOPTION_RECOMMENDATION',
          required_documents: ['OTHER'],
          is_active: true
        },
        {
          name: 'Alpha Service',
          description: 'Should appear first',
          type: 'ADOPTION_RECOMMENDATION',
          required_documents: ['OTHER'],
          is_active: true
        },
        {
          name: 'Beta Service',
          description: 'Should appear middle',
          type: 'ADOPTION_RECOMMENDATION',
          required_documents: ['OTHER'],
          is_active: true
        }
      ])
      .execute();

    const result = await getServices();

    expect(result).toHaveLength(3);
    expect(result[0].name).toEqual('Alpha Service');
    expect(result[1].name).toEqual('Beta Service');
    expect(result[2].name).toEqual('Zebra Service');
  });

  it('should return empty array when no active services exist', async () => {
    // Create only inactive services
    await db.insert(servicesTable)
      .values([
        {
          name: inactiveService.name,
          description: inactiveService.description,
          type: inactiveService.type,
          required_documents: inactiveService.required_documents,
          is_active: inactiveService.is_active
        }
      ])
      .execute();

    const result = await getServices();

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should handle services with null descriptions', async () => {
    // Create service with null description
    await db.insert(servicesTable)
      .values([
        {
          name: 'Service with null description',
          description: null,
          type: 'ADOPTION_RECOMMENDATION',
          required_documents: ['SKCK'],
          is_active: true
        }
      ])
      .execute();

    const result = await getServices();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Service with null description');
    expect(result[0].description).toBeNull();
    expect(result[0].required_documents).toEqual(['SKCK']);
  });

  it('should handle services with complex required_documents arrays', async () => {
    // Create service with all possible document types
    const allDocumentTypes: Array<'SKCK' | 'HEALTH_CERTIFICATE' | 'PSYCHOLOGICAL_CERTIFICATE' | 'FINANCIAL_STATEMENT' | 'FAMILY_CONSENT' | 'BIRTH_CERTIFICATE' | 'MARRIAGE_CERTIFICATE' | 'PHOTO' | 'OTHER'> = [
      'SKCK',
      'HEALTH_CERTIFICATE', 
      'PSYCHOLOGICAL_CERTIFICATE',
      'FINANCIAL_STATEMENT',
      'FAMILY_CONSENT',
      'BIRTH_CERTIFICATE',
      'MARRIAGE_CERTIFICATE',
      'PHOTO',
      'OTHER'
    ];

    await db.insert(servicesTable)
      .values([
        {
          name: 'Comprehensive Service',
          description: 'Service requiring all document types',
          type: 'ADOPTION_RECOMMENDATION',
          required_documents: allDocumentTypes,
          is_active: true
        }
      ])
      .execute();

    const result = await getServices();

    expect(result).toHaveLength(1);
    expect(result[0].required_documents).toEqual(allDocumentTypes);
    expect(result[0].required_documents).toHaveLength(9);
  });
});