import { json } from "../../_access-control.js";
import { canManageAccess, getSessionUser } from "../../_auth.js";
import {
  delegatedGraphConfig,
  graphConfig,
  listPublicCalendarConnections,
  listEmployees,
  publicEmployee,
  requireStore,
  saveEmployee
} from "../../_scheduling.js";

function hasSchedulingAccess(user, data = {}) {
  return canManageAccess(user) || (
    data.auth?.accessControlEnabled === true &&
    data.auth?.email === user.email
  );
}

function graphCredentialState(graph = {}) {
  return {
    tenantIdConfigured: Boolean(graph.tenantId),
    clientIdConfigured: Boolean(graph.clientId),
    clientSecretConfigured: Boolean(graph.clientSecret)
  };
}

async function requireSchedulingAccess(request, env, data = {}) {
  const user = data?.auth?.email ? data.auth : await getSessionUser(request, env);
  if (!user) return { response: json({ error: "Sign in with a Mojo AI Summits account approved for scheduling." }, { status: 401 }) };
  if (!hasSchedulingAccess(user, data)) return { response: json({ error: "This account is not approved to manage scheduling." }, { status: 403 }) };
  return { user };
}

export async function onRequestGet({ request, env, data }) {
  const storageError = requireStore(env);
  if (storageError) return storageError;

  const access = await requireSchedulingAccess(request, env, data);
  if (access.response) return access.response;

  const employees = await listEmployees(env, { includeInactive: true });
  const graph = graphConfig(env);
  const delegatedGraph = delegatedGraphConfig(env);
  const employeePayloads = await Promise.all(employees.map(async (employee) => ({
      ...publicEmployee(employee),
      email: employee.email,
      busyCalendarEmails: employee.busyCalendarEmails || [],
      authenticatedCalendarEmails: employee.authenticatedCalendarEmails || [],
      busyCalendarUrls: employee.busyCalendarUrls || [],
      mirrorInviteEmails: employee.mirrorInviteEmails || [],
    connectedCalendars: await listPublicCalendarConnections(env, employee.slug),
    workingDays: employee.workingDays,
    dayStart: employee.dayStart,
    dayEnd: employee.dayEnd,
    slotStepMinutes: employee.slotStepMinutes,
    bufferBeforeMinutes: employee.bufferBeforeMinutes,
    bufferAfterMinutes: employee.bufferAfterMinutes,
    minNoticeHours: employee.minNoticeHours,
    maxDaysAhead: employee.maxDaysAhead
  })));

  return json({
    ok: true,
    graphConfigured: graph.configured,
    delegatedCalendarOAuthConfigured: delegatedGraph.configured,
    graphCredentials: graphCredentialState(graph),
    delegatedCalendarOAuthCredentials: graphCredentialState(delegatedGraph),
    employees: employeePayloads
  });
}

export async function onRequestPost({ request, env, data }) {
  const storageError = requireStore(env);
  if (storageError) return storageError;

  const access = await requireSchedulingAccess(request, env, data);
  if (access.response) return access.response;

  const input = await request.json().catch(() => null);
  if (!input || typeof input !== "object") {
    return json({ error: "Send employee settings as JSON." }, { status: 400 });
  }

  try {
    const employee = await saveEmployee(env, input, access.user.email);
    return json({ ok: true, employee });
  } catch (error) {
    return json({ error: error.message || "Unable to save employee scheduling settings." }, { status: 400 });
  }
}
