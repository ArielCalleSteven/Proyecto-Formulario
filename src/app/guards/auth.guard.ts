import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { UserService } from '../services/user.service'; 
import { switchMap, take, map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

const ADMIN_EMAIL = 'a.calleduma123@gmail.com'; 

const isProgrammerRole = (user: any): boolean => {
  if (!user || !user.role) return false;
  const role = user.role.toLowerCase().trim();
  return role === 'programmer' || role === 'programador';
};

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
  const userService = inject(UserService);
  const router = inject(Router);

  return authState(auth).pipe(
    take(1),
    switchMap((user) => {
      if (!user) {
        router.navigate(['/login']);
        return of(false);
      }

      if (user.email === ADMIN_EMAIL) {
          router.navigate(['/admin']); 
          return of(false);
      }

      return userService.getProgrammerByEmail(user.email!).pipe(
        map(response => {
           if (isProgrammerRole(response)) {
             return true; 
           }
           router.navigate(['/home']);
           return false;
        }),
        catchError((err) => {
          router.navigate(['/home']);
          return of(false);
        })
      );
    })
  );
};

export const authGuard = () => {
  const auth = inject(Auth);
  const userService = inject(UserService);
  const router = inject(Router);

  return authState(auth).pipe(
    take(1),
    switchMap((user) => {
      if (!user) {
        router.navigate(['/login']);
        return of(false);
      }

      if (user.email === ADMIN_EMAIL) {
        router.navigate(['/admin']);
        return of(false);
      }

      return userService.getProgrammerByEmail(user.email!).pipe(
        map(response => {
          if (isProgrammerRole(response)) {
            router.navigate(['/programmer']); 
            return false; 
          }
          return true;
        }),
        catchError(() => {
          return of(true);
        })
      );
    })
  );
};

export const publicGuard = () => {
  const auth = inject(Auth);
  const userService = inject(UserService);
  const router = inject(Router);

  return authState(auth).pipe(
    take(1),
    switchMap((user) => {
      if (!user) return of(true); 

      const email = user.email;
      
      if (email === ADMIN_EMAIL) {
        router.navigate(['/admin']);
        return of(false);
      }

      return userService.getProgrammerByEmail(email!).pipe(
        map(response => {
          if (isProgrammerRole(response)) {
            router.navigate(['/programmer']);
            return false;
          }
          router.navigate(['/home']);
          return false;
        }),
        catchError(() => {
          router.navigate(['/home']);
          return of(false);
        })
      );
    })
  );
};


export const authenticatedGuard = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  return authState(auth).pipe(
    take(1),
    map(user => {
      if (user) {
        return true;
      }
      router.navigate(['/login']);
      return false;
    })
  );
};