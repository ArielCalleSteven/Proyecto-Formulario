import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, query, where, getDocs } from '@angular/fire/firestore';
import { Project } from '../models/project.interface';
import { from } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private firestore = inject(Firestore);
  
  private projectsCollection = collection(this.firestore, 'projects');

  addProject(project: Project) {
    return from(addDoc(this.projectsCollection, project));
  }


  getProjectsByProgrammer(programmerId: string) {
    const q = query(this.projectsCollection, where('programmerId', '==', programmerId));
    return from(getDocs(q));
  }
}