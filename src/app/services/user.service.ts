import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, getDocs } from '@angular/fire/firestore';
import { Programmer } from '../models/programmer.interface';
import { from } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private firestore = inject(Firestore);
  
  private programmersCollection = collection(this.firestore, 'programmers');

  addProgrammer(programmer: Programmer) {
    return from(addDoc(this.programmersCollection, programmer));
  }

  getProgrammers() {
    return from(getDocs(this.programmersCollection));
  }
}