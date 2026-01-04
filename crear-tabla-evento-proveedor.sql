-- ================================================
-- Script para PostgreSQL
-- Crear tabla evento_proveedor
-- ================================================
-- 
-- Propósito: Relación muchos-a-muchos entre eventos y proveedores
-- Permite asignar múltiples proveedores a un evento con detalles específicos
-- 
-- Ejecutar este script en tu base de datos PostgreSQL antes de usar
-- el nuevo sistema de reservas del frontend Angular
-- ================================================

-- Verificar si la tabla ya existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'evento_proveedor'
    ) THEN
        RAISE NOTICE 'Creando tabla evento_proveedor...';
    ELSE
        RAISE NOTICE 'La tabla evento_proveedor ya existe. No se creará de nuevo.';
        RAISE NOTICE 'Si deseas recrearla, ejecuta: DROP TABLE evento_proveedor CASCADE;';
    END IF;
END $$;

-- Crear tabla evento_proveedor
CREATE TABLE IF NOT EXISTS evento_proveedor (
    id_evento_proveedor SERIAL PRIMARY KEY,
    id_evento INTEGER NOT NULL,
    id_proveedor BIGINT NOT NULL,
    categoria VARCHAR(50),
    plan VARCHAR(20),
    hora_inicio TIME,
    hora_fin TIME,
    notas_adicionales TEXT,
    precio NUMERIC(10,2) DEFAULT 0,
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_evento_proveedor_evento 
        FOREIGN KEY (id_evento) 
        REFERENCES evento(id_evento) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_evento_proveedor_proveedor 
        FOREIGN KEY (id_proveedor) 
        REFERENCES proveedor(id_proveedor) 
        ON DELETE RESTRICT,
    
    -- Constraints
    CONSTRAINT chk_hora_valida 
        CHECK (hora_fin IS NULL OR hora_inicio IS NULL OR hora_fin > hora_inicio),
    
    CONSTRAINT chk_precio_positivo 
        CHECK (precio >= 0)
);

-- Comentarios en la tabla
COMMENT ON TABLE evento_proveedor IS 
    'Relación muchos-a-muchos entre eventos y proveedores. Permite múltiples proveedores por evento.';

COMMENT ON COLUMN evento_proveedor.id_evento_proveedor IS 
    'Identificador único de la asignación proveedor-evento';

COMMENT ON COLUMN evento_proveedor.categoria IS 
    'Categoría del proveedor (MUSICA, CATERING, DECORACION, LUGAR)';

COMMENT ON COLUMN evento_proveedor.plan IS 
    'Plan contratado (Esencial, Plus, Estelar, etc.)';

COMMENT ON COLUMN evento_proveedor.precio IS 
    'Precio acordado para este proveedor en este evento específico';

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_evento_proveedor_evento 
    ON evento_proveedor(id_evento);

CREATE INDEX IF NOT EXISTS idx_evento_proveedor_proveedor 
    ON evento_proveedor(id_proveedor);

CREATE INDEX IF NOT EXISTS idx_evento_proveedor_categoria 
    ON evento_proveedor(categoria);

-- Estadísticas
DO $$ 
DECLARE
    row_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO row_count FROM evento_proveedor;
    RAISE NOTICE '✅ Tabla evento_proveedor verificada/creada exitosamente';
    RAISE NOTICE '📊 Registros actuales: %', row_count;
END $$;

-- Mostrar estructura de la tabla
\d evento_proveedor

-- Ejemplo de uso (comentado - descomentar para insertar datos de prueba)
INSERT INTO evento_proveedor (
    id_evento, 
    id_proveedor, 
    categoria, 
    plan, 
    hora_inicio, 
    hora_fin, 
    notas_adicionales, 
    precio
) VALUES 
    (1, 1, 'MUSICA', 'Plus', '18:00:00', '23:00:00', 'Música en vivo para ceremonia', 500.00),
    (1, 5, 'CATERING', 'Estelar', '19:00:00', '22:00:00', 'Buffet para 100 personas', 4550.00);

SELECT * FROM evento_proveedor;
