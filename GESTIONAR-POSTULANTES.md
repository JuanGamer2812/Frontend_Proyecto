# 📋 Gestionar Postulantes de Proveedores

**Estado:** ✅ IMPLEMENTADO  
**Fecha:** 26 de Diciembre de 2025

---

## 🎯 Funcionalidad Completada

### Flujo Completo:
1. ✅ Postulantes se registran vía formulario "Insertar Proveedor"
2. ✅ Datos guardados en tabla `trabaja_nosotros_proveedor`
3. ✅ Admin visualiza lista de postulantes en componente "Gestionar Postulantes"
4. ✅ Admin selecciona uno y completa datos faltantes
5. ✅ Se crea proveedor en tabla `proveedor` con `estado_aprobacion='pendiente'`
6. ✅ Aparece en "Postulaciones Pendientes" para aprobación

---

## 📡 Endpoints Backend Agregados

### 1️⃣ GET `/api/trabajanosotros`
**Obtiene lista de postulantes**

```bash
curl http://localhost:3000/api/trabajanosotros
```

**Respuesta:**
```json
[
  {
    "id_postu_proveedor": 1,
    "nom_empresa": "DJ Vibe",
    "categoria": "MUSICA",
    "correo": "contacto@djvibe.com",
    "portafolio": "Especialistas en música electrónica...",
    "fecha": "2025-12-26"
  }
]
```

### 2️⃣ POST `/api/convertir-postulante-a-proveedor`
**Convierte postulante a proveedor**

```bash
curl -X POST http://localhost:3000/api/convertir-postulante-a-proveedor \
  -H "Content-Type: application/json" \
  -d '{
    "id_postu_proveedor": 1,
    "precio_base": 500,
    "id_plan": 2,
    "descripcion": "DJ profesional con 10 años de experiencia"
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Postulante convertido a proveedor exitosamente. Aparecerá en postulaciones pendientes.",
  "id_proveedor": 18,
  "data": {
    "id_proveedor": 18,
    "nombre": "DJ Vibe",
    "precio_base": 500,
    "estado": true,
    "descripcion": "DJ profesional con 10 años de experiencia",
    "id_plan": 2,
    "id_tipo": 1,
    "estado_aprobacion": "pendiente",
    "verificado": false,
    "fecha_registro": "2025-12-26T14:30:00Z"
  }
}
```

---

## 🎨 Componente Frontend

### Ubicación:
```
src/app/components/gestionar-postulantes/
  ├── gestionar-postulantes.ts
  ├── gestionar-postulantes.html
  └── gestionar-postulantes.css
```

### Métodos Principales:
- `cargarPostulantes()` - GET /api/trabajanosotros
- `cargarPlanes()` - GET /api/planes
- `seleccionarPostulante()` - Selecciona un postulante
- `convertir()` - POST /api/convertir-postulante-a-proveedor

### Validaciones Frontend:
- ✅ Precio base > 0
- ✅ Plan seleccionado
- ✅ Descripción ≥ 10 caracteres

---

## 🔗 Integración en el Router

Agrega al `app.routes.ts` o donde importes los componentes:

```typescript
import { GestionarPostulantesComponent } from './components/gestionar-postulantes/gestionar-postulantes';

export const routes: Routes = [
  // ... otras rutas ...
  {
    path: 'admin/gestionar-postulantes',
    component: GestionarPostulantesComponent,
    canActivate: [AuthGuard] // Proteger con autenticación
  }
];
```

---

## 📱 Acceso en la Interfaz

Agrega un enlace en el navbar/dashboard admin:

```html
<a routerLink="/admin/gestionar-postulantes" class="nav-link">
  📋 Gestionar Postulantes
</a>
```

O en el componente de admin:

```typescript
<app-gestionar-postulantes></app-gestionar-postulantes>
```

---

## 🧪 Flujo de Prueba

### Paso 1: Crear Postulante
1. Ir a "Insertar Proveedor"
2. Llenar formulario
3. Hacer submit
4. ✅ Se guarda en `trabaja_nosotros_proveedor`

### Paso 2: Gestionar Postulante
1. Ir a "Gestionar Postulantes"
2. Ver lista de postulantes
3. Seleccionar uno
4. Llenar precio, plan y descripción
5. Hacer click en "Agregar como Proveedor"
6. ✅ Se crea en `proveedor` con estado='pendiente'

### Paso 3: Verificar en Admin
1. Ir a "Postulaciones Pendientes"
2. ✅ Debe aparecer el nuevo proveedor
3. Admin puede aprobar/rechazar

---

## 🔄 Flujo de Datos en Detalle

