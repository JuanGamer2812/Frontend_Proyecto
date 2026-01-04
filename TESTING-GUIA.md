# 🧪 GUÍA DE TESTING - Componente Reserva COMPLETO

## Requisitos Previos
- ✅ Backend corriendo en localhost:5000
- ✅ Angular app corriendo en localhost:4200
- ✅ npm install realizado (xlsx + exceljs instalados)
- ✅ Usuario autenticado en la aplicación

---

## 🧪 PRUEBA 1: Validación de Cédula

### Pasos:
1. Navega a la sección "Crear Reserva"
2. Intenta dejar vacío el campo "Cédula del responsable"
3. Haz clic en "Guardar Reserva"

### Resultado Esperado:
- ❌ Error: "Por favor completa todos los campos obligatorios (incluyendo la cédula)"
- Campo se marca en rojo

### Pasos Adicionales:
4. Ingresa "123" (menos de 10 dígitos)
5. Haz clic fuera del campo

### Resultado Esperado:
- ❌ Campo se marca en rojo
- Mensaje: "Cédula válida (10-15 dígitos) requerida"

### Pasos Adicionales:
6. Ingresa "1234567890ABCD" (contiene letras)

### Resultado Esperado:
- ❌ Campo se marca en rojo (solo números permitidos)

### Pasos Adicionales:
7. Ingresa "1234567890" (correcto)

### Resultado Esperado:
- ✅ Campo válido (sin marca roja)

---

## 🧪 PRUEBA 2: Agregar Invitado Manualmente

### Pasos:
1. Desplázate hasta la sección "Lista de Invitados"
2. Haz clic en botón "Agregar Invitado"

### Resultado Esperado:
- ✅ Nueva fila aparece en la tabla
- Número de fila incremental
- Campos vacíos listos para completar

### Pasos Adicionales:
3. Completa el primer invitado:
   - Nombre: "Juan Pérez"
   - Email: "juan@ejemplo.com"
   - Teléfono: "0991234567"
   - Acompañantes: "2"
   
4. Haz clic en "Agregar Invitado" nuevamente

### Resultado Esperado:
- ✅ Segunda fila aparece
- Contador "Total de Personas" no cambia aún (no valida hasta blur)

### Pasos Adicionales:
5. Haz clic fuera del último campo de la primera fila

### Resultado Esperado:
- ✅ "Total de Personas" actualiza a "2" (Juan + 2 acompañantes)

---

## 🧪 PRUEBA 3: Eliminar Invitado

### Pasos:
1. En la tabla de invitados, en la fila de Juan
2. Haz clic en botón "Eliminar" (icono de papelera)

### Resultado Esperado:
- ✅ Fila desaparece
- ✅ "Total de Personas" actualiza a 0
- ✅ Si solo queda 1 invitado, la tabla dice "No hay invitados aún"

---

## 🧪 PRUEBA 4: Descargar Plantilla Excel

### Pasos:
1. En la sección "Lista de Invitados"
2. Haz clic en "Descargar Plantilla"

### Resultado Esperado:
- ✅ Archivo `plantilla_invitados.xlsx` se descarga
- ✅ Se abre en Excel/Calc

### Verificar en Excel:
- ✅ Encabezados azules con texto blanco
- ✅ Columnas: Nombre, Email, Teléfono, Acompañantes, Notas
- ✅ 3 filas de ejemplo con datos
- ✅ Filas pares tienen fondo gris claro
- ✅ Bordes en todas las celdas
- ✅ Encabezado congelado (frozen)
- ✅ Filtros automáticos en encabezado

---

## 🧪 PRUEBA 5: Importar Invitados desde Excel

### Preparación:
1. Descarga la plantilla (PRUEBA 4)
2. Completa con invitados:
   ```
   Nombre           | Email              | Teléfono    | Acompañantes | Notas
   María García     | maria@test.com     | 0987654321  | 1            | Vegetariana
   Carlos López     | carlos@test.com    | 0999999999  | 0            | Alergia mariscos
   Ana Martínez     | ana@test.com       |             | 3            | Cumpleañera
   ```
3. Guarda como `invitados_test.xlsx`

### Pasos:
1. En sección "Lista de Invitados"
2. Haz clic en "Importar Excel"
3. Selecciona el archivo `invitados_test.xlsx`

### Resultado Esperado:
- ✅ Popup: "Se importaron 3 invitados correctamente"
- ✅ Tabla se llena con los 3 invitados
- ✅ "Total de Personas" = 4 (1 + 0 + 3)
- ✅ Paginación se ajusta a mostrar 10 máximo

### Verificación de Datos:
4. Verifica que cada campo tenga los datos correctos:
   - Nombres correctos
   - Emails validados
   - Teléfonos intactos
   - Acompañantes numéricos
   - Notas preservadas

---

## 🧪 PRUEBA 6: Paginación de Invitados

