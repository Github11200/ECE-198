// Host unit tests for the Convex sync protocol layer (src/convex).
// Fixtures are real messages captured from a local `npx convex dev` backend.
// Run: pio test -e native

#include <unity.h>

#include <optional>
#include <regex>
#include <string>

#include "convex/base_client.hpp"
#include "convex/nlohmann_json.hpp"
#include "convex/protocol.hpp"
#include "convex/supervisor.hpp"
#include "convex/sync_endpoint.hpp"
#include "feedback/feedback.h"

using json = nlohmann::json;
using namespace convex;

static const char* TRANSITION_OK =
    R"({"type":"Transition","startVersion":{"querySet":0,"identity":0,"ts":"AAAAAAAAAAA="},)"
    R"("endVersion":{"querySet":1,"identity":0,"ts":"gQrcR3e26Bg="},"modifications":[)"
    R"({"type":"QueryUpdated","queryId":0,"value":{"dashboard":null,"session":{"exercise":"squat",)"
    R"("id":"smoke","participants":[{"cue":"Check your range","cue_code":"CHECK_RANGE",)"
    R"("display_text":"Check range","id":"P01","range_score":67.0,"reps":3.0,"target":8.0}],)"
    R"("source":"replay","station":"Station 1"},"updatedAt":1794885072032.0},"logLines":[],)"
    R"("journal":null}],"clientClockSkew":-1794885379462,"serverTs":1794885379467316928})";

static const char* TRANSITION_FAILED =
    R"({"type":"Transition","startVersion":{"querySet":0,"identity":0,"ts":"AAAAAAAAAAA="},)"
    R"("endVersion":{"querySet":1,"identity":0,"ts":"gQrcR3e26Bg="},"modifications":[)"
    R"({"type":"QueryFailed","queryId":0,"errorMessage":"[Request ID: 37a0291d77bb1159] Server )"
    R"(Error\nUncaught Error: Invalid feedback read token\n    at handler (../convex/feedback.js:55:16)\n",)"
    R"("logLines":[],"journal":null}],"clientClockSkew":-1794885383568,"serverTs":1794885383572773727})";

void setUp() {}
void tearDown() {}

static json client_json(const ClientMessage& m) { return json::parse(serialize_client_message(m)); }

// ------------------------------------------------------------ value codec --

void test_plain_json_numbers_are_float64() {
    Value v = parse_value(R"({"a":3,"b":3.5,"c":-1})");
    TEST_ASSERT_TRUE(v["a"].is_float64());
    TEST_ASSERT_EQUAL_DOUBLE(3.0, v["a"].as_float64());
    TEST_ASSERT_TRUE(v["b"].is_float64());
    TEST_ASSERT_TRUE(v["c"].is_float64());
}

void test_special_encodings_round_trip() {
    Value i = parse_value(R"({"$integer":"KgAAAAAAAAA="})");  // 42 little-endian
    TEST_ASSERT_TRUE(i.is_int64());
    TEST_ASSERT_EQUAL_INT64(42, i.as_int64());
    TEST_ASSERT_EQUAL_STRING(R"({"$integer":"KgAAAAAAAAA="})", serialize_value(Value(int64_t(42))).c_str());
    Value b = parse_value(R"({"$bytes":"AQID"})");
    TEST_ASSERT_TRUE(b.is_bytes());
    TEST_ASSERT_EQUAL(3, b.as_bytes().size());
    TEST_ASSERT_EQUAL_STRING(R"("hi")", serialize_value(Value("hi")).c_str());
}

// ------------------------------------------------------- client messages --

void test_connect_message_shape() {
    BaseConvexClient c;
    json j = client_json(c.connect_message("0b5a3f2e-1111-4222-8333-444455556666", 0, "InitialConnect"));
    TEST_ASSERT_EQUAL_STRING("Connect", j["type"].get<std::string>().c_str());
    TEST_ASSERT_EQUAL_STRING("0b5a3f2e-1111-4222-8333-444455556666", j["sessionId"].get<std::string>().c_str());
    TEST_ASSERT_EQUAL(0, j["connectionCount"].get<int>());
    TEST_ASSERT_TRUE(j["maxObservedTimestamp"].is_null());
}

