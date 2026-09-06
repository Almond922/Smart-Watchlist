import { NextResponse } from "next/server";
import { signOut } from "@/lib/auth";

export async function POST() {
  try {
    await signOut();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/auth/logout error:", error);
    return NextResponse.json({ error: error.message || "Failed to sign out" }, { status: 500 });
  }
}