```
┌─────────────────────┐
│ INSERTAR PROVEEDOR  │
│   (Formulario)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  POST /api/trabaja_nosotros_proveedor   │
│  (Guardar en tabla trabaja_nosotros)    │
└──────────┬──────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│ GESTIONAR POSTULANTES                    │
│ GET /api/trabajanosotros                 │
│ (Cargar lista de postulantes)            │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│ SELECCIONAR Y COMPLETAR DATOS            │
│ - Precio Base                            │
│ - Plan                                   │
│ - Descripción Adicional                  │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│ POST /api/convertir-postulante           │
│ Crear en tabla proveedor con estado=     │
│ 'pendiente', verificado=false            │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│ POSTULACIONES PENDIENTES (Admin Panel)   │
│ GET /api/proveedor?estado=pendiente      │
│ Mostrar nuevos proveedores sin aprobar   │
└──────────┬───────────────────────────────┘
           │
    ┌──────┴──────┐
    ▼             ▼
┌────────┐   ┌─────────┐
│APROBAR │   │RECHAZAR │
└───┬────┘   └────┬────┘
    │             │
    ▼             ▼
estado=        razon_
'aprobado'     rechazo
```

---

## 📊 Campos de la Tabla proveedor

Cuando se convierte un postulante, se crean con estos valores por defecto:

```sql
CREATE TABLE proveedor (
    id_proveedor BIGINT PRIMARY KEY (AUTO),
    nombre VARCHAR(200) -- De nom_empresa_postu_proveedor
    precio_base NUMERIC -- Del formulario de conversión
    estado BOOLEAN DEFAULT true,
    descripcion TEXT -- Del formulario de conversión
    id_plan INTEGER -- Del formulario de conversión
    id_tipo INTEGER -- Mapeado de categoria_postu_proveedor
    imagen_proveedor BYTEA DEFAULT (vacío),
    imagen1_proveedor BYTEA DEFAULT (vacío),
    imagen2_proveedor BYTEA DEFAULT (vacío),
    imagen3_proveedor BYTEA DEFAULT (vacío),
    estado_aprobacion VARCHAR(20) DEFAULT 'pendiente',
    fecha_aprobacion TIMESTAMP DEFAULT NULL,
    aprobado_por INTEGER DEFAULT NULL,
    razon_rechazo TEXT DEFAULT NULL,
    activo BOOLEAN DEFAULT true,
    calificacion_promedio NUMERIC DEFAULT 0,
    total_calificaciones INTEGER DEFAULT 0,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verificado BOOLEAN DEFAULT false
);
```

---

## ⚠️ Validaciones Implementadas

### Backend:
- ✅ ID postulante existe
- ✅ Precio > 0
- ✅ Plan válido
- ✅ Categoría mapea a id_tipo

### Frontend:
- ✅ Precio requerido y > 0
- ✅ Plan requerido
- ✅ Descripción ≥ 10 caracteres
- ✅ Validación reactiva en tiempo real

---

## 🐛 Troubleshooting

### Error: "Postulante no encontrado"
- Verifica que el ID existe en `trabaja_nosotros_proveedor`
- Refresca la lista

### Error: "Categoría no válida"
- Verifica que las categorías sean: MUSICA, CATERING, DECORACION, LUGAR
- Revisa el mapeo en backend

### Error: "Error al cargar postulantes"
- Verifica conexión PostgreSQL
- Verifica que la tabla `trabaja_nosotros_proveedor` tiene registros

---

## 📚 API Service Methods

Se agregaron a `api.service.ts`:

```typescript
// Obtener postulantes
getPostulantesProveedores(): Observable<any[]>

// Convertir postulante a proveedor
convertirPostulanteAProveedor(data: any): Observable<any>
```

---

## ✅ Checklist de Implementación

- [x] Backend GET /api/trabajanosotros
- [x] Backend POST /api/convertir-postulante-a-proveedor
- [x] Métodos en ApiService
- [x] Componente GestionarPostulantes
- [x] HTML con lista y formulario
- [x] CSS responsivo
- [x] Validaciones frontend
- [x] Integración con BD
- [ ] Integrar en router (tú lo haces)
- [ ] Agregar enlace en navbar (tú lo haces)

---

## 🚀 Próximos Pasos

1. **Integra el componente en tu router**
   ```typescript
   import { GestionarPostulantesComponent } from './components/gestionar-postulantes/gestionar-postulantes';
   ```

2. **Agrega enlace en la interfaz de admin**
   ```html
   <a routerLink="/admin/gestionar-postulantes">
     📋 Gestionar Postulantes
   </a>
   ```

3. **Verifica que aparezca en "Postulaciones Pendientes"**
   - El componente `adm-proveedor` ya filtra por `estado_aprobacion='pendiente'`

---

**¡Sistema completo y listo para usar! 🎉**
