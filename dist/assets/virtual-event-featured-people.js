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
    const raw = String(value || "Featured guest").trim();
    return raw
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function photoMarkup(person) {
    const framedPortrait = framedPortraitUrl(person);
    if (framedPortrait) {
      const alt = person.displayName ? `${person.displayName} MOJO AI Summits featured guest portrait` : "MOJO AI Summits featured guest portrait";
      return `<img class="featured-lineup-photo-primary is-framed-portrait" src="${escapeHtml(framedPortrait)}" alt="${escapeHtml(alt)}" loading="lazy">`;
    }
    if (person.photoUrl) {
      const alt = person.displayName ? `${person.displayName} photo` : "Featured participant photo";
      const src = escapeHtml(person.photoUrl);
      const style = photoTuneStyle(person);
      return `<img class="featured-lineup-photo-fill" src="${src}" alt="" aria-hidden="true" loading="lazy"><img class="featured-lineup-photo-primary" src="${src}" alt="${escapeHtml(alt)}" loading="lazy"${style}>`;
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
    const guestShow = String(person.eventShowId || "").toLowerCase();
    if (!guestShow) return showId === "afternoon";
    return guestShow === "both" || guestShow === showId;
  }

  function showLineupById(payload, showId) {
    const byShow = payload && typeof payload.featuredGuestsByShow === "object" ? payload.featuredGuestsByShow : null;
    if (byShow && Array.isArray(byShow[showId])) return byShow[showId];
    const guests = Array.isArray(payload?.featuredGuests) ? payload.featuredGuests : [];
    return guests.filter((person) => guestMatchesShow(person, showId));
  }

  function card(person) {
    const company = person.companyAllowed && person.company ? person.company : "";
    const industryFallback = person.companyAllowed ? "Industry pending" : "Company withheld";
    return `
      <article class="featured-lineup-card">
        <div class="featured-lineup-photo">${photoMarkup(person)}</div>
        <div class="featured-lineup-body">
          <span class="featured-lineup-role">${escapeHtml(roleLabel(person.roleLabel))}</span>
          <h3>${escapeHtml(person.displayName || "Name pending")}</h3>
          <div class="featured-lineup-meta">
            ${meta("Title", person.title, "Title pending")}
            ${meta(company ? "Company" : "Industry", company || person.industry, industryFallback)}
          </div>
          <p class="featured-lineup-note">Public details reflect the registration profile approved for this event.</p>
        </div>
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
      const withPhotos = showRows.reduce((sum, row) => sum + row.guests.filter((guest) => guest.photoUrl).length, 0);
      if (count) count.textContent = `${totalFeatured} featured across both shows${withPhotos ? `, ${withPhotos} with photos` : ""}`;

      grid.innerHTML = `<div class="featured-show-lineups">${showRows.map((row) => showSection(row.show, row.guests)).join("")}</div>`;
    } catch (error) {
      grid.innerHTML = `<div class="featured-lineup-empty">${escapeHtml(error.message || "Featured lineup could not be loaded.")}</div>`;
    }
  }

  sections.forEach(loadSection);
})();
