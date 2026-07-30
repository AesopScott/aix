import { json } from "../../_access-control.js";
import { canManageAccess, getSessionUser } from "../../_auth.js";
import {
  graphConfig,
  listEmployees,
  publicEmployee,
  requireStore,
  saveEmployee
} from "../../_scheduling.js";

async function requireAdmin(request, env, data = {}) {
  const user = data?.auth?.email ? data.auth : await getSessionUser(request, env);
  if (!user) return { response: json({ error: "Sign in with a Mojo AI Summits admin account." }, { status: 401 }) };
  if (!canManageAccess(user)) return { response: json({ error: "Only owners and admins can manage scheduling." }, { status: 403 }) };
  return { user };
}

export async function onRequestGet({ request, env, data }) {
  const storageError = requireStore(env);
  if (storageError) return storageError;

  const access = await requireAdmin(request, env, data);
  if (access.response) return access.response;

  const employees = await listEmployees(env, { includeInactive: true });
  const graph = graphConfig(env);
  return json({
    ok: true,
    graphConfigured: graph.configured,
    employees: employees.map((employee) => ({
      ...publicEmployee(employee),
      email: employee.email,
      workingDays: employee.workingDays,
      dayStart: employee.dayStart,
      dayEnd: employee.dayEnd,
      slotStepMinutes: employee.slotStepMinutes,
      bufferBeforeMinutes: employee.bufferBeforeMinutes,
      bufferAfterMinutes: employee.bufferAfterMinutes,
      minNoticeHours: employee.minNoticeHours,
      maxDaysAhead: employee.maxDaysAhead
    }))
  });
}

export async function onRequestPost({ request, env, data }) {
  const storageError = requireStore(env);
  if (storageError) return storageError;

  const access = await requireAdmin(request, env, data);
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
