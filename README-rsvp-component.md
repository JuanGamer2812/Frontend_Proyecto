# Componente RSVP - Sistema de Confirmación de Invitaciones

## 📋 Descripción General

El componente RSVP es una página pública que permite a los invitados confirmar su asistencia a eventos a través de un código único. Es parte del Sistema de Invitaciones de ÉCLAT y proporciona una experiencia elegante y profesional para la gestión de respuestas.

## 🎯 Características Principales

### ✅ Funcionalidades Implementadas

1. **Validación de Código Único**
   - Extrae código desde parámetro de ruta `:codigo`
   - Verifica validez y vigencia del código
   - Muestra error amigable si código no válido

2. **Visualización de Invitación**
   - Nombre del evento con diseño elegante
   - Detalles completos: ubicación, fecha/hora, descripción
   - Mensaje personalizado del organizador (si existe)
   - Información de acompañantes permitidos
   - Datos del organizador con email de contacto

3. **Confirmación de Asistencia**
   - Selector de número de acompañantes (0-N)
   - Campo para restricciones alimentarias opcionales
   - Cálculo automático de asistentes totales
   - Validación de límite de acompañantes

4. **Rechazo de Invitación**
   - Modal de confirmación antes de rechazar
   - Permite cancelar el rechazo
   - Registra respuesta negativa con notificación

5. **Estados Dinámicos**
   - **Loading**: Spinner mientras carga invitación
   - **Error**: Card elegante con mensaje de error
   - **Success**: Confirmación visual con animación
   - **Ya Respondido**: Muestra detalles de respuesta previa

