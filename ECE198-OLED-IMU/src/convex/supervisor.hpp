#pragma once

/**
 * Connection supervisor: decides when the Convex WebSocket should be opened
 * or closed. Pure logic (no Arduino calls, time passed in), so every recovery
 * path is unit-tested on the host.
 *
 * Recovers from:
 *  - network loss (Wi-Fi down): close now, reopen as soon as it is back
 *  - a connect attempt that hangs (DNS/TCP/TLS): give up after connect_timeout
 *  - a silently dead socket: the Convex server sends a Ping every 15 s, so no
 *    message for idle_timeout means the connection is gone
 *  - the socket closing: retry with exponential backoff + jitter
 */

#include <cstdint>
#include <functional>

namespace convex {

struct SupervisorConfig {
    uint32_t connect_timeout_ms = 15000;
    uint32_t idle_timeout_ms = 35000;  // > 2 missed server Pings
    uint32_t backoff_initial_ms = 500;
    uint32_t backoff_max_ms = 15000;
};

class ConnectionSupervisor {
public:
    enum class State {
        NetworkDown,  // waiting for Wi-Fi
        Waiting,      // backing off before the next attempt
        Connecting,   // socket opening / handshake
        Connected,
    };
    enum class Command { None, Open, Close };

    /** jitter(delay) returns the actual wait in [0, delay]; default: full delay. */
    explicit ConnectionSupervisor(SupervisorConfig config = {},
                                  std::function<uint32_t(uint32_t)> jitter = nullptr)
        : config_(config), jitter_(std::move(jitter)) {}

    /** Call every loop iteration. Execute the returned command. */
    Command tick(uint32_t now, bool network_up) {
        if (!network_up) {
            bool had_socket = state_ == State::Connecting || state_ == State::Connected;
            if (state_ != State::NetworkDown) lose(now, "Network down", false);
            state_ = State::NetworkDown;
            return had_socket ? Command::Close : Command::None;
        }
        switch (state_) {
            case State::NetworkDown:
                // Network just came back: connect right away.
                state_ = State::Waiting;
                retry_at_ = now;
                return tick(now, network_up);
            case State::Waiting:
                if (static_cast<int32_t>(now - retry_at_) < 0) return Command::None;
                state_ = State::Connecting;
                since_ = now;
                ++attempts_;
                return Command::Open;
            case State::Connecting:
                if (now - since_ < config_.connect_timeout_ms) return Command::None;
                lose(now, "Connect timeout", true);
                return Command::Close;
            case State::Connected:
                if (now - last_message_ < config_.idle_timeout_ms) return Command::None;
                lose(now, "No message from server", true);
                return Command::Close;
        }
        return Command::None;
    }

    /** WebSocket is open (handshake can be sent). */
    void socket_opened(uint32_t now) {
        if (state_ != State::Connecting) return;
        state_ = State::Connected;
        last_message_ = now;
        failures_ = 0;
        ++connections_;
    }

    /** WebSocket closed or failed to open. Ignored if we already closed it. */
    void socket_closed(uint32_t now, const char* reason = "Connection lost") {
        if (state_ != State::Connecting && state_ != State::Connected) return;
        lose(now, reason, true);
    }

    void message_received(uint32_t now) { last_message_ = now; }

    State state() const { return state_; }
    bool connected() const { return state_ == State::Connected; }
    /** Successful opens so far (1 after the first connection). */
    uint32_t connections() const { return connections_; }
    /** Open attempts so far. */
    uint32_t attempts() const { return attempts_; }
    /** Why the last connection ended ("" if never). */
    const char* last_close_reason() const { return last_reason_; }
    /** Delay chosen before the next attempt (for logging). */
    uint32_t next_delay_ms() const { return last_delay_; }
    /** Called with the reason whenever a Connected socket is lost. */
    void on_lost(std::function<void(const char*)> cb) { on_lost_ = std::move(cb); }

private:
    void lose(uint32_t now, const char* reason, bool schedule_retry) {
        bool was_connected = state_ == State::Connected;
        last_reason_ = reason;
        if (schedule_retry) {
            uint32_t delay = config_.backoff_initial_ms;
            for (uint32_t i = 0; i < failures_ && delay < config_.backoff_max_ms; ++i) delay *= 2;
            if (delay > config_.backoff_max_ms) delay = config_.backoff_max_ms;
            if (jitter_) delay = jitter_(delay);
            ++failures_;
            last_delay_ = delay;
            retry_at_ = now + delay;
            state_ = State::Waiting;
        }
        if (was_connected && on_lost_) on_lost_(reason);
    }

    SupervisorConfig config_;
    std::function<uint32_t(uint32_t)> jitter_;
    std::function<void(const char*)> on_lost_;
    State state_ = State::NetworkDown;
    uint32_t retry_at_ = 0;
    uint32_t since_ = 0;
    uint32_t last_message_ = 0;
    uint32_t failures_ = 0;
    uint32_t attempts_ = 0;
    uint32_t connections_ = 0;
    uint32_t last_delay_ = 0;
    const char* last_reason_ = "";
};

}  // namespace convex
