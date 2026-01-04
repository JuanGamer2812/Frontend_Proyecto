/**
 * =================================================================
 * ENDPOINTS PARA GESTIÓN DE PROVEEDORES
 * =================================================================
 * 
 * Este archivo contiene los endpoints para:
 * 1. GET /api/categorias - Cargar categorías dinámicamente
 * 2. GET /api/planes - Cargar planes dinámicamente
 * 3. POST /api/trabaja_nosotros_proveedor - Insertar nuevo postulante
 * 
 * REQUISITOS:
 * - npm install express pg multer body-parser
 * - PostgreSQL ejecutando con base de datos 'eclat'
 * 
 * CONFIGURACIÓN:
 * Ajusta las credenciales de PostgreSQL según tu entorno
 * =================================================================
 */

const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ==================== CONFIGURACIÓN PostgreSQL ====================
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'eclat', // Tu base de datos
    user: 'postgres',
    password: 'postgres', // Ajusta según tu setup
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Verificar conexión
pool.on('connect', () => {
    console.log('✅ Backend Proveedores: Conectado a PostgreSQL');
});

pool.on('error', (err) => {
    console.error('❌ Error en PostgreSQL:', err);
});

// ==================== CONFIGURACIÓN MULTER ====================
const uploadDir = path.join(__dirname, '..', 'tmp_uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp'
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`));
        }
    }
});

// ==================== MIDDLEWARE ====================
// Middleware básico de autenticación (ajusta según tu sistema)
function authenticateToken(req, res, next) {
    // Por ahora permitimos acceso sin token (desarrollo)
    // En producción, verifica JWT desde Authorization header
    next();
}

// ==================== ENDPOINT 1: GET /api/categorias ====================
/**
 * Retorna todas las categorías de proveedores
 * Respuesta: [{ id_tipo: 1, nombre: 'MUSICA', descripcion: '...' }, ...]
 */
const getCategorias = async(req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                id_tipo,
                nombre,
                descripcion_tipo as descripcion
            FROM proveedor_tipo
            ORDER BY nombre
        `);

        console.log(`📋 Categorías enviadas: ${result.rows.length}`);
        res.json(result.rows);

    } catch (error) {
        console.error('❌ Error al obtener categorías:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cargar categorías',
            error: error.message
        });
    }
};

// ==================== ENDPOINT 2: GET /api/planes ====================
/**
 * Retorna todos los planes disponibles
 * Respuesta: [{ id_plan: 1, nombre_plan: 'Básico', descripcion: '...' }, ...]
 */
