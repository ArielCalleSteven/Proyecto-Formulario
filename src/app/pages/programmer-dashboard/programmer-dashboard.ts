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

  visibleProjects: any[] = []; 
  currentFilter: string = 'todos'; 

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

          this.filterProjects('todos');

          this.loadAppointments(this.myProfile.id);
        }
      } catch (error) {
        console.error('Error cargando perfil:', error);
      }
    }
    this.isLoading = false;
  }

  filterProjects(category: string) {
    this.currentFilter = category;

    if (!this.myProfile || !this.myProfile.projects) {
      this.visibleProjects = [];
      return;
    }

    if (category === 'todos') {
      this.visibleProjects = [...this.myProfile.projects]; 
    } else {
      this.visibleProjects = this.myProfile.projects.filter((p: any) => p.category === category);
    }
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

  closeCustomAlert() {
    this.isAlertOpen = false;
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
      this.showAlert('⚠️ MENSAJE REQUERIDO', 'Por favor escribe un mensaje de confirmación o justificación.', 'warning');
      return;
    }

    try {
      await this.advisoryService.updateAppointmentStatus(app.id, status, app.replyMessage);
      this.showAlert('¡LISTO! 🚀', `La solicitud ha sido ${status} correctamente.`, 'success');
    } catch (error) {
      console.error('Error actualizando cita:', error);
      this.showAlert('ERROR', 'No se pudo actualizar la cita.', 'error');
    }
  }

  async saveProject() {
    if (!this.newProject.title || !this.newProject.description) { 
      this.showAlert('CAMPOS INCOMPLETOS', 'El título y la descripción son obligatorios.', 'warning'); 
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
      
      this.filterProjects(this.currentFilter);

      this.closeModal();
      this.showAlert('¡ÉXITO!', 'El proyecto se ha guardado correctamente.', 'success');

    } catch (error) { 
      console.error(error); 
      this.showAlert('ERROR', 'Hubo un problema al guardar el proyecto.', 'error'); 
    }
  }

  askDeleteProject(index: number) {
    this.showAlert(
      '¿ESTÁS SEGURO?', 
      'Esta acción eliminará el proyecto permanentemente. No se puede deshacer.', 
      'warning', 
      () => this.executeDeleteProject(index) 
    );
  }

  async executeDeleteProject(index: number) {
    try { 
      
      const projectToDelete = this.visibleProjects[index]; 
      
      const realIndex = this.myProfile.projects.indexOf(projectToDelete);
      if (realIndex > -1) {
          this.myProfile.projects.splice(realIndex, 1);
      }

      await this.projectService.updateUserProjects(this.myProfile.id, this.myProfile.projects);
      
      this.filterProjects(this.currentFilter);

      this.showAlert('ELIMINADO', 'Proyecto borrado del repositorio.', 'success');
    } catch (error) { 
      console.error(error); 
      this.showAlert('ERROR', 'No se pudo borrar el proyecto.', 'error');
    } 
  }

  openModal() { this.isEditingProject = false; this.resetForm(); this.isModalOpen = true; }
  
  openEditModal(project: any, index: number) { 
    this.isEditingProject = true; 
    
    this.currentProjectIndex = index; 
    const realIndex = this.myProfile.projects.indexOf(project);
    this.currentProjectIndex = realIndex;

    this.newProject = { 
        title: project.title, 
        description: project.description, 
        category: project.category, 
        role: project.role, 
        techInput: project.tech ? project.tech.join(', ') : '', 
        repo: project.repo || '', 
        demo: project.demo || '' 
    }; 
    this.isModalOpen = true; 
  }
  
  closeModal() { this.isModalOpen = false; this.resetForm(); }
  
  resetForm() { 
    this.isEditingProject = false; 
    this.currentProjectIndex = null; 
    this.newProject = { title: '', description: '', category: 'Académico', role: 'Frontend', techInput: '', repo: '', demo: '' }; 
  }

  askClearHistory() {
    const completedApps = this.appointments.filter(a => a.status !== 'Pendiente');

    if (completedApps.length === 0) {
      this.showAlert('NADA QUE BORRAR', 'Solo se borran las solicitudes Aprobadas o Rechazadas. Las pendientes se conservan.', 'warning');
      return;
    }

    this.showAlert(
      '¿LIMPIAR HISTORIAL?', 
      `Se eliminarán ${completedApps.length} solicitudes procesadas. Esta acción no se puede deshacer.`, 
      'warning', 
      () => this.executeClearHistory(completedApps)
    );
  }

  async executeClearHistory(appsToDelete: any[]) {
    try {
      this.isLoading = true; 
      
      const deletePromises = appsToDelete.map(app => 
        this.advisoryService.deleteAppointment(app.id)
      );

      await Promise.all(deletePromises);

      this.loadAppointments(this.myProfile.id);
      
      this.isLoading = false;
      this.showAlert('HISTORIAL LIMPIO', 'Se han eliminado las solicitudes antiguas.', 'success');
      
    } catch (error) {
      console.error(error);
      this.isLoading = false;
      this.showAlert('ERROR', 'No se pudieron borrar algunos elementos.', 'error');
    }
  }

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