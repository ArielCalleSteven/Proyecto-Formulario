import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, query, where, collectionData, doc, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdvisoryService {
  private firestore = inject(Firestore);
  private collectionName = 'appointments';

  createAppointment(appointment: any) {
    const ref = collection(this.firestore, this.collectionName);
    return addDoc(ref, appointment);
  }

  getStudentAppointments(email: string): Observable<any[]> {
    const ref = collection(this.firestore, this.collectionName);
    const q = query(ref, where('studentEmail', '==', email));
    return collectionData(q, { idField: 'id' });
  }

  getProgrammerAppointments(programmerId: string): Observable<any[]> {
    const ref = collection(this.firestore, this.collectionName);
    const q = query(ref, where('programmerId', '==', programmerId));
    return collectionData(q, { idField: 'id' });
  }

  updateAppointmentStatus(id: string, status: string, response: string) {
    const docRef = doc(this.firestore, this.collectionName, id);
    return updateDoc(docRef, {
      status: status,
      programmerResponse: response
    });
  }

deleteAppointment(id: string) {
  const docRef = doc(this.firestore, this.collectionName, id);
  return deleteDoc(docRef);
}

}