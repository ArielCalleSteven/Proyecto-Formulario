import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { Router } from '@angular/router';
import { Auth, signOut } from '@angular/fire/auth';
import { UserService, Programmer } from '../../services/user.service'; 

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule], 
  templateUrl: './admin-dashboard.html', 
})
export class AdminComponent {
  private userService = inject(UserService); 
  private auth = inject(Auth);
  private router = inject(Router);

  allProgrammers: Programmer[] = [];      
  filteredProgrammers: Programmer[] = []; 
  isLoading: boolean = true;      
  
  isModalOpen: boolean = false;
  isScheduleModalOpen: boolean = false;
  isEditing: boolean = false;
  currentId: string | null = null;
  searchTerm: string = '';
  selectedSpecialty: string = 'All';
  specialties: string[] = ['All', 'Frontend Developer', 'Backend Developer', 'Full-Stack Developer', 'DevOps Engineer'];
  
  currentProgrammerName: string = '';
  tempSchedules: any[] = [];
  newSchedule = { day: 'Lunes', start: '', end: '' };
  daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  newProgrammer: any = {
    name: '', specialty: 'Frontend Developer', description: '', photoUrl: '',
    contact: { email: '', linkedin: '', github: '' }
  };

  constructor() {
    this.userService.getProgrammers().subscribe({
      next: (data) => {
        this.allProgrammers = data;
        this.applyFilters(); 
        this.isLoading = false; 
      },
      error: (err) => console.error(err)
    });
  }

  applyFilters() {
    const term = this.searchTerm.toLowerCase().trim();
    this.filteredProgrammers = this.allProgrammers.filter((p: any) => {
      const name = (p.name || '').toLowerCase();
      const specialty = (p.specialty || '').toLowerCase();
      return (name.includes(term) || specialty.includes(term)) &&
             (this.selectedSpecialty === 'All' || p.specialty === this.selectedSpecialty);
    });
  }

  openModal() { this.isEditing = false; this.resetForm(); this.isModalOpen = true; }
  closeModal() { this.isModalOpen = false; this.resetForm(); }
  resetForm() {
    this.isEditing = false; this.currentId = null;
    this.newProgrammer = { name: '', specialty: 'Frontend Developer', description: '', photoUrl: '', contact: { email: '', linkedin: '', github: '' } };
  }
  editProgrammer(programmer: any) {
    this.isEditing = true;
    this.currentId = programmer.id;
    this.newProgrammer = { ...programmer, contact: { ...programmer.contact } };
    this.isModalOpen = true;
  }

  async saveProgrammer() {
    if (!this.newProgrammer.name || !this.newProgrammer.contact.email) {
      alert('⚠️ Faltan datos obligatorios');
      return;
    }
    try {
      if (this.isEditing && this.currentId) {
        await this.userService.updateProgrammer(this.currentId, this.newProgrammer);
      } else {
        await this.userService.addProgrammer(this.newProgrammer);
      }
      this.closeModal();
    } catch (error) { console.error(error); }
  }

  async deleteProgrammer(id: string | undefined) {
    if (!id) return;
    if(confirm('¿Borrar programador?')) {
      await this.userService.deleteProgrammer(id);
    }
  }

  // 👇 HORARIOS USANDO SERVICIO (Update es el mismo método) 👇
  openScheduleModal(programmer: any) {
    this.currentId = programmer.id;
    this.currentProgrammerName = programmer.name;
    this.tempSchedules = programmer.availability ? [...programmer.availability] : [];
    this.newSchedule = { day: 'Lunes', start: '', end: '' };
    this.isScheduleModalOpen = true;
  }
  
  closeScheduleModal() { this.isScheduleModalOpen = false; }
  
  // 🔥 AQUÍ ESTÁ LA MAGIA CORREGIDA 🔥
  addSchedule() {
    // 1. Validar que haya horas
    if (!this.newSchedule.start || !this.newSchedule.end) { 
        alert('⚠️ Debes ingresar hora de inicio y fin.'); 
        return; 
    }

    // 2. Validar que la hora fin sea mayor a la inicio
    if (this.newSchedule.start >= this.newSchedule.end) {
        alert('⚠️ La hora de fin debe ser posterior a la de inicio.');
        return;
    }

    // 3. Validar DUPLICADOS (La parte importante)
    // Buscamos si ya existe un horario con ese mismo día
    const diaDuplicado = this.tempSchedules.find(s => s.day === this.newSchedule.day);

    if (diaDuplicado) {
        alert(`⚠️ Ya existe un horario configurado para el ${this.newSchedule.day}. Elimínalo primero si quieres cambiarlo.`);
        return;
    }

    // Si pasa todas las pruebas, guardamos
    this.tempSchedules.push({ ...this.newSchedule });
    
    // Opcional: Ordenar los días para que se vean bonitos (Lunes a Domingo)
    // Esto es un plus visual
    const daysOrder = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    this.tempSchedules.sort((a, b) => daysOrder.indexOf(a.day) - daysOrder.indexOf(b.day));
  }
  
  removeSchedule(index: number) { this.tempSchedules.splice(index, 1); }

  async saveSchedules() {
    if (!this.currentId) return;
    try {
      await this.userService.updateProgrammer(this.currentId, { availability: this.tempSchedules });
      alert('✅ Horarios actualizados');
      this.closeScheduleModal();
    } catch (error) { console.error(error); }
  }

  async logout() { await signOut(this.auth); this.router.navigate(['/login']); }
}