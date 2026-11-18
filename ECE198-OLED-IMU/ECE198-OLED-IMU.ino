// ECE 198 wearable: shows live exercise feedback from Convex on the OLED.
//
// ESP32 Dev Module + SSD1306 128x64 OLED (I2C 0x3C) + DFRobot BMX160 IMU,
// I2C on SDA=13, SCL=14.
//
// Data flow: laptop tracker -> publish_feedback.py -> Convex `feedback` row
// -> this board subscribes to the `feedback:live` query over the Convex
// WebSocket sync protocol and redraws whenever the row changes.
// Wi-Fi, Convex URL, read token and participant ID live in secrets.h
// (copy secrets.example.h).

#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DFRobot_BMX160.h>

#if __has_include("secrets.h")
#include "secrets.h"
#else
#error "Copy secrets.example.h to secrets.h and fill in Wi-Fi + Convex settings"
#endif

// Optional, git-ignored, non-secret overrides (e.g. CONVEX_URL pointing at the
// laptop's current LAN IP). Regenerate with tools/write-local-config.sh.
#if __has_include("local_config.h")
#include "local_config.h"
#endif

#include "src/convex/Convex.h"
#include "src/feedback/feedback.h"

#define I2C_SDA 13
#define I2C_SCL 14

// IMU calibration offsets from the at-rest, flat reading
const float AX_OFF = 0.44, AY_OFF = 1.45, AZ_OFF = 0.85;  // Z: 10.66 - 9.81
const float GX_OFF = 0.72, GY_OFF = 0.49, GZ_OFF = 0.45;

const uint32_t FRAME_MS = 100;         // screen refresh check
const uint32_t STATUS_LOG_MS = 10000;  // periodic serial status line
const uint32_t IMU_LOG_MS = 5000;
const uint32_t WIFI_REJOIN_MS = 20000;  // re-join if Wi-Fi stays down this long

Adafruit_SSD1306 display(128, 64, &Wire, -1);
DFRobot_BMX160 bmx160;
convex::ConvexClient convexClient(CONVEX_URL);

bool oledOk = false;
bool imuOk = false;

feedback::Snapshot snapshot;  // latest parsed query result
feedback::Freshness freshness;
feedback::Screen shownScreen;
feedback::Link shownLink = feedback::Link::WifiConnecting;
bool screenDrawnOnce = false;
uint32_t updatesReceived = 0;

// ---------------------------------------------------------------- display --

void drawScreen(const feedback::Screen& s, feedback::Link link) {
  if (!oledOk) return;
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print(s.header.c_str());
  // Link indicator, top right: filled = live, hollow = connecting.
  if (link == feedback::Link::Online) {
    display.fillCircle(123, 3, 3, SSD1306_WHITE);
  } else {
    display.drawCircle(123, 3, 3, SSD1306_WHITE);
  }
  display.drawFastHLine(0, 10, 128, SSD1306_WHITE);

  int subY = 28;
  if (!s.big.empty()) {
    uint8_t size = s.big.size() <= 5 ? 3 : 2;  // 18 px or 12 px per char
    int w = s.big.size() * 6 * size;
    display.setTextSize(size);
    display.setCursor((128 - w) / 2, 15);
    display.print(s.big.c_str());
    display.setTextSize(1);
    subY = 42;
  }
  display.setCursor(0, subY);
  display.print(s.sub.c_str());
  display.setCursor(0, 55);
  display.print(s.footer.c_str());
  display.display();
}

feedback::Link currentLink() {
  if (WiFi.status() != WL_CONNECTED) return feedback::Link::WifiConnecting;
  if (!convexClient.is_connected()) return feedback::Link::ConvexConnecting;
  return feedback::Link::Online;
}

void refreshScreen() {
  feedback::Link link = currentLink();
  bool fresh = freshness.fresh(millis());
  feedback::Screen next = feedback::render(snapshot, link, fresh, PARTICIPANT_ID);
  if (screenDrawnOnce && next == shownScreen && link == shownLink) return;
  drawScreen(next, link);
  Serial.printf("[OLED] %-21s | %-7s | %-21s | %s\n", next.header.c_str(), next.big.c_str(),
                next.sub.c_str(), next.footer.c_str());
  shownScreen = next;
  shownLink = link;
  screenDrawnOnce = true;
}

