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

  function roleLabel(value) {
    const raw = String(value || "Featured guest").trim();
    return raw
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function photoMarkup(person) {
    if (person.photoUrl) {
      const alt = person.displayName ? `${person.displayName} photo` : "Featured participant photo";
      return `<img src="${escapeHtml(person.photoUrl)}" alt="${escapeHtml(alt)}" loading="lazy">`;
    }
    return `<span class="featured-lineup-initials" aria-hidden="true">${escapeHtml(initials(person.displayName))}</span>`;
  }

  function meta(label, value, fallback = "") {
    const text = value || fallback;
    return text ? `<span><strong>${escapeHtml(label)}</strong>${escapeHtml(text)}</span>` : "";
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

      const guests = Array.isArray(payload.featuredGuests) ? payload.featuredGuests : [];
      const withPhotos = guests.filter((guest) => guest.photoUrl).length;
      if (count) count.textContent = `${guests.length} featured${withPhotos ? `, ${withPhotos} with photos` : ""}`;

      grid.innerHTML = guests.length
        ? guests.slice(0, 9).map(card).join("")
        : '<div class="featured-lineup-empty">Featured guests, authors, and partners will appear here when their registration profile is approved for this event.</div>';
    } catch (error) {
      grid.innerHTML = `<div class="featured-lineup-empty">${escapeHtml(error.message || "Featured lineup could not be loaded.")}</div>`;
    }
  }

  sections.forEach(loadSection);
})();
