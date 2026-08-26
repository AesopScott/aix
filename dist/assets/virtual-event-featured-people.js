(() => {
  const sections = Array.from(document.querySelectorAll("[data-featured-event]"));
  if (!sections.length) return;

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));
  }

  function initials(name) {
    const parts = String(name || "Featured guest").split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "AI";
  }

  function portraitSlug(name) {
    return String(name || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  const framedPortraits = new Set([
    "cynthia-dixon",
    "imran-jan",
    "jess-j-montgomery",
    "lokesh-mathur",
    "mathew-schroeder",
    "mike-madero"
  ]);
  const showDefinitions = [
    { id: "morning", title: "10:00 AM featured lineup", time: "10:00 am - 11:30 am CT" },
    { id: "afternoon", title: "1:00 PM featured lineup", time: "1:00 pm - 2:30 pm CT" }
  ];

  function framedPortraitUrl(person) {
    const slug = portraitSlug(person.displayName);
    return framedPortraits.has(slug) ? `/assets/featured-portraits/${slug}.png` : "";
  }

  function roleLabel(value) {
    const raw = String(value || "Featured guest").trim().toLowerCase();
    if (raw.includes("author")) return "Featured Author";
    if (raw.includes("partner") || raw.includes("sponsor")) return "Featured Partner";
    return "Featured Guest";
  }

  function cleanEventShowId(value, fallback = "") {
    const raw = String(value || "").trim().toLowerCase();
    const normalized = raw.replace(/[\s_]+/g, "-");
    const compact = raw.replace(/[^a-z0-9]/g, "");
    if (!raw) return fallback;
    if (normalized.includes("morning") || compact.includes("10am") || compact.includes("1000am") || compact === "10") return "morning";
    if (normalized.includes("afternoon") || compact.includes("1pm") || compact.includes("100pm") || compact.includes("1300") || compact === "1" || compact === "13") return "afternoon";
    if (["am", "10", "10am", "1000", "1000am"].includes(compact)) return "morning";
    if (["pm", "1", "1pm", "100", "100pm", "1300"].includes(compact)) return "afternoon";
    if (["both", "all", "bothshows"].includes(compact)) return "both";
    return fallback;
  }

  function featuredPhotoUrl(person = {}) {
    return String(person.photoUrl || person.photoURL || person.photo || person.headshotUrl || person.bioImageUrl || person.profileImageUrl || "").trim();
  }

  function portraitTuneStyle(person = {}) {
    const name = String(person.displayName || "").toLowerCase();
    if (name.includes("lokesh mathur")) return ' style="--mojo-head-position:center 24%;--mojo-head-transform:scale(1.78)"';
    if (name.includes("mathew schroeder") || name.includes("matt schroeder")) return ' style="--mojo-head-position:center 42%;--mojo-head-transform:scale(1.02)"';
    if (name.includes("mike madero")) return ' style="--mojo-head-position:center 30%;--mojo-head-transform:scale(1.28)"';
    return "";
  }

  function brandedPortraitMarkup(person, src, alt) {
    const style = portraitTuneStyle(person);
    const name = person.displayName || "Featured guest";
    const role = roleLabel(person.roleLabel);
    const title = role === "Featured Author" ? "" : person.title || "Title pending";
    const titleMarkup = title ? `<span>${escapeHtml(title)}</span>` : "";
    return `<div class="mojo-portrait-card"${style}>
      <div class="mojo-portrait-top">
        <div class="mojo-portrait-brand" aria-label="MOJO AI Summits"><strong>MOJO AI</strong><span>SUMMITS</span></div>
        <div class="mojo-portrait-person"><strong>${escapeHtml(name)}</strong>${titleMarkup}</div>
      </div>
      <div class="mojo-portrait-role">${escapeHtml(role)}</div>
      <div class="mojo-headshot-frame"><img src="${src}" alt="${escapeHtml(alt)}" loading="lazy"></div>
    </div>`;
  }

  function photoMarkup(person) {
    const photoUrl = featuredPhotoUrl(person);
    if (photoUrl) {
      const alt = person.displayName ? `${person.displayName} MOJO AI Summits featured guest portrait` : "MOJO AI Summits featured guest portrait";
      const src = escapeHtml(photoUrl);
      return brandedPortraitMarkup(person, src, alt);
    }
    const framedPortrait = framedPortraitUrl(person);
    if (framedPortrait) {
      const alt = person.displayName ? `${person.displayName} MOJO AI Summits featured guest portrait` : "MOJO AI Summits featured guest portrait";
      return `<img class="featured-lineup-photo-primary is-framed-portrait" src="${escapeHtml(framedPortrait)}" alt="${escapeHtml(alt)}" loading="lazy">`;
    }
    return `<span class="featured-lineup-initials" aria-hidden="true">${escapeHtml(initials(person.displayName))}</span>`;
  }

  function photoTuneStyle(person) {
    const name = String(person.displayName || "").toLowerCase();
    if (name.includes("mathew schroeder") || name.includes("matt schroeder")) {
      return ' style="--featured-photo-position:center center;--featured-photo-transform:translateY(-9%) scale(1.16)"';
    }
    return "";
  }

  function meta(label, value, fallback = "") {
    const text = value || fallback;
    return text ? `<span><strong>${escapeHtml(label)}</strong>${escapeHtml(text)}</span>` : "";
  }

  function guestMatchesShow(person, showId) {
    const guestShow = cleanEventShowId(person.eventShowId || person.eventShowLabel || person.eventShowTime || person.showId || person.show, "");
    if (!guestShow) return false;
    return guestShow === "both" || guestShow === showId;
  }

  function showLineupById(payload, showId) {
    const byShow = payload && typeof payload.featuredGuestsByShow === "object" ? payload.featuredGuestsByShow : null;
    if (byShow && Array.isArray(byShow[showId])) return byShow[showId];
    const guests = Array.isArray(payload?.featuredGuests) ? payload.featuredGuests : [];
    return guests.filter((person) => guestMatchesShow(person, showId));
  }

  function card(person) {
    return `
      <article class="featured-lineup-card">
        <div class="featured-lineup-photo">${photoMarkup(person)}</div>
      </article>
    `;
  }

  function showSection(show, guests) {
    return `
      <section class="featured-show-lineup" data-featured-show="${escapeHtml(show.id)}">
        <div class="featured-show-lineup-head">
          <div>
            <span class="guest-source">${escapeHtml(show.title)}</span>
            <h3>${escapeHtml(show.title)}</h3>
          </div>
          <div class="featured-show-count"><strong>${guests.length}/9</strong><span>Featured seats</span></div>
        </div>
        <div class="featured-lineup-grid">
          ${guests.length
            ? guests.slice(0, 9).map(card).join("")
            : '<div class="featured-lineup-empty">Featured guests, authors, and sponsors will appear here when their registration profile is approved for this show.</div>'}
        </div>
      </section>
    `;
  }

  async function loadSection(section) {
    const slug = String(section.dataset.featuredEvent || "").trim();
    const grid = section.querySelector("[data-featured-lineup-grid]");
    const count = section.querySelector("[data-featured-lineup-count]");
    if (!slug || !grid) return;

    grid.innerHTML = '<div class="featured-lineup-empty">Checking the featured lineup for this event...</div>';

    try {
      const response = await fetch(`/api/virtual-events/${encodeURIComponent(slug)}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Featured lineup could not be loaded.");

      const showRows = showDefinitions.map((show) => ({ show, guests: showLineupById(payload, show.id) }));
      const totalFeatured = showRows.reduce((sum, row) => sum + row.guests.length, 0);
      const withPhotos = showRows.reduce((sum, row) => sum + row.guests.filter((guest) => featuredPhotoUrl(guest)).length, 0);
      if (count) count.textContent = `${totalFeatured} featured across both shows${withPhotos ? `, ${withPhotos} with photos` : ""}`;

      grid.innerHTML = `<div class="featured-show-lineups">${showRows.map((row) => showSection(row.show, row.guests)).join("")}</div>`;
    } catch (error) {
      grid.innerHTML = `<div class="featured-lineup-empty">${escapeHtml(error.message || "Featured lineup could not be loaded.")}</div>`;
    }
  }

  sections.forEach(loadSection);
})();
