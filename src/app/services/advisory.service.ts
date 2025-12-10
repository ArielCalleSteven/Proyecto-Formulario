import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, query, where, getDocs, doc, updateDoc } from '@angular/fire/firestore';
import { Advisory } from '../models/advisory.interface';
import { from } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdvisoryService {
  private firestore = inject(Firestore);
  private advisoryCollection = collection(this.firestore, 'advisories');


  requestAdvisory(advisory: Advisory) {
    advisory.status = 'Pendiente'; 
    return from(addDoc(this.advisoryCollection, advisory));
  }

  getAdvisoriesForProgrammer(programmerId: string) {
    const q = query(this.advisoryCollection, where('programmerId', '==', programmerId));
    return from(getDocs(q));
  }

  updateStatus(advisoryId: string, newStatus: 'Aprobada' | 'Rechazada', message: string) {
    const docRef = doc(this.firestore, 'advisories', advisoryId);
    return from(updateDoc(docRef, { 
      status: newStatus,
      responseMessage: message 
    }));
  }
}