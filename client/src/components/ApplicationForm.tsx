import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DocumentUpload } from '@/components/DocumentUpload';
import { trpc } from '@/utils/trpc';
import type { Service, User, AdoptionApplicationData } from '../../../server/src/schema';

interface ApplicationFormProps {
  service: Service;
  applicant: User;
  onSubmitted: () => void;
  onCancel: () => void;
}

export function ApplicationForm({ service, applicant, onSubmitted, onCancel }: ApplicationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicationId, setApplicationId] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState<'form' | 'documents'>('form');
  const [formData, setFormData] = useState<AdoptionApplicationData>({
    // Personal Information
    applicant_name: applicant.full_name,
    applicant_id_number: '',
    applicant_birth_place: '',
    applicant_birth_date: '',
    applicant_address: '',
    applicant_occupation: '',
    applicant_monthly_income: 0,
    
    // Spouse Information
    spouse_name: null,
    spouse_id_number: null,
    spouse_birth_place: null,
    spouse_birth_date: null,
    spouse_occupation: null,
    spouse_monthly_income: null,
    
    // Marriage Information
    marriage_date: null,
    marriage_duration_years: null,
    
    // Child Information
    desired_child_gender: 'ANY',
    desired_child_age_min: 0,
    desired_child_age_max: 5,
    reason_for_adoption: '',
    
    // Family Information
    existing_children_count: 0,
    family_members_count: 1,
    housing_ownership: 'OWNED',
    housing_condition: 'GOOD',
    
    // Additional Information
    previous_adoption_experience: false,
    support_from_extended_family: false,
    childcare_plan: ''
  });

  const handleInputChange = (field: keyof AdoptionApplicationData, value: any) => {
    setFormData((prev: AdoptionApplicationData) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const application = await trpc.createApplication.mutate({
        service_id: service.id,
        applicant_id: applicant.id,
        application_data: formData,
        notes: null
      });
      
      setApplicationId(application.id);
      setCurrentStep('documents');
    } catch (error) {
      console.error('Failed to create application:', error);
      alert('Gagal menyimpan permohonan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDocumentsCompleted = () => {
    onSubmitted();
  };

  if (currentStep === 'documents' && applicationId) {
    return (
      <DocumentUpload
        applicationId={applicationId}
        requiredDocuments={service.required_documents}
        onCompleted={handleDocumentsCompleted}
        onCancel={onCancel}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Formulir Permohonan</h2>
          <p className="text-gray-600">{service.name}</p>
        </div>
        <Button variant="outline" onClick={onCancel}>
          Kembali
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>📋 Data Permohonan</CardTitle>
          <CardDescription>
            Lengkapi semua informasi yang diperlukan dengan benar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitForm} className="space-y-8">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">👤</span>
                Data Pribadi Pemohon
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="applicant_name">Nama Lengkap</Label>
                  <Input
                    id="applicant_name"
                    value={formData.applicant_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      handleInputChange('applicant_name', e.target.value)
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="applicant_id_number">NIK</Label>
                  <Input
                    id="applicant_id_number"
                    value={formData.applicant_id_number}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      handleInputChange('applicant_id_number', e.target.value)
                    }
                    placeholder="16 digit nomor induk kependudukan"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="applicant_birth_place">Tempat Lahir</Label>
                  <Input
                    id="applicant_birth_place"
                    value={formData.applicant_birth_place}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      handleInputChange('applicant_birth_place', e.target.value)
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="applicant_birth_date">Tanggal Lahir</Label>
                  <Input
                    id="applicant_birth_date"
                    type="date"
                    value={formData.applicant_birth_date}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      handleInputChange('applicant_birth_date', e.target.value)
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="applicant_occupation">Pekerjaan</Label>
                  <Input
                    id="applicant_occupation"
                    value={formData.applicant_occupation}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      handleInputChange('applicant_occupation', e.target.value)
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="applicant_monthly_income">Penghasilan per Bulan (Rp)</Label>
                  <Input
                    id="applicant_monthly_income"
                    type="number"
                    value={formData.applicant_monthly_income}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      handleInputChange('applicant_monthly_income', parseInt(e.target.value) || 0)
                    }
                    min="0"
                    required
                  />
                </div>
              </div>
              <div className="mt-4">
                <Label htmlFor="applicant_address">Alamat Lengkap</Label>
                <Textarea
                  id="applicant_address"
                  value={formData.applicant_address}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                    handleInputChange('applicant_address', e.target.value)
                  }
                  rows={3}
                  required
                />
              </div>
            </div>

            <Separator />

            {/* Spouse Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">💑</span>
                Data Pasangan (jika sudah menikah)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="spouse_name">Nama Lengkap Pasangan</Label>
                  <Input
                    id="spouse_name"
                    value={formData.spouse_name || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      handleInputChange('spouse_name', e.target.value || null)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="spouse_id_number">NIK Pasangan</Label>
                  <Input
                    id="spouse_id_number"
                    value={formData.spouse_id_number || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      handleInputChange('spouse_id_number', e.target.value || null)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="spouse_birth_place">Tempat Lahir Pasangan</Label>
                  <Input
                    id="spouse_birth_place"
                    value={formData.spouse_birth_place || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      handleInputChange('spouse_birth_place', e.target.value || null)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="spouse_birth_date">Tanggal Lahir Pasangan</Label>
                  <Input
                    id="spouse_birth_date"
                    type="date"
                    value={formData.spouse_birth_date || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      handleInputChange('spouse_birth_date', e.target.value || null)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="spouse_occupation">Pekerjaan Pasangan</Label>
                  <Input
                    id="spouse_occupation"
                    value={formData.spouse_occupation || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      handleInputChange('spouse_occupation', e.target.value || null)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="spouse_monthly_income">Penghasilan Pasangan per Bulan (Rp)</Label>
                  <Input
                    id="spouse_monthly_income"
                    type="number"
                    value={formData.spouse_monthly_income || 0}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      handleInputChange('spouse_monthly_income', parseInt(e.target.value) || null)
                    }
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="marriage_date">Tanggal Pernikahan</Label>
                  <Input
                    id="marriage_date"
                    type="date"
                    value={formData.marriage_date || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      handleInputChange('marriage_date', e.target.value || null)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="marriage_duration_years">Lama Pernikahan (tahun)</Label>
                  <Input
                    id="marriage_duration_years"
                    type="number"
                    value={formData.marriage_duration_years || 0}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      handleInputChange('marriage_duration_years', parseInt(e.target.value) || null)
                    }
                    min="0"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Child Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">👶</span>
                Kriteria Anak yang Diinginkan
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="desired_child_gender">Jenis Kelamin</Label>
                  <Select 
                    value={formData.desired_child_gender} 
                    onValueChange={(value: 'MALE' | 'FEMALE' | 'ANY') => 
                      handleInputChange('desired_child_gender', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ANY">Tidak ada preferensi</SelectItem>
                      <SelectItem value="MALE">Laki-laki</SelectItem>
                      <SelectItem value="FEMALE">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="desired_child_age_min">Usia Minimum (tahun)</Label>
                  <Input
                    id="desired_child_age_min"
                    type="number"
                    value={formData.desired_child_age_min}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      handleInputChange('desired_child_age_min', parseInt(e.target.value) || 0)
                    }
                    min="0"
                    max="17"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="desired_child_age_max">Usia Maximum (tahun)</Label>
                  <Input
                    id="desired_child_age_max"
                    type="number"
                    value={formData.desired_child_age_max}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      handleInputChange('desired_child_age_max', parseInt(e.target.value) || 5)
                    }
                    min="0"
                    max="17"
                    required
                  />
                </div>
              </div>
              <div className="mt-4">
                <Label htmlFor="reason_for_adoption">Alasan Ingin Mengangkat Anak</Label>
                <Textarea
                  id="reason_for_adoption"
                  value={formData.reason_for_adoption}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                    handleInputChange('reason_for_adoption', e.target.value)
                  }
                  rows={4}
                  placeholder="Jelaskan alasan Anda ingin mengangkat anak..."
                  required
                />
              </div>
            </div>

            <Separator />

            {/* Family Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">🏠</span>
                Informasi Keluarga dan Tempat Tinggal
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="existing_children_count">Jumlah Anak Kandung</Label>
                  <Input
                    id="existing_children_count"
                    type="number"
                    value={formData.existing_children_count}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      handleInputChange('existing_children_count', parseInt(e.target.value) || 0)
                    }
                    min="0"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="family_members_count">Jumlah Anggota Keluarga</Label>
                  <Input
                    id="family_members_count"
                    type="number"
                    value={formData.family_members_count}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      handleInputChange('family_members_count', parseInt(e.target.value) || 1)
                    }
                    min="1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="housing_ownership">Status Kepemilikan Rumah</Label>
                  <Select 
                    value={formData.housing_ownership} 
                    onValueChange={(value: 'OWNED' | 'RENTED' | 'FAMILY_OWNED') => 
                      handleInputChange('housing_ownership', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OWNED">Milik Sendiri</SelectItem>
                      <SelectItem value="RENTED">Sewa/Kontrak</SelectItem>
                      <SelectItem value="FAMILY_OWNED">Milik Keluarga</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="housing_condition">Kondisi Tempat Tinggal</Label>
                  <Select 
                    value={formData.housing_condition} 
                    onValueChange={(value: 'EXCELLENT' | 'GOOD' | 'ADEQUATE' | 'POOR') => 
                      handleInputChange('housing_condition', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EXCELLENT">Sangat Baik</SelectItem>
                      <SelectItem value="GOOD">Baik</SelectItem>
                      <SelectItem value="ADEQUATE">Cukup</SelectItem>
                      <SelectItem value="POOR">Kurang</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Additional Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">📝</span>
                Informasi Tambahan
              </h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="previous_adoption_experience"
                    checked={formData.previous_adoption_experience}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      handleInputChange('previous_adoption_experience', e.target.checked)
                    }
                    className="rounded"
                  />
                  <Label htmlFor="previous_adoption_experience">
                    Pernah memiliki pengalaman adopsi sebelumnya
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="support_from_extended_family"
                    checked={formData.support_from_extended_family}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      handleInputChange('support_from_extended_family', e.target.checked)
                    }
                    className="rounded"
                  />
                  <Label htmlFor="support_from_extended_family">
                    Mendapat dukungan dari keluarga besar
                  </Label>
                </div>
                <div>
                  <Label htmlFor="childcare_plan">Rencana Perawatan dan Pendidikan Anak</Label>
                  <Textarea
                    id="childcare_plan"
                    value={formData.childcare_plan}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                      handleInputChange('childcare_plan', e.target.value)
                    }
                    rows={4}
                    placeholder="Jelaskan rencana Anda dalam merawat dan mendidik anak..."
                    required
                  />
                </div>
              </div>
            </div>

            <Alert>
              <AlertDescription>
                <strong>Perhatian:</strong> Setelah menyimpan formulir ini, Anda akan diminta untuk 
                mengunggah dokumen-dokumen yang diperlukan. Pastikan semua data sudah benar sebelum melanjutkan.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Menyimpan...' : 'Simpan & Lanjut ke Upload Dokumen'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}