# Componente: Proveedores Home API

## Descripción
Componente Angular que muestra los proveedores desde la vista `v_listar_proveedor_home` del backend, optimizado para la página de inicio. Por ahora **no muestra fotos**, solo datos textuales.

## Ubicación
- **Ruta**: `/proveedores-home-api`
- **Directorio**: `src/app/components/proveedores-home-api/`
- **Acceso**: Desde el panel API (`/api-test`)

## Archivos
```
proveedores-home-api/
├── proveedores-home-api.ts      # Componente TypeScript con lógica
├── proveedores-home-api.html    # Template con tabla y resúmenes
└── proveedores-home-api.css     # Estilos del componente
```

## Características

### 1. Conexión al Backend
- **Endpoint**: `GET /api/v_proveedor_home`
- **Vista DB**: `v_listar_proveedor_home`
- **Servicio**: `ApiService.getProveedoresHome()`

### 2. Datos Mostrados
Cada proveedor muestra:
- ✅ **Nombre**: Nombre del proveedor
- ✅ **Descripción**: Descripción truncada a 120 caracteres
- ✅ **Categoría**: Badge con color según tipo (MUSICA, CATERING, DECORACION, LUGAR)
- ✅ **Estado Foto**: Indica si tiene foto cargada o no
- ❌ **Foto**: NO mostrada (implementación futura)

### 3. Funcionalidades

#### Tabla de Proveedores
- Lista completa con numeración
- Scroll vertical si hay muchos registros
- Hover effect en filas
- Badges de categoría con iconos Bootstrap

#### Resumen por Categoría
4 tarjetas con contadores por tipo:
- 🎵 **Música** (badge azul)
- ☕ **Catering** (badge verde)
- 🌸 **Decoración** (badge amarillo)
- 🏢 **Lugar** (badge rojo)

#### Estados
- **Loading**: Spinner mientras carga
- **Error**: Mensaje de error si falla la petición
- **Vacío**: Mensaje informativo si no hay datos
- **Datos**: Tabla + resumen de categorías

### 4. Signals Reactivos
```typescript
proveedores = signal<ProveedorHome[]>([]);
loading = signal(false);
error = signal<string>('');
```

## Interface
```typescript
interface ProveedorHome {
  Nombre: string;
  Descripcion: string;
  Categoria: string;
  Foto: any;  // No se usa por ahora
}
```

## Métodos

### `cargarProveedores()`
Carga los proveedores desde la API al inicializar el componente.

### `trunc(text: string, length: number)`
Trunca texto largo para la tabla, agregando "..." al final.

## Badges de Categoría
| Categoría   | Color    | Icono                    |
|-------------|----------|--------------------------|
| MUSICA      | Info     | `bi-music-note-beamed`   |
| CATERING    | Success  | `bi-cup-hot`             |
| DECORACION  | Warning  | `bi-flower1`             |
| LUGAR       | Danger   | `bi-building`            |

## Comparación con Componentes Relacionados

| Componente              | Propósito                        | Muestra Fotos |
|-------------------------|----------------------------------|---------------|
| `colaboradores`         | Versión estática original        | Sí (locales)  |
| `adm-proveedor-api`     | CRUD completo de proveedores     | No            |
| `proveedores-home-api`  | Vista simplificada para home     | **No**        |

## Próximos Pasos (Futuro)
1. ✅ Implementar visualización de fotos desde bytea
2. ✅ Agregar filtros por categoría
3. ✅ Agregar búsqueda por nombre
4. ✅ Implementar vista de tarjetas (cards) además de tabla
5. ✅ Integrar en la página Home real

## Navegación
- **Desde Home**: `/home` → Navbar → "API Tests" → "Proveedores Home API"
- **Directo**: `http://localhost:4200/proveedores-home-api`
- **Panel API**: `/api-test` → Sección "Proveedores para Home"

## Testing
1. Asegúrate de que el backend esté corriendo: `npm start` en `BackEnd_Proyecto`
2. Navega a `/proveedores-home-api`
3. Deberías ver una tabla con 16 proveedores (4 por categoría)
4. Verifica que los contadores de categorías sean correctos
5. Revisa la consola (F12) para ver los datos cargados

## Ejemplo de Datos
```json
{
  "Nombre": "DJ Vibe",
  "Descripcion": "DJ para bodas y fiestas corporativas.",
  "Categoria": "MUSICA",
  "Foto": { "type": "Buffer", "data": [] }
}
```
