// Estado compartido entre rutas REST y WebSocket
module.exports = {
  esp: null,                // socket del ESP
  ultimoMovimiento: null,   // { id, nombre, motor_A, motor_B, fecha }
  webClients: new Set(),    // para broadcast a la web
  demoActiva: null,         // { demoId, abort: () => void } cuando hay una demo corriendo
  ultimoObstaculo: null     // { distancia, fecha }
};
