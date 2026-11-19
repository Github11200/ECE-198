// Host unit tests for the OLED feedback model (src/feedback).
// Run: pio test -e native

#include <unity.h>

#include "convex/protocol.hpp"
#include "feedback/feedback.h"

using convex::Value;
using feedback::Link;
using feedback::Status;

// Real `feedback:live` value as delivered by the local Convex backend.
static const char* LIVE_P01 =
    R"({"dashboard":null,"session":{"exercise":"squat","id":"smoke","participants":[)"
    R"({"cue":"Check your range","cue_code":"CHECK_RANGE","display_text":"Check range",)"
    R"("id":"P01","range_score":67.0,"reps":3.0,"target":8.0},)"
    R"({"cue":"Ready","cue_code":"READY","display_text":"Ready","id":"P02","range_score":null,)"
    R"("reps":0.0,"target":10.0}],"source":"replay","station":"Station 1"},)"
    R"("updatedAt":1794885072032.0})";

static feedback::Snapshot live(const char* json, const char* who = "P01") {
    return feedback::parse_live(convex::parse_value(json), who);
}

void setUp() {}
void tearDown() {}

// ---------------------------------------------------------------- parsing --

void test_null_result_means_no_session() {
    auto s = feedback::parse_live(Value(), "P01");
    TEST_ASSERT_EQUAL(Status::NoSession, s.status);
    TEST_ASSERT_EQUAL_STRING("P01", s.participant.c_str());
}

void test_null_session_means_no_session_but_keeps_timestamp() {
    auto s = live(R"({"updatedAt":1700000000000.0,"session":null,"dashboard":null})");
    TEST_ASSERT_EQUAL(Status::NoSession, s.status);
    TEST_ASSERT_EQUAL_DOUBLE(1700000000000.0, s.updated_at);
}

void test_participant_fields_parsed() {
    auto s = live(LIVE_P01);
    TEST_ASSERT_EQUAL(Status::Active, s.status);
    TEST_ASSERT_EQUAL(3, s.reps);
    TEST_ASSERT_EQUAL(8, s.target);
    TEST_ASSERT_EQUAL(67, s.range_score);
    TEST_ASSERT_EQUAL_STRING("CHECK_RANGE", s.cue_code.c_str());
    TEST_ASSERT_EQUAL_STRING("Check range", s.display_text.c_str());
    TEST_ASSERT_EQUAL_STRING("squat", s.exercise.c_str());
    TEST_ASSERT_EQUAL_STRING("Station 1", s.station.c_str());
    TEST_ASSERT_EQUAL_STRING("smoke", s.session_id.c_str());
    TEST_ASSERT_EQUAL_DOUBLE(1794885072032.0, s.updated_at);
}

void test_other_participant_and_null_range_score() {
    auto s = live(LIVE_P01, "P02");
    TEST_ASSERT_EQUAL(Status::Active, s.status);
    TEST_ASSERT_EQUAL(0, s.reps);
    TEST_ASSERT_EQUAL(10, s.target);
    TEST_ASSERT_EQUAL(-1, s.range_score);
}

void test_unlisted_participant_is_not_paired() {
    auto s = live(LIVE_P01, "P07");
    TEST_ASSERT_EQUAL(Status::NotPaired, s.status);
    TEST_ASSERT_EQUAL_STRING("Station 1", s.station.c_str());
}

void test_integer_typed_numbers_accepted() {
    convex::Object p{{"id", Value("P01")}, {"reps", Value(int64_t(4))}, {"target", Value(int64_t(9))}};
    convex::Object session{{"id", Value("s")}, {"participants", Value(convex::Array{Value(p)})}};
    convex::Object root{{"updatedAt", Value(5.0)}, {"session", Value(session)}};
    auto s = feedback::parse_live(Value(root), "P01");
    TEST_ASSERT_EQUAL(Status::Active, s.status);
    TEST_ASSERT_EQUAL(4, s.reps);
    TEST_ASSERT_EQUAL(9, s.target);
}

void test_missing_or_wrong_typed_fields_do_not_crash() {
    auto s = live(R"({"updatedAt":"soon","session":{"participants":[{"id":"P01","reps":"x"}]}})");
    TEST_ASSERT_EQUAL(Status::Active, s.status);
    TEST_ASSERT_EQUAL(0, s.reps);
    TEST_ASSERT_EQUAL(0, s.target);
    TEST_ASSERT_EQUAL(-1, s.range_score);
    TEST_ASSERT_EQUAL_DOUBLE(0.0, s.updated_at);

    auto t = live(R"({"session":{"id":"s"}})");
    TEST_ASSERT_EQUAL(Status::NotPaired, t.status);
}

