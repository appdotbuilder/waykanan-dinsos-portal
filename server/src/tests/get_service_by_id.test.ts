import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { servicesTable } from '../db/schema';
import { type CreateServiceInput } from '../schema';
import { getServiceById } from '../handlers/get_service_by_id';

// Test service data
const testService: CreateServiceInput = {
  name: 'Adoption Recommendation Service',
  description: 'Service for processing adoption recommendations',
  type: 'ADOPTION_RECOMMENDATION',
  required_documents: ['SKCK', 'HEALTH_CERTIFICATE', 'PSYCHOLOGICAL_CERTIFICATE'],
  is_active: true
};

const anotherTestService: CreateServiceInput = {
  name: 'Another Adoption Service',
  description: 'Another service for testing',
  type: 'ADOPTION_RECOMMENDATION',
  required_documents: ['BIRTH_CERTIFICATE', 'MARRIAGE_CERTIFICATE'],
  is_active: false
};

describe('getServiceById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a service by ID', async () => {
    // Create test service
    const insertResult = await db.insert(servicesTable)
      .values(testService)
      .returning()
      .execute();
    
    const createdService = insertResult[0];

    // Test the handler
    const result = await getServiceById(createdService.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdService.id);
    expect(result!.name).toEqual('Adoption Recommendation Service');
    expect(result!.description).toEqual('Service for processing adoption recommendations');
    expect(result!.type).toEqual('ADOPTION_RECOMMENDATION');
    expect(result!.required_documents).toEqual(['SKCK', 'HEALTH_CERTIFICATE', 'PSYCHOLOGICAL_CERTIFICATE']);
    expect(result!.is_active).toEqual(true);
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should return null when service does not exist', async () => {
    const result = await getServiceById(999);

    expect(result).toBeNull();
  });

  it('should handle services with different required documents', async () => {
    // Create service with different document requirements
    const insertResult = await db.insert(servicesTable)
      .values(anotherTestService)
      .returning()
      .execute();
    
    const createdService = insertResult[0];

    const result = await getServiceById(createdService.id);

    expect(result).not.toBeNull();
    expect(result!.name).toEqual('Another Adoption Service');
    expect(result!.required_documents).toEqual(['BIRTH_CERTIFICATE', 'MARRIAGE_CERTIFICATE']);
    expect(result!.is_active).toEqual(false);
  });

  it('should handle services with null description', async () => {
    const serviceWithNullDescription: CreateServiceInput = {
      name: 'Service Without Description',
      description: null,
      type: 'ADOPTION_RECOMMENDATION',
      required_documents: ['PHOTO'],
      is_active: true
    };

    const insertResult = await db.insert(servicesTable)
      .values(serviceWithNullDescription)
      .returning()
      .execute();
    
    const createdService = insertResult[0];

    const result = await getServiceById(createdService.id);

    expect(result).not.toBeNull();
    expect(result!.name).toEqual('Service Without Description');
    expect(result!.description).toBeNull();
    expect(result!.required_documents).toEqual(['PHOTO']);
  });

  it('should return correct service when multiple services exist', async () => {
    // Create multiple services
    const service1Result = await db.insert(servicesTable)
      .values(testService)
      .returning()
      .execute();
    
    const service2Result = await db.insert(servicesTable)
      .values(anotherTestService)
      .returning()
      .execute();

    const service1 = service1Result[0];
    const service2 = service2Result[0];

    // Test getting first service
    const result1 = await getServiceById(service1.id);
    expect(result1).not.toBeNull();
    expect(result1!.id).toEqual(service1.id);
    expect(result1!.name).toEqual('Adoption Recommendation Service');

    // Test getting second service
    const result2 = await getServiceById(service2.id);
    expect(result2).not.toBeNull();
    expect(result2!.id).toEqual(service2.id);
    expect(result2!.name).toEqual('Another Adoption Service');
  });

  it('should handle services with empty required documents array', async () => {
    const serviceWithNoDocuments: CreateServiceInput = {
      name: 'Service With No Documents',
      description: 'A service requiring no documents',
      type: 'ADOPTION_RECOMMENDATION',
      required_documents: [],
      is_active: true
    };

    const insertResult = await db.insert(servicesTable)
      .values(serviceWithNoDocuments)
      .returning()
      .execute();
    
    const createdService = insertResult[0];

    const result = await getServiceById(createdService.id);

    expect(result).not.toBeNull();
    expect(result!.required_documents).toEqual([]);
    expect(Array.isArray(result!.required_documents)).toBe(true);
  });
});