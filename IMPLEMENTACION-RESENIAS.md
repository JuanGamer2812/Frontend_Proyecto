# Implementación de Sistema de Reseñas

## Resumen
Se ha implementado un sistema de reseñas siguiendo el patrón de Airbnb/Amazon: los usuarios pueden dejar reseñas de eventos pasados desde su perfil.

## Cambios Realizados

### 1. Base de Datos

#### Vista `v_resenia` creada
**Archivo:** `crear-vista-resenia.sql`

```sql
CREATE OR REPLACE VIEW v_resenia AS
SELECT 
    r.id_resena,
    r.id_evento,
    r.id_usuario,
    r.calificacion,
    r.comentario,
    r.fecha_creacion,
    -- Datos del evento
    e.nombre_evento,
    e.descripcion_evento,
    e.fecha_inicio_evento,
    e.fecha_fin_evento,
    ce.nombre AS categoria_evento,
    -- Datos del usuario
    u.nombre_usuario,
    u.apellido_usuario,
    u.foto_perfil_usuario,
    -- Campos calculados
    CONCAT(u.nombre_usuario, ' ', u.apellido_usuario) AS nombre_completo_usuario
FROM 
    resena_evento r
    INNER JOIN evento e ON r.id_evento = e.id_evento
    LEFT JOIN usuario u ON r.id_usuario = u.id_usuario
    LEFT JOIN categoria_evento ce ON e.id_categoria = ce.id_categoria
ORDER BY 
    r.fecha_creacion DESC;
```

**Ejecutar:**
```bash
psql -U postgres -d eclatrespaldo -f crear-vista-resenia.sql
```

### 2. Frontend - Componente Perfil

#### Archivos Modificados

**`src/app/components/perfil/perfil.ts`**
- ✅ Agregado `ApiService` al constructor
- ✅ Agregadas propiedades para eventos y modal de reseña
- ✅ Agregado `formResenia` con validaciones
- ✅ Métodos implementados:
  - `cargarEventosPasados()` - Carga eventos del usuario que ya finalizaron
  - `abrirModalResenia(evento)` - Abre modal de reseña
  - `cerrarModalResenia()` - Cierra modal
  - `enviarResenia()` - Envía reseña al backend
  - `getEstrellas()` / `getEstrellasVacias()` - Para visualización de estrellas
  - `yaResenado(evento)` - Verifica si ya existe reseña (placeholder)

**`src/app/components/perfil/perfil.html`**
- ✅ Agregada nueva tab "Mis Eventos" en la navegación
- ✅ Sección de eventos pasados con:
  - Loading state
  - Empty state (sin eventos)
  - Lista de eventos con botón "Dejar Reseña"
- ✅ Modal de reseña con:
  - Selector de calificación (1-5 estrellas)
  - Textarea para comentario (opcional, max 500 caracteres)
  - Contador de caracteres
  - Botones de cancelar/enviar
  - Estados de loading y mensajes de éxito/error

**`src/app/service/api.service.ts`**
- ✅ Agregado método `postData(endpoint, data)` genérico
- ✅ Agregado método `getData(endpoint, params?)` genérico
- ✅ Ya existe `getResenias()` para obtener reseñas

### 3. Backend (Pendiente de Implementar)

**Endpoint Requerido:**
```javascript
// POST /api/resena-evento
router.post('/resena-evento', async (req, res) => {
  const { id_evento, id_usuario, calificacion, comentario } = req.body;
  
  try {
    // Validar que el evento existe y el usuario lo creó
    const evento = await pool.query(
      'SELECT * FROM evento WHERE id_evento = $1 AND id_usuario_creador = $2 AND fecha_fin_evento < NOW()',
      [id_evento, id_usuario]
    );
    
    if (evento.rows.length === 0) {
      return res.status(400).json({ 
        message: 'No puedes reseñar este evento (no existe, no es tuyo o aún no ha finalizado)' 
      });
    }
    
    // Verificar si ya existe una reseña
    const reseniaExistente = await pool.query(
      'SELECT * FROM resena_evento WHERE id_evento = $1 AND id_usuario = $2',
      [id_evento, id_usuario]
    );
    
    if (reseniaExistente.rows.length > 0) {
      return res.status(400).json({ message: 'Ya has reseñado este evento' });
    }
    
    // Insertar reseña
    const result = await pool.query(
      'INSERT INTO resena_evento (id_evento, id_usuario, calificacion, comentario) VALUES ($1, $2, $3, $4) RETURNING *',
      [id_evento, id_usuario, calificacion, comentario]
    );
    
    res.json({ 
      message: 'Reseña creada correctamente', 
      resena: result.rows[0] 
    });
  } catch (err) {
    console.error('Error al crear reseña:', err);
    res.status(500).json({ message: 'Error al crear reseña' });
  }
});

// GET /api/resena-evento/usuario/:id_usuario
router.get('/resena-evento/usuario/:id_usuario', async (req, res) => {
  const { id_usuario } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT r.*, e.nombre_evento FROM resena_evento r INNER JOIN evento e ON r.id_evento = e.id_evento WHERE r.id_usuario = $1 ORDER BY r.fecha_creacion DESC',
      [id_usuario]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener reseñas:', err);
    res.status(500).json({ message: 'Error al obtener reseñas' });
  }
});
```

