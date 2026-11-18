#pragma once

#include "value.hpp"
#include <string>
#include <vector>
#include <optional>
#include <cstdint>
#include <variant>

namespace convex {

// Type aliases
using QueryId = uint32_t;
using QuerySetVersion = uint32_t;
using IdentityVersion = uint32_t;
using SessionRequestSeqNumber = uint32_t;
using Timestamp = uint64_t;
using SessionId = std::string;

/**
 * Query to subscribe to
 */
struct Query {
    QueryId query_id;
    std::string udf_path;
    std::string args_json;  // Serialized JSON args
    std::optional<std::string> journal;
    std::optional<std::string> component_path;
};

/**
 * Modification to the query set
 */
struct QuerySetModification {
    enum class Type { Add, Remove };
    
    Type type;
    QueryId query_id;
    
    // Only for Add
    std::optional<Query> query;
};

/**
 * Authentication token
 */
struct AuthenticationToken {
    enum class Type { None, User, Admin };
    
    Type type = Type::None;
    std::string value;
    // For Admin tokens acting as a user
    std::optional<Object> acting_as;
    
    static AuthenticationToken none() { return {Type::None, "", std::nullopt}; }
    static AuthenticationToken user(const std::string& token) { return {Type::User, token, std::nullopt}; }
    static AuthenticationToken admin(const std::string& token) { return {Type::Admin, token, std::nullopt}; }
};

/**
 * State version for tracking sync state
 */
struct StateVersion {
    QuerySetVersion query_set = 0;
    IdentityVersion identity = 0;
    Timestamp ts = 0;
    
    static StateVersion initial() { return {0, 0, 0}; }
    
    bool operator<(const StateVersion& other) const {
        if (ts != other.ts) return ts < other.ts;
        if (query_set != other.query_set) return query_set < other.query_set;
        return identity < other.identity;
    }
};

/**
 * Error payload from server
 */
struct ErrorPayload {
    std::string message;
    std::optional<Value> data;  // For ConvexError with custom data
};

/**
 * Log lines from function execution
 */
using LogLines = std::vector<std::string>;

// ============================================================================
// Client -> Server Messages
// ============================================================================

struct ConnectMessage {
    SessionId session_id;
    uint32_t connection_count;
    std::string last_close_reason;
    std::optional<Timestamp> max_observed_timestamp;
    std::optional<uint64_t> client_ts;
};

struct ModifyQuerySetMessage {
    QuerySetVersion base_version;
    QuerySetVersion new_version;
    std::vector<QuerySetModification> modifications;
};

struct MutationMessage {
    SessionRequestSeqNumber request_id;
    std::string udf_path;
    std::string args_json;
    std::optional<std::string> component_path;
};

struct ActionMessage {
    SessionRequestSeqNumber request_id;
    std::string udf_path;
    std::string args_json;
    std::optional<std::string> component_path;
};

struct AuthenticateMessage {
    IdentityVersion base_version;
    AuthenticationToken token;
};

/**
 * All possible client messages
 */
using ClientMessage = std::variant<
    ConnectMessage,
    ModifyQuerySetMessage,
    MutationMessage,
    ActionMessage,
    AuthenticateMessage
>;

// ============================================================================
// Server -> Client Messages
// ============================================================================

/**
 * Modification to state (query result update, failure, or removal)
 */
struct StateModification {
    enum class Type { QueryUpdated, QueryFailed, QueryRemoved };
    
    Type type;
    QueryId query_id;
    
    // For QueryUpdated
    std::optional<Value> value;
    
    // For QueryFailed
    std::optional<std::string> error_message;
    std::optional<Value> error_data;
    
    // For QueryUpdated and QueryFailed
    LogLines log_lines;
    std::optional<std::string> journal;
};

struct TransitionMessage {
    StateVersion start_version;
    StateVersion end_version;
    std::vector<StateModification> modifications;
    std::optional<int64_t> client_clock_skew;
    std::optional<Timestamp> server_ts;
};

struct MutationResponseMessage {
    SessionRequestSeqNumber request_id;
    bool success;
    std::optional<Value> result;
    std::optional<ErrorPayload> error;
    std::optional<Timestamp> ts;
    LogLines log_lines;
};

struct ActionResponseMessage {
    SessionRequestSeqNumber request_id;
    bool success;
    std::optional<Value> result;
    std::optional<ErrorPayload> error;
    LogLines log_lines;
};

struct AuthErrorMessage {
    std::string error_message;
    std::optional<IdentityVersion> base_version;
    std::optional<bool> auth_update_attempted;
};

struct FatalErrorMessage {
    std::string error_message;
};

struct PingMessage {};

/**
 * All possible server messages
 */
using ServerMessage = std::variant<
    TransitionMessage,
    MutationResponseMessage,
    ActionResponseMessage,
    AuthErrorMessage,
    FatalErrorMessage,
    PingMessage
>;

// ============================================================================
// Serialization functions (implemented in protocol.cpp)
// ============================================================================

/**
 * Serialize a ClientMessage to JSON string
 */
std::string serialize_client_message(const ClientMessage& msg);

/**
 * Parse a JSON string into a ServerMessage
 */
ServerMessage parse_server_message(const std::string& json);

/**
 * Serialize a Value to Convex JSON format
 */
std::string serialize_value(const Value& value);

/**
 * Parse Convex JSON format into a Value
 */
Value parse_value(const std::string& json);

/**
 * Serialize function arguments to JSON array format
 */
std::string serialize_args(const Object& args);

} // namespace convex
