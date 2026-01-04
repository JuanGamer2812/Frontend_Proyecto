import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../service/api.service';
import Swal from 'sweetalert2';

interface Rol {
  id_rol: number;
  nombre_rol: string;
  descripcion_rol: string;
  fecha_registro_rol: string;
  estado_rol: boolean;
}

interface Permiso {
  id_permiso?: number;
  nombre_permiso?: string;
  descripcion_permiso?: string;
  fecha_registro_permiso?: string;
  asignado_permiso?: boolean;
  visualId?: number; // Solo para visualización en tabla
}

interface RolPermiso {
  id_rol?: number;
  id_permiso?: number;
  estado?: boolean;
}

@Component({
  selector: 'app-roles',
  imports: [CommonModule, FormsModule],
  templateUrl: './roles.html',
  styleUrl: './roles.css'
})
export class Roles implements OnInit {
  private apiService = inject(ApiService);


  // Signals para Roles
  roles = signal<Rol[]>([]);
  loadingRoles = signal(false);
  errorRoles = signal<string | null>(null);

  // Signals para Permisos
  permisos = signal<Permiso[]>([]);
  loadingPermisos = signal(false);
  errorPermisos = signal<string | null>(null);

  // Signals para Rol-Permisos
  rolPermisos = signal<RolPermiso[]>([]);
  loadingRolPermisos = signal(false);
  // Cambios pendientes de permisos (key = `${idRol}-${idPermiso}`)
  pendingPermisos = signal<Record<string, boolean>>({});
  savingPermisos = signal(false);
  
  // Rol seleccionado para asignación de permisos
  rolSeleccionado = signal<number | null>(null);
  rolSeleccionadoValue: number | null = null;

  // Modal
  mostrarModal = signal(false);
  rolEdicion = signal<Partial<Rol>>({});
  esNuevoRol = signal(true);
  // Modal para permisos
  mostrarPermisoModal = signal(false);
  permisoEdicion = signal<Partial<Permiso>>({});
  esNuevoPermiso = signal(false);
  // Valores simples para el checkbox del modal (más fácil de bindear en template)
  permisoAsignadoSeleccionValue: boolean = false;
  permisoAsignadoOriginalValue: boolean = false; // para restaurar estado tras bloqueos/errores
  permisoAsignadoAdminLockValue: boolean = false;
  permisoAsignadoForbiddenValue: boolean = false; // true cuando permiso id=4 no puede asignarse a rol != 5
  permisoAdminInfoValue: boolean = false; // true cuando el rol seleccionado es administrador
  permisoAdminWarningValue: boolean = false; // true si el rol seleccionado es administrador

  ngOnInit(): void {
    this.cargarRoles();
    this.cargarPermisos();
  }

  cargarRoles(): void {
    this.loadingRoles.set(true);
    this.errorRoles.set(null);

    this.apiService.getRoles().subscribe({
      next: (data) => {
        this.roles.set(data);
        this.loadingRoles.set(false);
      },
      error: (err) => {
        this.errorRoles.set('Error al cargar roles desde el servidor');
        this.loadingRoles.set(false);
      }
    });
  }

  cargarPermisos(): void {
    this.loadingPermisos.set(true);
    this.errorPermisos.set(null);

    this.apiService.getPermisos().subscribe({
      next: (data) => {
        // Solo aceptar permisos con id_permiso real y consistente
        const filtered = (data || [])
          .filter((d) => typeof d.id_permiso === 'number' && !isNaN(d.id_permiso));
        // Ordenar por id_permiso para consistencia visual
        filtered.sort((a, b) => a.id_permiso - b.id_permiso);
        // Agregar visualId solo para mostrar en la tabla
        const mapped = filtered.map((d, idx) => ({
          ...d,
          visualId: idx + 1,
          id_permiso: d.id_permiso,
          nombre_permiso: d.nombre_permiso ?? d.Permiso ?? '',
          descripcion_permiso: d.descripcion_permiso ?? d.Descripción ?? '',
          fecha_registro_permiso: d.fecha_registro_permiso ?? null
        }));
        this.permisos.set(mapped);
        this.loadingPermisos.set(false);
      },
      error: (err) => {
        this.errorPermisos.set('Error al cargar permisos desde el servidor');
        this.loadingPermisos.set(false);
      }
    });
  }

