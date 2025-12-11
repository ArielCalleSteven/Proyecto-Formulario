import { Injectable, inject } from '@angular/core';
// 👇 AGREGUÉ 'getDoc' AQUÍ QUE FALTABA
import { Firestore, collection, collectionData, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs, setDoc, getDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface Programmer {
  id?: string;
  name: string;
  specialty: string;
  description?: string;
  photoUrl?: string;
  contact: any;
  availability?: any[];
  projects?: any[];
}

@Injectable({
  providedIn: 'root' 
})
export class UserService {
  private firestore = inject(Firestore);
  private collectionName = 'programmers';

  getProgrammers(): Observable<Programmer[]> {
    const ref = collection(this.firestore, this.collectionName);
    return collectionData(ref, { idField: 'id' }) as Observable<Programmer[]>;
  }

  getProgrammerById(id: string) {
    const docRef = doc(this.firestore, this.collectionName, id);
    return getDoc(docRef);
  }

  addProgrammer(programmer: Programmer) {
    const ref = collection(this.firestore, this.collectionName);
    return addDoc(ref, programmer);
  }

  updateProgrammer(id: string, data: any) {
    const docRef = doc(this.firestore, this.collectionName, id);
    return updateDoc(docRef, data);
  }

  deleteProgrammer(id: string) {
    const docRef = doc(this.firestore, this.collectionName, id);
    return deleteDoc(docRef);
  }

  getProgrammerByEmail(email: string) {
    const ref = collection(this.firestore, this.collectionName);
    const q = query(ref, where('contact.email', '==', email));
    return getDocs(q);
  }

  saveStudent(user: any) {
    const docRef = doc(this.firestore, 'students', user.uid);
    
    return setDoc(docRef, {
      uid: user.uid,
      email: user.email,
      role: 'student', 
      createdAt: new Date()
    }, { merge: true }); 
  }
}