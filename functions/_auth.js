const USER_INDEX_KEY = "auth:users:index:v1";
const USER_PREFIX = "auth:user:";
const INVITE_INDEX_KEY = "auth:invites:index:v1";
const INVITE_PREFIX = "auth:invite:";
const INVITE_TOKEN_PREFIX = "auth:invite-token:";
const SESSION_PREFIX = "auth:session:";
const SESSION_COOKIE = "mojo_auth";
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const INVITE_TTL_SECONDS = 7 * 24 * 60 * 60;
const PASSWORD_ITERATIONS = 100000;

const encoder = new TextEncoder();

function bytesToBase64(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function randomBase64(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64(bytes);
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

function cleanText(value, max = 240) {
  return String(value || "").trim().slice(0, max);
}

function timingSafeEqual(a, b) {
  const left = String(a || "");
  const right = String(b || "");
  let diff = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

async function sha256Base64(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToBase64(new Uint8Array(digest));
}

async function hashPassword(password, salt = randomBase64(16), iterations = PASSWORD_ITERATIONS) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(String(password || "")),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: base64ToBytes(salt),
      iterations
    },
    key,
    256
  );
  return `pbkdf2-sha256$${iterations}$${salt}$${bytesToBase64(new Uint8Array(bits))}`;
}

async function verifyPassword(password, storedHash) {
  const [algorithm, iterations, salt, expectedHash] = String(storedHash || "").split("$");
  if (algorithm !== "pbkdf2-sha256" || !iterations || !salt || !expectedHash) return false;

  const actual = await hashPassword(password, salt, Number(iterations));
  return timingSafeEqual(actual, storedHash);
}

function parseCookies(value) {
  return Object.fromEntries(
    String(value || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf("=");
        if (separator === -1) return [part, ""];
        return [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
      })
  );
}

function authDatabase(env) {
  return env.MOJO_AUTH_DB?.prepare ? env.MOJO_AUTH_DB : null;
}

function authKv(env) {
  return env.MOJO_SUMMITS_SETUP_STATE;
}

function requireAuthKv(env) {
  const kv = authKv(env);
  if (!kv) throw new Error("Mojo Auth storage is not configured.");
  return kv;
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name || "",
    role: user.role || "member",
    status: user.status || "active",
    createdAt: user.createdAt || user.created_at || "",
    updatedAt: user.updatedAt || user.updated_at || "",
    lastLoginAt: user.lastLoginAt || user.last_login_at || ""
  };
}

function publicInvite(invite) {
  if (!invite) return null;
  return {
    id: invite.id,
    email: invite.email,
    name: invite.name || "",
    role: invite.role || "member",
    status: invite.status || "pending",
    createdAt: invite.createdAt || invite.created_at || "",
    createdBy: invite.createdBy || invite.created_by || "",
    expiresAt: invite.expiresAt || invite.expires_at || "",
    acceptedAt: invite.acceptedAt || invite.accepted_at || "",
    revokedAt: invite.revokedAt || invite.revoked_at || ""
  };
}

function rowToUser(row) {
  return row
    ? {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        status: row.status,
        passwordHash: row.password_hash,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastLoginAt: row.last_login_at
      }
    : null;
}

function rowToInvite(row) {
  return row
    ? {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        status: row.status,
        tokenHash: row.token_hash,
        createdAt: row.created_at,
        createdBy: row.created_by,
        expiresAt: row.expires_at,
        acceptedAt: row.accepted_at,
        revokedAt: row.revoked_at
      }
    : null;
}

async function userIndex(env) {
  const stored = await authKv(env)?.get(USER_INDEX_KEY, "json").catch(() => null);
  return Array.isArray(stored) ? stored.map(normalizeEmail).filter(Boolean) : [];
}

async function inviteIndex(env) {
  const stored = await authKv(env)?.get(INVITE_INDEX_KEY, "json").catch(() => null);
  return Array.isArray(stored) ? stored.map(String).filter(Boolean) : [];
}

async function writeInviteIndex(env, ids) {
  const uniqueIds = [...new Set(ids.map(String).filter(Boolean))];
  await requireAuthKv(env).put(INVITE_INDEX_KEY, JSON.stringify(uniqueIds));
}

async function writeUserIndex(env, emails) {
  const uniqueEmails = [...new Set(emails.map(normalizeEmail).filter(Boolean))].sort();
  await requireAuthKv(env).put(USER_INDEX_KEY, JSON.stringify(uniqueEmails));
}