6. **Diseño Responsive**
   - Adaptado a mobile, tablet y desktop
   - Gradientes elegantes y animaciones suaves
   - Iconos Bootstrap Icons integrados
   - Paleta de colores consistente (#667eea → #764ba2)

## 📁 Estructura de Archivos

```
src/app/components/rsvp/
├── rsvp.component.ts        (211 líneas) - Lógica del componente
├── rsvp.component.html      (400+ líneas) - Template con @if control flow
└── rsvp.component.css       (500+ líneas) - Estilos elegantes con animaciones
```

## 🔧 Detalles Técnicos

### Component (TypeScript)

```typescript
@Component({
  selector: 'app-rsvp',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rsvp.component.html',
  styleUrls: ['./rsvp.component.css']
})
export class RsvpComponent implements OnInit
```

#### Signals (Estado Reactivo)

- `invitacion: Signal<InvitacionDetalle | null>` - Datos de la invitación
- `isLoading: Signal<boolean>` - Estado de carga
- `error: Signal<string | null>` - Mensaje de error
- `success: Signal<boolean>` - Estado de éxito
- `showDeclineConfirmation: Signal<boolean>` - Modal de confirmación rechazo

#### Properties (Formulario)

- `acompanantesConfirmados: number` - Número de acompañantes (0-N)
- `restriccionesAlimentarias: string` - Restricciones alimentarias opcionales

#### Métodos Principales

```typescript
cargarInvitacion(codigo: string): void
  - Obtiene invitación desde API
  - Maneja estados de carga/error
  - Pre-carga datos si ya confirmó antes

confirmarAsistencia(): void
  - Valida número de acompañantes
  - Envía confirmación al backend
  - Actualiza estado y recarga invitación

rechazarInvitacion(): void
  - Confirma rechazo con modal
  - Registra respuesta negativa
  - Envía email de notificación

formatearFecha(fecha: Date): string
  - Formato español completo
  - "lunes, 15 de enero de 2024, 20:00"

getTotalAsistentes(): number
  - Calcula total: 1 invitado + acompañantes
  - Usado para validación y display

yaRespondio(): boolean
  - Verifica si estado !== 'pendiente'

confirmo(): boolean
  - Verifica si estado === 'confirmado'

rechazo(): boolean
  - Verifica si estado === 'rechazado'
```

### Template (HTML)

#### Estados con @if Control Flow

```html
@if (isLoading()) { <!-- Spinner de carga --> }
@else if (error()) { <!-- Card de error --> }
@else if (success() && invitacion()) { <!-- Card de éxito --> }
@else if (invitacion() && !yaRespondio()) { <!-- Formulario RSVP --> }
@else if (invitacion() && yaRespondio()) { <!-- Ya respondió --> }
```

#### Secciones del Formulario

1. **Header**
   - Gradiente morado (#667eea → #764ba2)
   - Icono animado 🎊
   - Nombre del evento destacado

2. **Guest Info**
   - Saludo personalizado
   - Mensaje de bienvenida

3. **Custom Message**
   - Card especial con borde naranja
   - Solo si organizador incluyó mensaje

4. **Event Details**
   - Ubicación con icono 📍
   - Fecha/hora formateada
   - Descripción del evento
   - Acompañantes permitidos (destacado en verde)

5. **RSVP Form**
   - Select de acompañantes con ngModel
   - Textarea de restricciones alimentarias
   - Contador de asistentes totales
   - Botones confirmar/rechazar

6. **Organizer Info**
   - Nombre del organizador
   - Email con ícono ✉️

7. **Decline Modal**
   - Overlay semi-transparente
   - Confirmar/Cancelar acciones
   - Previene clics accidentales

### Estilos (CSS)

#### Variables de Color

- **Primary**: `#667eea` → `#764ba2` (gradiente)
- **Success**: `#28a745`
- **Danger**: `#dc3545`
- **Gray**: `#6c757d`
- **Background**: `#f8f9fa`

#### Animaciones

```css
@keyframes fadeIn         - Opacidad 0→1
@keyframes slideUp        - Deslizar desde abajo
@keyframes bounceIn       - Escala 0.3→1 con rebote
@keyframes pulse          - Opacidad pulsante (header)
@keyframes rotate         - Rotación 360° (icono)
```

#### Responsive Breakpoints

```css
@media (max-width: 768px)  - Tablet/móvil
@media (max-width: 480px)  - Móvil pequeño
```

Ajustes:
- Tamaños de fuente reducidos
- Botones en columna
- Padding compacto
- Iconos más pequeños

## 🚀 Integración

### Ruta (app.routes.ts)

```typescript
{
  path: 'rsvp/:codigo',
  component: RsvpComponent,
  data: { hideNavbar: true }  // Oculta navbar para página pública
}
```

**Acceso**: `https://eclat.com/rsvp/ABC123XYZ`

### Servicio (InvitacionService)

```typescript
obtenerInvitacionPorCodigo(codigo: string): Observable<ApiResponse>
  - GET /api/invitaciones/rsvp/:codigo
  - No requiere autenticación (ruta pública)

confirmarAsistencia(codigo: string, datos: {
  acompanantes_confirmados: number,
  restricciones_alimentarias: string
}): Observable<ApiResponse>
  - POST /api/invitaciones/rsvp/:codigo/confirmar
  - Envía email de confirmación

rechazarInvitacion(codigo: string): Observable<ApiResponse>
  - POST /api/invitaciones/rsvp/:codigo/rechazar
  - Envía email de rechazo
```

### Backend (invitacion.routes.js)

```javascript
// Rutas públicas (sin autenticación)
router.get('/rsvp/:codigo', invitacionController.obtenerPorCodigo);
router.post('/rsvp/:codigo/confirmar', invitacionController.confirmarAsistencia);
router.post('/rsvp/:codigo/rechazar', invitacionController.rechazarInvitacion);
```

## 📧 Flujo de Emails

### 1. Email de Invitación (Previo)

Enviado desde sistema de invitaciones:

```
De: organizador@eclat.com
Asunto: Invitación a [Nombre Evento]

Contenido:
- Detalles del evento
- Código RSVP: ABC123XYZ
- QR Code (placeholder)
- Botones: [Confirmar] [Rechazar]
  → Redirigen a /rsvp/ABC123XYZ
```

### 2. Email de Confirmación

Enviado al confirmar asistencia:

```
Asunto: Confirmación de Asistencia - [Nombre Evento]

Contenido:
- ¡Gracias por confirmar! ✅
- Detalles del evento
- Asistentes confirmados: N personas
- Restricciones registradas (si aplica)
- Agregar a calendario (CTA)
```

### 3. Email de Rechazo

Enviado al rechazar invitación:

```
Asunto: Respuesta Registrada - [Nombre Evento]

Contenido:
- Lamentamos tu ausencia 😢
- Datos del evento (por si cambia de opinión)
- Link para contactar organizador
```

## 🎨 Experiencia de Usuario

### Flujo Normal (Confirmación)

1. Usuario recibe email con link `/rsvp/ABC123XYZ`
2. Abre link → Carga invitación (spinner)
3. Ve detalles del evento (diseño elegante)
4. Selecciona acompañantes: 2
5. Escribe restricciones: "Vegetariano"
6. Clic en "Sí, Asistiré"
7. Ve mensaje de éxito con animación 🎉
8. Recibe email de confirmación
9. Puede cerrar página

### Flujo Alternativo (Rechazo)

1. Usuario abre link `/rsvp/ABC123XYZ`
2. Ve invitación
3. Clic en "No Podré Asistir"
4. Modal de confirmación aparece
5. Usuario confirma rechazo
6. Ve mensaje registrado
7. Recibe email de rechazo

### Flujo de Error

1. Usuario abre link `/rsvp/INVALIDO`
2. Sistema valida código
3. Muestra error: "Código no válido o expirado"
4. Sugiere contactar organizador

### Flujo de Ya Respondido

1. Usuario abre link `/rsvp/ABC123XYZ` (ya confirmó antes)
2. Sistema detecta estado = 'confirmado'
3. Muestra card de confirmación existente:
   - ✅ Ya Confirmaste tu Asistencia
   - Detalles del evento
   - Asistentes: 3 personas (1 invitado + 2 acompañantes)
   - Restricciones: Vegetariano
   - Sugerencia: Contactar organizador para cambios

## 🔒 Seguridad

### Validaciones Frontend

- ✅ Código extraído de ruta (Angular)
- ✅ Límite de acompañantes validado
- ✅ Confirmación de rechazo (modal)
- ✅ Deshabilitar botones durante carga

### Validaciones Backend

- ✅ Código único verificado en BD
- ✅ Invitación no expirada
- ✅ No exceder acompañantes permitidos
- ✅ Estado válido (pendiente → confirmado/rechazado)
- ✅ Prevenir confirmaciones duplicadas

### Privacidad

- 🔓 Ruta pública (sin autenticación)
- 🔐 Código único como "contraseña"
- 📧 Email enviado solo al invitado
- 🚫 Sin información sensible expuesta

## 📊 Base de Datos

### Tabla Invitacion

Campos actualizados al confirmar:

```sql
UPDATE invitacion SET
  estado = 'confirmado',
  fecha_confirmacion = NOW(),
  acompanantes_confirmados = 2,
  restricciones_alimentarias = 'Vegetariano',
  updated_at = NOW()
WHERE codigo_unico = 'ABC123XYZ';
```

Campos actualizados al rechazar:

```sql
UPDATE invitacion SET
  estado = 'rechazado',
  fecha_rechazo = NOW(),
  updated_at = NOW()
WHERE codigo_unico = 'ABC123XYZ';
```

### Trigger de Notificación

Al confirmar/rechazar:

```sql
-- Trigger notificar_confirmacion
INSERT INTO notificacion (
  id_usuario,  -- ID del organizador
  tipo,
  titulo,
  mensaje,
  urgencia,
  data
) VALUES (
  (SELECT id_organizador FROM evento WHERE id_evento = NEW.id_evento),
  'invitado_confirmo',
  'Invitado Confirmó Asistencia',
  'Juan Pérez confirmó para el evento...',
  'normal',
  '{"id_invitacion": 123, "acompanantes": 2}'::jsonb
);
```

## 🧪 Testing (Manual)

### Casos de Prueba

#### ✅ CP01: Confirmación Exitosa
- **Given**: Código válido `ABC123XYZ`, estado `pendiente`
- **When**: Usuario selecciona 2 acompañantes y confirma
- **Then**: 
  - Estado → `confirmado`
  - Email enviado ✅
  - Notificación al organizador ✅
  - Mensaje de éxito mostrado ✅

#### ✅ CP02: Rechazo Exitoso
- **Given**: Código válido, estado `pendiente`
- **When**: Usuario rechaza con modal
- **Then**: 
  - Estado → `rechazado`
  - Email enviado ✅
  - Notificación al organizador ✅

#### ✅ CP03: Código Inválido
- **Given**: Código `INVALIDO123`
- **When**: Usuario accede a `/rsvp/INVALIDO123`
- **Then**: 
  - Error mostrado ✅
  - Sugerencia de contactar organizador ✅

#### ✅ CP04: Ya Confirmado
- **Given**: Código válido, estado `confirmado`
- **When**: Usuario accede nuevamente
- **Then**: 
  - Muestra detalles de confirmación previa ✅
  - No permite modificar (sugerir contacto) ✅

#### ✅ CP05: Exceder Acompañantes
- **Given**: Invitación permite 2 acompañantes
- **When**: Usuario intenta confirmar 3
- **Then**: 
  - Alert: "Solo puedes traer hasta 2 acompañantes" ✅
  - Confirmación bloqueada ✅

## 🎯 Próximos Pasos

### Mejoras Futuras (Opcionales)

1. **QR Code Real**
   - Generar QR con código RSVP
   - Usar biblioteca `qrcode.js`
   - Mostrar en email de invitación

2. **Calendario ICS**
   - Botón "Agregar a Calendario"
   - Generar archivo `.ics`
   - Compatible con Google/Outlook/Apple

3. **Editar Confirmación**
   - Permitir cambiar acompañantes
   - Actualizar restricciones
   - Validar límites de tiempo

4. **Compartir en Redes**
   - Botones de compartir evento
   - Facebook, Twitter, WhatsApp
   - Texto pre-formateado

5. **Recordatorios**
   - Email 1 semana antes
   - Email 1 día antes
   - Push notifications (PWA)

## 📈 Métricas

### KPIs del Componente

- **Tasa de Confirmación**: Confirmados / Total Invitados
- **Tiempo Promedio de Respuesta**: Fecha envío → Fecha confirmación
- **Acompañantes Promedio**: Promedio de acompañantes_confirmados
- **Restricciones Alimentarias**: % invitados con restricciones

### Analytics (GA4)

Eventos a trackear:

```javascript
// Ver invitación
gtag('event', 'view_rsvp', {
  event_id: 123,
  codigo: 'ABC123XYZ'
});

// Confirmar asistencia
gtag('event', 'confirm_rsvp', {
  event_id: 123,
  acompanantes: 2
});

// Rechazar invitación
gtag('event', 'decline_rsvp', {
  event_id: 123
});
```

## 🐛 Troubleshooting

### Problema: Código no válido

**Síntoma**: Error "Código de invitación no válido o expirado"

**Causas**:
- Código copiado incorrectamente (typo)
- Invitación eliminada
- Evento cancelado

**Solución**:
1. Verificar código en email original
2. Contactar organizador
3. Solicitar nuevo código

### Problema: No recibo email de confirmación

**Síntoma**: Confirmación exitosa pero sin email

**Causas**:
- Email en spam/junk
- Dirección incorrecta en invitación
- Servicio SMTP fallando

**Solución**:
1. Revisar carpeta spam
2. Contactar organizador para verificar email
3. Revisar logs backend: `email.service.js`

### Problema: No puedo modificar confirmación

**Síntoma**: Ya confirmé pero quiero cambiar acompañantes

**Causas**:
- Sistema no permite edición (by design)

**Solución**:
1. Contactar organizador
2. Organizador puede editar manualmente en admin
3. O eliminar y crear nueva invitación

## 📝 Notas de Implementación

### Decisiones de Diseño

1. **¿Por qué signals en lugar de BehaviorSubject?**
   - Angular 18 recomienda signals
   - Mejor rendimiento y DX
   - Sintaxis más simple: `signal()` vs `new BehaviorSubject()`

2. **¿Por qué @if en lugar de *ngIf?**
   - Nueva sintaxis de control flow de Angular 18
   - Mejor rendimiento (sin directivas)
   - Más legible y mantenible

3. **¿Por qué FormsModule en lugar de ReactiveFormsModule?**
   - Formulario simple (solo 2 campos)
   - No requiere validaciones complejas
   - ngModel es suficiente

4. **¿Por qué hideNavbar: true?**
   - Página pública enfocada
   - Sin distracciones
   - Experiencia limpia tipo landing

5. **¿Por qué modal para rechazo?**
   - Prevenir clics accidentales
   - Acción irreversible
   - UX best practice

## 🔗 Referencias

- [Angular Signals](https://angular.dev/guide/signals)
- [Control Flow Syntax](https://angular.dev/guide/templates/control-flow)
- [Bootstrap Icons](https://icons.getbootstrap.com/)
- [Stripe.js](https://stripe.com/docs/js)
- [PostgreSQL Functions](https://www.postgresql.org/docs/current/sql-createfunction.html)

---

**Última actualización**: 2024-01-15  
**Versión**: 1.0.0  
**Estado**: ✅ COMPLETO  
**Líneas de código**: ~1100 (TS: 211, HTML: 400, CSS: 500)
