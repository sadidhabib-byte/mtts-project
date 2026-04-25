export type MetroTripDraft = {
  startStation: string;
  endStation: string;
  fare: number;
};

const KEY = "mass:metroTripDraft:v1";

export function saveTripDraft(draft: MetroTripDraft) {
  localStorage.setItem(KEY, JSON.stringify(draft));
}

export function loadTripDraft(): MetroTripDraft | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as MetroTripDraft;
    if (
      typeof parsed?.startStation === "string" &&
      typeof parsed?.endStation === "string" &&
      typeof parsed?.fare === "number"
    ) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

export function clearTripDraft() {
  localStorage.removeItem(KEY);
}

