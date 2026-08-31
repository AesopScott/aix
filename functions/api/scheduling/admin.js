import { json } from "../../_access-control.js";
import { canManageAccess, getSessionUser } from "../../_auth.js";
import {
  delegatedGraphConfig,
  graphConfig,
  listPublicCalendarConnections,
  listEmployees,
  publicEmployee,
  requireStore,
  retryFailedBookingConfirmations,
  saveEmployee
} from "../../_scheduling.js";

function hasSchedulingAccess(user, data = {}) {
  return canManageAccess(user) || (
    data.auth?.accessControlEnabled === true &&
    data.auth?.email === user.email
  );
}

const graphCredentialNames = {
  tenantId: ["MOJO_MS_TENANT_ID", "MOJO_MAIL_TENANT_ID", "MICROSOFT_TENANT_ID", "MS_TENANT_ID"],
  clientId: ["MOJO_MS_CLIENT_ID", "MOJO_MAIL_CLIENT_ID", "MICROSOFT_CLIENT_ID", "MS_CLIENT_ID"],
  clientSecret: ["MOJO_MS_CLIENT_SECRET", "MOJO_MAIL_CLIENT_SECRET", "MICROSOFT_CLIENT_SECRET", "MS_CLIENT_SECRET"]
};

const delegatedGraphCredentialNames = {
  tenantId: ["MOJO_MS_DELEGATED_TENANT_ID", "MICROSOFT_DELEGATED_TENANT_ID"],
  clientId: ["MOJO_MS_DELEGATED_CLIENT_ID", "MICROSOFT_DELEGATED_CLIENT_ID", ...graphCredentialNames.clientId],
  clientSecret: ["MOJO_MS_DELEGATED_CLIENT_SECRET", "MICROSOFT_DELEGATED_CLIENT_SECRET", ...graphCredentialNames.clientSecret]
};

function configuredVariable(env, names = []) {
  return names.find((name) => String(env?.[name] || "").trim());
}

function graphCredentialState(env, graph = {}, names = graphCredentialNames) {
  const tenantIdVariable = configuredVariable(env, names.tenantId);
  const clientIdVariable = configuredVariable(env, names.clientId);
  const clientSecretVariable = configuredVariable(env, names.clientSecret);
  const missingVariables = [];
  if (!graph.tenantId) missingVariables.push(names.tenantId.join(" or "));
  if (!graph.clientId) missingVariables.push(names.clientId.join(" or "));
  if (!graph.clientSecret) missingVariables.push(names.clientSecret.join(" or "));
  return {
    tenantIdConfigured: Boolean(graph.tenantId),
    clientIdConfigured: Boolean(graph.clientId),
    clientSecretConfigured: Boolean(graph.clientSecret),
    tenantIdVariable: tenantIdVariable || "",
    clientIdVariable: clientIdVariable || "",
    clientSecretVariable: clientSecretVariable || "",
    missingVariables
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
    graphCredentials: graphCredentialState(env, graph, graphCredentialNames),
    delegatedCalendarOAuthCredentials: graphCredentialState(env, delegatedGraph, delegatedGraphCredentialNames),
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
    if (input.action === "retry-booking-confirmations") {
      const result = await retryFailedBookingConfirmations(env, input);
      return json(result);
    }

    const employee = await saveEmployee(env, input, access.user.email);
    return json({ ok: true, employee });
  } catch (error) {
    return json({ error: error.message || "Unable to save employee scheduling settings." }, { status: 400 });
  }
}
