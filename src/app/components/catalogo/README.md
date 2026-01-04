# Componente: Catálogo API

## Descripción
Componente Angular que muestra el catálogo de eventos con reseñas de clientes obtenidas desde la API del backend.

## Características

### 🎯 Funcionalidades
- ✅ Muestra planes de eventos (Básico, Intermedio, Premium)
- ✅ Filtro por categorías (Cumpleaños, Bodas, Baby Shower)
- ✅ **Reseñas dinámicas desde API** conectadas a `/api/v_resenia`
- ✅ Carrusel de reseñas con 2 testimonios por slide
- ✅ Calificación con estrellas (1-5)
- ✅ Avatar con iniciales cuando no hay foto
- ✅ Spinner de carga mientras obtiene datos
- ✅ Manejo de errores

### 📊 Datos de la API
El componente consume el endpoint `GET /api/v_resenia` que retorna:
```typescript
interface Resenia {
  'ID Reseña': number;
  'Nombre Usuario': string;
  'Comentario': string;
  'Calificacion': number;
  'Fecha Registro': string;
  'Foto Usuario': string;
}
```

### 🎨 Componentes Visuales

#### Sección 1: Hero Banner
- Imagen de fondo
- Título "Catálogo de Eventos"
- Botón de llamada a la acción

#### Sección 2: Filtros
- Dropdown de categorías
- Separador visual

#### Sección 3: Tarjetas de Planes
- Plan Básico
- Plan Intermedio
- Plan Premium
- Botones "Ver" y "Reservar"

#### Sección 4: Reseñas (DESDE API)
- Carrusel Bootstrap con reseñas reales
- Calificación con estrellas
- Avatar del usuario (o iniciales si no tiene foto)
- Fecha de la reseña
- Indicadores de navegación

## Diferencias con el Original

| Aspecto | Original (`catalogo`) | API (`catalogo-api`) |
|---------|----------------------|----------------------|
| Reseñas | Hardcodeadas (4 estáticas) | Desde base de datos (dinámicas) |
| Usuarios | Nombres inventados | Usuarios reales del sistema |
| Fechas | N/A | Fecha real de registro |
| Calificación | N/A | 1-5 estrellas desde DB |
| Avatar | URLs de pravatar | Foto real o iniciales |
| Actualización | Manual en código | Automática al agregar reseñas |

## Métodos Principales

### `cargarResenias()`
Obtiene todas las reseñas desde el backend usando `ApiService.getResenias()`

### `getStars(calificacion: number): number[]`
Genera un array para renderizar las estrellas de calificación

### `getInitials(nombre: string): string`
Extrae las iniciales del nombre del usuario (ej: "Ana García" → "AG")

### `getReseniasPairs(): Resenia[][]`
Agrupa las reseñas en pares para el carrusel (2 por slide)

## Uso

### Navegación
```
http://localhost:4200/catalogo-api
```

### En el Panel de API
Accesible desde `/api-test` en la sección "Catálogo con Reseñas"

## Estilos

El componente usa las mismas fuentes que el original:
- **Títulos**: `Playfair Display` (serif elegante)
- **Textos**: `Lora` (serif legible)

### Tarjetas de Reseñas (`.t-card`)
- Fondo gris claro con bordes sutiles
- Comilla decorativa en la esquina
- Efecto de elevación con sombras
- Avatar circular de 56x56px
- Avatar placeholder con gradiente morado cuando no hay foto

## Dependencias
- `ApiService` - Servicio para consumir el backend
- `CommonModule` - Para directivas de Angular
- `RouterLink` - Para navegación
- Bootstrap 5 - Para estilos y componentes

## Estado del Backend
Requiere que el backend esté corriendo en `https://127.0.0.1:443`

## Pruebas
```powershell
# Verificar endpoint de reseñas
Invoke-RestMethod -Uri "https://127.0.0.1:443/api/v_resenia" -Method GET | ConvertTo-Json
```

## Notas
- Las reseñas se ordenan por fecha descendente (más recientes primero)
- El carrusel se genera dinámicamente según la cantidad de reseñas
- Si no hay reseñas, muestra un mensaje informativo
- Si hay error de conexión, muestra alerta con el mensaje
