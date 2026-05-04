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

function dateOnly(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function timeOnly(hh, mm = 0) {
  return new Date(Date.UTC(1970, 0, 1, hh, mm, 0));
}

function build2x2Layout40() {
  // Row-based labels: A1..A4 per row; last row has 5 seats (A1..A5 style).
  // Layout: 2 seats, aisle, 2 seats; last row is 5 seats (no aisle).
  const rows = 10;
  /** @type {Array<Array<{t:'seat'|'aisle'|'empty', code?:string}>>} */
  const cells = [];
  const letters = "ABCDEFGHIJ".split("");
  for (let r = 0; r < rows; r++) {
    const rowLetter = letters[r] ?? String.fromCharCode(65 + r);
    const isLast = r === rows - 1;
    if (isLast) {
      cells.push([
        { t: "seat", code: `${rowLetter}1` },
        { t: "seat", code: `${rowLetter}2` },
        { t: "seat", code: `${rowLetter}3` },
        { t: "seat", code: `${rowLetter}4` },
        { t: "seat", code: `${rowLetter}5` },
      ]);
    } else {
      cells.push([
        { t: "seat", code: `${rowLetter}1` },
        { t: "seat", code: `${rowLetter}2` },
        { t: "aisle" },
        { t: "seat", code: `${rowLetter}3` },
        { t: "seat", code: `${rowLetter}4` },
      ]);
    }
  }
  return { v: 1, label: "2x2", rows, cols: 5, cells };
}

function build2x1Layout32() {
  // Row-based labels: A1..A3 per row; last row has 2 seats to make 32 total.
  // Layout: 2 seats, aisle, 1 seat (missing on last row).
  const rows = 11;
  /** @type {Array<Array<{t:'seat'|'aisle'|'empty', code?:string}>>} */
  const cells = [];
  const letters = "ABCDEFGHIJK".split("");
  for (let r = 0; r < rows; r++) {
    const rowLetter = letters[r] ?? String.fromCharCode(65 + r);
    const isLast = r === rows - 1;
    const leftA = `${rowLetter}1`;
    const leftB = `${rowLetter}2`;
    const right = isLast ? null : `${rowLetter}3`;
    cells.push([
      { t: "seat", code: leftA },
      { t: "seat", code: leftB },
      { t: "aisle" },
      right ? { t: "seat", code: right } : { t: "empty" },
    ]);
  }
  return { v: 1, label: "2x1", rows, cols: 4, cells };
}

function seatCodesFromLayout(layoutJson) {
  const codes = [];
  for (const row of layoutJson.cells ?? []) {
    for (const cell of row ?? []) {
      if (cell?.t === "seat" && typeof cell.code === "string") codes.push(cell.code);
    }
  }
  return codes;
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

  // Bus (intercity) seed
  console.log("[seed] Seeding bus operators, buses, routes, and demo trips...");

  const busOperators = [
    "Green Line Paribahan",
    "Hanif Enterprise",
    "Shohagh Paribahan",
    "Ena Transport",
    "Shyamoli Paribahan",
    "S Alam Service",
    "TR Travels",
    "Nabil Paribahan",
    "Desh Travels",
    "Royal Coach",
    "Saintmartin Paribahan",
    "Unique Service",
  ];

  const operatorByName = new Map();
  for (const name of busOperators) {
    const op = await prisma.busOperator.upsert({
      where: { name },
      update: {},
      create: { name },
      select: { id: true, name: true },
    });
    operatorByName.set(op.name, op);
  }

  const layout2x2 = build2x2Layout40();
  const layout2x1 = build2x1Layout32();

  const busesToSeed = [
    { operator: "Green Line Paribahan", name: "AC", layout: layout2x2 },
    { operator: "Green Line Paribahan", name: "AC Business", layout: layout2x2 },
    { operator: "Hanif Enterprise", name: "Non-AC", layout: layout2x2 },
    { operator: "Shohagh Paribahan", name: "AC", layout: layout2x2 },
    { operator: "Ena Transport", name: "AC", layout: layout2x2 },
    { operator: "Shyamoli Paribahan", name: "AC", layout: layout2x2 },
    { operator: "S Alam Service", name: "AC", layout: layout2x2 },
    { operator: "TR Travels", name: "AC", layout: layout2x2 },
    { operator: "Royal Coach", name: "AC Business", layout: layout2x2 },
    { operator: "Unique Service", name: "AC", layout: layout2x2 },
  ];

  /** @type {Array<{id:string, name:string, operatorName:string, layout:any}>} */
  const seededBuses = [];
  for (const b of busesToSeed) {
    const op = operatorByName.get(b.operator);
    if (!op) continue;

    const bus = await prisma.bus.upsert({
      where: { operatorId_name: { operatorId: op.id, name: b.name } },
      update: { active: true },
      create: { operatorId: op.id, name: b.name, active: true },
      select: { id: true, name: true, operator: { select: { name: true } } },
    });

    await prisma.busSeatLayout.upsert({
      where: { busId: bus.id },
      update: { name: `${b.name} Layout`, layoutJson: b.layout },
      create: { busId: bus.id, name: `${b.name} Layout`, layoutJson: b.layout },
      select: { id: true },
    });

    seededBuses.push({ id: bus.id, name: bus.name, operatorName: bus.operator.name, layout: b.layout });
  }

  const routesToSeed = [
    ["Dhaka", "Chattogram"],
    ["Dhaka", "Cox's Bazar"],
    ["Dhaka", "Sylhet"],
    ["Dhaka", "Rajshahi"],
    ["Dhaka", "Khulna"],
  ];

  const seededRoutes = [];
  for (const [fromCity, toCity] of routesToSeed) {
    const r = await prisma.busRoute.upsert({
      where: { fromCity_toCity: { fromCity, toCity } },
      update: { active: true },
      create: { fromCity, toCity, active: true },
      select: { id: true, fromCity: true, toCity: true },
    });
    // Seed reverse too (like your metro symmetric fare note)
    const rr = await prisma.busRoute.upsert({
      where: { fromCity_toCity: { fromCity: toCity, toCity: fromCity } },
      update: { active: true },
      create: { fromCity: toCity, toCity: fromCity, active: true },
      select: { id: true, fromCity: true, toCity: true },
    });
    seededRoutes.push(r, rr);
  }

  // Create a small set of demo trips (next 3 days, morning/evening)
  const now = new Date();
  const tripDates = [0, 1, 2].map((d) => dateOnly(new Date(now.getTime() + d * 24 * 60 * 60 * 1000)));
  const depTimes = [timeOnly(9, 0), timeOnly(17, 0)];

  let tripCount = 0;
  for (const route of seededRoutes) {
    for (const journeyDate of tripDates) {
      for (const departureTime of depTimes) {
        const busPick = seededBuses[(tripCount + route.fromCity.length) % seededBuses.length];
        if (!busPick) continue;

        const trip = await prisma.busTrip.create({
          data: {
            routeId: route.id,
            busId: busPick.id,
            journeyDate,
            departureTime,
            fare:
              route.fromCity === "Dhaka" && route.toCity === "Chattogram"
                ? 750
                : route.toCity === "Cox's Bazar"
                  ? 1200
                  : 650,
            busType: busPick.name,
            active: true,
          },
          select: { id: true },
        });

        const seatCodes = seatCodesFromLayout(busPick.layout);
        if (seatCodes.length > 0) {
          await prisma.busTripSeatState.createMany({
            data: seatCodes.map((seatCode) => ({ tripId: trip.id, seatCode, state: "AVAILABLE" })),
            skipDuplicates: true,
          });
        }
        tripCount += 1;
      }
    }
  }

  console.log(`[seed] Seeded ${busOperators.length} operators, ${seededBuses.length} buses, ${seededRoutes.length} routes, ${tripCount} trips.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("[seed] Failed:", e);
  process.exitCode = 1;
});

