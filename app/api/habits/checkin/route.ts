import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyAuthToken } from "@/lib/auth";
import { todayInZone, dayDiff, shiftDate } from "@/lib/dates";

async function getUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) return null;

  return verifyAuthToken(token);
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

    const habitId = String(body.habitId ?? "").trim();
    const localDate = String(body.localDate ?? "").trim();

    if (!habitId || !localDate) {
      return NextResponse.json(
        { error: "Habit and local date are required." },
        { status: 400 }
      );
    }

    // Strict YYYY-MM-DD validation.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
      return NextResponse.json(
        { error: "Invalid local date." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        timezone: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    const today = todayInZone(user.timezone);

    // Future local days are never allowed.
    if (dayDiff(localDate, today) > 0) {
      return NextResponse.json(
        {
          error: `${localDate} hasn't begun in ${user.timezone}.`,
          code: "FUTURE_DATE",
        },
        { status: 400 }
      );
    }

    const habit = await prisma.habit.findFirst({
      where: {
        id: habitId,
        userId,
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    if (!habit) {
      return NextResponse.json(
        { error: "Habit not found." },
        { status: 404 }
      );
    }

    const createdDate = habit.createdAt
      .toLocaleDateString("en-CA", {
        timeZone: user.timezone,
      });

    // Don't allow check-ins before the habit existed.
    if (dayDiff(localDate, createdDate) < 0) {
      return NextResponse.json(
        {
          error: "You cannot check in before this habit was created.",
          code: "BEFORE_HABIT",
        },
        { status: 400 }
      );
    }

    // Keep the same 365-day backfill rule as the frontend.
    const floor = shiftDate(today, -365);

    if (dayDiff(localDate, floor) < 0) {
      return NextResponse.json(
        {
          error: `Backfill is limited to the last 365 days.`,
          code: "TOO_OLD",
        },
        { status: 400 }
      );
    }

    // Explicit duplicate check for a meaningful error.
    const existing = await prisma.checkIn.findUnique({
      where: {
        habitId_localDate: {
          habitId,
          localDate,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: `${localDate} is already checked in.`,
          code: "DUPLICATE_DAY",
        },
        { status: 409 }
      );
    }

    const checkIn = await prisma.checkIn.create({
      data: {
        habitId,
        localDate,
      },
    });

    return NextResponse.json(
      { checkIn },
      { status: 201 }
    );
  } catch (error) {
    console.error("Check-in error:", error);

    return NextResponse.json(
      { error: "Unable to create check-in." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
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

    const habitId = String(body.habitId ?? "").trim();
    const localDate = String(body.localDate ?? "").trim();

    if (!habitId || !localDate) {
      return NextResponse.json(
        { error: "Habit and local date are required." },
        { status: 400 }
      );
    }

    // Make sure this habit belongs to the logged-in user.
    const habit = await prisma.habit.findFirst({
      where: {
        id: habitId,
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!habit) {
      return NextResponse.json(
        { error: "Habit not found." },
        { status: 404 }
      );
    }

    const checkIn = await prisma.checkIn.findUnique({
      where: {
        habitId_localDate: {
          habitId,
          localDate,
        },
      },
    });

    if (!checkIn) {
      return NextResponse.json(
        { error: "Check-in not found." },
        { status: 404 }
      );
    }

    await prisma.checkIn.delete({
      where: {
        id: checkIn.id,
      },
    });

    return NextResponse.json({
      message: "Check-in removed.",
    });
  } catch (error) {
    console.error("Delete check-in error:", error);

    return NextResponse.json(
      { error: "Unable to remove check-in." },
      { status: 500 }
    );
  }
}