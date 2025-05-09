"use client"

import { useState, useEffect } from "react"
import { Calendar, Clock, Scissors, Loader2, User } from "lucide-react"
import Link from "next/link"
import useUserStore from "@/app/stores/userStore"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// Randevu tipi için interface tanımlama
interface Appointment {
  id: string;
  date: string;
  time: string;
  staff: string;
  service: string;
}

export default function CustomerDashboardPage() {
  // Zustand store'dan kullanıcı bilgilerini al
  const { dbUser, getFullName, loading: userLoading } = useUserStore()
  
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Randevu iptal state'leri
  const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Verileri API'den çekme
  useEffect(() => {
    const fetchUpcomingAppointments = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Gelecek randevuları getir (take=5 olarak güncellendi)
        const response = await fetch('/api/appointments?past=false&take=5', {
          cache: 'no-store' // Her zaman güncel veri
        })
        
        // API'den gelen tüm yanıtları kabul et, hata durumunda bile
        const appointmentsData = await response.json().catch(() => []);
        
        // API verilerini UI için formatla (null kontrolü eklendi)
        const formattedAppointments: Appointment[] = Array.isArray(appointmentsData) 
          ? appointmentsData.map(apt => {
              // Null veya undefined kontrolü
              if (!apt) return null;
              
              // Tarih formatlaması yaparken zaman dilimi farkını telafi et
              let appointmentDate;
              if (apt.date) {
                // Zaman dilimi farkını önlemek için tarih kısmını ayrıca parse et
                const dateStr = apt.date.split('T')[0]; // YYYY-MM-DD formatını al
                const [year, month, day] = dateStr.split('-').map(Number);
                
                // Yeni date objesi oluştur
                appointmentDate = new Date(year, month - 1, day);
              } else {
                appointmentDate = new Date();
              }
              
              return {
                id: apt.id || "unknown",
                date: appointmentDate.toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                }),
                time: apt.time ? new Date(apt.time).toLocaleTimeString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit'
                }) : "-",
                staff: apt.employee ? `${apt.employee.firstName || ''} ${apt.employee.lastName || ''}`.trim() : "-",
                service: apt.serviceName || "Belirtilmemiş",
              }
            }).filter(Boolean) as Appointment[] // null değerleri filtrele ve tip güvenliğini sağla
          : [];
        
        setUpcomingAppointments(formattedAppointments);
        
      } catch (error) {
        console.error("Randevu verileri yüklenirken hata:", error);
        // Hata olsa bile boş dizi ile devam et
        setUpcomingAppointments([]);
      } finally {
        setLoading(false);
      }
    }
    
    fetchUpcomingAppointments();
  }, []);
  
  // Randevu iptal et
  const cancelAppointment = async () => {
    if (!appointmentToCancel) return;
    
    try {
      setIsDeleting(true);
      setDeleteError(null);
      
      const response = await fetch(`/api/appointments/${appointmentToCancel}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Randevu iptal edilemedi');
      }
      
      // İptal edilen randevuyu listeden kaldır
      setUpcomingAppointments(prev => prev.filter(apt => apt.id !== appointmentToCancel));
      
      // Diyaloğu kapat
      setAppointmentToCancel(null);
    } catch (error) {
      console.error('Randevu iptal hatası:', error);
      setDeleteError(error instanceof Error ? error.message : 'Randevu iptal edilemedi');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      
      {/* Upcoming appointments section */}
      <Card className="flex-1">
        <CardHeader className="pb-3">
          <CardTitle>Yaklaşan Randevular</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <p>Randevular yükleniyor...</p>
            </div>
          ) : error ? (
            <div className="flex justify-center items-center py-8">
              <p className="text-red-600">{error}</p>
            </div>
          ) : upcomingAppointments.length > 0 ? (
            <div className="grid gap-4">
              {upcomingAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">
                        {appointment.staff && appointment.staff !== "-" 
                          ? `Berber: ${appointment.staff}` 
                          : "Berber: Belirtilmemiş"}
                      </h3>
                      <div className="flex flex-wrap gap-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{appointment.date}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{appointment.time}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 self-end sm:self-auto">
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => setAppointmentToCancel(appointment.id)}
                      disabled={isDeleting}
                    >
                      {isDeleting && appointmentToCancel === appointment.id ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          İptal...
                        </> 
                      ) : 'İptal Et'}
                    </Button>
                  </div>
                </div>
              ))}
              
              {/* İptal diyaloğu */}
              <AlertDialog 
                open={!!appointmentToCancel} 
                onOpenChange={(open) => !open && setAppointmentToCancel(null)}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Randevu İptal Edilecek</AlertDialogTitle>
                    <AlertDialogDescription>
                      Bu randevuyu iptal etmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  {deleteError && (
                    <div className="p-3 my-2 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                      {deleteError}
                    </div>
                  )}
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Vazgeç</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => {
                        e.preventDefault(); // Dialogu kapatmayı engelle
                        cancelAppointment();
                      }}
                      disabled={isDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          İptal Ediliyor...
                        </>
                      ) : "İptal Et"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Yaklaşan randevunuz bulunmamaktadır.</p>
                <Link href="/appointments/new">
                  <Button>Randevu Al</Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}