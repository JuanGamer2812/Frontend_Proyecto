# Backend: Endpoint de Transacción Completa para Actualización de Proveedor

## 🎯 Objetivo

Crear un endpoint que actualice **TODOS** los datos de un proveedor (datos generales, características e imágenes) en una **ÚNICA TRANSACCIÓN SQL**. Si cualquier operación falla, se deshacen TODOS los cambios (rollback).

---

## ❌ Problema Actual

El frontend hace 3 llamadas HTTP secuenciales:
1. `PUT /api/proveedor/:id` - Actualiza datos generales
2. `PUT /api/proveedor/:id/caracteristicas` - Actualiza características
3. `POST /api/proveedor/imagenes` + `DELETE /api/proveedor/imagen/:id` - Gestiona imágenes

**Consecuencia**: Si el paso 2 o 3 falla, los pasos anteriores ya están guardados → **datos inconsistentes**.

---

## ✅ Solución: Endpoint Transaccional

### Nuevo Endpoint

```
PUT /api/proveedor/:id/actualizar-completo
```

### Request Body

```json
{
  "proveedor": {
    "nombre_fantasia": "Proveedor Actualizado",
    "razon_social": "Proveedor S.A.",
    "cuit": "20-12345678-9",
    "email": "contacto@proveedor.com",
    "telefono": "+54 11 1234-5678",
    "direccion": "Calle 123",
    "localidad": "CABA",
    "provincia": "Buenos Aires",
    "codigo_postal": "1000",
    "instagram": "@proveedor",
    "sitio_web": "https://proveedor.com",
    "estado_aprobacion": "aprobado",
    "descripcion": "Descripción actualizada"
  },
  "caracteristicas": [
    {
      "id_caracteristica": 1,
      "valor": "Nuevo valor 1"
    },
    {
      "id_caracteristica": 2,
      "valor": "Nuevo valor 2"
    }
  ],
  "imagenes": {
    "eliminar": [5, 12, 18],  // IDs de imágenes a eliminar
    "agregar_archivos": ["base64....", "base64...."],  // Archivos en base64
    "agregar_urls": [
      "https://ejemplo.com/imagen1.jpg",
      "https://ejemplo.com/imagen2.jpg"
    ]
  }
}
```

---

## 📝 Implementación Backend (Node.js + PostgreSQL)

### 1. Ruta en Express

