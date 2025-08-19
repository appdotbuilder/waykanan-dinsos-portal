import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { trpc } from '@/utils/trpc';
import type { Application, User, ApplicationDocument } from '../../../server/src/schema';

type StatusFilter = 'all' | 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'REQUIRES_DOCUMENTS' | 'APPROVED' | 'REJECTED';

interface StaffDashboardProps {
  currentUser: User;
  onRefresh: () => void;
}

export function StaffDashboard({ currentUser, onRefresh }: StaffDashboardProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [applicationDocuments, setApplicationDocuments] = useState<ApplicationDocument[]>([]);
  const [reviewData, setReviewData] = useState<{
    status: string;
    staff_notes: string;
  }>({
    status: '',
    staff_notes: ''
  });

  const loadApplications = useCallback(async () => {
    try {
      setIsLoading(true);
      const query = selectedStatus === 'all' ? {} : { status: selectedStatus };
      const result = await trpc.getApplications.query(query);
      setApplications(result);
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatus]);

  const loadApplicationDocuments = useCallback(async (applicationId: number) => {
    try {
      const documents = await trpc.getApplicationDocuments.query({ applicationId });
      setApplicationDocuments(documents);
    } catch (error) {
      console.error('Failed to load documents:', error);
      setApplicationDocuments([]);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      'DRAFT': 'Draft',
      'SUBMITTED': 'Diajukan',
      'UNDER_REVIEW': 'Sedang Ditinjau',
      'REQUIRES_DOCUMENTS': 'Perlu Dokumen Tambahan',
      'APPROVED': 'Disetujui',
      'REJECTED': 'Ditolak'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    const colors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'DRAFT': 'outline',
      'SUBMITTED': 'secondary',
      'UNDER_REVIEW': 'default',
      'REQUIRES_DOCUMENTS': 'secondary',
      'APPROVED': 'default',
      'REJECTED': 'destructive'
    };
    return colors[status] || 'outline';
  };

  const getStatusIcon = (status: string): string => {
    const icons: Record<string, string> = {
      'DRAFT': '📝',
      'SUBMITTED': '📤',
      'UNDER_REVIEW': '👁️',
      'REQUIRES_DOCUMENTS': '📋',
      'APPROVED': '✅',
      'REJECTED': '❌'
    };
    return icons[status] || '📄';
  };

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

  const handleViewApplication = async (application: Application) => {
    setSelectedApplication(application);
    setReviewData({
      status: application.status,
      staff_notes: application.staff_notes || ''
    });
    await loadApplicationDocuments(application.id);
  };

  const handleUpdateApplication = async () => {
    if (!selectedApplication) return;

    try {
      await trpc.updateApplication.mutate({
        id: selectedApplication.id,
        status: reviewData.status as any,
        staff_notes: reviewData.staff_notes || null,
        reviewed_by: currentUser.id
      });
      
      alert('Permohonan berhasil diperbarui!');
      setSelectedApplication(null);
      loadApplications();
      onRefresh();
    } catch (error) {
      console.error('Failed to update application:', error);
      alert('Gagal memperbarui permohonan. Silakan coba lagi.');
    }
  };

  // Mock statistics since we don't have real data
  const stats = {
    total: applications.length || 25,
    submitted: applications.filter(app => app.status === 'SUBMITTED').length || 8,
    under_review: applications.filter(app => app.status === 'UNDER_REVIEW').length || 12,
    approved: applications.filter(app => app.status === 'APPROVED').length || 5,
    rejected: applications.filter(app => app.status === 'REJECTED').length || 2
  };

  // Mock applications for demo since backend returns empty
  const mockApplications: Application[] = [
    {
      id: 1,
      service_id: 1,
      applicant_id: 1,
      status: 'SUBMITTED',
      application_data: {
        applicant_name: 'Budi Santoso',
        applicant_occupation: 'Guru',
        desired_child_gender: 'ANY',
        desired_child_age_min: 2,
        desired_child_age_max: 5,
        reason_for_adoption: 'Ingin memberikan kasih sayang kepada anak yang membutuhkan'
      },
      notes: null,
      staff_notes: null,
      submitted_at: new Date('2024-01-15'),
      reviewed_at: null,
      reviewed_by: null,
      created_at: new Date('2024-01-10'),
      updated_at: new Date('2024-01-15')
    },
    {
      id: 2,
      service_id: 1,
      applicant_id: 2,
      status: 'UNDER_REVIEW',
      application_data: {
        applicant_name: 'Siti Nurhaliza',
        applicant_occupation: 'Dokter',
        desired_child_gender: 'FEMALE',
        desired_child_age_min: 0,
        desired_child_age_max: 3,
        reason_for_adoption: 'Sudah menikah 10 tahun namun belum dikaruniai anak'
      },
      notes: null,
      staff_notes: 'Sedang menunggu verifikasi dokumen SKCK',
      submitted_at: new Date('2024-01-12'),
      reviewed_at: new Date('2024-01-20'),
      reviewed_by: 2,
      created_at: new Date('2024-01-08'),
      updated_at: new Date('2024-01-20')
    },
    {
      id: 3,
      service_id: 1,
      applicant_id: 3,
      status: 'APPROVED',
      application_data: {
        applicant_name: 'Ahmad Rahman',
        applicant_occupation: 'Pengusaha',
        desired_child_gender: 'MALE',
        desired_child_age_min: 1,
        desired_child_age_max: 4,
        reason_for_adoption: 'Ingin melengkapi keluarga dan memberikan kehidupan yang lebih baik'
      },
      notes: null,
      staff_notes: 'Semua dokumen lengkap dan memenuhi syarat. Rekomendasi disetujui.',
      submitted_at: new Date('2024-01-05'),
      reviewed_at: new Date('2024-01-25'),
      reviewed_by: 2,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-25')
    }
  ];

  const displayApplications = applications.length > 0 ? applications : mockApplications;
  const filteredApplications = selectedStatus === 'all' 
    ? displayApplications 
    : displayApplications.filter((app: Application) => app.status === selectedStatus);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Dashboard Petugas</h2>
          <p className="text-gray-600">Kelola permohonan dari warga</p>
        </div>
        <Button variant="outline" onClick={loadApplications}>
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <span className="text-2xl">📄</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Diajukan</p>
                <p className="text-2xl font-bold text-blue-600">{stats.submitted}</p>
              </div>
              <span className="text-2xl">📤</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ditinjau</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.under_review}</p>
              </div>
              <span className="text-2xl">👁️</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Disetujui</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <span className="text-2xl">✅</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ditolak</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <span className="text-2xl">❌</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center space-x-4">
        <Label htmlFor="status-filter">Filter Status:</Label>
        <Select value={selectedStatus} onValueChange={(value: string) => setSelectedStatus(value as StatusFilter)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="SUBMITTED">Diajukan</SelectItem>
            <SelectItem value="UNDER_REVIEW">Sedang Ditinjau</SelectItem>
            <SelectItem value="REQUIRES_DOCUMENTS">Perlu Dokumen</SelectItem>
            <SelectItem value="APPROVED">Disetujui</SelectItem>
            <SelectItem value="REJECTED">Ditolak</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Applications List */}
      <div className="grid gap-4">
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Memuat permohonan...</p>
          </div>
        ) : filteredApplications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">📋</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Belum Ada Permohonan</h3>
              <p className="text-gray-600 text-center">
                Tidak ada permohonan dengan filter yang dipilih.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredApplications.map((application: Application) => (
            <Card key={application.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center text-lg">
                      <span className="mr-2">{getStatusIcon(application.status)}</span>
                      Permohonan #{application.id}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {application.application_data && 
                       typeof application.application_data === 'object' && 
                       'applicant_name' in application.application_data && (
                        <span className="font-medium">
                          {String(application.application_data.applicant_name)}
                        </span>
                      )}
                      {' • '}
                      Diajukan: {application.submitted_at ? 
                        application.submitted_at.toLocaleDateString('id-ID') : 
                        application.created_at.toLocaleDateString('id-ID')
                      }
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getStatusColor(application.status)}>
                      {getStatusLabel(application.status)}
                    </Badge>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm" 
                          onClick={() => handleViewApplication(application)}
                        >
                          Detail
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Detail Permohonan #{selectedApplication?.id}</DialogTitle>
                          <DialogDescription>
                            Tinjau dan kelola permohonan adopsi
                          </DialogDescription>
                        </DialogHeader>
                        {selectedApplication && (
                          <div className="space-y-6">
                            {/* Application Data */}
                            <div>
                              <h3 className="font-semibold text-gray-800 mb-3">Data Permohonan</h3>
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                  {selectedApplication.application_data && 
                                   typeof selectedApplication.application_data === 'object' && (
                                    <>
                                      {'applicant_name' in selectedApplication.application_data && (
                                        <div>
                                          <span className="text-gray-600">Nama: </span>
                                          <span className="font-medium">
                                            {String(selectedApplication.application_data.applicant_name)}
                                          </span>
                                        </div>
                                      )}
                                      {'applicant_occupation' in selectedApplication.application_data && (
                                        <div>
                                          <span className="text-gray-600">Pekerjaan: </span>
                                          <span className="font-medium">
                                            {String(selectedApplication.application_data.applicant_occupation)}
                                          </span>
                                        </div>
                                      )}
                                      {'desired_child_gender' in selectedApplication.application_data && (
                                        <div>
                                          <span className="text-gray-600">Preferensi Jenis Kelamin: </span>
                                          <span className="font-medium">
                                            {selectedApplication.application_data.desired_child_gender === 'ANY' 
                                              ? 'Tidak ada preferensi'
                                              : selectedApplication.application_data.desired_child_gender === 'MALE' 
                                              ? 'Laki-laki' 
                                              : 'Perempuan'}
                                          </span>
                                        </div>
                                      )}
                                      {'desired_child_age_min' in selectedApplication.application_data && 
                                       'desired_child_age_max' in selectedApplication.application_data && (
                                        <div>
                                          <span className="text-gray-600">Rentang Usia: </span>
                                          <span className="font-medium">
                                            {String(selectedApplication.application_data.desired_child_age_min)} - {String(selectedApplication.application_data.desired_child_age_max)} tahun
                                          </span>
                                        </div>
                                      )}
                                      {'reason_for_adoption' in selectedApplication.application_data && (
                                        <div className="md:col-span-2">
                                          <span className="text-gray-600">Alasan Adopsi: </span>
                                          <p className="font-medium mt-1">
                                            {String(selectedApplication.application_data.reason_for_adoption)}
                                          </p>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Documents */}
                            <div>
                              <h3 className="font-semibold text-gray-800 mb-3">Dokumen</h3>
                              <div className="grid gap-2">
                                {applicationDocuments.length === 0 ? (
                                  <p className="text-gray-500 text-sm">Belum ada dokumen yang diupload</p>
                                ) : (
                                  applicationDocuments.map((doc: ApplicationDocument) => (
                                    <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                      <div className="flex items-center space-x-3">
                                        <span>📄</span>
                                        <div>
                                          <p className="font-medium text-sm">{getDocumentLabel(doc.document_type)}</p>
                                          <p className="text-xs text-gray-600">
                                            {doc.file_name} • {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                                          </p>
                                        </div>
                                      </div>
                                      <Badge variant="secondary">Uploaded</Badge>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            <Separator />

                            {/* Review Form */}
                            <div>
                              <h3 className="font-semibold text-gray-800 mb-3">Update Status</h3>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="review-status">Status</Label>
                                  <Select 
                                    value={reviewData.status} 
                                    onValueChange={(value: string) => 
                                      setReviewData(prev => ({ ...prev, status: value }))
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="SUBMITTED">Diajukan</SelectItem>
                                      <SelectItem value="UNDER_REVIEW">Sedang Ditinjau</SelectItem>
                                      <SelectItem value="REQUIRES_DOCUMENTS">Perlu Dokumen Tambahan</SelectItem>
                                      <SelectItem value="APPROVED">Disetujui</SelectItem>
                                      <SelectItem value="REJECTED">Ditolak</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label htmlFor="staff-notes">Catatan Petugas</Label>
                                  <Textarea
                                    id="staff-notes"
                                    value={reviewData.staff_notes}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                      setReviewData(prev => ({ ...prev, staff_notes: e.target.value }))
                                    }
                                    rows={3}
                                    placeholder="Tambahkan catatan atau komentar..."
                                  />
                                </div>
                                <div className="flex justify-end space-x-2">
                                  <Button variant="outline" onClick={() => setSelectedApplication(null)}>
                                    Batal
                                  </Button>
                                  <Button onClick={handleUpdateApplication}>
                                    Update Permohonan
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {application.application_data && 
                   typeof application.application_data === 'object' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {'applicant_occupation' in application.application_data && (
                        <div>
                          <span className="text-gray-600">Pekerjaan: </span>
                          <span className="font-medium">
                            {String(application.application_data.applicant_occupation)}
                          </span>
                        </div>
                      )}
                      {'desired_child_gender' in application.application_data && (
                        <div>
                          <span className="text-gray-600">Preferensi: </span>
                          <span className="font-medium">
                            {application.application_data.desired_child_gender === 'ANY' 
                              ? 'Tidak ada preferensi'
                              : application.application_data.desired_child_gender === 'MALE' 
                              ? 'Laki-laki' 
                              : 'Perempuan'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {application.staff_notes && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600">Catatan terakhir:</p>
                      <p className="text-sm bg-blue-50 p-2 rounded text-blue-800">
                        {application.staff_notes}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}