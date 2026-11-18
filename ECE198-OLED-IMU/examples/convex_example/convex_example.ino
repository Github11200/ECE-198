// Minimal Convex subscription example for ESP32 (uses src/convex).
// The real wearable firmware is ../../ECE198-OLED-IMU.ino.
#include <WiFi.h>
#include "../../src/convex/Convex.h"

#define WIFI_SSID "your-wifi-ssid"
#define WIFI_PASS "your-wifi-password"
#define CONVEX_URL "https://your-deployment.convex.cloud"

convex::ConvexClient client(CONVEX_URL);

void setup() {
  Serial.begin(115200);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) delay(200);

  // Subscriptions survive reconnects; the callback fires on every change.
  client.subscribe("messages:list", {}, [](const convex::FunctionResult& r) {
    if (r.is_success()) Serial.println(r.value.to_string().c_str());
    else Serial.printf("Query error: %s\n", r.error_message.c_str());
  });
  client.connect();
}

void loop() {
  client.poll();  // processes WebSocket traffic and runs callbacks
  delay(5);
}
