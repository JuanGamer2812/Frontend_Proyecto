# 🔐 Recuperación de Contraseña - Guía Rápida

## ✅ Implementación Completa

Sistema de recuperación de contraseña con **contraseñas temporales** enviadas vía **Resend**.

---

## 📦 Archivos Modificados/Creados

### Backend
- ✅ `migrations/012_temporary_password.sql` - Schema de BD
- ✅ `src/services/forgot-password.service.js` - Lógica de contraseñas temporales
- ✅ `src/services/email.service.js` - Plantilla de email con Resend
- ✅ `src/services/auth.service.js` - Login acepta contraseñas temporales
- ✅ `src/controllers/auth.controller.js` - Endpoints forgot-password y change-password-forced
- ✅ `src/routes/auth.routes.js` - Rutas públicas y protegidas
- ✅ `scripts/manual_forgot_password.js` - Script de testing
- ✅ `scripts/reset_forgot_password_cooldown.js` - Reset cooldown para desarrollo

### Frontend
- ✅ `src/app/service/password-reset.service.ts` - Servicio actualizado
- ✅ `src/app/service/auth-jwt.service.ts` - Interfaces con must_change_password
- ✅ `src/app/components/recuperar-cuenta/` - UI simplificada
- ✅ `src/app/components/login/` - Modal de cambio obligatorio

### Documentación
- ✅ `RECUPERACION_PASSWORD_GUIA.md` - Documentación completa
- ✅ `RECUPERACION_PASSWORD_GUIA_RAPIDA.md` - Este archivo

---

## 🚀 Endpoints Nuevos

### Público
```
POST /api/auth/forgot-password
Body: { "email": "usuario@example.com" }
Response: { "success": true, "message": "..." }
```

### Protegido (requiere JWT)
```
POST /api/auth/change-password-forced
Body: { "newPassword": "NuevaContraseña123!" }
Response: { "success": true, "message": "Contraseña actualizada" }
```

---

## 📊 Base de Datos

Nuevas columnas en tabla `usuario`:
```sql
temp_password_hash TEXT
temp_password_expires_at TIMESTAMP
must_change_password BOOLEAN
reset_last_requested_at TIMESTAMP
```

---

## 🔑 Características

- ✅ Contraseña aleatoria de 12 caracteres (mayúsculas, minúsculas, números, símbolos)
- ✅ Expiración automática en 1 hora
- ✅ Cooldown de 5 minutos entre solicitudes
- ✅ Email profesional con Resend
- ✅ Login con contraseña temporal + cambio obligatorio
- ✅ Prevención de enumeración de usuarios
- ✅ Limpieza automática después del cambio

---

## 🧪 Testing Rápido

```bash
# 1. Resetear cooldown (si es necesario)
node scripts/reset_forgot_password_cooldown.js --email=tu-email@example.com

# 2. Generar contraseña temporal y enviar email
node scripts/manual_forgot_password.js

# 3. Copiar contraseña temporal del output
# Ejemplo: MSywWhR9$*3y

# 4. Ir a http://localhost:4200/login
# 5. Login con email + contraseña temporal
# 6. Aparecerá modal para cambiar contraseña
# 7. Ingresar nueva contraseña permanente
# 8. Redirigir a home
```

---

## 🎯 Flujo Completo

```
Usuario → /recuperar-cuenta → Ingresa email
    ↓
Backend genera contraseña temporal (ej: MSywWhR9$*3y)
    ↓
Resend envía email con contraseña
    ↓
Usuario recibe email → Copia contraseña
    ↓
Usuario → /login → Email + contraseña temporal
    ↓
Backend valida contraseña temporal → Marca must_change_password=true
    ↓
Frontend detecta flag → Muestra modal
    ↓
Usuario ingresa nueva contraseña permanente
    ↓
Backend limpia datos temporales → Establece contraseña permanente
    ↓
Usuario redirigido a /home ✅
```

---

## 🔒 Seguridad

- ✅ Hash bcrypt de contraseñas temporales
- ✅ Expiración en 1 hora
- ✅ Cooldown anti-spam (5 minutos)
- ✅ Prevención de enumeración (mismo mensaje siempre)
- ✅ Invalidación de refresh tokens al cambiar contraseña
- ✅ Limpieza automática de datos temporales

---

## ⚙️ Variables de Entorno

```env
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=onboarding@resend.dev
TEST_VERIFICATION_EMAIL=tu-email@example.com
FRONTEND_URL=http://localhost:4200
JWT_SECRET=tu-secret-key
```

---

## 📋 Checklist

- [x] Migración SQL ejecutada
- [x] Backend endpoints implementados
- [x] Email con Resend configurado
- [x] Frontend actualizado
- [x] Modal de cambio obligatorio
- [x] Scripts de testing
- [x] Documentación completa

---

## 🛠️ Comandos Útiles

```bash
# Ejecutar migración
node -e "const pool = require('./src/config/db'); const fs = require('fs'); const sql = fs.readFileSync('./migrations/012_temporary_password.sql', 'utf8'); pool.query(sql).then(() => console.log('Migración exitosa'));"

# Test completo
node scripts/manual_forgot_password.js

# Reset cooldown
node scripts/reset_forgot_password_cooldown.js --email=usuario@example.com

# Verificar BD
psql -U postgres -d eclat -c "SELECT correo_usuario, temp_password_hash IS NOT NULL as tiene_temp, temp_password_expires_at, must_change_password FROM usuario WHERE correo_usuario = 'usuario@example.com';"
```

---

## 📞 Troubleshooting

| Problema | Solución |
|----------|----------|
| Email no llega | Verificar RESEND_API_KEY y TEST_VERIFICATION_EMAIL |
| "Debes esperar X minutos" | `node scripts/reset_forgot_password_cooldown.js --email=xxx` |
| "Contraseña temporal expirada" | Solicitar nueva contraseña temporal |
| Modal no aparece | Verificar must_change_password en BD |
| Error "columna no existe" | Verificar migración ejecutada correctamente |

---

## 📚 Documentación Completa

Ver: `RECUPERACION_PASSWORD_GUIA.md`

---

**Última actualización:** 27 de diciembre de 2024  
**Autor:** Sistema ÉCLAT  
**Status:** ✅ Implementación completacompletada y testeada