const getPlanes = async(req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                id_plan,
                nombre_plan,
                descripcion
            FROM plan
            ORDER BY id_plan
        `);

        console.log(`📋 Planes enviados: ${result.rows.length}`);
        res.json(result.rows);

    } catch (error) {
        console.error('❌ Error al obtener planes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cargar planes',
            error: error.message
        });
    }
};

// ==================== ENDPOINT 3: POST /api/trabaja_nosotros_proveedor ====================
/**
 * Inserta un nuevo postulante de proveedor
 * 
 * Body (multipart/form-data):
 * {
 *   nom_empresa_postu_proveedor: string (100 chars max)
 *   categoria_postu_proveedor: string (MUSICA, CATERING, DECORACION, LUGAR)
 *   correo_postu_proveedor: string (email válido)
 *   portafolio_postu_proveedor: string (URL o descripción)
 *   ... archivos según categoría
 * }
 * 
 * Respuesta:
 * {
 *   success: true,
 *   message: 'Postulación registrada exitosamente',
 *   id_postu_proveedor: 5,
 *   data: { ...registro insertado }
 * }
 */
const postProveedorPostulante = async(req, res) => {
    try {
        const {
            nom_empresa_postu_proveedor,
            categoria_postu_proveedor,
            correo_postu_proveedor,
            portafolio_postu_proveedor
        } = req.body;

        // ===== VALIDACIONES =====
        if (!nom_empresa_postu_proveedor || nom_empresa_postu_proveedor.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'El nombre de empresa es requerido'
            });
        }

        if (nom_empresa_postu_proveedor.length > 100) {
            return res.status(400).json({
                success: false,
                message: 'El nombre de empresa no puede exceder 100 caracteres'
            });
        }

        if (!categoria_postu_proveedor || !['MUSICA', 'CATERING', 'DECORACION', 'LUGAR'].includes(categoria_postu_proveedor)) {
            return res.status(400).json({
                success: false,
                message: 'Categoría inválida. Debe ser: MUSICA, CATERING, DECORACION o LUGAR'
            });
        }

        // Validar email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!correo_postu_proveedor || !emailRegex.test(correo_postu_proveedor)) {
            return res.status(400).json({
                success: false,
                message: 'Email inválido'
            });
        }

        if (!portafolio_postu_proveedor || portafolio_postu_proveedor.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'El portafolio/descripción es requerido'
            });
        }

        // ===== PROCESAR ARCHIVOS =====
        let archivosGuardados = [];
        if (req.files && req.files.length > 0) {
            archivosGuardados = req.files.map(file => ({
                nombre: file.originalname,
                ruta: `/tmp_uploads/${file.filename}`,
                tipo: file.mimetype,
                tamaño: file.size
            }));
            console.log(`📁 Archivos guardados: ${archivosGuardados.length}`);
        }

        // ===== INSERTAR EN BD =====
        const query = `
            INSERT INTO trabaja_nosotros_proveedor (
                nom_empresa_postu_proveedor,
                categoria_postu_proveedor,
                correo_postu_proveedor,
                portafolio_postu_proveedor,
                fecha_postu_proveedor
            )
            VALUES ($1, $2, $3, $4, CURRENT_DATE)
            RETURNING id_postu_proveedor, nom_empresa_postu_proveedor, categoria_postu_proveedor, correo_postu_proveedor, portafolio_postu_proveedor, fecha_postu_proveedor
        `;

        const result = await pool.query(query, [
            nom_empresa_postu_proveedor.trim(),
            categoria_postu_proveedor,
            correo_postu_proveedor.trim().toLowerCase(),
            portafolio_postu_proveedor.trim()
        ]);

        const datosInsertados = result.rows[0];

        console.log(`✅ Nuevo postulante insertado: ID ${datosInsertados.id_postu_proveedor}`);

        res.status(201).json({
            success: true,
            message: 'Postulación registrada exitosamente. Tu solicitud será revisada pronto.',
            id_postu_proveedor: datosInsertados.id_postu_proveedor,
            data: datosInsertados,
            archivos: archivosGuardados
        });

    } catch (error) {
        console.error('❌ Error al registrar postulante:', error);
        res.status(500).json({
            success: false,
            message: 'Error al registrar postulación',
            error: error.message
        });
    }
};

// ==================== ENDPOINT 4: GET /api/trabajanosotros ====================
/**
 * Obtiene lista de postulantes de proveedores
 * Respuesta: [{ id_postu_proveedor, nom_empresa, categoria, correo, portafolio, fecha }, ...]
 */
const getPostulantesProveedores = async(req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                id_postu_proveedor,
                nom_empresa_postu_proveedor as nom_empresa,
                categoria_postu_proveedor as categoria,
                correo_postu_proveedor as correo,
                portafolio_postu_proveedor as portafolio,
                fecha_postu_proveedor as fecha
            FROM trabaja_nosotros_proveedor
            ORDER BY fecha_postu_proveedor DESC
        `);

        console.log(`📋 Postulantes enviados: ${result.rows.length}`);
        res.json(result.rows);

    } catch (error) {
        console.error('❌ Error al obtener postulantes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cargar postulantes',
            error: error.message
        });
    }
};

// ==================== ENDPOINT 5: POST /api/convertir-postulante-a-proveedor ====================
/**
 * Convierte un postulante en proveedor
 * 
 * Body (JSON):
 * {
 *   id_postu_proveedor: number,
 *   precio_base: number,
 *   id_plan: number,
 *   descripcion: string,
 *   ... campos específicos según categoría
 * }
 */
