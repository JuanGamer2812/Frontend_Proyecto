# 📋 BACKEND - ENDPOINTS PARA GESTIÓN DE IMÁGENES DEL PROVEEDOR

## 🎯 RESUMEN

El frontend ahora permite:
- ✅ Ver imágenes existentes del proveedor
- ✅ Eliminar imágenes existentes
- ✅ Subir nuevas imágenes (archivo o URL)
- ✅ Actualizar todo junto con los datos del proveedor

---

## 📤 ENDPOINTS REQUERIDOS

### 1️⃣ SUBIR NUEVAS IMÁGENES (YA EXISTE)

**Endpoint:** `POST /api/proveedor-imagen`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (FormData):**
```javascript
{
  id_proveedor: "1",           // ID del proveedor
  imagenes: [File, File, ...], // Array de archivos de imagen
  urls: ["https://...", ...]   // Array de URLs de imágenes
}
```

**Ejemplo de implementación (Node.js + Express + Multer):**
```javascript
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.post('/proveedor-imagen', authMiddleware, upload.array('imagenes', 10), async (req, res) => {
  const { id_proveedor } = req.body;
  const archivos = req.files || [];
  const urls = req.body.urls || [];

  try {
    // VALIDACIÓN: Verificar que el proveedor existe
    const proveedorExiste = await db.query(
      'SELECT id_proveedor FROM proveedor WHERE id_proveedor = ?',
      [id_proveedor]
    );

    if (proveedorExiste.length === 0) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }

    const imagenesInsertadas = [];

    // INSERTAR ARCHIVOS SUBIDOS
    for (const file of archivos) {
      const urlImagen = `/uploads/${file.filename}`; // O tu lógica de almacenamiento
      
      // IMPORTANTE: Solo incluye columnas que EXISTEN en tu tabla
      // Si NO tienes fecha_creacion, NO la incluyas
      const resultado = await db.query(
        'INSERT INTO proveedor_imagen (id_proveedor, url_imagen) VALUES (?, ?)',
        [id_proveedor, urlImagen]
      );
      
      imagenesInsertadas.push({
        id_proveedor_imagen: resultado.insertId,
        url_imagen: urlImagen
      });
    }

    // INSERTAR URLs
    if (Array.isArray(urls)) {
      for (const url of urls) {
        if (url && url.trim()) {
          const resultado = await db.query(
            'INSERT INTO proveedor_imagen (id_proveedor, url_imagen) VALUES (?, ?)',
            [id_proveedor, url.trim()]
          );
          
          imagenesInsertadas.push({
            id_proveedor_imagen: resultado.insertId,
            url_imagen: url.trim()
          });
        }
      }
    } else if (typeof urls === 'string' && urls.trim()) {
      // Si es una sola URL como string
      const resultado = await db.query(
        'INSERT INTO proveedor_imagen (id_proveedor, url_imagen) VALUES (?, ?)',
        [id_proveedor, urls.trim()]
      );
      
      imagenesInsertadas.push({
        id_proveedor_imagen: resultado.insertId,
        url_imagen: urls.trim()
      });
    }

    return res.status(201).json({
      mensaje: 'Imágenes subidas correctamente',
      imagenes: imagenesInsertadas,
      total: imagenesInsertadas.length
    });

  } catch (error) {
    console.error('Error al subir imágenes:', error);
    return res.status(500).json({ 
      error: 'Error interno al subir imágenes',
      detalle: error.message 
    });
  }
});
```

**Respuesta exitosa (201 Created):**
```json
{
  "mensaje": "Imágenes subidas correctamente",
  "imagenes": [
    {
      "id_proveedor_imagen": 15,
      "url_imagen": "/uploads/abc123.jpg"
    },
    {
      "id_proveedor_imagen": 16,
      "url_imagen": "https://ejemplo.com/foto.jpg"
    }
  ],
  "total": 2
}
```

---

