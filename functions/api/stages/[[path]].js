import { legacyCrmRemoved } from "../../_legacy-crm-removed.js";

export async function onRequest() {
  return legacyCrmRemoved();
}
