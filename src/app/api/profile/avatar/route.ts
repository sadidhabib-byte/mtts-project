import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { mkdir, writeFile } from "node:fs/promises";
import { extname } from "node:path";
import { getUserSession } from "@/lib/session";

export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024; // 2MB

export async function POST(req: NextRequest) {
  const session = await getUserSession();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("avatar");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Missing file field 'avatar'." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "File too large (max 2MB)." }, { status: 400 });
  }

  const allowed = new Set(["image/png", "image/jpeg", "image/webp"]);
  if (!allowed.has(file.type)) {
    return NextResponse.json({ ok: false, error: "Only PNG/JPG/WebP allowed." }, { status: 400 });
  }

  const raw = Buffer.from(await file.arrayBuffer());
  const extFromName = extname(file.name).toLowerCase();
  const ext =
    file.type === "image/png"
      ? ".png"
      : file.type === "image/webp"
        ? ".webp"
        : extFromName === ".jpeg" || extFromName === ".jpg"
          ? extFromName
          : ".jpg";

  const relDir = "uploads/avatars";
  const relPath = `/${relDir}/${userId}${ext}`;
  const absDir = `${process.cwd()}/public/${relDir}`;
  const absPath = `${process.cwd()}/public${relPath}`;

  await mkdir(absDir, { recursive: true });
  await writeFile(absPath, raw);

  const user = await prisma.user.update({
    where: { id: userId },
    data: { avatarPath: relPath },
    select: { id: true, name: true, email: true, avatarPath: true },
  });

  return NextResponse.json({ ok: true, user });
}

