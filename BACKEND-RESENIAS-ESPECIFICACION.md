# ESPECIFICACIÓN BACKEND - SISTEMA DE RESEÑAS

## 📍 UBICACIÓN DEL CÓDIGO

**Archivo a modificar:** `backend-endpoints-ejemplo.js`  
**(O el archivo principal de rutas de tu backend Node.js/Express)**

---

## 🔧 ENDPOINTS A CREAR

### 1️⃣ POST /api/resena-evento

**Propósito:** Crear una nueva reseña para un evento

**Ubicación en el archivo:** Agregar después del endpoint `POST /api/reservas` (aprox. línea 260-677)

**Request:**
```javascript
{
  "id_evento": 71,           // INTEGER (requerido)
  "id_usuario": 1,           // INTEGER (requerido)
  "calificacion": 5,         // INTEGER (requerido, entre 1 y 5)
  "comentario": "Excelente"  // TEXT (opcional, máximo 500 caracteres)
}
```

**Response SUCCESS (200):**
```javascript
{
  "message": "Reseña creada correctamente",
  "resena": {
    "id_resena": 123,
    "id_evento": 71,
    "id_usuario": 1,
    "calificacion": 5,
    "comentario": "Excelente",
    "fecha_creacion": "2026-01-02T15:30:00.000Z"
  }
}
```

**Response ERROR (400):**
```javascript
{
  "message": "No puedes reseñar este evento (no existe, no es tuyo o aún no ha finalizado)"
}
// O
{
  "message": "Ya has reseñado este evento"
}
// O
{
  "message": "La calificación debe estar entre 1 y 5"
}
```

**Response ERROR (500):**
```javascript
{
  "message": "Error al crear reseña"
}
```

---

### 2️⃣ GET /api/resena-evento/usuario/:id_usuario

**Propósito:** Obtener todas las reseñas de un usuario específico

**Ubicación en el archivo:** Agregar después del endpoint anterior

**Request:**
- **URL Params:** `id_usuario` (INTEGER)
- **Ejemplo:** `GET /api/resena-evento/usuario/1`

**Response SUCCESS (200):**
```javascript
[
  {
    "id_resena": 123,
    "id_evento": 71,
    "id_usuario": 1,
    "calificacion": 5,
    "comentario": "Excelente evento",
    "fecha_creacion": "2026-01-02T15:30:00.000Z",
    "nombre_evento": "Boda de Juan y María"
  },
  {
    "id_resena": 124,
    "id_evento": 72,
    "id_usuario": 1,
    "calificacion": 4,
    "comentario": "Muy bueno",
    "fecha_creacion": "2026-01-01T10:00:00.000Z",
    "nombre_evento": "XV Años de Ana"
  }
]
```

**Response ERROR (500):**
```javascript
{
  "message": "Error al obtener reseñas"
}
```

---

### 3️⃣ GET /api/resena-evento/evento/:id_evento (OPCIONAL - para futuro)

**Propósito:** Obtener todas las reseñas de un evento específico (para mostrar en catálogo)

**Ubicación en el archivo:** Después del endpoint anterior

**Request:**
- **URL Params:** `id_evento` (INTEGER)
- **Ejemplo:** `GET /api/resena-evento/evento/71`

**Response SUCCESS (200):**
```javascript
[
  {
    "id_resena": 123,
    "id_evento": 71,
    "id_usuario": 1,
    "calificacion": 5,
    "comentario": "Excelente",
    "fecha_creacion": "2026-01-02T15:30:00.000Z",
    "nombre_usuario": "Juan",
    "apellido_usuario": "Pérez",
    "foto_perfil_usuario": "/uploads/usuario1.jpg"
  }
]
```

---

## 📝 CÓDIGO EXACTO A AGREGAR

### Código JavaScript/Node.js

