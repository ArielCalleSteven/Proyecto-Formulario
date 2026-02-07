import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { RouterLink, Router } from '@angular/router'; 
import { Auth, signOut } from '@angular/fire/auth'; 
import { UserService } from '../../services/user.service';
import { AdvisoryService } from '../../services/advisory.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink], 
  templateUrl: './home.html',
})
export class HomeComponent implements OnInit {
  private userService = inject(UserService);
  private advisoryService = inject(AdvisoryService);
  public auth = inject(Auth);
  private router = inject(Router); 

  allProgrammers: any[] = [];
  filteredProgrammers: any[] = [];
  isLoading: boolean = true;
  searchTerm: string = '';
  selectedSpecialty: string = 'All';
  specialties: string[] = ['All', 'Frontend Developer', 'Backend Developer', 'Full-Stack Developer', 'DevOps Engineer'];

  isModalOpen: boolean = false;
  selectedProgrammer: any = null; 
  appointment = { date: '', time: '', comment: '' };
  minDate: string = '';

  currentUserEmail: string | null = null;
  myAppointments: any[] = [];
  isMyAppointmentsModalOpen: boolean = false;

  // 🔥 VARIABLE NUEVA PARA EL TURBO (Bloquea el botón)
  isBookingLoading: boolean = false;

  isAlertOpen: boolean = false;
  alertTitle: string = '';
  alertMessage: string = '';
  alertType: 'success' | 'error' | 'warning' = 'error';
  onAlertCloseCallback: () => void = () => {};

  currentTheme: 'dark' | 'light' = 'dark';

