import { json } from "./_access-control.js";

const TEAM_INDEX_KEY = "scheduling:employees:index:v1";
const EMPLOYEE_PREFIX = "scheduling:employee:";
const BOOKING_PREFIX = "scheduling:booking:";
const HOLD_PREFIX = "scheduling:hold:";
const HOLD_TTL_SECONDS = 10 * 60;

const DEFAULT_TIMEZONE = "America/Denver";
const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5];
const DEFAULT_MEETING_TYPE = {
  id: "intro",
  label: "Intro call",
  durationMinutes: 30,
  description: "A focused conversation with the Mojo team.",
  location: "Microsoft Teams"
};

function cleanText(value, max = 240) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
}

function cleanLongText(value, max = 2000) {
  return String(value || "").trim().replace(/\r/g, "").slice(0, max);
}

function cleanEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail(value));
}

function cleanSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function cleanTime(value, fallback) {
  const time = String(value || "").trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : fallback;
}

function minutesFromTime(value) {
  const [hours, minutes] = String(value || "00:00").split(":").map(Number);
  return hours * 60 + minutes;
}

function timeFromMinutes(value) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function cleanPositiveInteger(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(Math.round(number), min), max);
}

function requireStore(env) {
  if (!env.MOJO_SUMMITS_SETUP_STATE) {
    return json({ error: "Scheduling storage is not configured." }, { status: 500 });
  }
  return null;
}

function graphConfig(env) {
  const tenantId = cleanText(env.MOJO_MS_TENANT_ID || env.MICROSOFT_TENANT_ID || env.MS_TENANT_ID, 160);
  const clientId = cleanText(env.MOJO_MS_CLIENT_ID || env.MICROSOFT_CLIENT_ID || env.MS_CLIENT_ID, 160);
  const clientSecret = String(env.MOJO_MS_CLIENT_SECRET || env.MICROSOFT_CLIENT_SECRET || env.MS_CLIENT_SECRET || "");
  return {
    tenantId,
    clientId,
    clientSecret,
    configured: Boolean(tenantId && clientId && clientSecret)
  };
}

function publicEmployee(employee) {
  return {
    slug: employee.slug,
    name: employee.name,
    title: employee.title,
    bio: employee.bio,
    timezone: employee.timezone,
    active: employee.active,
    meetingTypes: employee.meetingTypes
  };
}

function sanitizeMeetingType(input = {}) {
  const id = cleanSlug(input.id || input.label || DEFAULT_MEETING_TYPE.id) || DEFAULT_MEETING_TYPE.id;
  return {
    id,
    label: cleanText(input.label || DEFAULT_MEETING_TYPE.label, 120),
    durationMinutes: cleanPositiveInteger(input.durationMinutes, DEFAULT_MEETING_TYPE.durationMinutes, 15, 240),
    description: cleanText(input.description || DEFAULT_MEETING_TYPE.description, 280),
    location: cleanText(input.location || DEFAULT_MEETING_TYPE.location, 120)
  };
}

export function sanitizeEmployee(input = {}) {
  const email = cleanEmail(input.email);
  const slug = cleanSlug(input.slug || input.name || email);
  const meetingTypes = Array.isArray(input.meetingTypes) && input.meetingTypes.length
    ? input.meetingTypes.map(sanitizeMeetingType)
    : [DEFAULT_MEETING_TYPE];

  return {
    slug,
    email,
    name: cleanText(input.name || email, 120),
    title: cleanText(input.title || "Mojo AI Summits", 160),
    bio: cleanText(input.bio || "", 320),
    timezone: cleanText(input.timezone || DEFAULT_TIMEZONE, 80),
    active: input.active !== false,
    workingDays: Array.isArray(input.workingDays)
      ? [...new Set(input.workingDays.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))]
      : DEFAULT_WORKING_DAYS,
    dayStart: cleanTime(input.dayStart, "09:00"),
    dayEnd: cleanTime(input.dayEnd, "17:00"),
    slotStepMinutes: cleanPositiveInteger(input.slotStepMinutes, 30, 5, 120),
    bufferBeforeMinutes: cleanPositiveInteger(input.bufferBeforeMinutes, 0, 0, 240),
    bufferAfterMinutes: cleanPositiveInteger(input.bufferAfterMinutes, 15, 0, 240),
    minNoticeHours: cleanPositiveInteger(input.minNoticeHours, 4, 0, 720),
    maxDaysAhead: cleanPositiveInteger(input.maxDaysAhead, 45, 1, 365),
    meetingTypes,
    updatedAt: new Date().toISOString()
  };
}

