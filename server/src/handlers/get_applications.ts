import { db } from '../db';
import { applicationsTable } from '../db/schema';
import { type GetApplicationsQuery, type Application } from '../schema';
import { eq, and, type SQL } from 'drizzle-orm';

export async function getApplications(query: GetApplicationsQuery): Promise<Application[]> {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    if (query.status) {
      conditions.push(eq(applicationsTable.status, query.status));
    }

    if (query.applicant_id !== undefined) {
      conditions.push(eq(applicationsTable.applicant_id, query.applicant_id));
    }

    if (query.service_id !== undefined) {
      conditions.push(eq(applicationsTable.service_id, query.service_id));
    }

    // Build and execute query without variable reassignment
    const results = conditions.length > 0
      ? await db.select()
          .from(applicationsTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .limit(query.limit)
          .offset(query.offset)
          .execute()
      : await db.select()
          .from(applicationsTable)
          .limit(query.limit)
          .offset(query.offset)
          .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch applications:', error);
    throw error;
  }
}