# 🚀 Implementación: Sistema de Insertar Proveedores

**Fecha:** 26 de Diciembre de 2025  
**Estado:** ✅ LISTO PARA IMPLEMENTAR

---

## 📋 Resumen

Se ha implementado un **sistema completo de postulación de proveedores** que conecta:
- ✅ Frontend Angular (Insertar Proveedor Component)
- ✅ 3 Endpoints Backend (GET categorías, GET planes, POST postulante)
- ✅ Base de Datos PostgreSQL

---

## 🔧 Instalación y Configuración

### Paso 1: Instalar Dependencias Backend

```bash
npm install pg express multer body-parser
```

### Paso 2: Integrar el Backend Nuevo

En tu **servidor principal Express** (ya sea `index.js`, `server.js`, o similar), agrega:

```javascript
const express = require('express');
const path = require('path');

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Importar las nuevas rutas de proveedores
const proveedoresRouter = require('./tools/backend-proveedores');

// Registrar las rutas
app.use('/api', proveedoresRouter);

// Servir archivos estáticos subidos
app.use('/tmp_uploads', express.static(path.join(__dirname, 'tmp_uploads')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor ejecutándose en puerto ${PORT}`);
});
```

### Paso 3: Configurar Credenciales PostgreSQL

En `tools/backend-proveedores.js`, línea ~20, actualiza:

```javascript
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'eclat',          // Tu base de datos
    user: 'postgres',           // Tu usuario
    password: 'tu_password',    // Tu contraseña
    // ...
});
```

### Paso 4: Crear Directorio de Uploads

```bash
mkdir -p tmp_uploads
chmod 755 tmp_uploads
```

---

## 📡 Endpoints Creados

### 1️⃣ GET `/api/categorias`
**Propósito:** Cargar categorías dinámicamente  
**Respuesta:**
```json
[
  { "id_tipo": 1, "nombre": "MUSICA", "descripcion": "Proveedores de servicios musicales..." },
  { "id_tipo": 2, "nombre": "CATERING", "descripcion": "Proveedores de comida..." },
  { "id_tipo": 3, "nombre": "DECORACION", "descripcion": "..." },
  { "id_tipo": 4, "nombre": "LUGAR", "descripcion": "..." }
]
```

### 2️⃣ GET `/api/planes`
**Propósito:** Cargar planes disponibles  
**Respuesta:**
```json
[
  { "id_plan": 1, "nombre_plan": "Básico", "descripcion": "Plan de entrada..." },
  { "id_plan": 2, "nombre_plan": "Estándar", "descripcion": "Plan popular..." },
  { "id_plan": 3, "nombre_plan": "Premium", "descripcion": "Acceso completo..." },
  { "id_plan": 4, "nombre_plan": "Empresarial", "descripcion": "Soluciones a medida..." }
]
```

### 3️⃣ POST `/api/trabaja_nosotros_proveedor`
**Propósito:** Registrar nuevo postulante de proveedor  
**Content-Type:** `multipart/form-data`

**Campos requeridos:**
```
- nom_empresa_postu_proveedor (string, 3-100 chars)
- categoria_postu_proveedor (MUSICA | CATERING | DECORACION | LUGAR)
- correo_postu_proveedor (email válido)
- portafolio_postu_proveedor (string)
- archivos[] (opcional, hasta 5 archivos: PDF, JPG, PNG, GIF, WEBP)
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Postulación registrada exitosamente. Tu solicitud será revisada pronto.",
  "id_postu_proveedor": 5,
  "data": {
    "id_postu_proveedor": 5,
    "nom_empresa_postu_proveedor": "DJ Eventos Elite",
    "categoria_postu_proveedor": "MUSICA",
    "correo_postu_proveedor": "contacto@djevotos.com",
    "portafolio_postu_proveedor": "Descripción del portafolio...",
    "fecha_postu_proveedor": "2025-12-26"
  },
  "archivos": [
    {
      "nombre": "portfolio.pdf",
      "ruta": "/tmp_uploads/1766775643431-abc123.pdf",
      "tipo": "application/pdf",
      "tamaño": 245780
    }
  ]
}
```

---

## 🎯 Flujo de Datos

```
FRONTEND (Insertar Proveedor)
        ↓
   [Carga categorías y planes desde GET endpoints]
        ↓
   [Usuario completa formulario y sube archivos]
        ↓
   [Envía POST a /api/trabaja_nosotros_proveedor]
        ↓
BACKEND (Node/Express)
        ↓
   [Valida datos y archivos]
        ↓
   [Guarda archivos en /tmp_uploads]
        ↓
   [Inserta registro en tabla trabaja_nosotros_proveedor]
        ↓
PostgreSQL
        ↓
   [Nueva fila en tabla trabaja_nosotros_proveedor]
   [status: pendiente, verificado: false]
        ↓
ADMIN PANEL
        ↓
   [Aparece en "Postulaciones Pendientes"]
   [Admin puede aprobar o rechazar]
        ↓
