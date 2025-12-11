import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Auth } from '@angular/fire/auth'; 
import { UserService } from '../../services/user.service'; 

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

  async loadProgrammerData(id: string) {
    try {
      const docSnap = await this.userService.getProgrammerById(id);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        this.programmer = { id: docSnap.id, ...data };

        const projects = this.programmer.projects || [];
        this.academicProjects = projects.filter((p: any) => p.category === 'Académico');
        this.workProjects = projects.filter((p: any) => p.category === 'Laboral');

        const currentUserEmail = this.auth.currentUser?.email;
        if (currentUserEmail && data['contact']?.email === currentUserEmail) {
          this.isOwner = true;
        }
      } else {
        console.error('Programador no encontrado');
        this.router.navigate(['/home']);
      }
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      this.isLoading = false;
    }
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