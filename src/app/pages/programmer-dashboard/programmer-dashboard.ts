import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms'; 
import { Auth, signOut } from '@angular/fire/auth';
import { Firestore, collection, query, where, getDocs, doc, updateDoc, collectionData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-programmer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule], 
  templateUrl: './programmer-dashboard.html',
})
export class ProgrammerDashboardComponent implements OnInit {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);

  myProfile: any = null;
  isLoading: boolean = true;
  isModalOpen: boolean = false;

  // 👇 LISTA DE SOLICITUDES DE ASESORÍA 👇
  appointments: any[] = [];

  // Objeto para proyecto nuevo (ya lo tenías)
  newProject = {
    title: '', description: '', category: 'Académico', role: 'Frontend',
    techInput: '', repo: '', demo: ''
  };

  async ngOnInit() {
    const user = this.auth.currentUser;
    if (user?.email) {
      // 1. Cargar Perfil del Programador
      const ref = collection(this.firestore, 'programmers');
      const q = query(ref, where('contact.email', '==', user.email));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const d = snapshot.docs[0];
        this.myProfile = { id: d.id, ...d.data() };
        
        if (!this.myProfile.projects) this.myProfile.projects = [];

        // 2. 👇 CARGAR SOLICITUDES DE ASESORÍA (Donde programmerId == mi ID) 👇
        this.loadAppointments(this.myProfile.id);
      }
    }
    this.isLoading = false;
  }

  loadAppointments(programmerId: string) {
    const appRef = collection(this.firestore, 'appointments');
    const q = query(appRef, where('programmerId', '==', programmerId));
    
    // Usamos collectionData para ver cambios en tiempo real
    collectionData(q, { idField: 'id' }).subscribe((data) => {
      this.appointments = data.map(app => ({
        ...app,
        replyMessage: '' // Campo temporal para escribir la respuesta
      }));
    });
  }

  // --- RESPONDER SOLICITUD (Aprobar/Rechazar) ---
  async respondAppointment(app: any, status: 'Aprobada' | 'Rechazada') {
    if (!app.replyMessage) {
      alert('⚠️ Por favor escribe un mensaje de confirmación o justificación.');
      return;
    }

    try {
      const docRef = doc(this.firestore, 'appointments', app.id);
      await updateDoc(docRef, {
        status: status,
        programmerResponse: app.replyMessage 
      });
      alert(`✅ Solicitud ${status}`);
    } catch (error) {
      console.error('Error actualizando cita:', error);
    }
  }

  
  openModal() { this.isModalOpen = true; }
  closeModal() { this.isModalOpen = false; this.resetForm(); }

  resetForm() {
    this.newProject = {
      title: '', description: '', category: 'Académico', role: 'Frontend',
      techInput: '', repo: '', demo: ''
    };
  }

  async saveProject() {
    if (!this.newProject.title || !this.newProject.description) {
      alert('⚠️ Título y descripción requeridos.');
      return;
    }
    try {
      const techArray = this.newProject.techInput.split(',').map(t => t.trim()).filter(t => t !== '');
      const projectData = {
        title: this.newProject.title, description: this.newProject.description,
        category: this.newProject.category, role: this.newProject.role,
        tech: techArray, repo: this.newProject.repo, demo: this.newProject.demo
      };
      this.myProfile.projects.push(projectData);
      const docRef = doc(this.firestore, 'programmers', this.myProfile.id);
      await updateDoc(docRef, { projects: this.myProfile.projects });
      this.closeModal();
    } catch (error) { console.error(error); alert('Error al guardar'); }
  }

  async deleteProject(index: number) {
    if (!confirm('¿Eliminar este proyecto?')) return;
    try {
      this.myProfile.projects.splice(index, 1);
      const docRef = doc(this.firestore, 'programmers', this.myProfile.id);
      await updateDoc(docRef, { projects: this.myProfile.projects });
    } catch (error) { console.error(error); }
  }

  async logout() {
    await signOut(this.auth);
    this.router.navigate(['/login']);
  }
}