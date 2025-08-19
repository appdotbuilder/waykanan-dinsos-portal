import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import type { ApplicationDocument } from '../../../server/src/schema';

type DocumentType = 'SKCK' | 'HEALTH_CERTIFICATE' | 'PSYCHOLOGICAL_CERTIFICATE' | 'FINANCIAL_STATEMENT' | 'FAMILY_CONSENT' | 'BIRTH_CERTIFICATE' | 'MARRIAGE_CERTIFICATE' | 'PHOTO' | 'OTHER';

interface DocumentUploadProps {
  applicationId: number;
  requiredDocuments: string[];
  onCompleted: () => void;
  onCancel: () => void;
}

export function DocumentUpload({ applicationId, requiredDocuments, onCompleted, onCancel }: DocumentUploadProps) {
  const [uploadedDocuments, setUploadedDocuments] = useState<ApplicationDocument[]>([]);
  const [isUploading, setIsUploading] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadDocuments = useCallback(async () => {
    try {
      const documents = await trpc.getApplicationDocuments.query({ applicationId });
      setUploadedDocuments(documents);
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  }, [applicationId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const getDocumentLabel = (docType: string): string => {
    const labels: Record<string, string> = {
      'SKCK': 'SKCK (Surat Keterangan Catatan Kepolisian)',
      'HEALTH_CERTIFICATE': 'Surat Keterangan Sehat',
      'PSYCHOLOGICAL_CERTIFICATE': 'Surat Keterangan Psikologis',
      'FINANCIAL_STATEMENT': 'Keterangan Penghasilan',
      'FAMILY_CONSENT': 'Persetujuan Keluarga',
      'BIRTH_CERTIFICATE': 'Akta Kelahiran',
      'MARRIAGE_CERTIFICATE': 'Akta Nikah',
      'PHOTO': 'Foto',
      'OTHER': 'Dokumen Lainnya'
    };
    return labels[docType] || docType;
  };

  const isDocumentUploaded = (docType: DocumentType): boolean => {
    return uploadedDocuments.some((doc: ApplicationDocument) => doc.document_type === docType);
  };

  const handleFileUpload = async (docType: DocumentType, file: File) => {
    setIsUploading((prev: Record<string, boolean>) => ({ ...prev, [docType]: true }));
    
    try {
      // In a real implementation, you would upload the file to a file storage service
      // and get the file path/URL. For now, we'll simulate this
      const mockFilePath = `/uploads/application_${applicationId}/${Date.now()}_${file.name}`;
      
      await trpc.uploadDocument.mutate({
        application_id: applicationId,
        document_type: docType,
        file_name: file.name,
        file_path: mockFilePath,
        file_size: file.size,
        mime_type: file.type
      });
      
      // Reload documents to show the uploaded file
      await loadDocuments();
    } catch (error) {
      console.error('Failed to upload document:', error);
      alert('Gagal mengunggah dokumen. Silakan coba lagi.');
    } finally {
      setIsUploading((prev: Record<string, boolean>) => ({ ...prev, [docType]: false }));
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    try {
      await trpc.deleteDocument.mutate({ documentId });
      await loadDocuments();
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert('Gagal menghapus dokumen. Silakan coba lagi.');
    }
  };

  const handleSubmitApplication = async () => {
    setIsSubmitting(true);
    try {
      await trpc.submitApplication.mutate({ applicationId });
      alert('Permohonan berhasil diajukan! Tim kami akan meninjau permohonan Anda.');
      onCompleted();
    } catch (error) {
      console.error('Failed to submit application:', error);
      alert('Gagal mengajukan permohonan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const allDocumentsUploaded = requiredDocuments.every((docType: string) => isDocumentUploaded(docType as DocumentType));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Upload Dokumen</h2>
          <p className="text-gray-600">Unggah semua dokumen yang diperlukan</p>
        </div>
        <Button variant="outline" onClick={onCancel}>
          Kembali
        </Button>
      </div>

      <Alert>
        <AlertDescription>
          <strong>Petunjuk:</strong> Pastikan semua dokumen dalam format PDF, JPG, atau PNG dengan ukuran maksimal 5MB per file.
          Dokumen harus jelas dan dapat dibaca dengan baik.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4">
        {requiredDocuments.map((docType: string) => {
          const isUploaded = isDocumentUploaded(docType as DocumentType);
          const uploadedDoc = uploadedDocuments.find((doc: ApplicationDocument) => doc.document_type === docType as DocumentType);
          const isCurrentlyUploading = isUploading[docType] || false;

          return (
            <Card key={docType}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {getDocumentLabel(docType)}
                  </CardTitle>
                  <Badge variant={isUploaded ? "default" : "secondary"}>
                    {isUploaded ? "✓ Sudah Upload" : "Belum Upload"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {isUploaded && uploadedDoc ? (
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-md">
                    <div className="flex items-center space-x-3">
                      <span className="text-green-600">📄</span>
                      <div>
                        <p className="font-medium text-green-800">{uploadedDoc.file_name}</p>
                        <p className="text-sm text-green-600">
                          {(uploadedDoc.file_size / 1024 / 1024).toFixed(2)} MB • 
                          Uploaded: {uploadedDoc.uploaded_at.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteDocument(uploadedDoc.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Hapus
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Check file size (5MB max)
                            if (file.size > 5 * 1024 * 1024) {
                              alert('Ukuran file terlalu besar. Maksimal 5MB.');
                              return;
                            }
                            handleFileUpload(docType as DocumentType, file);
                          }
                        }}
                        disabled={isCurrentlyUploading}
                      />
                      {isCurrentlyUploading && (
                        <Badge variant="secondary">Mengupload...</Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Format yang diterima: PDF, JPG, PNG (Maksimal 5MB)
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Separator />

      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
        <div>
          <h3 className="font-semibold text-blue-800">Status Upload</h3>
          <p className="text-sm text-blue-600">
            {uploadedDocuments.length} dari {requiredDocuments.length} dokumen telah diupload
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">
            {Math.round((uploadedDocuments.length / requiredDocuments.length) * 100)}%
          </div>
          <p className="text-xs text-blue-500">Selesai</p>
        </div>
      </div>

      {allDocumentsUploaded && (
        <Alert>
          <AlertDescription>
            <strong>Siap untuk diajukan!</strong> Semua dokumen telah berhasil diupload. 
            Anda dapat mengajukan permohonan sekarang.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={onCancel}>
          Simpan Draft
        </Button>
        <Button 
          onClick={handleSubmitApplication}
          disabled={!allDocumentsUploaded || isSubmitting}
        >
          {isSubmitting ? 'Mengajukan...' : 'Ajukan Permohonan'}
        </Button>
      </div>
    </div>
  );
}