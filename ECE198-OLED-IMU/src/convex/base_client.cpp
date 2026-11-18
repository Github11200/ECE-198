#include "base_client.hpp"
#include "protocol.hpp"
#include <sstream>

namespace convex {

BaseConvexClient::BaseConvexClient() = default;
BaseConvexClient::~BaseConvexClient() = default;

std::string BaseConvexClient::make_query_token(
    const std::string& udf_path,
    const Object& args
) const {
    // Create a unique token for query deduplication
    std::ostringstream oss;
    oss << udf_path << ":";
    oss << serialize_args(args);
    return oss.str();
}

// ============================================================================
// Connection Management
// ============================================================================

ClientMessage BaseConvexClient::connect_message(
    const SessionId& session_id,
    uint32_t connection_count,
    const std::string& close_reason
) {
    ConnectMessage msg;
    msg.session_id = session_id;
    msg.connection_count = connection_count;
    msg.last_close_reason = close_reason;
    msg.max_observed_timestamp = max_observed_ts_;
    msg.client_ts = 0;  // We don't track client timestamps for now
    return msg;
}

std::vector<ClientMessage> BaseConvexClient::reconnect_messages() {
    std::lock_guard<std::mutex> lock(mutex_);
    std::vector<ClientMessage> messages;

    // A new WebSocket starts with identity version 0. Authenticate before
    // re-adding queries so they run as the right user.
    identity_version_ = 0;
    if (current_token_.type != AuthenticationToken::Type::None) {
        AuthenticateMessage auth_msg;
        auth_msg.base_version = identity_version_;
        auth_msg.token = current_token_;
        messages.push_back(auth_msg);
        identity_version_ = 1;
    }

    // ...and an empty query set: version 0 -> 1 containing every active
    // query (same as the official JS client).
    if (!query_set_.empty()) {
        ModifyQuerySetMessage msg;
        msg.base_version = 0;
        query_set_version_ = 1;
        msg.new_version = query_set_version_;

        for (const auto& [token, local_query] : query_set_) {
            QuerySetModification mod;
            mod.type = QuerySetModification::Type::Add;
            mod.query_id = local_query.id;

            Query q;
            q.query_id = local_query.id;
            q.udf_path = local_query.udf_path;
            q.args_json = serialize_args(local_query.args);
            mod.query = q;

            msg.modifications.push_back(std::move(mod));
        }
        messages.push_back(msg);
    } else {
        query_set_version_ = 0;
    }

    // Resend unacknowledged mutations in their original order.
    for (const auto& [request_id, req] : pending_requests_) {
        if (req.type != PendingRequest::Type::Mutation) continue;
        MutationMessage m;
        m.request_id = request_id;
        m.udf_path = req.udf_path;
        m.args_json = req.args_json;
        messages.push_back(m);
    }

    return messages;
}

// ============================================================================
// Query Subscriptions
// ============================================================================

std::pair<SubscriberId, std::optional<ClientMessage>> BaseConvexClient::subscribe(
    const std::string& udf_path,
    const Object& args,
    QueryCallback callback
) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    std::string token = make_query_token(udf_path, args);
    
    // Check if already subscribed to this query
    auto it = query_set_.find(token);
    if (it != query_set_.end()) {
        // Add another subscriber to existing query
        LocalQuery& lq = it->second;
        lq.num_subscribers++;
        lq.subscription_index++;
        
        SubscriberId sub_id{lq.id, lq.subscription_index};
        subscribers_.insert(sub_id);
        subscriber_callbacks_[sub_id] = std::move(callback);
        
        // If we already have a result, call the callback immediately
        auto result_it = latest_results_.find(lq.id);
        if (result_it != latest_results_.end()) {
            subscriber_callbacks_[sub_id](sub_id, result_it->second);
        }
        
        return {sub_id, std::nullopt};
    }
    
    // New subscription
    QueryId query_id = next_query_id_++;
    QuerySetVersion base_version = query_set_version_;
    QuerySetVersion new_version = ++query_set_version_;
    
    LocalQuery lq;
    lq.id = query_id;
    lq.udf_path = udf_path;
    lq.args = args;
    lq.num_subscribers = 1;
    lq.subscription_index = 0;
    
    query_set_[token] = lq;
    query_id_to_token_[query_id] = token;
    