```javascript
const express = require('express');
const router = express.Router();
const pool = require('../db'); // Pool de PostgreSQL
const multer = require('multer');

// Configurar multer para manejar multipart/form-data
const upload = multer({ storage: multer.memoryStorage() });

router.put('/proveedor/:id/actualizar-completo', upload.array('imagenes_archivos'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const proveedorId = parseInt(req.params.id);
    const { proveedor, caracteristicas, imagenes_urls, imagenes_eliminar } = req.body;
    
    // INICIAR TRANSACCIÓN
    await client.query('BEGIN');
    
    console.log('🔄 Iniciando transacción para proveedor:', proveedorId);
    
    // ========== PASO 1: Actualizar Datos del Proveedor ==========
    const updateProveedorQuery = `
      UPDATE proveedor
      SET 
        nombre_fantasia = $1,
        razon_social = $2,
        cuit = $3,
        email = $4,
        telefono = $5,
        direccion = $6,
        localidad = $7,
        provincia = $8,
        codigo_postal = $9,
        instagram = $10,
        sitio_web = $11,
        estado_aprobacion = $12,
        descripcion = $13,
        fecha_modificacion = CURRENT_TIMESTAMP
      WHERE id = $14
    `;
    
    await client.query(updateProveedorQuery, [
      proveedor.nombre_fantasia,
      proveedor.razon_social,
      proveedor.cuit,
      proveedor.email,
      proveedor.telefono,
      proveedor.direccion,
      proveedor.localidad,
      proveedor.provincia,
      proveedor.codigo_postal,
      proveedor.instagram,
      proveedor.sitio_web,
      proveedor.estado_aprobacion,
      proveedor.descripcion,
      proveedorId
    ]);
    
    console.log('✅ Paso 1/4: Proveedor actualizado');
    
    // ========== PASO 2: Eliminar Características Antiguas ==========
    await client.query('DELETE FROM proveedor_caracteristica WHERE id_proveedor = $1', [proveedorId]);
    console.log('✅ Paso 2/4: Características antiguas eliminadas');
    
    // ========== PASO 3: Insertar Nuevas Características ==========
    if (caracteristicas && caracteristicas.length > 0) {
      const caracteristicasQuery = `
        INSERT INTO proveedor_caracteristica (id_proveedor, id_caracteristica, valor)
        VALUES ($1, $2, $3)
      `;
      
      for (const caract of caracteristicas) {
        await client.query(caracteristicasQuery, [
          proveedorId,
          caract.id_caracteristica,
          caract.valor
        ]);
      }
    }
    console.log(`✅ Paso 3/4: ${caracteristicas?.length || 0} características insertadas`);
    
    // ========== PASO 4: Gestionar Imágenes ==========
    
    // 4a. Eliminar imágenes marcadas
    if (imagenes_eliminar && imagenes_eliminar.length > 0) {
      const eliminarQuery = 'DELETE FROM proveedor_imagen WHERE id = ANY($1::int[])';
      await client.query(eliminarQuery, [imagenes_eliminar]);
      console.log(`✅ Paso 4a: ${imagenes_eliminar.length} imagen(es) eliminadas`);
    }
    
    // 4b. Agregar nuevas imágenes (URLs)
    if (imagenes_urls && imagenes_urls.length > 0) {
      const insertImagenQuery = `
        INSERT INTO proveedor_imagen (id_proveedor, url_imagen)
        VALUES ($1, $2)
      `;
      
      for (const url of imagenes_urls) {
        await client.query(insertImagenQuery, [proveedorId, url]);
      }
      console.log(`✅ Paso 4b: ${imagenes_urls.length} imagen(es) URL agregadas`);
    }
    
    // 4c. Agregar nuevas imágenes (Archivos)
    if (req.files && req.files.length > 0) {
      const fs = require('fs').promises;
      const path = require('path');
      
      for (const file of req.files) {
        // Guardar archivo físicamente
        const nombreArchivo = `${Date.now()}_${file.originalname}`;
        const rutaArchivo = path.join(__dirname, '../uploads/proveedores', nombreArchivo);
        await fs.writeFile(rutaArchivo, file.buffer);
        
        // Guardar referencia en BD
        const urlImagen = `/uploads/proveedores/${nombreArchivo}`;
        await client.query(
          'INSERT INTO proveedor_imagen (id_proveedor, url_imagen) VALUES ($1, $2)',
          [proveedorId, urlImagen]
        );
      }
      console.log(`✅ Paso 4c: ${req.files.length} archivo(s) subidos`);
    }
    
    // ========== CONFIRMAR TRANSACCIÓN ==========
    await client.query('COMMIT');
    console.log('🎉 Transacción completada exitosamente');
    
    res.status(200).json({
      success: true,
      mensaje: 'Proveedor actualizado completamente (datos + características + imágenes)',
      id_proveedor: proveedorId
    });
    
  } catch (error) {
    // ========== ERROR: ROLLBACK AUTOMÁTICO ==========
    await client.query('ROLLBACK');
    console.error('❌ ERROR en transacción, ROLLBACK ejecutado:', error);
    
    res.status(500).json({
      success: false,
      error: 'Error al actualizar proveedor',
      detalle: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    
  } finally {
    client.release();
  }
});

module.exports = router;
```

---

## 🔧 Cambios en el Frontend (Angular)

### 1. Nuevo Método en api.service.ts

```typescript
// Actualización completa transaccional
updateProveedorCompleto(id: number, data: any, archivos?: File[]): Observable<any> {
  const formData = new FormData();
  
  // Datos del proveedor
  formData.append('proveedor', JSON.stringify(data.proveedor));
  
  // Características
  formData.append('caracteristicas', JSON.stringify(data.caracteristicas));
  
  // Imágenes a eliminar
  if (data.imagenes?.eliminar) {
    formData.append('imagenes_eliminar', JSON.stringify(data.imagenes.eliminar));
  }
  
  // URLs de imágenes
  if (data.imagenes?.agregar_urls) {
    formData.append('imagenes_urls', JSON.stringify(data.imagenes.agregar_urls));
  }
  
  // Archivos de imágenes
  if (archivos) {
    archivos.forEach(archivo => {
      formData.append('imagenes_archivos', archivo);
    });
  }
  
  return this.http.put(`${this.API_URL}/proveedor/${id}/actualizar-completo`, formData);
}
```

### 2. Modificar editar-proveedor.ts