### Setup (desde PRUEBA 5):
- Ya tienes 3 invitados importados

### Pasos 1: Cambiar Filas Visibles
1. Selector que dice "3 filas" por defecto
2. Cambia a "5 filas"

### Resultado Esperado:
- ✅ Si hay 5+ invitados, todas se muestran
- ✅ Si hay menos, muestra todas

### Pasos 2: Agregar más invitados
1. Haz clic "Agregar Invitado" 8 veces más (para tener 11 total)
2. Completa solo el nombre en cada uno (Inv 1, Inv 2, ..., Inv 11)

### Resultado Esperado:
- ✅ Selector sigue en "5 filas"
- ✅ Solo 5 primeras filas visibles
- ✅ Botón "Mostrar 10 más" aparece con "6 restantes"

### Pasos 3: Mostrar Más
1. Haz clic en "Mostrar 10 más"

### Resultado Esperado:
- ✅ Ahora se muestran 10 filas
- ✅ Botón desaparece (solo 1 fila restante oculta)
- ✅ O muestra "1 restantes" si la configura

### Pasos 4: Reset de Paginación
1. Cambia selector a "3 filas"

### Resultado Esperado:
- ✅ Vuelve a mostrar solo 3
- ✅ Botón "Mostrar más" reaparece

### Pasos 5: Auto-expand al Agregar
1. Con paginación en "3 filas" y 11 invitados (5 visibles)
2. Haz clic "Agregar Invitado"

### Resultado Esperado:
- ✅ Nuevo invitado (12) aparece automáticamente visible
- ✅ Paginación auto-expande a 12

---

## 🧪 PRUEBA 7: Galería de Imágenes

### Prerequisito:
- Asegurate que los proveedores tengan imágenes en Base64
- Debe haberse modificado backend para incluir imágenes_proveedor

### Pasos:
1. En sección "Proveedores del Evento"
2. Haz clic para agregar un proveedor (ej: "Música")
3. Selecciona un proveedor que tenga imágenes

### Resultado Esperado:
- ✅ Sección "Fotos del Proveedor" aparece
- ✅ Muestra hasta 3 imágenes en grid
- ✅ Imágenes redondas con object-fit: cover
- ✅ Responsive: 3 columnas en mobile, 4 en desktop

### Verificación Visual:
4. Verifica que:
   - ✅ Imágenes se cargan sin errores
   - ✅ Relación de aspecto se mantiene (cuadrados)
   - ✅ No hay márgenes extraños

---

## 🧪 PRUEBA 8: Cálculo de Costos y IVA

### Setup:
1. Completa un evento con:
   - Precio base: $100
   - Agregar proveedor Música: $150
   - Agregar proveedor Catering: $200
   - Agregar 5 invitados con 2 acompañantes c/u (10 personas total)

### Pasos:
1. Desplázate al resumen

### Resultado Esperado - Cálculo Manual:
```
Subtotal = 100 + 150 + 200 = $450
IVA (15%) = 450 × 0.15 = $67.50
TOTAL = 450 + 67.50 = $517.50
```

### Verificación en Pantalla:
- ✅ "Subtotal:" muestra "$450.00"
- ✅ "IVA (15%):" muestra "$67.50"
- ✅ "TOTAL A PAGAR:" muestra "$517.50"

### Pasos 2: Cambiar Precio Base
1. Modifica "Precio base del evento" a $50

### Resultado Esperado:
- ✅ Subtotal actualiza a $400
- ✅ IVA actualiza a $60.00
- ✅ Total actualiza a $460.00

---

## 🧪 PRUEBA 9: Validación de Formulario Completo

### Setup:
1. Completa el siguiente formulario:

```
DATOS DEL EVENTO:
- Nombre evento: "Boda Juan y María"
- Tipo evento: "Boda"
- Descripción: "Una boda hermosa en el jardín"
- Fecha inicio: 2024-12-25 14:00
- Fecha fin: 2024-12-25 22:00
- Precio base: 200
- Cédula: "1234567890"

PROVEEDORES:
- Música: DJ Premium
- Catering: Banquetes ABC
- Decoración: Floral Design

INVITADOS:
- Mínimo 3 invitados con nombre y email válidos
```

### Pasos:
1. Haz clic en "Guardar Reserva"

### Resultado Esperado:
- ✅ Sin validaciones rojas
- ✅ Botón "Guardar Reserva" está habilitado
- ✅ Se env al servidor

### Verificación en Console:
2. Abre Dev Tools (F12) → Console
3. Verifica que muestre:
   ```
   📤 Enviando reserva completa: {
     ...formulario,
     cedula_reservacion: "1234567890",
     invitados: [...],
     total_personas: X,
     subtotal: ...,
     iva_monto: ...,
     total: ...
   }
   ```

---

## 🧪 PRUEBA 10: Validación de Campos Obligatorios

### Setup:
1. Deja el formulario incompleto:
   - Sin fecha de inicio
   - Sin proveedores
   - Sin invitados (opcional)