    SubscriberId sub_id{query_id, 0};
    subscribers_.insert(sub_id);
    subscriber_callbacks_[sub_id] = std::move(callback);
    
    // Create the ModifyQuerySet message
    ModifyQuerySetMessage msg;
    msg.base_version = base_version;
    msg.new_version = new_version;
    
    QuerySetModification mod;
    mod.type = QuerySetModification::Type::Add;
    mod.query_id = query_id;
    
    Query q;
    q.query_id = query_id;
    q.udf_path = udf_path;
    q.args_json = serialize_args(args);
    mod.query = q;
    
    msg.modifications.push_back(std::move(mod));
    
    return {sub_id, msg};
}

std::optional<ClientMessage> BaseConvexClient::unsubscribe(const SubscriberId& subscriber_id) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    auto sub_it = subscribers_.find(subscriber_id);
    if (sub_it == subscribers_.end()) {
        return std::nullopt;  // Already unsubscribed
    }
    
    subscribers_.erase(sub_it);
    subscriber_callbacks_.erase(subscriber_id);
    
    // Find the query
    auto token_it = query_id_to_token_.find(subscriber_id.query_id);
    if (token_it == query_id_to_token_.end()) {
        return std::nullopt;
    }
    
    auto query_it = query_set_.find(token_it->second);
    if (query_it == query_set_.end()) {
        return std::nullopt;
    }
    
    LocalQuery& lq = query_it->second;
    lq.num_subscribers--;
    
    // If still has subscribers, don't remove from server
    if (lq.num_subscribers > 0) {
        return std::nullopt;
    }
    
    // Remove the query
    QueryId query_id = lq.id;
    std::string token = token_it->second;
    
    query_set_.erase(query_it);
    query_id_to_token_.erase(token_it);
    latest_results_.erase(query_id);
    
    // Create Remove message
    QuerySetVersion base_version = query_set_version_;
    QuerySetVersion new_version = ++query_set_version_;
    
    ModifyQuerySetMessage msg;
    msg.base_version = base_version;
    msg.new_version = new_version;
    
    QuerySetModification mod;
    mod.type = QuerySetModification::Type::Remove;
    mod.query_id = query_id;
    msg.modifications.push_back(mod);
    
    return msg;
}

std::optional<FunctionResult> BaseConvexClient::get_result(const SubscriberId& subscriber_id) const {
    std::lock_guard<std::mutex> lock(mutex_);
    
    if (subscribers_.count(subscriber_id) == 0) {
        return std::nullopt;
    }
    
    auto it = latest_results_.find(subscriber_id.query_id);
    if (it == latest_results_.end()) {
        return std::nullopt;
    }
    
    return it->second;
}

// ============================================================================
// Mutations and Actions
// ============================================================================

ClientMessage BaseConvexClient::mutation(
    const std::string& udf_path,
    const Object& args,
    MutationCallback callback
) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    SessionRequestSeqNumber request_id = next_request_id_++;
    
    PendingRequest req;
    req.type = PendingRequest::Type::Mutation;
    req.request_id = request_id;
    req.on_complete = std::move(callback);
    req.udf_path = udf_path;
    req.args_json = serialize_args(args);

    MutationMessage msg;
    msg.request_id = request_id;
    msg.udf_path = udf_path;
    msg.args_json = req.args_json;
    pending_requests_[request_id] = std::move(req);
    
    return msg;
}

ClientMessage BaseConvexClient::action(
    const std::string& udf_path,
    const Object& args,
    ActionCallback callback
) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    SessionRequestSeqNumber request_id = next_request_id_++;
    
    PendingRequest req;
    req.type = PendingRequest::Type::Action;
    req.request_id = request_id;
    req.on_complete = std::move(callback);
    req.udf_path = udf_path;
    req.args_json = serialize_args(args);

    ActionMessage msg;
    msg.request_id = request_id;
    msg.udf_path = udf_path;
    msg.args_json = req.args_json;
    pending_requests_[request_id] = std::move(req);
    
    return msg;
}

// ============================================================================
// Authentication
// ============================================================================

void BaseConvexClient::set_auth_fetcher(AuthCallback fetcher) {
    std::lock_guard<std::mutex> lock(mutex_);
    auth_fetcher_ = std::move(fetcher);
}

ClientMessage BaseConvexClient::authenticate(const AuthenticationToken& token) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    current_token_ = token;
    
    AuthenticateMessage msg;
    msg.base_version = identity_version_++;
    msg.token = token;
    return msg;
}

