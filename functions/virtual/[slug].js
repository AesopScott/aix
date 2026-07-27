import { renderVirtualEventPage } from "../_virtual-event-page.js";

export async function onRequestGet({ params }) {
  return renderVirtualEventPage(params.slug);
}
