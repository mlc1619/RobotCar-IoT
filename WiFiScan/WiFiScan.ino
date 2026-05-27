// Sketch temporal: escanea las redes WiFi visibles desde el ESP8266
// Sube este sketch, abre el Monitor Serie a 115200, y verás la lista.
#include <ESP8266WiFi.h>

void setup() {
  Serial.begin(115200);
  delay(1000);
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(100);
  Serial.println("\n=== Escaneo de redes WiFi ===");
}

void loop() {
  int n = WiFi.scanNetworks();
  Serial.printf("Encontradas: %d redes\n", n);
  for (int i = 0; i < n; i++) {
    Serial.printf("  %2d  %-32s  RSSI=%4d dBm  canal=%2d  %s\n",
      i + 1,
      WiFi.SSID(i).c_str(),
      WiFi.RSSI(i),
      WiFi.channel(i),
      (WiFi.encryptionType(i) == ENC_TYPE_NONE) ? "ABIERTA" : "cifrada");
  }
  Serial.println("---");
  delay(5000);
}
