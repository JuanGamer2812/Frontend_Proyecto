/**
 * =================================================================
 * ENDPOINTS PARA SISTEMA DE RESERVAS - PostgreSQL
 * =================================================================
 * 
 * Este archivo contiene los 4 endpoints necesarios para el sistema
 * de reservas dinámicas del frontend Angular.
 * 
 * REQUISITOS:
 * - npm install pg express jsonwebtoken
 * - Tabla evento_proveedor creada (ejecutar crear-tabla-evento-proveedor.sql)
 * - Middleware authenticateToken implementado
 * 
 * CONFIGURACIÓN:
 * Ajusta las variables de conexión a PostgreSQL según tu entorno
 * =================================================================
 */

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// ==================== CONFIGURACIÓN PostgreSQL ====================
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'nombre_de_tu_base_de_datos', // CAMBIAR
    user: 'postgres', // CAMBIAR
    password: 'tu_password', // CAMBIAR
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Verificar conexión
pool.on('connect', () => {
    console.log('✅ Conectado a PostgreSQL');
});

pool.on('error', (err) => {
    console.error('❌ Error inesperado en PostgreSQL:', err);
});

// ==================== MIDDLEWARE (ejemplo básico) ====================
// NOTA: Reemplaza esto con tu middleware de autenticación JWT real
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Token no proporcionado' });
    }

    // Aquí deberías verificar el JWT con jsonwebtoken
    // Por ahora, ejemplo simplificado:
    try {
        // const jwt = require('jsonwebtoken');
        // const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // req.user = decoded;

        // MOCK para desarrollo (ELIMINAR en producción):
        req.user = { id: 1, email: 'test@example.com' };
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Token inválido' });
    }
}

// ==================== ENDPOINT 1: GET /api/categorias ====================
/**
 * Retorna todas las categorías (tipos) de proveedores
 * Respuesta: [{ nombre: 'MUSICA', icono: 'bi-music-note-beamed' }, ...]
 */
