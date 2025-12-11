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

  // Datos
  allProgrammers: any[] = [];
  filteredProgrammers: any[] = [];
  isLoading: boolean = true;

  // Filtros
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

  showCustomAlert(title: string, message: string, type: 'success' | 'error' | 'warning' = 'error') {
    this.alertTitle = title;
    this.alertMessage = message;
    this.alertType = type;
    this.isAlertOpen = true;
  }
  closeCustomAlert() { this.isAlertOpen = false; }

  validateSchedule(dateString: string, timeString: string, availability: any[]): boolean {
    if (!availability || availability.length === 0) {
      this.showCustomAlert('⚠️ Sin Horarios', 'Este programador aún no ha configurado sus horarios. No se puede agendar.', 'warning');
      return false; 
    }

    const parts = dateString.split('-'); 
    const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])); 
    const dayNumber = dateObj.getDay(); 
    const daysMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayName = daysMap[dayNumber];

    const scheduleForDay = availability.find((s: any) => s.day.toLowerCase() === dayName.toLowerCase());

    if (!scheduleForDay) {
      this.showCustomAlert('📅 Día Incorrecto', `El programador NO trabaja los días ${dayName}. Revisa la lista de horarios.`, 'error');
      return false;
    }

    if (timeString >= scheduleForDay.start && timeString <= scheduleForDay.end) {
      return true;
    } else {
      this.showCustomAlert('⏰ Hora Inválida', `La hora elegida está fuera de rango.\nEl horario para ${dayName} es de ${scheduleForDay.start} a ${scheduleForDay.end}.`, 'error');
      return false;
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

    const isValid = this.validateSchedule(
      this.appointment.date, 
      this.appointment.time, 
      this.selectedProgrammer.availability
    );

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
        date: this.appointment.date,
        time: this.appointment.time,
        comment: this.appointment.comment,
        status: 'Pendiente', 
        createdAt: new Date()
      };

      await this.advisoryService.createAppointment(newBooking);
      
      this.closeModal(); 
      this.showCustomAlert('¡Cita Agendada! 🎉', `Tu solicitud para el ${this.appointment.date} ha sido enviada con éxito.`, 'success');

    } catch (error) {
      console.error('Error al agendar:', error);
      this.showCustomAlert('Error', 'Hubo un error al guardar la cita en el sistema.', 'error');
    }
  }

  openBookingModal(programmer: any) {
    this.selectedProgrammer = programmer;
    this.appointment = { date: '', time: '', comment: '' }; 
    this.isModalOpen = true;
  }
  closeModal() { this.isModalOpen = false; this.selectedProgrammer = null; }
  
  openMyAppointments() { this.isMyAppointmentsModalOpen = true; }
  closeMyAppointments() { this.isMyAppointmentsModalOpen = false; }
  
  async logout() { 
    try { 
      await signOut(this.auth); 
      this.router.navigate(['/login']); 
    } catch (error) { console.error('Error al salir:', error); }
  }

  applyFilters() {
    const term = this.searchTerm.toLowerCase().trim();
    this.filteredProgrammers = this.allProgrammers.filter(p => {
      const name = (p.name || '').toLowerCase();
      const specialty = (p.specialty || '').toLowerCase();
      return (name.includes(term) || specialty.includes(term)) && (this.selectedSpecialty === 'All' || p.specialty === this.selectedSpecialty);
    });
  }
}