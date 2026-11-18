#pragma once

#include "value.hpp"
#include "protocol.hpp"
#include "error.hpp"
#include <map>
#include <set>
#include <functional>
#include <optional>
#include <queue>
#include <mutex>

namespace convex {

/**
 * Identifier for a subscription to a query
 */
struct SubscriberId {
    QueryId query_id;
    uint32_t index;
    
    bool operator<(const SubscriberId& other) const {
        if (query_id != other.query_id) return query_id < other.query_id;
        return index < other.index;
    }
    
    bool operator==(const SubscriberId& other) const {
        return query_id == other.query_id && index == other.index;
    }
};

/**
 * Result of a query or mutation
 */
struct FunctionResult {
    enum class Type { Value, Error, ConvexError };
    
    Type type;
    Value value;
    std::string error_message;
    Value error_data;  // For ConvexError
    
    static FunctionResult success(Value v) {
        return {Type::Value, std::move(v), "", Value()};
    }
    
    static FunctionResult error(const std::string& msg) {
        return {Type::Error, Value(), msg, Value()};
    }
    
    static FunctionResult convex_error(const std::string& msg, Value data) {
        return {Type::ConvexError, Value(), msg, std::move(data)};
    }
    
    bool is_success() const { return type == Type::Value; }
    bool is_error() const { return type != Type::Value; }
};

/**
 * Callback types
 */
using QueryCallback = std::function<void(const SubscriberId&, const FunctionResult&)>;
using MutationCallback = std::function<void(SessionRequestSeqNumber, const FunctionResult&)>;
using ActionCallback = std::function<void(SessionRequestSeqNumber, const FunctionResult&)>;
using AuthCallback = std::function<AuthenticationToken(bool force_refresh)>;

/**
 * Internal query state
 */
struct LocalQuery {
    QueryId id;
    std::string udf_path;
    Object args;
    uint32_t num_subscribers;
    uint32_t subscription_index;
};

/**
 * Pending request
 */
struct PendingRequest {
    enum class Type { Mutation, Action };
    Type type;
    SessionRequestSeqNumber request_id;
    MutationCallback on_complete;
    // Kept so an unacknowledged mutation can be resent after a reconnect.
    std::string udf_path;
    std::string args_json;
};

/**
 * BaseConvexClient - The synchronous state machine for Convex sync protocol.
 * 
 * This class is platform-agnostic and handles:
 * - Query subscription management
 * - Mutation/action request tracking
 * - Protocol state versioning
 * - Message generation and response handling
 * 
 * It does NOT handle:
 * - WebSocket connections (use ITransport)
 * - Threading (handled by ConvexClient)
 * - Reconnection logic (handled by ConvexClient)
 */
class BaseConvexClient {
public:
    BaseConvexClient();
    ~BaseConvexClient();
    
    // ========================================================================
    // Connection Management
    // ========================================================================
    
    /**
     * Generate the initial Connect message for a new WebSocket connection
     */
    ClientMessage connect_message(
        const SessionId& session_id,
        uint32_t connection_count,
        const std::string& close_reason
    );
    
    /**
     * Generate messages to restore state on a new WebSocket (send right after
     * connect_message): re-authenticate, re-add every active query as query
     * set version 0 -> 1, then resend every mutation that has not been
     * acknowledged (same request id, so the server deduplicates).
     */
    std::vector<ClientMessage> reconnect_messages();
    
    /**
     * Get the max observed timestamp (for reconnection)
     */
    std::optional<Timestamp> max_observed_timestamp() const {
        return max_observed_ts_;
    }
    
    // ========================================================================
    // Query Subscriptions
    // ========================================================================
    
    /**
     * Subscribe to a query
     * @param udf_path The path to the query function (e.g., "messages:list")
     * @param args Query arguments
     * @param callback Called when query result updates
     * @return Subscriber ID and optional message to send
     */
    std::pair<SubscriberId, std::optional<ClientMessage>> subscribe(
        const std::string& udf_path,
        const Object& args,
        QueryCallback callback
    );
    
    /**
     * Unsubscribe from a query
     * @param subscriber_id The subscriber to remove
     * @return Optional message to send (if this was the last subscriber)
     */
    std::optional<ClientMessage> unsubscribe(const SubscriberId& subscriber_id);
    
    /**
     * Get current result for a subscription
     */
    std::optional<FunctionResult> get_result(const SubscriberId& subscriber_id) const;
    
    // ========================================================================
    // Mutations and Actions
    // ========================================================================
    
    /**
     * Create a mutation request
     * @param udf_path The path to the mutation function
     * @param args Mutation arguments
     * @param callback Called when mutation completes
     * @return Message to send
     */
    ClientMessage mutation(
        const std::string& udf_path,
        const Object& args,
        MutationCallback callback
    );
    
    /**
     * Create an action request
     * @param udf_path The path to the action function
     * @param args Action arguments
     * @param callback Called when action completes
     * @return Message to send
     */
    ClientMessage action(
        const std::string& udf_path,
        const Object& args,
        ActionCallback callback
    );
    
    // ========================================================================
    // Authentication
    // ========================================================================
    
    /**
     * Set the authentication token fetcher
     */
    void set_auth_fetcher(AuthCallback fetcher);
    
    /**
     * Create an authentication message
     */
    ClientMessage authenticate(const AuthenticationToken& token);
    
    /**
     * Clear authentication
     */
    ClientMessage clear_auth();
    
    // ========================================================================
    // Message Handling
    // ========================================================================
    
    /**
     * Handle a message received from the server
     * May trigger callbacks for query updates, mutation responses, etc.
     */
    void handle_message(const ServerMessage& message);
    
    /**
     * Handle a lost connection. In-flight actions are failed (they may have
     * run, so they are never retried). In-flight mutations are kept and
     * resent by reconnect_messages().
     */
    void handle_failure();

    /** Number of mutations/actions awaiting a response. */
    size_t pending_request_count() const {
        std::lock_guard<std::mutex> lock(mutex_);
        return pending_requests_.size();
    }
    
private:
    void complete_request(SessionRequestSeqNumber request_id, bool success,
                          const std::optional<Value>& result,
                          const std::optional<ErrorPayload>& error);

    // Query token for deduplication
    std::string make_query_token(const std::string& udf_path, const Object& args) const;
    
    // State
    QueryId next_query_id_ = 0;
    QuerySetVersion query_set_version_ = 0;
    IdentityVersion identity_version_ = 0;
    SessionRequestSeqNumber next_request_id_ = 0;
    std::optional<Timestamp> max_observed_ts_;
    
    // Query subscriptions
    std::map<std::string, LocalQuery> query_set_;  // token -> query
    std::map<QueryId, std::string> query_id_to_token_;
    std::map<QueryId, FunctionResult> latest_results_;
    std::set<SubscriberId> subscribers_;
    std::map<SubscriberId, QueryCallback> subscriber_callbacks_;
    
    // Pending requests
    std::map<SessionRequestSeqNumber, PendingRequest> pending_requests_;
    
    // Authentication
    AuthenticationToken current_token_;
    AuthCallback auth_fetcher_;
    
    // Thread safety (can be disabled for single-threaded use)
    mutable std::mutex mutex_;
};

} // namespace convex