```javascript
// ==================== ENDPOINT: POST /api/resena-evento ====================
/**
 * Crear una nueva reseña para un evento
 * Body: { id_evento, id_usuario, calificacion, comentario }
 */
router.post('/resena-evento', authenticateToken, async (req, res) => {
  const { id_evento, id_usuario, calificacion, comentario } = req.body;
  
  try {
    // 1. VALIDACIÓN: Calificación debe estar entre 1 y 5
    if (!calificacion || calificacion < 1 || calificacion > 5) {
      return res.status(400).json({ 
        message: 'La calificación debe estar entre 1 y 5' 
      });
    }
    
    // 2. VALIDACIÓN: El evento debe existir, pertenecer al usuario y haber finalizado
    const eventoQuery = await pool.query(
      `SELECT * FROM evento 
       WHERE id_evento = $1 
       AND id_usuario_creador = $2 
       AND fecha_fin_evento < NOW()`,
      [id_evento, id_usuario]
    );
    
    if (eventoQuery.rows.length === 0) {
      return res.status(400).json({ 
        message: 'No puedes reseñar este evento (no existe, no es tuyo o aún no ha finalizado)' 
      });
    }
    
    // 3. VALIDACIÓN: No permitir reseñas duplicadas
    const reseniaExistente = await pool.query(
      'SELECT * FROM resena_evento WHERE id_evento = $1 AND id_usuario = $2',
      [id_evento, id_usuario]
    );
    
    if (reseniaExistente.rows.length > 0) {
      return res.status(400).json({ 
        message: 'Ya has reseñado este evento' 
      });
    }
    
    // 4. INSERTAR reseña en la base de datos
    const insertQuery = await pool.query(
      `INSERT INTO resena_evento (id_evento, id_usuario, calificacion, comentario) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [id_evento, id_usuario, calificacion, comentario || null]
    );
    
    // 5. RESPUESTA exitosa
    res.json({ 
      message: 'Reseña creada correctamente', 
      resena: insertQuery.rows[0] 
    });
    
  } catch (err) {
    console.error('❌ Error al crear reseña:', err);
    res.status(500).json({ message: 'Error al crear reseña' });
  }
});

// ==================== ENDPOINT: GET /api/resena-evento/usuario/:id_usuario ====================
/**
 * Obtener todas las reseñas de un usuario
 */
router.get('/resena-evento/usuario/:id_usuario', authenticateToken, async (req, res) => {
  const { id_usuario } = req.params;
  
  try {
    const result = await pool.query(
      `SELECT r.*, e.nombre_evento 
       FROM resena_evento r
       INNER JOIN evento e ON r.id_evento = e.id_evento
       WHERE r.id_usuario = $1
       ORDER BY r.fecha_creacion DESC`,
      [id_usuario]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error al obtener reseñas:', err);
    res.status(500).json({ message: 'Error al obtener reseñas' });
  }
});

// ==================== ENDPOINT: GET /api/resena-evento/evento/:id_evento ====================
/**
 * Obtener todas las reseñas de un evento (OPCIONAL - para catálogo)
 */
router.get('/resena-evento/evento/:id_evento', authenticateToken, async (req, res) => {
  const { id_evento } = req.params;
  
  try {
    const result = await pool.query(
      `SELECT r.*, u.nombre_usuario, u.apellido_usuario, u.foto_perfil_usuario
       FROM resena_evento r
       LEFT JOIN usuario u ON r.id_usuario = u.id_usuario
       WHERE r.id_evento = $1
       ORDER BY r.fecha_creacion DESC`,
      [id_evento]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error al obtener reseñas del evento:', err);
    res.status(500).json({ message: 'Error al obtener reseñas' });
  }
});
```

---

## 🗄️ VISTA DE BASE DE DATOS A CREAR

**Archivo SQL:** `crear-vista-resenia.sql` (YA ESTÁ CREADO)

**Ejecutar en PostgreSQL:**
```bash
psql -U postgres -d eclatrespaldo -f crear-vista-resenia.sql
```

**O copiar y pegar en pgAdmin:**
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

---

## ✅ CHECKLIST PARA EL BACKEND

### Paso 1: Verificar estructura de archivos
```
backend-endpoints-ejemplo.js  ← ARCHIVO A MODIFICAR
o
/routes/eventos.js            ← Depende de tu estructura
o  
/controllers/resenas.js       ← Si tienes arquitectura MVC
```

### Paso 2: Agregar los 3 endpoints
- [ ] POST `/api/resena-evento` (líneas ~680-740)
- [ ] GET `/api/resena-evento/usuario/:id_usuario` (líneas ~742-758)
- [ ] GET `/api/resena-evento/evento/:id_evento` (líneas ~760-776) - OPCIONAL

### Paso 3: Verificar que exista `pool` de PostgreSQL
```javascript
const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eclatrespaldo',
  user: 'postgres',
  password: 'tu_password'
});
```

### Paso 4: Verificar middleware `authenticateToken`
Debe existir la función para validar JWT:
```javascript
function authenticateToken(req, res, next) {
  // Validación de token JWT
}
```

### Paso 5: Ejecutar vista SQL
```bash
psql -U postgres -d eclatrespaldo -f crear-vista-resenia.sql
```

### Paso 6: Reiniciar el servidor backend
```bash
# Detener (Ctrl+C) y volver a iniciar
node backend-endpoints-ejemplo.js
# O
npm run dev
# O
nodemon server.js
```

### Paso 7: Probar con Postman o Thunder Client

**Test 1: Crear reseña**
```http
POST http://localhost:3000/api/resena-evento
Content-Type: application/json
Authorization: Bearer tu_token_jwt