export async function listEmployees(env, { includeInactive = false } = {}) {
  const ids = await env.MOJO_SUMMITS_SETUP_STATE.get(TEAM_INDEX_KEY, "json").catch(() => null);
  const employees = await Promise.all(
    (Array.isArray(ids) ? ids : []).map((slug) =>
      env.MOJO_SUMMITS_SETUP_STATE.get(`${EMPLOYEE_PREFIX}${slug}`, "json").catch(() => null)
    )
  );
  return employees
    .filter((employee) => employee && (includeInactive || employee.active !== false))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getEmployee(env, slug) {
  const clean = cleanSlug(slug);
  if (!clean) return null;
  return env.MOJO_SUMMITS_SETUP_STATE.get(`${EMPLOYEE_PREFIX}${clean}`, "json").catch(() => null);
}

export async function saveEmployee(env, input, actor = "") {
  const employee = sanitizeEmployee(input);
  if (!employee.slug) throw new Error("Enter an employee slug or name.");
  if (!isValidEmail(employee.email)) throw new Error("Enter a valid employee calendar email.");
  if (minutesFromTime(employee.dayEnd) <= minutesFromTime(employee.dayStart)) {
    throw new Error("Working day end time must be later than the start time.");
  }

  const ids = await env.MOJO_SUMMITS_SETUP_STATE.get(TEAM_INDEX_KEY, "json").catch(() => null);
  const nextIds = [...new Set([...(Array.isArray(ids) ? ids : []), employee.slug])].sort();
  await env.MOJO_SUMMITS_SETUP_STATE.put(`${EMPLOYEE_PREFIX}${employee.slug}`, JSON.stringify({
    ...employee,
    updatedBy: cleanEmail(actor)
  }));
  await env.MOJO_SUMMITS_SETUP_STATE.put(TEAM_INDEX_KEY, JSON.stringify(nextIds));
  return employee;
}

function partsInZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hour = map.hour === "24" ? "00" : map.hour;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(hour),
    minute: Number(map.minute),
    second: Number(map.second)
  };
}

function zonedTimeToUtc(dateValue, timeValue, timeZone) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);
  const desiredUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  const trial = new Date(desiredUtc);
  const actual = partsInZone(trial, timeZone);
  const actualUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
  return new Date(desiredUtc + (desiredUtc - actualUtc));
}

function localDateKey(date, timeZone) {
  const parts = partsInZone(date, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function weekdayForLocalDate(dateValue, timeZone) {
  return zonedTimeToUtc(dateValue, "12:00", timeZone).toLocaleString("en-US", {
    timeZone,
    weekday: "short"
  });
}

function weekdayIndex(dateValue, timeZone) {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekdayForLocalDate(dateValue, timeZone));
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function overlaps(leftStart, leftEnd, rightStart, rightEnd) {
  return leftStart < rightEnd && leftEnd > rightStart;
}

function busyIntervalsFromSchedule(scheduleItems = [], employee) {
  return scheduleItems
    .map((item) => {
      const startValue = item.start?.dateTime;
      const endValue = item.end?.dateTime;
      if (!startValue || !endValue) return null;
      const start = new Date(startValue.endsWith("Z") ? startValue : `${startValue}Z`);
      const end = new Date(endValue.endsWith("Z") ? endValue : `${endValue}Z`);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
      return {
        start: new Date(start.getTime() - employee.bufferBeforeMinutes * 60000),
        end: new Date(end.getTime() + employee.bufferAfterMinutes * 60000)
      };
    })
    .filter(Boolean);
}

async function graphAccessToken(env) {
  const config = graphConfig(env);
  if (!config.configured) throw new Error("Microsoft Graph scheduling credentials are not configured.");

  const body = new URLSearchParams();
  body.set("client_id", config.clientId);
  body.set("client_secret", config.clientSecret);
  body.set("scope", "https://graph.microsoft.com/.default");
  body.set("grant_type", "client_credentials");

  const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || "Microsoft Graph token request failed.");
  }
  return payload.access_token;
}