SI APROBADO: Se copia a tabla proveedor con estado_aprobacion='aprobado'
SI RECHAZADO: Se marca razon_rechazo y estado='rechazado'
```

---

## 🎨 Cambios en Frontend

### `insertar-proveedor.ts`
✅ **Cambios implementados:**
- Inyección de `ApiService`
- Carga dinámica de categorías en `ngOnInit()`
- Carga dinámica de planes en `ngOnInit()`
- Método `enviarProveedor()` que construye `FormData` y llama a `registrarPostulanteProveedor()`
- Manejo de archivos mejorado
- Mensajes de éxito/error

### `api.service.ts`
✅ **Métodos agregados:**
- `getCategorias(): Observable<any[]>` - GET /api/categorias
- `getPlanes(): Observable<any[]>` - GET /api/planes
- `registrarPostulanteProveedor(formData): Observable<any>` - POST /api/trabaja_nosotros_proveedor

---

## 📝 Estructura de Base de Datos Relevante

```sql
-- Tabla de postulantes (donde van los nuevos)
CREATE TABLE trabaja_nosotros_proveedor (
    id_postu_proveedor SERIAL PRIMARY KEY,
    categoria_postu_proveedor VARCHAR(50),
    nom_empresa_postu_proveedor VARCHAR(100),
    correo_postu_proveedor VARCHAR(100),
    portafolio_postu_proveedor TEXT,
    fecha_postu_proveedor DATE DEFAULT CURRENT_DATE
);

-- Tabla de categorías
CREATE TABLE proveedor_tipo (
    id_tipo INTEGER PRIMARY KEY,
    nombre TEXT,
    descripcion_tipo TEXT
);

-- Tabla de planes
CREATE TABLE plan (
    id_plan INTEGER PRIMARY KEY,
    nombre_plan VARCHAR(50),
    descripcion TEXT
);

-- Tabla de proveedores aprobados
CREATE TABLE proveedor (
    id_proveedor BIGINT PRIMARY KEY,
    nombre VARCHAR(200),
    estado_aprobacion VARCHAR(20), -- pendiente, aprobado, rechazado, suspendido
    verificado BOOLEAN DEFAULT false,
    aprobado_por INTEGER, -- FK a usuario.id_usuario
    razon_rechazo TEXT,
    -- ... más campos
);
```

---

## ✅ Validaciones Implementadas

### Backend:
- ✅ Nombre empresa: 3-100 caracteres
- ✅ Categoría válida: MUSICA|CATERING|DECORACION|LUGAR
- ✅ Email válido con regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- ✅ Portafolio no vacío
- ✅ Archivos: máx 50MB, tipos permitidos (PDF, JPG, PNG, GIF, WEBP)

### Frontend:
- ✅ Validación reactiva con FormBuilder
- ✅ Validadores de patrón, longitud, requerido
- ✅ Validador personalizado de horarios (para Música)
- ✅ Validación de capacidad > 0 (para Lugar)
- ✅ Visualización de errores en tiempo real

---

## 🧪 Pruebas

### Probar con cURL:

**1. Obtener categorías:**
```bash
curl http://localhost:3000/api/categorias
```

**2. Obtener planes:**
```bash
curl http://localhost:3000/api/planes
```

**3. Registrar postulante (con archivo):**
```bash
curl -X POST http://localhost:3000/api/trabaja_nosotros_proveedor \
  -F "nom_empresa_postu_proveedor=DJ Vibe" \
  -F "categoria_postu_proveedor=MUSICA" \
  -F "correo_postu_proveedor=contacto@djvibe.com" \
  -F "portafolio_postu_proveedor=Especialistas en música electrónica" \
  -F "archivos=@/ruta/a/portfolio.pdf"
```

---

## 🐛 Troubleshooting

### Error: "Error al cargar categorías"
- ✅ Verifica que PostgreSQL esté corriendo
- ✅ Verifica credenciales en `backend-proveedores.js`
- ✅ Verifica que la base de datos `eclat` existe
- ✅ Verifica que la tabla `proveedor_tipo` tiene registros

### Error: "Puerto ya está en uso"
```bash
# Encontrar y matar proceso en puerto 3000 (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Error: "Tabla trabaja_nosotros_proveedor no existe"
- ✅ La tabla ya existe en tu BD (verificado en tu SQL)
- ✅ Si no existe, ejecuta:
```sql
CREATE TABLE trabaja_nosotros_proveedor (
    id_postu_proveedor SERIAL PRIMARY KEY,
    categoria_postu_proveedor VARCHAR(50) NOT NULL,
    nom_empresa_postu_proveedor VARCHAR(100) NOT NULL,
    correo_postu_proveedor VARCHAR(100) NOT NULL,
    portafolio_postu_proveedor TEXT NOT NULL,
    fecha_postu_proveedor DATE DEFAULT CURRENT_DATE
);
```

---

## 📊 Próximos Pasos

1. ✅ **Ya implementado:**
   - Backend endpoints
   - Frontend component
   - API service methods

2. 🔄 **Por hacer (opcional):**
   - [ ] Confirmación de email después de postulación
   - [ ] Notificación al admin cuando hay nueva postulación
   - [ ] Dashboard de postulaciones para admin
   - [ ] Sistema de descarga de documentos del postulante
   - [ ] Webhooks de integración con otros sistemas

---

## 📞 Soporte

Si tienes problemas:
1. Verifica que el servidor Express esté corriendo: `npm start`
2. Verifica conexión a PostgreSQL: `psql -U postgres -d eclat -c "SELECT 1"`
3. Revisa los logs en la consola del servidor
4. Verifica la consola del navegador (F12) para errores HTTP

---

**¡Sistema listo para usar! 🎉**