{
  "id_evento": 71,
  "id_usuario": 1,
  "calificacion": 5,
  "comentario": "Excelente evento, todo salió perfecto!"
}
```

**Test 2: Obtener reseñas de un usuario**
```http
GET http://localhost:3000/api/resena-evento/usuario/1
Authorization: Bearer tu_token_jwt
```

---

## 🔍 VALIDACIONES QUE DEBE HACER EL BACKEND

### ✅ Validación 1: Calificación válida
```javascript
if (!calificacion || calificacion < 1 || calificacion > 5) {
  return res.status(400).json({ message: 'La calificación debe estar entre 1 y 5' });
}
```

### ✅ Validación 2: El evento existe y pertenece al usuario
```sql
SELECT * FROM evento 
WHERE id_evento = $1 
AND id_usuario_creador = $2 
AND fecha_fin_evento < NOW()
```

### ✅ Validación 3: No permitir reseñas duplicadas
```sql
SELECT * FROM resena_evento 
WHERE id_evento = $1 
AND id_usuario = $2
```

### ✅ Validación 4: Comentario no exceda 500 caracteres (opcional)
```javascript
if (comentario && comentario.length > 500) {
  return res.status(400).json({ message: 'El comentario no puede exceder 500 caracteres' });
}
```

---

## 📞 RESUMEN PARA PEDIR AL BACKEND

**"Necesito que agregues 3 endpoints al archivo `backend-endpoints-ejemplo.js` (o el archivo principal de rutas):"**

### 1. **POST /api/resena-evento**
   - Recibe: `{ id_evento, id_usuario, calificacion, comentario }`
   - Valida que `calificacion` esté entre 1 y 5
   - Valida que el evento exista, pertenezca al usuario y haya finalizado
   - Valida que no exista una reseña previa del usuario para ese evento
   - Inserta en tabla `resena_evento`
   - Retorna: `{ message, resena }`

### 2. **GET /api/resena-evento/usuario/:id_usuario**
   - Recibe: `id_usuario` en la URL
   - Consulta reseñas del usuario con JOIN a tabla `evento`
   - Retorna: Array de reseñas con `nombre_evento` incluido

### 3. **GET /api/resena-evento/evento/:id_evento** (OPCIONAL)
   - Recibe: `id_evento` en la URL
   - Consulta reseñas del evento con JOIN a tabla `usuario`
   - Retorna: Array de reseñas con datos del usuario

### 4. **Ejecutar en PostgreSQL:**
   ```bash
   psql -U postgres -d eclatrespaldo -f crear-vista-resenia.sql
   ```

---

## 📋 TABLA AFECTADA

**Tabla:** `resena_evento`

**Estructura actual:**
```sql
CREATE TABLE resena_evento (
  id_resena SERIAL PRIMARY KEY,
  id_evento INTEGER REFERENCES evento(id_evento),
  id_usuario INTEGER REFERENCES usuario(id_usuario),
  calificacion INTEGER CHECK (calificacion >= 1 AND calificacion <= 5),
  comentario TEXT,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Índices recomendados (OPCIONAL - para optimización):**
```sql
CREATE INDEX idx_resena_evento_usuario ON resena_evento(id_usuario);
CREATE INDEX idx_resena_evento_evento ON resena_evento(id_evento);
CREATE UNIQUE INDEX idx_resena_unica ON resena_evento(id_evento, id_usuario);
```

---

## 🎯 EJEMPLO DE USO COMPLETO

### Frontend envía:
```javascript
this.apiService.postData('resena-evento', {
  id_evento: 71,
  id_usuario: this.currentUser.id,
  calificacion: 5,
  comentario: 'Excelente servicio'
}).subscribe({
  next: (response) => {
    console.log(response.message); // "Reseña creada correctamente"
  },
  error: (err) => {
    console.error(err.error.message); // "Ya has reseñado este evento"
  }
});
```

### Backend procesa:
1. Valida calificación (1-5) ✅
2. Consulta si evento existe y pertenece al usuario ✅
3. Verifica que no haya reseña previa ✅
4. Inserta en `resena_evento` ✅
5. Retorna `{ message: "Reseña creada correctamente", resena: {...} }` ✅

### Base de datos guarda:
```
id_resena | id_evento | id_usuario | calificacion | comentario           | fecha_creacion
---------|-----------|------------|--------------|---------------------|-------------------
123      | 71        | 1          | 5            | Excelente servicio  | 2026-01-02 15:30:00
```

---

## ⚠️ ERRORES COMUNES A EVITAR

1. **No validar si el evento ya finalizó**
   - ✅ Usar `fecha_fin_evento < NOW()` en el WHERE

2. **Permitir reseñas duplicadas**
   - ✅ Verificar con SELECT antes de INSERT

3. **No sanitizar el comentario**
   - ✅ PostgreSQL escapa automáticamente con parámetros `$1, $2`

4. **Olvidar el middleware de autenticación**
   - ✅ Siempre usar `authenticateToken` en las rutas

5. **No manejar errores**
   - ✅ Usar try-catch y retornar 500 con mensaje descriptivo
