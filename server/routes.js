const express = require('express');
const router  = express.Router();
const db      = require('./db');
const state   = require('./state');

// ---------- MOVIMIENTOS ----------

// GET /api/movimientos  → todos
router.get('/movimientos', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM movimientos ORDER BY id');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/movimientos/:id → uno
router.get('/movimientos/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM movimientos WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'No existe' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/movimientos  → crear (Punto 1 del examen)
router.post('/movimientos', async (req, res) => {
  try {
    const { id, nombre, a_input_1a, a_input_1b, a_tiempo, b_input_1a, b_input_1b, b_tiempo } = req.body;
    await db.query(
      `INSERT INTO movimientos
       (id, nombre, a_input_1a, a_input_1b, a_tiempo, b_input_1a, b_input_1b, b_tiempo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, nombre, a_input_1a, a_input_1b, a_tiempo, b_input_1a, b_input_1b, b_tiempo]
    );
    res.status(201).json({ ok: true, mensaje: 'Movimiento agregado', id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/movimientos/:id → actualizar
router.put('/movimientos/:id', async (req, res) => {
  try {
    const { nombre, a_input_1a, a_input_1b, a_tiempo, b_input_1a, b_input_1b, b_tiempo } = req.body;
    await db.query(
      `UPDATE movimientos SET nombre=?, a_input_1a=?, a_input_1b=?, a_tiempo=?,
       b_input_1a=?, b_input_1b=?, b_tiempo=? WHERE id=?`,
      [nombre, a_input_1a, a_input_1b, a_tiempo, b_input_1a, b_input_1b, b_tiempo, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/movimientos/:id
router.delete('/movimientos/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM movimientos WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- EJECUTAR MOVIMIENTO POR API (Thunder Client → carrito) ----------
// POST /api/ejecutar/:id
router.post('/ejecutar/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows] = await db.query(
      `SELECT id, nombre,
              a_input_1a, a_input_1b, a_tiempo,
              b_input_1a, b_input_1b, b_tiempo
         FROM movimientos WHERE id = ?`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Movimiento inexistente' });

    const m = rows[0];
    const detalle = {
      id: m.id,
      nombre: m.nombre,
      motor_A: { input_1A: m.a_input_1a, input_1B: m.a_input_1b, time: m.a_tiempo },
      motor_B: { input_1A: m.b_input_1a, input_1B: m.b_input_1b, time: m.b_tiempo },
      fecha:  new Date().toISOString()
    };

    // Guardar como último movimiento (Punto 2 del examen)
    state.ultimoMovimiento = detalle;

    // Reenviar al ESP por WebSocket
    let entregado = false;
    if (state.esp && state.esp.readyState === 1 /* OPEN */) {
      state.esp.send(JSON.stringify({ comando: id }));
      entregado = true;
    }

    // Historial persistente (últimos N movimientos)
    const origen = (req.body && req.body.origen) ? req.body.origen : 'manual';
    db.query(
      'INSERT INTO movimientos_log (movimiento_id, nombre, origen, entregado_esp) VALUES (?, ?, ?, ?)',
      [m.id, m.nombre, origen, entregado ? 1 : 0]
    ).catch(err => console.error('[log mov]', err.message));

    // Notificar a todos los clientes web (verificación por WebSocket)
    const payload = JSON.stringify({ evento: 'movimiento', ...detalle });
    state.webClients.forEach(c => { if (c.readyState === 1) c.send(payload); });

    res.json({
      ok: true,
      entregado_al_esp: entregado,
      ...detalle
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- ÚLTIMO MOVIMIENTO (Punto 2 del examen) ----------
// GET /api/ultimo-movimiento
router.get('/ultimo-movimiento', (req, res) => {
  if (!state.ultimoMovimiento) {
    return res.json({ ok: true, mensaje: 'Aún no se ha ejecutado ningún movimiento' });
  }
  res.json({ ok: true, ...state.ultimoMovimiento });
});

// ---------- PARAMETROS (Punto 3 del examen) ----------

// GET /api/parametros
router.get('/parametros', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM parametros');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/parametros/:factor → modificar valor de un parámetro
//   ej: PUT /api/parametros/Velocidad     body: { "valor": 200 }
router.put('/parametros/:factor', async (req, res) => {
  try {
    const { valor } = req.body;
    if (valor === undefined) return res.status(400).json({ error: 'Falta valor' });
    const [r] = await db.query(
      'UPDATE parametros SET valor = ? WHERE factor = ?',
      [valor, req.params.factor]
    );
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Parámetro no encontrado' });
    res.json({ ok: true, factor: req.params.factor, valor });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/parametros → crear nuevo parámetro
router.post('/parametros', async (req, res) => {
  try {
    const { factor, valor } = req.body;
    await db.query('INSERT INTO parametros (factor, valor) VALUES (?, ?)', [factor, valor]);
    res.status(201).json({ ok: true, factor, valor });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/parametros/:factor
router.delete('/parametros/:factor', async (req, res) => {
  try {
    await db.query('DELETE FROM parametros WHERE factor = ?', [req.params.factor]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ====================================================================
// DISPOSITIVOS IoT  (CRUD + control + monitoreo)
// ====================================================================

// Utilidad: registrar un evento de estatus
async function registrarEstatus(dispositivoId, estado) {
  await db.query(
    'INSERT INTO estatus_log (dispositivo_id, estado) VALUES (?, ?)',
    [dispositivoId, estado]
  );
  // Notificar a clientes web por WebSocket
  const payload = JSON.stringify({
    evento: 'estatus',
    dispositivo_id: dispositivoId,
    estado,
    fecha: new Date().toISOString()
  });
  state.webClients.forEach(c => { if (c.readyState === 1) c.send(payload); });
}

// GET /api/dispositivos → todos
router.get('/dispositivos', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM dispositivos ORDER BY id');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/dispositivos/:id → uno
router.get('/dispositivos/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM dispositivos WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'No existe' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/dispositivos → crear
router.post('/dispositivos', async (req, res) => {
  try {
    const { nombre, tipo, pin, descripcion, estado = 0 } = req.body;
    if (!nombre || !tipo) return res.status(400).json({ error: 'nombre y tipo son requeridos' });
    const [r] = await db.query(
      'INSERT INTO dispositivos (nombre, tipo, pin, descripcion, estado) VALUES (?, ?, ?, ?, ?)',
      [nombre, tipo, pin || null, descripcion || null, estado ? 1 : 0]
    );
    await registrarEstatus(r.insertId, estado ? 1 : 0);
    res.status(201).json({ ok: true, id: r.insertId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/dispositivos/:id → actualizar metadatos
router.put('/dispositivos/:id', async (req, res) => {
  try {
    const { nombre, tipo, pin, descripcion } = req.body;
    const [r] = await db.query(
      'UPDATE dispositivos SET nombre=?, tipo=?, pin=?, descripcion=? WHERE id=?',
      [nombre, tipo, pin || null, descripcion || null, req.params.id]
    );
    if (r.affectedRows === 0) return res.status(404).json({ error: 'No existe' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/dispositivos/:id
router.delete('/dispositivos/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM dispositivos WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/dispositivos/:id/estado  body: { "estado": 0|1 }
router.put('/dispositivos/:id/estado', async (req, res) => {
  try {
    const estado = req.body.estado ? 1 : 0;
    const id = parseInt(req.params.id, 10);
    const [r] = await db.query('UPDATE dispositivos SET estado=? WHERE id=?', [estado, id]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'No existe' });
    await registrarEstatus(id, estado);

    // Si hay ESP conectado, también le mandamos el comando de IO
    if (state.esp && state.esp.readyState === 1) {
      state.esp.send(JSON.stringify({ tipo: 'io', dispositivo: id, estado }));
    }
    res.json({ ok: true, id, estado });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/dispositivos/:id/historial?limit=10
router.get('/dispositivos/:id/historial', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '10', 10), 100);
    const [rows] = await db.query(
      'SELECT id, estado, fecha FROM estatus_log WHERE dispositivo_id = ? ORDER BY fecha DESC LIMIT ?',
      [req.params.id, limit]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/monitoreo → estado actual + últimos 10 por dispositivo (todo en un solo call)
router.get('/monitoreo', async (req, res) => {
  try {
    const [dispositivos] = await db.query('SELECT * FROM dispositivos ORDER BY id');
    const data = [];
    for (const d of dispositivos) {
      const [hist] = await db.query(
        'SELECT id, estado, fecha FROM estatus_log WHERE dispositivo_id=? ORDER BY fecha DESC LIMIT 10',
        [d.id]
      );
      data.push({ ...d, historial: hist });
    }
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ====================================================================
// DEMOS  (rutinas de movimientos encadenados)
// ====================================================================

function enviarMovimientoAlEsp(idMov) {
  if (state.esp && state.esp.readyState === 1) {
    state.esp.send(JSON.stringify({ comando: idMov }));
    return true;
  }
  return false;
}

function broadcastEvento(evento, extra) {
  const payload = JSON.stringify({ evento, ...extra });
  state.webClients.forEach(c => { if (c.readyState === 1) c.send(payload); });
}

// Listar demos (con su número de pasos)
router.get('/demos', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT d.*, COUNT(p.id) AS pasos
        FROM demos d
        LEFT JOIN demo_pasos p ON p.demo_id = d.id
       GROUP BY d.id ORDER BY d.id`);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Obtener una demo con todos sus pasos
router.get('/demos/:id', async (req, res) => {
  try {
    const [d] = await db.query('SELECT * FROM demos WHERE id=?', [req.params.id]);
    if (!d.length) return res.status(404).json({ error: 'Demo no existe' });
    const [pasos] = await db.query(`
      SELECT p.id, p.orden, p.movimiento_id, p.duracion_ms, m.nombre AS movimiento
        FROM demo_pasos p JOIN movimientos m ON m.id = p.movimiento_id
       WHERE p.demo_id = ? ORDER BY p.orden`, [req.params.id]);
    res.json({ ...d[0], pasos });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Crear demo  body: { nombre, descripcion, pasos:[{movimiento_id, duracion_ms}, ...] }
router.post('/demos', async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { nombre, descripcion, pasos = [] } = req.body;
    if (!nombre) return res.status(400).json({ error: 'nombre requerido' });
    await conn.beginTransaction();
    const [r] = await conn.query('INSERT INTO demos (nombre, descripcion) VALUES (?, ?)',
      [nombre, descripcion || null]);
    const demoId = r.insertId;
    let orden = 1;
    for (const p of pasos) {
      await conn.query(
        'INSERT INTO demo_pasos (demo_id, orden, movimiento_id, duracion_ms) VALUES (?, ?, ?, ?)',
        [demoId, orden++, p.movimiento_id, p.duracion_ms || 1000]
      );
    }
    await conn.commit();
    res.status(201).json({ ok: true, id: demoId });
  } catch (e) { await conn.rollback(); res.status(500).json({ error: e.message }); }
  finally { conn.release(); }
});

// Actualizar demo (reemplaza pasos)
router.put('/demos/:id', async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { nombre, descripcion, pasos = [] } = req.body;
    await conn.beginTransaction();
    await conn.query('UPDATE demos SET nombre=?, descripcion=? WHERE id=?',
      [nombre, descripcion || null, req.params.id]);
    await conn.query('DELETE FROM demo_pasos WHERE demo_id=?', [req.params.id]);
    let orden = 1;
    for (const p of pasos) {
      await conn.query(
        'INSERT INTO demo_pasos (demo_id, orden, movimiento_id, duracion_ms) VALUES (?, ?, ?, ?)',
        [req.params.id, orden++, p.movimiento_id, p.duracion_ms || 1000]
      );
    }
    await conn.commit();
    res.json({ ok: true });
  } catch (e) { await conn.rollback(); res.status(500).json({ error: e.message }); }
  finally { conn.release(); }
});

// Eliminar demo
router.delete('/demos/:id', async (req, res) => {
  try { await db.query('DELETE FROM demos WHERE id=?', [req.params.id]); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Ejecutar demo (paso a paso, asíncrono — se aborta ante obstáculo)
router.post('/demos/:id/ejecutar', async (req, res) => {
  try {
    if (state.demoActiva) return res.status(409).json({ error: 'Ya hay una demo en ejecución' });

    const [demoRow] = await db.query('SELECT id, nombre FROM demos WHERE id=?', [req.params.id]);
    if (!demoRow.length) return res.status(404).json({ error: 'Demo inexistente' });

    const [pasos] = await db.query(`
      SELECT p.movimiento_id, p.duracion_ms, m.nombre
        FROM demo_pasos p JOIN movimientos m ON m.id = p.movimiento_id
       WHERE p.demo_id=? ORDER BY p.orden`, [req.params.id]);
    if (!pasos.length) return res.status(404).json({ error: 'Demo vacía' });

    // Registrar en historial (estado=iniciada)
    const [logIns] = await db.query(
      'INSERT INTO demos_log (demo_id, nombre, pasos, estado) VALUES (?, ?, ?, "iniciada")',
      [demoRow[0].id, demoRow[0].nombre, pasos.length]
    );
    const logId = logIns.insertId;

    let cancelado = false;
    state.demoActiva = {
      demoId: +req.params.id,
      logId,
      abort: (motivo = 'manual') => { cancelado = motivo; }
    };

    // Notificar inicio
    broadcastEvento('demo', { estado: 'iniciada', demoId: +req.params.id, total: pasos.length });
    res.json({ ok: true, mensaje: 'Demo iniciada', total: pasos.length });

    // Ejecución asíncrona en segundo plano
    (async () => {
      for (let i = 0; i < pasos.length; i++) {
        if (cancelado) break;
        const p = pasos[i];
        const entregado = enviarMovimientoAlEsp(p.movimiento_id);
        // También al log de movimientos individuales
        db.query(
          'INSERT INTO movimientos_log (movimiento_id, nombre, origen, entregado_esp) VALUES (?, ?, "demo", ?)',
          [p.movimiento_id, p.nombre, entregado ? 1 : 0]
        ).catch(err => console.error('[log mov-demo]', err.message));
        broadcastEvento('demo', {
          estado: 'paso', demoId: +req.params.id, paso: i + 1, total: pasos.length,
          movimiento: p.nombre, movimiento_id: p.movimiento_id, duracion_ms: p.duracion_ms,
          entregado_al_esp: entregado
        });
        await new Promise(r => setTimeout(r, p.duracion_ms));
      }
      // Asegurar detener al final / al abortar
      enviarMovimientoAlEsp(3);
      const estadoFinal = cancelado ? 'abortada' : 'finalizada';
      db.query(
        'UPDATE demos_log SET estado=?, motivo=?, fin=NOW() WHERE id=?',
        [estadoFinal, cancelado || null, logId]
      ).catch(err => console.error('[log demo fin]', err.message));
      broadcastEvento('demo', {
        estado: estadoFinal,
        demoId: +req.params.id,
        motivo: cancelado || null
      });
      state.demoActiva = null;
    })();
  } catch (e) { state.demoActiva = null; res.status(500).json({ error: e.message }); }
});

// Cancelar demo en curso
router.post('/demos/cancelar', (req, res) => {
  if (!state.demoActiva) return res.status(404).json({ error: 'No hay demo activa' });
  state.demoActiva.abort('manual');
  res.json({ ok: true });
});

// ====================================================================
// OBSTÁCULOS (detección por ESP8266)
// ====================================================================

// GET /api/obstaculos?limit=10
router.get('/obstaculos', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '10', 10), 100);
    const [rows] = await db.query(
      'SELECT id, distancia, origen, fecha FROM obstaculos ORDER BY fecha DESC LIMIT ?',
      [limit]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/obstaculos/estadisticas
router.get('/obstaculos/estadisticas', async (req, res) => {
  try {
    const [tot]  = await db.query('SELECT COUNT(*) AS total FROM obstaculos');
    const [hoy]  = await db.query("SELECT COUNT(*) AS hoy FROM obstaculos WHERE DATE(fecha)=CURDATE()");
    const [prom] = await db.query('SELECT AVG(distancia) AS promedio FROM obstaculos');
    const [last] = await db.query('SELECT distancia, fecha FROM obstaculos ORDER BY fecha DESC LIMIT 1');
    res.json({
      total: tot[0].total, hoy: hoy[0].hoy,
      distancia_promedio: prom[0].promedio,
      ultimo: last[0] || null
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST manual (para pruebas con Thunder Client)  body: { distancia }
router.post('/obstaculos', async (req, res) => {
  try {
    const distancia = Number(req.body.distancia);
    if (!Number.isFinite(distancia)) return res.status(400).json({ error: 'distancia inválida' });
    const origen = req.body.origen || 'manual';
    const [r] = await db.query(
      'INSERT INTO obstaculos (distancia, origen) VALUES (?, ?)', [distancia, origen]);

    state.ultimoObstaculo = { distancia, fecha: new Date().toISOString() };
    broadcastEvento('obstaculo', { id: r.insertId, distancia, origen, fecha: state.ultimoObstaculo.fecha });

    // Regla lógica: si hay demo activa, abortar
    if (state.demoActiva) state.demoActiva.abort('obstaculo');

    res.status(201).json({ ok: true, id: r.insertId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ====================================================================
// HISTORIAL (últimos movimientos y demos ejecutadas)
// ====================================================================

// GET /api/historial/movimientos?limit=10
router.get('/historial/movimientos', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '10', 10), 100);
    const [rows] = await db.query(
      `SELECT id, movimiento_id, nombre, origen, entregado_esp, fecha
         FROM movimientos_log ORDER BY fecha DESC LIMIT ?`, [limit]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/historial/demos?limit=10
router.get('/historial/demos', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '10', 10), 100);
    const [rows] = await db.query(
      `SELECT id, demo_id, nombre, pasos, estado, motivo, inicio, fin
         FROM demos_log ORDER BY inicio DESC LIMIT ?`, [limit]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

