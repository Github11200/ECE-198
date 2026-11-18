# Convex client for ESP32 (`src/convex`)

A C++ client for the [Convex](https://convex.dev) sync protocol, used for all
of this project's Convex traffic. It speaks the same WebSocket protocol as the
official JS client: live query subscriptions, mutations, actions and auth.

```
ConvexClient          (convex_client.hpp)  what the sketch uses
 ├─ BaseConvexClient  (base_client.*)      protocol state: query set, pending
 │                                          requests, auth, replay on reconnect
 ├─ ConnectionSupervisor (supervisor.hpp)  when to open/close: Wi-Fi loss,
 │                                          connect timeout, dead socket, backoff
 └─ ArduinoTransport  (arduino_transport.hpp) the WebSocket (links2004/WebSockets)
protocol.*  JSON codec for client/server messages and Convex values
```

Everything except `ArduinoTransport`/`ConvexClient` is plain C++ and unit
tested on the host (`pio test -e native`), using messages captured from a real
deployment.

## Usage

```cpp
#include "src/convex/Convex.h"

convex::ConvexClient convex("https://<deployment>.convex.cloud");

void setup() {
  WiFi.begin(ssid, password);           // no need to wait for it
  convex.subscribe("feedback:live", {{"token", convex::Value(token)}},
                   [](const convex::FunctionResult& r) {
                     if (r.is_success()) Serial.println(r.value.to_string().c_str());
                     else Serial.println(r.error_message.c_str());
                   });
  convex.connect();                     // opens once Wi-Fi is up
}

void loop() {
  convex.poll();                        // call often; never block for long
}
```

- `subscribe(name, args, cb)`: `cb` runs with every new result. Subscriptions
  survive reconnects.
- `mutation(name, args, cb)`: queued while offline. If the connection drops
  mid-flight it is resent with the same request id, so it runs exactly once.
- `action(name, args, cb)`: fails immediately when offline, and fails if the
  connection drops mid-flight (it may have run, so it is never retried).
- `set_auth(jwt)` / `clear_auth()`: re-sent automatically after reconnects.
- `is_connected()`, `connections()`, `pending_requests()`,
  `on_connection_change(cb)`, `drop_connection()` (test hook).

Values: `convex::Value` holds null, bool, float64 (`double`), int64
(`int64_t`, sent as Convex `bigint`), string, bytes, array and object. JSON
numbers from the server are always float64, as in Convex.

## Recovery

| Failure | Detection | Recovery |
|---|---|---|
| Wi-Fi drops | `WiFi.isConnected()` false | socket closed; reopened as soon as Wi-Fi is back (the sketch's watchdog re-joins Wi-Fi after 20 s if the driver gives up) |
| Server closes / TCP reset | WebSocket disconnect event | retry with exponential backoff (0.5 s → 15 s, jittered) |
| Connect hangs (DNS/TCP/TLS) | 15 s connect timeout | close and retry with backoff |
| Socket silently dead | no message for 35 s (server pings every 15 s) | close and retry |

On every new connection the client sends Connect (same session id),
Authenticate, the full query set, and any unacknowledged mutations, and the
server re-sends current query results.

## Notes

- TLS certificates are not verified (no CA bundle on the device).
- `nlohmann_json.hpp` makes the firmware about 1.5 MB, so `platformio.ini`
  uses the `huge_app` partition table.
