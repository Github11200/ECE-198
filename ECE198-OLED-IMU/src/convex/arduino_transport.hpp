#pragma once

/**
 * Arduino ESP32 WebSocket transport for the Convex sync protocol.
 *
 * Wraps WebSocketsClient (links2004/WebSockets) with the library's own
 * auto-reconnect disabled: ConvexClient's ConnectionSupervisor decides when
 * to open and close, so retries, backoff and Wi-Fi loss are handled in one
 * place. Messages sent while the socket is down are dropped on purpose;
 * ConvexClient replays its state on every new connection.
 */

#include <Arduino.h>
#include <WebSocketsClient.h>
#include "transport.hpp"
#include "sync_endpoint.hpp"
#include <string>

namespace convex {

class ArduinoTransport : public ITransport {
public:
    ArduinoTransport() = default;
    ~ArduinoTransport() override { ws_.disconnect(); }

    /** Start one connection attempt (no automatic retries). */
    void connect(const std::string& url) override {
        SyncEndpoint ep = parse_sync_endpoint(url);
        state_ = ConnectionState::Connecting;
        active_ = true;
        ws_.onEvent([this](WStype_t type, uint8_t* payload, size_t length) {
            handleEvent(type, payload, length);
        });
        if (ep.ssl) {
            // No root CA bundled: TLS without certificate verification
            // (same trade-off as WiFiClientSecure::setInsecure).
            ws_.beginSSL(ep.host.c_str(), ep.port, ep.path.c_str());
        } else {
            ws_.begin(ep.host.c_str(), ep.port, ep.path.c_str());
        }
        // Within one attempt the library may retry a failed TCP connect every
        // 2 s (a failed connect raises no event). The supervisor bounds the
        // attempt with its connect timeout, and poll() stops calling loop()
        // once the attempt is over, so the library never retries on its own.
        // Note: the library compares millis() - lastFail against this before
        // even the first attempt, so it must stay small.
        ws_.setReconnectInterval(2000);
        // WebSocket-level ping: drops a half-open TCP socket within ~25 s.
        ws_.enableHeartbeat(10000, 5000, 2);
    }

    /** Close the socket. Does not report on_disconnect (caller initiated it). */
    void disconnect() override {
        active_ = false;
        state_ = ConnectionState::Disconnected;
        ws_.disconnect();
    }

    void send(const std::string& message) override {
        if (state_ != ConnectionState::Connected) return;
        ws_.sendTXT(reinterpret_cast<uint8_t*>(const_cast<char*>(message.data())), message.size());
    }

    ConnectionState state() const override { return state_; }

    void set_callbacks(TransportCallbacks callbacks) override {
        callbacks_ = std::move(callbacks);
    }

    void poll(int timeout_ms = 0) override {
        if (active_) ws_.loop();
        if (timeout_ms > 0) delay(timeout_ms);
    }

    void run() override {
        for (;;) poll(10);
    }

private:
    void handleEvent(WStype_t type, uint8_t* payload, size_t length) {
        if (!active_) return;  // events caused by our own disconnect()
        switch (type) {
            case WStype_CONNECTED:
                state_ = ConnectionState::Connected;
                if (callbacks_.on_connect) callbacks_.on_connect();
                break;
            case WStype_DISCONNECTED: {
                // Also fires when an attempt fails (DNS/TCP/TLS refused).
                bool was_open = state_ == ConnectionState::Connected;
                active_ = false;
                state_ = ConnectionState::Disconnected;
                if (callbacks_.on_disconnect) {
                    callbacks_.on_disconnect(was_open ? "Connection lost" : "Connect failed");
                }
                break;
            }
            case WStype_TEXT:
                if (callbacks_.on_message) {
                    callbacks_.on_message(std::string(reinterpret_cast<char*>(payload), length));
                }
                break;
            case WStype_ERROR:
                if (callbacks_.on_error) callbacks_.on_error("WebSocket error");
                break;
            default:
                break;
        }
    }

    WebSocketsClient ws_;
    ConnectionState state_ = ConnectionState::Disconnected;
    bool active_ = false;
    TransportCallbacks callbacks_;
};

}  // namespace convex
