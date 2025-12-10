import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { RouterLink, Router } from '@angular/router'; // <--- IMPORTA Router
import { Firestore, collection, collectionData, addDoc } from '@angular/fire/firestore';
import { Auth, signOut } from '@angular/fire/auth'; // <--- IMPORTA signOut

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink], 
  templateUrl: './home.html',
})
export class HomeComponent implements OnInit {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private router = inject(Router); // <--- INYECTA EL ROUTER

  // Datos
  allProgrammers: any[] = [];
  filteredProgrammers: any[] = [];
  isLoading: boolean = true;

  // Filtros
  searchTerm: string = '';
  selectedSpecialty: string = 'All';
  specialties: string[] = ['All', 'Frontend Developer', 'Backend Developer', 'Full-Stack Developer', 'DevOps Engineer'];

  // Modal Agendar
  isModalOpen: boolean = false;
  selectedProgrammer: any = null; 

  // Objeto Cita
  appointment = { date: '', time: '', comment: '' };

  // Variable para saber quién está logueado (Opcional, para mostrar su email)
  currentUserEmail: string | null = null;

  ngOnInit() {
    this.currentUserEmail = this.auth.currentUser?.email || null; // Guardamos el email

    const ref = collection(this.firestore, 'programmers');
    collectionData(ref, { idField: 'id' }).subscribe((data) => {
      this.allProgrammers = data;
      this.applyFilters();
      this.isLoading = false;
    });
  }

  // --- FUNCIÓN CERRAR SESIÓN (NUEVA) ---
  async logout() {
    try {
      await signOut(this.auth);
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error al salir:', error);
    }
  }

  applyFilters() {
    const term = this.searchTerm.toLowerCase().trim();
    this.filteredProgrammers = this.allProgrammers.filter(p => {
      const name = (p.name || '').toLowerCase();
      const specialty = (p.specialty || '').toLowerCase();
      
      const matchesSearch = name.includes(term) || specialty.includes(term);
      const matchesSpecialty = this.selectedSpecialty === 'All' || p.specialty === this.selectedSpecialty;
      return matchesSearch && matchesSpecialty;
    });
  }

  openBookingModal(programmer: any) {
    this.selectedProgrammer = programmer;
    this.appointment = { date: '', time: '', comment: '' }; 
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.selectedProgrammer = null;
  }

  async saveAppointment() {
    if (!this.appointment.date || !this.appointment.time) {
      alert('⚠️ Por favor selecciona fecha y hora.');
      return;
    }
    
    if (!this.currentUserEmail) {
      alert('Error: No estás logueado.');
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

      await addDoc(collection(this.firestore, 'appointments'), newBooking);
      alert(`✅ ¡Cita agendada con ${this.selectedProgrammer.name}!`);
      this.closeModal();

    } catch (error) {
      console.error('Error al agendar:', error);
      alert('Hubo un error al agendar la cita.');
    }
  }
}