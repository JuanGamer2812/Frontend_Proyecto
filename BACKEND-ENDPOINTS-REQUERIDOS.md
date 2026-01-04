# 🔧 Endpoints Requeridos en el Backend

## ⚠️ IMPORTANTE
Los siguientes endpoints **DEBEN** ser implementados en tu backend Node.js (puerto 443) para que la funcionalidad de reservas funcione correctamente.

---

## 1. **GET /api/categorias**

### Descripción
Devuelve la lista de todas las categorías (tipos) de proveedores disponibles desde la tabla `proveedor_tipo`.

### URL Completa
```
GET http://localhost:443/api/categorias
```

### Headers Requeridos
```
Authorization: Bearer <token>
```

### Respuesta Exitosa (200 OK)
```json
[
  {
    "nombre": "MUSICA",
    "icono": "bi-music-note-beamed"
  },
  {
    "nombre": "CATERING",
    "icono": "bi-egg-fried"
  },
  {
    "nombre": "DECORACION",
    "icono": "bi-balloon-heart"
  },
  {
    "nombre": "LUGAR",
    "icono": "bi-geo-alt"
  }
]
```

### Tabla de Base de Datos
**Ya existe**: `proveedor_tipo` con campos:
- `id_tipo` INTEGER PRIMARY KEY
- `nombre` TEXT NOT NULL
- `descripcion_tipo` TEXT NOT NULL

### Ejemplo de Implementación (Node.js/Express + PostgreSQL)
```javascript
router.get('/categorias', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        nombre,
        CASE 
          WHEN nombre = 'MUSICA' THEN 'bi-music-note-beamed'
          WHEN nombre = 'CATERING' THEN 'bi-egg-fried'
          WHEN nombre = 'DECORACION' THEN 'bi-balloon-heart'
          WHEN nombre = 'LUGAR' THEN 'bi-geo-alt'
          ELSE 'bi-tag'
        END as icono
      FROM proveedor_tipo
      ORDER BY nombre
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({ message: 'Error al cargar categorías' });
  }
});
```

---

## 2. **GET /api/proveedor?estado=aprobado**

### Descripción
Devuelve todos los proveedores con `estado_aprobacion = 'aprobado'` junto con su categoría (tipo).

### URL Completa
```
GET http://localhost:443/api/proveedor?estado=aprobado
```

### Query Parameters
- `estado` (string): Filtro por `estado_aprobacion`. Valores: `pendiente`, `aprobado`, `rechazado`, `suspendido`

### Headers Requeridos
```
Authorization: Bearer <token>
```

### Respuesta Exitosa (200 OK)
```json
[
  {
    "id_proveedor": 1,
    "nombre": "DJ Vibe",
    "categoria": "MUSICA",
    "descripcion": "DJ para bodas y fiestas corporativas.",
    "precio": 500.00,
    "estado_aprobacion": "aprobado",
    "calificacion_promedio": 4.50,
    "activo": true
  },
  {
    "id_proveedor": 5,
    "nombre": "Buffet Royal",
    "categoria": "CATERING",
    "descripcion": "Servicio de buffet internacional por persona.",
    "precio": 45.50,
    "estado_aprobacion": "aprobado",
    "calificacion_promedio": 4.80,
    "activo": true
  }
]
```

### Tabla de Base de Datos
**Ya existe**: Tabla `proveedor` con:
- `id_proveedor` BIGINT PRIMARY KEY
- `nombre` VARCHAR(200)
- `descripcion` TEXT
- `precio_base` NUMERIC(12,2)
- `estado_aprobacion` VARCHAR(20) - valores: pendiente, aprobado, rechazado, suspendido
- `activo` BOOLEAN
- `calificacion_promedio` NUMERIC(3,2)
- `id_tipo` INTEGER → FK a `proveedor_tipo`

### Ejemplo de Implementación (Node.js/Express + PostgreSQL)
```javascript
router.get('/proveedor', authenticateToken, async (req, res) => {
  try {
    const { estado } = req.query;
    
    let query = `
      SELECT 
        p.id_proveedor,
        p.nombre,
        pt.nombre as categoria,
        p.descripcion,
        p.precio_base as precio,
        p.estado_aprobacion,
        p.calificacion_promedio,
        p.activo
      FROM proveedor p
      JOIN proveedor_tipo pt ON p.id_tipo = pt.id_tipo
    `;
    
    const params = [];
    
    if (estado) {
      query += ' WHERE p.estado_aprobacion = $1';
      params.push(estado);
    }
    
    query += ' ORDER BY p.nombre';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener proveedores:', error);
    res.status(500).json({ message: 'Error al cargar proveedores' });
  }
});
```