  cargarRolPermisos(idRol: number): void {
    this.loadingRolPermisos.set(true);
    this.rolSeleccionado.set(idRol);
    this.rolSeleccionadoValue = idRol;
    this.pendingPermisos.set({});

    this.apiService.getRolPermisosByRole(idRol).subscribe({
      next: (data: any[]) => {
        // Solo aceptar asignaciones con id_permiso real y consistente
        const mapped = (data || [])
          .filter((d) => typeof d.id_permiso === 'number' && !isNaN(d.id_permiso))
          .map(d => ({
            id_rol: idRol,
            id_permiso: d.id_permiso,
            estado: d.asignado_permiso === undefined ? !!d.estado : !!d.asignado_permiso
          } as any));
        this.rolPermisos.set(mapped);
        this.loadingRolPermisos.set(false);
      },
      error: (err) => {
        this.loadingRolPermisos.set(false);
        Swal.fire({
          title: "Error",
          text: err?.error?.message || 'Error al cargar permisos del rol',
          icon: "error"
        });
      }
    });
  }

  tienePermiso(idPermiso: number): boolean {
    const idRol = this.rolSeleccionado();
    const key = `${idRol}-${idPermiso}`;
    const pending = this.pendingPermisos()[key];
    if (pending !== undefined) return pending;
    return this.rolPermisos().some(rp => rp.id_permiso === idPermiso && rp.estado);
  }

  // Local toggle: mark pending change and update local view
  onTogglePermisoLocal(idPermiso: number, checked: boolean): void {
    const idRol = this.rolSeleccionado();
    if (!idRol) {
      Swal.fire({
        title: "Atención",
        text: "Seleccione un rol antes de asignar permisos",
        icon: "info"
      });
      return;
    }
    const key = `${idRol}-${idPermiso}`;
    const pending = { ...(this.pendingPermisos() || {}) };
    pending[key] = checked;
    this.pendingPermisos.set(pending);

    // update local rolPermisos display so checkbox reflects immediate change
    const current = [...(this.rolPermisos() || [])];
    const idx = current.findIndex(rp => rp.id_rol === idRol && rp.id_permiso === idPermiso);
    if (idx >= 0) {
      current[idx] = { ...current[idx], estado: checked };
    } else {
      current.push({ id_rol: idRol, id_permiso: idPermiso, estado: checked });
    }
    this.rolPermisos.set(current);
  }

  // Enviar cambios pendientes al backend (guardar en lote)
  guardarPermisos(): void {
    const idRol = this.rolSeleccionado();
    if (!idRol) {
      Swal.fire({
        title: "Atención",
        text: "Seleccione un rol antes de guardar cambios",
        icon: "info"
      });
      return;
    }

    const pending = this.pendingPermisos();
    const keys = Object.keys(pending || {});
    if (keys.length === 0) {
      Swal.fire({
        title: "Sin cambios",
        text: "No hay cambios pendientes",
        icon: "info"
      });
      return;
    }

    this.savingPermisos.set(true);
    let remaining = keys.length;
    let hadError = false;

    const onComplete = () => {
      remaining -= 1;
      if (remaining <= 0) {
        this.savingPermisos.set(false);
        this.pendingPermisos.set({});
        // recargar desde servidor
        this.cargarRolPermisos(idRol);
        if (hadError) {
          Swal.fire({
            title: "Advertencia",
            text: "Algunos cambios no se pudieron guardar. Revisa la consola.",
            icon: "warning"
          });
        } else {
          Swal.fire({
            title: "¡Cambios guardados exitosamente!",
            text: "Los permisos se han actualizado correctamente",
            icon: "success",
            draggable: true,
            confirmButtonText: "¡Perfecto!",
            confirmButtonColor: "#3085d6"
          });
        }
      }
    };

    for (const k of keys) {
      const [r, p] = k.split('-');
      const id_permiso = Number(p);
      const estado = pending[k];
      const payload = { id_rol: Number(r), id_permiso, estado };
      this.apiService.setRolPermiso(payload).subscribe({
        next: () => onComplete(),
        error: (err) => { console.error('Error guardando permiso', payload, err); hadError = true; onComplete(); }
      });
    }
  }

