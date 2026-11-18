#pragma once

#include <cstdint>
#include <cstdio>
#include <string>

namespace convex {

/** Where a deployment URL's sync WebSocket lives. */
struct SyncEndpoint {
    std::string host;
    uint16_t port = 443;
    std::string path = "/api/sync";
    bool ssl = true;
};

/**
 * "https://x.convex.cloud"  -> wss  x.convex.cloud:443/api/sync
 * "http://10.0.0.5:3210"    -> ws   10.0.0.5:3210/api/sync
 */
inline SyncEndpoint parse_sync_endpoint(const std::string& url) {
    SyncEndpoint ep;
    std::string rest = url;
    size_t scheme_end = rest.find("://");
    if (scheme_end != std::string::npos) {
        std::string scheme = rest.substr(0, scheme_end);
        ep.ssl = (scheme == "https" || scheme == "wss");
        rest = rest.substr(scheme_end + 3);
    }
    ep.port = ep.ssl ? 443 : 80;

    size_t slash = rest.find('/');
    std::string authority = rest.substr(0, slash);
    std::string path = slash == std::string::npos ? "" : rest.substr(slash);
    while (!path.empty() && path.back() == '/') path.pop_back();

    size_t colon = authority.rfind(':');
    if (colon != std::string::npos) {
        ep.port = static_cast<uint16_t>(std::atoi(authority.substr(colon + 1).c_str()));
        authority = authority.substr(0, colon);
    }
    ep.host = authority;
    ep.path = path.find("/api/") == std::string::npos ? path + "/api/sync" : path;
    return ep;
}

/**
 * Format 16 random bytes as an RFC 4122 version-4 UUID string.
 * The Convex sync protocol requires `sessionId` to be a UUID.
 */
inline std::string format_uuid_v4(const uint8_t random_bytes[16]) {
    uint8_t b[16];
    for (int i = 0; i < 16; ++i) b[i] = random_bytes[i];
    b[6] = static_cast<uint8_t>((b[6] & 0x0F) | 0x40);  // version 4
    b[8] = static_cast<uint8_t>((b[8] & 0x3F) | 0x80);  // RFC 4122 variant
    char out[37];
    std::snprintf(out, sizeof(out),
                  "%02x%02x%02x%02x-%02x%02x-%02x%02x-%02x%02x-%02x%02x%02x%02x%02x%02x",
                  b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7], b[8], b[9], b[10],
                  b[11], b[12], b[13], b[14], b[15]);
    return std::string(out);
}

}  // namespace convex
