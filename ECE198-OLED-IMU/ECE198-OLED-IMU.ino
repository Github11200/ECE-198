// ECE 198 wearable: shows live exercise session stats from Convex on the OLED.
//
// ESP32 Dev Module + SSD1306 128x64 OLED (I2C 0x3C), I2C on SDA=13, SCL=14.
// The BMX160 IMU on the same bus is not used and is never addressed.
//
// Data flow: laptop tracker -> publish_feedback.py -> Convex `feedback` row
// -> this board subscribes to the `feedback:live` query over the Convex
// WebSocket sync protocol. The screen is redrawn every frame from the latest
// result, the same way the original IMU sketch drew its readings.
// Wi-Fi, Convex URL, read token and participant ID live in secrets.h
// (copy secrets.example.h).

#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

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

const uint32_t FRAME_MS = 200;          // full redraw, like the original sketch's loop
const uint32_t STATUS_LOG_MS = 10000;   // periodic serial status line
const uint32_t WIFI_REJOIN_MS = 20000;  // re-join if Wi-Fi stays down this long
const uint32_t I2C_CHECK_MS = 500;      // how often to confirm the OLED still ACKs
const uint32_t SUMMARY_MS = 60000;      // show final results this long after a session
const uint8_t OLED_ADDR = 0x3C;

Adafruit_SSD1306 display(128, 64, &Wire, -1);
convex::ConvexClient convexClient(CONVEX_URL);

bool oledOk = false;

feedback::Snapshot snapshot;  // latest parsed query result
feedback::Freshness freshness;
feedback::Screen shownScreen;
feedback::Link shownLink = feedback::Link::WifiConnecting;
bool screenLogged = false;
uint32_t updatesReceived = 0;
uint32_t i2cRecoveries = 0;

// Last live result for this participant, shown as a summary once the session ends.
feedback::Snapshot lastActive;
bool haveLastActive = false;
uint32_t summaryUntil = 0;  // millis() deadline; 0 = no summary pending

// ---------------------------------------------------------------- display --
//
// Same approach as the original IMU sketch: clear, print size-1 text lines,
// display(), every frame. A transfer lost on the bus is overwritten next frame.

void drawScreen(const feedback::Screen& s, const feedback::Snapshot& stats,
                feedback::Link link) {
  if (!oledOk) return;
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println(s.header.c_str());
  // Link indicator, top right: filled = live, hollow = connecting.
  if (link == feedback::Link::Online) {
    display.fillCircle(123, 3, 3, SSD1306_WHITE);
  } else {
    display.drawCircle(123, 3, 3, SSD1306_WHITE);
  }
  display.drawFastHLine(0, 10, 128, SSD1306_WHITE);

  if (!s.big.empty()) {
    // Session (or its final summary): one stat per line.
    display.setCursor(0, 14);
    for (const std::string& line : feedback::stat_lines(stats)) display.println(line.c_str());
  } else {
    display.setCursor(0, 26);
    display.println(s.sub.c_str());  // '\n' starts a second line
  }
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
  uint32_t now = millis();
  bool fresh = freshness.fresh(now);
  bool live = snapshot.status == feedback::Status::Active && fresh;
  if (live) {
    lastActive = snapshot;
    haveLastActive = true;
    summaryUntil = 0;
  }
  bool showSummary = !live && link == feedback::Link::Online && summaryUntil != 0 &&
                     static_cast<int32_t>(summaryUntil - now) > 0;
  feedback::Screen next = showSummary ? feedback::summary(lastActive)
                                      : feedback::render(snapshot, link, fresh, PARTICIPANT_ID);
  drawScreen(next, showSummary ? lastActive : snapshot, link);

  // Serial echo only when the content changes (tools/e2e_test.py reads it).
  if (screenLogged && next == shownScreen && link == shownLink) return;
  std::string sub = next.sub;
  for (char& c : sub) {
    if (c == '\n') c = ' ';  // one log line per frame
  }
  Serial.printf("[OLED] %-21s | %-7s | %-21s | %s\n", next.header.c_str(), next.big.c_str(),
                sub.c_str(), next.footer.c_str());
  shownScreen = next;
  shownLink = link;
  screenLogged = true;
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
    Serial.printf("[Feedback] #%u %s session=%s %s %d/%d full=%d short=%d cue=%s '%s' range=%d %s\n",
                  static_cast<unsigned>(updatesReceived), names[static_cast<int>(next.status)],
                  next.session_id.c_str(), next.exercise.c_str(), next.reps, next.target,
                  next.full, next.short_reps, next.cue_code.c_str(),
                  feedback::cue_text(next).c_str(), next.range_score, next.error.c_str());
  }
  // The relay publishes "no session" when the instructor ends and saves.
  if (snapshot.status == feedback::Status::Active && next.status == feedback::Status::NoSession &&
      haveLastActive && lastActive.session_id == snapshot.session_id) {
    summaryUntil = millis() + SUMMARY_MS;
    if (summaryUntil == 0) summaryUntil = 1;
  }
  if (next.status == feedback::Status::Active) summaryUntil = 0;
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

