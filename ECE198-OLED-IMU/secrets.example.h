#pragma once
// Copy to secrets.h (git-ignored) and fill in. Never commit secrets.h.

// ---- Wi-Fi ----------------------------------------------------------------
#define WIFI_SSID "eduroam"
// WPA2-Enterprise (eduroam, PEAP/MSCHAPv2): set identity + password.
// For a normal WPA2-PSK network (e.g. a phone hotspot) leave WIFI_EAP_IDENTITY
// empty and put the network password in WIFI_PASSWORD.
#define WIFI_EAP_IDENTITY ""   // e.g. "userid@uwaterloo.ca"
#define WIFI_PASSWORD ""

// ---- Convex ---------------------------------------------------------------
// Cloud: "https://<deployment>.convex.cloud"
// Local `npx convex dev` backend: "http://<laptop LAN IP>:3210"
#define CONVEX_URL "https://your-deployment.convex.cloud"
// Same value as FEEDBACK_READ_TOKEN on the deployment (`npx convex env get`).
#define FEEDBACK_READ_TOKEN ""

// ---- Pairing --------------------------------------------------------------
#define PARTICIPANT_ID "P01"