// ------------------------------------------------------------------ Wi-Fi --
//
// The ESP32 Wi-Fi driver auto-reconnects after most drops, but gives up after
// some failures (AP gone, auth timeouts, a manual disconnect). The watchdog
// below re-joins whenever Wi-Fi has been down for WIFI_REJOIN_MS, so the board
// always comes back on its own. The Convex client notices the network loss
// itself and reconnects (and re-subscribes) once Wi-Fi is back.

uint32_t wifiRejoinAt = 0;  // millis() at which the watchdog may re-join
bool wifiWasUp = false;

void onWifiEvent(WiFiEvent_t event, WiFiEventInfo_t info) {
  switch (event) {
    case ARDUINO_EVENT_WIFI_STA_CONNECTED:
      Serial.println("[WiFi] Associated, waiting for IP");
      break;
    case ARDUINO_EVENT_WIFI_STA_GOT_IP:
      Serial.printf("[WiFi] Got IP %s (RSSI %d dBm)\n", WiFi.localIP().toString().c_str(),
                    WiFi.RSSI());
      break;
    case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
      Serial.printf("[WiFi] Disconnected, reason %u\n", info.wifi_sta_disconnected.reason);
      break;
    default:
      break;
  }
}

void joinWifi() {
  if (strlen(WIFI_EAP_IDENTITY) > 0) {
    // Never log the identity or password.
    Serial.printf("[WiFi] Joining '%s' (WPA2-Enterprise PEAP)\n", WIFI_SSID);
    WiFi.begin(WIFI_SSID, WPA2_AUTH_PEAP, WIFI_EAP_IDENTITY, WIFI_EAP_IDENTITY, WIFI_PASSWORD);
  } else {
    Serial.printf("[WiFi] Joining '%s' (WPA2-PSK)\n", WIFI_SSID);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  }
  wifiRejoinAt = millis() + WIFI_REJOIN_MS;
}

void startWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.onEvent(onWifiEvent);
  joinWifi();
}

void wifiWatchdog(uint32_t now) {
  bool up = WiFi.status() == WL_CONNECTED;
  if (wifiWasUp && !up) {
    Serial.println("[WiFi] Link lost; driver auto-reconnect running");
    wifiRejoinAt = now + WIFI_REJOIN_MS;
  }
  wifiWasUp = up;
  if (!up && static_cast<int32_t>(now - wifiRejoinAt) >= 0) {
    Serial.println("[WiFi] Still offline; re-joining");
    WiFi.disconnect();
    joinWifi();
  }
}

// ----------------------------------------------------------------- Convex --

void onFeedback(const convex::FunctionResult& result) {
  ++updatesReceived;
  feedback::Snapshot next = result.is_success()
                                ? feedback::parse_live(result.value, PARTICIPANT_ID)
                                : feedback::from_error(result.error_message, PARTICIPANT_ID);
  freshness.observe(next.updated_at, millis());

  bool changed = next.status != snapshot.status || next.reps != snapshot.reps ||
                 next.target != snapshot.target || next.cue_code != snapshot.cue_code ||
                 next.session_id != snapshot.session_id || next.error != snapshot.error;
  if (changed) {
    static const char* names[] = {"loading", "no-session", "not-paired", "active", "error"};
    Serial.printf("[Feedback] #%u %s session=%s %s %d/%d cue=%s '%s' range=%d %s\n",
                  static_cast<unsigned>(updatesReceived), names[static_cast<int>(next.status)],
                  next.session_id.c_str(), next.exercise.c_str(), next.reps, next.target,
                  next.cue_code.c_str(), feedback::cue_text(next).c_str(), next.range_score,
                  next.error.c_str());
  }
  snapshot = next;
}

void startConvex() {
  convexClient.subscribe("feedback:live", convex::Object{{"token", convex::Value(FEEDBACK_READ_TOKEN)}},
                         onFeedback);
  convexClient.on_connection_change([](bool connected, const char* reason) {
    if (!connected) Serial.printf("[Feedback] Live data paused: %s\n", reason);
  });
  convexClient.connect();  // opens as soon as Wi-Fi is up, reconnects forever
}

