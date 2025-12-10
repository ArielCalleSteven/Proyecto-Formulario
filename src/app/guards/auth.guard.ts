import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { Firestore, collection, query, where, getDocs } from '@angular/fire/firestore';
import { switchMap, take, map } from 'rxjs/operators';
import { of } from 'rxjs';

const ADMIN_EMAIL = 'a.calleduma123@gmail.com'; 

export const adminGuard = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  return authState(auth).pipe(
    take(1),
    map(user => {
      if (!user) {
        router.navigate(['/login']);
        return false;
      }
      
      if (user.email === ADMIN_EMAIL) {
        return true;
      }

      router.navigate(['/home']);
      return false;
    })
  );
};


export const programmerGuard = () => {
  const auth = inject(Auth);
  const firestore = inject(Firestore);
  const router = inject(Router);

  return authState(auth).pipe(
    take(1),
    switchMap(async (user) => {
      if (!user) {
        router.navigate(['/login']);
        return false;
      }

      if (user.email === ADMIN_EMAIL) return true;

      const ref = collection(firestore, 'programmers');
      const q = query(ref, where('contact.email', '==', user.email));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        return true; 
      }

      router.navigate(['/home']);
      return false;
    })
  );
};


export const authGuard = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  return authState(auth).pipe(
    take(1),
    map(user => {
      if (user) return true;
      router.navigate(['/login']);
      return false;
    })
  );
};


export const publicGuard = () => {
  const auth = inject(Auth);
  const firestore = inject(Firestore);
  const router = inject(Router);

  return authState(auth).pipe(
    take(1),
    switchMap(async (user) => {
      if (!user) return true; 

      const email = user.email;
      
      if (email === ADMIN_EMAIL) {
        router.navigate(['/admin']);
        return false;
      }

      const ref = collection(firestore, 'programmers');
      const q = query(ref, where('contact.email', '==', email));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        router.navigate(['/programmer']);
        return false;
      }

      router.navigate(['/home']);
      return false;
    })
  );
};