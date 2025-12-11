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

  isAlertOpen: boolean = false;
  alertTitle: string = '';
  alertMessage: string = '';
  alertType: 'success' | 'error' | 'warning' = 'error';
  onAlertCloseCallback: () => void = () => {}; 

  constructor() {
    authState(this.auth).pipe(take(1)).subscribe(user => {
      if (user && user.email) {
        this.checkUserRole(user.email);
      }
    });
  }

  showCustomAlert(title: string, message: string, type: 'success' | 'error' | 'warning', onClose?: () => void) {
    this.alertTitle = title;
    this.alertMessage = message;
    this.alertType = type;
    this.onAlertCloseCallback = onClose || (() => {}); 
    this.isAlertOpen = true;
  }

  closeCustomAlert() {
    this.isAlertOpen = false;
    this.onAlertCloseCallback(); 
  }

  async onSubmit() {
    if (!this.email || !this.password) {
      this.showCustomAlert('Campos Incompletos', 'Por favor ingresa correo y contraseña', 'warning');
      return;
    }

    this.isLoading = true;

    try {
      if (this.isRegistering) {
        const credential = await createUserWithEmailAndPassword(this.auth, this.email, this.password);
        
        if (credential.user && credential.user.email) {
          
          const programmerSnapshot = await this.userService.getProgrammerByEmail(credential.user.email);
          
          if (programmerSnapshot.empty) {
            await this.userService.saveStudent(credential.user);
          } else {
            console.log('Programador detectado durante el registro.');
          }

          this.showCustomAlert(
            '¡Bienvenido!', 
            'Tu cuenta ha sido configurada exitosamente.', 
            'success', 
            () => this.checkUserRole(credential.user.email!) 
          );
        }

      } else {
        const credential = await signInWithEmailAndPassword(this.auth, this.email, this.password);
        if (credential.user.email) {
          await this.checkUserRole(credential.user.email);
        }
      }
    } catch (error: any) {
      console.error('Error COMPLETO:', error); 
      
      let msg = 'Ocurrió un error inesperado.';
      
      switch (error.code) {
        case 'auth/wrong-password':
        case 'auth/user-not-found':
        case 'auth/invalid-credential': 
          msg = 'Correo o contraseña incorrectos.';
          break;
        case 'auth/email-already-in-use':
          msg = 'Este correo ya está registrado. Por favor inicia sesión.';
          break;
        case 'auth/invalid-email':
          msg = 'El formato del correo no es válido.';
          break;
        case 'auth/weak-password':
          msg = 'La contraseña debe tener al menos 6 caracteres.';
          break;
        case 'auth/too-many-requests': 
          msg = 'Demasiados intentos fallidos. Tu cuenta ha sido bloqueada temporalmente. Intenta más tarde.';
          break;
        case 'auth/user-disabled':
          msg = 'Esta cuenta ha sido inhabilitada.';
          break;
        default:
          msg = `Error desconocido: ${error.code}`;
          break;
      }

      this.showCustomAlert('Error de Acceso', msg, 'error');
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
      this.showCustomAlert('Error', 'No se pudo iniciar sesión con Google', 'error');
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