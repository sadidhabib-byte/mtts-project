import fareTable from "@/data/metroFareTable.json";

export function listStations(): string[] {
  return fareTable.stations.slice();
}

type SegmentFare = { from: string; to: string; fare: number };

const segmentMap = new Map<string, number>(
  (fareTable.fares as SegmentFare[]).flatMap((s) => [
    [`${s.from}→${s.to}`, s.fare],
    [`${s.to}→${s.from}`, s.fare],
  ]),
);

export function calculateFare(startStation: string, endStation: string): number | null {
  if (startStation === endStation) return null;

  const stations = fareTable.stations;
  const startIdx = stations.indexOf(startStation);
  const endIdx = stations.indexOf(endStation);
  if (startIdx === -1 || endIdx === -1) return null;

  const step = startIdx < endIdx ? 1 : -1;
  let total = 0;
  for (let i = startIdx; i !== endIdx; i += step) {
    const from = stations[i];
    const to = stations[i + step];
    const seg = segmentMap.get(`${from}→${to}`);
    if (seg == null) return null;
    total += seg;
  }
  return total;
}

