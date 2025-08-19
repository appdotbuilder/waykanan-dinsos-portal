import { type UpdateApplicationInput, type Application } from '../schema';

export async function updateApplication(input: UpdateApplicationInput): Promise<Application | null> {
  // This is a placeholder declaration! Real code should be implemented here.
  // The goal of this handler is updating an existing application.
  // Citizens can update their draft applications, staff can update status and add staff notes.
  // When status changes to SUBMITTED, submitted_at should be set.
  // When staff reviews, reviewed_at and reviewed_by should be set.
  return Promise.resolve(null);
}