router.get('/categorias', authenticateToken, async(req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        nombre,
        CASE 
          WHEN nombre = 'MUSICA' THEN 'bi-music-note-beamed'
          WHEN nombre = 'CATERING' THEN 'bi-egg-fried'
          WHEN nombre = 'DECORACION' THEN 'bi-balloon-heart'
          WHEN nombre = 'LUGAR' THEN 'bi-geo-alt'
          ELSE 'bi-tag'
        END as icono
      FROM proveedor_tipo
      ORDER BY nombre
    `);

        console.log(`📋 Categorías encontradas: ${result.rows.length}`);
        res.json(result.rows);

    } catch (error) {
        console.error('❌ Error al obtener categorías:', error);
        res.status(500).json({
            message: 'Error al cargar categorías',
            error: error.message
        });
    }
});

// ==================== ENDPOINT NUEVO: POST /api/proveedor ====================
/**
 * Crea un nuevo proveedor
 * Body: { nombre, descripcion, id_tipo, precio_base, ... }
 * Respuesta: { message, proveedor }
 */
router.post('/proveedor', authenticateToken, async(req, res) => {
    try {
        const { nombre, descripcion, id_tipo, precio_base, id_plan, correo, portafolio } = req.body;

        // Validaciones básicas
        if (!nombre || !descripcion || !id_tipo || precio_base === undefined) {
            return res.status(400).json({
                message: 'Faltan campos obligatorios',
                required: ['nombre', 'descripcion', 'id_tipo', 'precio_base']
            });
        }

        // Convertir y validar precio_base
        const precioBaseNum = Number(precio_base);
        if (isNaN(precioBaseNum) || precioBaseNum <= 0) {
            return res.status(400).json({
                message: 'precio debe ser un número mayor a 0'
            });
        }

        // Insertar proveedor
        const result = await pool.query(`
                INSERT INTO proveedor (
                    nombre, descripcion, id_tipo, precio_base, id_plan, correo, portafolio, estado_aprobacion, activo
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pendiente', false)
                RETURNING id_proveedor, nombre, descripcion, id_tipo, precio_base, id_plan, correo, portafolio, estado_aprobacion, activo
            `, [
            nombre,
            descripcion,
            id_tipo,
            precioBaseNum,
            id_plan || 1,
            correo || null,
            portafolio || null
        ]);

        const proveedor = result.rows[0];
        res.status(201).json({
            message: 'Proveedor creado exitosamente',
            proveedor
        });
    } catch (error) {
        console.error('❌ Error al crear proveedor:', error);
        res.status(500).json({
            message: 'Error al crear proveedor',
            error: error.message
        });
    }
});
// ==================== ENDPOINT 2: GET /api/proveedor ====================
/**
 * Retorna proveedores filtrados por estado_aprobacion
 * Query params: ?estado=aprobado
 * Respuesta: [{ id_proveedor, nombre, categoria, descripcion, precio, ... }, ...]
 */
router.get('/proveedor', authenticateToken, async(req, res) => {
    try {
        const { estado } = req.query;

        let query = `
      SELECT 
        p.id_proveedor,
        p.nombre,
        pt.nombre as categoria,
        p.descripcion,
        p.precio_base as precio,
        p.estado_aprobacion,
        p.activo
      FROM proveedor p
      JOIN proveedor_tipo pt ON p.id_tipo = pt.id_tipo
    `;

        const params = [];

        if (estado) {
            query += ' WHERE p.estado_aprobacion = $1 AND p.activo = true';
            params.push(estado);
        } else {
            query += ' WHERE p.activo = true';
        }

        query += ' ORDER BY p.nombre';

        const result = await pool.query(query, params);

        console.log(`🔍 Proveedores encontrados (estado: ${estado || 'todos'}): ${result.rows.length}`);
        res.json(result.rows);

    } catch (error) {
        console.error('❌ Error al obtener proveedores:', error);
        res.status(500).json({
            message: 'Error al cargar proveedores',
            error: error.message
        });
    }
});

// ==================== ENDPOINT 3: GET /api/proveedor/categoria/:categoria ====================
/**
 * Retorna proveedores aprobados de una categoría específica
 * Params: categoria (MUSICA, CATERING, DECORACION, LUGAR)
 * Respuesta: [{ id_proveedor, nombre, categoria, descripcion, precio, ... }, ...]
 */
router.get('/proveedor/categoria/:categoria', authenticateToken, async(req, res) => {
    try {
        const { categoria } = req.params;

        // Validar que la categoría sea válida
        const categoriasValidas = ['MUSICA', 'CATERING', 'DECORACION', 'LUGAR'];
        if (!categoriasValidas.includes(categoria.toUpperCase())) {
            return res.status(400).json({
                message: 'Categoría inválida',
                categoriasValidas
            });
        }

        const result = await pool.query(`
      SELECT 
        p.id_proveedor,
        p.nombre,
        pt.nombre as categoria,
        p.descripcion,
        p.precio_base as precio,
        p.estado_aprobacion,
        p.activo
      FROM proveedor p
      JOIN proveedor_tipo pt ON p.id_tipo = pt.id_tipo
      WHERE pt.nombre = $1 
        AND p.estado_aprobacion = 'aprobado'
        AND p.activo = true
            ORDER BY p.nombre
    `, [categoria.toUpperCase()]);

        console.log(`🔎 Proveedores de ${categoria}: ${result.rows.length}`);
        res.json(result.rows);

    } catch (error) {
        console.error('❌ Error al obtener proveedores por categoría:', error);
        res.status(500).json({
            message: 'Error al cargar proveedores',
            error: error.message
        });
    }
});

// ==================== ENDPOINT 4: POST /api/reservas ====================
/**
 * Crea una nueva reserva (evento + reservacion + proveedores asignados)
 * Body: { nombreEvento, tipoEvento, descripcion, fechaInicio, fechaFin, 
 *         precioBase, hayPlaylist, playlist, proveedores: [...] }
 * Respuesta: { message, id_reservacion, id_evento, total, evento: {...} }
 */
router.post('/reservas', authenticateToken, async(req, res) => {
    try {
        console.log('Received POST /reservas body:', JSON.stringify(req.body));
    } catch (e) {
        console.log('Received POST /reservas body: <unserializable payload>');
    }
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const {
            nombreEvento,
            tipoEvento,
            descripcion,
            fechaInicio,
            fechaFin,
            precioBase,
            hayPlaylist,
            playlist,
            proveedores,
            id_categoria,
            cedula_reservacion,
            numero_invitados,
            invitados,
            metodo_pago_factura,
            pago // opcional: información del pago (numero_autorizacion, estado, etc.)
        } = req.body;

        // Validaciones básicas
        if (!nombreEvento || !descripcion || !fechaInicio || !fechaFin) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                message: 'Faltan campos obligatorios',
                required: ['nombreEvento', 'descripcion', 'fechaInicio', 'fechaFin']
            });
        }

        if (!Array.isArray(proveedores) || proveedores.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                message: 'Debes seleccionar al menos un proveedor'
            });
        }

        const userId = req.user.id;
        const idPlan = 1; // Plan por defecto - puedes parametrizarlo

        // Determinar plan del evento según la mezcla de planes de proveedores
        const planesSet = new Set(
            (proveedores || [])
            .map((p) => Number(p.id_plan ? ? p.plan ? ? p.idPlan ? ? p.id_plan_reserva ? ? p.idPlanSeleccionado ? ? idPlan))
            .filter((n) => Number.isFinite(n))
        );
        const planEvento = planesSet.size === 0 ?
            (Number.isFinite(Number(req.body.id_plan)) ? Number(req.body.id_plan) : idPlan) :
            (planesSet.size === 1 ? [...planesSet][0] : 4);
        console.log('🎛️ Plan detectado para evento:', {
            planesProveedores: Array.from(planesSet),
            planEvento
        });

        // Determinar número de invitados (usar campo enviado o derivar de la lista de invitados)
        const totalGuests = (() => {
            if (typeof numero_invitados === 'number' && numero_invitados > 0) return numero_invitados;
            if (Array.isArray(invitados) && invitados.length > 0) {
                return invitados.reduce((acc, iv) => {
                    const acomp = Number(iv.acompanantes != null ? iv.acompanantes : (iv.numero_acompanantes != null ? iv.numero_acompanantes : 0)) || 0;
                    return acc + 1 + acomp;
                }, 0);
            }
            return 0;
        })();

        // Calcular total sumando precio por proveedor (si CATERING, multiplicar por invitados)
        // Si el frontend ya envió `subtotal` y `total` numéricos, respetarlos (evita doble conteo).
        let subtotal;
        let impuestos;
        let total;
        const frontendSentSubtotal = (typeof req.body.subtotal === 'number' && !isNaN(req.body.subtotal));
        const frontendSentTotal = (typeof req.body.total === 'number' && !isNaN(req.body.total));
        if (frontendSentSubtotal && frontendSentTotal) {
            subtotal = Number(req.body.subtotal) || 0;
            impuestos = (typeof req.body.iva === 'number' && !isNaN(req.body.iva)) ? Number(req.body.iva) : Number((subtotal * 0.15).toFixed(2));
            total = Number(req.body.total) || Number((subtotal + impuestos).toFixed(2));
            // Use provider-calculated prices sent by the frontend whenever available.
            // Do NOT recompute from DB to avoid mismatches with the client calculation.
            for (const prov of proveedores) {
                const provided = prov.precio_calculado;
                prov._precio_calculado = (typeof provided === 'number' && !isNaN(provided)) ? Number(provided) : Number(0);
            }
            console.log('📥 Usando subtotal/iva/total enviados por frontend. Valores aplicados a proveedores desde payload cuando están disponibles.');
        } else {
            let baseStart = parseFloat(precioBase) || 0;
            subtotal = baseStart;
            for (const prov of proveedores) {
                const provResult = await client.query(
                    'SELECT precio_base FROM proveedor WHERE id_proveedor = $1', [prov.id_proveedor]
                );

                if (provResult.rows.length === 0) {
                    await client.query('ROLLBACK');
                    return res.status(404).json({ message: `Proveedor ${prov.id_proveedor} no encontrado` });
                }

                const precioBaseProv = parseFloat(provResult.rows[0].precio_base || 0) || 0;
                const categoriaNorm = String((prov.categoria || '')).toUpperCase();
                let precioAplicado = precioBaseProv;
                if (categoriaNorm === 'CATERING') {
                    // Si es catering, precio es precio_base por invitado
                    precioAplicado = precioBaseProv * Math.max(0, totalGuests);
                }
                subtotal += precioAplicado;
                // almacenar precio acordado en el objeto para usar al insertar
                prov._precio_calculado = Number(Number.isFinite(precioAplicado) ? precioAplicado : 0);
            }

            impuestos = Number((subtotal * 0.15).toFixed(2));
            total = Number((subtotal + impuestos).toFixed(2));

            console.log(`💰 Subtotal: $${subtotal.toFixed(2)} - IVA: $${impuestos.toFixed(2)} - Total: $${total.toFixed(2)} (invitados: ${totalGuests})`);
        }

        // 1. Insertar evento
        const eventoResult = await client.query(`
            INSERT INTO evento (
                nombre_evento, descripcion_evento, fecha_inicio_evento, fecha_fin_evento,
                precio_evento, tipo_evento, hay_playlist_evento, playlist_evento,
                creado_por, id_usuario_creador, id_plan, id_categoria
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id_evento, nombre_evento, fecha_inicio_evento, fecha_fin_evento
        `, [
            nombreEvento,
            descripcion,
            fechaInicio,
            fechaFin,
            total,
            tipoEvento || 'General',
            hayPlaylist || false,
            playlist || null,
            'Usuario',
            userId,
            planEvento,
            id_categoria || null
        ]);

        const evento = eventoResult.rows[0];
        const idEvento = evento.id_evento;

        console.log(`📅 Evento creado: ID ${idEvento} - "${evento.nombre_evento}"`);

        // 2. Insertar reservacion
        const reservaResult = await client.query(`
            INSERT INTO reservacion (
                fecha_reservacion, total_precio_reservacion, cedula_reservacion,
                id_usuario, id_evento, numero_invitados, subtotal_reservacion, impuestos_reservacion
            ) VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7)
            RETURNING id_reservacion
        `, [
            total,
            cedula_reservacion || '0000000000',
            userId,
            idEvento,
            totalGuests,
            subtotal,
            impuestos
        ]);

        const idReservacion = reservaResult.rows[0].id_reservacion;

        console.log(`📝 Reservación creada: ID ${idReservacion}`);

        // 3. Insertar proveedores del evento en evento_proveedor
        for (const prov of proveedores) {
            // Preferir precio calculado enviado por el frontend si existe
            const precioAplicado = Number((prov.precio_calculado != null ? prov.precio_calculado : prov._precio_calculado) || 0);
            await client.query(`
        INSERT INTO evento_proveedor (
          id_evento, id_proveedor, categoria, plan,
          hora_inicio, hora_fin, notas_adicionales, precio
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
                idEvento,
                prov.id_proveedor,
                prov.categoria,
                prov.plan || 'Estándar',
                prov.horaInicio || null,
                prov.horaFin || null,
                prov.notasAdicionales || null,
                precioAplicado
            ]);

            console.log(`  ✓ Proveedor ${prov.id_proveedor} asignado (${prov.categoria}) - precio: ${precioAplicado}`);
        }

        // 4. Insertar invitados (si vienen en el payload)
        console.log(`📋 Verificando invitados recibidos:`, {
            esArray: Array.isArray(invitados),
            cantidad: invitados ? .length || 0,
            primerInvitado: invitados && invitados[0] ? invitados[0] : null
        });

        if (Array.isArray(invitados) && invitados.length > 0) {
            let insertadosCount = 0;
            for (const inv of invitados) {
                try {
                    // Mapear campos del frontend (puede venir con nombres alternos)
                    const nombre = String(inv.nombre || inv.nombre_invitado || '').trim();
                    const email = String(inv.email || inv.email_invitado || '').trim() || null;
                    const telefono = String(inv.telefono || inv.telefono_invitado || '').trim() || null;
                    const acompanantes = Number(inv.acompanantes ? ? inv.numero_acompanantes ? ? 0) || 0;
                    // Campo notas: usar directamente como string
                    const notasInv = String(inv.notas || '').trim() || null;

                    if (!nombre) {
                        console.warn(`⚠️ Invitado sin nombre válido, saltando:`, inv);
                        continue;
                    }

                    console.log(`  💾 Insertando invitado:`, { nombre, email, telefono, acompanantes, notas: notasInv });

                    await client.query(`
                                    INSERT INTO invitado (id_evento, nombre, email, telefono, acompanantes, notas)
                                    VALUES ($1, $2, $3, $4, $5, $6)
                                `, [idEvento, nombre, email, telefono, acompanantes, notasInv]);

                    insertadosCount++;
                    console.log(`  ✅ Invitado "${nombre}" insertado correctamente (${acompanantes} acompañantes)`);
                } catch (invError) {
                    console.error(`❌ ERROR insertando invitado:`, {
                        invitado: inv,
                        error: invError.message,
                        stack: invError.stack
                    });
                    throw invError; // Re-lanzar para hacer rollback
                }
            }
            console.log(`👥 Total: ${insertadosCount} de ${invitados.length} invitados insertados correctamente para evento ${idEvento}`);
        } else {
            console.log(`ℹ️ No hay invitados para insertar (array vacío o undefined)`);
        }

        // 5. Crear factura automática vinculada a la reservación (si existe la tabla facturas)
        try {
            const numeroFactura = `AUTO-${idReservacion}-${Date.now()}`;
            // Normalizar datos de pago recibidos
            const pagoObj = req.body.pago || {};
            const metodoFromBody = req.body.metodo_pago_factura || pagoObj.metodo || pagoObj.metodoPago || null;

            // Determinar si el pago fue completado correctamente y si tiene los datos obligatorios
            let estadoPago = 'pendiente';
            let fechaPagoNow = false;

            const metodoNorm = String((metodoFromBody || '')).toLowerCase();
            const pagoSuccessFlag = (pagoObj && (pagoObj.success === true || String(pagoObj.estado || '').toLowerCase() === 'pagada' || String(pagoObj.estado || '').toLowerCase() === 'pagado'));

            // Verificar que se hayan enviado los datos necesarios según método
            let datosSuficientes = false;
            if (pagoSuccessFlag) {
                if (metodoNorm === 'deposito' || metodoNorm === 'transferencia' || metodoNorm === 'efectivo') {
                    // Para depósito/transferencia requerimos comprobante (archivo o número de comprobante)
                    if ((pagoObj.datos && (pagoObj.datos.archivoComprobante || pagoObj.datos.numeroComprobante)) || req.body.numero_comprobante) datosSuficientes = true;
                } else if (metodoNorm === 'tarjeta' || metodoNorm === 'credito' || metodoNorm === 'paypal') {
                    // Para tarjeta/Paypal aceptamos un transactionId
                    if (pagoObj.transactionId || (pagoObj.datos && (pagoObj.datos.numeroTarjeta || pagoObj.datos.transactionId))) datosSuficientes = true;
                } else {
                    // Si no conocemos el método, confiar en success flag
                    datosSuficientes = true;
                }
            }

            if (pagoSuccessFlag && datosSuficientes) {
                estadoPago = 'pagada';
                fechaPagoNow = true;
            } else if (pagoObj && pagoObj.estado) {
                estadoPago = pagoObj.estado;
            } else if (req.body.metodo_pago_factura && !pagoSuccessFlag) {
                estadoPago = 'pendiente';
            }

            // Normalizar método para guardar en la factura
            let metodoParaInsert = null;
            if (metodoFromBody) {
                const mclean = String(metodoFromBody).toLowerCase();
                if (mclean.includes('deposit') || mclean.includes('efect')) metodoParaInsert = 'Depósito';
                else if (mclean.includes('transfer')) metodoParaInsert = 'Transferencia';
                else if (mclean.includes('visa') || mclean.includes('tarjeta') || mclean.includes('credito') || mclean.includes('crédito')) metodoParaInsert = 'Tarjeta';
                else if (mclean.includes('paypal')) metodoParaInsert = 'PayPal';
                else metodoParaInsert = String(metodoFromBody);
            }

            // Preparar timestamps en zona UTC-5 (ej. America/Guayaquil).
            const toOffsetISOString = (offsetHours) => {
                const now = new Date();
                // UTC ms
                const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
                // target ms
                const targetMs = utcMs + (offsetHours * 60 * 60 * 1000);
                const d = new Date(targetMs);
                const pad = (n) => String(n).padStart(2, '0');
                const yyyy = d.getFullYear();
                const MM = pad(d.getMonth() + 1);
                const dd = pad(d.getDate());
                const hh = pad(d.getHours());
                const mm = pad(d.getMinutes());
                const ss = pad(d.getSeconds());
                // include offset in RFC3339 format
                const sign = offsetHours >= 0 ? '+' : '-';
                const off = Math.abs(offsetHours);
                const offHH = String(Math.floor(off)).padStart(2, '0');
                const offMM = String(Math.floor((off - Math.floor(off)) * 60)).padStart(2, '0');
                return `${yyyy}-${MM}-${dd}T${hh}:${mm}:${ss}${sign}${offHH}:${offMM}`;
            };

            // Decide pago confirmado si success OR se envió numero_comprobante o transactionId
            const numeroComprobanteBody = req.body.numero_comprobante || (pagoObj && pagoObj.datos && (pagoObj.datos.numeroComprobante || pagoObj.datos.numero_comprobante));
            const transactionIdBody = pagoObj && (pagoObj.transactionId || pagoObj.transaction_id || pagoObj.datos && (pagoObj.datos.transactionId || pagoObj.datos.transaction_id));
            const pagoConfirmadoRelaxed = pagoSuccessFlag || !!numeroComprobanteBody || !!transactionIdBody;

            if (pagoConfirmadoRelaxed) {
                estadoPago = 'pagada';
                fechaPagoNow = true;
            }

            // Prepare strings in UTC-5
            const fechaEmisionStr = toOffsetISOString(-5);
            const fechaPagoStr = fechaPagoNow ? toOffsetISOString(-5) : null;

            const facturaInsertParams = fechaPagoNow ? [numeroFactura, metodoParaInsert || 'pendiente', subtotal, impuestos, total, idReservacion, estadoPago, fechaEmisionStr, fechaPagoStr] : [numeroFactura, metodoParaInsert || 'pendiente', subtotal, impuestos, total, idReservacion, estadoPago, fechaEmisionStr];

            console.log('🧾 Preparando inserción factura ->', {
                numeroFactura,
                subtotal,
                impuestos,
                total,
                idReservacion,
                fecha_emision_factura: fechaEmisionStr,
                fecha_pago: fechaPagoStr,
                estado_pago: estadoPago,
                metodo_pago_factura: metodoParaInsert
            });

            if (fechaPagoNow) {
                await client.query(`
                                        INSERT INTO factura (
                                            numero_autorizacion_factura, metodo_pago_factura, subtotal_factura, impuestos_factura, total_factura,
                                            id_reservacion, estado_pago, fecha_emision_factura, fecha_pago
                                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                                        ON CONFLICT (id_reservacion) DO UPDATE SET
                                            numero_autorizacion_factura = EXCLUDED.numero_autorizacion_factura,
                                            metodo_pago_factura = EXCLUDED.metodo_pago_factura,
                                            subtotal_factura = EXCLUDED.subtotal_factura,
                                            impuestos_factura = EXCLUDED.impuestos_factura,
                                            total_factura = EXCLUDED.total_factura,
                                            estado_pago = EXCLUDED.estado_pago,
                                            fecha_emision_factura = EXCLUDED.fecha_emision_factura,
                                            fecha_pago = EXCLUDED.fecha_pago
                                `, facturaInsertParams);
            } else {
                await client.query(`
                                        INSERT INTO factura (
                                            numero_autorizacion_factura, metodo_pago_factura, subtotal_factura, impuestos_factura, total_factura,
                                            id_reservacion, estado_pago, fecha_emision_factura
                                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                                        ON CONFLICT (id_reservacion) DO UPDATE SET
                                            numero_autorizacion_factura = EXCLUDED.numero_autorizacion_factura,
                                            metodo_pago_factura = EXCLUDED.metodo_pago_factura,
                                            subtotal_factura = EXCLUDED.subtotal_factura,
                                            impuestos_factura = EXCLUDED.impuestos_factura,
                                            total_factura = EXCLUDED.total_factura,
                                            estado_pago = EXCLUDED.estado_pago,
                                            fecha_emision_factura = EXCLUDED.fecha_emision_factura
                                `, facturaInsertParams);
            }

            console.log('🧾 Factura creada automáticamente (estado:', estadoPago, ', metodo:', metodoParaInsert, ')');
        } catch (eFact) {
            // Si la tabla factura no existe o falla la inserción, no rompemos la transacción principal, pero dejamos registro
            console.warn('⚠️ No se pudo crear factura automáticamente:', eFact.message || eFact);
        }

        await client.query('COMMIT');

        console.log(`✅ Reserva completada exitosamente: Evento #${idEvento}, Reserva #${idReservacion}`);

        res.status(201).json({
            message: 'Reserva creada exitosamente',
            id_reservacion: idReservacion,
            id_evento: idEvento,
            total: parseFloat(total.toFixed(2)),
            evento: {
                id_evento: evento.id_evento,
                nombre_evento: evento.nombre_evento,
                fecha_inicio_evento: evento.fecha_inicio_evento,
                fecha_fin_evento: evento.fecha_fin_evento
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error al crear reserva:', error);
        res.status(500).json({
            message: 'Error al crear la reserva',
            error: error.message,
            details: error.detail || null
        });
    } finally {
        client.release();
    }
});

// ==================== ENDPOINT 5: GET /api/proveedor?estado=pendiente ====================
/**
 * Retorna proveedores pendientes de aprobación
 * Query params: ?estado=pendiente
 * Respuesta: [{ id_proveedor, nombre, categoria, descripcion, precio_base, ... }, ...]
 */
router.get('/proveedor', authenticateToken, async(req, res) => {
    try {
        const { estado } = req.query;

        let query = `
      SELECT 
        p.id_proveedor,
        p.nombre,
        pt.nombre as categoria,
        p.descripcion,
        p.precio_base,
        p.estado_aprobacion,
        p.activo
      FROM proveedor p
      JOIN proveedor_tipo pt ON p.id_tipo = pt.id_tipo
    `;

        const params = [];

        if (estado === 'pendiente') {
            query += ' WHERE p.estado_aprobacion = $1';
            params.push(estado);
        } else if (estado === 'aprobado') {
            query += ' WHERE p.estado_aprobacion = $1 AND p.activo = true';
            params.push(estado);
        } else {
            query += ' WHERE p.activo = true';
        }

        query += ' ORDER BY p.nombre';

        const result = await pool.query(query, params);

        console.log(`🔍 Proveedores encontrados (estado: ${estado || 'todos'}): ${result.rows.length}`);
        res.json(result.rows);

    } catch (error) {
        console.error('❌ Error al obtener proveedores:', error);
        res.status(500).json({
            message: 'Error al cargar proveedores',
            error: error.message
        });
    }
});

// ==================== ENDPOINT 6: PUT /api/proveedor/:id/aprobar ====================
/**
 * Aprueba un proveedor (cambia estado_aprobacion a 'aprobado' y activo a true)
 * Params: id (id_proveedor)
 * Respuesta: { message, proveedor }
 */
router.put('/proveedor/:id/aprobar', authenticateToken, async(req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
      UPDATE proveedor
      SET estado_aprobacion = 'aprobado', activo = true
      WHERE id_proveedor = $1
      RETURNING id_proveedor, nombre, estado_aprobacion, activo
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'Proveedor no encontrado'
            });
        }

        const proveedor = result.rows[0];
        console.log(`✅ Proveedor ${proveedor.id_proveedor} ("${proveedor.nombre}") aprobado`);

        res.json({
            message: 'Proveedor aprobado exitosamente',
            proveedor
        });

    } catch (error) {
        console.error('❌ Error al aprobar proveedor:', error);
        res.status(500).json({
            message: 'Error al aprobar proveedor',
            error: error.message
        });
    }
});

