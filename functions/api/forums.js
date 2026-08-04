import {
  canManageAccess,
  getSessionUser
} from "../_auth.js";
import {
  emailHasDynamicGroupAccess,
  emailsForGroups,
  expandAccessConfig,
  json,
  readAccessConfig
} from "../_access-control.js";

const THREAD_INDEX_KEY = "forums:threads:index:v1";
const THREAD_PREFIX = "forums:thread:";
const MAX_THREADS_IN_INDEX = 500;

const CATEGORIES = [
  {
    id: "general",
    label: "General",
    summary: "Open executive AI community discussion."
  },
  {
    id: "summits",
    label: "Summits",
    summary: "Dallas, future city summits, in-person planning, and follow-up."
  },
  {
    id: "virtual-events",
    label: "Virtual events",
    summary: "Roundtables, online sessions, and event-prep threads."
  },
  {
    id: "governance",
    label: "AI governance",
    summary: "Security, policy, adoption guardrails, and risk."
  },
  {
    id: "member-exchange",
    label: "Member exchange",
    summary: "Peer-to-peer operating questions and practical lessons."
  },
  {
    id: "partner-intelligence",
    label: "Partner intelligence",
    summary: "Partner insight, market movement, and strategic observations."
  }
];

const CATEGORY_IDS = new Set(CATEGORIES.map((category) => category.id));

function cleanText(value, max = 2000) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .trim()
    .slice(0, max);
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function publicAuthor(user = {}) {
  return {
    email: normalizeEmail(user.email),
    name: cleanText(user.name || user.email, 160)
  };
}

function publicThread(thread = {}, includeBody = false) {
  return {
    id: thread.id,
    title: thread.title,
    category: thread.category,
    author: thread.author,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    lastActivityAt: thread.lastActivityAt || thread.updatedAt || thread.createdAt,
    replyCount: Array.isArray(thread.replies) ? thread.replies.filter((reply) => !reply.deletedAt).length : Number(thread.replyCount || 0),
    isPinned: thread.isPinned === true,
    isClosed: thread.isClosed === true,
    deletedAt: thread.deletedAt || "",
    ...(includeBody
      ? {
          body: thread.body,
          replies: (Array.isArray(thread.replies) ? thread.replies : [])
            .filter((reply) => !reply.deletedAt)
            .map(publicReply)
        }
      : {})
  };
}

function publicReply(reply = {}) {
  return {
    id: reply.id,
    body: reply.body,
    author: reply.author,
    parentId: reply.parentId || "",
    depth: Number.isFinite(Number(reply.depth)) ? Number(reply.depth) : 0,
    createdAt: reply.createdAt,
    updatedAt: reply.updatedAt || reply.createdAt
  };
}

function threadSummary(thread = {}) {
  return publicThread(thread, false);
}

function sortThreads(threads = []) {
  return [...threads].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return String(b.lastActivityAt || b.updatedAt || b.createdAt).localeCompare(String(a.lastActivityAt || a.updatedAt || a.createdAt));
  });
}

async function requireStorage(env) {
  if (!env.MOJO_SUMMITS_SETUP_STATE) {
    throw new Error("MOJO_SUMMITS_SETUP_STATE is not configured.");
  }
  return env.MOJO_SUMMITS_SETUP_STATE;
}

async function readThreadIndex(env) {
  const kv = await requireStorage(env);
  const stored = await kv.get(THREAD_INDEX_KEY, "json").catch(() => []);
  return Array.isArray(stored) ? stored.filter((thread) => thread?.id) : [];
}

async function writeThreadIndex(env, threads) {
  const kv = await requireStorage(env);
  const next = sortThreads(threads)
    .filter((thread) => thread && thread.id)
    .slice(0, MAX_THREADS_IN_INDEX);
  await kv.put(THREAD_INDEX_KEY, JSON.stringify(next));
  return next;
}

async function readThread(env, id) {
  const safeId = cleanText(id, 80);
  if (!safeId) return null;
  const kv = await requireStorage(env);
  return kv.get(`${THREAD_PREFIX}${safeId}`, "json").catch(() => null);
}

async function writeThread(env, thread) {
  const kv = await requireStorage(env);
  await kv.put(`${THREAD_PREFIX}${thread.id}`, JSON.stringify(thread));

  const index = await readThreadIndex(env);
  const withoutThread = index.filter((entry) => entry.id !== thread.id);
  if (!thread.deletedAt) {
    await writeThreadIndex(env, [threadSummary(thread), ...withoutThread]);
  } else {
    await writeThreadIndex(env, withoutThread);
  }
}

async function forumViewer(request, env, data = {}) {
  const dataUser = data.auth?.email ? data.auth : null;
  const user = dataUser || await getSessionUser(request, env);
  if (!user?.email) {
    return {
      response: json({ error: "Sign in with a Mojo AI Summits account to use forums." }, { status: 401 })
    };
  }

  const normalizedEmail = normalizeEmail(user.email);
  const config = await readAccessConfig(env);
  const expanded = expandAccessConfig(config, env);
  const adminEmails = emailsForGroups(expanded.groups, ["admin"]);
  const teamEmails = emailsForGroups(expanded.groups, ["mojo-team"]);
  const isForumAdmin = canManageAccess(user) || adminEmails.includes(normalizedEmail);
  const isTeamMember = teamEmails.includes(normalizedEmail);
  const isCrmContact = await emailHasDynamicGroupAccess(env, normalizedEmail, ["guests-and-members"]);

  if (!isForumAdmin && !isTeamMember && !isCrmContact) {
    return {
      response: json(
        {
          error: "This account is not approved for Mojo AI Summits forums.",
          requiredAccess: ["Mojo team", "Guests and members", "Admin"]
        },
        { status: 403 }
      )
    };
  }

  return {
    user: {
      id: user.id || normalizedEmail,
      email: normalizedEmail,
      name: cleanText(user.name || normalizedEmail, 160),
      role: user.role || "member"
    },
    isForumAdmin,
    isTeamMember,
    isCrmContact
  };
}

