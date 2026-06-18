import { SignJWT, jwtVerify } from "jose";
import { JWTExpired } from "jose/errors";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET as string;
export const COOKIE_NAME = "auth_token";
export const SESSION_DURATION_SECONDS = 8 * 60 * 60; // 8 hours

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

function secret() {
  return new TextEncoder().encode(JWT_SECRET);
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(secret());
}

export async function verifyToken(
  token: string
): Promise<{ payload: JWTPayload | null; expired: boolean }> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return { payload: payload as unknown as JWTPayload, expired: false };
  } catch (err) {
    if (err instanceof JWTExpired) return { payload: null, expired: true };
    return { payload: null, expired: false };
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const { payload } = await verifyToken(token);
  return payload;
}
