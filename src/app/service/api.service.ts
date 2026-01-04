import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  // Permisos
  getPermisos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/permiso`);
  }

  createPermiso(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/permiso`, data);
  }

  updatePermiso(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/permiso/${id}`, data);
  }

  deletePermiso(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/permiso/${id}`);
  }

  // Rol Permisos robustos
  getRolPermisosByRole(idRol: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/rol_permiso/${idRol}`);
  }

  setRolPermiso(payload: { id_rol: number; id_permiso: number; estado: boolean }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/rol_permiso`, payload);
  }

  deleteRolPermiso(idRol: number, idPermiso: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/rol_permiso/${idRol}/${idPermiso}`);
  }
  private http = inject(HttpClient);
  // Temporary: call backend directly to bypass dev-server proxy while troubleshooting.
  // Revert to '/api' after verifying proxy or starting dev server with proxy config.
  private baseUrl = 'http://127.0.0.1:5000/api';

  // Proveedores - CRUD Completo
  getProveedores(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/proveedor`);
  }

  getProveedoresPorEstado(estado: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/proveedor`, {
      params: { estado }
    });
  }



  createProveedor(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/proveedor`, data);
  }

  updateProveedor(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/proveedor/${id}`, data);
  }

  deleteProveedor(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/proveedor/${id}`);
  }


  // Roles
  getRoles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/rol`);
  }

  createRol(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/rol`, data);
  }

  updateRol(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/rol/${id}`, data);
  }

  deleteRol(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/rol/${id}`);
  }

  // Usuarios
  getUsuarios(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/v_usuario`);
  }

  createUsuario(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/usuario`, data);
  }

  // Eventos
  getEventos(): Observable<any[]> {
    // Usar la tabla directa de evento
    return this.http.get<any[]>(`${this.baseUrl}/evento`);
  }

  // Categorías de eventos (tabla categoria_evento)


  // (Eliminado duplicado getPermisos)

  // Rol Permisos
  // (Eliminado: getRolPermisos con /v_rol_permiso, solo usar /rol_permiso/:idRol)

  // Usuario Roles
  getUsuarioRoles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/v_usuario_rol`);
  }

  setUsuarioRol(payload: { id_usuario: number; id_rol: number; estado?: boolean }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/usuario_rol`, payload);
  }

  // Proveedores Home (vista simplificada para el home)
  getProveedoresHome(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/v_proveedor_home`);
  }

  getProveedoresHomeByCategoria(categoria: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/v_proveedor_home/categoria/${categoria}`);
  }

  // Trabaja Nosotros Proveedor - CRUD Completo
  getTrabajaNosotrosProveedor(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/trabaja_nosotros_proveedor`);
  }

  getTrabajaNosotrosProveedorById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/trabaja_nosotros_proveedor/${id}`);
  }

  createTrabajaNosotrosProveedor(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/trabaja_nosotros_proveedor`, data);
  }

  updateTrabajaNosotrosProveedor(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/trabaja_nosotros_proveedor/${id}`, data);
  }

  deleteTrabajaNosotrosProveedor(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/trabaja_nosotros_proveedor/${id}`);
  }

  // Usuario (tabla usuario directa)
  getAllUsuarios(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/usuario`);
  }

  getUsuarioDirectoById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/usuario/${id}`);
  }

  // Proveedores para reservas (aprobados/activos)




  // Crear reserva
  createReserva(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/reservas`, data);
  }

  // Crear factura
  createFactura(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/facturas`, data);
  }

  // Postulaciones de proveedores - obtener pendientes
  getProveedoresPendientes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/proveedor`, { params: { estado_aprobacion: 'pendiente' } });
  }

  // Aprobar postulación de proveedor
  aprobarProveedor(id: number): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/proveedor/${id}/aprobar`, {});
  }

  // Rechazar postulación de proveedor
  rechazarProveedor(id: number): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/proveedor/${id}/rechazar`, {});
  }

  // ============ ENDPOINTS PARA INSERTAR PROVEEDOR ============
  
  /**
   * Obtiene todas las categorías/tipos de proveedores
   * GET /api/categorias
   */


  /**
   * Obtiene todos los planes disponibles
   * GET /api/planes
   */


  /**
   * Registra un nuevo postulante de proveedor
   * POST /api/trabaja_nosotros_proveedor
   * 
   * @param formData FormData con los datos del proveedor
   */
  registrarPostulanteProveedor(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/trabaja_nosotros_proveedor`, formData);
  }

  /**
   * Obtiene lista de postulantes de proveedores
   * GET /api/trabajanosotros
   */
  getPostulantesProveedores(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/trabajanosotros`);
  }

  /**
   * Convierte un postulante en proveedor
   * POST /api/convertir-postulante-a-proveedor
   * 
   * @param data Datos para convertir postulante a proveedor
   */
  convertirPostulanteAProveedor(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/convertir-postulante-a-proveedor`, data);
  }

  /**
   * Inserta proveedor directamente desde postulante seleccionado
   * POST /api/proveedor
   * 
   * @param data Datos completos del proveedor
   */
  insertarProveedorDesdePostulante(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/proveedor`, data);
  }

  // Tipos de evento
  getTiposEvento(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/tipos-evento`);
  }



/// aña 

// === 1. EVENTO ===
  crearEvento(evento: {
    nombre_evento: string;
    descripcion_evento: string;
    fecha_inicio_evento: string;
    fecha_fin_evento: string;
    precio_evento?: number;
    hay_playlist_evento?: boolean;
    playlist_evento?: string;
    creado_por: string;
    id_usuario_creador: number;
    id_plan: number;
    id_categoria: number;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/eventos`, evento);
  }

  // === 2. RESERVACION ===
  crearReservacion(reservacion: {
    fecha_reservacion?: string;
    cedula_reservacion: string;
    id_usuario: number;
    id_evento: number;
    numero_invitados: number;
    subtotal: number;
    iva: number;
    total: number;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/reservas`, reservacion);
  }

  // === 3. ASIGNAR PROVEEDORES AL EVENTO ===
  crearEventoProveedores(proveedores: {
    id_evento: number;
    id_proveedor: number;
      id_tipo?: number | null;
      precio_acordado?: number | null;
    fecha_inicio_evento: string;
    fecha_fin_evento: string;
    estado_asignacion?: string;
  }[]): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/evento-proveedores`, proveedores);
  }

  // === 4. GUARDAR CARACTERÍSTICAS ELEGIDAS POR USUARIO ===
  crearEventoProveedorCaracteristicas(caracteristicas: {
    id_evento: number;
    id_proveedor: number;
    id_caracteristica: number;
    valor_texto?: string;
    valor_numero?: number;
    valor_booleano?: boolean;
    valor_json?: any;
  }[]): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/evento-proveedor-caracteristicas`, caracteristicas);
  }

  // === 5. INVITADOS ===
  crearInvitados(invitados: {
    id_evento: number;
    nombre: string;
    email?: string;
    telefono?: string;
    notas?: string;
    acompanantes?: number;
  }[]): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/invitados`, invitados);
  }

  /**
   * POST /api/invitados expecting body: { eventoId: number, invitados: [...] }
   * This method sends the exact payload requested by backend/frontend agreement.
   */
  crearInvitadosPorEvento(eventoId: number, invitados: { nombre: string; email?: string; telefono?: string; cantidad_personas?: number; notas?: string }[]): Observable<any> {
    const payload = { eventoId, invitados };
    return this.http.post<any>(`${this.baseUrl}/invitados`, payload);
  }

  // === 6. FACTURA/PAGO ===
  crearFactura(factura: {
    numero_autorizacion_factura: string;
    metodo_pago_factura: string;
    subtotal_factura: number;
    impuestos_factura: number;
    total_factura: number;
    id_reservacion: number;
    estado_pago?: string;
    fecha_pago?: string;
    metodo_pago_simulado?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/facturas`, factura);
  }

  // === OBTENER DATOS PARA FORMULARIOS ===
  getCategoriasEvento(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/categoria-evento`);
  }
  getPlanes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/planes`);
  }
  getPlanById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/planes/${id}`);
  }
  getEventoByPlan(id_plan: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/eventos/plan/${id_plan}`);
  }
  getProveedoresByEvento(id_evento: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/eventos/${id_evento}/proveedores`);
  }
  getTiposProveedor(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/tipos-proveedor`);
  }
  getProveedoresAprobados(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/proveedor`, { params: { estado_aprobacion: 'aprobado', estado: 'true' } });
  }

  insertarProveedorCaracteristicas(payload: any[]): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/proveedor-caracteristicas`, payload);
  }

  subirImagenesProveedor(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/proveedor-imagen`, formData);
  }

  getProveedoresPorPlan(id_plan: number | string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/proveedor`, { params: { estado_aprobacion: 'aprobado', estado: 'true', id_plan: String(id_plan) } });
  }
  getProveedorById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/proveedor/${id}`);
  }
  getProveedorCaracteristicasById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/proveedor/${id}/caracteristicas`);
  }
  getCaracteristicasByTipo(id_tipo: number | string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/caracteristica`, { params: { tipo: String(id_tipo) } });
  }
  getProveedoresPorCategoria(categoria: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/proveedor`, { params: { estado_aprobacion: 'aprobado', estado: 'true', categoria } });
  }
  getCategorias(): Observable<any[]> {
    // El backend expone las categorías de evento en /categoria-evento
    return this.http.get<any[]>(`${this.baseUrl}/categoria-evento`);
  }
  getCaracteristicasProveedor(id_proveedor: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/v_proveedor_caracteristicas?id_proveedor=${id_proveedor}`);
  }

  // === MÉTODOS GENÉRICOS ===
  /**
   * Método genérico para POST a cualquier endpoint
   */
  postData(endpoint: string, data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${endpoint}`, data);
  }

  /**
   * Método genérico para GET de cualquier endpoint
   */
  getData(endpoint: string, params?: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${endpoint}`, { params });
  }
}
