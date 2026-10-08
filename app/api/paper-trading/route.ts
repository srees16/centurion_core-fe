import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

/** Whether the request carries a valid session of the operator's own logins: the backend verifies its
 *  Bearer token.  A signed-up user (role "user", MU2) has no paper validation, so is refused. */
async function signedIn(req: NextRequest): Promise<boolean> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const backend = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9001";
  try {
    const res = await fetch(`${backend}/api/v1/auth/me`, { headers: { Authorization: auth }, cache: "no-store" });
    return res.ok && (await res.json()).role !== "user";
  } catch {
    return false;
  }
}

const UNAUTHORIZED = () => NextResponse.json({ error: "Sign in to do that" }, { status: 401 });

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
export async function GET(req: NextRequest) {
  if (!(await signedIn(req))) return UNAUTHORIZED();
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
    console.error("paper-trading GET failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// POST — start or stop paper trading
export async function POST(req: NextRequest) {
  if (!(await signedIn(req))) return UNAUTHORIZED();
  try {
    const body = await req.json();
    const action = body.action as string; // "start" | "stop"
    const sql = getDb();
    await ensureTable();

    if (action === "start") {
      const weeks = Math.min(Math.max(Math.trunc(Number(body.weeks ?? 4)) || 4, 1), 52);
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
    console.error("paper-trading POST failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
