// Use-by expiry rules for pantry items
// Date formatting is shared with meal plans in utils/dates.js
 
// Days ahead that count as "use soon", matches SOON_DAYS in backend/routes/pantry.js
export const SOON_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000; // one day in milliseconds
 
// Classify a use-by date against the user's local today
// Returns "expired", "soon" (today through SOON_DAYS ahead), or null
// useBy = ISO string at UTC midnight or null; now = current time
export function expiryStatus(useBy, now = new Date()) {
  if (!useBy) {
    return null; // no date, nothing to flag
  }
  // local calendar day expressed as UTC midnight, so both sides compare by day
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((Date.parse(useBy) - today) / DAY_MS); // whole days left
  if (days < 0) {
    return "expired";
  }
  return days <= SOON_DAYS ? "soon" : null;
}