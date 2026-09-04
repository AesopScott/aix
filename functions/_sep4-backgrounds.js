const sep4BackgroundBaseUrl = "/assets/images/backgrounds/sep-4-guests";

const sep4EventSlug = "ai-executive-readiness";

const backgroundByPersonSlug = new Map([
  ["amir-habib", "Amir.png"],
  ["chuck-herrin", "Chuck.png"],
  ["cynthia-dixon", "CynthiaDixon.png"],
  ["david-kita", "DavidKita.png"],
  ["doug-sullinger", "DougSullenger.png"],
  ["doug-sullenger", "DougSullenger.png"],
  ["dustin-sachs", "DustinSachs.png"],
  ["dr-dustin-sachs", "DustinSachs.png"],
  ["imran-jan", "IMran.png"],
  ["jeanne-mcclure", "Jeanne.png"],
  ["jeanne-mcclure-phd", "Jeanne.png"],
  ["dr-jeanne-mcclure", "Jeanne.png"],
  ["jess-j-montgomery", "JessJMontgomery.png"],
  ["jessica-j-montgomery", "JessJMontgomery.png"],
  ["jessica-jo-montgomery", "JessJMontgomery.png"],
  ["jon-rav-shende", "JonRav.png"],
  ["jonrav-shende", "JonRav.png"],
  ["lokesh-mathur", "Lokesh.png"],
  ["mathew-schroeder", "MattSchroeder.png"],
  ["matthew-schroeder", "MattSchroeder.png"],
  ["matt-schroeder", "MattSchroeder.png"],
  ["mickey-disabato", "MickeyDisabato.png"],
  ["mike-madero", "Mike.png"],
  ["mike-pozmantier", "MikePoz.png"],
  ["michael-pozmantier", "MikePoz.png"],
  ["myron-grover", "Myron.png"],
  ["sunny-singh", "SunnySingh.png"],
  ["tejas-shroff", "TejasShroff.png"]
]);

const backgroundByEmail = new Map([
  ["amir.habib@stefanini.com", "Amir.png"],
  ["chuck@herrinadvisory.com", "Chuck.png"],
  ["cynthiadixon13@gmail.com", "CynthiaDixon.png"],
  ["support@raziocrm.com", "DavidKita.png"],
  ["doug.sullinger@vendita.ai", "DougSullenger.png"],
  ["dustin.sachs@psybercog.com", "DustinSachs.png"],
  ["imran.jan@pakamglobal.com", "IMran.png"],
  ["jmcclure@arsinnovate.com", "Jeanne.png"],
  ["jessica.j.montgomery@saic.com", "JessJMontgomery.png"],
  ["jon-rav.shende@thalesgroup.com", "JonRav.png"],
  ["mathurlokesh@gmail.com", "Lokesh.png"],
  ["matt@bsidesmedia.com", "MattSchroeder.png"],
  ["mickey@fucinadisabato.ai", "MickeyDisabato.png"],
  ["mike@reasonableguidance.com", "Mike.png"],
  ["poz@alphalevelsec.com", "MikePoz.png"],
  ["mgrover@precisecybersolutions.com", "Myron.png"],
  ["sunny-singh@outlook.com", "SunnySingh.png"],
  ["tejas_shroff@yahoo.com", "TejasShroff.png"]
]);

function cleanString(value, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function directBackgroundUrl(record = {}) {
  return cleanString(
    record.backgroundUrl ||
      record.virtualBackgroundUrl ||
      record.zoomBackgroundUrl ||
      record.eventBackgroundUrl,
    1000
  );
}

function backgroundUrl(fileName) {
  return fileName ? `${sep4BackgroundBaseUrl}/${encodeURIComponent(fileName)}` : "";
}

function slugify(value = "") {
  return cleanString(value, 240)
    .toLowerCase()
    .replace(/\b(dr|doctor|prof|professor)\.?\b/g, "")
    .replace(/\b(phd|ph\.d\.|mba|ms|ma|cissp)\b/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isSep4AiReadinessRecord(record = {}) {
  const eventText = [
    record.eventId,
    record.eventSlug,
    record.eventName,
    record.eventDate,
    record.eventStart,
    record.eventStartDateTime,
    record.accessLink,
    record.eventAccessLink
  ].map((value) => cleanString(value).toLowerCase()).filter(Boolean).join(" ");

  if (!eventText) return false;
  if (eventText.includes(sep4EventSlug)) return true;
  if (eventText.includes("ai executive readiness")) return true;
  if (eventText.includes("2026-09-04")) return true;
  if (eventText.includes("september 4, 2026") || eventText.includes("sept 4, 2026")) return true;
  return false;
}

function inviteRecordData(inviteRecord = {}) {
  return inviteRecord?.record && typeof inviteRecord.record === "object"
    ? inviteRecord.record
    : inviteRecord;
}

function candidateNames(record = {}) {
  return [
    record.intendedGuestName,
    record.invitedName,
    record.guestName,
    record.partnerContactName,
    record.memberName,
    record.nomineeName,
    record.usedByName,
    record.name,
    record.fullName,
    record.displayName
  ].map((value) => cleanString(value)).filter(Boolean);
}

function candidateEmails(record = {}) {
  return [
    record.intendedGuestEmail,
    record.invitedEmail,
    record.guestEmail,
    record.partnerContactEmail,
    record.memberEmail,
    record.nomineeEmail,
    record.usedByEmail,
    record.email
  ].map((value) => cleanString(value).toLowerCase()).filter(Boolean);
}

export function backgroundForInviteRecord(inviteRecord = {}) {
  const record = inviteRecordData(inviteRecord);
  const direct = directBackgroundUrl(record);
  if (direct) {
    return { url: direct, fileName: "", matchedBy: "record-background-url" };
  }

  if (!isSep4AiReadinessRecord(record)) return null;

  for (const name of candidateNames(record)) {
    const fileName = backgroundByPersonSlug.get(slugify(name));
    if (fileName) return { url: backgroundUrl(fileName), fileName, matchedBy: "invite-person-name" };
  }

  for (const email of candidateEmails(record)) {
    const fileName = backgroundByEmail.get(email);
    if (fileName) return { url: backgroundUrl(fileName), fileName, matchedBy: "invite-person-email" };
  }

  return null;
}

export function backgroundForRegistrant(registrant = {}) {
  return backgroundForInviteRecord(registrant);
}
