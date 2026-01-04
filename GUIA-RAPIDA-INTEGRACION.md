# ⚡ Guía Rápida de Integración

**Tiempo estimado:** 5 minutos  
**Nivel:** Muy Fácil

---

## ✅ Lo que ya está hecho

- ✅ Backend endpoints creados
- ✅ Componentes frontend creados
- ✅ API Service actualizado
- ✅ Estilos completos
- ✅ Validaciones implementadas

---

## 📋 Lo que TÚ necesitas hacer

### **1️⃣ Integrar componente en el router** (2 min)

Abre: `src/app/app.routes.ts`

Busca dónde importas otros componentes y agrega:

```typescript
import { GestionarPostulantesComponent } from './components/gestionar-postulantes/gestionar-postulantes';

export const routes: Routes = [
  // ... tus otras rutas ...
  
  // AGREGAR ESTA:
  {
    path: 'admin/gestionar-postulantes',
    component: GestionarPostulantesComponent,
    canActivate: [AuthGuard] // Si usas autenticación
  }
];
```

---

### **2️⃣ Agregar enlace en el navbar** (2 min)

Abre: `src/app/components/navbar/navbar.html` (o donde tengas el menú)

Agrega un enlace:

```html
<!-- En la sección de admin -->
<li>
  <a routerLink="/admin/gestionar-postulantes" class="nav-link">
    📋 Gestionar Postulantes
  </a>
</li>
```

O en el componente TypeScript:

```typescript
// navbar.ts
navlinks = [
  // ... otros enlaces ...
  { label: '📋 Gestionar Postulantes', route: '/admin/gestionar-postulantes', admin: true }
];
```

---

### **3️⃣ Verificar que todo funciona** (1 min)

```bash
# Terminal 1: Asegúrate que PostgreSQL esté corriendo
psql -U postgres

# Terminal 2: Inicia el servidor backend
cd ProyectoV3.0
node index.js

# Terminal 3: Inicia Angular
npm start
```

---

## 🧪 Prueba el flujo completo

### **Paso 1: Crear un postulante**
1. Ve a: `http://localhost:4200/insertar-proveedor`
2. Completa un formulario
3. Haz submit
4. ✅ Se guarda en `trabaja_nosotros_proveedor`

### **Paso 2: Gestionar postulantes**
1. Ve a: `http://localhost:4200/admin/gestionar-postulantes`
2. ✅ Debes ver la lista de postulantes
3. Selecciona uno
4. Completa: Precio, Plan, Descripción
5. Haz click en "Agregar como Proveedor"
6. ✅ Se crea en tabla `proveedor` con estado='pendiente'

### **Paso 3: Ver en Postulaciones Pendientes**
1. Ve a: `http://localhost:4200/admin/postulaciones-pendientes`
2. ✅ El nuevo proveedor debe aparecer allí
3. Puedes aprobarlo o rechazarlo

---

## 🔍 Verificación en BD

Para verificar que todo está guardándose correctamente:

```sql
-- Ver postulantes
SELECT * FROM trabaja_nosotros_proveedor;

-- Ver proveedores creados
SELECT id_proveedor, nombre, estado_aprobacion, verificado 
FROM proveedor 
WHERE estado_aprobacion IN ('pendiente', 'aprobado', 'rechazado')
ORDER BY fecha_registro DESC;
```

---

## 📱 Rutas Disponibles

| Ruta | Componente | Descripción |
|------|-----------|-------------|
| `/insertar-proveedor` | InsertarProveedor | Registrar nuevo postulante |
| `/admin/gestionar-postulantes` | GestionarPostulantes | Convertir postulante a proveedor |
| `/admin/postulaciones-pendientes` | AdmProveedor (filtro) | Aprobar/rechazar proveedores |

---

## 🐛 Si algo no funciona

### Error: "Componente no encontrado"
- ✅ Verifica que el import es correcto
- ✅ Verifica que la ruta del archivo es correcta

### Error: "Postulantes no cargan"
- ✅ Verifica que el servidor backend está corriendo
- ✅ Abre F12 → Network → verifica que GET /api/trabajanosotros retorna datos

### Error: "No aparece en Postulaciones Pendientes"
- ✅ Verifica en BD: `SELECT * FROM proveedor WHERE estado_aprobacion='pendiente'`
- ✅ Actualiza la página en el navegador (F5)

---

## 💡 Recuerda

- **Los endpoints backend YA ESTÁN creados** en `tools/backend-proveedores.js`
- **El componente frontend YA ESTÁ creado** en `src/app/components/gestionar-postulantes/`
- **El API Service YA ESTÁ actualizado** con los nuevos métodos
- **Solo necesitas integrar en el router y agregar enlaces**

---

## 📚 Documentación Completa

Si necesitas más detalles:

- [IMPLEMENTACION-INSERTAR-PROVEEDOR.md](./IMPLEMENTACION-INSERTAR-PROVEEDOR.md) - Sistema de inserción
- [GESTIONAR-POSTULANTES.md](./GESTIONAR-POSTULANTES.md) - Gestión de postulantes
- [RESUMEN-SISTEMA-COMPLETO.md](./RESUMEN-SISTEMA-COMPLETO.md) - Visión general

---

## ✨ Próximos Pasos (Opcional)

1. **Notificaciones por email** cuando se registra un postulante
2. **Descarga de archivos del postulante** desde el panel admin
3. **Estadísticas** de postulantes por categoría
4. **Filtros** por categoría/estado en la lista

---

**¡Eso es todo! Con 5 minutos de trabajo ya tienes el sistema funcionando completamente. 🚀**
