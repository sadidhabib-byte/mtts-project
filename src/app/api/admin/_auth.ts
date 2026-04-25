import type { NextRequest } from "next/server";
import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";

export async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(adminCookieName())?.value;
  if (!token) return null;
  try {
    return await verifyAdminSession(token);
  } catch {
    return null;
  }
}

