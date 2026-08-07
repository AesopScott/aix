// Room presence for Cloudflare Calls video, backed by the existing
// MOJO_SUMMITS_SETUP_STATE KV namespace (no dedicated Durable Object —
// this repo's Pages Functions are route-file based, not a single
// _worker.js entrypoint, so DO classes can't be exported from the bundle).
// KV read-modify-write is eventually consistent, which is an acceptable
// tradeoff for room sizes here; revisit with a standalone Worker + DO
// (service binding) if concurrent-join races become a real problem.
const PARTICIPANT_TTL_MS = 60_000;

function roomKey(slug) {
  return `virtual-event:${slug}:call-room`;
}

async function readRoom(env, slug) {
  const stored = (await env.MOJO_SUMMITS_SETUP_STATE.get(roomKey(slug), "json")) || {};
  const now = Date.now();
  let changed = false;
  for (const [id, p] of Object.entries(stored)) {
    if (now - p.lastSeen > PARTICIPANT_TTL_MS) {
      delete stored[id];
      changed = true;
    }
  }
  return { stored, changed };
}

async function writeRoom(env, slug, stored) {
  await env.MOJO_SUMMITS_SETUP_STATE.put(roomKey(slug), JSON.stringify(stored), {
    expirationTtl: 3600 // safety net if leave/cleanup never runs
  });
}

export async function joinRoom(env, slug, participantId, sessionId, trackNames) {
  const { stored } = await readRoom(env, slug);
  const others = Object.values(stored).filter((p) => p.participantId !== participantId);
  const now = Date.now();
  stored[participantId] = { participantId, sessionId, trackNames, joinedAt: now, lastSeen: now };
  await writeRoom(env, slug, stored);
  return others;
}

export async function leaveRoom(env, slug, participantId) {
  const { stored } = await readRoom(env, slug);
  delete stored[participantId];
  await writeRoom(env, slug, stored);
}

export async function listRoomParticipants(env, slug) {
  const { stored, changed } = await readRoom(env, slug);
  if (changed) await writeRoom(env, slug, stored);
  return Object.values(stored);
}