const convertirPostulanteAProveedor = async(req, res) => {
    try {
        const {
            id_postu_proveedor,
            precio_base,
            id_plan,
            descripcion
        } = req.body;

        // ===== VALIDACIONES =====
        if (!id_postu_proveedor) {
            return res.status(400).json({
                success: false,
                message: 'ID de postulante requerido'
            });
        }

        if (!precio_base || precio_base <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Precio base inválido'
            });
        }

        if (!id_plan) {
            return res.status(400).json({
                success: false,
                message: 'Plan requerido'
            });
        }

        // ===== OBTENER DATOS DEL POSTULANTE =====
        const postulante = await pool.query(
            `SELECT * FROM trabaja_nosotros_proveedor WHERE id_postu_proveedor = $1`, [id_postu_proveedor]
        );

        if (postulante.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Postulante no encontrado'
            });
        }

        const datos = postulante.rows[0];

        // Mapear categoría a id_tipo
        const tipoMap = {
            'MUSICA': 1,
            'CATERING': 2,
            'DECORACION': 3,
            'LUGAR': 4
        };

        const id_tipo = tipoMap[datos.categoria_postu_proveedor];
        if (!id_tipo) {
            return res.status(400).json({
                success: false,
                message: 'Categoría no válida'
            });
        }

        // ===== USAR IMAGEN DEFAULT EN LUGAR DE BUFFER =====
        const defaultImage = '/assets/default-provider.png';

        // ===== INSERTAR PROVEEDOR =====
        const insertQuery = `
            INSERT INTO proveedor (
                nombre,
                precio_base,
                estado,
                descripcion,
                id_plan,
                id_tipo,
                imagen_proveedor,
                imagen1_proveedor,
                imagen2_proveedor,
                imagen3_proveedor,
                estado_aprobacion,
                verificado,
                activo,
                correo_proveedor
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING id_proveedor, nombre, precio_base, estado, descripcion, id_plan, id_tipo, estado_aprobacion, verificado, fecha_registro
        `;

        const result = await pool.query(insertQuery, [
            datos.nom_empresa_postu_proveedor,
            precio_base,
            true, // estado = true (activo)
            descripcion || datos.portafolio_postu_proveedor,
            id_plan,
            id_tipo,
            defaultImage,
            defaultImage,
            defaultImage,
            defaultImage,
            'pendiente', // estado_aprobacion = pendiente
            false, // verificado = false
            true, // activo = true
            datos.correo_postu_proveedor
        ]);

        const nuevoProveedor = result.rows[0];
        const idProveedor = nuevoProveedor.id_proveedor;

        // ===== INSERTAR EN TABLA ESPECÍFICA POR CATEGORÍA =====
        try {
            if (datos.categoria_postu_proveedor === 'MUSICA') {
                const musicaQuery = `
                    INSERT INTO proveedor_musica (id_proveedor, genero, por_hora, hora_inicio, hora_fin)
                    VALUES ($1, $2, $3, $4, $5)
                `;
                await pool.query(musicaQuery, [
                    idProveedor,
                    'Variado',
                    false,
                    '08:00:00',
                    '20:00:00'
                ]);
            } else if (datos.categoria_postu_proveedor === 'CATERING') {
                const cateringQuery = `
                    INSERT INTO proveedor_catering (id_proveedor, tipo_comida, menu)
                    VALUES ($1, $2, $3)
                `;
                await pool.query(cateringQuery, [
                    idProveedor,
                    'Internacional',
                    'Menu disponible bajo demanda'
                ]);
            } else if (datos.categoria_postu_proveedor === 'DECORACION') {
                const decoracionQuery = `
                    INSERT INTO proveedor_decoracion (id_proveedor, nivel, pdf_catalogo)
                    VALUES ($1, $2, $3)
                `;
                await pool.query(decoracionQuery, [
                    idProveedor,
                    'Estándar',
                    'Catálogo disponible bajo demanda'
                ]);
            } else if (datos.categoria_postu_proveedor === 'LUGAR') {
                const lugarQuery = `
                    INSERT INTO proveedor_lugar (id_proveedor, capacidad, direccion, descripcion, seguridad)
                    VALUES ($1, $2, $3, $4, $5)
                `;
                await pool.query(lugarQuery, [
                    idProveedor,
                    100,
                    'Disponible',
                    'Ubicación a confirmar',
                    true
                ]);
            }
        } catch (subError) {
            console.warn('⚠️ Advertencia: No se insertaron datos específicos de categoría', subError.message);
        }

        console.log(`✅ Postulante convertido a Proveedor: ID ${idProveedor}`);

        res.status(201).json({
            success: true,
            message: 'Postulante convertido a proveedor exitosamente. Aparecerá en postulaciones pendientes.',
            id_proveedor: idProveedor,
            data: nuevoProveedor
        });

    } catch (error) {
        console.error('❌ Error al convertir postulante:', error);
        res.status(500).json({
            success: false,
            message: 'Error al procesar postulante',
            error: error.message
        });
    }
};

