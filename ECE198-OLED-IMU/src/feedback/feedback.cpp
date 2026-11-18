#include "feedback.h"

#include <cmath>

namespace feedback {

namespace {

const convex::Value* field(const convex::Value& obj, const char* key) {
    if (!obj.is_object() || !obj.contains(key)) return nullptr;
    return &obj[key];
}

std::string get_string(const convex::Value& obj, const char* key) {
    const convex::Value* v = field(obj, key);
    return (v && v->is_string()) ? v->as_string() : std::string();
}

// JSON numbers decode as float64; int64 is accepted too for robustness.
bool get_number(const convex::Value& obj, const char* key, double& out) {
    const convex::Value* v = field(obj, key);
    if (!v) return false;
    if (v->is_float64()) {
        out = v->as_float64();
        return std::isfinite(out);
    }
    if (v->is_int64()) {
        out = static_cast<double>(v->as_int64());
        return true;
    }
    return false;
}

int get_int(const convex::Value& obj, const char* key, int fallback) {
    double d;
    return get_number(obj, key, d) ? static_cast<int>(std::lround(d)) : fallback;
}

}  // namespace

Snapshot parse_live(const convex::Value& result, const std::string& participant) {
    Snapshot s;
    s.participant = participant;
    s.status = Status::NoSession;

    // `live` returns null when the relay has never published.
    if (!result.is_object()) return s;
    get_number(result, "updatedAt", s.updated_at);

    const convex::Value* session = field(result, "session");
    if (!session || !session->is_object()) return s;

    s.session_id = get_string(*session, "id");
    s.exercise = get_string(*session, "exercise");
    s.station = get_string(*session, "station");

    const convex::Value* people = field(*session, "participants");
    if (!people || !people->is_array()) {
        s.status = Status::NotPaired;
        return s;
    }
    for (const convex::Value& p : people->as_array()) {
        if (get_string(p, "id") != participant) continue;
        s.status = Status::Active;
        s.reps = get_int(p, "reps", 0);
        s.target = get_int(p, "target", 0);
        s.range_score = get_int(p, "range_score", -1);
        s.cue_code = get_string(p, "cue_code");
        s.display_text = get_string(p, "display_text");
        s.cue = get_string(p, "cue");
        return s;
    }
    s.status = Status::NotPaired;
    return s;
}

Snapshot from_error(const std::string& message, const std::string& participant) {
    Snapshot s;
    s.status = Status::QueryError;
    s.participant = participant;
    // Server errors look like "[Request ID: ..] Server Error\nUncaught Error:
    // Invalid feedback read token\n    at handler (...)". Keep the useful part.
    std::string msg = message;
    const std::string marker = "Uncaught Error: ";
    size_t at = msg.find(marker);
    if (at != std::string::npos) msg = msg.substr(at + marker.size());
    size_t nl = msg.find('\n');
    if (nl != std::string::npos) msg = msg.substr(0, nl);
    s.error = msg;
    return s;
}

std::string exercise_label(const std::string& id) {
    struct Entry { const char* id; const char* label; };
    static const Entry table[] = {
        {"right_arm_curl", "R-arm curl"},  {"pushup", "Pushups"},
        {"squat", "Squats"},               {"knee_extension", "Knee ext."},
        {"shoulder_raise", "Shoulder raise"}, {"seated_march", "Seated march"},
        {"sit_to_stand", "Sit-to-stand"},
    };
    for (const Entry& e : table) {
        if (id == e.id) return e.label;
    }
    std::string out = id;
    for (char& c : out) {
        if (c == '_') c = ' ';
    }
    return out;
}

std::string cue_text(const Snapshot& s) {
    if (!s.display_text.empty()) return fit(s.display_text, 16);
    struct Entry { const char* code; const char* text; };
    static const Entry table[] = {
        {"READY", "Ready"},           {"RANGE_OK", "Range reached"},
        {"CHECK_RANGE", "Check range"}, {"TRACKING_LOST", "Tracking lost"},
        {"TARGET_REACHED", "Target reached"}, {"ABOVE_TARGET", "Above target"},
    };
    for (const Entry& e : table) {
        if (s.cue_code == e.code) return e.text;
    }
    return fit(s.cue, 16);
}

std::string fit(const std::string& text, size_t width) {
    return text.size() <= width ? text : text.substr(0, width);
}

void Freshness::observe(double updated_at, uint32_t now_ms) {
    if (!seen_) {
        seen_ = true;
        last_updated_at_ = updated_at;
        return;
    }
    if (updated_at != last_updated_at_) {
        last_updated_at_ = updated_at;
        last_change_ms_ = now_ms;
        changed_ = true;
    }
}

bool Freshness::fresh(uint32_t now_ms) const {
    return changed_ && static_cast<uint32_t>(now_ms - last_change_ms_) <= timeout_ms_;
}

Screen render(const Snapshot& s, Link link, bool fresh, const std::string& participant) {
    Screen screen;
    const bool had_live_data = s.status == Status::Active && fresh;

    if (link != Link::Online) {
        screen.header = participant;
        // Never leave a previous cue on screen as if it were current.
        screen.sub = had_live_data ? "Connection lost" : (link == Link::WifiConnecting
                                                            ? "Connecting Wi-Fi..."
                                                            : "Connecting server...");
        screen.footer = link == Link::WifiConnecting ? "Wi-Fi offline" : "Convex offline";
        return screen;
    }

    switch (s.status) {
        case Status::Loading:
            screen.header = participant;
            screen.sub = "Loading...";
            return screen;
        case Status::QueryError:
            screen.header = participant;
            screen.sub = "Server error";
            screen.footer = fit(s.error, 21);
            return screen;
        case Status::NoSession:
            screen.header = participant;
            screen.sub = "Waiting session";
            return screen;
        case Status::NotPaired:
            screen.header = participant;
            screen.sub = fresh ? "Not in session" : "Waiting session";
            screen.footer = fresh ? fit(s.station, 21) : "";
            return screen;
        case Status::Active:
            break;
    }

    if (!fresh) {
        screen.header = participant;
        screen.sub = "Waiting session";
        return screen;
    }

    screen.header = fit(participant + " " + exercise_label(s.exercise), 21);
    screen.big = fit(std::to_string(s.reps) + "/" + std::to_string(s.target), 7);
    screen.sub = s.range_score >= 0 ? "reps   range " + std::to_string(s.range_score) + "%" : "reps";
    screen.footer = cue_text(s);
    return screen;
}

}  // namespace feedback
