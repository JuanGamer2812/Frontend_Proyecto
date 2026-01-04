import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { Catalogo } from './components/catalogo/catalogo';
import { Colaboradores } from './components/colaboradores/colaboradores';
import { About } from './components/about/about';
import { ClientesSatisfechos } from './components/clientes-satisfechos/clientes-satisfechos';
import { Login } from './components/login/login';
import { CrearCuenta } from './components/crear-cuenta/crear-cuenta';
import { Perfil } from './components/perfil/perfil';
import { RecuperarCuenta } from './components/recuperar-cuenta/recuperar-cuenta';
import { Reserva } from './components/reserva/reserva';
import { Evento } from './components/evento/evento';
import { PostulacionProveedor } from './components/postulacion-proveedor/postulacion-proveedor';
import { PostulacionTrabajador } from './components/postulacion-trabajador/postulacion-trabajador';
import { AdmProveedor } from './components/adm-proveedor/adm-proveedor';
import { InsertarProveedor } from './components/insertar-proveedor/insertar-proveedor';
import { EditarProveedor } from './components/editar-proveedor/editar-proveedor'; 
import { EliminarProveedor } from './components/eliminar-proveedor/eliminar-proveedor';
import { VerProveedor } from './components/ver-proveedor/ver-proveedor';
import { Roles } from './components/roles/roles';
import { AdmUsuarios } from './components/adm-usuarios/adm-usuarios';
import { RsvpComponent } from './components/rsvp/rsvp.component';
import { InvitacionesListComponent } from './components/invitaciones-list/invitaciones-list.component';
import { EnvioMasivoComponent } from './components/envio-masivo/envio-masivo.component';
import { DashboardAdminComponent } from './components/dashboard-admin/dashboard-admin.component';
import { AdminPostulaciones } from './components/admin-postulaciones/admin-postulaciones';
import { ReportesComponent } from './components/reportes/reportes';
import { VerificarCuenta } from './components/verificar-cuenta/verificar-cuenta';
import { authGuard, adminGuard, guestGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
   
  // Rutas públicas
  { path: 'home', component: Home },
  { path: 'catalogo', component: Catalogo },
  { path: 'colaboradores', component: Colaboradores },
  { path: 'about', component: About },
  { path: 'clientes-satisfechos', component: ClientesSatisfechos },
  
  // RSVP - Ruta pública para confirmación de invitaciones
  { path: 'rsvp/:codigo', component: RsvpComponent, data: { hideNavbar: true } },
  
  // Rutas solo para invitados (no autenticados)
  { path: 'login', component: Login, canActivate: [guestGuard], data: { hideNavbar: true } },
  { path: 'crear-cuenta', component: CrearCuenta, canActivate: [guestGuard], data: { hideNavbar: true } },
  { path: 'recuperar-cuenta', component: RecuperarCuenta, canActivate: [guestGuard], data: { hideNavbar: true } },
  { path: 'recuperar', component: RecuperarCuenta, canActivate: [guestGuard] },
  { path: 'verificar-cuenta', component: VerificarCuenta, data: { hideNavbar: true } },
  
  // Rutas protegidas (requieren autenticación)
  { path: 'perfil', component: Perfil, canActivate: [authGuard] },
  { path: 'reserva', component: Reserva, canActivate: [authGuard] },
  { path: 'evento', component: Evento, canActivate: [authGuard] },
  { path: 'postulacion-proveedor', component: PostulacionProveedor, canActivate: [authGuard] },
  { path: 'postulacion-trabajador', component: PostulacionTrabajador, canActivate: [authGuard] },
  
  // Rutas solo para administradores
  { path: 'dashboard-admin', component: DashboardAdminComponent, canActivate: [adminGuard] },
  { path: 'admin-postulaciones', component: AdminPostulaciones, canActivate: [adminGuard] },
  { path: 'adm-proveedor', component: AdmProveedor, canActivate: [adminGuard] },
  { path: 'insertar-proveedor', component: InsertarProveedor, canActivate: [adminGuard] },
  { path: 'editar-proveedor/:id', component: EditarProveedor, canActivate: [adminGuard] },
  { path: 'eliminar-proveedor/:id', component: EliminarProveedor, canActivate: [adminGuard] },
  { path: 'ver-proveedor/:id', component: VerProveedor },
  { path: 'roles', component: Roles, canActivate: [adminGuard] },
  { path: 'adm-usuarios', component: AdmUsuarios, canActivate: [adminGuard] },
  { path: 'invitaciones', component: InvitacionesListComponent, canActivate: [adminGuard] },
  { path: 'envio-masivo', component: EnvioMasivoComponent, canActivate: [adminGuard] },
  { path: 'admin/reportes', component: ReportesComponent, canActivate: [adminGuard] },
  
  // Ruta 404
  { path: '**', redirectTo: '/home' }
];
