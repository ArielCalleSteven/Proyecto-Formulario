import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth'; 

@Component({
  selector: 'app-portfolio-view',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './portfolio-view.html',
})
export class PortfolioViewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private firestore = inject(Firestore);
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
    }
  }

  loadProgrammerData(id: string) {
    const docRef = doc(this.firestore, 'programmers', id);
    
    docData(docRef).subscribe({
      next: (data: any) => {
        if (data) {
          this.programmer = data;
          
          const projects = data.projects || [];
          this.academicProjects = projects.filter((p: any) => p.category === 'Académico');
          this.workProjects = projects.filter((p: any) => p.category === 'Laboral');

          const currentUserEmail = this.auth.currentUser?.email;
          if (currentUserEmail && data.contact?.email === currentUserEmail) {
            this.isOwner = true;
          }
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error:', err);
        this.isLoading = false;
      }
    });
  }
}