void test_subscribe_emits_add_query() {
    BaseConvexClient c;
    auto [id, msg] = c.subscribe("feedback:live", Object{{"token", Value("secret")}},
                                 [](const SubscriberId&, const FunctionResult&) {});
    TEST_ASSERT_TRUE(msg.has_value());
    json j = client_json(*msg);
    TEST_ASSERT_EQUAL_STRING("ModifyQuerySet", j["type"].get<std::string>().c_str());
    TEST_ASSERT_EQUAL(0, j["baseVersion"].get<int>());
    TEST_ASSERT_EQUAL(1, j["newVersion"].get<int>());
    json mod = j["modifications"][0];
    TEST_ASSERT_EQUAL_STRING("Add", mod["type"].get<std::string>().c_str());
    TEST_ASSERT_EQUAL_STRING("feedback:live", mod["udfPath"].get<std::string>().c_str());
    TEST_ASSERT_EQUAL_STRING("secret", mod["args"][0]["token"].get<std::string>().c_str());
    TEST_ASSERT_EQUAL(0u, id.query_id);
}

void test_reconnect_replays_query_set_from_version_zero() {
    BaseConvexClient c;
    auto noop = [](const SubscriberId&, const FunctionResult&) {};
    auto a = c.subscribe("a:q", {}, noop);
    c.subscribe("b:q", {}, noop);
    c.unsubscribe(a.first);  // local query-set version is now 3

    auto msgs = c.reconnect_messages();
    TEST_ASSERT_EQUAL(1, msgs.size());
    json j = client_json(msgs[0]);
    TEST_ASSERT_EQUAL(0, j["baseVersion"].get<int>());
    TEST_ASSERT_EQUAL(1, j["newVersion"].get<int>());
    TEST_ASSERT_EQUAL(1, j["modifications"].size());
    TEST_ASSERT_EQUAL_STRING("b:q", j["modifications"][0]["udfPath"].get<std::string>().c_str());

    // A subscription added after reconnecting continues from version 1.
    auto [id, add] = c.subscribe("c:q", {}, noop);
    json k = client_json(*add);
    TEST_ASSERT_EQUAL(1, k["baseVersion"].get<int>());
    TEST_ASSERT_EQUAL(2, k["newVersion"].get<int>());
}

// ------------------------------------------------------- server messages --

void test_transition_delivers_value_to_subscriber() {
    BaseConvexClient c;
    std::optional<FunctionResult> got;
    int calls = 0;
    c.subscribe("feedback:live", Object{{"token", Value("t")}},
                [&](const SubscriberId&, const FunctionResult& r) {
                    got = r;
                    ++calls;
                });
    ServerMessage msg = parse_server_message(TRANSITION_OK);
    auto& t = std::get<TransitionMessage>(msg);
    TEST_ASSERT_EQUAL(1u, t.end_version.query_set);
    TEST_ASSERT_TRUE(t.end_version.ts > 0);
    TEST_ASSERT_TRUE(t.server_ts.has_value());

    c.handle_message(msg);
    TEST_ASSERT_EQUAL(1, calls);
    TEST_ASSERT_TRUE(got->is_success());

    // End to end: the delivered value drives the OLED model.
    auto s = feedback::parse_live(got->value, "P01");
    TEST_ASSERT_EQUAL(feedback::Status::Active, s.status);
    TEST_ASSERT_EQUAL(3, s.reps);
    TEST_ASSERT_EQUAL(8, s.target);
    TEST_ASSERT_TRUE(c.max_observed_timestamp().has_value());
}

void test_query_failure_delivers_error() {
    BaseConvexClient c;
    std::optional<FunctionResult> got;
    c.subscribe("feedback:live", Object{{"token", Value("wrong")}},
                [&](const SubscriberId&, const FunctionResult& r) { got = r; });
    c.handle_message(parse_server_message(TRANSITION_FAILED));
    TEST_ASSERT_TRUE(got.has_value());
    TEST_ASSERT_TRUE(got->is_error());
    auto s = feedback::from_error(got->error_message, "P01");
    TEST_ASSERT_EQUAL_STRING("Invalid feedback read token", s.error.c_str());
}

void test_updates_for_unknown_queries_are_ignored() {
    BaseConvexClient c;
    int calls = 0;
    c.subscribe("x:y", {}, [&](const SubscriberId&, const FunctionResult&) { ++calls; });
    std::string other = TRANSITION_OK;
    other.replace(other.find("\"queryId\":0"), 11, "\"queryId\":7");
    c.handle_message(parse_server_message(other));
    TEST_ASSERT_EQUAL(0, calls);
}

void test_ping_and_unknown_messages() {
    TEST_ASSERT_TRUE(std::holds_alternative<PingMessage>(parse_server_message(R"({"type":"Ping"})")));
    bool threw = false;
    try {
        parse_server_message(R"({"type":"SomethingNew"})");
    } catch (const std::exception&) {
        threw = true;
    }
    TEST_ASSERT_TRUE(threw);
    auto fatal = parse_server_message(R"({"type":"FatalError","errorMessage":"boom"})");
    TEST_ASSERT_EQUAL_STRING("boom", std::get<FatalErrorMessage>(fatal).error_message.c_str());
}

