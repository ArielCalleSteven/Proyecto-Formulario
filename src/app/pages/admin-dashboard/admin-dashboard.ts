import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { Router } from '@angular/router';
import { Auth, signOut } from '@angular/fire/auth';
import { UserService } from '../../services/user.service'; 

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule], 
  templateUrl: './admin-dashboard.html', 
})
export class AdminComponent {
  private userService = inject(UserService); 
  private auth = inject(Auth);
  private router = inject(Router);

  // Variables de datos
  allProgrammers: any[] = [];      
  filteredProgrammers: any[] = []; 
  isLoading: boolean = true;      
  
  // Variables de interfaz / Modales
  isModalOpen: boolean = false;
  isScheduleModalOpen: boolean = false;
  isEditing: boolean = false;
  currentId: any = null; 
  searchTerm: string = '';
  
  // Filtros
  selectedSpecialty: string = 'All';
  specialties: string[] = ['All', 'Frontend Developer', 'Backend Developer', 'Full-Stack Developer', 'DevOps Engineer'];
  
  // Variables para Horarios
  currentProgrammerName: string = '';
  tempSchedules: any[] = [];
  newSchedule = { day: 'Lunes', start: '', end: '' };
  daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  // Formulario de Programador
  newProgrammer: any = {
    name: '', specialty: 'Frontend Developer', description: '', photoUrl: '',
    contact: { email: '', linkedin: '', github: '' }
  };

  constructor() {
    this.cargarDatos();
  }

  // --- CARGA DE DATOS DESDE MYSQL ---
  cargarDatos() {
    this.isLoading = true;
    this.userService.getProgrammers().subscribe({
      next: (data: any[]) => {
        this.allProgrammers = data.map(backendUser => {
            
            // 1. RECUPERAR EL CLASS TYPE (Separando por |||)
            const rawDesc = backendUser.description || '';
            // Si tiene ||| lo separamos. Si no, ponemos 'Developer' para que no salga vacío.
            let realSpecialty = rawDesc.includes('|||') ? rawDesc.split('|||')[0].trim() : 'Developer';
            let realDescription = rawDesc.includes('|||') ? rawDesc.split('|||')[1].trim() : rawDesc;

            // 2. RECUPERAR HORARIOS (Parseando JSON)
            let realAvailability = [];
            if (backendUser.availability) {
                try {
                    // Si Java devuelve un String JSON, lo convertimos a Objeto
                    realAvailability = JSON.parse(backendUser.availability);
                } catch (e) {
                    console.error('Error parseando horarios (formato incorrecto):', e);
                    realAvailability = [];
                }
            }

            return {
                // SOLUCIÓN AL ERROR ROJO: Convertimos el ID a String obligatoriamente
                id: String(backendUser.id), 
                name: backendUser.name,
                specialty: realSpecialty, 
                description: realDescription,
                photoUrl: backendUser.photoUrl,
                contact: {
                    email: backendUser.email,
                    linkedin: backendUser.linkedin,
                    github: backendUser.github
                },
                availability: realAvailability 
            };
        });

        this.applyFilters(); 
        this.isLoading = false; 
      },
      error: (err) => {
        console.error('Error cargando programadores:', err);
        this.isLoading = false;
      }
    });
  }

  // --- FILTROS ---
  applyFilters() {
    const term = this.searchTerm.toLowerCase().trim();
    this.filteredProgrammers = this.allProgrammers.filter((p: any) => {
      const name = (p.name || '').toLowerCase();
      const specialty = (p.specialty || '').toLowerCase();
      
      const matchesSearch = name.includes(term) || specialty.includes(term);
      const matchesCategory = this.selectedSpecialty === 'All' || p.specialty === this.selectedSpecialty;

      return matchesSearch && matchesCategory;
    });
  }

  // --- MODAL DE PROGRAMADOR ---
  openModal() { 
      this.isEditing = false; 
      this.resetForm(); 
      this.isModalOpen = true; 
  }
  
  closeModal() { 
      this.isModalOpen = false; 
      this.resetForm(); 
  }
  
  resetForm() {
    this.isEditing = false; 
    this.currentId = null;
    this.newProgrammer = { 
        name: '', 
        specialty: 'Frontend Developer', 
        description: '', 
        photoUrl: '', 
        contact: { email: '', linkedin: '', github: '' } 
    };
  }
  
  editProgrammer(programmer: any) {
    this.isEditing = true;
    this.currentId = programmer.id;
    // Copiamos los datos para no modificar la tabla en tiempo real sin guardar
    this.newProgrammer = { 
        ...programmer, 
        contact: { ...programmer.contact } 
    };
    this.isModalOpen = true;
  }