  // Editar permiso (simple prompt) y eliminar permiso
  editarPermiso(permiso: Permiso): void {
    // Abrir modal de edición de permiso en lugar de prompt
    this.permisoEdicion.set({ ...permiso });
    this.esNuevoPermiso.set(false);
    // Inicializar checkbox según rol seleccionado
    const idPerm = permiso.id_permiso;
    const idRol = this.rolSeleccionado();
    // reset flags
    this.permisoAsignadoAdminLockValue = false;
    this.permisoAsignadoForbiddenValue = false;
    const adminRole = this.esRolAdministrador(idRol);
    this.permisoAdminWarningValue = adminRole;
    this.permisoAdminInfoValue = adminRole;
    if (idRol && idPerm !== undefined) {
      const assigned = this.rolPermisos().some(rp => rp.id_permiso === idPerm && rp.estado);
      const isAdminPerm = idPerm === 4 || idPerm === 8 || idPerm === 9;
      this.permisoAsignadoSeleccionValue = adminRole && idPerm === 4 ? true : !!assigned;
      this.permisoAsignadoOriginalValue = this.permisoAsignadoSeleccionValue;
      this.permisoAsignadoAdminLockValue = adminRole && idPerm === 4; // admin no puede desactivar el 4
      this.permisoAsignadoForbiddenValue = !adminRole && isAdminPerm; // usuarios no pueden activar 4/8/9
    } else {
      this.permisoAsignadoSeleccionValue = false;
      this.permisoAsignadoOriginalValue = false;
    }
    this.mostrarPermisoModal.set(true);
  }

  abrirPermisoModal(): void {
    this.permisoEdicion.set({ nombre_permiso: '', descripcion_permiso: '' });
    this.esNuevoPermiso.set(true);
    // creación: checkbox por defecto false y no bloqueado
    this.permisoAsignadoSeleccionValue = false;
    this.permisoAsignadoOriginalValue = false;
    this.permisoAsignadoAdminLockValue = false;
    this.permisoAsignadoForbiddenValue = false;
    this.permisoAdminWarningValue = false;
    this.permisoAdminInfoValue = false;
    this.mostrarPermisoModal.set(true);
  }

  cerrarPermisoModal(): void {
    this.mostrarPermisoModal.set(false);
  }

  private esRolAdministrador(idRol: number | null): boolean {
    if (!idRol) return false;
    const rol = this.roles().find(r => r.id_rol === idRol);
    if (rol && rol.nombre_rol) {
      return rol.nombre_rol.toUpperCase().includes('ADMIN');
    }
    return idRol === 5; // fallback si no se encuentra el rol
  }

