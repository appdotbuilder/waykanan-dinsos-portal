import { db } from '../db';
import { servicesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Service } from '../schema';

export const getServiceById = async (id: number): Promise<Service | null> => {
  try {
    const results = await db.select()
      .from(servicesTable)
      .where(eq(servicesTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const service = results[0];
    return {
      ...service,
      required_documents: service.required_documents as any
    };
  } catch (error) {
    console.error('Get service by ID failed:', error);
    throw error;
  }
};