// ------------------------------------------------------- endpoint + UUID --

void test_sync_endpoint_parsing() {
    SyncEndpoint cloud = parse_sync_endpoint("https://happy-otter-123.convex.cloud");
    TEST_ASSERT_TRUE(cloud.ssl);
    TEST_ASSERT_EQUAL_STRING("happy-otter-123.convex.cloud", cloud.host.c_str());
    TEST_ASSERT_EQUAL(443, cloud.port);
    TEST_ASSERT_EQUAL_STRING("/api/sync", cloud.path.c_str());

    SyncEndpoint local = parse_sync_endpoint("http://10.39.28.214:3210/");
    TEST_ASSERT_FALSE(local.ssl);
    TEST_ASSERT_EQUAL_STRING("10.39.28.214", local.host.c_str());
    TEST_ASSERT_EQUAL(3210, local.port);
    TEST_ASSERT_EQUAL_STRING("/api/sync", local.path.c_str());

    SyncEndpoint explicit_path = parse_sync_endpoint("wss://h.example/api/1.0/sync");
    TEST_ASSERT_TRUE(explicit_path.ssl);
    TEST_ASSERT_EQUAL_STRING("/api/1.0/sync", explicit_path.path.c_str());
}

void test_session_id_is_uuid_v4() {
    uint8_t zeros[16] = {0};
    uint8_t ones[16];
    for (auto& b : ones) b = 0xFF;
    std::regex uuid("^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$");
    TEST_ASSERT_TRUE(std::regex_match(format_uuid_v4(zeros), uuid));
    TEST_ASSERT_TRUE(std::regex_match(format_uuid_v4(ones), uuid));
    TEST_ASSERT_EQUAL_STRING("00000000-0000-4000-8000-000000000000", format_uuid_v4(zeros).c_str());
}

// ------------------------------------------- mutations/actions (real wire) --

static const char* MUTATION_FAILED =
    R"({"type":"MutationResponse","requestId":0,"success":false,"result":"[Request ID: 97af86936f3599a8] )"
    R"(Server Error\nCould not find public function for 'feedback:nope'.\n","ts":null,"logLines":[]})";

void test_failed_mutation_response_is_an_error() {
    BaseConvexClient c;
    std::optional<FunctionResult> got;
    c.mutation("feedback:nope", {}, [&](SessionRequestSeqNumber, const FunctionResult& r) { got = r; });
    c.handle_message(parse_server_message(MUTATION_FAILED));
    TEST_ASSERT_TRUE(got.has_value());
    TEST_ASSERT_TRUE(got->is_error());
    TEST_ASSERT_TRUE(got->error_message.find("Could not find public function") != std::string::npos);
    TEST_ASSERT_EQUAL(0, c.pending_request_count());
}

void test_successful_mutation_response_and_error_data() {
    BaseConvexClient c;
    std::optional<FunctionResult> ok, err;
    c.mutation("a:b", {}, [&](SessionRequestSeqNumber, const FunctionResult& r) { ok = r; });
    c.mutation("a:c", {}, [&](SessionRequestSeqNumber, const FunctionResult& r) { err = r; });
    c.handle_message(parse_server_message(
        R"({"type":"MutationResponse","requestId":0,"success":true,"result":{"n":2},"ts":"AAAAAAAAAAA=","logLines":[]})"));
    c.handle_message(parse_server_message(
        R"({"type":"MutationResponse","requestId":1,"success":false,"result":"bad","errorData":{"code":7},"ts":null,"logLines":[]})"));
    TEST_ASSERT_TRUE(ok->is_success());
    TEST_ASSERT_EQUAL_DOUBLE(2.0, ok->value["n"].as_float64());
    TEST_ASSERT_TRUE(err->type == FunctionResult::Type::ConvexError);
    TEST_ASSERT_EQUAL_STRING("bad", err->error_message.c_str());
    TEST_ASSERT_EQUAL_DOUBLE(7.0, err->error_data["code"].as_float64());
}