ClientMessage BaseConvexClient::clear_auth() {
    return authenticate(AuthenticationToken::none());
}

// ============================================================================
// Message Handling
// ============================================================================

void BaseConvexClient::handle_message(const ServerMessage& message) {
    std::visit([this](auto&& msg) {
        using T = std::decay_t<decltype(msg)>;
        
        if constexpr (std::is_same_v<T, TransitionMessage>) {
            // Update max observed timestamp
            if (msg.end_version.ts > max_observed_ts_.value_or(0)) {
                max_observed_ts_ = msg.end_version.ts;
            }
            
            // Process modifications
            for (const auto& mod : msg.modifications) {
                auto token_it = query_id_to_token_.find(mod.query_id);
                if (token_it == query_id_to_token_.end()) {
                    continue;  // Unknown query, ignore
                }
                
                FunctionResult result;
                
                switch (mod.type) {
                    case StateModification::Type::QueryUpdated:
                        result = FunctionResult::success(
                            mod.value.value_or(Value())
                        );
                        break;
                        
                    case StateModification::Type::QueryFailed:
                        if (mod.error_data) {
                            result = FunctionResult::convex_error(
                                mod.error_message.value_or("Query failed"),
                                *mod.error_data
                            );
                        } else {
                            result = FunctionResult::error(
                                mod.error_message.value_or("Query failed")
                            );
                        }
                        break;
                        
                    case StateModification::Type::QueryRemoved:
                        // Query was removed, nothing to do
                        continue;
                }
                
                // Store the result
                {
                    std::lock_guard<std::mutex> lock(mutex_);
                    latest_results_[mod.query_id] = result;
                }
                
                // Notify all subscribers
                for (const auto& sub_id : subscribers_) {
                    if (sub_id.query_id == mod.query_id) {
                        auto cb_it = subscriber_callbacks_.find(sub_id);
                        if (cb_it != subscriber_callbacks_.end()) {
                            cb_it->second(sub_id, result);
                        }
                    }
                }
            }
        }
        else if constexpr (std::is_same_v<T, MutationResponseMessage>) {
            complete_request(msg.request_id, msg.success, msg.result, msg.error);
        }
        else if constexpr (std::is_same_v<T, ActionResponseMessage>) {
            complete_request(msg.request_id, msg.success, msg.result, msg.error);
        }
        else if constexpr (std::is_same_v<T, AuthErrorMessage>) {
            // Handle auth error - could trigger re-authentication
            // For now, just log and ignore
        }
        else if constexpr (std::is_same_v<T, FatalErrorMessage>) {
            // Fatal error - connection will be closed
            // The transport layer should handle reconnection
        }
        else if constexpr (std::is_same_v<T, PingMessage>) {
            // Nothing to do for ping
        }
    }, message);
}

void BaseConvexClient::complete_request(SessionRequestSeqNumber request_id, bool success,
                                        const std::optional<Value>& result,
                                        const std::optional<ErrorPayload>& error) {
    MutationCallback callback;
    {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = pending_requests_.find(request_id);
        if (it == pending_requests_.end()) return;  // duplicate or unknown
        callback = std::move(it->second.on_complete);
        pending_requests_.erase(it);
    }
    FunctionResult r;
    if (success) {
        r = FunctionResult::success(result.value_or(Value()));
    } else if (error && error->data) {
        r = FunctionResult::convex_error(error->message, *error->data);
    } else {
        r = FunctionResult::error(error ? error->message : "Request failed");
    }
    // Outside the lock: a callback may issue another request.
    if (callback) callback(request_id, r);
}

void BaseConvexClient::handle_failure() {
    std::vector<std::pair<SessionRequestSeqNumber, MutationCallback>> failed;
    {
        std::lock_guard<std::mutex> lock(mutex_);
        for (auto it = pending_requests_.begin(); it != pending_requests_.end();) {
            if (it->second.type == PendingRequest::Type::Action) {
                failed.emplace_back(it->first, std::move(it->second.on_complete));
                it = pending_requests_.erase(it);
            } else {
                ++it;  // mutations are resent by reconnect_messages()
            }
        }
    }
    for (auto& [request_id, callback] : failed) {
        if (callback) {
            callback(request_id, FunctionResult::error("Connection lost while action was in flight"));
        }
    }
}

} // namespace convex
