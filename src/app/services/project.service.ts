import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.baseUrl}/proyectos`;

  getProjectsByProgrammer(programmerId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/programador/${programmerId}`);
  }

  createProject(project: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/crear`, project);
  }


  updateProject(id: number, project: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, project);
  }

  deleteProject(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
  

  updateUserProjects(userId: string, projects: any[]) {
     console.warn('Este método usaba Firebase. Ahora debes usar create/update/deleteProject individualmente.');
     return new Observable(observer => observer.complete());
  }
}