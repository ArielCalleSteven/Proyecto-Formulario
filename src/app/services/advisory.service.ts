import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdvisoryService {
  private http = inject(HttpClient);
  
  private baseUrl = `${environment.baseUrl}/asesorias`;

  createAppointment(appointment: any): Observable<any> {
    return this.http.post(this.baseUrl, appointment);
  }

  getStudentAppointments(email: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/estudiante/email/${email}`);
  }

  getProgrammerAppointments(programmerId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/programador/${programmerId}`);
  }

  updateAppointmentStatus(id: number, status: string, response: string): Observable<any> {
    const payload = { status: status, programmerResponse: response };
    return this.http.patch(`${this.baseUrl}/${id}/responder`, payload);
  }

  deleteAppointment(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
  
  downloadReport(programmerId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${programmerId}/reporte-pdf`, { responseType: 'blob' });
  }
}