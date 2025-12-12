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

  isAlertOpen: boolean = false;
  alertTitle: string = '';
  alertMessage: string = '';
  alertType: 'success' | 'error' | 'warning' = 'error';
  onAlertCloseCallback: () => void = () => {};

  ngOnInit() {
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0];

    this.auth.onAuthStateChanged(user => {
      if (user?.email) {
        this.currentUserEmail = user.email;
        this.advisoryService.getStudentAppointments(user.email).subscribe(data => {
          this.myAppointments = data;
        });
      }
    });

    this.userService.getProgrammers().subscribe((data) => {
      this.allProgrammers = data;
      this.applyFilters();
      this.isLoading = false;
    });
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

  
  isAppointmentValid(app: any): boolean {
    const programmer = this.allProgrammers.find(p => p.id === app.programmerId);
    
    if (!programmer) return false;

    const parts = app.date.split('-'); 
    const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])); 
    
    const daysMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayName = daysMap[dateObj.getDay()];

    const schedule = programmer.availability?.find((s: any) => s.day.toLowerCase() === dayName.toLowerCase());

    if (!schedule) return false; 

    if (app.time >= schedule.start && app.time <= schedule.end) {
      return true; 
    }

    return false; 
  }

  validateSchedule(dateString: string, timeString: string, availability: any[]): boolean {
    if (!availability || availability.length === 0) {
      this.showCustomAlert('⚠️ Sin Horarios', 'Este programador aún no ha configurado sus horarios.', 'warning');
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
      this.showCustomAlert('Error', 'No se encontró el correo del programador para esta cita.', 'warning');
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

  async saveAppointment() {
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

    try {
      const newBooking = {
        studentEmail: this.currentUserEmail,
        programmerId: this.selectedProgrammer.id,
        programmerName: this.selectedProgrammer.name,
        programmerEmail: this.selectedProgrammer.contact?.email || '', 
        date: this.appointment.date,
        time: this.appointment.time,
        comment: this.appointment.comment,
        status: 'Pendiente', 
        createdAt: new Date()
      };

      await this.advisoryService.createAppointment(newBooking);
      
      this.closeModal(); 
      
      this.showCustomAlert(
        '¡Solicitud Enviada!', 
        'La cita se guardó en el sistema.\n\nSi deseas notificar formalmente por correo ahora, da clic en Continuar.', 
        'success',
        () => {
           this.notifyProgrammer(newBooking, 'email');
        }
      );

    } catch (error) {
      console.error('Error al agendar:', error);
      this.showCustomAlert('Error', 'Hubo un error al guardar la cita.', 'error');
    }
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