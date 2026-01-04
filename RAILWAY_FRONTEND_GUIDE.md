# 🚀 Frontend - Guía de Deployment en Railway

## Configuración Realizada

### 1. Archivos de Environment

Se crearon los archivos de configuración para desarrollo y producción:

**`src/environments/environment.ts`** (Desarrollo):
```typescript
export const environment = {
  production: false,
  apiUrl: ''  // Usa proxy.conf.json
};
```

**`src/environments/environment.prod.ts`** (Producción):
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://backendproyecto-production-b330.up.railway.app'
};
```

### 2. Servicio de Configuración API

Se creó `src/app/service/api-config.service.ts` para centralizar la gestión de URLs del API.

### 3. Angular.json

Se agregó `fileReplacements` en la configuración de producción para usar automáticamente `environment.prod.ts`.

## Deploy en Railway

### Opción 1: Build local y deploy

1. **Build de producción**:
```bash
npm run build --configuration=production
```

2. **El output estará en** `dist/proyecto_primer_hemi/browser`

3. **Railway servirá** los archivos estáticos automáticamente

### Opción 2: Railway build automático

Railway detectará automáticamente que es un proyecto Angular y ejecutará:
```bash
npm install
npm run build --configuration=production
```

## Variables de Entorno (si es necesario)

Actualmente no se requieren variables de entorno adicionales porque la URL del backend está hardcodeada en `environment.prod.ts`.

Si quieres usar variables de entorno en Railway:

1. Crear archivo `src/environments/environment.prod.ts` que lea de `process.env`
2. Configurar en Railway la variable `API_URL`

## Importante

⚠️ **Actualizar URL del Backend**: Si cambias el deploy del backend, actualiza la URL en:
- `src/environments/environment.prod.ts`

## URLs del Proyecto

- **Backend**: https://backendproyecto-production-b330.up.railway.app
- **Frontend**: (Se generará después del deploy)

## Verificación Post-Deploy

1. ✅ Página carga correctamente
2. ✅ Login funciona
3. ✅ Imágenes de perfil se cargan desde Cloudinary
4. ✅ No hay errores de CORS
5. ✅ Socket.IO conecta correctamente

## Notas

- El proxy (`proxy.conf.json`) **solo funciona en desarrollo** (ng serve)
- En producción, todas las llamadas van directamente a la URL del backend
- Los servicios usan rutas relativas (`/api/...`) que en producción se convierten a URLs completas
