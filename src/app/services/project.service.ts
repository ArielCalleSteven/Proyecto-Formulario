import { Injectable, inject } from '@angular/core';
import { Firestore, doc, updateDoc } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private firestore = inject(Firestore);

  updateUserProjects(userId: string, projects: any[]) {
    const docRef = doc(this.firestore, 'programmers', userId);
    return updateDoc(docRef, { projects: projects });
  }
}