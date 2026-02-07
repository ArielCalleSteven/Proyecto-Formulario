import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { Router } from '@angular/router';
import { Auth, GoogleAuthProvider, signInWithPopup, authState, sendPasswordResetEmail, signInWithEmailAndPassword, createUserWithEmailAndPassword } from '@angular/fire/auth';
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

  // Variables para la alerta personalizada
  isAlertOpen: boolean = false;
  alertTitle: string = '';
  alertMessage: string = '';
  alertType: 'success' | 'error' | 'warning' = 'error';
  onAlertCloseCallback: () => void = () => {}; 

  constructor() {
    authState(this.auth).pipe(take(1)).subscribe(user => {
      // Solo intentamos redirigir si ya hay sesión y NO tenemos ID guardado
      if (user && user.email && !localStorage.getItem('userId')) {
        this.checkUserRoleInBackend(user.email, user.displayName || 'Usuario');
      }
    });
  }

  // --- MÉTODOS DE ALERTA ---
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

  // --- LOGIN Y REGISTRO ---
  async onSubmit() {
    if (!this.email || !this.password) {
      this.showCustomAlert('Atención', 'Por favor ingresa correo y contraseña', 'warning');
      return;
    }

    this.isLoading = true;

    try {
      if (this.isRegistering) {
        // Registro
        const credential = await createUserWithEmailAndPassword(this.auth, this.email, this.password);
        if (credential.user && credential.user.email) {
            const newUser = {
                email: credential.user.email,
                name: 'Estudiante Nuevo', 
                role: 'student'
            };
            this.checkUserRoleInBackend(newUser.email, newUser.name);
        }
      } else {
        // Login
        const credential = await signInWithEmailAndPassword(this.auth, this.email, this.password);
        if (credential.user.email) {
          this.checkUserRoleInBackend(credential.user.email, 'Usuario');
        }
      }
    } catch (error: any) {
      console.error('Error Auth:', error); 
      let msg = 'Error de acceso.';
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') msg = 'Contraseña o correo incorrectos.';
      if (error.code === 'auth/user-not-found') msg = 'Usuario no encontrado.';
      if (error.code === 'auth/email-already-in-use') msg = 'El correo ya existe.';
      
      this.showCustomAlert('Error', msg, 'error');
      this.isLoading = false;
    }
  }

  async loginWithGoogle() {
    this.isLoading = true;
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(this.auth, provider);
      
      if (result.user.email) {
        this.checkUserRoleInBackend(result.user.email, result.user.displayName || 'Usuario Google');
      }
    } catch (error) {
      console.error('Error Google:', error);
      this.showCustomAlert('Error', 'No se pudo iniciar sesión con Google', 'error');
      this.isLoading = false;
    }
  }

  // --- LÓGICA CRÍTICA DE BACKEND ---
  checkUserRoleInBackend(email: string, name: string) {
    const ADMIN_EMAIL = 'a.calleduma123@gmail.com'; 
    const userPayload = { email: email, name: name };

    this.userService.saveStudent(userPayload).subscribe({
        next: (user: any) => {
            console.log('✅ USUARIO RECIBIDO:', user);
            
            // 1. Guardar Token
            if (user.token) localStorage.setItem('authToken', user.token);

            // 2. Guardar ID (Crucial para que el Dashboard no falle)
            if (user.id) {
                localStorage.setItem('userId', user.id.toString());
                console.log('💾 ID Guardado:', user.id);
            } else {
                // Si no hay ID, NO redirigimos, mostramos error
                this.showCustomAlert('Error de Datos', 'El sistema no pudo recuperar tu ID de usuario.', 'error');
                this.isLoading = false;
                return;
            }

            // 3. Redirección
            let rawRole = user.role || user.rol || '';
            const role = String(rawRole).toLowerCase().trim(); 

            if (email === ADMIN_EMAIL || role === 'admin') {
                this.router.navigate(['/admin']);
            } 
            else if (role === 'programmer' || role === 'programador') {
                this.router.navigate(['/programmer']);
            } 
            else {
                this.router.navigate(['/home']);
            }
        },
        error: (err) => {
            console.error('❌ Error Backend:', err);
            this.showCustomAlert('Error de Conexión', 'No se pudo contactar con el servidor.', 'error');
            this.isLoading = false;
        }
    });
  }

  // 🔥 ESTA ES LA FUNCIÓN QUE TE FALTABA Y CAUSABA EL ERROR EN BUILD
  async recoverPassword() {
    if (!this.email) {
      this.showCustomAlert('Atención', 'Por favor, escribe tu correo en la casilla primero.', 'warning');
      return;
    }
    try {
      await sendPasswordResetEmail(this.auth, this.email);
      this.showCustomAlert('Enviado', 'Revisa tu bandeja de entrada para restablecer tu contraseña.', 'success');
    } catch (error: any) {
      console.error(error);
      this.showCustomAlert('Error', 'No se pudo enviar el correo de recuperación.', 'error');
    }
  }
}