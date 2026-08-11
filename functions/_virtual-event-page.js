import {
  getVirtualEvent,
  publicVirtualEvent,
  VIRTUAL_EVENTS
} from "./_virtual-events.js";

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function eventOptions(activeSlug) {
  return VIRTUAL_EVENTS.map((event) => `
    <a class="${event.slug === activeSlug ? "active" : ""}" href="/virtual/${event.slug}.php">
      <span>${escapeHtml(event.dateLabel.replace("Friday, ", ""))}</span>
      ${escapeHtml(event.title)}
    </a>
  `).join("");
}

export function renderVirtualEventPage(slug) {
  const event = getVirtualEvent(slug);
  if (!event) {
    return new Response("Virtual event not found.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" }
    });
  }

  const publicEvent = publicVirtualEvent(event);
  const agenda = event.agenda.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const title = `${event.title} | MOJO AI Summits`;

  return new Response(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(event.summary)}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(event.summary)}">
  <meta property="og:image" content="https://mojoaisummits.com/assets/og-image.png?v=20260803a">
  <meta property="og:image:secure_url" content="https://mojoaisummits.com/assets/og-image.png?v=20260803a">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="https://mojoaisummits.com/assets/og-image.png?v=20260803a">
  <link rel="icon" type="image/png" href="/assets/logo-badge.png">
  <link rel="apple-touch-icon" href="/assets/logo-badge.png">
  <link rel="stylesheet" href="/assets/mojo-home-brand.css">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Orbitron:wght@600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap');
    :root { --navy:#0A0F1E; --slate:#1B2333; --blue:#1666FF; --cyan:#00E6FF; --white:#FFFFFF; --ink:#9aa3b8; --muted:#6f7890; --border:rgba(150,160,190,.16); }
    * { box-sizing: border-box; }
    body { margin:0; min-height:100vh; color:var(--white); background:var(--navy); font-family:Inter,sans-serif; letter-spacing:0; }
    body::before { content:""; position:fixed; inset:0; background:radial-gradient(circle at 16% 12%, rgba(22,102,255,.28), transparent 34%), radial-gradient(circle at 78% 18%, rgba(0,230,255,.14), transparent 30%), linear-gradient(180deg, #0A0F1E, #070b16 80%); pointer-events:none; }
    a { color:inherit; text-decoration:none; }
    .wrap { position:relative; z-index:1; width:min(1120px, calc(100% - 48px)); margin:0 auto; }
    header { border-bottom:1px solid var(--border); background:rgba(10,15,30,.82); backdrop-filter:blur(12px); }
    nav { min-height:78px; display:flex; align-items:center; justify-content:space-between; gap:24px; }
    .brand { display:inline-flex; align-items:center; gap:12px; }
    .brand img { height:39px; transition:transform 3.6s cubic-bezier(.22,1,.36,1), filter 3.6s cubic-bezier(.22,1,.36,1); }
    .brand:hover img { transform:scale(1.5); filter:drop-shadow(0 0 22px rgba(0,230,255,.28)); }
    .brand-divider { width:1px; height:35px; background:linear-gradient(to bottom, transparent, rgba(0,230,255,.9), transparent); }
    .brand-name { display:grid; gap:2px; text-transform:uppercase; line-height:1; }
    .brand-name strong { color:transparent; background:linear-gradient(90deg,#1666FF,#00E6FF); -webkit-background-clip:text; background-clip:text; font-size:25px; letter-spacing:.08em; }
    .brand-name span { color:rgba(222,235,255,.78); font-size:12px; font-weight:700; letter-spacing:.38em; }
    .nav-link { color:var(--muted); font:700 12px Space Grotesk,sans-serif; letter-spacing:.2em; text-transform:uppercase; }
    main { padding:72px 0 86px; }
    .layout { display:grid; grid-template-columns:minmax(0,1fr) 330px; gap:56px; align-items:start; }
    .eyebrow { color:var(--cyan); font:700 10px Orbitron,sans-serif; letter-spacing:.34em; text-transform:uppercase; }
    h1 { margin:18px 0 0; max-width:760px; font-size:clamp(38px,6vw,70px); line-height:1.04; text-transform:uppercase; text-shadow:0 0 28px rgba(0,230,255,.18); }
    .summary { margin:24px 0 0; max-width:660px; color:var(--ink); font-size:19px; line-height:1.65; }
    .meta { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; margin:38px 0; }
    .meta div, .panel, aside { border:1px solid var(--border); background:rgba(27,35,51,.58); border-radius:8px; }
    .meta div { padding:18px; }
    .meta span, .panel span, aside span { display:block; color:var(--cyan); font:700 10px Orbitron,sans-serif; letter-spacing:.2em; text-transform:uppercase; }
    .meta strong { display:block; margin-top:10px; font-size:18px; line-height:1.35; }
    .panel { padding:26px; }
    .panel h2, aside h2 { margin:0; font-size:22px; text-transform:uppercase; }
    ul { display:grid; gap:10px; margin:18px 0 0; padding:0; list-style:none; color:var(--ink); line-height:1.55; }
    li::before { content:""; display:inline-block; width:6px; height:6px; margin-right:10px; border-radius:999px; background:var(--cyan); box-shadow:0 0 12px rgba(0,230,255,.58); vertical-align:1px; }
    .room { margin-top:22px; padding:24px; border:1px solid rgba(0,230,255,.32); background:rgba(0,230,255,.045); border-radius:8px; }
    .room p { margin:12px 0 0; color:var(--ink); line-height:1.6; }
    .room a, button { display:inline-flex; align-items:center; justify-content:center; min-height:48px; margin-top:18px; padding:0 22px; border:1px solid var(--cyan); background:transparent; color:var(--cyan); font:700 11px Space Grotesk,sans-serif; letter-spacing:.18em; text-transform:uppercase; cursor:pointer; }
    .room a:hover, button:hover { background:var(--cyan); color:#06111d; }
    aside { padding:24px; }
    aside nav { display:grid; min-height:0; margin-top:18px; gap:10px; }
    aside a { display:grid; gap:4px; padding:14px 0; border-top:1px solid var(--border); color:var(--ink); font-size:14px; line-height:1.35; }
    aside a.active { color:var(--white); }
    aside a span { font-size:9px; }
    footer { position:relative; z-index:1; padding:38px 0; border-top:1px solid var(--border); color:var(--muted); text-align:center; font-size:12px; }
    @media (max-width: 860px) { .layout, .meta { grid-template-columns:1fr; } .wrap { width:min(100% - 36px, 1120px); } .nav-link { display:none; } }
  </style>
</head>
<body>
  <header>
    <nav class="wrap">
      <a class="mojo-home-brand" href="/" aria-label="MOJO AI Summits home"><img class="mojo-home-brand-mark" src="/assets/logo-mark.png" alt=""><span class="mojo-home-brand-divider" aria-hidden="true"></span><span class="mojo-home-brand-name" aria-hidden="true"><span class="mojo-home-brand-primary">MOJO AI</span><span class="mojo-home-brand-secondary">Summits</span></span></a>
      <a class="nav-link" href="/calendar/">Calendar</a>
      <a class="nav-link" href="/virtual/">Virtual</a>
    </nav>
  </header>
  <main class="wrap">
    <div class="layout">
      <section>
        <span class="eyebrow">Invitation-only virtual room</span>
        <h1>${escapeHtml(event.title)}</h1>
        <p class="summary">${escapeHtml(event.summary)}</p>
        <div class="meta" aria-label="Event details">
          <div><span>Date</span><strong>${escapeHtml(event.dateLabel)}</strong></div>
          <div><span>Time</span><strong>${new Date(event.startAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: publicEvent.timezone, timeZoneName: "short" })}</strong></div>
          <div><span>Lockout</span><strong>${publicEvent.lockoutMinutes} minutes before start</strong></div>
        </div>
        <section class="panel">
          <span>Working agenda</span>
          <h2>What this room is built to cover</h2>
          <ul>${agenda}</ul>
        </section>
        <section class="room" id="room" aria-live="polite">
          <span>Zoom access</span>
          <h2>Checking room availability</h2>
          <p>The Zoom link is only shown on this page until the event lockout begins.</p>
          <button type="button" id="refresh">Refresh Room Status</button>
        </section>
      </section>
      <aside>
        <span>2026-2027 series</span>
        <h2>Virtual Events</h2>
        <nav aria-label="Virtual event pages">${eventOptions(event.slug)}</nav>
      </aside>
    </div>
  </main>
  <footer><div class="wrap">© 2026 MOJO AI Summits. Executive AI events.</div></footer>
  <script>
    const slug = ${JSON.stringify(event.slug)};
    const room = document.querySelector("#room");
    const refresh = document.querySelector("#refresh");
    function escapeHtml(value) {
      return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
    }
    async function loadRoom() {
      refresh.disabled = true;
      try {
        const response = await fetch("/api/virtual-events/" + encodeURIComponent(slug), { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Room status could not be loaded.");
        const heading = payload.event.locked ? "Room locked" : payload.zoom?.joinUrl ? "Zoom room available" : "Zoom room pending";
        const action = payload.zoom?.joinUrl
          ? '<a href="' + escapeHtml(payload.zoom.joinUrl) + '" rel="nofollow noopener">Enter Zoom Room</a>'
          : "";
        room.innerHTML = '<span>Zoom access</span><h2>' + heading + '</h2><p>' + escapeHtml(payload.message) + '</p>' + action + '<button type="button" id="refresh">Refresh Room Status</button>';
        document.querySelector("#refresh").addEventListener("click", loadRoom);
      } catch (error) {
        room.innerHTML = '<span>Zoom access</span><h2>Status unavailable</h2><p>' + escapeHtml(error.message) + '</p><button type="button" id="refresh">Refresh Room Status</button>';
        document.querySelector("#refresh").addEventListener("click", loadRoom);
      } finally {
        const next = document.querySelector("#refresh");
        if (next) next.disabled = false;
      }
    }
    refresh.addEventListener("click", loadRoom);
    loadRoom();
  </script>
</body>
</html>`, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
