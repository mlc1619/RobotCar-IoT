require('dotenv').config();
const express = require('express');
const http    = require('http');
const cors    = require('cors');
const { WebSocketServer } = require('ws');
const db      = require('./db');
const routes  = require('./routes');
const state   = require('./state');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));      // sirve la página web
app.use('/api', routes);

const server = http.createServer(app);

// ---------- WebSocket ----------
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  console.log('[WS] Conexión nueva desde', req.socket.remoteAddress);
  state.webClients.add(ws);

  ws.on('message', async (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); }
    catch { return; }

    // El ESP se identifica al conectar
    if (msg.tipo === 'esp') {
      state.esp = ws;
      state.webClients.delete(ws);
      console.log('[WS] ESP8266 registrado');
      return;
    }

    // El ESP reporta un obstáculo: { tipo:"obstaculo", distancia: <cm> }
    if (msg.tipo === 'obstaculo') {
      const distancia = Number(msg.distancia);
      if (!Number.isFinite(distancia)) return;
      try {
        const [r] = await db.query(
          'INSERT INTO obstaculos (distancia, origen) VALUES (?, ?)',
          [distancia, 'esp']
        );
        const fecha = new Date().toISOString();
        state.ultimoObstaculo = { distancia, fecha };
        const payload = JSON.stringify({
          evento: 'obstaculo', id: r.insertId, distancia, origen: 'esp', fecha
        });
        state.webClients.forEach(c => { if (c.readyState === 1) c.send(payload); });
        console.log(`[OBSTACULO] ${distancia} cm`);

        // Regla lógica: si hay demo corriendo, abortarla y detener el carrito
        if (state.demoActiva) {
          state.demoActiva.abort('obstaculo');
          if (state.esp?.readyState === 1) state.esp.send(JSON.stringify({ comando: 3 }));
        }
      } catch (e) { console.error('[OBSTACULO]', e.message); }
      return;
    }

    // Cliente web envía {"comando": <id>}
    if (typeof msg.comando === 'number') {
      try {
        const [rows] = await db.query(
          `SELECT id, nombre,
                  a_input_1a, a_input_1b, a_tiempo,
                  b_input_1a, b_input_1b, b_tiempo
             FROM movimientos WHERE id = ?`,
          [msg.comando]
        );
        if (!rows.length) {
          ws.send(JSON.stringify({ error: 'Movimiento inexistente' }));
          return;
        }
        const m = rows[0];
        const detalle = {
          id: m.id,
          nombre: m.nombre,
          motor_A: { input_1A: m.a_input_1a, input_1B: m.a_input_1b, time: m.a_tiempo },
          motor_B: { input_1A: m.b_input_1a, input_1B: m.b_input_1b, time: m.b_tiempo },
          fecha:  new Date().toISOString()
        };

        // Guardar como último movimiento (compartido con la API REST)
        state.ultimoMovimiento = detalle;
        console.log(`[WS] Comando ${msg.comando} (${m.nombre})`);

        // Reenviar al ESP
        if (state.esp && state.esp.readyState === ws.OPEN) {
          state.esp.send(JSON.stringify({ comando: msg.comando }));
          ws.send(JSON.stringify({ ok: true, ...detalle }));

          // Notificar a los otros clientes web suscritos
          const payload = JSON.stringify({ evento: 'movimiento', ...detalle });
          state.webClients.forEach(c => {
            if (c !== ws && c.readyState === ws.OPEN) c.send(payload);
          });
        } else {
          ws.send(JSON.stringify({ error: 'ESP8266 no conectado' }));
        }
      } catch (e) {
        ws.send(JSON.stringify({ error: e.message }));
      }
    }
  });

  ws.on('close', () => {
    if (ws === state.esp) {
      state.esp = null;
      console.log('[WS] ESP8266 desconectado');
    } else {
      state.webClients.delete(ws);
    }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () =>
  console.log(`Servidor HTTP+WS escuchando en :${PORT}`)
);
