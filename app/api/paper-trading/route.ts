import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not configured");
  return neon(url);
}

async function ensureTable() {
  const sql = getDb();
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS paper_trading_state (
        id            INTEGER PRIMARY KEY DEFAULT 1,
        active        BOOLEAN NOT NULL DEFAULT FALSE,
        started_at    TIMESTAMPTZ,
        expires_at    TIMESTAMPTZ,
        stopped_at    TIMESTAMPTZ,
        last_run_at   TIMESTAMPTZ,
        total_runs    INTEGER DEFAULT 0,
        last_run_status VARCHAR(20) DEFAULT 'none',
        last_run_message TEXT DEFAULT '',
        updated_at    TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      INSERT INTO paper_trading_state (id, active)
      VALUES (1, FALSE)
      ON CONFLICT (id) DO NOTHING
    `;
  } catch {
    // table already exists — ignore
  }
}

// GET — return current paper trading state
export async function GET() {
  try {
    const sql = getDb();
    await ensureTable();
    const rows = await sql`SELECT * FROM paper_trading_state WHERE id = 1`;
    const state = rows[0] ?? { active: false };

    // Auto-expire if past expires_at
    if (state.active && state.expires_at && new Date(state.expires_at) < new Date()) {
      await sql`
        UPDATE paper_trading_state
        SET active = FALSE, stopped_at = NOW(), updated_at = NOW()
        WHERE id = 1
      `;
      state.active = false;
      state.stopped_at = new Date().toISOString();
    }

    return NextResponse.json(state);
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}

// POST — start or stop paper trading
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action as string; // "start" | "stop"
    const sql = getDb();
    await ensureTable();

    if (action === "start") {
      const weeks = body.weeks ?? 4;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + weeks * 7);
      const expiresIso = expiresAt.toISOString();

      await sql`
        UPDATE paper_trading_state
        SET active = TRUE,
            started_at = NOW(),
            expires_at = ${expiresIso}::timestamptz,
            stopped_at = NULL,
            total_runs = 0,
            last_run_status = 'none',
            last_run_message = '',
            updated_at = NOW()
        WHERE id = 1
      `;

      return NextResponse.json({
        active: true,
        started_at: new Date().toISOString(),
        expires_at: expiresIso,
      });
    }

    if (action === "stop") {
      await sql`
        UPDATE paper_trading_state
        SET active = FALSE,
            stopped_at = NOW(),
            updated_at = NOW()
        WHERE id = 1
      `;
      return NextResponse.json({
        active: false,
        stopped_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