  guardarPermiso(): void {
      const payload = this.permisoEdicion();
      // DEPURACIÓN: Mostrar la lista de permisos y el payload
      console.log('[DEPURACIÓN] Permisos disponibles:', this.permisos());
      console.log('[DEPURACIÓN] Payload de edición:', payload);
    if (!payload) return;
    // Validación: asegurar que el permiso existe en la lista de permisos
    let idPerm: number | undefined = undefined;
    if (this.esNuevoPermiso()) {
      // Si es nuevo, el permiso aún no existe, se creará
      this.apiService.createPermiso(payload as any).subscribe({
        next: (created: any) => {
          idPerm = created?.id_permiso ?? created?.id;
          const idRol = this.rolSeleccionado();
          // DEPURACIÓN: Mostrar respuesta de creación
          console.log('[DEPURACIÓN] Permiso creado:', created);
          if (idRol && idPerm !== undefined) {
            console.log('[DEPURACIÓN] Asignando permiso tras crear:', { id_rol: idRol, id_permiso: idPerm, estado: !!this.permisoAsignadoSeleccionValue });
            const estado = !!this.permisoAsignadoSeleccionValue;
            const adminRole = this.esRolAdministrador(idRol);
            const isAdminPerm = idPerm === 4 || idPerm === 8 || idPerm === 9;
            if (!adminRole && isAdminPerm && estado) {
              alert('Error: no se puede asignar el permiso de administrador a este rol.');
              this.permisoAsignadoSeleccionValue = this.permisoAsignadoOriginalValue;
            } else if (adminRole && idPerm === 4 && !estado) {
              alert('Error: es un permiso de administrador, no puede desactivarlo.');
              this.permisoAsignadoSeleccionValue = this.permisoAsignadoOriginalValue;
            } else {
              this.apiService.setRolPermiso({ id_rol: idRol, id_permiso: idPerm, estado }).subscribe({
                next: () => {},
                error: (e) => {
                  if (e?.status === 400 && e?.error?.message) {
                    alert('Error: ' + e.error.message);
                  } else {
                    alert('Error inesperado al asignar permiso.');
                  }
                  this.permisoAsignadoSeleccionValue = this.permisoAsignadoOriginalValue;
                  console.error('Error asignando permiso', e);
                }
              });
              // update local view
              const current = [...(this.rolPermisos() || [])];
              const idx = current.findIndex(rp => rp.id_permiso === idPerm && rp.id_rol === idRol);
              if (idx >= 0) current[idx] = { ...current[idx], estado };
              else if (idPerm !== undefined) current.push({ id_rol: idRol, id_permiso: idPerm, estado });
              this.rolPermisos.set(current);
            }
          }
          this.cargarPermisos(); this.cerrarPermisoModal();
        },
        error: (err: any) => { console.error('Error creando permiso', err); alert(err?.error?.message || 'Error creando permiso'); }
      });
    } else {
      idPerm = payload.id_permiso;
      if (idPerm === undefined) {
        Swal.fire({
          title: "Error",
          text: "ID de permiso ausente",
          icon: "error"
        });
        return;
      }

      const permisoExiste = this.permisos().some(p => p.id_permiso === idPerm);
      if (!permisoExiste) {
        Swal.fire({
          title: "Error",
          text: "El permiso seleccionado no existe en la base de datos.",
          icon: "error"
        });
        return;
      }

      const idRol = this.rolSeleccionado();
      const estado = !!this.permisoAsignadoSeleccionValue;
      const idPermSafe = idPerm as number; // ya validado arriba

      // Primero: actualizar nombre y descripción del permiso
      this.apiService.updatePermiso(idPermSafe, {
        nombre_permiso: payload.nombre_permiso,
        descripcion_permiso: payload.descripcion_permiso
      }).subscribe({
        next: () => {
          // Segundo: asignar/desasignar al rol si hay rol seleccionado
          if (idRol) {
            const adminRole = this.esRolAdministrador(idRol);
            const isAdminPerm = idPermSafe === 4 || idPermSafe === 8 || idPermSafe === 9;
            if (!adminRole && isAdminPerm && estado) {
              Swal.fire({
                title: "Error",
                text: "No se puede asignar el permiso de administrador a este rol.",
                icon: "error"
              });
              this.permisoAsignadoSeleccionValue = this.permisoAsignadoOriginalValue;
              return;
            } else if (adminRole && idPermSafe === 4 && !estado) {
              Swal.fire({
                title: "Error",
                text: "Es un permiso de administrador, no puede desactivarlo.",
                icon: "error"
              });
              this.permisoAsignadoSeleccionValue = this.permisoAsignadoOriginalValue;
              return;
            }

            this.apiService.setRolPermiso({ id_rol: idRol, id_permiso: idPermSafe, estado }).subscribe({
              next: () => {
                const current = [...(this.rolPermisos() || [])];
                const idx = current.findIndex(rp => rp.id_permiso === idPermSafe && rp.id_rol === idRol);
                if (idx >= 0) {
                  current[idx] = { ...current[idx], estado };
                } else {
                  current.push({ id_rol: idRol, id_permiso: idPermSafe, estado });
                }
                this.rolPermisos.set(current);

                this.cargarPermisos();
                this.cerrarPermisoModal();
                Swal.fire({
                  title: "¡Cambios guardados exitosamente!",
                  text: "El permiso se ha actualizado y asignado correctamente",
                  icon: "success",
                  draggable: true,
                  confirmButtonText: "¡Perfecto!",
                  confirmButtonColor: "#3085d6"
                });
              },
              error: (e) => {
                const msg = e?.error?.message || 'Error inesperado al asignar permiso.';
                Swal.fire({
                  title: "Error",
                  text: msg,
                  icon: "error"
                });
                this.permisoAsignadoSeleccionValue = this.permisoAsignadoOriginalValue;
                console.error('Error asignando permiso tras edición', e);
              }
            });
          } else {
            // Sin rol seleccionado: solo se actualiza nombre/descr
            this.cargarPermisos();
            this.cerrarPermisoModal();
            Swal.fire({
              title: "¡Permiso actualizado!",
              text: "Los cambios se han guardado correctamente",
              icon: "success",
              draggable: true,
              confirmButtonText: "¡Perfecto!",
              confirmButtonColor: "#3085d6"
            });
          }
        },
        error: (err) => {
          const msg = err?.error?.message || 'Error al actualizar el permiso';
          Swal.fire({
            title: "Error",
            text: msg,
            icon: "error"
          });
          console.error('Error actualizando permiso', err);
        }
      });
    }
  }