// ==================== ENDPOINT 7: PUT /api/proveedor/:id/rechazar ====================
/**
 * Rechaza un proveedor (cambia estado_aprobacion a 'rechazado' y activo a false)
 * Params: id (id_proveedor)
 * Respuesta: { message, proveedor }
 */
router.put('/proveedor/:id/rechazar', authenticateToken, async(req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
      UPDATE proveedor
      SET estado_aprobacion = 'rechazado', activo = false
      WHERE id_proveedor = $1
      RETURNING id_proveedor, nombre, estado_aprobacion, activo
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'Proveedor no encontrado'
            });
        }

        const proveedor = result.rows[0];
        console.log(`❌ Proveedor ${proveedor.id_proveedor} ("${proveedor.nombre}") rechazado`);

        res.json({
            message: 'Proveedor rechazado',
            proveedor
        });

    } catch (error) {
        console.error('❌ Error al rechazar proveedor:', error);
        res.status(500).json({
            message: 'Error al rechazar proveedor',
            error: error.message
        });
    }
});



// ==================== EXPORTAR ROUTER ====================
module.exports = router;

/**
 * =================================================================
 * USO EN TU APLICACIÓN EXPRESS
 * =================================================================
 * 
 * En tu archivo principal (app.js o server.js):
 * 
 * const reservasRouter = require('./routes/reservas'); // ajustar ruta
 * app.use('/api', reservasRouter);
 * 
 * =================================================================
 */