#include <ESP8266WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>

// --- CONFIGURACIÓN DE RED (Hotspot de Windows) ---
const char* ssid = "RobotCar";
const char* password = "12345678";

// --- SERVIDOR WEBSOCKET ---
// IP fija del Mobile Hotspot de Windows (siempre 192.168.137.1)
const char* websocket_server = "192.168.137.1";
const uint16_t websocket_port = 8080;

WebSocketsClient webSocket;

// --- PINES DEL L9110S (LAFVIN) ---
const int A_IA = 14; // D5
const int A_IB = 4;  // D2
const int B_IA = 13; // D7
const int B_IB = 12; // D6

// --- PINES DEL HC-SR04 ---
const int TRIG_PIN = 5;   // D1
const int ECHO_PIN = 16;  // D0
const float DISTANCIA_ALERTA_CM = 20.0;        // umbral de obstáculo
const unsigned long OBSTACULO_COOLDOWN_MS = 1500; // anti-spam

unsigned long ultimoEnvioObstaculo = 0;

struct Movimiento {
  int id, a_ia_val, a_ib_val, b_ia_val, b_ib_val, tiempo;
};

Movimiento tablaMovimientos[] = {
  {1, 0, 255, 255, 0, 0},
  {2, 255, 0, 0, 255, 0},
  {3, 0, 0, 0, 0, 0},
  {4, 0, 255, 191, 0, 1000},
  {5, 0, 191, 255, 0, 1000},
  {6, 255, 0, 0, 191, 1000},
  {7, 191, 0, 0, 255, 1000},
  {8, 0, 255, 0, 255, 500},
  {9, 255, 0, 255, 0, 500},
  {10, 0, 255, 0, 255, 2000},
  {11, 255, 0, 255, 0, 2000}
};

void detenerMotores() {
  analogWrite(A_IA, 0); analogWrite(A_IB, 0);
  analogWrite(B_IA, 0); analogWrite(B_IB, 0);
}

void moverMotores(int id_comando) {
  for (int i = 0; i < 11; i++) {
    if (tablaMovimientos[i].id == id_comando) {
      Movimiento m = tablaMovimientos[i];
      Serial.print("Ejecutando movimiento ID: ");
      Serial.println(m.id);
      analogWrite(A_IA, m.a_ia_val);
      analogWrite(A_IB, m.a_ib_val);
      analogWrite(B_IA, m.b_ia_val);
      analogWrite(B_IB, m.b_ib_val);
      if (m.tiempo > 0) {
        delay(m.tiempo);
        detenerMotores();
      }
      break;
    }
  }
}

// Medición HC-SR04 → distancia en cm (0 si no hay eco)
float medirDistanciaCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duracion = pulseIn(ECHO_PIN, HIGH, 30000); // timeout 30 ms (~5 m)
  if (duracion == 0) return 0;
  return duracion * 0.0343 / 2.0;
}

void enviarObstaculo(float distancia) {
  StaticJsonDocument<96> doc;
  doc["tipo"] = "obstaculo";
  doc["distancia"] = distancia;
  char buf[96];
  size_t n = serializeJson(doc, buf);
  webSocket.sendTXT(buf, n);
  Serial.printf("[OBSTACULO] %.2f cm enviado\n", distancia);
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("[WS] Desconectado");
      break;
    case WStype_CONNECTED:
      Serial.println("[WS] Conectado");
      webSocket.sendTXT("{\"tipo\":\"esp\"}");
      break;
    case WStype_TEXT: {
      Serial.printf("[WS] Recibido: %s\n", payload);
      DynamicJsonDocument doc(256);
      DeserializationError error = deserializeJson(doc, payload);
      if (error) { Serial.println(error.c_str()); return; }
      if (doc.containsKey("comando")) {
        moverMotores(doc["comando"].as<int>());
      }
      break;
    }
    default: break;
  }
}

void setup() {
  Serial.begin(115200);
  analogWriteRange(255);

  pinMode(A_IA, OUTPUT); pinMode(A_IB, OUTPUT);
  pinMode(B_IA, OUTPUT); pinMode(B_IB, OUTPUT);
  detenerMotores();

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIG_PIN, LOW);

  WiFi.persistent(false);
  WiFi.mode(WIFI_OFF);
  delay(200);
  WiFi.mode(WIFI_STA);
  WiFi.setSleepMode(WIFI_NONE_SLEEP);
  WiFi.disconnect(true);
  delay(200);

  WiFi.begin(ssid, password, 1);   // canal 1 explícito (vimos en el scan)
  Serial.print("Conectando a "); Serial.println(ssid);
  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    if (millis() - t0 > 20000) {
      Serial.print("\nFallo WiFi. Status = "); Serial.println(WiFi.status());
      Serial.println("Reintentando...");
      WiFi.disconnect(); delay(500);
      WiFi.begin(ssid, password, 1);
      t0 = millis();
    }
  }
  Serial.println("\nWiFi conectado: " + WiFi.localIP().toString());
  Serial.print("RSSI: "); Serial.println(WiFi.RSSI());

  webSocket.begin(websocket_server, websocket_port, "/");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
}

void loop() {
  webSocket.loop();

  // Lectura del sensor cada ~200 ms
  static unsigned long ultimaLectura = 0;
  if (millis() - ultimaLectura > 200) {
    ultimaLectura = millis();
    float d = medirDistanciaCm();
    if (d > 0 && d < DISTANCIA_ALERTA_CM) {
      if (millis() - ultimoEnvioObstaculo > OBSTACULO_COOLDOWN_MS) {
        ultimoEnvioObstaculo = millis();
        detenerMotores();           // regla local: frenar de inmediato
        enviarObstaculo(d);
      }
    }
  }
}