function categoryForInput(value) {
  const category = cleanText(value, 80).toLowerCase();
  return CATEGORY_IDS.has(category) ? category : "general";
}

async function createThread(env, payload, viewer) {
  const title = cleanText(payload.title, 160);
  const body = cleanText(payload.body, 6000);
  if (title.length < 4) throw new Error("Add a thread title with at least 4 characters.");
  if (body.length < 8) throw new Error("Add a first post with at least 8 characters.");

  const now = new Date().toISOString();
  const thread = {
    id: crypto.randomUUID(),
    title,
    body,
    category: categoryForInput(payload.category),
    author: publicAuthor(viewer.user),
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
    isPinned: false,
    isClosed: false,
    deletedAt: "",
    deletedBy: "",
    replies: []
  };

  await writeThread(env, thread);
  return thread;
}

async function createReply(env, payload, viewer) {
  const thread = await readThread(env, payload.threadId);
  if (!thread || thread.deletedAt) throw new Error("Thread was not found.");
  if (thread.isClosed && !viewer.isForumAdmin) throw new Error("This thread is closed to new replies.");

  const body = cleanText(payload.body, 6000);
  if (body.length < 2) throw new Error("Add a reply before posting.");

  const replies = Array.isArray(thread.replies) ? thread.replies : [];
  const parentId = cleanText(payload.parentId || payload.parentReplyId, 80);
  const parentReply = parentId ? replies.find((reply) => reply.id === parentId && !reply.deletedAt) : null;
  if (parentId && !parentReply) throw new Error("Parent reply was not found.");
  const parentDepth = Number.isFinite(Number(parentReply?.depth)) ? Number(parentReply.depth) : 0;

  const now = new Date().toISOString();
  const reply = {
    id: crypto.randomUUID(),
    body,
    author: publicAuthor(viewer.user),
    parentId: parentReply?.id || "",
    depth: parentReply ? Math.min(parentDepth + 1, 3) : 0,
    createdAt: now,
    updatedAt: now,
    deletedAt: "",
    deletedBy: ""
  };

  const next = {
    ...thread,
    replies: [...replies, reply],
    updatedAt: now,
    lastActivityAt: now
  };
  await writeThread(env, next);
  return next;
}

async function moderateThread(env, payload, viewer) {
  if (!viewer.isForumAdmin) throw new Error("Only forum admins can moderate threads.");

  const thread = await readThread(env, payload.threadId);
  if (!thread) throw new Error("Thread was not found.");

  const now = new Date().toISOString();
  const action = cleanText(payload.moderationAction, 40);
  const next = {
    ...thread,
    updatedAt: now,
    moderatedAt: now,
    moderatedBy: viewer.user.email
  };

  if (action === "pin") next.isPinned = true;
  else if (action === "unpin") next.isPinned = false;
  else if (action === "close") next.isClosed = true;
  else if (action === "open") next.isClosed = false;
  else if (action === "delete") {
    next.deletedAt = now;
    next.deletedBy = viewer.user.email;
  } else if (action === "restore") {
    next.deletedAt = "";
    next.deletedBy = "";
  } else {
    throw new Error("Choose a valid moderation action.");
  }

  await writeThread(env, next);
  return next;
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      allow: "GET, POST, OPTIONS"
    }
  });
}

export async function onRequestGet({ request, env, data }) {
  const viewer = await forumViewer(request, env, data);
  if (viewer.response) return viewer.response;

  try {
    const url = new URL(request.url);
    const threadId = cleanText(url.searchParams.get("thread"), 80);

    if (threadId) {
      const thread = await readThread(env, threadId);
      if (!thread || thread.deletedAt) return json({ error: "Thread was not found." }, { status: 404 });
      return json({
        ok: true,
        user: viewer.user,
        isForumAdmin: viewer.isForumAdmin,
        categories: CATEGORIES,
        thread: publicThread(thread, true)
      });
    }

    const threads = (await readThreadIndex(env))
      .filter((thread) => !thread.deletedAt)
      .map((thread) => publicThread(thread, false));

    return json({
      ok: true,
      user: viewer.user,
      isForumAdmin: viewer.isForumAdmin,
      categories: CATEGORIES,
      threads: sortThreads(threads)
    });
  } catch (error) {
    return json({ error: error.message || "Forums could not be loaded." }, { status: 500 });
  }
}

export async function onRequestPost({ request, env, data }) {
  const viewer = await forumViewer(request, env, data);
  if (viewer.response) return viewer.response;

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return json({ error: "Send a valid forum request." }, { status: 400 });
  }

  try {
    const action = cleanText(payload.action, 40) || "create-thread";
    let thread;

    if (action === "create-thread") {
      thread = await createThread(env, payload, viewer);
    } else if (action === "create-reply") {
      thread = await createReply(env, payload, viewer);
    } else if (action === "moderate-thread") {
      thread = await moderateThread(env, payload, viewer);
    } else {
      return json({ error: "Unknown forum action." }, { status: 400 });
    }

    return json({
      ok: true,
      user: viewer.user,
      isForumAdmin: viewer.isForumAdmin,
      thread: publicThread(thread, true),
      threads: sortThreads((await readThreadIndex(env)).map((entry) => publicThread(entry, false)))
    }, { status: action === "create-thread" ? 201 : 200 });
  } catch (error) {
    const status = /Only forum admins|not approved/.test(error.message) ? 403 : 400;
    return json({ error: error.message || "Forum request could not be saved." }, { status });
  }
}