---

## 3. **GET /api/proveedor/categoria/:categoria**

### Descripción
Devuelve todos los proveedores aprobados de un tipo (categoría) específico.

### URL Completa
```
GET http://localhost:443/api/proveedor/categoria/MUSICA
```

### Path Parameters
- `categoria` (string): Nombre del tipo de proveedor (MUSICA, CATERING, DECORACION, LUGAR)

### Headers Requeridos
```
Authorization: Bearer <token>
```

### Respuesta Exitosa (200 OK)
```json
[
  {
    "id_proveedor": 1,
    "nombre": "DJ Vibe",
    "categoria": "MUSICA",
    "descripcion": "DJ para bodas y fiestas corporativas.",
    "precio": 500.00,
    "estado_aprobacion": "aprobado",
    "calificacion_promedio": 4.50,
    "activo": true
  },
  {
    "id_proveedor": 2,
    "nombre": "Banda Sonata",
    "categoria": "MUSICA",
    "descripcion": "Música en vivo, rock y pop.",
    "precio": 1200.00,
    "estado_aprobacion": "aprobado",
    "calificacion_promedio": 4.80,
    "activo": true
  }
]
```

### Ejemplo de Implementación (Node.js/Express + PostgreSQL)
```javascript
router.get('/proveedor/categoria/:categoria', authenticateToken, async (req, res) => {
  try {
    const { categoria } = req.params;
    
    const result = await pool.query(`
      SELECT 
        p.id_proveedor,
        p.nombre,
        pt.nombre as categoria,
        p.descripcion,
        p.precio_base as precio,
        p.estado_aprobacion,
        p.calificacion_promedio,
        p.activo
      FROM proveedor p
      JOIN proveedor_tipo pt ON p.id_tipo = pt.id_tipo
      WHERE pt.nombre = $1 
        AND p.estado_aprobacion = 'aprobado'
        AND p.activo = true
      ORDER BY p.calificacion_promedio DESC, p.nombre
    `, [categoria]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener proveedores por categoría:', error);
    res.status(500).json({ message: 'Error al cargar proveedores' });
  }
});
```

---

## 4. **POST /api/reservas**

### Descripción
Crea una nueva reserva de evento. Usa las tablas `evento` y `reservacion` que ya existen en tu BD.

### URL Completa
```
POST http://localhost:443/api/reservas
```

### Headers Requeridos
```
Content-Type: application/json
Authorization: Bearer <token>
```

### Body de la Petición
```json
{
  "nombreEvento": "Boda de Camila & Diego",
  "tipoEvento": "Boda",
  "descripcion": "Ceremonia religiosa seguida de recepción",
  "fechaInicio": "2025-12-31T18:00:00",
  "fechaFin": "2026-01-01T02:00:00",
  "precioBase": 50000,
  "hayPlaylist": true,
  "playlist": "https://spotify.com/playlist/abc123",
  "proveedores": [
    {
      "categoria": "MUSICA",
      "id_proveedor": 1,
      "plan": "Plus",
      "horaInicio": "19:00",
      "horaFin": "02:00",
      "notasAdicionales": "Incluir música romántica para la cena"
    },
    {
      "categoria": "CATERING",
      "id_proveedor": 5,
      "plan": "Estelar",
      "horaInicio": "20:00",
      "horaFin": "23:00",
      "notasAdicionales": "Menú vegetariano para 20 personas"
    }
  ]
}
```

### Respuesta Exitosa (201 Created)
```json
{
  "message": "Reserva creada exitosamente",
  "id_reservacion": 5,
  "id_evento": 15,
  "total": 51700.00,
  "evento": {
    "id_evento": 15,
    "nombre_evento": "Boda de Camila & Diego",
    "fecha_inicio_evento": "2025-12-31T18:00:00",
    "fecha_fin_evento": "2026-01-01T02:00:00"
  }
}
```

### Tablas de Base de Datos
**Ya existen** en tu PostgreSQL:

