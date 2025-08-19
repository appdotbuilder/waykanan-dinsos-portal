import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, servicesTable, applicationsTable, applicationDocumentsTable } from '../db/schema';
import { getApplicationDocuments } from '../handlers/get_application_documents';

describe('getApplicationDocuments', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const createTestUser = async () => {
    const result = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        full_name: 'Test User',
        phone: '+1234567890',
        role: 'CITIZEN'
      })
      .returning()
      .execute();
    return result[0];
  };

  const createTestService = async () => {
    const result = await db.insert(servicesTable)
      .values({
        name: 'Adoption Recommendation',
        description: 'Service for adoption recommendation',
        type: 'ADOPTION_RECOMMENDATION',
        required_documents: ['SKCK', 'HEALTH_CERTIFICATE'],
        is_active: true
      })
      .returning()
      .execute();
    return result[0];
  };

  const createTestApplication = async (userId: number, serviceId: number) => {
    const result = await db.insert(applicationsTable)
      .values({
        service_id: serviceId,
        applicant_id: userId,
        status: 'DRAFT',
        application_data: { test: 'data' },
        notes: 'Test application'
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should return empty array for application with no documents', async () => {
    const user = await createTestUser();
    const service = await createTestService();
    const application = await createTestApplication(user.id, service.id);

    const result = await getApplicationDocuments(application.id);

    expect(result).toEqual([]);
  });

  it('should return single document for application', async () => {
    const user = await createTestUser();
    const service = await createTestService();
    const application = await createTestApplication(user.id, service.id);

    // Upload a document
    const documentData = {
      application_id: application.id,
      document_type: 'SKCK' as const,
      file_name: 'skck_document.pdf',
      file_path: '/uploads/documents/skck_document.pdf',
      file_size: 1024000,
      mime_type: 'application/pdf'
    };

    await db.insert(applicationDocumentsTable)
      .values(documentData)
      .execute();

    const result = await getApplicationDocuments(application.id);

    expect(result).toHaveLength(1);
    expect(result[0].application_id).toEqual(application.id);
    expect(result[0].document_type).toEqual('SKCK');
    expect(result[0].file_name).toEqual('skck_document.pdf');
    expect(result[0].file_path).toEqual('/uploads/documents/skck_document.pdf');
    expect(result[0].file_size).toEqual(1024000);
    expect(result[0].mime_type).toEqual('application/pdf');
    expect(result[0].id).toBeDefined();
    expect(result[0].uploaded_at).toBeInstanceOf(Date);
  });

  it('should return multiple documents for application', async () => {
    const user = await createTestUser();
    const service = await createTestService();
    const application = await createTestApplication(user.id, service.id);

    // Upload multiple documents
    const documents = [
      {
        application_id: application.id,
        document_type: 'SKCK' as const,
        file_name: 'skck_document.pdf',
        file_path: '/uploads/documents/skck_document.pdf',
        file_size: 1024000,
        mime_type: 'application/pdf'
      },
      {
        application_id: application.id,
        document_type: 'HEALTH_CERTIFICATE' as const,
        file_name: 'health_cert.jpg',
        file_path: '/uploads/documents/health_cert.jpg',
        file_size: 512000,
        mime_type: 'image/jpeg'
      },
      {
        application_id: application.id,
        document_type: 'PHOTO' as const,
        file_name: 'family_photo.png',
        file_path: '/uploads/documents/family_photo.png',
        file_size: 2048000,
        mime_type: 'image/png'
      }
    ];

    await db.insert(applicationDocumentsTable)
      .values(documents)
      .execute();

    const result = await getApplicationDocuments(application.id);

    expect(result).toHaveLength(3);
    
    // Verify all documents belong to the correct application
    result.forEach(doc => {
      expect(doc.application_id).toEqual(application.id);
      expect(doc.id).toBeDefined();
      expect(doc.uploaded_at).toBeInstanceOf(Date);
    });

    // Check specific documents exist
    const skckDoc = result.find(doc => doc.document_type === 'SKCK');
    const healthDoc = result.find(doc => doc.document_type === 'HEALTH_CERTIFICATE');
    const photoDoc = result.find(doc => doc.document_type === 'PHOTO');

    expect(skckDoc).toBeDefined();
    expect(skckDoc?.file_name).toEqual('skck_document.pdf');
    expect(skckDoc?.mime_type).toEqual('application/pdf');

    expect(healthDoc).toBeDefined();
    expect(healthDoc?.file_name).toEqual('health_cert.jpg');
    expect(healthDoc?.mime_type).toEqual('image/jpeg');

    expect(photoDoc).toBeDefined();
    expect(photoDoc?.file_name).toEqual('family_photo.png');
    expect(photoDoc?.mime_type).toEqual('image/png');
  });

  it('should only return documents for the specified application', async () => {
    const user = await createTestUser();
    const service = await createTestService();
    
    // Create two applications
    const application1 = await createTestApplication(user.id, service.id);
    const application2 = await createTestApplication(user.id, service.id);

    // Upload documents to both applications
    await db.insert(applicationDocumentsTable)
      .values([
        {
          application_id: application1.id,
          document_type: 'SKCK' as const,
          file_name: 'app1_skck.pdf',
          file_path: '/uploads/documents/app1_skck.pdf',
          file_size: 1024000,
          mime_type: 'application/pdf'
        },
        {
          application_id: application2.id,
          document_type: 'HEALTH_CERTIFICATE' as const,
          file_name: 'app2_health.pdf',
          file_path: '/uploads/documents/app2_health.pdf',
          file_size: 512000,
          mime_type: 'application/pdf'
        }
      ])
      .execute();

    // Get documents for application1
    const result1 = await getApplicationDocuments(application1.id);
    expect(result1).toHaveLength(1);
    expect(result1[0].application_id).toEqual(application1.id);
    expect(result1[0].file_name).toEqual('app1_skck.pdf');

    // Get documents for application2
    const result2 = await getApplicationDocuments(application2.id);
    expect(result2).toHaveLength(1);
    expect(result2[0].application_id).toEqual(application2.id);
    expect(result2[0].file_name).toEqual('app2_health.pdf');
  });

  it('should return empty array for non-existent application', async () => {
    const result = await getApplicationDocuments(99999);

    expect(result).toEqual([]);
  });

  it('should handle all document types correctly', async () => {
    const user = await createTestUser();
    const service = await createTestService();
    const application = await createTestApplication(user.id, service.id);

    // Upload documents of different types
    const documentTypes = [
      'SKCK',
      'HEALTH_CERTIFICATE',
      'PSYCHOLOGICAL_CERTIFICATE',
      'FINANCIAL_STATEMENT',
      'FAMILY_CONSENT',
      'BIRTH_CERTIFICATE',
      'MARRIAGE_CERTIFICATE',
      'PHOTO',
      'OTHER'
    ] as const;

    const documents = documentTypes.map((type, index) => ({
      application_id: application.id,
      document_type: type,
      file_name: `${type.toLowerCase()}_${index}.pdf`,
      file_path: `/uploads/documents/${type.toLowerCase()}_${index}.pdf`,
      file_size: 1024000 + index * 100,
      mime_type: 'application/pdf'
    }));

    await db.insert(applicationDocumentsTable)
      .values(documents)
      .execute();

    const result = await getApplicationDocuments(application.id);

    expect(result).toHaveLength(documentTypes.length);
    
    // Verify all document types are present
    documentTypes.forEach(type => {
      const doc = result.find(d => d.document_type === type);
      expect(doc).toBeDefined();
      expect(doc?.application_id).toEqual(application.id);
    });
  });
});