void test_error_message_is_shortened() {
    auto s = feedback::from_error(
        "[Request ID: 37a0291d77bb1159] Server Error\nUncaught Error: Invalid feedback read token\n"
        "    at handler (../convex/feedback.js:55:16)\n",
        "P01");
    TEST_ASSERT_EQUAL(Status::QueryError, s.status);
    TEST_ASSERT_EQUAL_STRING("Invalid feedback read token", s.error.c_str());
    TEST_ASSERT_EQUAL_STRING("Plain", feedback::from_error("Plain", "P01").error.c_str());
}

// ------------------------------------------------------------------ labels --

void test_exercise_labels() {
    TEST_ASSERT_EQUAL_STRING("Squats", feedback::exercise_label("squat").c_str());
    TEST_ASSERT_EQUAL_STRING("R-arm curl", feedback::exercise_label("right_arm_curl").c_str());
    TEST_ASSERT_EQUAL_STRING("Sit-to-stand", feedback::exercise_label("sit_to_stand").c_str());
    TEST_ASSERT_EQUAL_STRING("new thing", feedback::exercise_label("new_thing").c_str());
}

void test_cue_text_prefers_display_text_then_code_then_cue() {
    feedback::Snapshot s;
    s.display_text = "Range reached";
    s.cue_code = "READY";
    TEST_ASSERT_EQUAL_STRING("Range reached", feedback::cue_text(s).c_str());
    s.display_text.clear();
    TEST_ASSERT_EQUAL_STRING("Ready", feedback::cue_text(s).c_str());
    s.cue_code = "SOMETHING_NEW";
    s.cue = "Check your range with the instructor";
    TEST_ASSERT_EQUAL_STRING("Check your range", feedback::cue_text(s).c_str());
    TEST_ASSERT_TRUE(feedback::cue_text(s).size() <= 16);
}

// --------------------------------------------------------------- freshness --

void test_first_value_is_not_trusted_until_it_changes() {
    feedback::Freshness f(6000);
    TEST_ASSERT_FALSE(f.fresh(0));
    f.observe(100.0, 1000);
    TEST_ASSERT_FALSE(f.fresh(1000));  // could be an abandoned row
    f.observe(100.0, 2000);            // resend after reconnect: same value
    TEST_ASSERT_FALSE(f.fresh(2000));
    f.observe(2100.0, 3000);  // relay heartbeat
    TEST_ASSERT_TRUE(f.fresh(3000));
    TEST_ASSERT_TRUE(f.fresh(9000));
    TEST_ASSERT_FALSE(f.fresh(9001));  // relay stopped > 6 s ago
    f.observe(4100.0, 9500);
    TEST_ASSERT_TRUE(f.fresh(9500));
}

void test_freshness_survives_millis_wraparound() {
    feedback::Freshness f(6000);
    f.observe(1.0, 0xFFFFF000u);
    f.observe(2.0, 0xFFFFFF00u);
    TEST_ASSERT_TRUE(f.fresh(0x00000100u));  // 512 ms later, after wrap
    TEST_ASSERT_FALSE(f.fresh(0x00002000u));
}

// ------------------------------------------------------------------ render --

void test_render_active_session() {
    auto sc = feedback::render(live(LIVE_P01), Link::Online, true, "P01");
    TEST_ASSERT_EQUAL_STRING("P01 Squats", sc.header.c_str());
    TEST_ASSERT_EQUAL_STRING("3/8", sc.big.c_str());
    TEST_ASSERT_EQUAL_STRING("reps   range 67%", sc.sub.c_str());
    TEST_ASSERT_EQUAL_STRING("Check range", sc.footer.c_str());
}

// Same payload with the dashboard snapshot the relay publishes alongside it.
static const char* LIVE_P01_DASHBOARD =
    R"({"dashboard":{"participants":[{"id":"P02","full":0.0,"short":0.0},)"
    R"({"id":"P01","full":3.0,"short":1.0,"tracking_coverage":92.0}]},)"
    R"("session":{"exercise":"right_arm_curl","id":"curl","participants":[)"
    R"({"cue":"Check your range","cue_code":"CHECK_RANGE","display_text":"Check range",)"
    R"("id":"P01","range_score":75.0,"reps":4.0,"target":8.0}],"source":"recording",)"
    R"("station":"Station 1"},"updatedAt":1794885072032.0})";

