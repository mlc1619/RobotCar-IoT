# 🚗 RobotCar-IoT

> Sistema completo para **controlar, monitorear y automatizar** un vehículo robótico basado en ESP8266 desde una aplicación web.

**Autor:** Misael López Cancino

---

## ✨ Características

- 🎮 **Control remoto** de motores en tiempo real (Adelante, Reversa, Vueltas, Giros 90°/360°).
- 📦 **CRUD completo** de dispositivos IoT (carrito, LEDs, buzzer, sensores).
- ⚙️ **Configuración dinámica** de parámetros del motor (velocidad PWM, tiempos).
- 🎬 **Demos programables** — secuencias de movimientos encadenados, editables desde la web.
- 📊 **Monitoreo en vivo** con gráficos (Chart.js), KPIs y refresco automático cada 2 s.
- 🚨 **Detección de obstáculos** con sensor HC-SR04 → alerta inmediata + auto-aborto de demo.
- 📜 **Historial persistente** de los últimos 10 movimientos y demos ejecutadas.

---

## 🧰 Stack tecnológico

| Capa | Tecnología |
|---|---|
| **Hardware** | ESP8266 NodeMCU · L9110S · HC-SR04 |
| **Firmware** | Arduino (C++) · WebSocketsClient · ArduinoJson |
| **Backend** | Node.js · Express · ws · mysql2 |
| **Frontend** | Bootstrap 5 · ES6 Classes (OOP) · Chart.js |
| **Base de datos** | MySQL 8 |

---

## 📂 Estructura

```
├── Test_L9110S_Motor_Driver_Module/   ← firmware principal
├── WiFiScan/                          ← sketch diagnóstico WiFi
├── server/
│   ├── server.js, routes.js, db.js, state.js
│   ├── sql/                           ← 4 scripts SQL
│   └── public/                        ← frontend Bootstrap+OOP
├── DOCUMENTACION.md                   ← documentación técnica completa
└── documentacion.html                 ← versión imprimible (PDF)
```

---

## 🚀 Quick start

### 1. Base de datos
```bash
mysql -u root -p
> CREATE DATABASE robotcar CHARACTER SET utf8mb4;
> exit;

cd server/sql
mysql -u root -p robotcar < schema.sql
mysql -u root -p robotcar < dispositivos.sql
mysql -u root -p robotcar < demos_obstaculos.sql
mysql -u root -p robotcar < historial.sql
```

### 2. Servidor
```bash
cd server
cp .env.example .env   # editar credenciales MySQL
npm install
node server.js
```

### 3. Firmware ESP8266
1. Abrir `Test_L9110S_Motor_Driver_Module.ino` en Arduino IDE.
2. Ajustar SSID/password y la IP del servidor.
3. Subir al NodeMCU.

### 4. Abrir
<http://localhost:8080>

---

## 📖 Documentación completa

Toda la arquitectura, endpoints, decisiones técnicas y guía de pruebas están en [DOCUMENTACION.md](DOCUMENTACION.md) (o la versión imprimible [documentacion.html](documentacion.html)).

---

## 📝 Licencia

Proyecto académico · © 2026 Misael López Cancino