```sql
-- Tabla evento (ya existe)
-- Solo necesitas asegurar compatibilidad con los campos del frontend

-- Tabla reservacion (ya existe) con:
--   id_reservacion INTEGER PRIMARY KEY
--   fecha_reservacion TIMESTAMP
--   total_precio_reservacion NUMERIC(10,2)
--   cedula_reservacion VARCHAR(15)
--   id_usuario INTEGER FK
--   id_evento INTEGER FK

-- NUEVA: Tabla evento_proveedor (NO existe, debes crearla)
CREATE TABLE IF NOT EXISTS evento_proveedor (
  id_evento_proveedor SERIAL PRIMARY KEY,
  id_evento INTEGER NOT NULL,
  id_proveedor BIGINT NOT NULL,
  categoria VARCHAR(50),
  plan VARCHAR(20),
  hora_inicio TIME,
  hora_fin TIME,
  notas_adicionales TEXT,
  precio NUMERIC(10,2),
  fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_evento_proveedor_evento 
    FOREIGN KEY (id_evento) REFERENCES evento(id_evento) ON DELETE CASCADE,
  CONSTRAINT fk_evento_proveedor_proveedor 
    FOREIGN KEY (id_proveedor) REFERENCES proveedor(id_proveedor) ON DELETE RESTRICT
);

CREATE INDEX idx_evento_proveedor_evento ON evento_proveedor(id_evento);
CREATE INDEX idx_evento_proveedor_proveedor ON evento_proveedor(id_proveedor);
```

### Ejemplo de Implementación (Node.js/Express + PostgreSQL)
```javascript
router.post('/reservas', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      nombreEvento, tipoEvento, descripcion, fechaInicio, fechaFin,
      precioBase, hayPlaylist, playlist, proveedores
    } = req.body;
    
    const userId = req.user.id; // Del token JWT
    const idPlan = 1; // Plan por defecto o desde req.body
    
    // Calcular total sumando precios de proveedores
    let total = parseFloat(precioBase) || 0;
    
    for (const prov of proveedores) {
      const provResult = await client.query(
        'SELECT precio_base FROM proveedor WHERE id_proveedor = $1',
        [prov.id_proveedor]
      );
      if (provResult.rows[0]?.precio_base) {
        total += parseFloat(provResult.rows[0].precio_base);
      }
    }
    
    // 1. Insertar evento
    const eventoResult = await client.query(`
      INSERT INTO evento (
        nombre_evento, descripcion_evento, fecha_inicio_evento, fecha_fin_evento,
        precio_evento, tipo_evento, hay_playlist_evento, playlist_evento,
        creado_por, id_usuario_creador, id_plan
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id_evento
    `, [
      nombreEvento, descripcion, fechaInicio, fechaFin,
      total, tipoEvento, hayPlaylist, playlist,
      'Usuario', userId, idPlan
    ]);
    
    const idEvento = eventoResult.rows[0].id_evento;
    
    // 2. Insertar reservacion
    const reservaResult = await client.query(`
      INSERT INTO reservacion (
        fecha_reservacion, total_precio_reservacion, cedula_reservacion,
        id_usuario, id_evento
      ) VALUES (NOW(), $1, $2, $3, $4)
      RETURNING id_reservacion
    `, [total, '0000000000', userId, idEvento]); // Cédula placeholder
    
    const idReservacion = reservaResult.rows[0].id_reservacion;
    
    // 3. Insertar proveedores del evento
    for (const prov of proveedores) {
      const provData = await client.query(
        'SELECT precio_base FROM proveedor WHERE id_proveedor = $1',
        [prov.id_proveedor]
      );
      
      await client.query(`
        INSERT INTO evento_proveedor (
          id_evento, id_proveedor, categoria, plan,
          hora_inicio, hora_fin, notas_adicionales, precio
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        idEvento, prov.id_proveedor, prov.categoria, prov.plan,
        prov.horaInicio, prov.horaFin, prov.notasAdicionales,
        provData.rows[0]?.precio_base || 0
      ]);
    }
    
    await client.query('COMMIT');
    
    res.status(201).json({
      message: 'Reserva creada exitosamente',
      id_reservacion: idReservacion,
      id_evento: idEvento,
      total: total,
      evento: {
        id_evento: idEvento,
        nombre_evento: nombreEvento,
        fecha_inicio_evento: fechaInicio,
        fecha_fin_evento: fechaFin
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al crear reserva:', error);
    res.status(500).json({ 
      message: 'Error al crear la reserva', 
      error: error.message 
    });
  } finally {
    client.release();
  }
});
```
);
```

