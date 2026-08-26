import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyAuthToken } from "@/lib/auth";

export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    const userId = await verifyAuthToken(token);

    if (!userId) {
      return NextResponse.json(
        { error: "Invalid session." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const timezone = String(body.timezone ?? "").trim();

    if (!timezone) {
      return NextResponse.json(
        { error: "Timezone is required." },
        { status: 400 }
      );
    }

    // Make sure it is a real IANA timezone.
    try {
      new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
      }).format();
    } catch {
      return NextResponse.json(
        { error: "Invalid IANA timezone." },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { timezone },
      select: {
        id: true,
        email: true,
        timezone: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Timezone update error:", error);

    return NextResponse.json(
      { error: "Unable to update timezone." },
      { status: 500 }
    );
  }
}