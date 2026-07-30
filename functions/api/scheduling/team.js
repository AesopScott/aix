import { json } from "../../_access-control.js";
import { listEmployees, publicEmployee, requireStore } from "../../_scheduling.js";

export async function onRequestGet({ env }) {
  const storageError = requireStore(env);
  if (storageError) return storageError;

  const employees = await listEmployees(env);
  return json({
    ok: true,
    employees: employees.map(publicEmployee)
  });
}
