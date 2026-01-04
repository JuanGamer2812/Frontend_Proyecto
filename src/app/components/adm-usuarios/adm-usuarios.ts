import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../service/api.service';
import Swal from 'sweetalert2';

// Interface basada en la vista v_listar_usuario_rol
interface UsuarioRol {
  'Id Usuario': number;
  'Nombre': string;
  'Apellido': string;
  'Género': string;
  'Fecha Nacimiento': string;
  'Correo': string;
  'Telefono': string;
  'Estado': boolean;
  'Rol asignado': string;
  'Fecha Registro': string;
  'Id Rol'?: number;
}

interface RolOption {
  id_rol: number;
  nombre_rol: string;
}

@Component({
  selector: 'app-adm-usuarios',
  imports: [CommonModule, FormsModule],
  templateUrl: './adm-usuarios.html',
  styleUrl: './adm-usuarios.css'
})
export class AdmUsuarios implements OnInit {
  private apiService = inject(ApiService);

  usuarios = signal<UsuarioRol[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  roles = signal<RolOption[]>([]);
  loadingRoles = signal(false);
  roleError = signal<string | null>(null);
  savingRole = signal<number | null>(null);
  roleSuccess = signal<string | null>(null);

  ngOnInit(): void {
    this.cargarUsuarios();
    this.cargarRoles();
  }

  cargarUsuarios(): void {
    this.loading.set(true);
    this.error.set(null);

    // Cambiar a getAllUsuarios() que trae TODOS los usuarios, no solo los con rol asignado
    this.apiService.getAllUsuarios().subscribe({
      next: (data: any[]) => {
        console.log('✅ Usuarios cargados desde tabla usuario:', data);
        console.log('Cantidad de usuarios:', data.length);
        console.log('Estructura del primer usuario:', data[0]);
        
        // Mapear respuesta para que sea compatible con la interfaz
        const usuariosMapeados: UsuarioRol[] = (data || []).map((u: any) => ({
          'Id Usuario': u.id_usuario || u.Id || u.id,
          'Nombre': u.nombre || u.Nombre || '',
          'Apellido': u.apellido || u.Apellido || '',
          'Género': u.genero || u.Género || '',
          'Fecha Nacimiento': u.fecha_nacimiento || u['Fecha Nacimiento'] || '',
          'Correo': u.email || u.correo || u.Correo || '',
          'Telefono': u.telefono || u.Telefono || '',
          'Estado': u.activo !== undefined ? u.activo : (u.Estado !== undefined ? u.Estado : true),
          'Rol asignado': u.rol_nombre || u['Rol asignado'] || 'Sin asignar',
          'Fecha Registro': u.fecha_registro || u['Fecha Registro'] || '',
          'Id Rol': u.id_rol || u['Id Rol'] || null
        }));
        
        this.usuarios.set(usuariosMapeados);
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('Error al cargar usuarios:', err);
        this.error.set('Error al cargar usuarios desde el servidor');
        this.loading.set(false);
      }
    });
  }

  cargarRoles(): void {
    this.loadingRoles.set(true);
    this.roleError.set(null);

    this.apiService.getRoles().subscribe({
      next: (data: RolOption[]) => {
        this.roles.set(data);
        this.loadingRoles.set(false);
      },
      error: (err: any) => {
        console.error('Error al cargar roles:', err);
        this.roleError.set('No se pudieron cargar los roles');
        this.loadingRoles.set(false);
      }
    });
  }

  rolIdActual(usuario: UsuarioRol): number | null {
    if (usuario['Id Rol']) return usuario['Id Rol'];
    const rol = this.roles().find(r => r.nombre_rol === usuario['Rol asignado']);
    return rol ? rol.id_rol : null;
  }

  cambiarRol(idUsuario: number, idRol: number): void {
    if (!idRol) return;

    this.savingRole.set(idUsuario);
    this.roleError.set(null);
    this.roleSuccess.set(null);

    // Guardamos el nombre del rol antes de la petición
    const rolNombre = this.roles().find(r => r.id_rol === idRol)?.nombre_rol || '—';

    this.apiService.setUsuarioRol({ id_usuario: idUsuario, id_rol: idRol, estado: true }).subscribe({
      next: () => {
        // Actualizar UI inmediatamente
        this.usuarios.update(list => list.map(u =>
          u['Id Usuario'] === idUsuario ? { ...u, 'Rol asignado': rolNombre, 'Id Rol': idRol } : u
        ));
        this.savingRole.set(null);
        Swal.fire({
          icon: 'success',
          title: '¡Rol actualizado!',
          text: `El usuario ahora tiene el rol: ${rolNombre}`,
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: (err: any) => {
        console.error('Error al asignar rol:', err);
        this.savingRole.set(null);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo actualizar el rol. Intenta de nuevo.',
          confirmButtonColor: '#d33'
        });
      }
    });
  }

  trunc(txt?: string, len = 60): string {
    if (!txt) return '-';
    return txt.length > len ? txt.slice(0, len) + '…' : txt;
  }
}
