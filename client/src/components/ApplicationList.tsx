import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { Application, User } from '../../../server/src/schema';

interface ApplicationListProps {
  applications: Application[];
  currentUser: User;
  isLoading: boolean;
  onRefresh: () => void;
}

export function ApplicationList({ applications, currentUser, isLoading, onRefresh }: ApplicationListProps) {
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <p className="text-gray-600">Memuat permohonan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Permohonan Saya</h2>
          <p className="text-gray-600">Daftar semua permohonan yang telah Anda ajukan</p>
        </div>
        <Button variant="outline" onClick={onRefresh}>
          Refresh
        </Button>
      </div>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">📝</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Belum Ada Permohonan</h3>
            <p className="text-gray-600 text-center mb-4">
              Anda belum memiliki permohonan. Silakan pilih layanan untuk membuat permohonan baru.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {applications.map((application: Application) => (
            <Card key={application.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center text-lg">
                      <span className="mr-2">{getStatusIcon(application.status)}</span>
                      Permohonan #{application.id}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Dibuat: {application.created_at.toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long', 
                        year: 'numeric'
                      })}
                    </CardDescription>
                  </div>
                  <Badge variant={getStatusColor(application.status)}>
                    {getStatusLabel(application.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Service Information */}
                  <div>
                    <p className="text-sm text-gray-600">Layanan:</p>
                    <p className="font-medium">Rekomendasi Pengangkatan Anak (Adopsi)</p>
                  </div>

                  {/* Application Data Summary */}
                  {application.application_data && typeof application.application_data === 'object' && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Detail Permohonan:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        {'applicant_name' in application.application_data && (
                          <div>
                            <span className="text-gray-600">Nama: </span>
                            <span className="font-medium">{String(application.application_data.applicant_name)}</span>
                          </div>
                        )}
                        {'desired_child_gender' in application.application_data && (
                          <div>
                            <span className="text-gray-600">Preferensi Jenis Kelamin: </span>
                            <span className="font-medium">
                              {application.application_data.desired_child_gender === 'ANY' 
                                ? 'Tidak ada preferensi'
                                : application.application_data.desired_child_gender === 'MALE' 
                                ? 'Laki-laki' 
                                : 'Perempuan'}
                            </span>
                          </div>
                        )}
                        {'desired_child_age_min' in application.application_data && 
                         'desired_child_age_max' in application.application_data && (
                          <div>
                            <span className="text-gray-600">Rentang Usia: </span>
                            <span className="font-medium">
                              {String(application.application_data.desired_child_age_min)} - {String(application.application_data.desired_child_age_max)} tahun
                            </span>
                          </div>
                        )}
                        {'applicant_occupation' in application.application_data && (
                          <div>
                            <span className="text-gray-600">Pekerjaan: </span>
                            <span className="font-medium">{String(application.application_data.applicant_occupation)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Timeline */}
                  <Separator />
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Riwayat:</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Dibuat</span>
                        <span className="text-gray-600">
                          {application.created_at.toLocaleDateString('id-ID')}
                        </span>
                      </div>
                      {application.submitted_at && (
                        <div className="flex justify-between">
                          <span>Diajukan</span>
                          <span className="text-gray-600">
                            {application.submitted_at.toLocaleDateString('id-ID')}
                          </span>
                        </div>
                      )}
                      {application.reviewed_at && (
                        <div className="flex justify-between">
                          <span>Ditinjau</span>
                          <span className="text-gray-600">
                            {application.reviewed_at.toLocaleDateString('id-ID')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  {application.notes && (
                    <div>
                      <p className="text-sm text-gray-600">Catatan Anda:</p>
                      <p className="text-sm bg-gray-50 p-2 rounded">{application.notes}</p>
                    </div>
                  )}

                  {application.staff_notes && (
                    <div>
                      <p className="text-sm text-gray-600">Catatan Petugas:</p>
                      <p className="text-sm bg-blue-50 p-2 rounded text-blue-800">{application.staff_notes}</p>
                    </div>
                  )}

                  {/* Action Messages */}
                  {application.status === 'REQUIRES_DOCUMENTS' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                      <p className="text-yellow-800 text-sm">
                        <strong>Perlu Tindakan:</strong> Silakan lengkapi dokumen yang diperlukan sesuai catatan petugas.
                      </p>
                    </div>
                  )}

                  {application.status === 'APPROVED' && (
                    <div className="bg-green-50 border border-green-200 rounded p-3">
                      <p className="text-green-800 text-sm">
                        <strong>Selamat!</strong> Permohonan Anda telah disetujui. Silakan kunjungi kantor untuk proses selanjutnya.
                      </p>
                    </div>
                  )}

                  {application.status === 'REJECTED' && (
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <p className="text-red-800 text-sm">
                        <strong>Permohonan Ditolak:</strong> Silakan periksa catatan petugas untuk informasi lebih lanjut.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}