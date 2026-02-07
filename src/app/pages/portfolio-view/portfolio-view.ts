import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Auth } from '@angular/fire/auth'; 
import { UserService } from '../../services/user.service'; 
import { ProjectService } from '../../services/project.service'; 

@Component({
  selector: 'app-portfolio-view',
  standalone: true,
  imports: [CommonModule, RouterLink], 
  templateUrl: './portfolio-view.html',
})
export class PortfolioViewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private userService = inject(UserService);
  private projectService = inject(ProjectService); 
  private auth = inject(Auth); 

  programmer: any = null;
  
  academicProjects: any[] = [];
  workProjects: any[] = [];
  
  isLoading: boolean = true;
  isOwner: boolean = false; 

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadProgrammerData(id);
    } else {
      this.router.navigate(['/home']);
    }
  }

  loadProgrammerData(id: string) {
    const userId = Number(id); 

    this.userService.getProgrammerById(userId).subscribe({
      next: (user: any) => {

        this.programmer = {
          ...user,
          contact: {
            email: user.email,
            github: user.github,
            linkedin: user.linkedin
          }
        };

        const currentUserEmail = this.auth.currentUser?.email;
        if (currentUserEmail && user.email === currentUserEmail) {
          this.isOwner = true;
        }

        this.loadProjects(userId);
      },
      error: (err) => {
        console.error('Programador no encontrado:', err);
        this.router.navigate(['/home']);
      }
    });
  }

  loadProjects(userId: number) {
    this.projectService.getProjectsByProgrammer(userId).subscribe({
      next: (projects: any[]) => {
        const processedProjects = projects.map(p => ({
          ...p,
          tech: p.tech ? p.tech.split(',').map((t: string) => t.trim()) : [] 
        }));

        this.academicProjects = processedProjects.filter((p: any) => p.category === 'Académico');
        this.workProjects = processedProjects.filter((p: any) => p.category === 'Laboral');
        
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando proyectos:', err);
        this.isLoading = false;
      }
    });
  }

  hasCategory(category: string): boolean {
    if (category === 'Académico') return this.academicProjects.length > 0;
    if (category === 'Laboral') return this.workProjects.length > 0;
    return false;
  }

  notifyProgrammer() {
    if (!this.programmer?.contact?.email) {
      alert('Este usuario no tiene correo público.');
      return;
    }
    
    const subject = `Contacto profesional: ${this.programmer.name}`;
    const body = `Hola ${this.programmer.name},\n\nVi tu portafolio en la Plataforma Estudiantil y me gustaría contactarte para...`;
    
    const url = `mailto:${this.programmer.contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, '_blank');
  }
}