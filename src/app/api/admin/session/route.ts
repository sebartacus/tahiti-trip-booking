import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
  createAdminSessionToken,
  verifyAdminPassword,
  verifyAdminSession,
} from "@/lib/adminSession";

export async function GET(request: Request) {
  if (!verifyAdminSession(request)) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true });
}

export async function POST(request: Request) {
  let body: { password?: unknown };

  try {
    body = (await request.json()) as { password?: unknown };
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  if (!verifyAdminPassword(body.password)) {
    return NextResponse.json(
      { error: "Mot de passe incorrect." },
      { status: 401 }
    );
  }

  try {
    const response = NextResponse.json({ authenticated: true });
    response.cookies.set(
      ADMIN_SESSION_COOKIE,
      createAdminSessionToken(),
      adminSessionCookieOptions()
    );
    return response;
  } catch (error) {
    console.error("Impossible de créer la session admin :", error);
    return NextResponse.json(
      { error: "Configuration de session admin manquante." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    ...adminSessionCookieOptions(),
    maxAge: 0,
  });
  return response;
}
