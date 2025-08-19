import { db } from '../db';
import { servicesTable } from '../db/schema';
import { type CreateServiceInput, type Service } from '../schema';

export const createService = async (input: CreateServiceInput): Promise<Service> => {
  try {
    // Insert service record
    const result = await db.insert(servicesTable)
      .values({
        name: input.name,
        description: input.description,
        type: input.type,
        required_documents: input.required_documents,
        is_active: input.is_active
      })
      .returning()
      .execute();

    const service = result[0];
    return {
      ...service,
      required_documents: service.required_documents as any // Type assertion for JSON array
    };
  } catch (error) {
    console.error('Service creation failed:', error);
    throw error;
  }
};