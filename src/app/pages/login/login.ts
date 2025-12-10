import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router'; // <--- Para navegar
import { Auth, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { Firestore, collection, query, where, getDocs } from '@angular/fire/firestore'; // <--- Para buscar en la BD

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
})
export class LoginComponent {
  private auth = inject(Auth);
  private router = inject(Router);
  private firestore = inject(Firestore);

  email = '';
  password = '';
  isRegistering = false;

  async loginWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(this.auth, provider);
      console.log('✅ Google Login:', result.user.email);
      
      this.checkUserRole(result.user.email); 

    } catch (error) {
      console.error('Error Google:', error);
    }
  }


async onSubmit() {
    try {
      if (this.isRegistering) {
        const credential = await createUserWithEmailAndPassword(this.auth, this.email, this.password);
        

        await this.checkUserRole(credential.user.email); 

      } else {
        const credential = await signInWithEmailAndPassword(this.auth, this.email, this.password);
        
        await this.checkUserRole(credential.user.email);
      }
    } catch (error) {
      console.error('Error Auth:', error);
      alert('Error: Revisa que el correo esté bien o la contraseña tenga 6 caracteres.');
    }
  }


  async checkUserRole(email: string | null) {
    if (!email) return;

    const ADMIN_EMAIL = 'a.calleduma123@gmail.com'; 

    if (email === ADMIN_EMAIL) {
      console.log('👑 Bienvenido Admin');
      this.router.navigate(['/admin']);
      return;
    }

    const programmersRef = collection(this.firestore, 'programmers');
    const q = query(programmersRef, where('contact.email', '==', email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      console.log('💻 Bienvenido Programador');
      this.router.navigate(['/programmer']);
      return;
    }

    console.log('🎓 Bienvenido Estudiante');
    this.router.navigate(['/home']);
  }
}