async function graphSchedule(env, employee, start, end, durationMinutes) {
  const token = await graphAccessToken(env);
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(employee.email)}/calendar/getSchedule`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        schedules: [employee.email],
        startTime: { dateTime: start.toISOString(), timeZone: "UTC" },
        endTime: { dateTime: end.toISOString(), timeZone: "UTC" },
        availabilityViewInterval: durationMinutes
      })
    }
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error?.message || "Microsoft Graph availability lookup failed.");
  }
  return payload.value?.[0]?.scheduleItems || [];
}

function buildCandidateSlots(employee, dateValue, meetingType, busyIntervals = []) {
  if (!employee.workingDays.includes(weekdayIndex(dateValue, employee.timezone))) return [];

  const now = new Date();
  const minStart = new Date(now.getTime() + employee.minNoticeHours * 3600000);
  const maxStart = new Date(now.getTime() + employee.maxDaysAhead * 86400000);
  const slots = [];
  const dayStart = minutesFromTime(employee.dayStart);
  const dayEnd = minutesFromTime(employee.dayEnd);

  for (let minute = dayStart; minute + meetingType.durationMinutes <= dayEnd; minute += employee.slotStepMinutes) {
    const start = zonedTimeToUtc(dateValue, timeFromMinutes(minute), employee.timezone);
    const end = new Date(start.getTime() + meetingType.durationMinutes * 60000);
    if (start < minStart || start > maxStart) continue;
    if (localDateKey(start, employee.timezone) !== dateValue) continue;
    if (busyIntervals.some((busy) => overlaps(start, end, busy.start, busy.end))) continue;
    slots.push({
      start: start.toISOString(),
      end: end.toISOString(),
      label: new Intl.DateTimeFormat("en-US", {
        timeZone: employee.timezone,
        hour: "numeric",
        minute: "2-digit"
      }).format(start)
    });
  }

  return slots;
}

export async function availability(env, query) {
  const employee = await getEmployee(env, query.host || query.employee || query.slug);
  if (!employee || employee.active === false) {
    return { response: json({ error: "That employee booking page is not available." }, { status: 404 }) };
  }

  const meetingType = employee.meetingTypes.find((type) => type.id === cleanSlug(query.type)) || employee.meetingTypes[0];
  const dateValue = String(query.date || "");
  if (!validDate(dateValue)) {
    return { response: json({ error: "Choose a date in YYYY-MM-DD format." }, { status: 400 }) };
  }

  const dayStart = zonedTimeToUtc(dateValue, employee.dayStart, employee.timezone);
  const dayEnd = zonedTimeToUtc(dateValue, employee.dayEnd, employee.timezone);
  const graph = graphConfig(env);
  let source = "local-rules";
  let warning = graph.configured ? "" : "Microsoft Graph is not configured, so slots only reflect saved working hours.";
  let busyIntervals = [];

  if (graph.configured) {
    const scheduleItems = await graphSchedule(env, employee, dayStart, dayEnd, meetingType.durationMinutes);
    busyIntervals = busyIntervalsFromSchedule(scheduleItems, employee);
    source = "microsoft-graph";
    warning = "";
  }

  return {
    employee: publicEmployee(employee),
    meetingType,
    date: dateValue,
    source,
    warning,
    slots: buildCandidateSlots(employee, dateValue, meetingType, busyIntervals)
  };
}

async function createGraphEvent(env, employee, meetingType, booking, start, end) {
  const token = await graphAccessToken(env);
  const subject = `${meetingType.label}: ${booking.guestName}`;
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(employee.email)}/calendar/events`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        subject,
        body: {
          contentType: "Text",
          content: [
            `Booked through mojoaisummits.com.`,
            `Guest: ${booking.guestName} <${booking.guestEmail}>`,
            booking.company ? `Company: ${booking.company}` : "",
            booking.notes ? `Notes: ${booking.notes}` : ""
          ].filter(Boolean).join("\n")
        },
        start: { dateTime: start.toISOString(), timeZone: "UTC" },
        end: { dateTime: end.toISOString(), timeZone: "UTC" },
        location: { displayName: meetingType.location },
        attendees: [
          {
            emailAddress: {
              address: booking.guestEmail,
              name: booking.guestName
            },
            type: "required"
          }
        ],
        isOnlineMeeting: /teams/i.test(meetingType.location),
        onlineMeetingProvider: /teams/i.test(meetingType.location) ? "teamsForBusiness" : undefined
      })
    }
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error?.message || "Microsoft Graph event creation failed.");
  }
  return payload;
}

