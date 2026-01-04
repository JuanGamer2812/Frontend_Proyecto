# Backend Requirements - Sistema de Verificación de Proveedores

## ✅ CAMPOS EXISTENTES EN BD (usar estos solamente)

La tabla `proveedor` YA tiene todos los campos necesarios:
- ✅ `verificado` BOOLEAN DEFAULT false
- ✅ `estado_aprobacion` VARCHAR(20) CHECK IN ('pendiente', 'aprobado', 'rechazado', 'suspendido')
- ✅ `aprobado_por` INTEGER REFERENCES usuario(id_usuario)
- ✅ `fecha_aprobacion` TIMESTAMP
- ✅ `razon_rechazo` TEXT
- ✅ Trigger `actualizar_fecha_aprobacion()` - establece `fecha_aprobacion` y `verificado=true` automáticamente al aprobar

## ⚠️ USO DE CAMPOS EXISTENTES

| Campo | Uso |
|-------|-----|
| `aprobado_por` | Registra el admin que aprueba, rechaza O suspende (reutilizar para todo) |
| `razon_rechazo` | Almacena motivo tanto de rechazo como de suspensión |
| `fecha_aprobacion` | Manejado automáticamente por trigger de BD |
| `verificado` | `true` = proveedor registrado, `false` = postulación |
| `estado_aprobacion` | Define el estado actual del proveedor |

## Lógica de Negocio

### Estados de Proveedor

1. **Postulación Pendiente**
   - `verificado = false`
   - `estado_aprobacion = 'pendiente'`
   - Aparece en: Tab "Postulaciones Pendientes" (admin)
   - NO aparece en: /colaboradores

2. **Aprobado y Activo**
   - `verificado = true`
   - `estado_aprobacion = 'aprobado'`
   - `aprobado_por` = ID del admin que aprobó
   - `fecha_aprobacion` = Timestamp automático (trigger)
   - Aparece en: Tab "Proveedores Registrados" (admin) y /colaboradores (público)

3. **Suspendido**
   - `verificado = true` (NO cambia)
   - `estado_aprobacion = 'suspendido'`
   - `aprobado_por` = ID del admin que suspendió
   - `razon_rechazo` = Motivo de suspensión
   - Aparece en: Tab "Proveedores Registrados" (admin) con badge de suspendido
   - NO aparece en: /colaboradores (filtrar en backend)

4. **Rechazado**
   - `verificado = false`
   - `estado_aprobacion = 'rechazado'`
   - `aprobado_por` = ID del admin que rechazó
   - `razon_rechazo` = Motivo del rechazo (obligatorio)
   - Aparece en: Tab "Postulaciones Pendientes" (admin) - solo lectura
   - NO aparece en: /colaboradores

## Endpoints a Implementar/Modificar

### 1. GET /api/proveedor

**Añadir soporte para filtros por query params:**

```javascript
// Ejemplo: GET /api/proveedor?verificado=true&categoria=MUSICA
// Ejemplo: GET /api/proveedor?verificado=false
```

**Implementación sugerida en Node.js/Express:**

```javascript
router.get('/api/proveedor', async (req, res) => {
  try {
    const { verificado, estado_aprobacion, categoria } = req.query;
    
    let query = 'SELECT p.*, pt.nombre as tipo_nombre FROM proveedor p JOIN proveedor_tipo pt ON p.id_tipo = pt.id_tipo WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    // Filtrar por verificado
    if (verificado !== undefined) {
      const isVerificado = verificado === 'true';
      params.push(isVerificado);
      query += ` AND p.verificado = $${paramIndex++}`;
    }
    
    // Filtrar por estado_aprobacion
    if (estado_aprobacion) {
      params.push(estado_aprobacion);
      query += ` AND p.estado_aprobacion = $${paramIndex++}`;
    }
    
    // Filtrar por categoría/tipo
    if (categoria) {
      params.push(categoria.toUpperCase());
      query += ` AND UPPER(pt.nombre) = $${paramIndex++}`;
    }
    
    query += ' ORDER BY p.fecha_registro DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener proveedores:', error);
    res.status(500).json({ error: 'Error al obtener proveedores' });
  }
});
```

### 2. GET /api/proveedor (Para /colaboradores - Vista Pública)

**CRÍTICO:** Filtrar proveedores suspendidos para que NO aparezcan en la vista pública

