import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "admin_session";

function secretKey() {
  const secret = process.env.ADMIN_JWT_SECRET ?? "";
  if (!secret) throw new Error("ADMIN_JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export function adminCookieName() {
  return COOKIE_NAME;
}

export async function signAdminSession(adminId: string) {
  const jwt = await new SignJWT({ adminId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
  return jwt;
}

export async function verifyAdminSession(token: string) {
  const { payload } = await jwtVerify(token, secretKey());
  const adminId = payload.adminId;
  if (typeof adminId !== "string" || !adminId) return null;
  return { adminId };
}

