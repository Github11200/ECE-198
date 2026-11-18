#pragma once

/**
 * Convex C++ Client for Arduino ESP32
 * 
 * A real-time backend client for Convex (https://convex.dev)
 * 
 * Requirements:
 *   - ESP32 board
 *   - WiFi connection
 *   - WebSockets library by Markus Sattler (install via Library Manager)
 * 
 * Usage:
 *   #include "src/convex/Convex.h"
 *   
 *   convex::ConvexClient client("https://your-app.convex.cloud");
 *   
 *   void setup() {
 *       WiFi.begin(ssid, password);
 *       while (WiFi.status() != WL_CONNECTED) delay(100);
 *       
 *       client.connect();
 *       
 *       // Subscribe to real-time updates
 *       client.subscribe("data:list", {}, [](const convex::FunctionResult& r) {
 *           if (r.is_success()) {
 *               Serial.println(r.value.to_string().c_str());
 *           }
 *       });
 *   }
 *   
 *   void loop() {
 *       client.poll();  // Process incoming messages
 *       delay(10);
 *   }
 */

// Main client
#include "convex_client.hpp"

// For direct use of Value type
// convex::Value::Object args = {{"key", convex::Value("value")}};
// convex::Value::Array arr = {convex::Value(1), convex::Value(2)};