  // --- GUARDAR PROGRAMADOR (CREATE / UPDATE) ---
  saveProgrammer() {
    if (!this.newProgrammer.name || !this.newProgrammer.contact.email) {
      alert('⚠️ Faltan datos obligatorios (Nombre y Email)');
      return;
    }

    // COMBINAMOS Especialidad y Descripción para guardar ambos en el campo 'description'
    const descripcionCombinada = `${this.newProgrammer.specialty}|||${this.newProgrammer.description}`;

    const datosParaJava = {
        name: this.newProgrammer.name,
        email: this.newProgrammer.contact.email, 
        github: this.newProgrammer.contact.github,
        linkedin: this.newProgrammer.contact.linkedin,
        description: descripcionCombinada, // <--- Aquí va el combo
        photoUrl: this.newProgrammer.photoUrl,
        role: 'programmer', // Aseguramos que sea programador
        
        // 👇 ESTA ES LA LÍNEA QUE FALTABA PARA QUE MYSQL NO TE DE ERROR 👇
        password: 'PENDIENTE_DE_REGISTRO' 
    };

    if (this.isEditing && this.currentId) {
        this.userService.updateProgrammer(this.currentId, datosParaJava).subscribe({
            next: () => {
                this.closeModal();
                this.cargarDatos(); // Recargar para ver cambios
            },
            error: (e) => {
                console.error('Error actualizando:', e);
                alert('Error al actualizar programador');
            }
        });
    } else {
        this.userService.addProgrammer(datosParaJava).subscribe({
            next: () => {
                alert('✅ Programador registrado en Base de Datos. Ahora puede crear su cuenta con este email.');
                this.closeModal();
                this.cargarDatos();
            },
            error: (e) => {
                console.error('Error creando:', e);
                alert('Error al crear programador (Revisa que el email no esté repetido)');
            }
        });
    }
  }

  // --- ELIMINAR PROGRAMADOR ---
  deleteProgrammer(id: any) {
    if (!id) return;
    if(confirm('¿Estás seguro de borrar este programador? Esta acción no se puede deshacer.')) {
      this.userService.deleteProgrammer(id).subscribe({
          next: () => {
              // Actualización optimista (borramos de la lista local para que sea rápido)
              this.allProgrammers = this.allProgrammers.filter(p => p.id !== id);
              this.applyFilters();
          },
          error: (e) => {
              console.error(e);
              alert('No se pudo eliminar el programador.');
          }
      });
    }
  }

  // --- MODAL DE HORARIOS ---
  openScheduleModal(programmer: any) {
    this.currentId = programmer.id;
    this.currentProgrammerName = programmer.name;
    // Creamos una copia del array para no afectar la vista si cancelan
    this.tempSchedules = programmer.availability ? [...programmer.availability] : [];
    this.newSchedule = { day: 'Lunes', start: '', end: '' };
    this.isScheduleModalOpen = true;
  }
  
  closeScheduleModal() { 
      this.isScheduleModalOpen = false; 
  }
  
  // --- LÓGICA DE HORARIOS (LOCAL) ---
  addSchedule() {
    if (!this.newSchedule.start || !this.newSchedule.end) { 
        alert('⚠️ Debes ingresar hora de inicio y fin.'); 
        return; 
    }
    if (this.newSchedule.start >= this.newSchedule.end) {
        alert('⚠️ La hora de fin debe ser posterior a la de inicio.');
        return;
    }

    // Evitar duplicados exactos de día (opcional, según tu regla de negocio)
    const diaDuplicado = this.tempSchedules.find(s => s.day === this.newSchedule.day);
    if (diaDuplicado) {
        alert(`⚠️ Ya existe un horario para el ${this.newSchedule.day}. Elimínalo primero.`);
        return;
    }

    this.tempSchedules.push({ ...this.newSchedule });
    
    // Ordenar días de la semana
    const daysOrder = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    this.tempSchedules.sort((a, b) => daysOrder.indexOf(a.day) - daysOrder.indexOf(b.day));
  }
  
  removeSchedule(index: number) { 
      this.tempSchedules.splice(index, 1); 
  }

  // --- GUARDAR HORARIOS EN MYSQL ---
  saveSchedules() {
    if (!this.currentId) return;
    
    // Convertimos el Array a JSON String para guardarlo en la columna 'availability' (TEXT)
    const horariosJson = JSON.stringify(this.tempSchedules);

    this.userService.updateProgrammer(this.currentId, { availability: horariosJson }).subscribe({
        next: () => {
             alert('✅ Horarios guardados correctamente en base de datos.');
             this.closeScheduleModal();
             this.cargarDatos(); // Recargar para asegurar persistencia
        },
        error: (err) => {
            console.error('Error guardando horarios:', err);
            alert('❌ Error al guardar horarios en el servidor.');
        }
    });
  }

  // --- CERRAR SESIÓN ---
  async logout() { 
      try {
        await signOut(this.auth); 
        this.router.navigate(['/login']); 
      } catch (error) {
        console.error('Error al salir:', error);
      }
  }
}