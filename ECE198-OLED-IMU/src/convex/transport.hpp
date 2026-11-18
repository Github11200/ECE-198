#pragma once

#include <algorithm>
#include <cstdlib>
#include <string>
#include <functional>
#include <memory>
#include <optional>
#include <chrono>

namespace convex {

/**
 * WebSocket connection state
 */
enum class ConnectionState {
    Disconnected,
    Connecting,
    Connected,
    Closing
};

/**
 * Transport event callbacks
 */
struct TransportCallbacks {
    std::function<void()> on_connect;
    std::function<void(const std::string& message)> on_message;
    std::function<void(const std::string& error)> on_error;
    std::function<void(const std::string& reason)> on_disconnect;
};

/**
 * Abstract WebSocket transport interface.
 * Platform-specific implementations provide the actual WebSocket functionality.
 */
class ITransport {
public:
    virtual ~ITransport() = default;
    
    /**
     * Start connecting to the WebSocket server (completion is reported
     * through on_connect).
     * @param url The deployment URL (https://... or wss://...)
     */
    virtual void connect(const std::string& url) = 0;
    
    /**
     * Send a text message over the WebSocket
     * Messages sent while disconnected are queued until connected.
     * @param message The message to send
     */
    virtual void send(const std::string& message) = 0;
    
    /**
     * Close the WebSocket connection
     */
    virtual void disconnect() = 0;
    
    /**
     * Get current connection state
     */
    virtual ConnectionState state() const = 0;
    
    /**
     * Check if connected
     */
    bool is_connected() const { return state() == ConnectionState::Connected; }
    
    /**
     * Set event callbacks
     */
    virtual void set_callbacks(TransportCallbacks callbacks) = 0;
    
    /**
     * Process pending events (for poll-based implementations)
     * Should be called regularly from the main loop.
     * @param timeout_ms Maximum time to wait for events (0 = non-blocking)
     */
    virtual void poll(int timeout_ms = 0) = 0;
    
    /**
     * Run the event loop (blocking)
     * Continuously processes events until the connection is closed.
     */
    virtual void run() = 0;
};

/**
 * Backoff calculator for reconnection attempts
 */
class Backoff {
public:
    Backoff(
        std::chrono::milliseconds initial = std::chrono::milliseconds(100),
        std::chrono::milliseconds max = std::chrono::seconds(15)
    ) : initial_(initial), max_(max), current_(initial) {}
    
    /**
     * Get the next backoff delay and increase for next time
     */
    std::chrono::milliseconds next() {
        auto delay = current_;
        current_ = std::min(current_ * 2, max_);
        // Add jitter: random value from 0 to delay (like AWS recommendation)
        auto delay_count = delay.count();
        auto jitter_ms = delay_count > 0 ? (rand() % delay_count) : 0;
        auto result = std::chrono::milliseconds(jitter_ms);
        return std::min(result, max_);
    }
    
    /**
     * Reset backoff to initial value (call on successful connection)
     */
    void reset() {
        current_ = initial_;
    }
    
private:
    std::chrono::milliseconds initial_;
    std::chrono::milliseconds max_;
    std::chrono::milliseconds current_;
};

} // namespace convex
