# 🏠 Guía para correr el proyecto en modo LOCAL (sin AWS)

Esto te permite presentar el examen en la universidad usando **el hotspot del celular**, sin depender de la IP pública de AWS ni del firewall FortiNet.

---

## 🧩 Lo que necesitas instalar UNA SOLA VEZ en tu laptop

| Software | Para qué | Descarga |
|---|---|---|
| **Node.js LTS** | Ejecutar el servidor | https://nodejs.org/ |
| **MySQL Community Server** | Base de datos local | https://dev.mysql.com/downloads/installer/ |
| **MySQL Workbench** *(opcional)* | Ver/editar tablas con clics | Viene en el mismo instalador |

> Durante la instalación de MySQL te pedirá crear una **contraseña para `root`**. **Apúntala**, la necesitarás.

Verifica desde PowerShell:
```powershell
node -v
mysql --version
```

---

## 🛠️ Paso A — Crear la base de datos local

Abre **MySQL Workbench** y conéctate como `root`. Abre el archivo [server/sql/schema.sql](server/sql/schema.sql), pégalo en el editor SQL y ejecútalo con el rayo ⚡.

O por terminal:
```powershell
mysql -u root -p < "C:\Users\canci\OneDrive\Desktop\ESP8266\server\sql\schema.sql"
```

Verifica:
```powershell
mysql -u root -p -e "USE robotcar; SELECT id, nombre FROM movimientos;"
```
Debes ver los 11 movimientos.

---

## 🛠️ Paso B — Configurar el `.env.local`

Edita [server/.env.local](server/.env.local) y cambia la línea:
```
DB_PASSWORD=CAMBIA-AQUI-TU-PASSWORD-DE-MYSQL
```
Por el password real de tu `root` de MySQL.

---

## 🛠️ Paso C — Abrir el puerto 8080 en el firewall (UNA sola vez)

Abre PowerShell **como Administrador** y ejecuta:
```powershell
New-NetFirewallRule -DisplayName "RobotCar 8080" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
```

---

## 🚀 Paso D — Arrancar el servidor (cada vez que vayas a usarlo)

Opción 1 — con el script automático:
```powershell
cd "C:\Users\canci\OneDrive\Desktop\ESP8266\server"
.\start-local.ps1
```

> Si PowerShell te bloquea el script, ejecuta UNA vez:
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
> ```

El script te mostrará la **IP local de tu laptop**, copia esa IP para el `.ino`.

Opción 2 — manual:
```powershell
cd "C:\Users\canci\OneDrive\Desktop\ESP8266\server"
Copy-Item .env.local .env -Force
npm install      # solo la primera vez
node server.js
```

---

## 📡 Paso E — El día del examen (en la uni)

1. **Activa el hotspot del celular**. Apunta SSID y contraseña.
2. **Conecta la laptop al hotspot**.
3. Ejecuta `.\start-local.ps1` → te dirá la nueva IP local (ej. `192.168.43.123`).
4. **Edita el `.ino` en Arduino IDE**:
   ```cpp
   const char* ssid     = "NOMBRE-DEL-HOTSPOT";
   const char* password = "PASSWORD-DEL-HOTSPOT";
   const char* websocket_server = "192.168.43.123";   // la IP del paso 3
   ```
5. **Sube el sketch al ESP8266**.
6. En el Monitor Serial debe decir `[WS] Conectado al servidor!`.

---

## 🧪 Paso F — Probar todo

| Cliente | URL |
|---|---|
| Navegador (en tu propia laptop) | `http://localhost:8080/` |
| Navegador (otro dispositivo del hotspot) | `http://192.168.43.123:8080/` |
| Thunder Client / Postman | `http://192.168.43.123:8080/api/...` |
| WebSocket Client | `ws://192.168.43.123:8080` |

### Endpoints para la demo del examen
- **Punto 1** – Agregar movimiento: `POST /api/movimientos`
- **Punto 2** – Último por API: `GET /api/ultimo-movimiento`
- **Punto 2** – Último por WebSocket: conectar a `ws://IP:8080` (recibes notificación automática)
- **Punto 3** – Modificar parámetro: `PUT /api/parametros/Velocidad`  body `{"valor": 200}`
- **Bonus** – Mover carrito por API: `POST /api/ejecutar/1`

---

## 🔄 Volver al modo AWS

Solo necesitas restaurar el `.env`:
```powershell
Copy-Item .env.example .env -Force
```
Y volver a poner la IP de la EIP en el `.ino`.
