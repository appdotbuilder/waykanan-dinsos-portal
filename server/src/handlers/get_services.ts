import { db } from '../db';
import { servicesTable } from '../db/schema';
import { type Service } from '../schema';
import { eq } from 'drizzle-orm';

export const getServices = async (): Promise<Service[]> => {
  try {
    // Query only active services, ordered by name
    const results = await db.select()
      .from(servicesTable)
      .where(eq(servicesTable.is_active, true))
      .orderBy(servicesTable.name)
      .execute();

    // Map database results to Service schema format
    return results.map(service => ({
      id: service.id,
      name: service.name,
      description: service.description,
      type: service.type,
      required_documents: service.required_documents as Service['required_documents'], // Cast JSON to proper type
      is_active: service.is_active,
      created_at: service.created_at
    }));
  } catch (error) {
    console.error('Failed to get services:', error);
    throw error;
  }
};