void test_unacked_mutations_are_resent_after_reconnect() {
    BaseConvexClient c;
    c.subscribe("feedback:live", {}, [](const SubscriberId&, const FunctionResult&) {});
    c.mutation("m:first", Object{{"x", Value(1.0)}}, nullptr);
    c.mutation("m:second", {}, nullptr);
    c.handle_message(parse_server_message(
        R"({"type":"MutationResponse","requestId":0,"success":true,"result":null,"ts":null,"logLines":[]})"));
    c.handle_failure();  // connection lost with m:second in flight

    auto msgs = c.reconnect_messages();
    TEST_ASSERT_EQUAL(2, msgs.size());  // query set + one mutation
    TEST_ASSERT_TRUE(std::holds_alternative<ModifyQuerySetMessage>(msgs[0]));
    json m = client_json(msgs[1]);
    TEST_ASSERT_EQUAL_STRING("Mutation", m["type"].get<std::string>().c_str());
    TEST_ASSERT_EQUAL(1, m["requestId"].get<int>());  // same id -> server dedupes
    TEST_ASSERT_EQUAL_STRING("m:second", m["udfPath"].get<std::string>().c_str());
}

void test_in_flight_actions_fail_on_disconnect_but_mutations_survive() {
    BaseConvexClient c;
    std::optional<FunctionResult> action_result;
    bool mutation_called = false;
    c.action("a:run", {}, [&](SessionRequestSeqNumber, const FunctionResult& r) { action_result = r; });
    c.mutation("m:keep", {}, [&](SessionRequestSeqNumber, const FunctionResult&) { mutation_called = true; });
    c.handle_failure();
    TEST_ASSERT_TRUE(action_result.has_value());
    TEST_ASSERT_TRUE(action_result->is_error());
    TEST_ASSERT_FALSE(mutation_called);
    TEST_ASSERT_EQUAL(1, c.pending_request_count());
}

void test_callback_can_issue_new_request_without_deadlock() {
    BaseConvexClient c;
    bool chained = false;
    c.mutation("m:one", {}, [&](SessionRequestSeqNumber, const FunctionResult&) {
        c.mutation("m:two", {}, nullptr);  // would deadlock if called under the lock
        chained = true;
    });
    c.handle_message(parse_server_message(
        R"({"type":"MutationResponse","requestId":0,"success":true,"result":null,"ts":null,"logLines":[]})"));
    TEST_ASSERT_TRUE(chained);
    TEST_ASSERT_EQUAL(1, c.pending_request_count());
}

void test_reconnect_authenticates_before_resubscribing() {
    BaseConvexClient c;
    json first = client_json(c.authenticate(AuthenticationToken::user("jwt")));
    json second = client_json(c.authenticate(AuthenticationToken::user("jwt2")));
    TEST_ASSERT_EQUAL(0, first["baseVersion"].get<int>());
    TEST_ASSERT_EQUAL(1, second["baseVersion"].get<int>());
    c.subscribe("q:x", {}, [](const SubscriberId&, const FunctionResult&) {});
    auto msgs = c.reconnect_messages();
    TEST_ASSERT_EQUAL(2, msgs.size());
    json auth = client_json(msgs[0]);
    TEST_ASSERT_EQUAL_STRING("Authenticate", auth["type"].get<std::string>().c_str());
    TEST_ASSERT_EQUAL(0, auth["baseVersion"].get<int>());
    TEST_ASSERT_EQUAL_STRING("jwt2", auth["token"]["value"].get<std::string>().c_str());
    TEST_ASSERT_TRUE(std::holds_alternative<ModifyQuerySetMessage>(msgs[1]));
}

// ------------------------------------------------------------- supervisor --

using Cmd = ConnectionSupervisor::Command;
using St = ConnectionSupervisor::State;

static SupervisorConfig fast_config() {
    SupervisorConfig cfg;
    cfg.connect_timeout_ms = 1000;
    cfg.idle_timeout_ms = 3000;
    cfg.backoff_initial_ms = 100;
    cfg.backoff_max_ms = 800;
    return cfg;
}

void test_supervisor_waits_for_network_then_connects() {
    ConnectionSupervisor s(fast_config());
    TEST_ASSERT_TRUE(Cmd::None == s.tick(0, false));
    TEST_ASSERT_TRUE(St::NetworkDown == s.state());
    TEST_ASSERT_TRUE(Cmd::Open == s.tick(10, true));
    TEST_ASSERT_TRUE(Cmd::None == s.tick(20, true));
    s.socket_opened(30);
    TEST_ASSERT_TRUE(s.connected());
    TEST_ASSERT_EQUAL(1, s.connections());
}

void test_supervisor_backoff_grows_caps_and_resets() {
    ConnectionSupervisor s(fast_config());
    uint32_t t = 0;
    TEST_ASSERT_TRUE(Cmd::Open == s.tick(t, true));
    uint32_t expected[] = {100, 200, 400, 800, 800};
    for (uint32_t delay : expected) {
        s.socket_closed(t, "Connect failed");
        TEST_ASSERT_EQUAL(delay, s.next_delay_ms());
        TEST_ASSERT_TRUE(Cmd::None == s.tick(t + delay - 1, true));
        t += delay;
        TEST_ASSERT_TRUE(Cmd::Open == s.tick(t, true));
    }
    s.socket_opened(t);
    s.socket_closed(t + 10, "Connection lost");
    TEST_ASSERT_EQUAL(100, s.next_delay_ms());  // reset after a good connection
}