### Ejemplo de Implementación (Node.js/Express)
```javascript
router.post('/reservas', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const {
      nombreEvento, tipoEvento, descripcion, fechaInicio, fechaFin,
      precioBase, hayPlaylist, playlist, proveedores
    } = req.body;
    
    const userId = req.user.id; // Del token JWT
    
    // Calcular total
    let total = parseFloat(precioBase) || 0;
    for (const prov of proveedores) {
      const [provData] = await connection.query(
        'SELECT precio FROM proveedor WHERE id_proveedor = ?',
        [prov.id_proveedor]
      );
      if (provData[0]?.precio) {
        total += parseFloat(provData[0].precio);
      }
    }
    
    // Insertar evento
    const [eventoResult] = await connection.query(
      `INSERT INTO evento 
       (id_usuario, nombreEvento, tipoEvento, descripcion, fechaInicio, fechaFin, 
        precioBase, hayPlaylist, playlist, total, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
      [userId, nombreEvento, tipoEvento, descripcion, fechaInicio, fechaFin,
       precioBase, hayPlaylist, playlist, total]
    );
    
    const eventoId = eventoResult.insertId;
    
    // Insertar proveedores del evento
    for (const prov of proveedores) {
      const [provData] = await connection.query(
        'SELECT precio FROM proveedor WHERE id_proveedor = ?',
        [prov.id_proveedor]
      );
      
      await connection.query(
        `INSERT INTO evento_proveedor 
         (id_evento, id_proveedor, categoria, plan, horaInicio, horaFin, notasAdicionales, precio)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [eventoId, prov.id_proveedor, prov.categoria, prov.plan, 
         prov.horaInicio, prov.horaFin, prov.notasAdicionales, provData[0]?.precio || 0]
      );
    }
    
    await connection.commit();
    
    res.status(201).json({
      message: 'Reserva creada exitosamente',
      reservaId: eventoId,
      total: total,
      evento: {
        id_evento: eventoId,
        nombreEvento,
        fechaInicio,
        fechaFin,
        estado: 'pendiente'
      }
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Error al crear reserva:', error);
    res.status(500).json({ message: 'Error al crear la reserva', error: error.message });
  } finally {
    connection.release();
  }
});
```

---

## 📋 Checklist de Implementación

### Antes de empezar:
- [x] Verificar que tienes acceso a la base de datos PostgreSQL
- [x] Confirmar que el backend corre en puerto 443
- [x] Tener middleware `authenticateToken` implementado

### Base de Datos PostgreSQL:
- [x] Tabla `proveedor_tipo` ya existe (MUSICA, CATERING, DECORACION, LUGAR)
- [x] Tabla `proveedor` ya existe con campo `estado_aprobacion`
- [x] Tabla `evento` ya existe
- [x] Tabla `reservacion` ya existe
- [ ] **CREAR** tabla `evento_proveedor` (relación muchos-a-muchos entre evento y proveedor)

**SQL para crear tabla faltante:**
```sql
CREATE TABLE IF NOT EXISTS evento_proveedor (
  id_evento_proveedor SERIAL PRIMARY KEY,
  id_evento INTEGER NOT NULL,
  id_proveedor BIGINT NOT NULL,
  categoria VARCHAR(50),
  plan VARCHAR(20),
  hora_inicio TIME,
  hora_fin TIME,
  notas_adicionales TEXT,
  precio NUMERIC(10,2),
  fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_evento_proveedor_evento 
    FOREIGN KEY (id_evento) REFERENCES evento(id_evento) ON DELETE CASCADE,
  CONSTRAINT fk_evento_proveedor_proveedor 
    FOREIGN KEY (id_proveedor) REFERENCES proveedor(id_proveedor) ON DELETE RESTRICT
);

CREATE INDEX idx_evento_proveedor_evento ON evento_proveedor(id_evento);
CREATE INDEX idx_evento_proveedor_proveedor ON evento_proveedor(id_proveedor);
```

### Backend (Node.js/Express con PostgreSQL):
- [ ] Instalar driver PostgreSQL: `npm install pg`
- [ ] Configurar pool de conexiones:
```javascript
const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'nombre_de_tu_bd',
  user: 'postgres',
  password: 'tu_password'
});
```
- [ ] Implementar `GET /api/categorias`
- [ ] Implementar `GET /api/proveedor?estado=aprobado`
- [ ] Implementar `GET /api/proveedor/categoria/:categoria`
- [ ] Implementar `POST /api/reservas`
- [ ] Agregar manejo de errores en todos los endpoints
- [ ] Probar cada endpoint con Postman/Thunder Client

### Pruebas:
- [ ] Verificar que las categorías se cargan en el frontend
- [ ] Confirmar que los proveedores aprobados aparecen en los desplegables
- [ ] Crear una reserva de prueba desde el frontend
- [ ] Verificar que la reserva se guarda correctamente en la BD

---

## 🔍 Debugging

### Si los proveedores no aparecen en el desplegable:
1. Abre la consola del navegador (F12)
2. Ve a la pestaña "Network"
3. Busca las peticiones a `/api/proveedor`
4. Verifica el código de respuesta (debe ser 200, no 500)
5. Revisa el JSON de respuesta

### Errores comunes:
- **500 Internal Server Error**: El endpoint no existe o tiene un error de código
- **401 Unauthorized**: El token JWT no es válido o falta el header Authorization
- **404 Not Found**: La ruta del endpoint no coincide exactamente
- **CORS errors**: Verifica que tu backend tiene CORS habilitado

### Ejemplo de configuración CORS en Express:
```javascript
const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true
}));
```

---

## 📊 Resumen de tu Base de Datos

### Estructura Actual (PostgreSQL):
- ✅ **proveedor_tipo**: Categorías de proveedores (MUSICA, CATERING, DECORACION, LUGAR)
- ✅ **proveedor**: Tabla principal con `estado_aprobacion`, `precio_base`, `id_tipo`
- ✅ **proveedor_musica**, **proveedor_catering**, **proveedor_decoracion**, **proveedor_lugar**: Tablas especializadas
- ✅ **evento**: Eventos con proveedores referenciados directamente
- ✅ **reservacion**: Reservas con `id_usuario`, `id_evento`
- ❌ **evento_proveedor**: NO EXISTE - debes crearla para el nuevo sistema

### Cambio Conceptual:
**Antes**: Un evento tenía 4 campos FK opcionales (id_proveedor_musica, id_proveedor_catering, etc.)
**Ahora**: Un evento puede tener N proveedores de cualquier categoría vía tabla `evento_proveedor`

### Ventajas del Nuevo Sistema:
- Múltiples DJs o bandas en un mismo evento
- Diferentes proveedores de catering para coctél y cena
- Escalable a nuevas categorías sin modificar tabla `evento`
- Tracking de horarios y notas por proveedor

---

## ✅ Problemas Resueltos en el Frontend

### 1. ❌ Error CORS con Google OAuth
**Problema**: El interceptor agregaba `Authorization: Bearer` a todas las peticiones, incluyendo las de Google OAuth.

**Solución**: Modificado `auth.interceptor.ts` para excluir URLs externas:
```typescript
const isExternalUrl = !req.url.startsWith('/api') && !req.url.startsWith('http://localhost');
if (token && !isAuthEndpoint && !isExternalUrl) {
  // Agregar Authorization header solo a peticiones locales del API
}
```

### 2. ❌ Error NG0955 (trackBy duplicates)
**Problema**: Los `*ngFor` no tenían expresiones `track`, causando claves duplicadas cuando las listas estaban vacías.

**Solución**: Agregados track expressions:
```html
<button *ngFor="let cat of categorias(); track cat.nombre">
<option *ngFor="let prov of getProveedoresPorCategoria(cat); track prov.id_proveedor">
```

### 3. ❌ Proveedores no se cargan
**Problema**: El backend aún no tiene los endpoints implementados (errores 500).

**Solución**: Este documento proporciona las especificaciones exactas para implementarlos.

---

## 📞 Soporte

Si después de implementar estos endpoints sigues teniendo problemas:
1. Verifica los logs del backend (consola donde corre el servidor)
2. Usa las DevTools del navegador (F12 → Network tab)
3. Verifica que la base de datos tenga las tablas y datos necesarios
4. Confirma que el proxy de Angular esté redirigiendo `/api` a `http://localhost:443`

---

**Última actualización**: 23 de diciembre de 2025