```javascript
// El componente Colaboradores debe llamar:
// GET /api/proveedor?verificado=true&estado_aprobacion=aprobado

// O crear endpoint específico:
router.get('/api/proveedor/publico', async (req, res) => {
  try {
    const query = `
      SELECT p.*, pt.nombre as tipo_nombre 
      FROM proveedor p 
      JOIN proveedor_tipo pt ON p.id_tipo = pt.id_tipo
      WHERE p.verificado = true 
        AND p.estado_aprobacion = 'aprobado' 
        AND p.activo = true
      ORDER BY p.nombre ASC
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener proveedores públicos:', error);
    res.status(500).json({ error: 'Error al obtener proveedores' });
  }
});
```

### 3. PUT /api/proveedor/:id

**Campos que el backend debe aceptar y persistir:**

```typescript
interface UpdateProveedorRequest {
  // Campos de verificación (los que usa el frontend)
  verificado?: boolean;
  estado_aprobacion?: 'pendiente' | 'aprobado' | 'rechazado' | 'suspendido';
  razon_rechazo?: string;  // Motivo de rechazo O suspensión
  aprobado_por?: number;   // ID del admin (aprobar, rechazar, suspender)
}
```

**Implementación sugerida:**

```javascript
router.put('/api/proveedor/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { verificado, estado_aprobacion, razon_rechazo, aprobado_por } = req.body;
    
    const query = `
      UPDATE proveedor SET
        verificado = COALESCE($1, verificado),
        estado_aprobacion = COALESCE($2, estado_aprobacion),
        razon_rechazo = COALESCE($3, razon_rechazo),
        aprobado_por = COALESCE($4, aprobado_por)
      WHERE id_proveedor = $5
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      verificado, 
      estado_aprobacion, 
      razon_rechazo, 
      aprobado_por, 
      id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar proveedor:', error);
    res.status(500).json({ error: 'Error al actualizar proveedor' });
  }
});
```

## Casos de Uso - Payloads JSON

### 1. Aprobar Proveedor

**Frontend envía:**
```json
{
  "verificado": true,
  "estado_aprobacion": "aprobado",
  "aprobado_por": 5
}
```

**Efecto en BD:**
- `verificado = true`
- `estado_aprobacion = 'aprobado'`
- `aprobado_por = 5`
- `fecha_aprobacion = CURRENT_TIMESTAMP` (trigger automático)

**UI:**
- Aparece en tab "Proveedores Registrados"
- Aparece en /colaboradores

---

### 2. Rechazar Proveedor

**Frontend envía:**
```json
{
  "verificado": false,
  "estado_aprobacion": "rechazado",
  "razon_rechazo": "No cumple con los requisitos mínimos",
  "aprobado_por": 5
}
```

**Efecto en BD:**
- `verificado = false`
- `estado_aprobacion = 'rechazado'`
- `razon_rechazo = "No cumple..."`
- `aprobado_por = 5`

**UI:**
- Se mantiene en tab "Postulaciones Pendientes" (solo lectura)
- NO aparece en "Proveedores Registrados"
- NO aparece en /colaboradores

---

### 3. Suspender Proveedor

**Frontend envía:**
```json
{
  "estado_aprobacion": "suspendido",
  "razon_rechazo": "Incumplimiento de contrato",
  "aprobado_por": 5
}
```

**NOTA:** `verificado` NO se envía, se mantiene en `true` en BD

**Efecto en BD:**
- `verificado = true` (NO cambia)
- `estado_aprobacion = 'suspendido'`
- `razon_rechazo = "Incumplimiento..."`
- `aprobado_por = 5` (reutilizar para suspensión)

**UI:**
- Permanece en tab "Proveedores Registrados" con badge "Suspendido"
- NO aparece en /colaboradores (backend debe filtrar)

---

### 4. Desuspender Proveedor

**Frontend envía:**
```json
{
  "estado_aprobacion": "aprobado",
  "razon_rechazo": null
}
```

**Efecto en BD:**
- `verificado = true` (no cambia)
- `estado_aprobacion = 'aprobado'`
- `razon_rechazo = NULL` (limpiar)

**UI:**
- Permanece en tab "Proveedores Registrados"
- Vuelve a aparecer en /colaboradores

---

## Validaciones Backend Requeridas

### 1. Al Aprobar:
- ✅ Establecer `verificado = true`
- ✅ Establecer `estado_aprobacion = 'aprobado'`
- ✅ Registrar `aprobado_por` con ID del admin
- ✅ Trigger establece `fecha_aprobacion` automáticamente

### 2. Al Rechazar:
- ✅ Establecer `verificado = false`
- ✅ Establecer `estado_aprobacion = 'rechazado'`
- ⚠️ `razon_rechazo` es **obligatorio**
- ✅ Registrar `aprobado_por` con ID del admin

### 3. Al Suspender:
- ⚠️ **NO cambiar** `verificado` (debe mantenerse en `true`)
- ✅ Establecer `estado_aprobacion = 'suspendido'`
- ⚠️ `razon_rechazo` es **obligatorio**
- ✅ Registrar `aprobado_por` con ID del admin

### 4. Endpoint /colaboradores:
- ⚠️ **CRÍTICO:** Filtrar `WHERE verificado = true AND estado_aprobacion = 'aprobado'`
- ❌ NO incluir proveedores con `estado_aprobacion = 'suspendido'`

---

## Respuesta JSON del Backend

```typescript
interface ProveedorResponse {
  id_proveedor: number;
  nombre: string;
  descripcion: string;
  precio_base: number;
  estado: boolean;
  id_tipo: number;
  tipo_nombre: string;
  verificado: boolean;
  estado_aprobacion: 'pendiente' | 'aprobado' | 'rechazado' | 'suspendido';
  razon_rechazo?: string;  // Motivo de rechazo O suspensión
  
  // Auditoría (campos existentes en BD)
  aprobado_por?: number;       // ID del admin que aprobó/rechazó/suspendió
  fecha_aprobacion?: string;   // Timestamp ISO 8601 (manejado por trigger)
}
```

**Ejemplo de respuesta:**
```json
{
  "id_proveedor": 18,
  "nombre": "DJ Eventos Elite",
  "descripcion": "Servicio profesional de DJ",
  "precio_base": 150.00,
  "estado": true,
  "id_tipo": 1,
  "tipo_nombre": "MUSICA",
  "verificado": true,
  "estado_aprobacion": "aprobado",
  "razon_rechazo": null,
  "aprobado_por": 5,
  "fecha_aprobacion": "2025-12-26T10:30:00.000Z"
}
```

---

## Testing Checklist Backend

### Endpoint: GET /api/proveedor
- [ ] `?verificado=true` retorna solo proveedores con verificado=true
- [ ] `?verificado=false` retorna solo postulaciones (verificado=false)
- [ ] `?verificado=true&estado_aprobacion=aprobado` retorna solo aprobados
- [ ] `?verificado=true&estado_aprobacion=suspendido` retorna solo suspendidos
- [ ] Sin parámetros retorna TODOS los proveedores

### Endpoint: GET /api/proveedor (Para /colaboradores)
- [ ] Solo retorna proveedores con `verificado=true AND estado_aprobacion='aprobado'`
- [ ] NO incluye proveedores suspendidos
- [ ] NO incluye postulaciones pendientes

### Endpoint: PUT /api/proveedor/:id
- [ ] Aprobar: establece verificado=true, estado_aprobacion='aprobado', aprobado_por
- [ ] Rechazar: establece verificado=false, estado_aprobacion='rechazado', razon_rechazo, aprobado_por
- [ ] Suspender: NO cambia verificado, establece estado_aprobacion='suspendido', razon_rechazo, aprobado_por
- [ ] Desuspender: establece estado_aprobacion='aprobado', limpia razon_rechazo
- [ ] Valida que razon_rechazo sea obligatorio al rechazar/suspender

---

## Resumen para Implementar

### ✅ Usar SOLO estos campos existentes:
1. `verificado` - Separa registrados (true) de postulaciones (false)
2. `estado_aprobacion` - Define estado actual (pendiente, aprobado, rechazado, suspendido)
3. `razon_rechazo` - Almacena motivo de rechazo O suspensión
4. `aprobado_por` - ID del admin (reutilizar para aprobar, rechazar, suspender)
5. `fecha_aprobacion` - Timestamp automático (trigger)

### ⚠️ NO crear campos nuevos
- NO suspendido_por
- NO modificado_por
- NO fecha_suspension
- NO fecha_modificacion

### 🎯 Endpoints críticos:
1. **GET /api/proveedor** - Agregar filtros por query params
2. **GET /api/proveedor (colaboradores)** - Filtrar `verificado=true AND estado_aprobacion='aprobado'`
3. **PUT /api/proveedor/:id** - Aceptar verificado, estado_aprobacion, razon_rechazo, aprobado_por

---
  accion VARCHAR(50),  -- 'aprobar', 'rechazar', 'suspender', 'editar'
  estado_anterior VARCHAR(50),
  estado_nuevo VARCHAR(50),
  motivo TEXT,
  fecha_accion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_usuario VARCHAR(50),
  datos_cambio JSONB  -- Para guardar todos los campos que cambiaron
);

