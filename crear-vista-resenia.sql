-- =============================================
-- Vista v_resenia
-- Combina información de reseñas con eventos y usuarios
-- =============================================

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
    e.descripcion_evento AS descripcion_evento,
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

-- Comentario de la vista
COMMENT ON VIEW v_resenia IS 'Vista que combina reseñas de eventos con información de eventos y usuarios';
