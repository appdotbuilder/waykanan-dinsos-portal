import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import { ServiceList } from '@/components/ServiceList';
import { ApplicationForm } from '@/components/ApplicationForm';
import { ApplicationList } from '@/components/ApplicationList';
import { StaffDashboard } from '@/components/StaffDashboard';
import type { Service, User, Application } from '../../server/src/schema';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Mock user login - In real app, this would be handled by authentication
  const mockUsers: User[] = [
    {
      id: 1,
      email: 'citizen@example.com',
      full_name: 'Budi Santoso',
      phone: '081234567890',
      role: 'CITIZEN',
      created_at: new Date()
    },
    {
      id: 2,
      email: 'staff@dinsoskwk.go.id',
      full_name: 'Sari Wijaya',
      phone: '081234567891',
      role: 'STAFF',
      created_at: new Date()
    },
    {
      id: 3,
      email: 'admin@dinsoskwk.go.id',
      full_name: 'Ahmad Rahman',
      phone: '081234567892',
      role: 'ADMIN',
      created_at: new Date()
    }
  ];

  const loadApplications = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);
      const query = currentUser.role === 'CITIZEN' 
        ? { applicant_id: currentUser.id }
        : {}; // Staff and admin can see all applications
      const result = await trpc.getApplications.query(query);
      setApplications(result);
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadApplications();
    }
  }, [currentUser, loadApplications]);

  const handleApplicationSubmitted = () => {
    loadApplications();
    setSelectedService(null);
  };

  const handleUserLogin = (user: User) => {
    setCurrentUser(user);
    setSelectedService(null);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedService(null);
    setApplications([]);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-white">🏛️</span>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-800">
              Portal Digital
            </CardTitle>
            <CardDescription className="text-gray-600">
              Dinas Sosial Kabupaten Way Kanan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600 text-center mb-4">
              Pilih peran untuk masuk ke sistem:
            </p>
            {mockUsers.map((user: User) => (
              <Button
                key={user.id}
                onClick={() => handleUserLogin(user)}
                variant="outline"
                className="w-full justify-start"
              >
                <span className="mr-2">
                  {user.role === 'CITIZEN' ? '👤' : user.role === 'STAFF' ? '👩‍💼' : '👨‍💻'}
                </span>
                <div className="text-left">
                  <div className="font-medium">{user.full_name}</div>
                  <div className="text-xs text-gray-500">
                    {user.role === 'CITIZEN' ? 'Warga' : user.role === 'STAFF' ? 'Petugas' : 'Admin'}
                  </div>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-xl font-bold text-white">🏛️</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Portal Digital</h1>
                <p className="text-sm text-gray-600">Dinas Sosial Kabupaten Way Kanan</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="font-medium text-gray-800">{currentUser.full_name}</p>
                <Badge variant="secondary">
                  {currentUser.role === 'CITIZEN' ? 'Warga' : currentUser.role === 'STAFF' ? 'Petugas' : 'Admin'}
                </Badge>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                Keluar
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {currentUser.role === 'CITIZEN' ? (
          <Tabs defaultValue="services" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="services">Layanan Tersedia</TabsTrigger>
              <TabsTrigger value="applications">Permohonan Saya</TabsTrigger>
            </TabsList>
            
            <TabsContent value="services" className="mt-6">
              {selectedService ? (
                <ApplicationForm
                  service={selectedService}
                  applicant={currentUser}
                  onSubmitted={handleApplicationSubmitted}
                  onCancel={() => setSelectedService(null)}
                />
              ) : (
                <ServiceList onServiceSelect={setSelectedService} />
              )}
            </TabsContent>
            
            <TabsContent value="applications" className="mt-6">
              <ApplicationList
                applications={applications}
                currentUser={currentUser}
                isLoading={isLoading}
                onRefresh={loadApplications}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <StaffDashboard
            currentUser={currentUser}
            onRefresh={loadApplications}
          />
        )}
      </main>
    </div>
  );
}

export default App;