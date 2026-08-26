import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyAuthToken } from "@/lib/auth";

async function getUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) return null;

  return verifyAuthToken(token);
}

export async function GET() {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    const habits = await prisma.habit.findMany({
      where: { userId },
      include: {
        checkIns: {
          select: {
            localDate: true,
          },
          orderBy: {
            localDate: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({ habits });
  } catch (error) {
    console.error("Get habits error:", error);

    return NextResponse.json(
      { error: "Unable to load habits." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const name = String(body.name ?? "").trim();

    if (!name) {
      return NextResponse.json(
        { error: "Habit name is required." },
        { status: 400 }
      );
    }

    if (name.length > 42) {
      return NextResponse.json(
        { error: "Habit name must be 42 characters or fewer." },
        { status: 400 }
      );
    }

    const habit = await prisma.habit.create({
      data: {
        name,
        userId,
      },
      include: {
        checkIns: true,
      },
    });

    return NextResponse.json({ habit }, { status: 201 });
  } catch (error) {
    console.error("Create habit error:", error);

    return NextResponse.json(
      { error: "Unable to create habit." },
      { status: 500 }
    );
  }
}