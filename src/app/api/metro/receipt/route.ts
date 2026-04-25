import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const userId = token?.sub;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const transactionId = (url.searchParams.get("transactionId") ?? "").trim();
  if (!transactionId) {
    return NextResponse.json({ ok: false, error: "Missing transactionId" }, { status: 400 });
  }

  const txn = await prisma.transaction.findFirst({
    where: { transactionId, userId },
    include: {
      startStation: { select: { name: true } },
      endStation: { select: { name: true } },
      user: { select: { name: true, email: true } },
    },
  });

  if (!txn) {
    return NextResponse.json({ ok: false, error: "Transaction not found" }, { status: 404 });
  }

  const qrContent = [
    `Transaction ID: ${txn.transactionId}`,
    `User: ${txn.user.name} (${txn.user.email})`,
    `Start: ${txn.startStation.name}`,
    `End: ${txn.endStation.name}`,
    `Fare: BDT ${txn.fare}`,
    `Payment Time: ${txn.createdAt.toISOString()}`,
    `Valid Till: ${txn.validTill.toISOString()}`,
  ].join("\n");

  const qrPng = await QRCode.toBuffer(qrContent, {
    type: "png",
    margin: 1,
    width: 240,
  });

  const doc = new PDFDocument({ size: "A4", margin: 48 });
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c as Buffer));

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  doc
    .fontSize(18)
    .fillColor("#111827")
    .text("Payment Receipt (Metro)", { align: "left" });

  doc.moveDown(0.75);
  doc
    .fontSize(11)
    .fillColor("#6b7280")
    .text("This is a simulated payment receipt stored in the project database.");

  doc.moveDown(1);

  const rows: Array<[string, string]> = [
    ["Transaction ID", txn.transactionId],
    ["User", `${txn.user.name} (${txn.user.email})`],
    ["Start", txn.startStation.name],
    ["End", txn.endStation.name],
    ["Fare", `BDT ${txn.fare}`],
    ["Payment Time", txn.createdAt.toLocaleString()],
    ["Valid Till", txn.validTill.toLocaleString()],
  ];

  const labelX = doc.x;
  const valueX = 200;
  rows.forEach(([label, value]) => {
    const y = doc.y;
    doc.fontSize(11).fillColor("#6b7280").text(label, labelX, y, { width: 180 });
    doc.fontSize(11).fillColor("#111827").text(value, valueX, y, { width: 340 });
    doc.moveDown(0.7);
    doc
      .moveTo(labelX, doc.y)
      .lineTo(labelX + 520, doc.y)
      .lineWidth(0.5)
      .strokeColor("#e5e7eb")
      .stroke();
    doc.moveDown(0.7);
  });

  doc.moveDown(0.5);
  doc.fontSize(12).fillColor("#111827").text("QR Code", { align: "left" });
  doc.moveDown(0.4);
  doc.image(qrPng, { fit: [180, 180] });

  doc.end();

  const pdf = await done;

  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="metro-receipt-${txn.transactionId}.pdf"`,
    },
  });
}

