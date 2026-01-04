# Sistema de Reservas Dinámico

## 🎯 Cambios Realizados

### 1. **Servicio API Mejorado** (`api.service.ts`)
Se añadieron métodos para:
- `getProveedoresAprobados()`: Obtiene solo proveedores con estado aprobado
- `getProveedoresPorCategoria(categoria)`: Filtra proveedores por categoría
- `getCategorias()`: Obtiene todas las categorías disponibles
- `createReserva(data)`: Crea una nueva reserva

### 2. **Componente de Reserva Rediseñado** (`reserva.ts`)
**Características principales:**
- ✅ Carga dinámica de categorías desde la BD
- ✅ Carga automática de proveedores aprobados
- ✅ Selects en lugar de inputs manuales
- ✅ Agregar/eliminar proveedores por categoría
- ✅ Cálculo automático del total
- ✅ Formulario reactivo con validaciones
- ✅ Se adapta automáticamente a nuevas categorías

**Flujo de uso:**
1. Usuario completa datos del evento
2. Hace clic en categoría deseada (Música, Catering, etc.)
3. Se agrega una tarjeta con select de proveedores aprobados de esa categoría
4. Selecciona proveedor, plan y horarios
5. Puede agregar múltiples proveedores de diferentes categorías
6. Ve el resumen de costos en tiempo real
7. Guarda la reserva

### 3. **Vista HTML Mejorada** (`reserva.html`)
- Diseño por tarjetas (cards)
- Botones dinámicos por categoría con iconos
- Proveedores agrupados y colapsables
- Resumen de costos destacado
- Interfaz más limpia y profesional

## 🔧 Requisitos del Backend

### Endpoints necesarios:

1. **GET `/api/categorias`**
   ```json
   [
     { "id": 1, "nombre": "Música", "icono": "bi-music-note-beamed" },
     { "id": 2, "nombre": "Catering", "icono": "bi-egg-fried" },
     ...
   ]
   ```

2. **GET `/api/proveedor?estado=aprobado`**
   ```json
   [
     {
       "id_proveedor": 1,
       "nombre": "DJ Fiesta",
       "categoria": "Música",
       "descripcion": "...",
       "precio": 500,
       "estado": "aprobado"
     },
     ...
   ]
   ```

3. **GET `/api/proveedor/categoria/:categoria`**
   - Filtra proveedores por categoría específica

4. **POST `/api/reservas`**
   ```json
   {
     "id_usuario": 123,
     "nombreEvento": "Boda...",
     "tipoEvento": "Boda",
     "descripcion": "...",
     "fechaInicio": "2025-12-25T19:00",
     "fechaFin": "2025-12-26T02:00",
     "precioBase": 1000,
     "proveedoresSeleccionados": [
       {
         "categoria": "Música",
         "id_proveedor": 1,
         "plan": "Plus",
         "horaInicio": "20:00",
         "horaFin": "01:00"
       }
     ],
     "estado": "pendiente"
   }
   ```

## 📋 Modelo de Datos

### Proveedor
```typescript
{
  id_proveedor: number;
  nombre: string;
  categoria: string;  // "Música", "Catering", etc.
  descripcion?: string;
  precio?: number;
  estado: string;     // "aprobado", "pendiente", "rechazado"
}
```

### Categoría
```typescript
{
  id?: number;
  nombre: string;     // "Música", "Fotografía", etc.
  icono?: string;     // "bi-music-note-beamed" (Bootstrap Icons)
}
```

## 🚀 Cómo Funciona

### Extensibilidad
- **Agregar nueva categoría**: Solo añádela en la BD en la tabla `categorias`
- El sistema la detectará automáticamente
- Asigna proveedores a esa categoría
- ¡Aparecerá en la UI sin cambios de código!

### Proveedores Aprobados
- Solo aparecen proveedores con `estado = 'aprobado'`
- Si apruebas un nuevo proveedor, aparecerá inmediatamente
- Los rechazados/pendientes no se muestran en reservas

### Validaciones
- Fechas: fin debe ser posterior a inicio
- Proveedores: debe seleccionar uno por categoría agregada
- Plan: obligatorio para cada proveedor
- Usuario: debe estar autenticado

## 🎨 Personalización

### Categorías por Defecto
Si falla la API, usa estas categorías:
- Música
- Catering
- Decoración
- Lugar
- Fotografía
- Video

### Planes Disponibles
- Esencial
- Plus
- Estelar

## 📦 Archivos de Backup
Los archivos originales están respaldados como:
- `reserva.ts.backup`
- `reserva.html.backup`

## 🔍 Próximos Pasos Sugeridos

1. **Backend**: Implementar endpoints faltantes
2. **Testing**: Probar con datos reales de BD
3. **Mejoras UI**: Añadir imágenes de proveedores
4. **Validación**: Verificar disponibilidad de proveedores
5. **Notificaciones**: Enviar email al crear reserva