void test_supervisor_gives_up_on_hanging_connect() {
    ConnectionSupervisor s(fast_config());
    TEST_ASSERT_TRUE(Cmd::Open == s.tick(0, true));
    TEST_ASSERT_TRUE(Cmd::None == s.tick(999, true));
    TEST_ASSERT_TRUE(Cmd::Close == s.tick(1000, true));
    TEST_ASSERT_EQUAL_STRING("Connect timeout", s.last_close_reason());
    TEST_ASSERT_TRUE(Cmd::Open == s.tick(1100, true));
}

void test_supervisor_detects_silent_dead_connection() {
    ConnectionSupervisor s(fast_config());
    const char* lost = nullptr;
    s.on_lost([&](const char* r) { lost = r; });
    s.tick(0, true);
    s.socket_opened(0);
    s.message_received(2000);  // server Ping
    TEST_ASSERT_TRUE(Cmd::None == s.tick(4999, true));
    TEST_ASSERT_TRUE(Cmd::Close == s.tick(5000, true));
    TEST_ASSERT_EQUAL_STRING("No message from server", lost);
    TEST_ASSERT_TRUE(Cmd::Open == s.tick(5100, true));
}

void test_supervisor_wifi_drop_closes_and_reconnects_immediately() {
    ConnectionSupervisor s(fast_config());
    int lost_calls = 0;
    s.on_lost([&](const char*) { ++lost_calls; });
    s.tick(0, true);
    s.socket_opened(0);
    TEST_ASSERT_TRUE(Cmd::Close == s.tick(500, false));
    TEST_ASSERT_EQUAL(1, lost_calls);
    s.socket_closed(501, "Connection lost");  // late event from our own close: ignored
    TEST_ASSERT_EQUAL(1, lost_calls);
    TEST_ASSERT_TRUE(Cmd::None == s.tick(9000, false));  // stays quiet while offline
    TEST_ASSERT_TRUE(Cmd::Open == s.tick(9001, true));   // no backoff after Wi-Fi returns
    s.socket_opened(9100);
    TEST_ASSERT_EQUAL(2, s.connections());
}

void test_supervisor_retry_survives_millis_wraparound() {
    ConnectionSupervisor s(fast_config());
    uint32_t t = 0xFFFFFFF0u;
    s.tick(t, true);
    s.socket_closed(t, "Connect failed");  // retry at t + 100, past the wrap
    TEST_ASSERT_TRUE(Cmd::None == s.tick(0x00000010u, true));
    TEST_ASSERT_TRUE(Cmd::Open == s.tick(0x00000060u, true));
}

int main() {
    UNITY_BEGIN();
    RUN_TEST(test_plain_json_numbers_are_float64);
    RUN_TEST(test_special_encodings_round_trip);
    RUN_TEST(test_connect_message_shape);
    RUN_TEST(test_subscribe_emits_add_query);
    RUN_TEST(test_reconnect_replays_query_set_from_version_zero);
    RUN_TEST(test_transition_delivers_value_to_subscriber);
    RUN_TEST(test_query_failure_delivers_error);
    RUN_TEST(test_updates_for_unknown_queries_are_ignored);
    RUN_TEST(test_ping_and_unknown_messages);
    RUN_TEST(test_sync_endpoint_parsing);
    RUN_TEST(test_session_id_is_uuid_v4);
    RUN_TEST(test_failed_mutation_response_is_an_error);
    RUN_TEST(test_successful_mutation_response_and_error_data);
    RUN_TEST(test_unacked_mutations_are_resent_after_reconnect);
    RUN_TEST(test_in_flight_actions_fail_on_disconnect_but_mutations_survive);
    RUN_TEST(test_callback_can_issue_new_request_without_deadlock);
    RUN_TEST(test_reconnect_authenticates_before_resubscribing);
    RUN_TEST(test_supervisor_waits_for_network_then_connects);
    RUN_TEST(test_supervisor_backoff_grows_caps_and_resets);
    RUN_TEST(test_supervisor_gives_up_on_hanging_connect);
    RUN_TEST(test_supervisor_detects_silent_dead_connection);
    RUN_TEST(test_supervisor_wifi_drop_closes_and_reconnects_immediately);
    RUN_TEST(test_supervisor_retry_survives_millis_wraparound);
    return UNITY_END();
}
