import { NextResponse } from "next/server";

/**
 * Keep-alive endpoint — pings the HF Spaces backend /health to prevent
 * the free-tier container from sleeping after 48h inactivity.
 *
 * Called externally by UptimeRobot (every 5 min) rather than Vercel cron
 * (Hobby plan only supports daily crons).
 */

const HF_HEALTH_URL =
  process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/health`
    : "https://srees16-centurion-core.hf.space/health";

export async function GET() {
  try {
    const res = await fetch(HF_HEALTH_URL, {
      method: "GET",
      signal: AbortSignal.timeout(15000),
    });

    const data = await res.json();

    return NextResponse.json({
      ok: true,
      status: res.status,
      backend_status: data.status,
      database: data.database,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 502 },
    );
  }
}
