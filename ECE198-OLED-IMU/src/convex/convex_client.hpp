#pragma once

/**
 * Convex client for Arduino ESP32.
 *
 *   BaseConvexClient      Convex sync protocol state (queries, mutations, auth)
 *   ConnectionSupervisor  when to open/close the socket (Wi-Fi loss, timeouts,
 *                         dead connections, backoff)
 *   ArduinoTransport      the WebSocket itself
 *
 * Single-threaded: call poll() from loop(); callbacks run inside poll().
 * After any reconnect the client re-authenticates, re-subscribes every query
 * and resends unacknowledged mutations, so callers never handle reconnects.
 */

#include <Arduino.h>
#include <WiFi.h>
#include <esp_random.h>
#include "value.hpp"
#include "protocol.hpp"
#include "base_client.hpp"
#include "arduino_transport.hpp"
#include "supervisor.hpp"
#include "sync_endpoint.hpp"
#include <functional>

namespace convex {

class ConvexClient {
public:
    using ResultCallback = std::function<void(const FunctionResult&)>;
    using ConnectionCallback = std::function<void(bool connected, const char* reason)>;

    explicit ConvexClient(const std::string& url, SupervisorConfig config = {})
        : url_(url),
          // Full jitter in [d/2, d] so many devices don't reconnect in lockstep.
          supervisor_(config, [](uint32_t d) { return d / 2 + esp_random() % (d / 2 + 1); }) {}

    /**
     * Start the client. Safe to call before Wi-Fi is up: the socket opens as
     * soon as the network is available and is kept open from then on.
     */
    void connect() {
        if (started_) return;
        started_ = true;
        uint8_t bytes[16];
        esp_fill_random(bytes, sizeof(bytes));
        session_id_ = format_uuid_v4(bytes);

        transport_.set_callbacks({
            [this]() { handleOpen(); },
            [this](const std::string& msg) { handleMessage(msg); },
            [](const std::string& err) { Serial.printf("[Convex] %s\n", err.c_str()); },
            [this](const std::string& reason) {
                // The supervisor keeps the pointer: pass a string literal.
                supervisor_.socket_closed(millis(), reason == "Connect failed" ? "Connect failed"
                                                                               : "Connection lost");
            },
        });
        supervisor_.on_lost([this](const char* reason) { handleLost(reason); });
    }

    /** Drive the connection. Call every loop() iteration. */
    void poll() {
        if (!started_) return;
        uint32_t now = millis();
        switch (supervisor_.tick(now, WiFi.isConnected())) {
            case ConnectionSupervisor::Command::Open:
                Serial.printf("[Convex] Connecting (attempt %u) to %s\n",
                              static_cast<unsigned>(supervisor_.attempts()), url_.c_str());
                transport_.connect(url_);
                break;
            case ConnectionSupervisor::Command::Close:
                transport_.disconnect();
                break;
            case ConnectionSupervisor::Command::None:
                break;
        }
        // Log each scheduled retry once.
        if (supervisor_.state() == ConnectionSupervisor::State::Waiting &&
            supervisor_.attempts() != logged_retry_for_attempt_) {
            logged_retry_for_attempt_ = supervisor_.attempts();
            Serial.printf("[Convex] %s; retry in %u ms\n", supervisor_.last_close_reason(),
                          static_cast<unsigned>(supervisor_.next_delay_ms()));
        }
        transport_.poll(0);
    }

    /** Socket open and handshake sent; subscriptions are live. */
    bool is_connected() const { return supervisor_.connected(); }

    /**
     * Drop the current connection as if it had failed (test hook; also useful
     * after changing networks). `reason` must be a string literal. The
     * supervisor reconnects with backoff.
     */
    void drop_connection(const char* reason = "Dropped by request") {
        if (!supervisor_.connected()) return;
        transport_.disconnect();
        supervisor_.socket_closed(millis(), reason);
    }