void test_dashboard_full_and_short_counts() {
    auto s = live(LIVE_P01_DASHBOARD);
    TEST_ASSERT_EQUAL(3, s.full);
    TEST_ASSERT_EQUAL(1, s.short_reps);
    auto sc = feedback::render(s, Link::Online, true, "P01");
    TEST_ASSERT_EQUAL_STRING("P01 R-arm curl", sc.header.c_str());
    TEST_ASSERT_EQUAL_STRING("4/8", sc.big.c_str());
    TEST_ASSERT_EQUAL_STRING("Full 3 Short 1 75%", sc.sub.c_str());
    TEST_ASSERT_EQUAL_STRING("Check range", sc.footer.c_str());

    auto old = live(LIVE_P01);  // no dashboard: counts unknown, old layout
    TEST_ASSERT_EQUAL(-1, old.full);
    TEST_ASSERT_EQUAL(-1, old.short_reps);
}

void test_stat_lines_for_the_oled() {
    auto lines = feedback::stat_lines(live(LIVE_P01_DASHBOARD));
    TEST_ASSERT_EQUAL(5, lines.size());
    TEST_ASSERT_EQUAL_STRING("Reps:   4 / 8", lines[0].c_str());
    TEST_ASSERT_EQUAL_STRING("Good:   3", lines[1].c_str());
    TEST_ASSERT_EQUAL_STRING("Short:  1", lines[2].c_str());
    TEST_ASSERT_EQUAL_STRING("Range:  75%", lines[3].c_str());
    TEST_ASSERT_EQUAL_STRING("Track:  92%", lines[4].c_str());

    auto unknown = feedback::stat_lines(live(LIVE_P01, "P02"));  // no dashboard, no range yet
    TEST_ASSERT_EQUAL_STRING("Reps:   0 / 10", unknown[0].c_str());
    TEST_ASSERT_EQUAL_STRING("Good:   -", unknown[1].c_str());
    TEST_ASSERT_EQUAL_STRING("Short:  -", unknown[2].c_str());
    TEST_ASSERT_EQUAL_STRING("Range:  -", unknown[3].c_str());
    TEST_ASSERT_EQUAL_STRING("Track:  -", unknown[4].c_str());

    feedback::Snapshot huge;
    huge.reps = huge.target = huge.full = huge.short_reps = huge.range_score = huge.tracking = 2147483647;
    for (const auto& line : feedback::stat_lines(huge)) TEST_ASSERT_TRUE(line.size() <= 21);
}

void test_summary_after_session_ends() {
    auto s = live(LIVE_P01_DASHBOARD);
    auto sc = feedback::summary(s);
    TEST_ASSERT_EQUAL_STRING("P01 Done", sc.header.c_str());
    TEST_ASSERT_EQUAL_STRING("4/8", sc.big.c_str());
    TEST_ASSERT_EQUAL_STRING("Full 3 Short 1 75%", sc.sub.c_str());
    TEST_ASSERT_EQUAL_STRING("Session ended", sc.footer.c_str());
    s.reps = 8;
    TEST_ASSERT_EQUAL_STRING("Target met", feedback::summary(s).footer.c_str());
}

void test_render_without_range_score() {
    auto sc = feedback::render(live(LIVE_P01, "P02"), Link::Online, true, "P02");
    TEST_ASSERT_EQUAL_STRING("0/10", sc.big.c_str());
    TEST_ASSERT_EQUAL_STRING("reps", sc.sub.c_str());
    TEST_ASSERT_EQUAL_STRING("Ready", sc.footer.c_str());
}

void test_render_stale_active_data_shows_waiting() {
    auto sc = feedback::render(live(LIVE_P01), Link::Online, false, "P01");
    TEST_ASSERT_EQUAL_STRING("No session\ncurrently going", sc.sub.c_str());
    TEST_ASSERT_TRUE(sc.big.empty());
    TEST_ASSERT_TRUE(sc.footer.empty());
}

