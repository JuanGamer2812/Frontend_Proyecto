# 🔧 Guía Rápida: Aprobar Proveedores en PostgreSQL

## ⚠️ IMPORTANTE
Para que los proveedores aparezcan en el desplegable del sistema de reservas, **DEBEN** tener `estado_aprobacion = 'aprobado'`.

Actualmente, todos los proveedores en tu base de datos están en estado `'pendiente'`.

---

## 🚀 Opción 1: Aprobar TODOS los Proveedores (Desarrollo/Testing)

```sql
-- Aprobar todos los proveedores de una vez
UPDATE proveedor 
SET estado_aprobacion = 'aprobado',
    verificado = true,
    fecha_aprobacion = CURRENT_TIMESTAMP
WHERE estado_aprobacion = 'pendiente';

-- Verificar cuántos se aprobaron
SELECT COUNT(*) as total_aprobados 
FROM proveedor 
WHERE estado_aprobacion = 'aprobado';
```

---

## 🎯 Opción 2: Aprobar Proveedores Específicos

### Aprobar por ID
```sql
UPDATE proveedor 
SET estado_aprobacion = 'aprobado',
    verificado = true,
    fecha_aprobacion = CURRENT_TIMESTAMP,
    aprobado_por = 1  -- ID del usuario administrador
WHERE id_proveedor IN (1, 2, 5, 9);  -- IDs específicos
```

### Aprobar por Categoría
```sql
-- Aprobar todos los proveedores de MUSICA
UPDATE proveedor 
SET estado_aprobacion = 'aprobado',
    verificado = true,
    fecha_aprobacion = CURRENT_TIMESTAMP
WHERE id_tipo = (SELECT id_tipo FROM proveedor_tipo WHERE nombre = 'MUSICA');

-- Aprobar todos los de CATERING
UPDATE proveedor 
SET estado_aprobacion = 'aprobado',
    verificado = true,
    fecha_aprobacion = CURRENT_TIMESTAMP
WHERE id_tipo = (SELECT id_tipo FROM proveedor_tipo WHERE nombre = 'CATERING');
```

---

## 📊 Consultas Útiles

### Ver todos los proveedores con su estado
```sql
SELECT 
    p.id_proveedor,
    p.nombre,
    pt.nombre as categoria,
    p.precio_base,
    p.estado_aprobacion,
    p.verificado,
    p.activo,
    p.fecha_aprobacion
FROM proveedor p
JOIN proveedor_tipo pt ON p.id_tipo = pt.id_tipo
ORDER BY pt.nombre, p.nombre;
```

### Ver solo proveedores aprobados (los que aparecen en el frontend)
```sql
SELECT 
    p.id_proveedor,
    p.nombre,
    pt.nombre as categoria,
    p.precio_base,
    p.calificacion_promedio
FROM proveedor p
JOIN proveedor_tipo pt ON p.id_tipo = pt.id_tipo
WHERE p.estado_aprobacion = 'aprobado'
  AND p.activo = true
ORDER BY pt.nombre, p.calificacion_promedio DESC;
```

### Contar proveedores por estado
```sql
SELECT 
    estado_aprobacion,
    COUNT(*) as cantidad
FROM proveedor
GROUP BY estado_aprobacion;
```

---

## 🔄 Cambiar Estado de Proveedores

### Rechazar un proveedor
```sql
UPDATE proveedor 
SET estado_aprobacion = 'rechazado',
    razon_rechazo = 'No cumple con los requisitos mínimos'
WHERE id_proveedor = 99;
```

### Suspender un proveedor aprobado
```sql
UPDATE proveedor 
SET estado_aprobacion = 'suspendido',
    razon_rechazo = 'Quejas de clientes'
WHERE id_proveedor = 99;
```

### Reactivar un proveedor suspendido
```sql
UPDATE proveedor 
SET estado_aprobacion = 'aprobado',
    razon_rechazo = NULL,
    fecha_aprobacion = CURRENT_TIMESTAMP
WHERE id_proveedor = 99;
```

### Desactivar temporalmente (sin cambiar aprobación)
```sql
UPDATE proveedor 
SET activo = false
WHERE id_proveedor = 99;
```

---

## 📝 Crear Endpoint de Administración (Opcional)

Si quieres aprobar proveedores desde el frontend, crea este endpoint en tu backend:

```javascript
// POST /api/admin/proveedor/:id/aprobar
router.post('/admin/proveedor/:id/aprobar', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    
    const result = await pool.query(`
      UPDATE proveedor 
      SET estado_aprobacion = 'aprobado',
          verificado = true,
          fecha_aprobacion = CURRENT_TIMESTAMP,
          aprobado_por = $1
      WHERE id_proveedor = $2
      RETURNING id_proveedor, nombre, estado_aprobacion
    `, [adminId, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Proveedor no encontrado' });
    }
    
    res.json({
      message: 'Proveedor aprobado exitosamente',
      proveedor: result.rows[0]
    });
  } catch (error) {
    console.error('Error al aprobar proveedor:', error);
    res.status(500).json({ message: 'Error al aprobar proveedor' });
  }
});

// POST /api/admin/proveedor/:id/rechazar
router.post('/admin/proveedor/:id/rechazar', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { razon } = req.body;
    const adminId = req.user.id;
    
    const result = await pool.query(`
      UPDATE proveedor 
      SET estado_aprobacion = 'rechazado',
          verificado = false,
          razon_rechazo = $1,
          aprobado_por = $2
      WHERE id_proveedor = $3
      RETURNING id_proveedor, nombre, estado_aprobacion
    `, [razon, adminId, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Proveedor no encontrado' });
    }
    
    res.json({
      message: 'Proveedor rechazado',
      proveedor: result.rows[0]
    });
  } catch (error) {
    console.error('Error al rechazar proveedor:', error);
    res.status(500).json({ message: 'Error al rechazar proveedor' });
  }
});
```

---

## ✅ Checklist Post-Aprobación

Después de aprobar proveedores, verifica:

- [ ] Estado actualizado en BD: `SELECT * FROM proveedor WHERE estado_aprobacion = 'aprobado';`
- [ ] Endpoint `/api/proveedor?estado=aprobado` retorna los proveedores
- [ ] Proveedores aparecen en el desplegable del frontend
- [ ] Endpoint `/api/proveedor/categoria/MUSICA` retorna proveedores de música aprobados
- [ ] Puedes crear una reserva seleccionando proveedores aprobados

---

## 🐛 Troubleshooting

### Problema: "No hay proveedores en el desplegable"
**Solución**: 
```sql
-- Verifica que haya proveedores aprobados
SELECT COUNT(*) FROM proveedor WHERE estado_aprobacion = 'aprobado';

-- Si es 0, aprueba algunos:
UPDATE proveedor SET estado_aprobacion = 'aprobado' WHERE id_proveedor <= 10;
```

### Problema: "Aparecen pero no se puede seleccionar"
**Solución**: Verifica que `activo = true`
```sql
UPDATE proveedor SET activo = true WHERE estado_aprobacion = 'aprobado';
```

### Problema: "Error 500 al cargar categorías"
**Solución**: Verifica que tabla `proveedor_tipo` tenga datos:
```sql
SELECT * FROM proveedor_tipo;
-- Debes ver: MUSICA, CATERING, DECORACION, LUGAR
```

---

**Fecha**: 23 de diciembre de 2025  
**Versión**: 1.0
