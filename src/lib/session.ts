import { cookies } from "next/headers";
import { getDb } from "./db";
import { hashToken, newSessionToken } from "./auth";
import { createSession, deleteSession, getSessionUser } from "./repo";

const COOKIE = "retour_session";
const TTL_MS = 30 * 24 * 3600 * 1000;

export async function startSession(userId: number) {
  const token = newSessionToken();
  createSession(getDb(), userId, hashToken(token), Date.now() + TTL_MS);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_MS / 1000,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) deleteSession(getDb(), hashToken(token));
  jar.delete(COOKIE);
}

export async function currentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return undefined;
  return getSessionUser(getDb(), hashToken(token));
}
