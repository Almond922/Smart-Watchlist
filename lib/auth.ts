import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export const SESSION_COOKIE = "sw_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
}

/**
 * Reads the session cookie and resolves it to a User row.
 * Returns null when there is no cookie or the referenced user no longer exists.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const userId = store.get(SESSION_COOKIE)?.value;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });

  return user;
}

/**
 * Finds or creates a user by email and stamps the session cookie for it.
 * This is a lightweight, passwordless sign-in appropriate for this demo app
 * (matching the rest of the codebase, which already runs on a bare userId
 * with no credential check) — swap in a real auth provider before shipping
 * this to production.
 */
export async function signIn(email: string, name?: string): Promise<SessionUser> {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: name ? { name } : {},
    create: {
      email: normalizedEmail,
      name: name?.trim() || normalizedEmail.split("@")[0],
    },
    select: { id: true, email: true, name: true },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return user;
}

export async function signOut(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}