// ------------------------------------------------------------------- I2C --
//
// If a device ever holds SDA low, every transfer fails silently and the panel
// freezes. Check that the OLED still ACKs; if not, clock the bus free and
// re-initialise the display.

bool oledResponds() {
  Wire.beginTransmission(OLED_ADDR);
  return Wire.endTransmission() == 0;
}

void recoverI2c() {
  Wire.end();
  pinMode(I2C_SDA, INPUT_PULLUP);
  pinMode(I2C_SCL, OUTPUT_OPEN_DRAIN);
  digitalWrite(I2C_SCL, HIGH);
  delayMicroseconds(5);
  bool sdaStuck = digitalRead(I2C_SDA) == LOW;
  for (int i = 0; i < 9 && digitalRead(I2C_SDA) == LOW; ++i) {
    digitalWrite(I2C_SCL, LOW);
    delayMicroseconds(5);
    digitalWrite(I2C_SCL, HIGH);
    delayMicroseconds(5);
  }
  // STOP condition: SDA low -> high while SCL is high.
  pinMode(I2C_SDA, OUTPUT_OPEN_DRAIN);
  digitalWrite(I2C_SDA, LOW);
  delayMicroseconds(5);
  digitalWrite(I2C_SCL, HIGH);
  delayMicroseconds(5);
  digitalWrite(I2C_SDA, HIGH);
  delayMicroseconds(5);
  pinMode(I2C_SDA, INPUT);
  pinMode(I2C_SCL, INPUT);

  Wire.setPins(I2C_SDA, I2C_SCL);
  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setTimeOut(50);
  oledOk = display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR, false, false);
  ++i2cRecoveries;
  Serial.printf("[I2C] OLED stopped responding (SDA %s); recovery #%u: OLED %s\n",
                sdaStuck ? "held low" : "free", static_cast<unsigned>(i2cRecoveries),
                oledOk ? "ok" : "FAIL");
}

// ------------------------------------------------------- serial commands --
//
// Test hooks used by tools/e2e_test.py (115200 baud, one command per line):
//   status           print a [Status] line now
//   drop convex      close the Convex socket as if the connection died
//   drop wifi <s>    disconnect Wi-Fi and stay offline for <s> seconds

void printStatus(uint32_t now) {
  Serial.printf("[Status] wifi=%s rssi=%d convex=%s connections=%u msgs=%u updates=%u pending=%u "
                "fresh=%d i2c_recoveries=%u heap=%u\n",
                WiFi.status() == WL_CONNECTED ? "up" : "down", WiFi.RSSI(),
                convexClient.is_connected() ? "up" : "down",
                static_cast<unsigned>(convexClient.connections()),
                static_cast<unsigned>(convexClient.messages_received()),
                static_cast<unsigned>(updatesReceived),
                static_cast<unsigned>(convexClient.pending_requests()), freshness.fresh(now),
                static_cast<unsigned>(i2cRecoveries), static_cast<unsigned>(ESP.getFreeHeap()));
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
    // The IMU is not used; accepted so older test scripts stay quiet.
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

  // Same bus setup as the original IMU sketch.
  Wire.setPins(I2C_SDA, I2C_SCL);
  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setTimeOut(50);  // a stuck bus must not stall the Convex loop
  oledOk = display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR);
  Serial.printf("[Boot] OLED %s\n", oledOk ? "ok" : "NOT FOUND - check wiring");
  refreshScreen();

  startWifi();
  startConvex();
}

void loop() {
  uint32_t now = millis();

  readCommands(now);
  wifiWatchdog(now);
  convexClient.poll();

  static uint32_t lastI2cCheck = 0, i2cRetryAt = 0;
  if (now - lastI2cCheck >= I2C_CHECK_MS) {
    lastI2cCheck = now;
    if ((!oledOk || !oledResponds()) && static_cast<int32_t>(now - i2cRetryAt) >= 0) {
      recoverI2c();
      i2cRetryAt = oledOk ? now : now + 5000;  // back off while the OLED stays missing
    }
  }

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

  delay(2);
}