## Flujo de Usuario

1. **Usuario navega a Perfil → Tab "Mis Eventos"**
2. Se cargan automáticamente eventos pasados del usuario
3. Para cada evento sin reseña, aparece botón "Dejar Reseña"
4. **Click en "Dejar Reseña":**
   - Se abre modal con información del evento
   - Usuario selecciona calificación (1-5 estrellas)
   - Usuario escribe comentario opcional
   - Click en "Enviar Reseña"
5. **Backend valida y guarda reseña**
6. Modal muestra mensaje de éxito y se cierra automáticamente
7. Lista se actualiza mostrando badge "Reseña enviada"

## Validaciones

### Frontend
- Calificación: obligatoria, entre 1 y 5
- Comentario: opcional, máximo 500 caracteres

### Backend (recomendado)
- ✅ Verificar que el evento existe
- ✅ Verificar que el usuario creó el evento
- ✅ Verificar que el evento ya finalizó
- ✅ Verificar que no existe reseña duplicada
- ✅ Validar rango de calificación (1-5)

## Mejoras Futuras

### Corto Plazo
1. **Implementar `yaResenado(evento)`:**
   - Verificar en BD si existe reseña del usuario para ese evento
   - Mostrar badge "Reseña enviada" si ya existe

2. **Permitir editar reseñas:**
   - Cambiar botón a "Editar Reseña" si ya existe
   - Pre-llenar formulario con datos existentes
   - Usar PUT en lugar de POST

### Mediano Plazo
1. **Notificaciones por email:**
   - Enviar email al usuario recordándole dejar reseña 2-3 días después del evento
   - Link directo al formulario de reseña

2. **Reseñas de proveedores:**
   - Además de reseñar el evento, permitir reseñar cada proveedor
   - Mostrar promedio de calificaciones en catálogo

3. **Validación de spam:**
   - Limitar una reseña por evento por usuario
   - Cooldown de X días entre reseñas

## Testing

### Manual
1. Crear un evento con fecha pasada
2. Navegar a Perfil → Mis Eventos
3. Verificar que aparece el evento
4. Click en "Dejar Reseña"
5. Llenar formulario y enviar
6. Verificar mensaje de éxito
7. Verificar que se guardó en BD

### Base de Datos
```sql
-- Verificar vista
SELECT * FROM v_resenia LIMIT 10;

-- Insertar reseña de prueba
INSERT INTO resena_evento (id_evento, id_usuario, calificacion, comentario)
VALUES (71, 1, 5, 'Excelente evento, todo salió perfecto!');

-- Ver reseñas de un usuario
SELECT * FROM v_resenia WHERE id_usuario = 1;
```

## Notas Técnicas

- La vista `v_resenia` combina datos de `resena_evento`, `evento`, `usuario` y `categoria_evento`
- El componente usa `CommonModule` y `ReactiveFormsModule`
- El modal usa Bootstrap 5 (clases de modal ya están en el proyecto)
- Los iconos usan Bootstrap Icons (`bi bi-*`)
- Las fechas se formatean con DatePipe de Angular

## Estado Actual

✅ **Completado:**
- Vista SQL `v_resenia`
- Componente frontend (TS + HTML)
- Métodos genéricos en ApiService
- Documentación

⏳ **Pendiente:**
- Implementar endpoints en backend
- Testing E2E
- Implementar verificación de reseñas existentes
- CSS personalizado (opcional, Bootstrap cubre lo básico)
