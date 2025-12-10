import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { Router } from '@angular/router';
import { Auth, signOut } from '@angular/fire/auth';
import { Firestore, collection, collectionData, addDoc, deleteDoc, doc, updateDoc } from '@angular/fire/firestore';

interface Programmer {
  id?: string;
  name: string;
  specialty: string;
  description?: string;
  photoUrl?: string;
  contact: {
    email: string;
    linkedin?: string;
    github?: string;
  };
  // 👇 NUEVO CAMPO: Disponibilidad
  availability?: { day: string, start: string, end: string }[];
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule], 
  templateUrl: './admin-dashboard.html', 
})
export class AdminComponent {
  private firestore = inject(Firestore);
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

  newProgrammer: Programmer = {
    name: '', specialty: 'Frontend Developer', description: '', photoUrl: '',
    contact: { email: '', linkedin: '', github: '' }
  };

  currentProgrammerName: string = ''; 
  tempSchedules: { day: string, start: string, end: string }[] = []; 
  newSchedule = { day: 'Lunes', start: '', end: '' }; 
  daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  constructor() {
    const ref = collection(this.firestore, 'programmers');
    collectionData(ref, { idField: 'id' }).subscribe({
      next: (data: any[]) => {
        this.allProgrammers = data.map(item => ({
          ...item,
          name: item.name || 'Sin Nombre',
          specialty: item.specialty || 'General',
          description: item.description || '',
          photoUrl: item.photoUrl || '',
          contact: item.contact || { email: 'Sin email' },
          availability: item.availability || [] 
        }));
        this.applyFilters(); 
        this.isLoading = false; 
      }
    });
  }


  applyFilters() {
    const term = this.searchTerm.toLowerCase().trim();
    this.filteredProgrammers = this.allProgrammers.filter(p => {
      const name = (p.name || '').toLowerCase();
      const specialty = (p.specialty || '').toLowerCase();
      return (name.includes(term) || specialty.includes(term)) &&
             (this.selectedSpecialty === 'All' || p.specialty === this.selectedSpecialty);
    });
  }

  openModal() {
    this.isEditing = false;
    this.resetForm();
    this.isModalOpen = true;
  }

  editProgrammer(programmer: Programmer) {
    this.isEditing = true;
    this.currentId = programmer.id || null;
    this.newProgrammer = { ...programmer, contact: { ...programmer.contact } };
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.resetForm(); 
  }

  resetForm() {
    this.isEditing = false;
    this.currentId = null;
    this.newProgrammer = {
      name: '', specialty: 'Frontend Developer', description: '', photoUrl: '',
      contact: { email: '', linkedin: '', github: '' }
    };
  }

  async saveProgrammer() {
    if (!this.newProgrammer.name || !this.newProgrammer.contact.email) {
      alert('⚠️ Faltan datos obligatorios');
      return;
    }
    try {
      if (this.isEditing && this.currentId) {
        const docRef = doc(this.firestore, 'programmers', this.currentId);
        await updateDoc(docRef, { ...this.newProgrammer });
      } else {
        const ref = collection(this.firestore, 'programmers');
        await addDoc(ref, this.newProgrammer);
      }
      this.closeModal();
    } catch (error) { console.error(error); }
  }

  async deleteProgrammer(id: string | undefined) {
    if (!id) return;
    if(confirm('¿Borrar programador?')) await deleteDoc(doc(this.firestore, 'programmers', id));
  }

  async logout() {
    await signOut(this.auth);
    this.router.navigate(['/login']);
  }


  openScheduleModal(programmer: Programmer) {
    this.currentId = programmer.id || null;
    this.currentProgrammerName = programmer.name;
    this.tempSchedules = programmer.availability ? [...programmer.availability] : [];
    this.newSchedule = { day: 'Lunes', start: '', end: '' }; 
    this.isScheduleModalOpen = true;
  }

  closeScheduleModal() {
    this.isScheduleModalOpen = false;
  }

  addSchedule() {
    if (!this.newSchedule.start || !this.newSchedule.end) {
      alert('⚠️ Pon la hora de inicio y fin');
      return;
    }
    this.tempSchedules.push({ ...this.newSchedule });

  }

  removeSchedule(index: number) {
    this.tempSchedules.splice(index, 1);
  }

  async saveSchedules() {
    if (!this.currentId) return;

    try {
      const docRef = doc(this.firestore, 'programmers', this.currentId);
      await updateDoc(docRef, { availability: this.tempSchedules });
      alert('✅ Horarios actualizados');
      this.closeScheduleModal();
    } catch (error) {
      console.error('Error guardando horarios:', error);
      alert('Error al guardar horarios');
    }
  }
}