```typescript
onSubmit(): void {
  if (this.formProveedor.invalid) {
    alert('⚠️ Por favor completa todos los campos requeridos');
    return;
  }

  this.loading = true;

  // Preparar datos de proveedor
  const datosProveedor = {
    nombre_fantasia: this.formProveedor.get('datosGenerales.nombre_fantasia')?.value,
    razon_social: this.formProveedor.get('datosGenerales.razon_social')?.value,
    cuit: this.formProveedor.get('datosGenerales.cuit')?.value,
    email: this.formProveedor.get('datosGenerales.email')?.value,
    telefono: this.formProveedor.get('datosGenerales.telefono')?.value,
    direccion: this.formProveedor.get('datosGenerales.direccion')?.value,
    localidad: this.formProveedor.get('datosGenerales.localidad')?.value,
    provincia: this.formProveedor.get('datosGenerales.provincia')?.value,
    codigo_postal: this.formProveedor.get('datosGenerales.codigo_postal')?.value,
    instagram: this.formProveedor.get('redesSociales.instagram')?.value,
    sitio_web: this.formProveedor.get('redesSociales.sitio_web')?.value,
    estado_aprobacion: this.formProveedor.get('datosGenerales.estado_aprobacion')?.value,
    descripcion: this.formProveedor.get('datosGenerales.descripcion')?.value
  };

  // Preparar características
  const caracteristicas = this.caracteristicasArray.controls
    .filter(control => control.get('valor')?.value?.trim())
    .map(control => ({
      id_caracteristica: control.get('id_caracteristica')?.value,
      valor: control.get('valor')?.value.trim()
    }));

  // Preparar imágenes
  const imagenesData = {
    eliminar: this.imagenesAEliminar,
    agregar_urls: Object.values(this.nuevasImagenesUrls).filter(url => url.trim())
  };

  // Archivos de imágenes
  const archivos: File[] = Object.values(this.nuevasImagenes);

  // LLAMADA ÚNICA TRANSACCIONAL
  const payload = {
    proveedor: datosProveedor,
    caracteristicas: caracteristicas,
    imagenes: imagenesData
  };

  console.log('🚀 Enviando actualización completa (transaccional)...', payload);

  this.apiService.updateProveedorCompleto(this.proveedorId, payload, archivos).subscribe({
    next: () => {
      this.loading = false;
      alert('✅ Proveedor actualizado exitosamente (todo guardado en una transacción)');
      this.router.navigate(['/adm-proveedor']);
    },
    error: (err) => {
      this.loading = false;
      console.error('❌ Error en actualización:', err);
      
      alert(
        '❌ ERROR: NO se realizó ningún cambio (rollback automático).\n\n' +
        'Detalle: ' + (err.error?.detalle || err.error?.message || err.message) + '\n\n' +
        'Todos los cambios fueron descartados para mantener la integridad de los datos.'
      );
    }
  });
}
```

---

## 🎯 Ventajas de esta Solución

### ✅ Atomicidad Total
- **Todo o nada**: Si cualquier operación falla, se revierten TODOS los cambios.
- No hay estados intermedios inconsistentes.

### ✅ Una Sola Llamada HTTP
- Frontend solo hace **1 request** en lugar de 3+.
- Más rápido y eficiente.

### ✅ Mejor Manejo de Errores
- Si falla, **garantizado** que no hay cambios parciales.
- Mensaje claro al usuario: "NO se guardó nada".

### ✅ Menos Complejidad Frontend
- No necesita orquestar múltiples llamadas.
- No necesita revertir manualmente.

---

## 📋 Checklist de Implementación

- [ ] Crear endpoint `PUT /api/proveedor/:id/actualizar-completo`
- [ ] Configurar transacción SQL con `BEGIN/COMMIT/ROLLBACK`
- [ ] Probar rollback intencional (forzar error en paso 2 o 3)
- [ ] Implementar método en `api.service.ts`
- [ ] Refactorizar `editar-proveedor.ts` para usar endpoint único
- [ ] Agregar logs detallados en cada paso de la transacción
- [ ] Probar escenarios:
  - ✅ Actualización completa exitosa
  - ❌ Error en proveedor (paso 1)
  - ❌ Error en características (paso 2)
  - ❌ Error en imágenes (paso 3)
- [ ] Verificar que rollback funciona en todos los casos

---

## 🧪 Pruebas Recomendadas

### Test 1: Actualización Exitosa
```bash
curl -X PUT http://localhost:3000/api/proveedor/5/actualizar-completo \
  -H "Content-Type: application/json" \
  -d '{
    "proveedor": { "nombre_fantasia": "Test OK" },
    "caracteristicas": [{"id_caracteristica": 1, "valor": "Test"}],
    "imagenes": { "eliminar": [], "agregar_urls": [] }
  }'
```

**Esperado**: Status 200, todos los datos guardados.

### Test 2: Error en Características (Rollback)
```bash
# Usar id_caracteristica inválido para forzar error
curl -X PUT http://localhost:3000/api/proveedor/5/actualizar-completo \
  -d '{
    "proveedor": { "nombre_fantasia": "Test Rollback" },
    "caracteristicas": [{"id_caracteristica": 99999, "valor": "Error"}],
    "imagenes": { "eliminar": [], "agregar_urls": [] }
  }'
```

**Esperado**: Status 500, **nombre_fantasia NO debe cambiar** (rollback).

---

## 📌 Notas Importantes

1. **Requiere PostgreSQL** (o cualquier BD con soporte de transacciones).
2. El endpoint debe estar protegido con autenticación (JWT).
3. Validar permisos: Solo admin/proveedor dueño puede editar.
4. Agregar límites de tamaño para archivos subidos.
5. Considerar timeout para transacciones largas.

---

## 🔗 Referencias

- [PostgreSQL Transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [Express Error Handling](https://expressjs.com/en/guide/error-handling.html)
- [Multer Documentation](https://github.com/expressjs/multer)