void test_render_connection_lost_clears_cue() {
    auto sc = feedback::render(live(LIVE_P01), Link::ConvexConnecting, true, "P01");
    TEST_ASSERT_EQUAL_STRING("Connection lost", sc.sub.c_str());
    TEST_ASSERT_TRUE(sc.big.empty());
    TEST_ASSERT_EQUAL_STRING("Convex offline", sc.footer.c_str());

    auto boot = feedback::render(feedback::Snapshot{}, Link::WifiConnecting, false, "P01");
    TEST_ASSERT_EQUAL_STRING("Connecting Wi-Fi...", boot.sub.c_str());
    TEST_ASSERT_EQUAL_STRING("Wi-Fi offline", boot.footer.c_str());
}

void test_render_other_states() {
    auto loading = feedback::render(feedback::Snapshot{}, Link::Online, false, "P01");
    TEST_ASSERT_EQUAL_STRING("Loading...", loading.sub.c_str());

    auto none = feedback::render(feedback::parse_live(Value(), "P01"), Link::Online, false, "P01");
    TEST_ASSERT_EQUAL_STRING("No session\ncurrently going", none.sub.c_str());

    auto unpaired = feedback::render(live(LIVE_P01, "P07"), Link::Online, true, "P07");
    TEST_ASSERT_EQUAL_STRING("Not in session", unpaired.sub.c_str());
    TEST_ASSERT_EQUAL_STRING("Station 1", unpaired.footer.c_str());

    auto err = feedback::render(feedback::from_error("Uncaught Error: Invalid feedback read token", "P01"),
                                Link::Online, false, "P01");
    TEST_ASSERT_EQUAL_STRING("Server error", err.sub.c_str());
    TEST_ASSERT_EQUAL_STRING("Invalid feedback read", err.footer.c_str());
}

static bool lines_fit(const std::string& text, size_t width) {
    size_t start = 0;
    while (true) {
        size_t nl = text.find('\n', start);
        size_t end = nl == std::string::npos ? text.size() : nl;
        if (end - start > width) return false;
        if (nl == std::string::npos) return true;
        start = nl + 1;
    }
}

void test_render_always_fits_the_display() {
    feedback::Snapshot s;
    s.status = Status::Active;
    s.exercise = "an_exercise_with_a_very_long_identifier";
    s.reps = 123456;
    s.target = 9999999;
    s.range_score = 100;
    s.full = 123456;
    s.short_reps = 654321;
    s.display_text = "This message is much longer than sixteen characters";
    s.station = "A station name that is far too long";
    for (Link link : {Link::WifiConnecting, Link::ConvexConnecting, Link::Online}) {
        for (bool fresh : {false, true}) {
            auto sc = feedback::render(s, link, fresh, "P99");
            TEST_ASSERT_TRUE(sc.header.size() <= 21);
            TEST_ASSERT_TRUE(sc.big.size() <= 7);
            TEST_ASSERT_TRUE(lines_fit(sc.sub, 21));
            TEST_ASSERT_TRUE(sc.footer.size() <= 21);
        }
    }
    auto done = feedback::summary(s);
    TEST_ASSERT_TRUE(done.header.size() <= 21 && done.big.size() <= 7 && lines_fit(done.sub, 21));
}

int main() {
    UNITY_BEGIN();
    RUN_TEST(test_null_result_means_no_session);
    RUN_TEST(test_null_session_means_no_session_but_keeps_timestamp);
    RUN_TEST(test_participant_fields_parsed);
    RUN_TEST(test_other_participant_and_null_range_score);
    RUN_TEST(test_unlisted_participant_is_not_paired);
    RUN_TEST(test_integer_typed_numbers_accepted);
    RUN_TEST(test_missing_or_wrong_typed_fields_do_not_crash);
    RUN_TEST(test_error_message_is_shortened);
    RUN_TEST(test_exercise_labels);
    RUN_TEST(test_cue_text_prefers_display_text_then_code_then_cue);
    RUN_TEST(test_first_value_is_not_trusted_until_it_changes);
    RUN_TEST(test_freshness_survives_millis_wraparound);
    RUN_TEST(test_render_active_session);
    RUN_TEST(test_dashboard_full_and_short_counts);
    RUN_TEST(test_stat_lines_for_the_oled);
    RUN_TEST(test_summary_after_session_ends);
    RUN_TEST(test_render_without_range_score);
    RUN_TEST(test_render_stale_active_data_shows_waiting);
    RUN_TEST(test_render_connection_lost_clears_cue);
    RUN_TEST(test_render_other_states);
    RUN_TEST(test_render_always_fits_the_display);
    return UNITY_END();
}
