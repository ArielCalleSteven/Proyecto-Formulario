import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { Router } from '@angular/router';
import { Auth, GoogleAuthProvider, signInWithPopup, authState, signInWithEmailAndPassword, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { take } from 'rxjs/operators';

import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule], 
  templateUrl: './login.html', 
})
export class LoginComponent {
  private auth = inject(Auth);
  private router = inject(Router);
  private userService = inject(UserService);

  email: string = '';
  password: string = '';
  isRegistering: boolean = false; 
  isLoading: boolean = false;

  constructor() {
    authState(this.auth).pipe(take(1)).subscribe(user => {
      if (user && user.email) {
        this.checkUserRole(user.email);
      }
    });
  }

  async onSubmit() {
    if (!this.email || !this.password) {
      alert('Por favor ingresa correo y contraseña');
      return;
    }

    this.isLoading = true;

    try {
      if (this.isRegistering) {
        await createUserWithEmailAndPassword(this.auth, this.email, this.password);
        alert('¡Cuenta creada! Bienvenido.');
        this.router.navigate(['/home']);
      } else {
        const credential = await signInWithEmailAndPassword(this.auth, this.email, this.password);
        if (credential.user.email) {
          await this.checkUserRole(credential.user.email);
        }
      }
    } catch (error: any) {
      console.error('Error en autenticación:', error);
      let msg = 'Error en la autenticación';
      if (error.code === 'auth/wrong-password') msg = 'Contraseña incorrecta';
      if (error.code === 'auth/user-not-found') msg = 'Usuario no encontrado';
      if (error.code === 'auth/email-already-in-use') msg = 'Este correo ya está registrado';
      alert(msg);
    } finally {
      this.isLoading = false;
    }
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
      console.error('Error con Google:', error);
      alert('No se pudo iniciar sesión con Google');
      this.isLoading = false;
    }
  }

  async checkUserRole(email: string) {
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
    }
  }
}