export async function countUsers(env) {
  const db = authDatabase(env);
  if (db) {
    const row = await db.prepare("SELECT COUNT(*) AS count FROM auth_users").first();
    return Number(row?.count || 0);
  }

  return (await userIndex(env)).length;
}

export async function listUsers(env) {
  const db = authDatabase(env);
  if (db) {
    const { results } = await db
      .prepare(
        "SELECT id, email, name, role, status, created_at, updated_at, last_login_at FROM auth_users ORDER BY email"
      )
      .all();
    return (results || []).map(rowToUser).map(publicUser);
  }

  const emails = await userIndex(env);
  const users = await Promise.all(emails.map((email) => getUserByEmail(env, email)));
  return users.filter(Boolean).map(publicUser).sort((a, b) => a.email.localeCompare(b.email));
}

export async function listInvites(env) {
  const db = authDatabase(env);
  if (db) {
    const { results } = await db
      .prepare(
        `SELECT id, email, name, role, status, token_hash, created_at, created_by, expires_at, accepted_at, revoked_at
         FROM auth_invites
         ORDER BY created_at DESC`
      )
      .all();
    return (results || []).map(rowToInvite).map(publicInvite);
  }

  const ids = await inviteIndex(env);
  const invites = await Promise.all(
    ids.map((id) => authKv(env)?.get(`${INVITE_PREFIX}${id}`, "json").catch(() => null))
  );
  return invites
    .filter(Boolean)
    .map(publicInvite)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export async function getUserByEmail(env, email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const db = authDatabase(env);
  if (db) {
    const row = await db
      .prepare("SELECT * FROM auth_users WHERE email = ?")
      .bind(normalizedEmail)
      .first();
    return rowToUser(row);
  }

  return authKv(env)?.get(`${USER_PREFIX}${normalizedEmail}`, "json").catch(() => null) || null;
}

async function getInviteByToken(env, token) {
  const tokenHash = await sha256Base64(token);
  const db = authDatabase(env);
  if (db) {
    return rowToInvite(
      await db
        .prepare("SELECT * FROM auth_invites WHERE token_hash = ?")
        .bind(tokenHash)
        .first()
    );
  }

  const id = await authKv(env)?.get(`${INVITE_TOKEN_PREFIX}${tokenHash}`).catch(() => null);
  if (!id) return null;
  return authKv(env)?.get(`${INVITE_PREFIX}${id}`, "json").catch(() => null) || null;
}

async function writeInvite(env, invite) {
  const db = authDatabase(env);
  if (db) {
    await db
      .prepare(
        `INSERT INTO auth_invites (
          id, email, name, role, status, token_hash, created_at, created_by, expires_at, accepted_at, revoked_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        invite.id,
        invite.email,
        invite.name,
        invite.role,
        invite.status,
        invite.tokenHash,
        invite.createdAt,
        invite.createdBy,
        invite.expiresAt,
        invite.acceptedAt || "",
        invite.revokedAt || ""
      )
      .run();
    return;
  }

  const ids = await inviteIndex(env);
  await requireAuthKv(env).put(`${INVITE_PREFIX}${invite.id}`, JSON.stringify(invite));
  await requireAuthKv(env).put(`${INVITE_TOKEN_PREFIX}${invite.tokenHash}`, invite.id, {
    expirationTtl: INVITE_TTL_SECONDS
  });
  await writeInviteIndex(env, [...ids, invite.id]);
}

async function updateInvite(env, invite) {
  const db = authDatabase(env);
  if (db) {
    await db
      .prepare(
        `UPDATE auth_invites
         SET status = ?, accepted_at = ?, revoked_at = ?
         WHERE id = ?`
      )
      .bind(invite.status, invite.acceptedAt || "", invite.revokedAt || "", invite.id)
      .run();
    return;
  }

  await requireAuthKv(env).put(`${INVITE_PREFIX}${invite.id}`, JSON.stringify(invite));
}

export async function createInvite(env, input = {}, actor = "", requestUrl = "") {
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) throw new Error("Enter a valid email address.");
  if (await getUserByEmail(env, email)) throw new Error("A user with that email already exists.");

  const token = `${crypto.randomUUID()}.${randomBase64(32)}`;
  const now = new Date();
  const invite = {
    id: crypto.randomUUID(),
    email,
    name: cleanText(input.name || email),
    role: ["owner", "admin", "member"].includes(input.role) ? input.role : "member",
    status: "pending",
    tokenHash: await sha256Base64(token),
    createdAt: now.toISOString(),
    createdBy: normalizeEmail(actor),
    expiresAt: new Date(now.getTime() + INVITE_TTL_SECONDS * 1000).toISOString(),
    acceptedAt: "",
    revokedAt: ""
  };

  await writeInvite(env, invite);
  const acceptUrl = requestUrl
    ? (() => {
        const url = new URL("/access/", requestUrl);
        url.searchParams.set("invite", token);
        return url.toString();
      })()
    : "";
  return { invite: publicInvite(invite), token, acceptUrl };
}

export async function createFirstOwnerInvite(env, requestUrl = "") {
  if ((await countUsers(env)) > 0) {
    throw new Error("The first owner account already exists.");
  }

  return createInvite(
    env,
    {
      email: "scott@mojoaisummits.com",
      name: "Scott",
      role: "owner"
    },
    "first-owner-invite",
    requestUrl
  );
}

export async function createUser(env, input = {}, actor = "") {
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) throw new Error("Enter a valid email address.");
  if (await getUserByEmail(env, email)) throw new Error("A user with that email already exists.");

  const password = String(input.password || "");
  if (password.length < 12) throw new Error("Password must be at least 12 characters.");

  const now = new Date().toISOString();
  const user = {
    id: crypto.randomUUID(),
    email,
    name: cleanText(input.name || email),
    role: ["owner", "admin", "member"].includes(input.role) ? input.role : "member",
    status: input.status === "disabled" ? "disabled" : "active",
    passwordHash: await hashPassword(password),
    createdAt: now,
    updatedAt: now,
    createdBy: normalizeEmail(actor)
  };

  const db = authDatabase(env);
  if (db) {
    await db
      .prepare(
        `INSERT INTO auth_users (
          id, email, name, role, status, password_hash, created_at, updated_at, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        user.id,
        user.email,
        user.name,
        user.role,
        user.status,
        user.passwordHash,
        user.createdAt,
        user.updatedAt,
        user.createdBy
      )
      .run();
    return publicUser(user);
  }

  const emails = await userIndex(env);
  await requireAuthKv(env).put(`${USER_PREFIX}${email}`, JSON.stringify(user));
  await writeUserIndex(env, [...emails, email]);
  return publicUser(user);
}

export async function invitePreview(env, token) {
  const invite = await getInviteByToken(env, token);
  if (!invite) throw new Error("Invite link is invalid.");
  if (invite.status !== "pending") throw new Error("Invite link has already been used or revoked.");
  if (new Date(invite.expiresAt).getTime() <= Date.now()) throw new Error("Invite link has expired.");
  if (await getUserByEmail(env, invite.email)) throw new Error("A user already exists for this invite.");
  return publicInvite(invite);
}

export async function acceptInvite(env, token, password) {
  const invite = await getInviteByToken(env, token);
  if (!invite) throw new Error("Invite link is invalid.");
  if (invite.status !== "pending") throw new Error("Invite link has already been used or revoked.");
  if (new Date(invite.expiresAt).getTime() <= Date.now()) throw new Error("Invite link has expired.");

  const user = await createUser(
    env,
    {
      email: invite.email,
      name: invite.name,
      role: invite.role,
      status: "active",
      password
    },
    invite.createdBy || "invite"
  );

  await updateInvite(env, {
    ...invite,
    status: "accepted",
    acceptedAt: new Date().toISOString()
  });

  return user;
}

export async function revokeInvite(env, id, actor = "") {
  const db = authDatabase(env);
  const invite = db
    ? rowToInvite(await db.prepare("SELECT * FROM auth_invites WHERE id = ?").bind(id).first())
    : await authKv(env)?.get(`${INVITE_PREFIX}${id}`, "json").catch(() => null);
  if (!invite) throw new Error("Invite was not found.");
  if (invite.status !== "pending") return publicInvite(invite);

  const next = {
    ...invite,
    status: "revoked",
    revokedAt: new Date().toISOString(),
    revokedBy: normalizeEmail(actor)
  };
  await updateInvite(env, next);
  return publicInvite(next);
}

export async function updateUser(env, email, input = {}, actor = "") {
  const normalizedEmail = normalizeEmail(email || input.email);
  const existing = await getUserByEmail(env, normalizedEmail);
  if (!existing) throw new Error("User was not found.");

  const now = new Date().toISOString();
  const next = {
    ...existing,
    name: input.name === undefined ? existing.name : cleanText(input.name || existing.email),
    role: ["owner", "admin", "member"].includes(input.role) ? input.role : existing.role,
    status: ["active", "disabled"].includes(input.status) ? input.status : existing.status,
    updatedAt: now,
    updatedBy: normalizeEmail(actor),
    lastLoginAt: input.lastLoginAt === undefined ? existing.lastLoginAt : cleanText(input.lastLoginAt, 80)
  };

  if (input.password) {
    if (String(input.password).length < 12) throw new Error("Password must be at least 12 characters.");
    next.passwordHash = await hashPassword(input.password);
  }

  const db = authDatabase(env);
  if (db) {
    await db
      .prepare(
        `UPDATE auth_users
         SET name = ?, role = ?, status = ?, password_hash = ?, updated_at = ?, updated_by = ?, last_login_at = ?
         WHERE email = ?`
      )
      .bind(
        next.name,
        next.role,
        next.status,
        next.passwordHash,
        now,
        next.updatedBy,
        next.lastLoginAt,
        normalizedEmail
      )
      .run();
    if (next.status === "disabled") await revokeUserSessions(env, normalizedEmail);
    return publicUser(next);
  }

  await requireAuthKv(env).put(`${USER_PREFIX}${normalizedEmail}`, JSON.stringify(next));
  if (next.status === "disabled") await revokeUserSessions(env, normalizedEmail);
  return publicUser(next);
}

export async function authenticateUser(env, email, password) {
  const user = await getUserByEmail(env, email);
  if (!user || user.status !== "active") return null;
  if (!(await verifyPassword(password, user.passwordHash))) return null;
  return user;
}

export async function createSession(env, user, userAgent = "") {
  const token = `${crypto.randomUUID()}.${randomBase64(32)}`;
  const tokenHash = await sha256Base64(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000).toISOString();
  const session = {
    id: crypto.randomUUID(),
    tokenHash,
    userEmail: user.email,
    createdAt: now.toISOString(),
    expiresAt,
    userAgent: cleanText(userAgent, 500)
  };

  const db = authDatabase(env);
  if (db) {
    await db
      .prepare(
        `INSERT INTO auth_sessions (
          id, token_hash, user_email, created_at, expires_at, user_agent
        ) VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(session.id, session.tokenHash, session.userEmail, session.createdAt, session.expiresAt, session.userAgent)
      .run();
    await db
      .prepare("UPDATE auth_users SET last_login_at = ? WHERE email = ?")
      .bind(session.createdAt, user.email)
      .run();
  } else {
    await requireAuthKv(env).put(`${SESSION_PREFIX}${tokenHash}`, JSON.stringify(session), {
      expirationTtl: SESSION_TTL_SECONDS
    });
    await updateUser(env, user.email, { lastLoginAt: session.createdAt }, user.email).catch(() => null);
  }

  return { token, session };
}

export async function getSessionUser(request, env) {
  const token = parseCookies(request.headers.get("cookie"))[SESSION_COOKIE];
  if (!token) return null;

  const tokenHash = await sha256Base64(token);
  const db = authDatabase(env);
  const session = db
    ? await db
        .prepare("SELECT * FROM auth_sessions WHERE token_hash = ?")
        .bind(tokenHash)
        .first()
    : await authKv(env)?.get(`${SESSION_PREFIX}${tokenHash}`, "json").catch(() => null);

  if (!session || new Date(session.expires_at || session.expiresAt || 0).getTime() <= Date.now()) {
    return null;
  }

  const email = session.user_email || session.userEmail;
  const user = await getUserByEmail(env, email);
  if (!user || user.status !== "active") return null;
  return publicUser(user);
}

export async function revokeSession(request, env) {
  const token = parseCookies(request.headers.get("cookie"))[SESSION_COOKIE];
  if (!token) return;

  const tokenHash = await sha256Base64(token);
  const db = authDatabase(env);
  if (db) {
    await db.prepare("DELETE FROM auth_sessions WHERE token_hash = ?").bind(tokenHash).run();
  } else {
    await authKv(env)?.delete(`${SESSION_PREFIX}${tokenHash}`);
  }
}

export async function revokeUserSessions(env, email) {
  const normalizedEmail = normalizeEmail(email);
  const db = authDatabase(env);
  if (db) {
    await db.prepare("DELETE FROM auth_sessions WHERE user_email = ?").bind(normalizedEmail).run();
  }
}

export function sessionCookie(token, request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${SESSION_TTL_SECONDS}; SameSite=Lax${secure}`;
}

export function clearSessionCookie(request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

export function canManageAccess(user) {
  return user?.role === "owner" || user?.role === "admin";
}

export function authStorageKind(env) {
  return authDatabase(env) ? "d1" : "kv";
}

export { SESSION_TTL_SECONDS };
