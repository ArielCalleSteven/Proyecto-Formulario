import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms'; 
import { Auth, signOut } from '@angular/fire/auth';

import { UserService } from '../../services/user.service';
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
  private router = inject(Router);
  
  private userService = inject(UserService);
  private projectService = inject(ProjectService);
  private advisoryService = inject(AdvisoryService);

  myProfile: any = null;
  isLoading: boolean = true;
  
  isModalOpen: boolean = false;
  isEditingProject: boolean = false;
  currentProjectIndex: number | null = null;

  appointments: any[] = [];

  newProject = {
    title: '', description: '', category: 'Académico', role: 'Frontend',
    techInput: '', repo: '', demo: ''
  };

  isAlertOpen: boolean = false;
  alertTitle: string = '';
  alertMessage: string = '';
  alertType: 'success' | 'error' | 'warning' = 'success';
  alertCallback: () => void = () => {}; 

  async ngOnInit() {
    const user = this.auth.currentUser;
    if (user?.email) {
      try {
        const snapshot = await this.userService.getProgrammerByEmail(user.email);
        
        if (!snapshot.empty) {
          const d = snapshot.docs[0];
          this.myProfile = { id: d.id, ...d.data() };
          
          if (!this.myProfile.projects) this.myProfile.projects = [];

          this.loadAppointments(this.myProfile.id);
        }
      } catch (error) {
        console.error('Error cargando perfil:', error);
      }
    }
    this.isLoading = false;
  }

  loadAppointments(programmerId: string) {
    this.advisoryService.getProgrammerAppointments(programmerId).subscribe((data) => {
      this.appointments = data.map(app => ({
        ...app,
        replyMessage: '' 
      }));
    });
  }

  showAlert(title: string, message: string, type: 'success' | 'error' | 'warning', callback?: () => void) {
    this.alertTitle = title;
    this.alertMessage = message;
    this.alertType = type;
    this.alertCallback = callback || (() => {});
    this.isAlertOpen = true;
  }

  onAlertConfirm() {
    this.isAlertOpen = false;
    this.alertCallback(); 
  }

  onAlertCancel() {
    this.isAlertOpen = false; 
  }

  async respondAppointment(app: any, status: 'Aprobada' | 'Rechazada') {
    if (!app.replyMessage) {
      this.showAlert('⚠️ Mensaje Requerido', 'Por favor escribe un mensaje de confirmación o justificación.', 'warning');
      return;
    }

    try {
      await this.advisoryService.updateAppointmentStatus(app.id, status, app.replyMessage);
      this.showAlert('¡Listo! 🚀', `La solicitud ha sido ${status} correctamente.`, 'success');
    } catch (error) {
      console.error('Error actualizando cita:', error);
      this.showAlert('Error', 'No se pudo actualizar la cita.', 'error');
    }
  }

  async saveProject() {
    if (!this.newProject.title || !this.newProject.description) { 
      this.showAlert('Campos Incompletos', 'El título y la descripción son obligatorios.', 'warning'); 
      return; 
    }
    
    try {
      const techArray = this.newProject.techInput.split(',').map((t: string) => t.trim()).filter((t: string) => t !== '');
      const projectData = { title: this.newProject.title, description: this.newProject.description, category: this.newProject.category, role: this.newProject.role, tech: techArray, repo: this.newProject.repo, demo: this.newProject.demo };
      
      if (this.isEditingProject && this.currentProjectIndex !== null) { 
        this.myProfile.projects[this.currentProjectIndex] = projectData; 
      } else { 
        this.myProfile.projects.push(projectData); 
      }
      
      await this.projectService.updateUserProjects(this.myProfile.id, this.myProfile.projects);
      this.closeModal();
      this.showAlert('¡Éxito!', 'El proyecto se ha guardado correctamente.', 'success');

    } catch (error) { 
      console.error(error); 
      this.showAlert('Error', 'Hubo un problema al guardar el proyecto.', 'error'); 
    }
  }


  askDeleteProject(index: number) {
    this.showAlert(
      '¿Estás seguro?', 
      'Esta acción eliminará el proyecto permanentemente. No se puede deshacer.', 
      'warning', 
      () => this.executeDeleteProject(index) 
    );
  }

  async executeDeleteProject(index: number) {
    try { 
      this.myProfile.projects.splice(index, 1); 
      await this.projectService.updateUserProjects(this.myProfile.id, this.myProfile.projects);
    } catch (error) { 
      console.error(error); 
    } 
  }

  openModal() { this.isEditingProject = false; this.resetForm(); this.isModalOpen = true; }
  openEditModal(project: any, index: number) { this.isEditingProject = true; this.currentProjectIndex = index; this.newProject = { title: project.title, description: project.description, category: project.category, role: project.role, techInput: project.tech ? project.tech.join(', ') : '', repo: project.repo || '', demo: project.demo || '' }; this.isModalOpen = true; }
  closeModal() { this.isModalOpen = false; this.resetForm(); }
  resetForm() { this.isEditingProject = false; this.currentProjectIndex = null; this.newProject = { title: '', description: '', category: 'Académico', role: 'Frontend', techInput: '', repo: '', demo: '' }; }

  notifyStudent(app: any, method: 'whatsapp' | 'email') {
    if (!app.studentEmail) return;

    const subject = `Respuesta a tu solicitud de asesoría - Plataforma Estudiantil`;
    const body = `Hola! Soy ${this.myProfile.name}. He ${app.status === 'Aprobada' ? 'Aceptado ✅' : 'Rechazado ❌'} tu solicitud para el ${app.date} a las ${app.time}. \n\nMensaje: ${app.programmerResponse}`;
    
    if (method === 'whatsapp') {
      const url = `https://wa.me/?text=${encodeURIComponent(body)}`;
      window.open(url, '_blank');
    } 
    else if (method === 'email') {
      const url = `mailto:${app.studentEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(url, '_blank');
    }
  }

  async logout() { await signOut(this.auth); this.router.navigate(['/login']); }
}