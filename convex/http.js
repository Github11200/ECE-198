import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const router = httpRouter();
const headers = { "Cache-Control": "no-store" };

/** @param {Request} request
 * @param {string | undefined} token */
function authorized(request, token) {
  return Boolean(token) && request.headers.get("Authorization") === `Bearer ${token}`;
}

router.route({
  path: "/feedback",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request, process.env.FEEDBACK_PUBLISH_TOKEN)) {
      return Response.json({ error: "Unauthorized" }, { status: 401, headers });
    }
    let payload;
    try {
      payload = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400, headers });
    }
    if (!payload || !Object.hasOwn(payload, "session")) {
      return Response.json({ error: "A session field is required" }, { status: 400, headers });
    }
    try { await ctx.runMutation(internal.feedback.publish, { session: payload.session, dashboard: payload.dashboard }); }
    catch { return Response.json({ error: "Invalid feedback payload" }, { status: 400, headers }); }
    return new Response(null, { status: 204, headers });
  }),
});

router.route({
  path: "/feedback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request, process.env.FEEDBACK_READ_TOKEN)) {
      return Response.json({ error: "Unauthorized" }, { status: 401, headers });
    }
    const participantId = new URL(request.url).searchParams.get("participant_id");
    if (participantId === null || !/^P(?:0[1-9]|[1-9][0-9])$/.test(participantId)) {
      return Response.json({ error: "Choose a numbered participant from P01 to P99" }, { status: 400, headers });
    }
    const feedback = await ctx.runQuery(internal.feedback.read, { participantId, now: Date.now() });
    return Response.json(feedback, { headers });
  }),
});

export default router;

router.route({
  path: "/archive", method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request, process.env.FEEDBACK_PUBLISH_TOKEN)) {
      return Response.json({ error: "Unauthorized" }, { status: 401, headers });
    }
    let payload;
    try { payload = await request.json(); }
    catch { return Response.json({ error: "Invalid JSON" }, { status: 400, headers }); }
    if (!payload?.event) return Response.json({ error: "An event is required" }, { status: 400, headers });
    try { await ctx.runMutation(internal.archive.ingest, { event: payload.event }); }
    catch (error) { console.error("Archive upload failed", error); return Response.json({ error: "Invalid archive event" }, { status: 400, headers }); }
    return new Response(null, { status: 204, headers });
  }),
});
