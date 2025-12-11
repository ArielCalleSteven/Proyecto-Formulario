import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms'; 
import { Auth, signOut } from '@angular/fire/auth';
import { Firestore, collection, query, where, getDocs } from '@angular/fire/firestore';

// 👇 IMPORTAMOS LOS SERVICIOS 👇
import { ProjectService } from '../../services/project.service';
import { AdvisoryService } from '../../services/advisory.service';

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
  
  private projectService = inject(ProjectService);
  private advisoryService = inject(AdvisoryService);

  myProfile: any = null;
  isLoading: boolean = true;
  isModalOpen: boolean = false;
  isEditingProject: boolean = false;
  currentProjectIndex: number | null = null;
  appointments: any[] = [];

  newProject = { title: '', description: '', category: 'Académico', role: 'Frontend', techInput: '', repo: '', demo: '' };

  async ngOnInit() {
    const user = this.auth.currentUser;
    if (user?.email) {
      const ref = collection(this.firestore, 'programmers');
      const q = query(ref, where('contact.email', '==', user.email));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const d = snapshot.docs[0];
        this.myProfile = { id: d.id, ...d.data() };
        if (!this.myProfile.projects) this.myProfile.projects = [];

        this.loadAppointments(this.myProfile.id);
      }
    }
    this.isLoading = false;
  }

  loadAppointments(programmerId: string) {
    this.advisoryService.getProgrammerAppointments(programmerId).subscribe(data => {
      this.appointments = data.map(app => ({ ...app, replyMessage: '' }));
    });
  }

  async respondAppointment(app: any, status: 'Aprobada' | 'Rechazada') {
    if (!app.replyMessage) { alert('⚠️ Escribe un mensaje.'); return; }
    try {
      await this.advisoryService.updateAppointmentStatus(app.id, status, app.replyMessage);
      alert(`✅ Solicitud ${status}`);
    } catch (error) { console.error(error); }
  }

  openModal() { this.isEditingProject = false; this.resetForm(); this.isModalOpen = true; }
  openEditModal(project: any, index: number) {
    this.isEditingProject = true; this.currentProjectIndex = index;
    this.newProject = { ...project, techInput: project.tech ? project.tech.join(', ') : '' };
    this.isModalOpen = true;
  }
  closeModal() { this.isModalOpen = false; this.resetForm(); }
  resetForm() { this.isEditingProject = false; this.currentProjectIndex = null; this.newProject = { title: '', description: '', category: 'Académico', role: 'Frontend', techInput: '', repo: '', demo: '' }; }

  async saveProject() {
    if (!this.newProject.title) { alert('Datos requeridos'); return; }
    try {
      const techArray = this.newProject.techInput.split(',').map((t: string) => t.trim()).filter((t: string) => t !== '');
      const projectData = { ...this.newProject, tech: techArray }; 

      if (this.isEditingProject && this.currentProjectIndex !== null) {
        this.myProfile.projects[this.currentProjectIndex] = projectData;
      } else {
        this.myProfile.projects.push(projectData);
      }

      await this.projectService.updateUserProjects(this.myProfile.id, this.myProfile.projects);
      
      this.closeModal();
    } catch (error) { console.error(error); alert('Error'); }
  }

  async deleteProject(index: number) {
    if (!confirm('¿Eliminar?')) return;
    try {
      this.myProfile.projects.splice(index, 1);
      await this.projectService.updateUserProjects(this.myProfile.id, this.myProfile.projects);
    } catch (error) { console.error(error); }
  }

  notifyStudent(app: any, method: 'whatsapp' | 'email') { /* ... tu código de antes ... */ }
  async logout() { await signOut(this.auth); this.router.navigate(['/login']); }
}