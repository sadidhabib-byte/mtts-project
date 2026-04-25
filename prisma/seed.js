/* eslint-disable no-console */

require("dotenv/config");

const { PrismaClient } = require("@prisma/client");
const { PrismaMariaDb } = require("@prisma/adapter-mariadb");
const fareTable = require("../src/data/metroFareTable.json");

function mariadbConfigFromUrl(databaseUrl) {
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");
  const url = new URL(databaseUrl);
  const database = url.pathname.replace(/^\//, "");
  const port = url.port ? Number(url.port) : 3306;
  return {
    host: url.hostname,
    port,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
  };
}

function buildSegmentMap(fares) {
  const m = new Map();
  for (const seg of fares) {
    m.set(`${seg.from}→${seg.to}`, seg.fare);
    m.set(`${seg.to}→${seg.from}`, seg.fare);
  }
  return m;
}

function calculateFare(stations, segmentMap, from, to) {
  if (from === to) return null;
  const startIdx = stations.indexOf(from);
  const endIdx = stations.indexOf(to);
  if (startIdx === -1 || endIdx === -1) return null;
  const step = startIdx < endIdx ? 1 : -1;
  let total = 0;
  for (let i = startIdx; i !== endIdx; i += step) {
    const a = stations[i];
    const b = stations[i + step];
    const seg = segmentMap.get(`${a}→${b}`);
    if (seg == null) return null;
    total += seg;
  }
  return total;
}

async function main() {
  const adapter = new PrismaMariaDb(mariadbConfigFromUrl(process.env.DATABASE_URL));
  const prisma = new PrismaClient({ adapter });

  const stations = Array.isArray(fareTable.stations) ? fareTable.stations : [];
  const segments = Array.isArray(fareTable.fares) ? fareTable.fares : [];
  const segmentMap = buildSegmentMap(segments);

  if (stations.length < 2) throw new Error("No stations found in src/data/metroFareTable.json");
  if (segments.length < 1) throw new Error("No segment fares found in src/data/metroFareTable.json");

  console.log(`[seed] Upserting ${stations.length} metro stations...`);
  for (const name of stations) {
    await prisma.metroStation.upsert({
      where: { name },
      update: { active: true },
      create: { name, active: true },
    });
  }

  const dbStations = await prisma.metroStation.findMany({
    where: { name: { in: stations } },
    select: { id: true, name: true },
  });
  const idByName = new Map(dbStations.map((s) => [s.name, s.id]));

  console.log(`[seed] Upserting metro fares for all station pairs...`);
  let fareCount = 0;
  for (let i = 0; i < stations.length; i++) {
    for (let j = 0; j < stations.length; j++) {
      if (i === j) continue;
      const fromName = stations[i];
      const toName = stations[j];
      const fromId = idByName.get(fromName);
      const toId = idByName.get(toName);
      if (!fromId || !toId) continue;

      const fare = calculateFare(stations, segmentMap, fromName, toName);
      if (fare == null) continue;

      await prisma.metroFare.upsert({
        where: { fromStationId_toStationId: { fromStationId: fromId, toStationId: toId } },
        update: { fare },
        create: { fromStationId: fromId, toStationId: toId, fare },
      });
      fareCount += 1;
    }
  }

  console.log(`[seed] Done. Upserted ${stations.length} stations and ${fareCount} fares.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("[seed] Failed:", e);
  process.exitCode = 1;
});

