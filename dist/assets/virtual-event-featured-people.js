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

  function firstName(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "";
    const first = parts[0].replace(/,+$/g, "");
    if (/^(?:dr|mr|mrs|ms|miss|prof)\.?$/i.test(first) && parts[1]) return parts[1].replace(/,+$/g, "");
    return first;
  }

  function publicDisplayName(person = {}) {
    const explicit = String(person.publicDisplayName || person.publicName || "").trim();
    if (explicit) return explicit;
    const fullName = String(person.displayName || person.name || "").trim();
    if (person.nameAllowed === false || person.publicationUseName === false) return firstName(fullName) || "Featured guest";
    return fullName || "Featured guest";
  }

  function publicCompany(person = {}) {
    if (person.companyAllowed === true || person.publicationUseCompany === true) {
      return String(person.company || person.partnerCompany || "").trim();
    }
    return "";
  }

  function portraitPersonDetailLines(person = {}) {
    return [
      person.title,
      publicCompany(person),
      person.industry || person.organizationType
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);
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
    if (raw.includes("featured author") || raw.includes("featured-author")) return "Featured Author";
    if (raw.includes("featured partner") || raw.includes("featured-partner") || raw.includes("featured sponsor") || raw.includes("featured-sponsor")) return "Featured Partner";
    if (raw.includes("featured guest") || raw.includes("featured-guest")) return "Featured Guest";
    return "Featured Guest";
  }

  function roleClass(role) {
    return String(role || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function roleKey(value) {
    const raw = String(value || "").trim().toLowerCase().replace(/[\s_]+/g, "-");
    if (raw.includes("featured-author")) return "featured-author";
    if (raw.includes("featured-sponsor")) return "featured-partner";
    if (raw.includes("featured-partner")) return "featured-partner";
    if (raw.includes("featured-guest")) return "featured-guest";
    return raw;
  }

  function publicPersonKey(person = {}) {
    const linkedin = linkedInProfileUrl(person).toLowerCase().replace(/\/+$/, "");
    if (linkedin) return `linkedin:${linkedin}`;
    const email = String(person.email || "").trim().toLowerCase();
    if (email) return `email:${email}`;
    const name = String(person.displayName || person.name || "").trim().toLowerCase().replace(/\s+/g, " ");
    const role = roleKey(person.roleLabel || person.registrationRole || person.guestRegistrationType || person.partnerRegistrationType || person.role);
    return [name, role].filter(Boolean).join("|");
  }

  function mergePublicPeople(people = []) {
    const map = new Map();
    people.forEach((person) => {
      const key = publicPersonKey(person);
      if (!key) return;
      const previous = map.get(key) || {};
      map.set(key, {
        ...previous,
        ...person,
        photoUrl: person.photoUrl || person.photoURL || person.photo || previous.photoUrl || previous.photoURL || previous.photo || "",
        photoKey: person.photoKey || previous.photoKey || "",
        linkedinProfileUrl: linkedInProfileUrl(person) || linkedInProfileUrl(previous)
      });
    });
    return [...map.values()];
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
    const name = String(person.displayName || "").toLowerCase();
    const url = String(person.photoUrl || person.photoURL || person.photo || person.headshotUrl || person.bioImageUrl || person.profileImageUrl || "").trim();
    if ((name.includes("mathew schroeder") || name.includes("matt schroeder")) && url.includes("crm%2Fcontact-photos%2Fmatt-at-bsidesmedia.com")) {
      return "https://mojoaisummits.com/api/crm?photo=crm%2Fregistration-photos%2Fguest%2Fmatt%2F2026-08-20T21-13-53-411Z-02f48a84-582d-49f0-a521-c666b9cf6fc2-33832.jpg";
    }
    return url;
  }

  function linkedInProfileUrl(person = {}) {
    const raw = String(person.linkedinProfileUrl || person.linkedInProfileUrl || person.linkedinUrl || person.linkedInUrl || "").replace(/\s+/g, "");
    if (!raw) return "";
    const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw.replace(/^\/+/, "")}`;
    try {
      const url = new URL(candidate);
      const host = url.hostname.toLowerCase().replace(/^www\./, "");
      const path = url.pathname.replace(/\/+$/, "");
      if (host !== "linkedin.com" && !host.endsWith(".linkedin.com")) return "";
      if (!/^\/(in|pub)\/[^/]+/i.test(path)) return "";
      url.protocol = "https:";
      url.username = "";
      url.password = "";
      url.search = "";
      url.hash = "";
      return url.toString();
    } catch {
      return "";
    }
  }

  function portraitTuneStyle(person = {}) {
    const name = String(person.displayName || "").toLowerCase();
    if (name.includes("imran jan")) return ' style="--mojo-head-position:center 44%;--mojo-head-transform:scale(1.24)"';
    if (name.includes("lokesh mathur")) return ' style="--mojo-head-position:center 42%;--mojo-head-transform:scale(1.56)"';
    if (name.includes("maman ibrahim")) return ' style="--mojo-head-position:center 48%;--mojo-head-transform:scale(1.04)"';
    if (name.includes("mathew schroeder") || name.includes("matt schroeder")) return ' style="--mojo-head-position:center 42%;--mojo-head-transform:scale(1.02)"';
    if (name.includes("mike madero")) return ' style="--mojo-head-position:center 30%;--mojo-head-transform:scale(1.28)"';
    return "";
  }

  function brandedPortraitMarkup(person, src, alt) {
    const style = portraitTuneStyle(person);
    const name = publicDisplayName(person);
    const role = roleLabel(person.roleLabel || person.registrationRole || person.guestRegistrationType || person.partnerRegistrationType || person.role);
    const detailsMarkup = portraitPersonDetailLines(person).map((line) => `<span>${escapeHtml(line)}</span>`).join("");
    return `<div class="mojo-portrait-card"${style}>
      <div class="mojo-portrait-top">
        <div class="mojo-portrait-brand" aria-label="MOJO AI Summits"><strong>MOJO AI</strong><span>SUMMITS</span></div>
        <div class="mojo-portrait-person"><strong>${escapeHtml(name)}</strong>${detailsMarkup}</div>
      </div>
      <div class="mojo-portrait-role is-${escapeHtml(roleClass(role))}">${escapeHtml(role)}</div>
      <div class="mojo-headshot-frame"><img src="${src}" alt="${escapeHtml(alt)}" loading="lazy"></div>
    </div>`;
  }

  function brandedInitialsMarkup(person) {
    const name = publicDisplayName(person);
    const role = roleLabel(person.roleLabel || person.registrationRole || person.guestRegistrationType || person.partnerRegistrationType || person.role);
    const detailsMarkup = portraitPersonDetailLines(person).map((line) => `<span>${escapeHtml(line)}</span>`).join("");
    return `<div class="mojo-portrait-card">
      <div class="mojo-portrait-top">
        <div class="mojo-portrait-brand" aria-label="MOJO AI Summits"><strong>MOJO AI</strong><span>SUMMITS</span></div>
        <div class="mojo-portrait-person"><strong>${escapeHtml(name)}</strong>${detailsMarkup}</div>
      </div>
      <div class="mojo-portrait-role is-${escapeHtml(roleClass(role))}">${escapeHtml(role)}</div>
      <div class="mojo-headshot-frame"><span class="featured-lineup-initials" aria-hidden="true">${escapeHtml(initials(name))}</span></div>
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
    return brandedInitialsMarkup(person);
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

  function showSlotGroups(payload, showId) {
    const people = mergePublicPeople(showLineupById(payload, showId));
    return {
      guests: people.filter((person) => roleKey(person.roleLabel) === "featured-guest").slice(0, 6),
      authors: people.filter((person) => roleKey(person.roleLabel) === "featured-author").slice(0, 1),
      partners: people.filter((person) => roleKey(person.roleLabel) === "featured-partner").slice(0, 2)
    };
  }

  function card(person) {
    const linkedinUrl = linkedInProfileUrl(person);
    const label = person.displayName
      ? `View ${person.displayName} on LinkedIn`
      : "View featured guest on LinkedIn";
    if (linkedinUrl) {
      return `
        <a class="featured-lineup-card featured-lineup-card-link" href="${escapeHtml(linkedinUrl)}" target="_blank" rel="noopener" aria-label="${escapeHtml(label)}">
          <div class="featured-lineup-photo">${photoMarkup(person)}</div>
        </a>
      `;
    }
    return `
      <article class="featured-lineup-card">
        <div class="featured-lineup-photo">${photoMarkup(person)}</div>
      </article>
    `;
  }

  function slotGroupMarkup(className, people) {
    if (!people.length) return "";
    return `<div class="featured-lineup-slot-group is-${escapeHtml(className)}">
      <div class="featured-lineup-slot-grid">
        ${people.map(card).join("")}
      </div>
    </div>`;
  }

  function showSection(show, groups) {
    const guests = Array.isArray(groups?.guests) ? groups.guests : [];
    const authors = Array.isArray(groups?.authors) ? groups.authors : [];
    const partners = Array.isArray(groups?.partners) ? groups.partners : [];
    const people = [...guests, ...authors, ...partners];
    return `
      <section class="featured-show-lineup" data-featured-show="${escapeHtml(show.id)}">
        <div class="featured-show-lineup-head">
          <div>
            <span class="guest-source">${escapeHtml(show.title)}</span>
            <h3>${escapeHtml(show.title)}</h3>
          </div>
          <div class="featured-show-count"><strong>${people.length}/9</strong><span>Featured seats</span></div>
        </div>
        <div class="featured-lineup-slots">
          ${people.length
            ? [
                slotGroupMarkup("guests", guests),
                slotGroupMarkup("authors", authors),
                slotGroupMarkup("partners", partners)
              ].join("")
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

      const showRows = showDefinitions.map((show) => ({ show, groups: showSlotGroups(payload, show.id) }));
      const totalFeatured = showRows.reduce((sum, row) => sum + row.groups.guests.length + row.groups.authors.length + row.groups.partners.length, 0);
      const withPhotos = showRows.reduce((sum, row) => {
        return sum + [...row.groups.guests, ...row.groups.authors, ...row.groups.partners].filter((guest) => featuredPhotoUrl(guest)).length;
      }, 0);
      if (count) count.textContent = `${totalFeatured} featured across both shows${withPhotos ? `, ${withPhotos} with photos` : ""}`;

      grid.innerHTML = `<div class="featured-show-lineups">${showRows.map((row) => showSection(row.show, row.groups)).join("")}</div>`;
    } catch (error) {
      grid.innerHTML = `<div class="featured-lineup-empty">${escapeHtml(error.message || "Featured lineup could not be loaded.")}</div>`;
    }
  }

  sections.forEach(loadSection);
})();
