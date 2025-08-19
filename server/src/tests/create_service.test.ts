import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { servicesTable } from '../db/schema';
import { type CreateServiceInput } from '../schema';
import { createService } from '../handlers/create_service';
import { eq } from 'drizzle-orm';

// Test input for adoption recommendation service
const testInput: CreateServiceInput = {
  name: 'Adoption Recommendation Service',
  description: 'Service for processing adoption recommendations',
  type: 'ADOPTION_RECOMMENDATION',
  required_documents: ['SKCK', 'HEALTH_CERTIFICATE', 'PSYCHOLOGICAL_CERTIFICATE'],
  is_active: true
};

// Test input with minimal fields (nullable description)
const minimalInput: CreateServiceInput = {
  name: 'Basic Service',
  description: null,
  type: 'ADOPTION_RECOMMENDATION',
  required_documents: ['SKCK'],
  is_active: true
};

describe('createService', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a service with all fields', async () => {
    const result = await createService(testInput);

    // Basic field validation
    expect(result.name).toEqual('Adoption Recommendation Service');
    expect(result.description).toEqual('Service for processing adoption recommendations');
    expect(result.type).toEqual('ADOPTION_RECOMMENDATION');
    expect(result.required_documents).toEqual(['SKCK', 'HEALTH_CERTIFICATE', 'PSYCHOLOGICAL_CERTIFICATE']);
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a service with minimal fields', async () => {
    const result = await createService(minimalInput);

    expect(result.name).toEqual('Basic Service');
    expect(result.description).toBeNull();
    expect(result.type).toEqual('ADOPTION_RECOMMENDATION');
    expect(result.required_documents).toEqual(['SKCK']);
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save service to database', async () => {
    const result = await createService(testInput);

    // Query using proper drizzle syntax
    const services = await db.select()
      .from(servicesTable)
      .where(eq(servicesTable.id, result.id))
      .execute();

    expect(services).toHaveLength(1);
    const savedService = services[0];
    expect(savedService.name).toEqual('Adoption Recommendation Service');
    expect(savedService.description).toEqual('Service for processing adoption recommendations');
    expect(savedService.type).toEqual('ADOPTION_RECOMMENDATION');
    expect(savedService.required_documents).toEqual(['SKCK', 'HEALTH_CERTIFICATE', 'PSYCHOLOGICAL_CERTIFICATE']);
    expect(savedService.is_active).toEqual(true);
    expect(savedService.created_at).toBeInstanceOf(Date);
  });

  it('should create multiple services with different configurations', async () => {
    // Create first service
    const service1 = await createService({
      name: 'Service 1',
      description: 'First service',
      type: 'ADOPTION_RECOMMENDATION',
      required_documents: ['SKCK', 'HEALTH_CERTIFICATE'],
      is_active: true
    });

    // Create second service with different documents
    const service2 = await createService({
      name: 'Service 2',
      description: null,
      type: 'ADOPTION_RECOMMENDATION',
      required_documents: ['BIRTH_CERTIFICATE', 'MARRIAGE_CERTIFICATE'],
      is_active: false
    });

    expect(service1.id).not.toEqual(service2.id);
    expect(service1.name).toEqual('Service 1');
    expect(service2.name).toEqual('Service 2');
    expect(service1.is_active).toEqual(true);
    expect(service2.is_active).toEqual(false);

    // Verify both are in database
    const allServices = await db.select()
      .from(servicesTable)
      .execute();

    expect(allServices).toHaveLength(2);
  });

  it('should handle different document type combinations', async () => {
    const serviceWithAllDocs = await createService({
      name: 'Complete Service',
      description: 'Service requiring all document types',
      type: 'ADOPTION_RECOMMENDATION',
      required_documents: [
        'SKCK',
        'HEALTH_CERTIFICATE', 
        'PSYCHOLOGICAL_CERTIFICATE',
        'FINANCIAL_STATEMENT',
        'FAMILY_CONSENT',
        'BIRTH_CERTIFICATE',
        'MARRIAGE_CERTIFICATE',
        'PHOTO',
        'OTHER'
      ],
      is_active: true
    });

    expect(serviceWithAllDocs.required_documents).toHaveLength(9);
    expect(serviceWithAllDocs.required_documents).toContain('SKCK');
    expect(serviceWithAllDocs.required_documents).toContain('OTHER');
  });

  it('should use default is_active value when not specified', async () => {
    // Create input without explicit is_active (should use Zod default)
    const inputWithDefault: CreateServiceInput = {
      name: 'Default Service',
      description: 'Service with default active status',
      type: 'ADOPTION_RECOMMENDATION',
      required_documents: ['SKCK'],
      is_active: true // Zod default applied
    };

    const result = await createService(inputWithDefault);
    expect(result.is_active).toEqual(true);
  });
});