### Pasos:
1. Haz clic "Guardar Reserva"

### Resultado Esperado:
- ✅ Alert: "Por favor completa todos los campos obligatorios"
- ✅ Campos inválidos se marcan en rojo
- ✅ Botón sigue disabled

### Verificación:
2. Rellena solo la fecha
3. Haz clic "Guardar Reserva" nuevamente

### Resultado Esperado:
- ✅ Alert: "Debes seleccionar una fecha y un evento"
- O: "Debes seleccionar al menos un proveedor"

---

## 🧪 PRUEBA 11: Reset de Formulario

### Setup:
1. Completa todo el formulario (como PRUEBA 9)
2. Agrega 5 invitados
3. Haz clic "Guardar Reserva"

### Resultado Esperado - Si Backend Responde:
- ✅ Popup: "¡Reserva creada exitosamente! ID: XXX"
- ✅ Dev Console: "✅ Reserva creada exitosamente"
- ✅ Factura creada automáticamente (log opcional)

### Verificación Post-Reset:
4. Verifica que:
   - ✅ Todos los inputs están vacíos
   - ✅ FormArrays están vacíos (proveedores y invitados)
   - ✅ Paginación resetea a "3 filas"
   - ✅ Totales muestran $0

---

## 🧪 PRUEBA 12: Error Handling

### Setup:
1. Detén el backend (o desactiva internet)

### Pasos:
1. Completa el formulario como en PRUEBA 9
2. Haz clic "Guardar Reserva"

### Resultado Esperado:
- ✅ Botón muestra "Guardando..." con spinner
- ✅ Después de timeout: Alert con error
- ✅ Console muestra el error detallado
- ✅ Botón se re-habilita

### Verificación:
2. Vuelve a activar el backend
3. Intenta nuevamente

### Resultado Esperado:
- ✅ Ahora funciona correctamente

---

## 📊 Resumen de Casos de Prueba

| Prueba | Componente | Estado | Notas |
|--------|-----------|--------|-------|
| 1 | Cédula | ✅ | Validación numérica 10-15 dígitos |
| 2 | Agregar Invitado | ✅ | Manual y auto-expand |
| 3 | Eliminar Invitado | ✅ | Actualiza totales |
| 4 | Plantilla Excel | ✅ | Estilos profesionales |
| 5 | Importar Excel | ✅ | Flexible en nombres columnas |
| 6 | Paginación | ✅ | Dinámico, dropdown + "mostrar más" |
| 7 | Galería Imágenes | ✅ | Base64 a Data URL |
| 8 | Cálculo IVA | ✅ | 15% Ecuador |
| 9 | Validación Completa | ✅ | Todos los campos requeridos |
| 10 | Error Handling | ✅ | Campos obligatorios |
| 11 | Reset Formulario | ✅ | Limpia todo |
| 12 | Backend Offline | ✅ | Manejo de errores |

---

## 🐛 Posibles Problemas y Soluciones

### Problema: "xlsx is not defined"
**Solución**: Asegurate que el import dinámico se está usando
```typescript
import('xlsx').then(XLSX => {
  // Usar XLSX aquí
})
```

### Problema: Imágenes no cargan en galería
**Solución**: Verifica que el backend esté enviando Base64 en los campos imagen_proveedor, imagen1_proveedor, etc.

### Problema: Paginación no funciona
**Solución**: Verifica que signal `filasVisiblesInvitados` esté correctamente inicializado en ~line 46

### Problema: IVA no calcula correctamente
**Solución**: Verifica que todos los proveedores tengan `precio_base` como número, no string

### Problema: Excel no importa
**Solución**: 
- Verifica nombres de columnas (debe ser exactamente "Nombre", "Email", "Teléfono", "Acompañantes", "Notas")
- O usa variaciones: "nombre", "NOMBRE", "email", "EMAIL", etc.

### Problema: Cédula rechaza números válidos
**Solución**: Verifica regex `/^[0-9]+$/` permite solo dígitos. Intenta con cédula sin caracteres especiales

---

## 📝 Checklist Final

- [ ] Validación de cédula funciona
- [ ] Agregar/eliminar invitados funciona
- [ ] Paginación funciona (3, 5, 10, 25, 50, 75, 100)
- [ ] Descargar plantilla Excel descarga bien
- [ ] Importar Excel agrega invitados correctamente
- [ ] Galería de imágenes muestra hasta 3 imágenes
- [ ] Cálculo de IVA es 15% correcto
- [ ] Validación de formulario requiere todos los campos
- [ ] Reset limpia todo después de guardar
- [ ] Error handling muestra mensajes útiles
- [ ] Console logs muestran datos correctamente
- [ ] Factura se crea automáticamente (si backend lo soporta)

---

**¡LISTO PARA TESTING!**

Si encuentras algún problema, abre la consola (F12) y revisa los mensajes de error.