export async function createBooking(env, input = {}) {
  const graph = graphConfig(env);
  if (!graph.configured) {
    return { response: json({ error: "Microsoft Graph scheduling credentials are not configured yet." }, { status: 503 }) };
  }

  const employee = await getEmployee(env, input.host || input.employee || input.slug);
  if (!employee || employee.active === false) {
    return { response: json({ error: "That employee booking page is not available." }, { status: 404 }) };
  }

  const meetingType = employee.meetingTypes.find((type) => type.id === cleanSlug(input.type)) || employee.meetingTypes[0];
  const start = new Date(input.start);
  if (Number.isNaN(start.getTime())) return { response: json({ error: "Choose a valid slot." }, { status: 400 }) };

  const dateValue = localDateKey(start, employee.timezone);
  const available = await availability(env, {
    host: employee.slug,
    type: meetingType.id,
    date: dateValue
  });
  if (available.response) return { response: available.response };

  const slot = available.slots.find((candidate) => candidate.start === start.toISOString());
  if (!slot) return { response: json({ error: "That slot is no longer available." }, { status: 409 }) };

  const guestName = cleanText(input.guestName || input.name, 120);
  const guestEmail = cleanEmail(input.guestEmail || input.email);
  if (!guestName) return { response: json({ error: "Enter your name." }, { status: 400 }) };
  if (!isValidEmail(guestEmail)) return { response: json({ error: "Enter a valid email address." }, { status: 400 }) };

  const holdKey = `${HOLD_PREFIX}${employee.slug}:${meetingType.id}:${start.toISOString()}`;
  const existingHold = await env.MOJO_SUMMITS_SETUP_STATE.get(holdKey).catch(() => null);
  if (existingHold) return { response: json({ error: "That slot is already being booked. Choose another time." }, { status: 409 }) };
  await env.MOJO_SUMMITS_SETUP_STATE.put(holdKey, crypto.randomUUID(), { expirationTtl: HOLD_TTL_SECONDS });

  const end = new Date(start.getTime() + meetingType.durationMinutes * 60000);
  const booking = {
    id: crypto.randomUUID(),
    employeeSlug: employee.slug,
    employeeEmail: employee.email,
    meetingTypeId: meetingType.id,
    guestName,
    guestEmail,
    company: cleanText(input.company, 160),
    notes: cleanLongText(input.notes, 1200),
    start: start.toISOString(),
    end: end.toISOString(),
    timezone: employee.timezone,
    status: "confirmed",
    createdAt: new Date().toISOString()
  };

  try {
    const event = await createGraphEvent(env, employee, meetingType, booking, start, end);
    const record = {
      ...booking,
      graphEventId: event.id || "",
      graphWebLink: event.webLink || "",
      onlineMeetingUrl: event.onlineMeeting?.joinUrl || ""
    };

    const dateKey = record.start.slice(0, 10);
    await env.MOJO_SUMMITS_SETUP_STATE.put(`${BOOKING_PREFIX}${dateKey}:${record.id}`, JSON.stringify(record));

    return {
      ok: true,
      booking: {
        id: record.id,
        employee: publicEmployee(employee),
        meetingType,
        start: record.start,
        end: record.end,
        timezone: record.timezone,
        onlineMeetingUrl: record.onlineMeetingUrl
      }
    };
  } finally {
    await env.MOJO_SUMMITS_SETUP_STATE.delete(holdKey).catch(() => null);
  }
}

export { requireStore, publicEmployee, graphConfig };
