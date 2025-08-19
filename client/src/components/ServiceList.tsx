import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import type { Service } from '../../../server/src/schema';

interface ServiceListProps {
  onServiceSelect: (service: Service) => void;
}

export function ServiceList({ onServiceSelect }: ServiceListProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadServices = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getServices.query();
      setServices(result);
    } catch (error) {
      console.error('Failed to load services:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  // Mock data since backend returns empty array
  const mockServices: Service[] = [
    {
      id: 1,
      name: 'Rekomendasi Pengangkatan Anak (Adopsi)',
      description: 'Layanan untuk mendapatkan rekomendasi pengangkatan anak dari Dinas Sosial sebagai salah satu syarat proses adopsi melalui pengadilan.',
      type: 'ADOPTION_RECOMMENDATION',
      required_documents: [
        'SKCK',
        'HEALTH_CERTIFICATE', 
        'PSYCHOLOGICAL_CERTIFICATE',
        'FINANCIAL_STATEMENT',
        'FAMILY_CONSENT',
        'BIRTH_CERTIFICATE',
        'MARRIAGE_CERTIFICATE',
        'PHOTO'
      ],
      is_active: true,
      created_at: new Date()
    }
  ];

  const displayServices = services.length > 0 ? services : mockServices;

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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <p className="text-gray-600">Memuat layanan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Layanan Tersedia</h2>
        <p className="text-gray-600">Pilih layanan yang ingin Anda ajukan</p>
      </div>

      {displayServices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">📋</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Belum Ada Layanan</h3>
            <p className="text-gray-600 text-center">Saat ini belum ada layanan yang tersedia.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {displayServices.map((service: Service) => (
            <Card key={service.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl text-gray-800 mb-2">
                      🏠 {service.name}
                    </CardTitle>
                    <CardDescription className="text-gray-600 text-base leading-relaxed">
                      {service.description}
                    </CardDescription>
                  </div>
                  <Badge variant={service.is_active ? "default" : "secondary"}>
                    {service.is_active ? 'Aktif' : 'Tidak Aktif'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Separator />
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3">Dokumen yang Diperlukan:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {service.required_documents.map((docType: string, index: number) => (
                        <div key={index} className="flex items-center space-x-2">
                          <span className="text-green-600">✓</span>
                          <span className="text-sm text-gray-700">
                            {getDocumentLabel(docType)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Separator />
                  <div className="flex justify-end">
                    <Button 
                      onClick={() => onServiceSelect(service)}
                      disabled={!service.is_active}
                      size="lg"
                    >
                      Ajukan Permohonan
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}