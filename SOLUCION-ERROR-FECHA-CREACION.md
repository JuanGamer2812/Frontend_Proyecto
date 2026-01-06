# 🔧 SOLUCIÓN: Error "no existe la columna «fecha_creacion»"

## ❌ ERROR

```
POST http://localhost:4200/api/proveedor-imagen 500 (Internal Server Error)
body: {
  error: 'Error interno al subir imágenes', 
  detalle: 'no existe la columna «fecha_creacion»'
}
```

---

## 🎯 CAUSA

Tu tabla `proveedor_imagen` **NO tiene** la columna `fecha_creacion`, pero el backend está intentando insertarla.

---

## ✅ SOLUCIÓN RÁPIDA (ELIGE UNA)

### Opción 1: Añadir la columna a la BD (5 segundos) ⭐ RECOMENDADO

Ejecuta este SQL en tu base de datos:

```sql
ALTER TABLE proveedor_imagen 
ADD COLUMN fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
```

### Opción 2: Modificar el backend (30 segundos)

Encuentra en tu código del backend el INSERT a `proveedor_imagen` y **quita** la columna `fecha_creacion`:

**ANTES (con error):**
```javascript
await db.query(
  'INSERT INTO proveedor_imagen (id_proveedor, url_imagen, fecha_creacion) VALUES (?, ?, NOW())',
  [id_proveedor, urlImagen]
);
```

**DESPUÉS (correcto):**
```javascript
await db.query(
  'INSERT INTO proveedor_imagen (id_proveedor, url_imagen) VALUES (?, ?)',
  [id_proveedor, urlImagen]
);
```

---

## 🔍 VERIFICAR ESTRUCTURA ACTUAL

Para ver qué columnas tiene tu tabla actualmente:

```sql
DESCRIBE proveedor_imagen;
-- o
SHOW COLUMNS FROM proveedor_imagen;
```

**Resultado esperado MÍNIMO:**
```
+----------------------+--------------+------+-----+---------+----------------+
| Field                | Type         | Null | Key | Default | Extra          |
+----------------------+--------------+------+-----+---------+----------------+
| id_proveedor_imagen  | int(11)      | NO   | PRI | NULL    | auto_increment |
| id_proveedor         | int(11)      | NO   | MUL | NULL    |                |
| url_imagen           | varchar(500) | NO   |     | NULL    |                |
+----------------------+--------------+------+-----+---------+----------------+
```

---

## 📋 ESTRUCTURA COMPLETA RECOMENDADA

Si quieres tener la tabla completa con todas las columnas opcionales:

```sql
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

Pero si la tabla ya existe, solo añade las columnas que faltan:

```sql
-- Añadir es_portada (opcional)
ALTER TABLE proveedor_imagen 
ADD COLUMN es_portada BOOLEAN DEFAULT FALSE;

-- Añadir fecha_creacion (opcional)
ALTER TABLE proveedor_imagen 
ADD COLUMN fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
```

---

## ⚡ RESUMEN EJECUTIVO

**El problema:** Backend intenta insertar columna que no existe.

**Solución más rápida:** 
```sql
ALTER TABLE proveedor_imagen ADD COLUMN fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
```

**Solución alternativa:** Quita `fecha_creacion` de los INSERTs en el backend.

---

## 🧪 PROBAR

Después de aplicar la solución:

1. Reinicia el servidor backend (si es necesario)
2. Recarga la página del frontend
3. Intenta editar un proveedor y añadir una imagen
4. Debería funcionar sin error 500

---

## 📞 SI SIGUE FALLANDO

1. Verifica que aplicaste el ALTER TABLE correctamente
2. Reinicia el backend
3. Limpia caché del navegador (Ctrl + Shift + R)
4. Revisa los logs del backend para ver el error exacto