  eliminarPermiso(permiso: Permiso): void {
    Swal.fire({
      title: "¿Estás seguro?",
      text: `No podrás revertir la eliminación del permiso ${permiso.nombre_permiso || permiso.id_permiso}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        this.apiService.deletePermiso(permiso.id_permiso!).subscribe({
          next: () => {
            this.cargarPermisos();
            Swal.fire({
              title: "¡Eliminado!",
              text: "El permiso ha sido eliminado.",
              icon: "success"
            });
          },
          error: (err) => {
            console.error(err);
            Swal.fire({
              title: "Error",
              text: err?.error?.message || 'Error eliminando permiso',
              icon: "error"
            });
          }
        });
      }
    });
  }

  abrirModal(rol?: Rol): void {
    if (rol) {
      this.rolEdicion.set({ ...rol });
      this.esNuevoRol.set(false);
    } else {
      this.rolEdicion.set({ 
        nombre_rol: '', 
        descripcion_rol: '', 
        estado_rol: true 
      } as any);
      this.esNuevoRol.set(true);
    }
    this.mostrarModal.set(true);
  }

  cerrarModal(): void {
    this.mostrarModal.set(false);
  }

  guardarRol(): void {
    const payload = this.rolEdicion();
    if (this.esNuevoRol()) {
      this.apiService.createRol(payload).subscribe({
        next: (created: any) => {
          this.cargarRoles();
          this.cerrarModal();
          Swal.fire({
            title: "¡Rol creado exitosamente!",
            text: "El nuevo rol se ha registrado correctamente",
            icon: "success",
            draggable: true,
            confirmButtonText: "¡Perfecto!",
            confirmButtonColor: "#3085d6"
          });
        },
        error: (err) => {
          const msg = err?.error?.message || err?.error?.error || err?.message || 'Error al crear rol en el servidor';
          Swal.fire({
            title: "Error",
            text: msg,
            icon: "error"
          });
        }
      });
    } else {
      const id = this.rolEdicion().id_rol;
      if (!id) {
        Swal.fire({
          title: "Error",
          text: "ID de rol ausente, no se puede actualizar",
          icon: "error"
        });
        return;
      }
      this.apiService.updateRol(id, payload).subscribe({
        next: (updated: any) => {
          this.cargarRoles();
          this.cerrarModal();
          Swal.fire({
            title: "¡Cambios guardados exitosamente!",
            text: "El rol se ha actualizado correctamente",
            icon: "success",
            draggable: true,
            confirmButtonText: "¡Perfecto!",
            confirmButtonColor: "#3085d6"
          });
        },
        error: (err) => {
          const msg = err?.error?.message || err?.error?.error || err?.message || 'Error al actualizar rol en el servidor';
          Swal.fire({
            title: "Error",
            text: msg,
            icon: "error"
          });
        }
      });
    }
  }

  eliminarRol(rol: Rol): void {
    Swal.fire({
      title: "¿Estás seguro?",
      text: `No podrás revertir la eliminación del rol "${rol.nombre_rol}"`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        this.apiService.deleteRol(rol.id_rol).subscribe({
          next: () => {
            const filtered = (this.roles() || []).filter(r => r.id_rol !== rol.id_rol);
            this.roles.set(filtered);
            Swal.fire({
              title: "¡Eliminado!",
              text: `El rol "${rol.nombre_rol}" ha sido eliminado.`,
              icon: "success"
            });
          },
          error: (err) => {
            const msg = err?.error?.message || err?.error?.error || err?.message || 'Error al eliminar rol en el servidor';
            Swal.fire({
              title: "Error",
              text: msg,
              icon: "error"
            });
          }
        });
      }
    });
  }

  getEstadoTexto(estado: boolean): string {
    return estado ? 'Activo' : 'Inactivo';
  }

  // Recargar roles y permisos y limpiar selección
  recargarTodo(): void {
    this.rolSeleccionado.set(null);
    this.rolSeleccionadoValue = null;
    this.rolPermisos.set([]);
    this.cargarRoles();
    this.cargarPermisos();
  }

  // Contar permisos asignados al rol seleccionado
  contarPermisosAsignados(): number {
    return (this.rolPermisos() || []).filter(rp => rp.estado).length;
  }

  // Para cambio de rol en el select
  onRolChange(): void {
    if (this.rolSeleccionadoValue != null) {
      this.cargarRolPermisos(this.rolSeleccionadoValue);
    } else {
      this.rolSeleccionado.set(null);
      this.rolPermisos.set([]);
    }
  }
}