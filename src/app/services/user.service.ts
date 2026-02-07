import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Programmer {
  id?: number;
  name: string;
  email: string;
  role: string;
  description?: string;
  photoUrl?: string;
  github?: string;
  linkedin?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.baseUrl}/usuarios`;

  // --- MÉTODOS DE LOGIN ---

  // 🔥 MÉTODO CLAVE 1: Login normal / Registro
  saveStudent(user: any): Observable<any> {
    const payload = {
      email: user.email,
      name: user.displayName || user.name || 'Estudiante',
      role: 'student'
    };
    return this.http.post<any>(`${this.baseUrl}/google`, payload).pipe(
        tap(res => console.log('📦 RESPUESTA LOGIN (RAW):', res)), // Mira esto en consola
        map(response => this.normalizeUser(response)) // <--- AQUÍ SE ARREGLA EL OBJETO
    );
  }

  // 🔥 MÉTODO CLAVE 2: Obtener perfil por email
  getProgrammerByEmail(email: string): Observable<any> {
    const payload = { email: email, name: 'Verificacion' };
    return this.http.post<any>(`${this.baseUrl}/google`, payload).pipe(
        map(response => this.normalizeUser(response))
    );
  }

  // --- MÉTODOS ESTÁNDAR ---
  getProgrammers() { return this.http.get<Programmer[]>(`${this.baseUrl}/programadores`); }
  getProgrammerById(id: number) { return this.http.get<Programmer>(`${this.baseUrl}/${id}`); }
  addProgrammer(p: any) { return this.http.post(`${this.baseUrl}/registro`, p); }
  updateProgrammer(id: number, d: any) { return this.http.put(`${this.baseUrl}/${id}`, d); }
  deleteProgrammer(id: number) { return this.http.delete(`${this.baseUrl}/${id}`); }

  // 🕵️ DETECTIVE DE IDs (El salvador)
  private normalizeUser(response: any): any {
      if (!response) return null;

      // TU BACKEND DEVUELVE: { role: "...", usuario: { id: 1, ... }, token: "..." }
      // Así que primero intentamos sacar los datos de 'usuario'
      const userData = response.usuario || response;

      // Aseguramos que el ID exista y sea número
      const realId = userData.id;

      if (!realId) {
          console.error('🚨 PELIGRO: ID NO ENCONTRADO EN:', userData);
      }

      // Devolvemos un objeto plano y limpio para que el Frontend no sufra
      return {
          ...userData,       // Todos los datos del usuario (nombre, email, etc)
          id: realId,        // El ID garantizado en la raíz
          token: response.token || userData.token // El token garantizado
      };
  }
}