### 2️⃣ ELIMINAR IMAGEN (NUEVO - NECESARIO IMPLEMENTAR)

**Endpoint:** `DELETE /api/proveedor-imagen/:id_imagen`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Parámetros:**
- `id_imagen` (path parameter): ID de la imagen a eliminar

**Implementación (Node.js + Express):**
```javascript
router.delete('/proveedor-imagen/:id_imagen', authMiddleware, async (req, res) => {
  const { id_imagen } = req.params;

  try {
    // VALIDACIÓN: Verificar que la imagen existe
    const imagenExiste = await db.query(
      'SELECT id_proveedor_imagen, url_imagen FROM proveedor_imagen WHERE id_proveedor_imagen = ?',
      [id_imagen]
    );

    if (imagenExiste.length === 0) {
      return res.status(404).json({ error: 'Imagen no encontrada' });
    }

    const imagen = imagenExiste[0];

    // OPCIONAL: Eliminar archivo físico si está en el servidor
    // const fs = require('fs');
    // const path = require('path');
    // if (imagen.url_imagen && !imagen.url_imagen.startsWith('http')) {
    //   const rutaArchivo = path.join(__dirname, '..', imagen.url_imagen);
    //   if (fs.existsSync(rutaArchivo)) {
    //     fs.unlinkSync(rutaArchivo);
    //   }
    // }

    // ELIMINAR DE LA BASE DE DATOS
    await db.query(
      'DELETE FROM proveedor_imagen WHERE id_proveedor_imagen = ?',
      [id_imagen]
    );

    return res.status(200).json({
      mensaje: 'Imagen eliminada correctamente',
      id_imagen: parseInt(id_imagen)
    });

  } catch (error) {
    console.error('Error al eliminar imagen:', error);
    return res.status(500).json({ 
      error: 'Error interno al eliminar imagen',
      detalle: error.message 
    });
  }
});
```

**Respuesta exitosa (200 OK):**
```json
{
  "mensaje": "Imagen eliminada correctamente",
  "id_imagen": 15
}
```

**Respuesta error - Imagen no encontrada (404 Not Found):**
```json
{
  "error": "Imagen no encontrada"
}
```

---

## 📊 TABLA DE BASE DE DATOS

### ⚠️ ERROR COMÚN: "no existe la columna «fecha_creacion»"

Si recibes este error, tu tabla `proveedor_imagen` **NO tiene** la columna `fecha_creacion`. 

**Tienes 2 opciones:**

### Opción 1: AÑADIR la columna (RECOMENDADO)

```sql
-- Añadir columna fecha_creacion si no existe
ALTER TABLE proveedor_imagen 
ADD COLUMN fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
```

### Opción 2: MODIFICAR el backend para NO usar esa columna

En tu código del backend, **NO incluyas** `fecha_creacion` en los INSERTs:

```javascript
// ❌ MAL - Si incluyes fecha_creacion y no existe
const resultado = await db.query(
  'INSERT INTO proveedor_imagen (id_proveedor, url_imagen, fecha_creacion) VALUES (?, ?, NOW())',
  [id_proveedor, urlImagen]
);

// ✅ BIEN - Sin fecha_creacion
const resultado = await db.query(
  'INSERT INTO proveedor_imagen (id_proveedor, url_imagen) VALUES (?, ?)',
  [id_proveedor, urlImagen]
);
```

### Estructura MÍNIMA de la tabla

```sql
-- Estructura MÍNIMA que DEBE existir
CREATE TABLE IF NOT EXISTS proveedor_imagen (
  id_proveedor_imagen INT AUTO_INCREMENT PRIMARY KEY,
  id_proveedor INT NOT NULL,
  url_imagen VARCHAR(500) NOT NULL,
  FOREIGN KEY (id_proveedor) REFERENCES proveedor(id_proveedor) ON DELETE CASCADE,
  INDEX idx_proveedor (id_proveedor)
);
```