    /** Called with (true, "") on every (re)connect and (false, reason) on loss. */
    void on_connection_change(ConnectionCallback cb) { connection_cb_ = std::move(cb); }

    uint32_t messages_received() const { return messages_received_; }
    uint32_t connections() const { return supervisor_.connections(); }
    size_t pending_requests() const { return base_.pending_request_count(); }

    /**
     * Subscribe to a query. The callback fires with every new result.
     * Subscriptions persist across reconnects. Safe to call before connect().
     */
    SubscriberId subscribe(const std::string& name, const Object& args, ResultCallback callback) {
        auto [id, msg] = base_.subscribe(
            name, args, [callback](const SubscriberId&, const FunctionResult& r) { callback(r); });
        if (msg) send(*msg);
        return id;
    }

    void unsubscribe(const SubscriberId& id) {
        if (auto msg = base_.unsubscribe(id)) send(*msg);
    }

    /**
     * Run a mutation. If the connection is down it is queued and sent (or
     * resent, if it was in flight) after reconnecting, exactly once.
     */
    void mutation(const std::string& name, const Object& args, ResultCallback callback = nullptr) {
        send(base_.mutation(name, args, [callback](SessionRequestSeqNumber, const FunctionResult& r) {
            if (callback) callback(r);
        }));
    }

    /** Run an action. Fails immediately when offline (actions are never retried). */
    void action(const std::string& name, const Object& args, ResultCallback callback = nullptr) {
        if (!is_connected()) {
            if (callback) callback(FunctionResult::error("Not connected"));
            return;
        }
        send(base_.action(name, args, [callback](SessionRequestSeqNumber, const FunctionResult& r) {
            if (callback) callback(r);
        }));
    }

    /** Authenticate with a JWT; re-sent automatically after reconnects. */
    void set_auth(const std::string& token) { send(base_.authenticate(AuthenticationToken::user(token))); }
    void clear_auth() { send(base_.clear_auth()); }

private:
    void handleOpen() {
        supervisor_.socket_opened(millis());
        Serial.printf("[Convex] Connected (session %s, connection #%u)\n", session_id_.c_str(),
                      static_cast<unsigned>(connection_count_));
        send(base_.connect_message(session_id_, connection_count_++, last_close_reason_));
        for (const auto& msg : base_.reconnect_messages()) send(msg);
        if (connection_cb_) connection_cb_(true, "");
    }

    void handleLost(const char* reason) {
        Serial.printf("[Convex] Connection lost: %s\n", reason);
        last_close_reason_ = reason;
        base_.handle_failure();
        if (connection_cb_) connection_cb_(false, reason);
    }

    void handleMessage(const std::string& text) {
        ++messages_received_;
        supervisor_.message_received(millis());
        try {
            ServerMessage msg = parse_server_message(text);
            if (auto* fatal = std::get_if<FatalErrorMessage>(&msg)) {
                Serial.printf("[Convex] Fatal error from server: %s\n", fatal->error_message.c_str());
            } else if (auto* auth = std::get_if<AuthErrorMessage>(&msg)) {
                Serial.printf("[Convex] Auth error: %s\n", auth->error_message.c_str());
            }
            base_.handle_message(msg);
        } catch (const std::exception& e) {
            Serial.printf("[Convex] Bad server message (%u bytes): %s\n",
                          static_cast<unsigned>(text.size()), e.what());
        }
    }

    void send(const ClientMessage& msg) {
        if (!is_connected()) return;  // replayed by reconnect_messages()
        transport_.send(serialize_client_message(msg));
    }

    std::string url_;
    std::string session_id_;  // kept across reconnects so mutations dedupe
    std::string last_close_reason_ = "InitialConnect";
    uint32_t connection_count_ = 0;
    uint32_t messages_received_ = 0;
    uint32_t logged_retry_for_attempt_ = 0;
    bool started_ = false;
    ConnectionCallback connection_cb_;
    ArduinoTransport transport_;
    ConnectionSupervisor supervisor_;
    BaseConvexClient base_;
};

}  // namespace convex