CREATE INDEX idx_auditoria_proveedor ON proveedor_auditoria(id_proveedor);
CREATE INDEX idx_auditoria_usuario ON proveedor_auditoria(id_usuario);
CREATE INDEX idx_auditoria_fecha ON proveedor_auditoria(fecha_accion);
```

## Testing

### Test Case 1: Aprobar Postulación
1. Crear proveedor con `verificado=false`, `estado_aprobacion='pendiente'`
2. Aprobar via PUT
3. Verificar: `verificado=true`, `estado_aprobacion='aprobado'`, campos de auditoría completos
4. Verificar que aparece en GET con `verificado=true`

### Test Case 2: Rechazar Postulación
1. Crear proveedor con `verificado=false`, `estado_aprobacion='pendiente'`
2. Rechazar via PUT con motivo
3. Verificar: `verificado=false`, `estado_aprobacion='rechazado'`, `motivo_rechazo` guardado
4. Verificar que NO aparece en `/colaboradores`

### Test Case 3: Suspender Proveedor Activo
1. Crear proveedor aprobado (`verificado=true`, `estado_aprobacion='aprobado'`)
2. Suspender via PUT
3. Verificar: `verificado=true` (sin cambiar), `estado_aprobacion='suspendido'`
4. Verificar que NO aparece en `/colaboradores`
5. Verificar que SÍ aparece en admin con `verificado=true`

### Test Case 4: Desuspender Proveedor
1. Tener proveedor suspendido
2. Desuspender via PUT
3. Verificar: `verificado=true`, `estado_aprobacion='aprobado'`
4. Verificar que vuelve a aparecer en `/colaboradores`