// ==================== ENDPOINT 6: POST /api/proveedor ====================
/**
 * Inserta directamente en tabla proveedor (desde postulante seleccionado)
 * Body: { id_postulante, precio_base, id_plan, descripcion, ...otros campos }
 */
const insertarProveedor = async(req, res) => {
    try {
        const {
            id_postulante,
            precio_base,
            id_plan,
            descripcion,
            // Campos específicos según categoría (opcionales)
            genero,
            por_hora,
            hora_inicio,
            hora_fin,
            tipo_comida,
            precio_persona,
            capacidad,
            direccion,
            seguridad,
            nivel,
            tipo
        } = req.body;

        // ===== OBTENER DATOS DEL POSTULANTE =====
        const postulante = await pool.query(
            `SELECT * FROM trabaja_nosotros_proveedor WHERE id_postu_proveedor = $1`, [id_postulante]
        );

        if (postulante.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Postulante no encontrado'
            });
        }

        const datos = postulante.rows[0];

        // Mapear categoría a id_tipo
        const tipoMap = { 'MUSICA': 1, 'CATERING': 2, 'DECORACION': 3, 'LUGAR': 4 };
        const id_tipo = tipoMap[datos.categoria_postu_proveedor];

        // ===== VALIDACIONES =====
        if (!precio_base || precio_base <= 0) {
            return res.status(400).json({ success: false, message: 'Precio base inválido' });
        }
        if (!id_plan) {
            return res.status(400).json({ success: false, message: 'Plan requerido' });
        }
        if (!descripcion || descripcion.length < 10) {
            return res.status(400).json({ success: false, message: 'Descripción mínima 10 caracteres' });
        }

        // ===== INSERTAR EN PROVEEDOR =====
        // Usar imagen default path en lugar de buffer
        const defaultImage = '/assets/default-provider.png';

        const insertQuery = `
            INSERT INTO proveedor (
                nombre,
                precio_base,
                estado,
                descripcion,
                id_plan,
                id_tipo,
                imagen_proveedor,
                imagen1_proveedor,
                imagen2_proveedor,
                imagen3_proveedor,
                estado_aprobacion,
                verificado,
                activo,
                correo_proveedor
            )
            VALUES ($1, $2, true, $3, $4, $5, $6, $7, $8, $9, 'pendiente', false, true, $10)
            RETURNING id_proveedor, nombre, precio_base, descripcion, estado_aprobacion, verificado
        `;

        const result = await pool.query(insertQuery, [
            datos.nom_empresa_postu_proveedor,
            precio_base,
            descripcion,
            id_plan,
            id_tipo,
            defaultImage,
            defaultImage,
            defaultImage,
            defaultImage,
            datos.correo_postu_proveedor
        ]);

        const nuevoProveedor = result.rows[0];
        const idProveedor = nuevoProveedor.id_proveedor;

        // ===== INSERTAR EN TABLA ESPECÍFICA POR CATEGORÍA =====
        try {
            if (datos.categoria_postu_proveedor === 'MUSICA' && (genero || por_hora || hora_inicio || hora_fin)) {
                // Solo insertar si hay datos específicos de música
                const musicaQuery = `
                    INSERT INTO proveedor_musica (id_proveedor, genero, por_hora, hora_inicio, hora_fin)
                    VALUES ($1, $2, $3, $4, $5)
                `;
                await pool.query(musicaQuery, [
                    idProveedor,
                    genero || 'Variado',
                    por_hora !== undefined ? por_hora : false,
                    hora_inicio || '08:00:00',
                    hora_fin || '20:00:00'
                ]);
            } else if (datos.categoria_postu_proveedor === 'CATERING' && (tipo_comida || precio_persona)) {
                const cateringQuery = `
                    INSERT INTO proveedor_catering (id_proveedor, tipo_comida, menu)
                    VALUES ($1, $2, $3)
                `;
                await pool.query(cateringQuery, [
                    idProveedor,
                    tipo_comida || 'Internacional',
                    'Menu disponible bajo demanda'
                ]);
            } else if (datos.categoria_postu_proveedor === 'DECORACION' && (nivel)) {
                const decoracionQuery = `
                    INSERT INTO proveedor_decoracion (id_proveedor, nivel, pdf_catalogo)
                    VALUES ($1, $2, $3)
                `;
                await pool.query(decoracionQuery, [
                    idProveedor,
                    nivel || 'Estándar',
                    'Catálogo disponible bajo demanda'
                ]);
            } else if (datos.categoria_postu_proveedor === 'LUGAR' && (capacidad || direccion)) {
                const lugarQuery = `
                    INSERT INTO proveedor_lugar (id_proveedor, capacidad, direccion, descripcion, seguridad)
                    VALUES ($1, $2, $3, $4, $5)
                `;
                await pool.query(lugarQuery, [
                    idProveedor,
                    capacidad || 100,
                    direccion || 'Disponible',
                    descripcion || 'Ubicación a confirmar',
                    seguridad !== undefined ? seguridad : true
                ]);
            }
        } catch (subError) {
            console.warn('⚠️ Advertencia: No se insertaron datos específicos de categoría', subError.message);
            // No fallar la operación principal si falla la categoría específica
        }

        console.log(`✅ Proveedor insertado: ID ${idProveedor}`);

        res.status(201).json({
            success: true,
            message: 'Proveedor registrado exitosamente. Aparecerá en postulaciones pendientes.',
            id_proveedor: idProveedor,
            data: nuevoProveedor
        });

    } catch (error) {
        console.error('❌ Error al insertar proveedor:', error);
        res.status(500).json({
            success: false,
            message: 'Error al registrar proveedor',
            error: error.message
        });
    }
};

// ==================== RUTAS ====================
const router = express.Router();

router.get('/categorias', authenticateToken, getCategorias);
router.get('/planes', authenticateToken, getPlanes);
router.get('/trabajanosotros', authenticateToken, getPostulantesProveedores);
router.post(
    '/trabaja_nosotros_proveedor',
    authenticateToken,
    upload.array('archivos', 5), // Permite hasta 5 archivos
    postProveedorPostulante
);
router.post('/convertir-postulante-a-proveedor', authenticateToken, convertirPostulanteAProveedor);
router.post('/proveedor', authenticateToken, insertarProveedor);

// Endpoint para descargar archivos
router.get('/descargar/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(uploadDir, filename);

    // Validar que el archivo existe y está en el directorio permitido
    if (!fs.existsSync(filepath) || !path.resolve(filepath).startsWith(path.resolve(uploadDir))) {
        return res.status(404).json({ success: false, message: 'Archivo no encontrado' });
    }

    res.download(filepath);
});

module.exports = router;