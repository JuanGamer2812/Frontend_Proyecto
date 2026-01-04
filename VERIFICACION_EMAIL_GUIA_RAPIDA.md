# GUÍA RÁPIDA: Verificación de Email - Implementación

## Resumen Técnico

Se ha implementado un módulo completo de verificación de email que permite a los usuarios verificar su dirección de correo electrónico a través de un enlace enviado por Resend.

## Configuración Rápida (5 pasos)

### 1. Configurar Variables de Entorno (Backend)

Editar o crear `.env` en `BackEnd_Proyecto/`:

```env
# Resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx  # Tu API key de Resend
RESEND_FROM_EMAIL=noreply@eclat-eventos.com

# Frontend URL
FRONTEND_URL=http://localhost:4200  # En desarrollo
# FRONTEND_URL=https://tudominio.com  # En producción
```

### 2. Ejecutar Migración SQL

```bash
# Conectarse a la BD PostgreSQL
psql -U usuario -d basedatos -f BackEnd_Proyecto/migrations/011_email_verification.sql
```

O ejecutar manualmente:
```sql
ALTER TABLE usuario ADD COLUMN email_verified BOOLEAN DEFAULT false;
ALTER TABLE usuario ADD COLUMN verification_token TEXT;
ALTER TABLE usuario ADD COLUMN email_verification_sent_at TIMESTAMP;
CREATE INDEX idx_usuario_verification_token ON usuario(verification_token) WHERE verification_token IS NOT NULL;
```

### 3. Instalar Dependencias

```bash
cd BackEnd_Proyecto
npm install
```

### 4. Reiniciar Backend

```bash
npm start
```

Verificar logs:
```
[verification.service] Verification email sent for user: 123
[email.service] Verification email sent via Resend: messageId
```

### 5. Iniciar Frontend

```bash
cd ProyectoV3.0
npm start
```

## Testing

### Flujo Completo

1. **Registrarse**: Ir a `/crear-cuenta` y crear usuario
2. **Verificación**: Ir a `/perfil` > Pestaña "Seguridad"
3. **Enviar Email**: Click en "Reenviar correo de verificación"
4. **Recibir Email**: Revisar bandeja (o consola de Resend en dev)
5. **Hacer Click**: Abrir link `/verificar-cuenta?token=...`
6. **Confirmar**: Ver ✅ "Email verificado correctamente"

### Pruebas Manuales

**Cooldown de 5 minutos:**
```bash
# Intentar 2 clicks rápidos → Error 429
# Esperar 5+ minutos → Permitir nuevo envío
```

**Expiración de 24 horas:**
```bash
# En BD: UPDATE usuario SET email_verification_sent_at = NOW() - INTERVAL '25 hours'
# Link debería expirar y mostrar error
```

## Archivos Principales

### Backend
- `src/models/auth.model.js` - Métodos de base de datos
- `src/services/verification.service.js` - Lógica de verificación
- `src/services/email.service.js` - Integración con Resend
- `src/controllers/auth.controller.js` - Endpoints
- `src/routes/auth.routes.js` - Rutas

### Frontend
- `src/app/service/verification.service.ts` - Cliente HTTP
- `src/app/components/verificar-cuenta/` - Componente de verificación
- `src/app/components/perfil/` - Interfaz en perfil
- `src/app/app.routes.ts` - Ruta pública

## Endpoints

### POST `/api/auth/send-verification`
**Requiere:** Token JWT  
**Body:** `{}`  
**Respuesta:**
```json
{
  "message": "Email de verificación enviado",
  "success": true,
  "provider": "resend"
}
```

**Errores:**
- `400` - Email ya verificado
- `401` - No autenticado
- `429` - Cooldown activo (< 5 min)

### GET `/api/auth/verify-email?token=...`
**Requiere:** Token en query parameter  
**Respuesta:**
```json
{
  "message": "Email verificado exitosamente",
  "success": true,
  "userId": 123,
  "userEmail": "user@example.com",
  "alreadyVerified": false
}
```

**Errores:**
- `400` - Token inválido o expirado

## Variables de Entorno Requeridas

```env
# OBLIGATORIAS para verificación
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=noreply@eclat-eventos.com
FRONTEND_URL=http://localhost:4200

# EXISTENTES (no cambiar)
JWT_SECRET=...
DB_HOST=localhost
DB_PORT=5432
```

## Seguridad

✅ Tokens hexadecimales de 64 caracteres  
✅ Expiración de 24 horas  
✅ Cooldown de 5 minutos  
✅ API key nunca expuesta en frontend  
✅ Validación server-side  
✅ No bloquea login  

## Troubleshooting

| Problema | Solución |
|----------|----------|
| "Resend: Invalid API key" | Verificar `RESEND_API_KEY` en `.env` |
| "Cannot find module 'resend'" | Ejecutar `npm install` en backend |
| "Link no funciona en email" | Verificar `FRONTEND_URL` en `.env` |
| "Cooldown siempre activo" | Revisar timestamp en BD: `SELECT email_verification_sent_at FROM usuario WHERE id_usuario=123` |
| "Angular no reconoce VerificationService" | Verificar import: `import { VerificationService } from '../../service/verification.service'` |

## Próximos Pasos

1. ✅ Implementado: Sistema completo
2. ⏳ Para hacer: Configurar credenciales de Resend
3. 📧 Enviar emails con Resend (pruebas)
4. 🔐 Deploy en producción con dominio verificado

## Documentación Completa

Ver: `IMPLEMENTACION_VERIFICACION_EMAIL.md`

## Soporte Resend

- **Docs:** https://resend.com/docs
- **Dashboard:** https://resend.com/emails
- **API Keys:** https://resend.com/api-keys
- **Email Testing:** https://resend.com/emails (historial)