### Estructura COMPLETA (OPCIONAL)

```sql
-- Estructura COMPLETA con columnas opcionales
CREATE TABLE IF NOT EXISTS proveedor_imagen (
  id_proveedor_imagen INT AUTO_INCREMENT PRIMARY KEY,
  id_proveedor INT NOT NULL,
  url_imagen VARCHAR(500) NOT NULL,
  es_portada BOOLEAN DEFAULT FALSE,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_proveedor) REFERENCES proveedor(id_proveedor) ON DELETE CASCADE,
  INDEX idx_proveedor (id_proveedor)
);
```

---

## 🔄 FLUJO COMPLETO DE ACTUALIZACIÓN

### Frontend realiza estas llamadas en orden:

1. **PUT** `/api/proveedor/:id` → Actualiza datos generales
2. **PUT** `/api/proveedor/:id/caracteristicas` → Actualiza características
3. **DELETE** `/api/proveedor-imagen/:id` → Elimina imágenes marcadas (en paralelo)
4. **POST** `/api/proveedor-imagen` → Sube nuevas imágenes

### Ejemplo de log esperado:
```
1. Actualizando proveedor 1...
2. Actualizando 7 características...
3. Eliminando imágenes: [12, 15]
4. Subiendo 3 nuevas imágenes (2 archivos, 1 URL)
✅ Proveedor actualizado exitosamente
```

---

## 🧪 PRUEBAS CON POSTMAN

### Eliminar imagen:
```bash
DELETE http://localhost:4200/api/proveedor-imagen/15
Headers:
  Authorization: Bearer TU_TOKEN_AQUI
```

### Subir nuevas imágenes:
```bash
POST http://localhost:4200/api/proveedor-imagen
Headers:
  Authorization: Bearer TU_TOKEN_AQUI
  Content-Type: multipart/form-data

Body (form-data):
  id_proveedor: 1
  imagenes: [seleccionar archivo 1]
  imagenes: [seleccionar archivo 2]
  urls: https://ejemplo.com/foto1.jpg
  urls: https://ejemplo.com/foto2.jpg
```

---

## ⚠️ CONSIDERACIONES IMPORTANTES

1. **Permisos de archivos:** Asegúrate de que el directorio `uploads/` tenga permisos de escritura
2. **Límite de tamaño:** Configura `multer` con límites apropiados (ej: 5MB por imagen)
3. **Validación de URLs:** Valida que las URLs sean válidas antes de insertarlas
4. **Validación de tipos:** Solo permitir imágenes (jpg, png, gif, webp)
5. **Seguridad:** Sanitizar nombres de archivos para evitar inyecciones
6. **CASCADE DELETE:** La clave foránea con `ON DELETE CASCADE` eliminará automáticamente las imágenes cuando se elimine el proveedor

---

## ✅ CHECKLIST PARA EL BACKEND

- [ ] Endpoint `POST /api/proveedor-imagen` funciona correctamente
- [ ] Endpoint `DELETE /api/proveedor-imagen/:id_imagen` implementado
- [ ] Tabla `proveedor_imagen` creada con estructura correcta
- [ ] Multer configurado para múltiples archivos
- [ ] Validaciones de existencia de proveedor
- [ ] Manejo de errores apropiado
- [ ] Respuestas JSON con estructura consistente
- [ ] Pruebas con Postman exitosas

---

## 📝 RESUMEN RÁPIDO

**Lo que necesitas hacer:**
1. Implementar endpoint `DELETE /api/proveedor-imagen/:id_imagen`
2. Verificar que `POST /api/proveedor-imagen` soporte arrays de URLs
3. Asegurarte de que la tabla `proveedor_imagen` existe
4. Probar ambos endpoints

**El frontend ya está listo y enviará:**
- IDs de imágenes a eliminar → DELETE requests individuales
- FormData con nuevas imágenes → POST request único
