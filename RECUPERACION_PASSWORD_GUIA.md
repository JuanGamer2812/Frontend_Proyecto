# 🔐 Guía de Recuperación de Contraseña con Contraseñas Temporales

## 📋 Tabla de Contenidos
- [Descripción General](#descripción-general)
- [Arquitectura](#arquitectura)
- [Componentes Backend](#componentes-backend)
- [Componentes Frontend](#componentes-frontend)
- [Flujo de Usuario](#flujo-de-usuario)
- [Testing](#testing)
- [Seguridad](#seguridad)
- [Troubleshooting](#troubleshooting)

---

## 📖 Descripción General

Este sistema implementa recuperación de contraseña mediante **contraseñas temporales** enviadas por email usando **Resend**, reemplazando el enfoque tradicional de enlaces con tokens.

### 🎯 Características Principales

- ✅ Contraseñas temporales aleatorias de 12 caracteres
- ✅ Envío por email vía Resend con plantilla profesional
- ✅ Expiración automática en 1 hora
- ✅ Cooldown de 5 minutos entre solicitudes
- ✅ Login con contraseña temporal + cambio obligatorio
- ✅ Limpieza automática de datos temporales
- ✅ Prevención de enumeración de usuarios

---

## 🏗️ Arquitectura

### Base de Datos

**Migración: `012_temporary_password.sql`**

Nuevas columnas en tabla `usuario`:

```sql
temp_password_hash TEXT             -- Hash bcrypt de contraseña temporal
temp_password_expires_at TIMESTAMP  -- Expiración (1 hora desde creación)
must_change_password BOOLEAN        -- Flag para forzar cambio de contraseña
reset_last_requested_at TIMESTAMP   -- Última solicitud (para cooldown)
```

**Índices:**
- `idx_usuario_temp_password` - Búsqueda eficiente por temp_password_hash
- `idx_usuario_must_change_password` - Filtro de usuarios que deben cambiar contraseña

---

## ⚙️ Componentes Backend

### 1. Servicio: `forgot-password.service.js`

**Funciones Principales:**

#### `generateTemporaryPassword()`
Genera contraseña aleatoria de 12 caracteres:
- Mayúsculas (sin I, O)
- Minúsculas (sin i, l, o)
- Números (sin 0, 1)
- Símbolos (!@#$%&*)
- Garantiza al menos 1 de cada tipo

```javascript
const tempPassword = generateTemporaryPassword();
// Ejemplo: "Kx7#bRt3$mWp"
```

#### `generateAndStoreTemporaryPassword(email)`
Flujo completo:
1. Busca usuario por email
2. Valida cooldown (5 minutos)
3. Genera contraseña temporal
4. Hashea con bcrypt
5. Almacena en BD con expiración de 1 hora
6. Retorna contraseña en texto plano (solo para email)

```javascript
const result = await generateAndStoreTemporaryPassword('user@example.com');
// {
//   success: true,
//   emailSent: true,
//   userId: 1,
//   userEmail: 'user@example.com',
//   userName: 'Juan',
//   temporaryPassword: 'Kx7#bRt3$mWp',
//   expiresAt: '2025-01-15T14:30:00.000Z'
// }
```

#### `validateTemporaryPassword(userId, tempPassword)`
Valida contraseña temporal:
- Verifica existencia
- Comprueba expiración
- Compara hash con bcrypt

```javascript
const validation = await validateTemporaryPassword(1, 'Kx7#bRt3$mWp');
// { valid: true, mustChangePassword: true }
```

#### `clearTemporaryPassword(userId, newPassword)`
Después del cambio exitoso:
- Hashea nueva contraseña permanente
- Limpia temp_password_hash y temp_password_expires_at
- Establece must_change_password = false
- Invalida refresh tokens por seguridad

---

### 2. Servicio: `email.service.js`

#### `sendTemporaryPasswordEmail(userEmail, userName, temporaryPassword)`

**Plantilla HTML Profesional:**
- 🔐 Muestra contraseña temporal en grande
- ⏰ Aviso de expiración en 1 hora
- 📝 Pasos claros para usar la contraseña
- 🔒 Recomendaciones de seguridad
- 📱 Responsive y accesible

**Envío:**
- **Resend** si `RESEND_API_KEY` está configurado
- **SMTP** (nodemailer) como fallback

---

### 3. Controlador: `auth.controller.js`

#### `POST /api/auth/forgot-password`

**Request:**
```json
{
  "email": "usuario@example.com"
}
```

**Response (siempre igual para prevenir enumeración):**
```json
{
  "success": true,
  "message": "Si el email existe en nuestro sistema, recibirás una contraseña temporal"
}
```

**Errores:**
- `429` - Cooldown activo (debe esperar X minutos)
- `500` - Error del servidor

#### `POST /api/auth/change-password-forced`
*(Requiere autenticación JWT)*

**Request:**
```json
{
  "newPassword": "NuevaContraseña123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Contraseña actualizada exitosamente"
}
```

---

### 4. Servicio: `auth.service.js`

#### Modificación del `login()`

**Flujo actualizado:**
1. Verificar contraseña normal
2. Si falla, verificar contraseña temporal:
   - Validar expiración
   - Comparar hash
   - Marcar `must_change_password = true`
3. Retornar respuesta con flags adicionales:

```javascript
{
  user: {
    // ... otros campos
    must_change_password: true  // ← Nuevo
  },
  temporary_password_used: true  // ← Nuevo
}
```

---

## 🎨 Componentes Frontend

### 1. Servicio: `password-reset.service.ts`

```typescript
requestTemporaryPassword(email: string): Observable<any>
changePasswordForced(newPassword: string): Observable<any>
```

### 2. Componente: `recuperar-cuenta`

**Simplificado para contraseñas temporales:**
- Solo solicita email (no tokens)
- Muestra instrucciones después del envío
- Maneja cooldown con mensajes informativos

**Estados:**
```typescript
emailSent: boolean
errorMessage: string
successMessage: string
cooldownMessage: string
```

### 3. Componente: `login`

**Nueva funcionalidad:**

#### Modal de Cambio Obligatorio

Se activa cuando `must_change_password === true`:

```html
@if (showChangePasswordModal()) {
  <div class="modal">
    <!-- Formulario de cambio de contraseña -->
    <input type="password" formControlName="newPassword">
    <input type="password" formControlName="confirmPassword">
    <button (click)="onChangePassword()">Actualizar</button>
  </div>
}
```

**Lógica:**
```typescript
async onSubmit(): Promise<void> {
  const response = await this.auth.login(this.form.value);
  
  if (response.user.must_change_password) {
    this.showChangePasswordModal.set(true);  // Mostrar modal
    return;  // No redirigir al home
  }
  
  this.router.navigate(['/home']);
}
```

---

## 👤 Flujo de Usuario

### Paso 1: Solicitar Contraseña Temporal

1. Usuario visita `/recuperar-cuenta`
2. Ingresa su email
3. Click en "Enviar contraseña temporal"
4. **Backend:**
   - Valida cooldown
   - Genera contraseña aleatoria
   - Guarda hash en BD con expiración
   - Envía email vía Resend
5. Usuario ve mensaje de confirmación

### Paso 2: Recibir Email

Email contiene:
- Contraseña temporal en grande (ej: `Kx7#bRt3$mWp`)
- Aviso de expiración (1 hora)
- Instrucciones paso a paso
- Botón "Ir al inicio de sesión"

### Paso 3: Login con Contraseña Temporal

1. Usuario va a `/login`
2. Ingresa email + contraseña temporal
3. **Backend:**
   - Verifica contraseña normal (falla)
   - Verifica contraseña temporal (éxito)
   - Marca `must_change_password = true`
   - Genera tokens JWT
4. **Frontend:**
   - Detecta `must_change_password === true`
   - Muestra modal de cambio obligatorio
   - No redirige al home

### Paso 4: Cambiar Contraseña

1. Usuario ingresa nueva contraseña (2 veces)
2. Click en "Actualizar contraseña"
3. **Backend:**
   - Valida longitud mínima (6 caracteres)
   - Hashea nueva contraseña
   - Limpia contraseña temporal
   - Establece `must_change_password = false`
   - Invalida refresh tokens
4. **Frontend:**
   - Muestra mensaje de éxito
   - Redirige al home después de 2 segundos

---

## 🧪 Testing

### Script Manual Completo

```bash
node scripts/manual_forgot_password.js
# O con email específico:
node scripts/manual_forgot_password.js --email=usuario@example.com
```

**Salida:**
```
🔐 === TEST: RECUPERACIÓN DE CONTRASEÑA ===

📧 Email objetivo: galokuontay54@gmail.com

✅ Contraseña temporal generada:
   - Email: galokuontay54@gmail.com
   - Usuario: Juan
   - Contraseña temporal: Kx7#bRt3$mWp
   - Expira en: 15/1/2025 14:30:00

✅ Email enviado exitosamente:
   - Message ID: 42f0ad83-d78f-488c-a9d6-3c4ebe6e001b
   - Provider: resend

📝 === INSTRUCCIONES PARA CONTINUAR EL TEST ===
1. Revisa tu email (spam también)
2. Copia la contraseña temporal: Kx7#bRt3$mWp
3. Ve a http://localhost:4200/login
4. Ingresa tu email: galokuontay54@gmail.com
5. Usa la contraseña temporal como contraseña
6. Se abrirá un modal para cambiar tu contraseña
7. Ingresa una nueva contraseña permanente
8. Serás redirigido al home
```

### Resetear Cooldown (Desarrollo)

```bash
node scripts/reset_forgot_password_cooldown.js --email=usuario@example.com
# O:
node scripts/reset_forgot_password_cooldown.js --id=1
```

### Verificar Estado en BD

```sql
SELECT 
    id_usuario,
    email,
    temp_password_hash IS NOT NULL as tiene_temp_password,
    temp_password_expires_at,
    must_change_password,
    reset_last_requested_at
FROM usuario
WHERE email = 'usuario@example.com';
```

---

## 🔒 Seguridad

### Medidas Implementadas

#### 1. Prevención de Enumeración de Usuarios
```javascript
// Siempre retorna el mismo mensaje
res.json({
  success: true,
  message: 'Si el email existe en nuestro sistema, recibirás...'
});
```

#### 2. Contraseñas Robustas
- 12 caracteres mínimo
- Mayúsculas + minúsculas + números + símbolos
- Sin caracteres ambiguos (I, O, 0, 1, i, l, o)
- Aleatorización criptográfica con crypto.randomBytes()

#### 3. Hash Seguro
```javascript
const hashedTempPassword = await hashPassword(tempPassword);
// Usa bcrypt con salt rounds configurables
```

#### 4. Expiración Temporal
```javascript
const expiresAt = new Date();
expiresAt.setHours(expiresAt.getHours() + 1);  // 1 hora
```

#### 5. Cooldown Anti-Spam
```javascript
const COOLDOWN_MINUTES = 5;
// Previene solicitudes repetidas
```

#### 6. Invalidación de Sesiones
```javascript
// Al cambiar contraseña permanente:
await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
```

#### 7. Limpieza Automática
```javascript
// Después del cambio exitoso:
temp_password_hash = NULL
temp_password_expires_at = NULL
must_change_password = false
```

---

## 🐛 Troubleshooting

### Problema: Email no llega

**Causa:** Resend en modo testing solo envía a email registrado

**Solución:**
```bash
# Verificar .env
RESEND_FROM_EMAIL=onboarding@resend.dev
TEST_VERIFICATION_EMAIL=tu-email@registrado.com

# O configurar dominio verificado en Resend
```

### Problema: "Debes esperar X minutos"

**Causa:** Cooldown activo

**Solución:**
```bash
node scripts/reset_forgot_password_cooldown.js --email=usuario@example.com
```

### Problema: "Contraseña temporal expirada"

**Causa:** Más de 1 hora desde la generación

**Solución:**
1. Solicitar nueva contraseña temporal
2. O resetear expiración manualmente:
```sql
UPDATE usuario 
SET temp_password_expires_at = NOW() + INTERVAL '1 hour'
WHERE email = 'usuario@example.com';
```

### Problema: Modal no aparece después del login

**Causa:** Flag `must_change_password` no está establecido

**Verificar:**
```sql
SELECT must_change_password FROM usuario WHERE email = 'usuario@example.com';
```

**Solución manual:**
```sql
UPDATE usuario SET must_change_password = true WHERE email = 'usuario@example.com';
```

### Problema: Backend no reconoce contraseña temporal

**Verificar:**
```javascript
// En auth.service.js login():
const tempValidation = await forgotPasswordService.validateTemporaryPassword(user.id_usuario, password);
console.log('Temp validation:', tempValidation);
```

**Revisar:**
1. Hash guardado correctamente
2. Expiración no vencida
3. Contraseña copiada exactamente (sin espacios)

---

## 📚 Variables de Entorno

```env
# Resend API
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=onboarding@resend.dev
TEST_VERIFICATION_EMAIL=tu-email@example.com

# Frontend URL (para links en email)
FRONTEND_URL=http://localhost:4200

# JWT (para autenticación)
JWT_SECRET=tu-secret-key
```

---

## 🚀 Endpoints API

### Públicos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/forgot-password` | Solicita contraseña temporal |
| POST | `/api/auth/login` | Login (acepta contraseña temporal) |

### Protegidos (Requieren JWT)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/change-password-forced` | Cambia contraseña después de temp login |

---

## 📊 Diagrama de Flujo

```
┌─────────────────┐
│ Usuario olvida  │
│   contraseña    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ /recuperar-     │
│   cuenta        │  ← Ingresa email
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  POST /forgot-  │
│    password     │  ← Genera contraseña temporal
└────────┬────────┘       Envía email con Resend
         │
         ▼
┌─────────────────┐
│  Email recibido │  ← Contraseña: Kx7#bRt3$mWp
│  con contraseña │     Expira en: 1 hora
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   /login con    │  ← Email + contraseña temporal
│  temp password  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Backend valida │  ← validateTemporaryPassword()
│  temp password  │     Marca must_change_password=true
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Frontend       │
│  detecta flag   │  ← if (must_change_password)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Modal: Cambiar  │  ← Nueva contraseña (2 veces)
│   Contraseña    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  POST /change-  │  ← clearTemporaryPassword()
│ password-forced │     Limpia datos temporales
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Redirigir a    │  ✅ Login exitoso
│     /home       │     Contraseña permanente establecida
└─────────────────┘
```

---

## ✅ Checklist de Implementación

- [x] Migración SQL ejecutada
- [x] Servicio forgot-password.service.js
- [x] Plantilla de email con Resend
- [x] Endpoint POST /api/auth/forgot-password
- [x] Endpoint POST /api/auth/change-password-forced
- [x] Login acepta contraseñas temporales
- [x] Modal de cambio obligatorio en login
- [x] Componente recuperar-cuenta actualizado
- [x] Scripts de testing
- [x] Documentación completa

---

## 📞 Soporte

**Problemas comunes:**
- Revisar logs del backend con `npm run dev`
- Verificar consola del navegador (F12)
- Comprobar Network tab para requests fallidos
- Revisar base de datos con consultas SQL

**Contacto:**
- Email: soporte@eclat.com
- GitHub Issues: [link al repo]

---

**Última actualización:** 15 de enero de 2025
**Versión:** 1.0.0
**Autor:** Sistema ÉCLAT