  ngOnInit() {
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0];

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      this.currentTheme = savedTheme;
    }

    this.auth.onAuthStateChanged(user => {
      if (user?.email) {
        this.currentUserEmail = user.email;
        this.loadMyAppointments(user.email);
      }
    });

    this.loadProgrammers();
  }

  loadProgrammers() {
    this.userService.getProgrammers().subscribe({
      next: (data: any[]) => {
        this.allProgrammers = data.map(p => {
          const rawDesc = p.description || '';
          const parts = rawDesc.split('|||');
          const realSpecialty = parts.length > 1 ? parts[0].trim() : (p.role === 'student' ? 'N/A' : 'Programmer');
          const realBio = parts.length > 1 ? parts[1].trim() : rawDesc;

          let realAvailability = [];
          if (p.availability) {
              try {
                  realAvailability = (typeof p.availability === 'string') ? JSON.parse(p.availability) : p.availability;
              } catch (e) {
                  console.error('Error leyendo horario de:', p.name);
                  realAvailability = [];
              }
          }

          return {
            id: p.id,
            name: p.name,
            specialty: realSpecialty,
            description: realBio,
            photoUrl: p.photoUrl,
            contact: {
              email: p.email,
              github: p.github,
              linkedin: p.linkedin
            },
            availability: realAvailability
          };
        });

        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando programadores:', err);
        this.isLoading = false;
      }
    });
  }

  loadMyAppointments(email: string) {
    this.advisoryService.getStudentAppointments(email).subscribe({
      next: (data) => {
        this.myAppointments = data;
      },
      error: (err) => console.error(err)
    });
  }

  setTheme(theme: 'dark' | 'light') {
    this.currentTheme = theme;
    localStorage.setItem('theme', theme); 
  }

  showCustomAlert(title: string, message: string, type: 'success' | 'error' | 'warning' = 'error', onClose?: () => void) {
    this.alertTitle = title;
    this.alertMessage = message;
    this.alertType = type;
    this.onAlertCloseCallback = onClose || (() => {});
    this.isAlertOpen = true;
  }
  
  closeCustomAlert() { 
    this.isAlertOpen = false; 
    if (this.onAlertCloseCallback) this.onAlertCloseCallback();
  }

  getAppointmentStatus(app: any): 'VALID' | 'NO_MENTOR' | 'NO_SCHEDULE' {
    const programmer = this.allProgrammers.find(p => String(p.id) === String(app.programmerId));
    
    if (!programmer) return 'NO_MENTOR';

    const parts = app.date.split('-'); 
    const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])); 
    const daysMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayName = daysMap[dateObj.getDay()];

    const schedule = programmer.availability?.find((s: any) => s.day.toLowerCase() === dayName.toLowerCase());

    if (!schedule) return 'NO_SCHEDULE'; 

    if (app.time < schedule.start || app.time > schedule.end) {
       return 'NO_SCHEDULE';
    }

    return 'VALID'; 
  }

  validateSchedule(dateString: string, timeString: string, availability: any[]): boolean {
    if (!availability || availability.length === 0) {
      this.showCustomAlert('Sin Agenda', 'El mentor no tiene horarios disponibles.', 'warning');
      return false; 
    }

    const parts = dateString.split('-'); 
    const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])); 
    const dayNumber = dateObj.getDay(); 
    const daysMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayName = daysMap[dayNumber];

    const scheduleForDay = availability.find((s: any) => s.day.toLowerCase() === dayName.toLowerCase());

    if (!scheduleForDay) {
      this.showCustomAlert('📅 Día Incorrecto', `El programador NO trabaja los días ${dayName}.`, 'error');
      return false;
    }

    if (timeString >= scheduleForDay.start && timeString <= scheduleForDay.end) {
      return true;
    } else {
      this.showCustomAlert('⏰ Hora Inválida', `El horario para ${dayName} es de ${scheduleForDay.start} a ${scheduleForDay.end}.`, 'error');
      return false;
    }
  }

  notifyProgrammer(app: any, method: 'whatsapp' | 'email') {
    const emailDestino = app.programmerEmail; 
    
    if (method === 'email' && !emailDestino) {
      this.showCustomAlert('Error', 'No se encontró el correo del programador.', 'warning');
      return;
    }

    const subject = `Consulta sobre Asesoría - Plataforma Estudiantil`;
    const body = `Hola ${app.programmerName}, soy el estudiante ${this.currentUserEmail}. \n\nTe escribo respecto a la cita del ${app.date} a las ${app.time}. \nEstado actual: ${app.status}. \n\nQuedo atento.`;

    if (method === 'whatsapp') {
      const url = `https://wa.me/?text=${encodeURIComponent(body)}`;
      window.open(url, '_blank');
    } else if (method === 'email') {
      const url = `mailto:${emailDestino}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(url, '_blank');
    }
  }

  // 👇 AQUÍ ESTÁ EL TURBO ACTIVADO 🏎️
  saveAppointment() {
    // 1. SI YA SE DIO CLICK, NO HACEMOS NADA (Bloqueo Anti-Spam)
    if (this.isBookingLoading) return;

    if (!this.appointment.date || !this.appointment.time) {
      this.showCustomAlert('Campos Vacíos', 'Por favor selecciona fecha y hora.', 'warning');
      return;
    }
    if (this.appointment.date < this.minDate) {
      this.showCustomAlert('Fecha Inválida', 'No puedes agendar en una fecha pasada.', 'error');
      return;
    }

    const isValid = this.validateSchedule(this.appointment.date, this.appointment.time, this.selectedProgrammer.availability);
    if (!isValid) return;

    if (!this.currentUserEmail) {
      this.showCustomAlert('Error de Sesión', 'No estás logueado.', 'error');
      return;
    }

    // 2. ACTIVAMOS EL BLOQUEO DEL BOTÓN
    this.isBookingLoading = true;

    const newBooking = {
      programmerId: this.selectedProgrammer.id, 
      clientEmail: this.currentUserEmail,       
      clientName: 'Estudiante',
      programmerName: this.selectedProgrammer.name, 
      programmerEmail: this.selectedProgrammer.contact?.email, 
      date: this.appointment.date,
      time: this.appointment.time,
      topic: this.appointment.comment,          
      status: 'Pendiente'
    };

    this.advisoryService.createAppointment(newBooking).subscribe({
      next: (res) => {
        // 3. TURBO UPDATE: Agregamos a la lista local INMEDIATAMENTE
        // No esperamos a recargar toda la BD. El número 32 cambiará a 33 al instante.
        const appointmentToPush = { ...newBooking, id: res.id || Date.now() }; // Usamos ID del server o temporal
        this.myAppointments.push(appointmentToPush);

        this.closeModal(); 
        
        // Desbloqueamos por si acaso (aunque el modal ya se cerró)
        this.isBookingLoading = false; 

        this.showCustomAlert(
          '¡Solicitud Enviada!', 
          'La cita se guardó correctamente.', 
          'success',
          () => {
             // ✅ AQUÍ ESTÁ EL NOTIFY QUE PEDISTE QUE NO BORRARA
             this.notifyProgrammer(newBooking, 'email');
          }
        );
      },
      error: (error) => {
        console.error('Error al agendar:', error);
        this.isBookingLoading = false; // 4. SI FALLA, DESBLOQUEAMOS EL BOTÓN
        this.showCustomAlert('Error', 'Hubo un error al guardar la cita en el servidor.', 'error');
      }
    });
  }

  openBookingModal(programmer: any) { this.selectedProgrammer = programmer; this.appointment = { date: '', time: '', comment: '' }; this.isModalOpen = true; }
  closeModal() { this.isModalOpen = false; this.selectedProgrammer = null; }
  openMyAppointments() { this.isMyAppointmentsModalOpen = true; }
  closeMyAppointments() { this.isMyAppointmentsModalOpen = false; }
  async logout() { try { await signOut(this.auth); this.router.navigate(['/login']); } catch (error) { console.error('Error al salir:', error); }}
  
  applyFilters() {
    const term = this.searchTerm.toLowerCase().trim();
    this.filteredProgrammers = this.allProgrammers.filter(p => {
      const name = (p.name || '').toLowerCase();
      const specialty = (p.specialty || '').toLowerCase();
      return (name.includes(term) || specialty.includes(term)) && (this.selectedSpecialty === 'All' || p.specialty === this.selectedSpecialty);
    });
  }
}