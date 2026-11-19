#pragma once

/**
 * Wearable feedback model: turns the result of the Convex `feedback:live`
 * query into what the 128x64 OLED shows for one paired participant.
 *
 * No Arduino dependencies, so it is unit-tested on the host
 * (`pio test -e native`). See docs/WEARABLE.md for the data contract.
 */

#include <cstdint>
#include <string>
#include <vector>
#include "../convex/value.hpp"

namespace feedback {

enum class Status {
    Loading,     // subscribed, no result yet
    NoSession,   // laptop relay published "no session" (or nothing ever)
    NotPaired,   // a session is running but this participant is not in it
    Active,      // participant found in the live session
    QueryError,  // the query failed (e.g. wrong read token)
};

struct Snapshot {
    Status status = Status::Loading;
    std::string participant;
    std::string session_id;
    std::string exercise;
    std::string station;
    std::string cue_code;
    std::string display_text;
    std::string cue;
    std::string error;
    int reps = 0;
    int target = 0;
    int range_score = -1;   // -1 = no completed attempts yet
    // From the full dashboard snapshot that accompanies the compact payload;
    // -1 when the relay sent no dashboard (older relays).
    int full = -1;          // reps that reached the exercise's range
    int short_reps = -1;    // reps that did not (counted, but not done properly)
    int tracking = -1;      // % of frames with a usable pose (tracking_coverage)
    double updated_at = 0;  // Convex row updatedAt (ms since epoch), 0 if none
};

/** Parse the value returned by `feedback:live` for `participant` (e.g. "P01"). */
Snapshot parse_live(const convex::Value& result, const std::string& participant);

/** Snapshot for a failed query. */
Snapshot from_error(const std::string& message, const std::string& participant);

/** Short exercise name for the header, e.g. "squat" -> "Squats". */
std::string exercise_label(const std::string& exercise_id);

/** Short cue (<= 16 chars): display_text, else derived from cue_code, else cue. */
std::string cue_text(const Snapshot& s);

/** Stats line (<= 21 chars), e.g. "Full 3 Short 1 75%". */
std::string stats(const Snapshot& s);

/**
 * One stat per OLED line (each <= 21 chars), drawn during a session and on
 * the end-of-session summary:
 *   "Reps:   4 / 8", "Good:   3", "Short:  1", "Range:  75%", "Track:  92%"
 * "-" marks a value the relay has not sent yet.
 */
std::vector<std::string> stat_lines(const Snapshot& s);

/** Truncate to `width` characters (OLED text is ASCII). */
std::string fit(const std::string& text, size_t width);

/**
 * Tracks whether the laptop relay is still alive. The relay re-publishes at
 * least every 2 s during a session (bumping updatedAt). Data counts as fresh
 * only if updatedAt changed within `timeout_ms`; the first value seen after
 * boot is not trusted until it changes, so an abandoned row from an hour ago
 * never shows as live. Uses unsigned millis() arithmetic (wrap-safe).
 */
class Freshness {
public:
    explicit Freshness(uint32_t timeout_ms = 6000) : timeout_ms_(timeout_ms) {}
    void observe(double updated_at, uint32_t now_ms);
    bool fresh(uint32_t now_ms) const;
    void reset() { seen_ = changed_ = false; }

private:
    uint32_t timeout_ms_;
    bool seen_ = false;
    bool changed_ = false;
    double last_updated_at_ = 0;
    uint32_t last_change_ms_ = 0;
};

enum class Link { WifiConnecting, ConvexConnecting, Online };

/** Shown whenever no session is running for this participant. */
extern const char* const NO_SESSION_TEXT;

/** Text content of one OLED frame. Empty `big` = no session stats shown. */
struct Screen {
    std::string header;  // size-1 text, <= 21 chars
    std::string big;     // "reps/target", <= 7 chars (non-empty = draw stat_lines)
    std::string sub;     // size-1 text; may hold '\n', each line <= 21 chars
    std::string footer;  // size-1 text, <= 21 chars
    bool operator==(const Screen& o) const {
        return header == o.header && big == o.big && sub == o.sub && footer == o.footer;
    }
    bool operator!=(const Screen& o) const { return !(*this == o); }
};

/** Decide what to draw. `fresh` comes from Freshness::fresh(). */
Screen render(const Snapshot& s, Link link, bool fresh, const std::string& participant);

/** Final results for a session that just ended, from its last active snapshot. */
Screen summary(const Snapshot& last);

}  // namespace feedback
