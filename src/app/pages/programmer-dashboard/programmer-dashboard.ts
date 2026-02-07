import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms'; 
import { Auth, signOut, onAuthStateChanged } from '@angular/fire/auth';
import { Chart, registerables } from 'chart.js';

// Registramos los gráficos
Chart.register(...registerables);

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

  // Variables de Estado
  isLoading: boolean = true; 
  myProfile: any = null;
  
  // Datos
  projectStats = { total: 0, academico: 0, laboral: 0 };
  stats = { approved: 0, rejected: 0, pending: 0 };
  appointments: any[] = [];
  visibleProjects: any[] = []; 
  currentFilter: string = 'todos'; 

  // Modales
  isModalOpen: boolean = false;
  isEditingProject: boolean = false;
  currentProjectId: number | null = null; 
  newProject = {
    title: '', description: '', category: 'Académico', role: 'Frontend',
    techInput: '', repo: '', demo: ''
  };

  // Alertas
  isAlertOpen: boolean = false;
  alertTitle: string = '';
  alertMessage: string = '';
  alertType: 'success' | 'error' | 'warning' = 'success';
  alertCallback: () => void = () => {}; 

  myChart: any = null;

  ngOnInit() {
    console.log('🔄 INICIANDO DASHBOARD - VERSIÓN BLINDADA'); // Busca esto en la consola

    // 1. LEER ID DEL STORAGE
    let storedId = localStorage.getItem('userId');
    console.log('🔍 ID ENCONTRADO EN STORAGE:', storedId);

    // 2. FILTRO ANTI-BASURA (Aquí matamos el error 403)
    if (!storedId || storedId === 'undefined' || storedId === 'NaN' || storedId === 'null') {
        console.warn('⛔ ID INVÁLIDO DETECTADO. ABORTANDO CARGA DE DATOS.');
        this.isLoading = false; // Apagamos el cargador para que no se quede pegado
        // NO LLAMAMOS A LOADPROJECTS
    } else {
        // Solo si es válido llamamos
        const idNum = Number(storedId);
        if (!isNaN(idNum) && idNum > 0) {
            this.loadProjects(idNum);
            this.loadAppointments(idNum);
        }
    }

    // 3. VERIFICAR SI HAY SESIÓN ACTIVA
    onAuthStateChanged(this.auth, (user) => {
      if (user?.email) {
        this.loadProfile(user.email);
      } else {
        if (!localStorage.getItem('authToken')) {
            this.router.navigate(['/login']);
        }
      }
    });
  }

  loadProfile(email: string) {
    this.userService.getProgrammerByEmail(email).subscribe({
      next: (user: any) => {
        // Verificamos si el usuario real tiene ID
        if (user && user.id && !isNaN(Number(user.id))) {
          localStorage.setItem('userId', user.id.toString());
          
          let parsedAvail = [];
          if (user.availability) {
            try { 
                parsedAvail = typeof user.availability === 'string' 
                    ? JSON.parse(user.availability) : user.availability; 
            } catch (e) { console.error(e); }
          }
          
          this.myProfile = { ...user, availability: parsedAvail, projects: user.projects || [] };
          this.loadProjects(user.id);
          this.loadAppointments(user.id);
        } else {
          console.error('❌ PERFIL SIN ID VÁLIDO:', user);
          this.isLoading = false;
        }
      },
      error: (err) => {
        console.error('❌ Error al cargar perfil:', err);
        this.isLoading = false;
      }
    });
  }

  loadProjects(userId: any) {
    // 🛑 ESCUDO FINAL: Si llega basura aquí, no sale la petición
    if (!userId || String(userId) === 'undefined' || String(userId) === 'NaN') {
        console.error('🛑 INTENTO DE CARGA BLOQUEADO: ID es', userId);
        this.isLoading = false;
        return; 
    }

    this.projectService.getProjectsByProgrammer(Number(userId)).subscribe({
      next: (data: any[]) => {
        this.visibleProjects = data.map(p => ({
            ...p,
            tech: p.tech ? p.tech.split(',').map((t: string) => t.trim()) : []
        }));
        if (this.myProfile) this.myProfile.projects = [...this.visibleProjects];

        this.projectStats.total = data.length;
        this.projectStats.academico = data.filter(p => p.category === 'Académico').length;
        this.projectStats.laboral = data.filter(p => p.category === 'Laboral').length;
        
        this.filterProjects(this.currentFilter);
        this.isLoading = false; 
      },
      error: (err) => {
          console.error('Error Projects:', err);
          this.isLoading = false; // Apagamos loading aunque falle
      }
    });
  }

  loadAppointments(programmerId: any) {
    // 🛑 ESCUDO FINAL
    if (!programmerId || String(programmerId) === 'undefined' || String(programmerId) === 'NaN') {
        this.isLoading = false;
        return;
    }

    this.advisoryService.getProgrammerAppointments(Number(programmerId)).subscribe({
        next: (data) => {
            this.stats = { approved: 0, rejected: 0, pending: 0 };
            this.appointments = data.map(app => {
                let estado = app.status === 'PENDIENTE' ? 'Pendiente' : app.status;
                if (estado === 'Aprobada') this.stats.approved++;
                else if (estado === 'Rechazada') this.stats.rejected++;
                else this.stats.pending++; 

                return { ...app, status: estado, replyMessage: '', studentEmail: app.estudiante?.email || 'Desconocido' };
            });
            setTimeout(() => this.renderChart(), 100);
            this.isLoading = false; 
        },
        error: (err) => {
            console.error('Error Citas:', err);
            this.isLoading = false; 
        }
    });
  }

  // --- MÉTODOS VISUALES (HTML) ---

  isScheduleValid(app: any): boolean {
    if (!this.myProfile?.availability) return true;
    return true; 
  }

  showAlert(title: string, msg: string, type: 'success' | 'error' | 'warning', cb?: () => void) {
    this.alertTitle = title; this.alertMessage = msg; this.alertType = type;
    this.alertCallback = cb || (() => {}); this.isAlertOpen = true;
  }
  closeCustomAlert() { this.isAlertOpen = false; }
  onAlertConfirm() { this.isAlertOpen = false; this.alertCallback(); }
  onAlertCancel() { this.isAlertOpen = false; }

  openModal() { this.isEditingProject = false; this.resetForm(); this.isModalOpen = true; }
  closeModal() { this.isModalOpen = false; this.resetForm(); }
  
  openEditModal(p: any, i: number) { 
    this.isEditingProject = true; this.currentProjectId = p.id; 
    const techStr = Array.isArray(p.tech) ? p.tech.join(', ') : (p.tech || '');
    this.newProject = { ...p, techInput: techStr }; 
    this.isModalOpen = true; 
  }
  resetForm() { 
    this.isEditingProject = false; this.currentProjectId = null; 
    this.newProject = { title: '', description: '', category: 'Académico', role: 'Frontend', techInput: '', repo: '', demo: '' }; 
  }

  saveProject() {
    const pid = this.myProfile?.id || Number(localStorage.getItem('userId'));
    if (!pid) return;
    const dto = { ...this.newProject, tech: this.newProject.techInput, programadorId: pid };
    const obs = (this.isEditingProject && this.currentProjectId) ? this.projectService.updateProject(this.currentProjectId, dto) : this.projectService.createProject(dto);
    obs.subscribe({
        next: () => { this.closeModal(); this.loadProjects(pid); this.showAlert('ÉXITO', 'Guardado.', 'success'); },
        error: () => this.showAlert('ERROR', 'Fallo.', 'error')
    });
  }

  askDeleteProject(i: number) {
    const p = this.visibleProjects[i];
    this.showAlert('¿BORRAR?', p.title, 'warning', () => this.executeDeleteProject(p.id));
  }

  executeDeleteProject(id: number) {
      this.projectService.deleteProject(id).subscribe({
          next: () => this.loadProjects(this.myProfile.id),
          error: () => this.showAlert('ERROR', 'Fallo.', 'error')
      });
  }

  respondAppointment(app: any, status: 'Aprobada' | 'Rechazada') {
    app.replyMessage = app.replyMessage || (status === 'Aprobada' ? "Aceptada" : "Rechazada");
    this.advisoryService.updateAppointmentStatus(app.id, status, app.replyMessage).subscribe({
        next: () => { this.loadAppointments(this.myProfile.id); this.showAlert('LISTO', `Cita ${status}`, 'success'); },
        error: () => this.showAlert('ERROR', 'Fallo.', 'error')
    });
  }

  askClearHistory() {
    const completed = this.appointments.filter(a => a.status !== 'Pendiente');
    if (completed.length > 0) this.showAlert('LIMPIAR', '¿Borrar?', 'warning', () => this.executeClearHistory(completed));
  }

  executeClearHistory(apps: any[]) {
      this.isLoading = true;
      let count = 0;
      apps.forEach(a => {
          this.advisoryService.deleteAppointment(a.id).subscribe({
              next: () => { count++; if(count === apps.length) this.loadAppointments(this.myProfile.id); },
              error: () => { count++; if(count === apps.length) this.isLoading = false; }
          });
      });
  }

  filterProjects(cat: string) {
    this.currentFilter = cat;
    if (!this.myProfile?.projects) return;
    this.visibleProjects = (cat === 'todos') ? [...this.myProfile.projects] : this.myProfile.projects.filter((p: any) => p.category === cat);
  }

  renderChart() {
    const ctx = document.getElementById('myChart') as HTMLCanvasElement;
    if (!ctx) return;
    if (this.myChart) this.myChart.destroy();
    this.myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Aprobadas', 'Rechazadas', 'Pendientes'],
            datasets: [{ data: [this.stats.approved, this.stats.rejected, this.stats.pending], backgroundColor: ['#22c55e', '#ef4444', '#eab308'] }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '70%' }
    });
  }

  notifyStudent(app: any, method: 'whatsapp' | 'email') {
    const body = `Hola! Soy ${this.myProfile?.name}. Tu solicitud está ${app.status}.`;
    const url = method === 'whatsapp' ? `https://wa.me/?text=${encodeURIComponent(body)}` : `mailto:${app.studentEmail}?subject=Respuesta&body=${encodeURIComponent(body)}`;
    window.open(url, '_blank');
  }

  async logout() { await signOut(this.auth); localStorage.clear(); this.router.navigate(['/login']); }

  generatePDF() {
    this.isLoading = true;
    this.advisoryService.downloadReport(this.myProfile.id).subscribe({
        next: (blob) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Reporte.pdf`; a.click(); this.isLoading = false; },
        error: () => { this.isLoading = false; this.showAlert('ERROR', 'Error PDF.', 'error'); }
    });
  }

  verPortafolio() { 
      if (this.myProfile?.id) window.open(this.router.serializeUrl(this.router.createUrlTree(['/portfolio', this.myProfile.id])), '_blank');
  }
}