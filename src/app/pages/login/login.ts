import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Auth, GoogleAuthProvider, signInWithPopup, authState } from '@angular/fire/auth';
import { map, take } from 'rxjs/operators';

import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.html',
})
export class LoginComponent {
  private auth = inject(Auth);
  private router = inject(Router);
  
  private userService = inject(UserService);

  isLoading: boolean = false;

  constructor() {
    authState(this.auth).pipe(take(1)).subscribe(user => {
      if (user) {
        this.checkUserRole(user.email);
      }
    });
  }

  async loginWithGoogle() {
    this.isLoading = true;
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(this.auth, provider);
      
      if (result.user.email) {
        await this.checkUserRole(result.user.email);
      }
    } catch (error) {
      console.error('Error en login:', error);
      alert('Error al iniciar sesión con Google');
      this.isLoading = false;
    }
  }

  async checkUserRole(email: string | null) {
    if (!email) return;

    const ADMIN_EMAIL = 'a.calleduma123@gmail.com'; 
    
    if (email === ADMIN_EMAIL) {
      this.router.navigate(['/admin']);
      return;
    }

    try {
      const snapshot = await this.userService.getProgrammerByEmail(email);

      if (!snapshot.empty) {
        this.router.navigate(['/programmer']);
      } else {
        this.router.navigate(['/home']);
      }
    } catch (error) {
      console.error('Error verificando rol:', error);
      this.router.navigate(['/home']); 
    } finally {
      this.isLoading = false;
    }
  }
}