// -------------------------------------------------------------------- IMU --

void logImu() {
  sBmx160SensorData_t gyro, accel;
  bmx160.getAllData(nullptr, &gyro, &accel);
  float ax = accel.x - AX_OFF, ay = accel.y - AY_OFF, az = accel.z - AZ_OFF;
  float gx = gyro.x - GX_OFF, gy = gyro.y - GY_OFF, gz = gyro.z - GZ_OFF;
  Serial.printf("[IMU] A(m/s2) %6.2f %6.2f %6.2f |A|=%.2f  G(dps) %6.2f %6.2f %6.2f\n", ax, ay, az,
                sqrtf(ax * ax + ay * ay + az * az), gx, gy, gz);
}

// ------------------------------------------------------- serial commands --
//
// Test hooks used by tools/e2e_test.py (115200 baud, one command per line):
//   status           print a [Status] line now
//   drop convex      close the Convex socket as if the connection died
//   drop wifi <s>    disconnect Wi-Fi and stay offline for <s> seconds
//   imu on|off       toggle the periodic [IMU] log

bool imuLog = true;

void printStatus(uint32_t now) {
  Serial.printf("[Status] wifi=%s rssi=%d convex=%s connections=%u msgs=%u updates=%u pending=%u "
                "fresh=%d heap=%u\n",
                WiFi.status() == WL_CONNECTED ? "up" : "down", WiFi.RSSI(),
                convexClient.is_connected() ? "up" : "down",
                static_cast<unsigned>(convexClient.connections()),
                static_cast<unsigned>(convexClient.messages_received()),
                static_cast<unsigned>(updatesReceived),
                static_cast<unsigned>(convexClient.pending_requests()), freshness.fresh(now),
                static_cast<unsigned>(ESP.getFreeHeap()));
}

void handleCommand(String cmd, uint32_t now) {
  cmd.trim();
  if (cmd == "status") {
    printStatus(now);
  } else if (cmd == "drop convex") {
    Serial.println("[Cmd] Dropping Convex connection");
    convexClient.drop_connection("Dropped by test command");
  } else if (cmd.startsWith("drop wifi")) {
    long secs = cmd.substring(9).toInt();
    if (secs <= 0) secs = 10;
    Serial.printf("[Cmd] Dropping Wi-Fi for %ld s\n", secs);
    WiFi.disconnect();
    wifiWasUp = false;
    wifiRejoinAt = now + static_cast<uint32_t>(secs) * 1000;
  } else if (cmd == "imu on" || cmd == "imu off") {
    imuLog = cmd == "imu on";
  } else if (cmd.length()) {
    Serial.printf("[Cmd] Unknown command '%s'\n", cmd.c_str());
  }
}

void readCommands(uint32_t now) {
  static String line;
  while (Serial.available()) {
    char c = static_cast<char>(Serial.read());
    if (c == '\n' || c == '\r') {
      if (line.length()) handleCommand(line, now);
      line = "";
    } else if (line.length() < 64) {
      line += c;
    }
  }
}

// ---------------------------------------------------------- setup / loop --

void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.printf("\n[Boot] ECE198 wearable, participant %s, Convex %s\n", PARTICIPANT_ID,
                CONVEX_URL);

  Wire.begin(I2C_SDA, I2C_SCL);
  oledOk = display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  imuOk = bmx160.begin();
  Serial.printf("[Boot] OLED %s, BMX160 %s\n", oledOk ? "ok" : "NOT FOUND",
                imuOk ? "ok" : "NOT FOUND");
  refreshScreen();

  startWifi();
  startConvex();
}

void loop() {
  uint32_t now = millis();

  readCommands(now);
  wifiWatchdog(now);
  convexClient.poll();

  static uint32_t lastFrame = 0;
  if (now - lastFrame >= FRAME_MS) {
    lastFrame = now;
    refreshScreen();
  }

  static uint32_t lastStatus = 0;
  if (now - lastStatus >= STATUS_LOG_MS) {
    lastStatus = now;
    printStatus(now);
  }

  static uint32_t lastImu = 0;
  if (imuOk && imuLog && now - lastImu >= IMU_LOG_MS) {
    lastImu = now;
    logImu();
  }

  delay(2);
}
