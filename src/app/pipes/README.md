# Pipes Personalizados

Esta carpeta contiene 13 pipes standalone personalizados para el proyecto. Todos están exportados desde `index.ts` para facilitar su importación.

## Tabla de Contenidos

- [Instalación y Uso](#instalación-y-uso)
- [Pipes Disponibles](#pipes-disponibles)
  - [TruncatePipe](#truncatepipe)
  - [DefaultValuePipe](#defaultvaluepipe)
  - [TimeRangePipe](#timerangepipe)
  - [RelativeTimePipe](#relativetimepipe)
  - [PhoneFormatPipe](#phoneformatpipe)
  - [PriceFormatPipe](#priceformatpipe)
  - [CategoriaIconPipe](#categoriaiconpipe)
  - [FileNamePipe](#filenamepipe)
  - [SafeUrlPipe](#safeurlpipe)
  - [FilterPipe](#filterpipe)
  - [OrderByPipe](#orderbypipe)
  - [StatusBadgePipe](#statusbadgepipe)
  - [InitialsPipe](#initialspipe)

---

## Instalación y Uso

### Importar pipes individualmente en un componente

Como todos los pipes son **standalone**, puedes importarlos directamente en el array `imports` de tu componente:

```typescript
import { Component } from '@angular/core';
import { TruncatePipe, PriceFormatPipe } from '../pipes';

@Component({
  selector: 'app-mi-componente',
  imports: [TruncatePipe, PriceFormatPipe],
  template: `
    <p>{{ descripcion | truncate:100 }}</p>
    <span>{{ precio | priceFormat:true }}</span>
  `
})
export class MiComponente {
  descripcion = 'Texto muy largo que será truncado...';
  precio = 150;
}
```

### Importar múltiples pipes

Si necesitas varios pipes, impórtalos desde el barrel `index.ts`:

```typescript
import { 
  TruncatePipe, 
  PriceFormatPipe, 
  RelativeTimePipe,
  FilterPipe 
} from '../pipes';

@Component({
  imports: [TruncatePipe, PriceFormatPipe, RelativeTimePipe, FilterPipe],
  // ...
})
```

---

## Pipes Disponibles

### TruncatePipe

**Nombre:** `truncate`  
**Descripción:** Acorta un texto a un límite de caracteres y añade puntos suspensivos.

**Parámetros:**
- `limit` (número, opcional, default: 50): Cantidad máxima de caracteres.
- `ellipsis` (string, opcional, default: '…'): Texto que se añade al final.

**Ejemplo:**
```html
<!-- "Este es un texto muy la…" -->
<p>{{ 'Este es un texto muy largo que será truncado' | truncate:25 }}</p>

<!-- Con ellipsis personalizado -->
<p>{{ descripcion | truncate:30:'...' }}</p>
```

---

### DefaultValuePipe

**Nombre:** `defaultValue`  
**Descripción:** Retorna un valor por defecto si el valor de entrada es `null`, `undefined` o string vacío.

**Parámetros:**
- `defaultValue` (any, opcional, default: '—'): Valor a mostrar cuando no hay dato.

**Ejemplo:**
```html
<!-- Muestra "—" si nombre es null/undefined/'' -->
<p>Nombre: {{ nombre | defaultValue }}</p>

<!-- Con valor por defecto personalizado -->
<p>Email: {{ email | defaultValue:'Sin correo' }}</p>
```

---

### TimeRangePipe

**Nombre:** `timeRange`  
**Descripción:** Formatea dos tiempos (inicio y fin) como un rango.

**Parámetros:**
- `inicio` (string): Hora de inicio.
- `fin` (string): Hora de fin.
- `separator` (string, opcional, default: ' - '): Separador entre las horas.

**Ejemplo:**
```html
<!-- "09:00 - 17:00" -->
<p>Horario: {{ '09:00' | timeRange:'17:00' }}</p>

<!-- Con separador personalizado -->
<p>{{ horaInicio | timeRange:horaFin:' hasta ' }}</p>
```

---

### RelativeTimePipe

**Nombre:** `relativeTime`  
**Descripción:** Convierte una fecha a tiempo relativo (ej: "Hace 3 días", "En 2 horas").

**Parámetros:**
- `value` (string | Date): Fecha a convertir.

**Ejemplo:**
```html
<!-- "Hace 2 días" -->
<p>Publicado: {{ fechaPublicacion | relativeTime }}</p>

<!-- "En 5 horas" (si es una fecha futura) -->
<p>Evento: {{ fechaEvento | relativeTime }}</p>
```

**Posibles salidas:**
- Pasado: "Recién", "Hace X minutos/horas/días/meses/años"
- Futuro: "Pronto", "En X minutos/horas/días"

---

### PhoneFormatPipe

**Nombre:** `phone`  
**Descripción:** Formatea números de teléfono en formato legible.

**Parámetros:**
- `format` ('ec' | 'us', opcional, default: 'ec'): Formato del país.

**Ejemplo:**
```html
<!-- "(099) 123-4567" -->
<p>{{ '0991234567' | phone }}</p>

<!-- "123-456-789" (si tiene 9 dígitos) -->
<p>{{ '123456789' | phone }}</p>
```

**Formatos soportados:**
- 10 dígitos: `(099) 123-4567`
- 9 dígitos: `123-456-789`

---

### PriceFormatPipe

**Nombre:** `priceFormat`  
**Descripción:** Formatea precios con símbolo de moneda y opción de "/hora".

**Parámetros:**
- `perHour` (boolean, opcional, default: false): Si es true, añade "/hora".
- `currency` (string, opcional, default: 'USD'): Código de moneda (actualmente solo muestra $).

**Ejemplo:**
```html
<!-- "$150.00" -->
<p>Precio: {{ 150 | priceFormat }}</p>

<!-- "$75.50/hora" -->
<p>Tarifa: {{ 75.5 | priceFormat:true }}</p>

<!-- "Consultar" (si el valor es null) -->
<p>{{ precioNoDisponible | priceFormat }}</p>
```

---

### CategoriaIconPipe

**Nombre:** `categoriaIcon`  
**Descripción:** Convierte el nombre de una categoría en una clase de icono de Bootstrap Icons.

**Parámetros:**
- `categoria` (string): Nombre de la categoría.

**Ejemplo:**
```html
<!-- <i class="bi-music-note-beamed"></i> -->
<i [class]="categoria | categoriaIcon"></i>
```

**Categorías soportadas:**
- `Musica` → `bi-music-note-beamed`
- `Catering` → `bi-egg-fried`
- `Lugar` → `bi-geo-alt`
- `Decoracion` → `bi-balloon-heart`
- Otros → `bi-circle` (por defecto)

---

### FileNamePipe

**Nombre:** `fileName`  
**Descripción:** Extrae el nombre de archivo de una ruta completa (soporta `/` y `\`).

**Parámetros:**
- `filePath` (string): Ruta completa del archivo.

**Ejemplo:**
```html
<!-- "documento.pdf" -->
<p>{{ 'C:/carpeta/subcarpeta/documento.pdf' | fileName }}</p>

<!-- "imagen.jpg" -->
<p>{{ 'imagenes\\fotos\\imagen.jpg' | fileName }}</p>

<!-- "Sin archivo" (si es null) -->
<p>{{ rutaArchivo | fileName }}</p>
```

---

### SafeUrlPipe

**Nombre:** `safeUrl`  
**Descripción:** Sanitiza y marca URLs como seguras para usar en `iframe` o recursos externos.

**Parámetros:**
- `url` (string): URL a sanitizar.

**Ejemplo:**
```html
<!-- Seguro para usar en iframe -->
<iframe [src]="videoUrl | safeUrl"></iframe>

<!-- Para recursos externos -->
<embed [src]="pdfUrl | safeUrl" type="application/pdf" />
```

**⚠️ Seguridad:**
- Solo permite URLs que comiencen con `http://` o `https://`
- Emite advertencia en consola si la URL no es segura

---

### FilterPipe

**Nombre:** `filter`  
**Descripción:** Filtra arrays por texto de búsqueda (en una propiedad específica o en todas).

**Parámetros:**
- `items` (array): Array a filtrar.
- `searchText` (string): Texto de búsqueda.
- `property` (string, opcional): Propiedad específica a buscar. Si no se proporciona, busca en todas.

**⚠️ Nota:** Este pipe tiene `pure: false`, lo que significa que se ejecuta en cada detección de cambios.

**Ejemplo:**
```html
<!-- Filtrar en todas las propiedades -->
<div *ngFor="let item of productos | filter:busqueda">
  {{ item.nombre }}
</div>

<!-- Filtrar solo en la propiedad 'nombre' -->
<div *ngFor="let user of usuarios | filter:busqueda:'nombre'">
  {{ user.nombre }}
</div>
```

**Template completo:**
```typescript
@Component({
  template: `
    <input [(ngModel)]="busqueda" placeholder="Buscar...">
    <div *ngFor="let producto of productos | filter:busqueda:'nombre'">
      {{ producto.nombre }} - {{ producto.precio }}
    </div>
  `
})
export class ListaProductos {
  busqueda = '';
  productos = [
    { nombre: 'Laptop', precio: 1200 },
    { nombre: 'Mouse', precio: 25 }
  ];
}
```

---

### OrderByPipe

**Nombre:** `orderBy`  
**Descripción:** Ordena arrays por una propiedad específica en orden ascendente o descendente.

**Parámetros:**
- `array` (array): Array a ordenar.
- `field` (keyof T): Propiedad por la cual ordenar.
- `direction` ('asc' | 'desc', opcional, default: 'asc'): Dirección del ordenamiento.

**⚠️ Nota:** Este pipe tiene `pure: false` y crea una copia del array original.

**Ejemplo:**
```html
<!-- Ordenar por nombre ascendente -->
<div *ngFor="let user of usuarios | orderBy:'nombre'">
  {{ user.nombre }}
</div>

<!-- Ordenar por fecha descendente -->
<div *ngFor="let evento of eventos | orderBy:'fecha':'desc'">
  {{ evento.titulo }} - {{ evento.fecha }}
</div>
```

---

### StatusBadgePipe

**Nombre:** `statusBadge`  
**Descripción:** Convierte un estado en una clase CSS de badge de Bootstrap o en texto legible.

**Parámetros:**
- `status` (string): Estado a convertir.
- `type` ('class' | 'text', opcional, default: 'text'): Tipo de salida.

**Ejemplo:**
```html
<!-- Texto del badge: "Activo" -->
<span>Estado: {{ estado | statusBadge }}</span>

<!-- Clase CSS: "badge bg-success" -->
<span [class]="estado | statusBadge:'class'">
  {{ estado | statusBadge:'text' }}
</span>
```

**Estados soportados:**
- `active`/`activo` → 🟢 Activo (badge bg-success)
- `inactive`/`inactivo` → ⚫ Inactivo (badge bg-secondary)
- `pending`/`pendiente` → 🟡 Pendiente (badge bg-warning)
- `rejected`/`rechazado` → 🔴 Rechazado (badge bg-danger)
- `approved`/`aprobado` → 🔵 Aprobado (badge bg-info)
- `completed`/`completado` → 🟣 Completado (badge bg-primary)

**Template completo:**
```html
<span [class]="solicitud.estado | statusBadge:'class'">
  {{ solicitud.estado | statusBadge:'text' }}
</span>
```

---

### InitialsPipe

**Nombre:** `initials`  
**Descripción:** Extrae las iniciales de un nombre completo.

**Parámetros:**
- `name` (string): Nombre completo.
- `maxLetters` (número, opcional, default: 2): Cantidad máxima de iniciales.

**Ejemplo:**
```html
<!-- "JD" -->
<div class="avatar">{{ 'Juan Pérez' | initials }}</div>

<!-- "JDP" (toma 3 iniciales) -->
<div class="avatar">{{ 'Juan David Pérez' | initials:3 }}</div>

<!-- "??" (si el nombre es null o vacío) -->
<div class="avatar">{{ nombreVacio | initials }}</div>
```

**Uso común (avatar):**
```html
<div class="avatar bg-primary text-white rounded-circle d-flex align-items-center justify-content-center"
     style="width: 40px; height: 40px;">
  {{ usuario.nombre | initials }}
</div>
```

---

## Mejores Prácticas

### 1. Importar solo lo necesario
No importes todos los pipes si solo necesitas uno o dos:

```typescript
// ✅ Bueno
import { TruncatePipe } from '../pipes';

// ❌ Evitar importar todo
import * from '../pipes';
```

### 2. Pipes puros vs impuros
Los pipes `FilterPipe` y `OrderByPipe` son **impuros** (`pure: false`). Esto significa que se ejecutan en cada detección de cambios. Úsalos con cuidado en listas grandes, considera mover la lógica al componente si afecta el rendimiento.

### 3. Seguridad con SafeUrlPipe
Solo usa `SafeUrlPipe` con URLs confiables. Angular bloquea URLs inseguras por defecto para proteger contra XSS.

---

## Ejemplo Completo: Catálogo de Productos

```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  TruncatePipe, 
  PriceFormatPipe, 
  FilterPipe,
  StatusBadgePipe,
  CategoriaIconPipe 
} from '../pipes';

@Component({
  selector: 'app-catalogo',
  imports: [
    CommonModule, 
    FormsModule,
    TruncatePipe, 
    PriceFormatPipe, 
    FilterPipe,
    StatusBadgePipe,
    CategoriaIconPipe
  ],
  template: `
    <input [(ngModel)]="busqueda" placeholder="Buscar productos...">
    
    <div *ngFor="let producto of productos | filter:busqueda:'nombre'">
      <i [class]="producto.categoria | categoriaIcon"></i>
      <h3>{{ producto.nombre }}</h3>
      <p>{{ producto.descripcion | truncate:100 }}</p>
      <p class="precio">{{ producto.precio | priceFormat:true }}</p>
      <span [class]="producto.estado | statusBadge:'class'">
        {{ producto.estado | statusBadge:'text' }}
      </span>
    </div>
  `
})
export class CatalogoComponent {
  busqueda = '';
  productos = [
    {
      nombre: 'DJ Profesional',
      descripcion: 'Servicio de música para eventos con amplia experiencia...',
      precio: 150,
      categoria: 'Musica',
      estado: 'activo'
    },
    // ... más productos
  ];
}
```

---

## Soporte

Si encuentras algún problema o necesitas un pipe adicional, crea un issue o contacta al equipo de desarrollo.
