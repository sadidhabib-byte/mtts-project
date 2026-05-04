import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { adminCookieName, signAdminSession } from "@/lib/adminAuth";

export const runtime = "nodejs";

type Body = { email?: string; password?: string };

function clearNextAuthCookies(res: NextResponse) {
  // NextAuth v4 commonly uses these cookie names (secure + non-secure variants).
  const cookies = [
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "next-auth.csrf-token",
    "__Host-next-auth.csrf-token",
    "next-auth.callback-url",
    "__Secure-next-auth.callback-url",
  ];
  for (const name of cookies) {
    res.cookies.set(name, "", { path: "/", maxAge: 0 });
  }
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email ?? "").toLowerCase().trim();
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "Email and password are required." },
      { status: 400 },
    );
  }

  // Dev bootstrap: if no admins exist, allow first login to create admin from env credentials.
  const adminCount = await prisma.admin.count();
  if (adminCount === 0) {
    const envEmail = (process.env.ADMIN_EMAIL ?? "").toLowerCase().trim();
    const envPassword = process.env.ADMIN_PASSWORD ?? "";
    if (email === envEmail && password === envPassword && envEmail && envPassword) {
      const passwordHash = await bcrypt.hash(envPassword, 12);
      const created = await prisma.admin.create({
        data: { email: envEmail, passwordHash },
        select: { id: true },
      });
      const jwt = await signAdminSession(created.id);
      const res = NextResponse.json({ ok: true }, { status: 200 });
      clearNextAuthCookies(res);
      res.cookies.set(adminCookieName(), jwt, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
      return res;
    }
  }

  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Invalid credentials." }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "Invalid credentials." }, { status: 401 });
  }

  const jwt = await signAdminSession(admin.id);
  const res = NextResponse.json({ ok: true }, { status: 200 });
  clearNextAuthCookies(res);
  res.cookies.set(adminCookieName(), jwt, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

