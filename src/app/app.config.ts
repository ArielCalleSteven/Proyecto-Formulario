import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes), 
    provideFirebaseApp(() => initializeApp({ 
      projectId: "portafolio-calle-torres-2025", 
      appId: "1:690325165160:web:01ae71a80a3773baa757dd", 
      storageBucket: "portafolio-calle-torres-2025.firebasestorage.app", 
      apiKey: "AIzaSyDyVg-Z6mZQUhi7dD2Ez22trAs7GfdD0pA", 
      authDomain: "portafolio-calle-torres-2025.firebaseapp.com", 
      messagingSenderId: "690325165160" 
    })), 
    provideAuth(() => getAuth()), 
    provideFirestore(() => getFirestore())
  ]
};